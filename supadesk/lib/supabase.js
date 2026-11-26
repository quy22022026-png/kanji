import { AppError, upstreamError } from "./errors.js";

// Tokens only go to this fixed origin, never to a URL supplied by the browser.
const BASE = "https://api.supabase.com/v1";
export function createSupabase(fetchImpl = fetch) {
  async function call(token, path, body, readOnly = false) {
    let response;
    try {
      response = await fetchImpl(BASE + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        redirect: "error",
        signal: AbortSignal.timeout(25_000),
      });
    } catch (err) {
      throw new AppError(
        504,
        "UPSTREAM_UNCERTAIN",
        "Không nhận được phản hồi từ Supabase.",
        "Kết quả chưa xác định. Nếu vừa ghi dữ liệu hoặc chạy SQL ghi, hãy kiểm tra trong Supabase trước khi thử lại.",
      );
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new AppError(
        502,
        "UPSTREAM_FORMAT",
        "Supabase trả về phản hồi không đọc được.",
        "Nếu vừa thực hiện thao tác ghi, kiểm tra kết quả trước khi thử lại.",
      );
    }
    if (!response.ok || result?.error) {
      const detail =
        typeof result === "string"
          ? result
          : result?.message || result?.error?.message || result?.error || "";
      throw upstreamError(
        response.status,
        typeof detail === "string" ? detail : JSON.stringify(detail),
        readOnly,
      );
    }
    return result;
  }
  return {
    projects: (token) => call(token, "/projects"),
    async query(token, ref, query, parameters = [], readOnly = true) {
      const result = await call(
        token,
        `/projects/${ref}/database/query${readOnly ? "/read-only" : ""}`,
        {
          query,
          parameters,
          disable_statement_timeout: false,
          ...(readOnly ? {} : { read_only: false }),
        },
        readOnly,
      );
      if (!Array.isArray(result))
        throw new AppError(
          502,
          "UPSTREAM_FORMAT",
          "Định dạng kết quả SQL từ Supabase không đúng.",
          "Kiểm tra kết quả trong Dashboard trước khi gửi lại thao tác ghi.",
        );
      return result;
    },
  };
}
