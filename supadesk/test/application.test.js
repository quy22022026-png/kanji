import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApplication } from "../lib/application.js";
import { createNodeHandler } from "../lib/http.js";

const TOKEN = "sbp_" + "a".repeat(40),
  SECRET = "test-secret-with-more-than-thirty-two-characters";
const REF = "abcdefghijklmnopqrst",
  ORIGIN = "https://example.test";
const project = {
  ref: REF,
  name: "Demo",
  region: "local",
  status: "ACTIVE_HEALTHY",
  database: { host: "not-for-browser" },
};
function harness({
  failWrite = false,
  failRead = false,
  tokenStatus = 200,
  now,
} = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const body = options.body && JSON.parse(options.body);
    calls.push({ url, options, body });
    if (url.endsWith("/projects"))
      return Response.json(
        tokenStatus === 200 ? [project] : { message: "Invalid JWT" },
        { status: tokenStatus },
      );
    const readOnly = url.endsWith("/read-only");
    if ((readOnly && failRead) || (!readOnly && failWrite))
      return Response.json({ message: "Forbidden resource" }, { status: 403 });
    return Response.json(
      [{ role: "postgres", schema_usage: true, schema_create: true }],
      { status: 201 },
    );
  };
  const app = createApplication({
    secret: SECRET,
    origins: [ORIGIN],
    production: true,
    fetchImpl,
    now,
  });
  async function request(path, data, cookie, extra = {}) {
    return app(
      new Request(ORIGIN + path, {
        method: data === undefined ? "GET" : "POST",
        headers: {
          ...(data === undefined
            ? {}
            : {
                "Content-Type": "application/json",
                Origin: ORIGIN,
                "X-SupaDesk-Request": "1",
                "X-Request-ID": "request-12345678",
              }),
          ...(cookie ? { Cookie: cookie } : {}),
          ...extra,
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      }),
    );
  }
  async function login(remember = true) {
    const response = await request("/api/connect", { token: TOKEN, remember });
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie");
  }
  return { app, request, login, calls, fetchImpl };
}

test("encrypted HttpOnly cookie restores session, hides token and database credentials", async () => {
  const h = harness(),
    cookie = await h.login();
  assert.ok(!cookie.includes(TOKEN));
  assert.match(cookie, /HttpOnly; SameSite=Strict; Secure; Max-Age=2592000/);
  const restored = await h.request("/api/session", undefined, cookie);
  const data = await restored.json();
  assert.equal(data.connected, true);
  assert.deepEqual(data.projects, [
    { ref: REF, name: "Demo", region: "local", status: "ACTIVE_HEALTHY" },
  ]);
  assert.ok(!JSON.stringify(data).includes(TOKEN));
  assert.equal(
    (await h.request("/api/session", undefined, cookie.replace(/v2=./, "v2=X")))
      .status,
    200,
  );
  const forgotten = await h.request("/api/disconnect", {}, cookie);
  assert.match(forgotten.headers.get("set-cookie"), /Max-Age=0/);
});

test("session-only cookie has no persistent Max-Age and expires after eight hours", async () => {
  let clock = Date.now();
  const h = harness({ now: () => clock });
  const cookie = await h.login(false);
  assert.ok(!cookie.includes("Max-Age"));
  clock += 8 * 3600 * 1000 + 1;
  assert.equal(
    (await (await h.request("/api/session", undefined, cookie)).json())
      .connected,
    false,
  );
  assert.equal(
    (await h.request("/api/project", { ref: REF, action: "access" }, cookie))
      .status,
    401,
  );
});

test("production requires a stable encryption key and cookies work across instances with that key", async () => {
  assert.throws(
    () => createApplication({ production: true }),
    /SESSION_SECRET/,
  );
  const first = harness(),
    second = harness();
  const cookie = await first.login();
  assert.equal(
    (await (await second.request("/api/session", undefined, cookie)).json())
      .connected,
    true,
  );
});

