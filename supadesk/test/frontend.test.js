import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const html = await readFile(
  new URL("../public/index.html", import.meta.url),
  "utf8",
);
const script = await readFile(
  new URL("../public/app.js", import.meta.url),
  "utf8",
);
const REF = "abcdefghijklmnopqrst";
const columns = [
  {
    name: "id",
    data_type: "bigint",
    udt_name: "int8",
    primary_key: true,
    nullable: false,
  },
  { name: "name", data_type: "text", udt_name: "text", nullable: false },
];
async function eventually(check) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(check(), "UI did not reach the expected state");
}
async function mount({
  staticOnly = false,
  writerDenied = false,
  failColumns = false,
  failRefresh = false,
} = {}) {
  const dom = new JSDOM(html, {
    url: "https://example.test/repo/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom,
    calls = [];
  const errors = [];
  window.addEventListener("error", (event) => errors.push(event.error));
  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new window.Event("close"));
  };
  window.AbortSignal = AbortSignal;
  let saved = false;
  window.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path, body, options });
    if (staticOnly)
      return new Response("<h1>Not found</h1>", {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });
    if (path.endsWith("/session")) return Response.json({ connected: false });
    if (path.endsWith("/connect"))
      return Response.json({ projects: [{ ref: REF, name: "Demo" }] });
    if (path.endsWith("/disconnect"))
      return Response.json({ connected: false });
    let data;
    switch (body?.action) {
      case "access":
        data = {
          schema: "public",
          read: {
            status: "available",
            role: "supabase_read_only_user",
            schema_usage: true,
          },
          write: writerDenied
            ? {
                status: "denied",
                code: "TOKEN_SCOPE",
                message: "Thiếu quyền ghi",
                hint: "Cần Database Write.",
              }
            : {
                status: "available",
                role: "postgres",
                schema_create: true,
                schema_usage: true,
              },
        };
        break;
      case "catalog":
        if (saved && failRefresh)
          return Response.json(
            { error: { message: "Không tải lại được danh sách" } },
            { status: 502 },
          );
        data = {
          schemas: ["public"],
          tables: [
            { schema: "public", name: "items", kind: "table", rls: true },
          ],
        };
        break;
      case "columns":
        if (failColumns)
          return Response.json(
            {
              error: {
                message: "Không có quyền xem cấu trúc",
                code: "DATABASE_PERMISSION",
              },
            },
            { status: 403 },
          );
        data = { columns, primaryKeys: ["id"] };
        break;
      case "rows":
        data = {
          rows: [{ id: "9007199254740993", name: "Example" }],
          originals: ["a".repeat(32)],
          hasMore: false,
        };
        break;
      case "schemaCreate":
        saved = true;
        data = { created: true };
        break;
      case "sql":
        data = { rows: [{ result: 1 }], rowCount: 1, elapsedMs: 3 };
        break;
      default:
        data = {};
    }
    return Response.json({ data });
  };
  window.eval(script);
  const $ = (id) => window.document.getElementById(id);
  const submit = (id) =>
    $(id).dispatchEvent(
      new window.Event("submit", { cancelable: true, bubbles: true }),
    );
  await eventually(
    () =>
      !$("connect-open").disabled ||
      !$("deployment-notice").classList.contains("hidden"),
  );
  async function connect() {
    $("connect-open").click();
    $("access-token").value = "sbp_" + "a".repeat(40);
    submit("connect-form");
    await eventually(
      () =>
        calls.some((c) => c.body?.action === "catalog") &&
        !$("catalog-refresh").disabled,
    );
  }
  return { dom, window, $, calls, errors, submit, connect };
}

test("GitHub Pages shows a useful backend error and blocks token submission", async () => {
  const h = await mount({ staticOnly: true });
  try {
    assert.match(h.$("deployment-notice").textContent, /GitHub Pages/);
    assert.equal(h.$("connect-open").disabled, true);
    assert.equal(h.$("access-token").disabled, true);
    assert.equal(h.$("connect-submit").disabled, true);
    assert.equal(h.calls[0].path, "/repo/api/session");
    assert.deepEqual(h.errors, []);
  } finally {
    h.dom.window.close();
  }
});

test("connected read-only tokens keep read SQL available and disable write controls", async () => {
  const h = await mount({ writerDenied: true });
  try {
    await h.connect();
    assert.equal(h.$("table-create").disabled, true);
    assert.equal(h.$("sql-run").disabled, false);
    h.$("sql-readonly").checked = false;
    h.$("sql-readonly").dispatchEvent(new h.window.Event("change"));
    assert.equal(h.$("sql-run").disabled, true);
    h.$("access-open").click();
    assert.match(h.$("access-results").textContent, /Thiếu quyền/);
    assert.match(h.$("access-results").textContent, /Database Write/);
    assert.equal(h.$("access-dialog").open, true);
    assert.equal(h.$("access-token").value, "");
    assert.deepEqual(h.errors, []);
  } finally {
    h.dom.window.close();
  }
});

test("table load renders precise bigint values and enables edits only after metadata loads", async () => {
  const h = await mount();
  try {
    await h.connect();
    h.window.document.querySelector(".table-nav-button").click();
    await eventually(
      () =>
        h.window.document.querySelector(".row-edit") &&
        !h.$("row-add").disabled,
    );
    assert.match(h.$("data-area").textContent, /9007199254740993/);
    h.window.document.querySelector(".row-edit").click();
    assert.equal(h.$("row-dialog").open, true);
    const keyMode = h.$("row-fields").querySelector(".mode-picker");
    assert.equal(keyMode.disabled, true);
    h.submit("row-form");
    assert.match(h.$("row-error").textContent, /Chưa có giá trị/);
    assert.equal(h.calls.filter((c) => c.body?.action === "update").length, 0);
    assert.deepEqual(h.errors, []);
  } finally {
    h.dom.window.close();
  }
});

test("failed column reads clear the selected table and prevent stale row edits", async () => {
  const h = await mount({ failColumns: true });
  try {
    await h.connect();
    h.window.document.querySelector(".table-nav-button").click();
    await eventually(() =>
      h.$("notice").textContent.includes("Không có quyền xem cấu trúc"),
    );
    assert.equal(h.$("row-add").disabled, true);
    assert.equal(h.window.document.querySelector(".row-edit"), null);
    assert.equal(h.$("table-title").textContent, "Dữ liệu của bạn");
    assert.deepEqual(h.errors, []);
  } finally {
    h.dom.window.close();
  }
});

test("successful DDL followed by refresh failure is reported as saved, not a failed write", async () => {
  const h = await mount({ failRefresh: true });
  try {
    await h.connect();
    h.$("table-create").click();
    h.$("new-table-name").value = "created";
    h.submit("table-form");
    await eventually(() =>
      h.$("notice").textContent.includes("Không gửi lại thao tác"),
    );
    assert.match(h.$("notice").textContent, /Đã tạo bảng public.created/);
    assert.equal(h.$("notice").classList.contains("warning"), true);
    assert.equal(h.$("table-dialog").open, false);
    assert.equal(
      h.calls.filter((c) => c.body?.action === "schemaCreate").length,
      1,
    );
    assert.deepEqual(h.errors, []);
  } finally {
    h.dom.window.close();
  }
});
