import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { AppError, assert, safeMessage } from "./errors.js";
import { createSupabase } from "./supabase.js";
import { createDatabase } from "./database.js";

const COOKIE = "supadesk_session_v2";
const DAY = 86400;
const WRITES = new Set([
  "insert",
  "update",
  "delete",
  "schemaCreate",
  "schemaAddColumn",
  "schemaRenameColumn",
]);
export const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
};

export function createApplication({
  secret,
  origins = [],
  production = false,
  fetchImpl = fetch,
  now = () => Date.now(),
} = {}) {
  if (production && (!secret || secret.length < 32))
    throw new Error(
      "Production requires SESSION_SECRET with at least 32 characters.",
    );
  const key = createHash("sha256")
    .update(secret || randomBytes(32))
    .digest();
  const supabase = createSupabase(fetchImpl);
  const projectAction = createDatabase(supabase);
  const completed = new Map(); // Best-effort duplicate suppression within this instance.
  const rateLimits = new Map();

  function seal(data) {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      "base64url",
    );
  }
  function unseal(request) {
    try {
      const cookie = (request.headers.get("cookie") || "")
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith(COOKIE + "="))
        ?.slice(COOKIE.length + 1);
      if (!cookie || cookie.length > 4000) return null;
      const data = Buffer.from(cookie, "base64url");
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        data.subarray(0, 12),
      );
      decipher.setAuthTag(data.subarray(12, 28));
      const value = JSON.parse(
        Buffer.concat([
          decipher.update(data.subarray(28)),
          decipher.final(),
        ]).toString("utf8"),
      );
      if (value.exp <= now() || !value.token || !value.sid) return null;
      return value;
    } catch {
      return null;
    }
  }
  function cookie(request, value, maxAge) {
    const secure = production || new URL(request.url).protocol === "https:";
    return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}${maxAge !== undefined ? `; Max-Age=${maxAge}` : ""}`;
  }
  function json(data, status = 200, extra = {}) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        ...extra,
      },
    });
  }
  function csrf(request) {
    const url = new URL(request.url);
    const allowed = origins.length ? origins : [url.origin];
    if (
      !origins.length &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    ) {
      // Local preview is allowed; production must explicitly configure its own origin.
      if (production)
        throw new AppError(
          503,
          "ORIGIN_NOT_CONFIGURED",
          "Máy chủ chưa cấu hình APP_ORIGIN.",
        );
    }
    const origin = request.headers.get("origin");
    if (
      !origin ||
      !allowed.includes(origin) ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      request.headers.get("x-supadesk-request") !== "1"
    ) {
      throw new AppError(
        403,
        "ORIGIN_REJECTED",
        "Yêu cầu không đến từ trang SupaDesk được cấu hình.",
        "Mở app và API cùng tên miền. Trên hosting, đặt APP_ORIGIN đúng địa chỉ HTTPS của app; không thêm đường dẫn.",
      );
    }
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      throw new AppError(415, "JSON_REQUIRED", "API chỉ nhận JSON.");
  }
  function rateLimit(bucket, max) {
    for (const [key, value] of rateLimits)
      if (value.until <= now()) rateLimits.delete(key);
    if (rateLimits.size > 10_000)
      throw new AppError(
        429,
        "RATE_LIMIT",
        "Máy chủ đang bận, hãy thử lại sau.",
      );
    const entry = rateLimits.get(bucket) || { count: 0, until: now() + 60_000 };
    rateLimits.set(bucket, entry);
    if (++entry.count > max)
      throw new AppError(
        429,
        "RATE_LIMIT",
        "Quá nhiều yêu cầu trong một phút.",
        "Chờ một phút trước khi thử lại.",
      );
  }
  async function projects(token) {
    const result = await supabase.projects(token);
    if (!Array.isArray(result))
      throw new AppError(
        502,
        "UPSTREAM_FORMAT",
        "Không đọc được danh sách dự án.",
      );
    // Never return database connection details from Management API to the browser.
    return result.map((p) => ({
      ref: p.ref || p.id,
      name: p.name,
      region: p.region,
      status: p.status,
    }));
  }
  async function body(request) {
    if (Number(request.headers.get("content-length")) > 1_000_000)
      throw new AppError(
        413,
        "BODY_TOO_LARGE",
        "Dữ liệu gửi lên quá lớn (tối đa 1 MB).",
      );
    const reader = request.body?.getReader();
    if (!reader) throw new AppError(400, "INVALID_JSON", "Thiếu dữ liệu JSON.");
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1_000_000) {
        await reader.cancel();
        throw new AppError(
          413,
          "BODY_TOO_LARGE",
          "Dữ liệu gửi lên quá lớn (tối đa 1 MB).",
        );
      }
      chunks.push(value);
    }
    let result;
    try {
      result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AppError(400, "INVALID_JSON", "Nội dung JSON không hợp lệ.");
    }
    assert(
      result && typeof result === "object" && !Array.isArray(result),
      "Nội dung JSON phải là một đối tượng.",
    );
    return result;
  }

  return async function application(request) {
    let session;
    try {
      const path = new URL(request.url).pathname;
      if (request.method === "GET" && path === "/api/health")
        return json({ ok: true, app: "SupaDesk", version: "2.0.0" });
      session = unseal(request);
      if (request.method === "GET" && path === "/api/session") {
        if (!session)
          return json({ connected: false, backendVersion: "2.0.0" });
        return json({
          connected: true,
          projects: await projects(session.token),
          backendVersion: "2.0.0",
        });
      }
      if (!["/api/connect", "/api/disconnect", "/api/project"].includes(path))
        throw new AppError(404, "API_NOT_FOUND", "Không tìm thấy API này.");
      if (request.method !== "POST")
        return json(
          {
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: "Thao tác này yêu cầu POST.",
            },
          },
          405,
          { Allow: "POST" },
        );
      csrf(request);
      const input = await body(request);
      if (path === "/api/disconnect")
        return json({ connected: false }, 200, {
          "Set-Cookie": cookie(request, "", 0),
        });
      if (path === "/api/connect") {
        rateLimit(
          "connect:" + (request.headers.get("x-forwarded-for") || "local"),
          10,
        );
        assert(
          typeof input.token === "string" &&
            /^sbp_[A-Za-z0-9_-]{20,2044}$/.test(input.token),
          "Dùng Personal Access Token bắt đầu bằng sbp_. Không dùng khoá anon/service_role, API key hoặc token GitHub.",
          "WRONG_TOKEN_TYPE",
        );
        const list = await projects(input.token);
        const lifetime = input.remember === true ? 30 * DAY : 8 * 3600;
        const value = seal({
          token: input.token,
          exp: now() + lifetime * 1000,
          sid: randomUUID(),
        });
        return json({ connected: true, projects: list }, 200, {
          "Set-Cookie": cookie(
            request,
            value,
            input.remember === true ? lifetime : undefined,
          ),
        });
      }
      if (!session)
        throw new AppError(
          401,
          "SESSION_EXPIRED",
          "Phiên kết nối đã hết hạn hoặc cookie không được lưu.",
          "Kết nối lại bằng Access Token; cho phép cookie của trang. Nếu dùng hosting, đảm bảo SESSION_SECRET không thay đổi giữa các lần chạy.",
        );
      rateLimit("project:" + session.sid, 90);
      assert(
        typeof input.ref === "string" && /^[a-z]{20}$/.test(input.ref),
        "Mã dự án Supabase không hợp lệ.",
      );
      assert(typeof input.action === "string", "Thiếu thao tác cần thực hiện.");
      // Supabase re-checks token/project membership for every query; no service-role fallback.
      const isWrite =
        WRITES.has(input.action) ||
        (input.action === "sql" && input.input?.readOnly !== true);
      const run = async () => ({
        data: await projectAction(
          session.token,
          input.ref,
          input.action,
          input.input,
        ),
      });
      if (!isWrite) return json(await run());
      const requestId = request.headers.get("x-request-id");
      assert(
        typeof requestId === "string" && /^[\w-]{8,100}$/.test(requestId),
        "Thiếu mã yêu cầu hợp lệ cho thao tác ghi.",
      );
      for (const [key, item] of completed)
        if (item.exp < now()) completed.delete(key);
      if (completed.size >= 1000)
        throw new AppError(
          429,
          "WRITE_QUEUE_FULL",
          "Có nhiều thao tác ghi đang được theo dõi. Hãy thử lại sau.",
        );
      const id = session.sid + ":" + requestId;
      const digest = createHash("sha256")
        .update(JSON.stringify(input))
        .digest("hex");
      const previous = completed.get(id);
      if (previous) {
        if (previous.digest !== digest)
          throw new AppError(
            409,
            "REQUEST_ID_REUSED",
            "Mã yêu cầu đã được dùng cho nội dung khác.",
          );
        return json(await previous.promise);
      }
      const promise = run();
      completed.set(id, { digest, promise, exp: now() + 10 * 60_000 });
      return json(await promise);
    } catch (error) {
      const expected = error instanceof AppError;
      // Do not log token, SQL, request bodies or upstream response bodies.
      if (!expected) console.error("[SupaDesk] Internal error:", error.name);
      const err = expected
        ? error
        : new AppError(
            500,
            "INTERNAL_ERROR",
            "Máy chủ chưa hoàn tất thao tác.",
            "Kiểm tra cấu hình máy chủ. Với thao tác ghi, kiểm tra dữ liệu trước khi chạy lại.",
          );
      const extra = ["TOKEN_INVALID", "SESSION_EXPIRED"].includes(err.code)
        ? { "Set-Cookie": cookie(request, "", 0) }
        : {};
      return json(
        {
          error: {
            code: err.code,
            message: safeMessage(err.message),
            hint: safeMessage(err.hint),
          },
        },
        err.status,
        extra,
      );
    }
  };
}