test("wrong token types, malformed JSON, unknown actions and CSRF are rejected", async () => {
  const h = harness();
  const bad = await h.request("/api/connect", { token: "ghp_fakegithubtoken" });
  assert.equal((await bad.json()).error.code, "WRONG_TOKEN_TYPE");
  assert.equal(h.calls.length, 0);
  assert.equal(
    (
      await h.request("/api/connect", { token: TOKEN }, "", {
        Origin: "https://evil.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await h.request("/api/connect", { token: TOKEN }, "", {
        "X-SupaDesk-Request": "",
      })
    ).status,
    403,
  );
  const malformed = await h.app(
    new Request(ORIGIN + "/api/connect", {
      method: "POST",
      headers: {
        Origin: ORIGIN,
        "Content-Type": "application/json",
        "X-SupaDesk-Request": "1",
      },
      body: "{",
    }),
  );
  assert.equal((await malformed.json()).error.code, "INVALID_JSON");
  const cookie = await h.login();
  assert.equal(
    (
      await h.request(
        "/api/project",
        { ref: REF, action: "bad", input: {} },
        cookie,
      )
    ).status,
    400,
  );
});

test("SQL uses distinct API endpoints and write routing never silently escalates read-only requests", async () => {
  const h = harness(),
    cookie = await h.login();
  await h.request(
    "/api/project",
    { ref: REF, action: "sql", input: { query: "select 1", readOnly: true } },
    cookie,
  );
  let call = h.calls.at(-1);
  assert.match(call.url, /query\/read-only$/);
  assert.equal(call.body.disable_statement_timeout, false);
  assert.equal(Object.hasOwn(call.body, "read_only"), false);
  await h.request(
    "/api/project",
    { ref: REF, action: "sql", input: { query: "select 2", readOnly: false } },
    cookie,
  );
  call = h.calls.at(-1);
  assert.match(call.url, /database\/query$/);
  assert.equal(call.body.read_only, false);
  assert.equal(call.options.headers.Authorization, "Bearer " + TOKEN);
  assert.equal(call.options.redirect, "error");
});

test("403 diagnostics distinguish read and write access without any data changes", async () => {
  const h = harness({ failWrite: true }),
    cookie = await h.login();
  const response = await h.request(
    "/api/project",
    { ref: REF, action: "access", input: { schema: "public" } },
    cookie,
  );
  const { data } = await response.json();
  assert.equal(data.read.status, "available");
  assert.equal(data.write.status, "denied");
  assert.equal(data.write.code, "TOKEN_SCOPE");
  assert.ok(h.calls.slice(1).every((c) => c.body.query.startsWith("SELECT")));
  const write = await h.request(
    "/api/project",
    {
      ref: REF,
      action: "sql",
      input: { query: "create table public.x(id int)", readOnly: false },
    },
    cookie,
  );
  assert.equal(write.status, 403);
  assert.match((await write.json()).error.hint, /Write/);
});

test("repeated write request IDs do not execute twice within one instance", async () => {
  const h = harness(),
    cookie = await h.login();
  const body = {
    ref: REF,
    action: "sql",
    input: { query: "select 1", readOnly: false },
  };
  const responses = await Promise.all([
    h.request("/api/project", body, cookie),
    h.request("/api/project", body, cookie),
  ]);
  assert.ok(responses.every((r) => r.ok));
  assert.equal(h.calls.filter((c) => c.body?.query === "select 1").length, 1);
  assert.equal(
    (
      await h.request(
        "/api/project",
        { ...body, input: { query: "select 2", readOnly: false } },
        cookie,
      )
    ).status,
    409,
  );
});

test("invalid upstream token is explained and cookie is cleared", async () => {
  const h = harness({ tokenStatus: 401 });
  const response = await h.request("/api/connect", { token: TOKEN });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "TOKEN_INVALID");
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
});

test("Node HTTP and Vercel rewrite adapter serve real assets and API responses", async () => {
  const server = createServer(
    createNodeHandler({ production: false, secret: SECRET, vercel: true }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ["/", "/app.js", "/style.css", "/favicon.svg"]) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200);
      assert.ok(response.headers.get("content-security-policy"));
      assert.ok((await response.text()).length > 100);
    }
    const health = await fetch(origin + "/api/router?path=health");
    assert.equal((await health.json()).app, "SupaDesk");
    const session = await fetch(origin + "/api/session");
    assert.equal((await session.json()).connected, false);
    assert.equal((await fetch(origin + "/.env")).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
