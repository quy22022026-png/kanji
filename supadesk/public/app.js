const $ = (id) => document.getElementById(id);
const paths = {
  layers: '<path d="m12 3 10 6-10 6L2 9Zm-9 10 9 6 9-6M3 17l9 6 9-6"/>',
  plug: '<path d="M8 3v5m8-5v5M5 8h14v3a7 7 0 0 1-14 0Zm7 10v4"/>',
  table:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12M3 15h18"/>',
  refresh:
    '<path d="M20 8a8 8 0 0 0-14-4L3 7m0-5v5h5m-4 9a8 8 0 0 0 14 4l3-3m0 5v-5h-5"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  shield:
    '<path d="m12 2 9 4v6c0 5-5 9-9 10-4-1-9-5-9-10V6Z"/><path d="m8 12 3 3 5-6"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
  columns:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18m6-18v18"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  play: '<path d="m8 4 13 8-13 8Z"/>',
  rows: '<path d="M3 5h18M3 12h18M3 19h18"/>',
  download: '<path d="M12 2v13m-5-5 5 5 5-5M3 16v5h18v-5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3v.1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  edit: '<path d="m15 3 6 6-12 12H3v-6Z"/><path d="m12 6 6 6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  key: '<circle cx="7" cy="8" r="5"/><path d="m11 12 10 10m-5-5 3-3"/>',
};
function icon(name) {
  const s = document.createElement("span");
  s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.table}</svg>`;
  return s.firstElementChild;
}
for (const e of document.querySelectorAll("[data-icon]"))
  e.append(icon(e.dataset.icon));
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const state = {
  connected: false,
  projects: [],
  ref: "",
  tables: [],
  schemas: [],
  schema: "public",
  table: null,
  columns: [],
  primaryKeys: [],
  rows: [],
  originals: [],
  offset: 0,
  limit: 25,
  hasMore: false,
  filter: null,
  busy: false,
  view: "data",
  sqlResult: null,
};
const PREF = "supadesk.view.v1";
state.access = null;
state.backend = "checking";
const apiBase = new URL("./", location.href);
function requestId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2) +
      "-" +
      Math.random().toString(36).slice(2)
  );
}
function errorText(err) {
  return [err.message, err.hint].filter(Boolean).join(" ");
}
function readPreference() {
  try {
    return JSON.parse(localStorage.getItem(PREF) || "null") || {};
  } catch {
    return {};
  }
}
function rememberView() {
  try {
    localStorage.setItem(
      PREF,
      JSON.stringify({
        ref: state.ref,
        schema: state.schema,
        table: state.table?.name || "",
      }),
    );
  } catch {}
}
function showNotice(message, type = "success") {
  const n = $("notice");
  n.replaceChildren(document.createTextNode(message));
  n.className = `notice ${type}`;
}
function showError(err, target) {
  const message = errorText(err) || "Không hoàn tất được thao tác.";
  if (err.code === "BACKEND_MISSING") setBackendMissing(message);
  const box = target ? $(target) : null;
  if (box) {
    box.textContent = message;
    return;
  }
  showNotice(message, "error");
}
function clearNotice() {
  $("notice").className = "notice hidden";
}
function setBackendMissing(message) {
  state.backend = "missing";
  state.connected = false;
  const n = $("deployment-notice");
  n.className = "deployment-notice";
  n.replaceChildren(
    el("strong", null, "Hosting chưa có backend SupaDesk. "),
    document.createTextNode(
      message +
        " GitHub Pages chỉ chạy giao diện tĩnh; hãy triển khai cả repo lên Vercel hoặc máy chủ Node.js theo README, rồi mở địa chỉ app mới. Không dán Access Token khi chưa có backend.",
    ),
  );
  updateControls();
}
async function api(path, body) {
  if (location.protocol === "file:") {
    const err = Error("Không chạy API khi mở trực tiếp file HTML.");
    err.code = "BACKEND_MISSING";
    throw err;
  }
  let r;
  try {
    r = await fetch(new URL(path.replace(/^\//, ""), apiBase), {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      headers:
        body === undefined
          ? {}
          : {
              "Content-Type": "application/json",
              "X-SupaDesk-Request": "1",
              "X-Request-ID": requestId(),
            },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      signal: AbortSignal.timeout(body === undefined ? 15000 : 70000),
    });
  } catch {
    throw Error(
      "Không nhận được phản hồi từ máy chủ. Nếu vừa lưu hoặc chạy SQL ghi, hãy làm mới để kiểm tra kết quả trước khi thử lại.",
    );
  }
  if (!r.headers.get("content-type")?.includes("application/json")) {
    const err = Error(
      "Đường dẫn API không trả về JSON. Có thể bạn chỉ tải lên bốn file giao diện hoặc hosting đang chuyển API về index.html.",
    );
    err.code = "BACKEND_MISSING";
    throw err;
  }
  let data;
  try {
    data = await r.json();
  } catch {
    throw Error(
      "Không đọc được phản hồi. Hãy kiểm tra kết quả trước khi gửi lại thao tác.",
    );
  }
  if (!r.ok || data?.error) {
    const detail = data?.error;
    const err = Error(
      typeof detail === "string"
        ? detail
        : detail?.message || `Lỗi máy chủ (${r.status}).`,
    );
    Object.assign(err, {
      status: r.status,
      code: detail?.code,
      hint: detail?.hint,
    });
    if (["SESSION_EXPIRED", "TOKEN_INVALID"].includes(err.code)) {
      state.connected = false;
      state.access = null;
      state.projects = [];
      state.ref = "";
      state.tables = [];
      resetTable();
      clearSqlResults();
      fillProjects();
      renderTableList();
    }
    throw err;
  }
  return data;
}
async function projectAction(action, input = {}) {
  if (!state.ref) throw Error("Vui lòng chọn dự án Supabase.");
  return (await api("/api/project", { ref: state.ref, action, input })).data;
}
async function work(fn, errorId) {
  if (state.busy) return;
  state.busy = true;
  updateControls();
  try {
    return await fn();
  } catch (err) {
    showError(err, errorId);
    if (errorId && !$(errorId).closest("dialog")?.open) showError(err);
  } finally {
    state.busy = false;
    updateControls();
  }
}
function updateControls() {
  const project = state.connected && !!state.ref,
    table = project && !!state.table,
    editing = table && state.primaryKeys.length > 0,
    writer = state.access?.write?.status !== "denied",
    backend = state.backend !== "missing";
  for (const b of document.querySelectorAll(
    ".header button,.app-shell button,.app-shell input,.app-shell select,.app-shell textarea",
  ))
    b.disabled = state.busy;
  $("connect-open").classList.toggle("hidden", state.connected);
  $("disconnect").classList.toggle("hidden", !state.connected);
  $("connection-state").replaceChildren(
    el("i"),
    document.createTextNode(state.connected ? "Đã kết nối" : "Chưa kết nối"),
  );
  $("connection-state").classList.toggle("live", state.connected);
  $("project").disabled = !state.connected || state.busy;
  $("connect-open").disabled = state.busy || !backend;
  $("connect-submit").disabled = state.busy || !backend;
  $("access-token").disabled = state.busy || !backend;
  $("access-open").disabled = !project || state.busy;
  $("access-refresh").disabled = !project || state.busy;
  $("table-create").title = writer
    ? "Tạo bảng với quyền của Access Token"
    : "Token/tài khoản chưa có quyền ghi";
  for (const id of [
    "schema",
    "table-search",
    "catalog-refresh",
    "table-create",
    "sql-run",
  ])
    $(id).disabled = !project || state.busy;
  for (const id of [
    "rows-refresh",
    "column-add",
    "filter-column",
    "filter-operator",
    "filter-value",
    "filter-apply",
    "filter-clear",
    "page-size",
  ])
    $(id).disabled = !table || state.busy;
  $("table-create").disabled =
    !project ||
    state.busy ||
    !writer ||
    state.access?.write?.schema_create === false;
  $("sql-run").disabled =
    !project || state.busy || (!$("sql-readonly").checked && !writer);
  $("column-add").disabled =
    !table || state.busy || !writer || state.table.kind !== "table";
  for (const button of document.querySelectorAll(".column-rename"))
    button.disabled =
      !table || state.busy || !writer || state.table.kind !== "table";
  $("filter-value").disabled =
    !table || state.busy || $("filter-operator").value === "is_null";
  $("row-add").disabled =
    !table ||
    state.busy ||
    !writer ||
    (state.table && state.table.kind !== "table");
  $("page-prev").disabled = !table || state.busy || state.offset === 0;
  $("page-next").disabled = !table || state.busy || !state.hasMore;
  $("sql-download").disabled = state.busy || !state.sqlResult;
  for (const b of document.querySelectorAll(".row-edit,.row-delete"))
    b.disabled =
      state.busy ||
      !editing ||
      !writer ||
      (state.table && state.table.kind !== "table");
  for (const form of document.querySelectorAll("dialog form"))
    form.inert = state.busy;
  $("sql-project").textContent = project
    ? `${selectedProject()?.name || state.ref} · ${state.ref}`
    : "Chọn dự án trước khi chạy truy vấn";
}
function clearSqlResults() {
  state.sqlResult = null;
  $("sql-results").replaceChildren(
    el("div", "simple-empty", "Kết quả truy vấn sẽ xuất hiện ở đây."),
  );
  $("sql-result-meta").textContent = "Chưa chạy truy vấn";
}
function selectedProject() {
  return state.projects.find((p) => (p.ref || p.id) === state.ref);
}
function currentContext() {
  return `${selectedProject()?.name || state.ref} / ${state.schema}.${state.table?.name || ""}`;
}
function openConnect(help = false) {
  if (state.busy) return;
  $("connect-error").textContent = "";
  $("connect-dialog").showModal();
  if (help) $("connect-dialog").querySelector("details").open = true;
}
for (const id of ["connect-open", "empty-connect"])
  $(id).onclick = () => openConnect();
$("help-open").onclick = () => openConnect(true);
for (const b of document.querySelectorAll("[data-close]"))
  b.onclick = () => $(b.dataset.close).close();
for (const dialog of document.querySelectorAll("dialog:not(#confirm-dialog)"))
  dialog.addEventListener("cancel", (e) => {
    if (state.busy) e.preventDefault();
  });
$("connect-dialog").addEventListener("close", () => {
  $("access-token").value = "";
});
function fillProjects() {
  const p = $("project");
  p.replaceChildren(new Option("Chọn dự án…", ""));
  for (const item of state.projects)
    p.add(
      new Option(
        `${item.name} · ${item.region || item.ref || item.id}`,
        item.ref || item.id,
      ),
    );
  p.value = state.ref;
}
$("connect-form").onsubmit = (e) => {
  e.preventDefault();
  const token = $("access-token").value.trim(),
    remember = $("remember").checked;
  if (state.busy) return;
  $("connect-error").textContent = "";
  $("connect-submit").disabled = true;
  work(async () => {
    const d = await api("/api/connect", { token, remember });
    state.connected = true;
    state.access = null;
    $("access-summary").textContent =
      "Đã kết nối · Chọn dự án để kiểm tra quyền.";
    state.projects = d.projects || [];
    state.ref = "";
    state.tables = [];
    state.schemas = [];
    resetTable();
    clearSqlResults();
    renderTableList();
    fillProjects();
    $("connect-dialog").close();
    showNotice("Đã kết nối Supabase. Chọn dự án để bắt đầu.");
    if (state.projects.length === 1)
      await chooseProject(state.projects[0].ref || state.projects[0].id);
  }, "connect-error").finally(() => {
    $("access-token").value = "";
    $("connect-submit").disabled = false;
  });
};
$("disconnect").onclick = () =>
  work(async () => {
    await api("/api/disconnect", {});
    state.connected = false;
    state.access = null;
    $("access-summary").textContent = "Đã ngắt kết nối · Chưa kiểm tra quyền.";
    state.projects = [];
    state.ref = "";
    resetTable();
    clearSqlResults();
    state.tables = [];
    state.schemas = [];
    fillProjects();
    renderTableList();
    $("schema").replaceChildren(new Option("public", "public"));
    showNotice("Đã ngắt và quên kết nối đã lưu.");
  });
function resetTable() {
  state.table = null;
  state.columns = [];
  state.primaryKeys = [];
  state.rows = [];
  state.originals = [];
  state.offset = 0;
  state.hasMore = false;
  state.filter = null;
  $("filter-column").replaceChildren(new Option("Chọn cột lọc", ""));
  $("filter-value").value = "";
  $("table-title").textContent = "Dữ liệu của bạn";
  $("table-subtitle").textContent = "Chọn một bảng để bắt đầu";
  $("structure-title").textContent = "Cấu trúc bảng";
  $("data-area").replaceChildren(
    el("div", "simple-empty", "Chọn một bảng ở danh sách để xem dữ liệu."),
  );
  $("structure-area").replaceChildren(
    el("div", "simple-empty", "Chọn bảng để xem cấu trúc."),
  );
  $("row-summary").textContent = "Chưa chọn bảng";
}
async function chooseProject(ref) {
  state.access = null;
  state.ref = ref;
  $("access-summary").textContent = ref
    ? "Đang kiểm tra dự án…"
    : "Chọn dự án để kiểm tra quyền.";
  $("table-search").value = "";
  $("project").value = ref;
  clearSqlResults();
  resetTable();
  state.tables = [];
  state.schemas = [];
  renderTableList();
  if (!ref) {
    updateControls();
    return;
  }
  const prefs = readPreference();
  state.schema = prefs.ref === ref && prefs.schema ? prefs.schema : "public";
  await loadAccess();
  await loadCatalog(prefs.ref === ref ? prefs : {});
  if (state.access?.schema !== state.schema) await loadAccess();
  rememberView();
}
async function loadCatalog(preferred = {}) {
  const data = await projectAction("catalog");
  state.tables = data.tables || [];
  state.schemas = data.schemas || [
    ...new Set(state.tables.map((t) => t.schema)),
  ];
  if (!state.schemas.length) state.schemas = ["public"];
  state.schemas = state.schemas.map((s) =>
    typeof s === "string" ? s : s.name || s.schema,
  );
  state.schema = state.schemas.includes(preferred.schema)
    ? preferred.schema
    : state.schemas.includes(state.schema)
      ? state.schema
      : state.schemas[0];
  $("schema").replaceChildren(...state.schemas.map((s) => new Option(s, s)));
  $("schema").value = state.schema;
  renderTableList();
  const target = state.tables.find(
    (t) =>
      t.schema === state.schema &&
      t.name === (preferred.table || state.table?.name),
  );
  if (target) await chooseTable(target);
  else if (state.table) resetTable();
}
$("project").onchange = () =>
  work(async () => {
    clearNotice();
    await chooseProject($("project").value);
  });
$("schema").onchange = () =>
  work(async () => {
    state.schema = $("schema").value;
    state.access = null;
    resetTable();
    renderTableList();
    rememberView();
    await loadAccess();
  });
$("table-search").oninput = renderTableList;
$("catalog-refresh").onclick = () =>
  work(async () => {
    await loadCatalog();
    showNotice("Đã làm mới danh sách bảng.");
  });
function renderTableList() {
  const list = $("table-list");
  list.replaceChildren();
  const search = $("table-search").value.toLowerCase();
  const tables = state.tables.filter(
    (t) => t.schema === state.schema && t.name.toLowerCase().includes(search),
  );
  if (!tables.length)
    list.append(
      el(
        "p",
        "sidebar-empty",
        state.connected
          ? "Chưa có bảng trong schema này. Tạo bảng mới hoặc chọn schema khác."
          : "Kết nối Supabase để xem các bảng.",
      ),
    );
  for (const t of tables) {
    const b = el(
      "button",
      `table-nav-button ${state.table?.name === t.name && state.table?.schema === t.schema ? "active" : ""}`,
    );
    b.append(icon("table"), el("span", null, t.name));
    if (t.rls) b.append(icon("shield"));
    b.title = `${t.schema}.${t.name}`;
    b.onclick = () =>
      work(async () => {
        clearNotice();
        await chooseTable(t);
        $("table-navigation").classList.remove("mobile-open");
        $("mobile-tables").setAttribute("aria-expanded", "false");
      });
    list.append(b);
  }
  updateControls();
}
$("mobile-tables").onclick = () => {
  const open = $("table-navigation").classList.toggle("mobile-open");
  $("mobile-tables").setAttribute("aria-expanded", String(open));
};
async function chooseTable(table) {
  state.table = table;
  state.schema = table.schema;
  state.offset = 0;
  state.filter = null;
  state.rows = [];
  state.originals = [];
  state.columns = [];
  state.primaryKeys = [];
  $("data-area").replaceChildren(
    el("div", "loading-state", "Đang đọc cấu trúc…"),
  );
  $("structure-area").replaceChildren(
    el("div", "simple-empty", "Đang đọc cấu trúc…"),
  );
  $("filter-operator").value = "eq";
  let data;
  try {
    data = await projectAction("columns", {
      schema: table.schema,
      table: table.name,
    });
  } catch (error) {
    resetTable();
    renderTableList();
    throw error;
  }
  state.columns = data.columns || [];
  state.primaryKeys =
    data.primaryKeys ||
    state.columns.filter((c) => c.primary_key).map((c) => c.name);
  $("table-title").textContent = table.name;
  $("table-subtitle").textContent =
    `${table.schema} · ${state.columns.length} cột${state.primaryKeys.length ? " · " + state.primaryKeys.length + " khoá chính" : " · Chưa có khoá chính"}`;
  $("structure-title").textContent = `${table.schema}.${table.name}`;
  $("filter-column").replaceChildren(
    new Option("Chọn cột lọc", ""),
    ...state.columns.map((c) => new Option(c.name, c.name)),
  );
  $("filter-value").value = "";
  renderTableList();
  renderStructure();
  await loadRows();
  rememberView();
}
async function loadRows() {
  if (!state.table) return;
  state.rows = [];
  state.originals = [];
  state.hasMore = false;
  $("data-area").replaceChildren(
    el("div", "loading-state", "Đang đọc dữ liệu…"),
  );
  const input = {
    schema: state.schema,
    table: state.table.name,
    offset: state.offset,
    limit: state.limit,
    ...(state.filter ? { filter: state.filter } : {}),
  };
  try {
    const d = await projectAction("rows", input);
    state.rows = d.rows || [];
    state.originals = d.originals || [];
    state.hasMore = !!d.hasMore;
    renderRows();
  } catch (err) {
    $("data-area").replaceChildren(
      el("div", "error-block", `Chưa đọc được dữ liệu. ${errorText(err)}`),
    );
    $("row-summary").textContent = "Chưa tải được dữ liệu";
    throw err;
  }
}
function cellText(value) {
  if (value === null) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function dataGrid(rows, columns, withActions = false) {
  const wrap = el("div", "grid-scroll"),
    table = el("table", "data-table"),
    head = el("thead"),
    hr = el("tr");
  for (const col of columns) {
    const th = el("th", null, col.name || col);
    if (col.primary_key) th.prepend(icon("key"));
    if (col.data_type) th.append(el("small", null, col.data_type));
    hr.append(th);
  }
  if (withActions) hr.append(el("th", null, "THAO TÁC"));
  head.append(hr);
  table.append(head);
  const body = el("tbody");
  rows.forEach((row, index) => {
    const tr = el("tr");
    for (const col of columns) {
      const name = col.name || col,
        value = row?.[name];
      const td = el(
        "td",
        value === null
          ? "null-value"
          : typeof value === "object"
            ? "value-json"
            : typeof value === "boolean"
              ? "bool-value"
              : "",
        value === undefined ? "—" : cellText(value),
      );
      td.title = value === undefined ? "" : cellText(value);
      tr.append(td);
    }
    if (withActions) {
      const td = el("td", "table-row-actions");
      for (const [action, title, ico] of [
        ["edit", "Sửa dòng", "edit"],
        ["delete", "Xoá dòng", "trash"],
      ]) {
        const b = el("button", `icon-button row-${action}`);
        b.append(icon(ico));
        b.title = state.primaryKeys.length
          ? title
          : "Bảng cần khoá chính để sửa/xoá";
        b.setAttribute("aria-label", `${title} ${index + 1}`);
        b.onclick = () =>
          action === "edit" ? openRow(index) : deleteRow(index);
        td.append(b);
      }
      tr.append(td);
    }
    body.append(tr);
  });
  table.append(body);
  wrap.append(table);
  return wrap;
}
function renderRows() {
  const area = $("data-area");
  area.replaceChildren(dataGrid(state.rows, state.columns, true));
  if (!state.rows.length)
    area.append(
      el(
        "div",
        "simple-empty",
        state.filter
          ? "Không có dòng khớp điều kiện lọc."
          : "Bảng chưa có dữ liệu. Bấm “Thêm dòng” để bắt đầu.",
      ),
    );
  $("row-summary").textContent = state.rows.length
    ? `Dòng ${state.offset + 1}–${state.offset + state.rows.length}${state.filter ? " · Đang lọc" : ""}`
    : "0 dòng";
  updateControls();
}
$("rows-refresh").onclick = () =>
  work(async () => {
    await loadRows();
    showNotice("Đã làm mới dữ liệu.");
  });
$("filter-form").onsubmit = (e) => {
  e.preventDefault();
  work(async () => {
    const column = $("filter-column").value;
    if (!column) throw Error("Chọn cột cần lọc.");
    state.filter = {
      column,
      operator: $("filter-operator").value,
      value:
        $("filter-operator").value === "ilike"
          ? "%" + $("filter-value").value.replace(/[\\%_]/g, "\\$&") + "%"
          : $("filter-value").value,
    };
    state.offset = 0;
    await loadRows();
  });
};
$("filter-operator").onchange = updateControls;
$("filter-clear").onclick = () =>
  work(async () => {
    state.filter = null;
    state.offset = 0;
    $("filter-value").value = "";
    await loadRows();
  });
$("page-size").onchange = () =>
  work(async () => {
    state.limit = Number($("page-size").value);
    state.offset = 0;
    await loadRows();
  });
$("page-prev").onclick = () =>
  work(async () => {
    state.offset = Math.max(0, state.offset - state.limit);
    await loadRows();
  });
$("page-next").onclick = () =>
  work(async () => {
    state.offset += state.limit;
    await loadRows();
  });
for (const b of document.querySelectorAll("[data-view]"))
  b.onclick = () => {
    state.view = b.dataset.view;
    for (const tab of document.querySelectorAll("[data-view]")) {
      tab.classList.toggle("active", tab === b);
      if (tab === b) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    }
    for (const view of ["data", "structure", "sql"])
      $(`${view}-view`).classList.toggle("hidden", state.view !== view);
  };
let rowDraft = null;
function openRow(index = null) {
  if (state.busy || !state.table) return;
  const editing = index !== null;
  rowDraft = {
    index,
    row: editing ? state.rows[index] : {},
    original: editing ? state.originals[index] : null,
    fields: [],
  };
  $("row-dialog-title").textContent = editing
    ? "Sửa dòng dữ liệu"
    : "Thêm dòng dữ liệu";
  $("row-dialog-context").textContent = currentContext();
  $("row-error").textContent = "";
  const fields = $("row-fields");
  fields.replaceChildren();
  for (const c of state.columns) {
    const box = el("div", "row-edit-field"),
      label = el("label", "field"),
      caption = el("span", null, c.name);
    caption.append(
      el(
        "small",
        null,
        ` ${c.data_type}${c.primary_key ? " · Khoá chính" : ""}`,
      ),
    );
    const mode = el("select", "mode-picker");
    mode.add(new Option(editing ? "Giữ nguyên" : "Dùng mặc định", "skip"));
    mode.add(new Option("Đặt giá trị", "value"));
    mode.add(new Option("NULL", "null"));
    let input;
    if (c.data_type === "boolean") {
      input = el("select", "value-input");
      input.add(new Option("true", "true"));
      input.add(new Option("false", "false"));
    } else
      input = el(
        c.udt_name === "json" ||
          c.udt_name === "jsonb" ||
          c.data_type === "json" ||
          c.data_type === "jsonb" ||
          c.data_type.endsWith("[]") ||
          c.udt_name?.startsWith("_")
          ? "textarea"
          : "input",
        "value-input",
      );
    if (input.tagName === "INPUT") input.type = "text";
    input.setAttribute("aria-label", `Giá trị ${c.name}`);
    mode.setAttribute("aria-label", `Cách nhập ${c.name}`);
    const current = rowDraft.row[c.name];
    input.value =
      current === null || current === undefined
        ? ""
        : typeof current === "object"
          ? JSON.stringify(current, null, 2)
          : String(current);
    input.placeholder = c.default_value || c.data_type;
    const immutable =
      (editing && c.primary_key) ||
      c.is_generated === true ||
      c.is_generated === "ALWAYS" ||
      (c.is_identity === true && c.identity_generation === "ALWAYS");
    mode.disabled = immutable;
    input.disabled = immutable;
    input.oninput = () => {
      mode.value = "value";
    };
    mode.onchange = () => {
      input.disabled = immutable || mode.value === "null";
      if (mode.value === "value") input.focus();
    };
    label.append(caption, input);
    box.append(label, mode);
    fields.append(box);
    rowDraft.fields.push({ column: c, mode, input, immutable });
  }
  $("row-dialog").showModal();
}
$("row-add").onclick = () => openRow();
function draftValues() {
  const values = Object.create(null);
  for (const { column: c, mode, input, immutable } of rowDraft.fields) {
    if (immutable || mode.value === "skip") continue;
    if (mode.value === "null") {
      values[c.name] = null;
      continue;
    }
    const text = input.value;
    if (
      c.udt_name === "json" ||
      c.udt_name === "jsonb" ||
      c.data_type === "json" ||
      c.data_type === "jsonb" ||
      c.data_type.endsWith("[]") ||
      c.udt_name?.startsWith("_")
    ) {
      try {
        values[c.name] = JSON.parse(text);
      } catch {
        throw Error(`${c.name}: nhập JSON hợp lệ.`);
      }
    } else if (c.data_type === "boolean") values[c.name] = text === "true";
    else values[c.name] = text;
  }
  return values;
}
$("row-form").onsubmit = (e) => {
  e.preventDefault();
  if (state.busy) return;
  $("row-error").textContent = "";
  let values;
  try {
    values = draftValues();
  } catch (err) {
    showError(err, "row-error");
    return;
  }
  const draft = rowDraft,
    editing = draft.index !== null;
  if (editing && !Object.keys(values).length) {
    showError(Error("Chưa có giá trị nào được thay đổi."), "row-error");
    return;
  }
  const input = {
    schema: state.schema,
    table: state.table.name,
    values,
    ...(editing
      ? {
          key: Object.fromEntries(
            state.primaryKeys.map((k) => [k, draft.row[k]]),
          ),
          original: draft.original,
        }
      : {}),
  };
  $("row-submit").disabled = true;
  work(async () => {
    await projectAction(editing ? "update" : "insert", input);
    $("row-dialog").close();
    await refreshAfterWrite(
      () => loadRows(),
      editing ? "Đã lưu thay đổi của dòng dữ liệu." : "Đã thêm dòng dữ liệu.",
    );
  }, "row-error").finally(() => {
    $("row-submit").disabled = false;
  });
};
let confirmResolve = null;
function confirmAction(
  title,
  description,
  preview,
  button = "Xác nhận",
  danger = false,
) {
  $("confirm-title").textContent = title;
  $("confirm-description").textContent = description;
  $("confirm-preview").textContent = preview;
  $("confirm-submit").textContent = button;
  $("confirm-submit").className = `button ${danger ? "danger" : "dark"}`;
  $("confirm-dialog").showModal();
  $("confirm-cancel").focus();
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}
function resolveConfirmation(yes) {
  $("confirm-dialog").close();
  const r = confirmResolve;
  confirmResolve = null;
  r?.(yes);
}
$("confirm-submit").onclick = () => resolveConfirmation(true);
$("confirm-cancel").onclick = $("confirm-close").onclick = () =>
  resolveConfirmation(false);
$("confirm-dialog").addEventListener("cancel", (e) => {
  e.preventDefault();
  resolveConfirmation(false);
});
function deleteRow(index) {
  work(async () => {
    const row = state.rows[index],
      key = Object.fromEntries(state.primaryKeys.map((k) => [k, row[k]])),
      input = {
        schema: state.schema,
        table: state.table.name,
        key,
        original: state.originals[index],
      };
    if (
      !(await confirmAction(
        "Xoá dòng dữ liệu?",
        currentContext(),
        JSON.stringify(key, null, 2),
        "Xoá dòng",
        true,
      ))
    )
      return;
    await projectAction("delete", input);
    if (state.rows.length === 1 && state.offset)
      state.offset = Math.max(0, state.offset - state.limit);
    await refreshAfterWrite(() => loadRows(), "Đã xoá dòng dữ liệu.");
  });
}
function renderStructure() {
  const a = $("structure-area");
  a.replaceChildren();
  for (const c of state.columns) {
    const card = el("div", "column-card"),
      top = el("div", "column-top"),
      name = el("h3", null, c.name);
    if (c.primary_key) name.prepend(icon("key"));
    top.append(name, el("span", "badge", c.data_type));
    const b = el("button", "text-button column-rename", "Đổi tên");
    b.prepend(icon("edit"));
    b.onclick = () => openColumn(c);
    top.append(b);
    const props = el("div", "column-properties");
    props.append(el("span", "tag", c.nullable ? "Cho phép NULL" : "NOT NULL"));
    if (c.primary_key) props.append(el("span", "tag", "PRIMARY KEY"));
    if (c.default_value)
      props.append(el("code", null, `Mặc định: ${c.default_value}`));
    card.append(top, props);
    a.append(card);
  }
  updateControls();
}
const TYPES = [
  "text",
  "bigint",
  "integer",
  "numeric",
  "boolean",
  "uuid",
  "jsonb",
  "date",
  "timestamptz",
];
function columnBuilder(initial = {}, allowPrimary = true) {
  const box = el("div", "column-builder"),
    grid = el("div", "builder-grid"),
    name = el("input"),
    type = el("select"),
    def = el("select");
  name.type = "text";
  name.placeholder = "ten_cot";
  name.value = initial.name || "";
  name.maxLength = 63;
  name.required = true;
  name.setAttribute("aria-label", "Tên cột");
  for (const t of TYPES) type.add(new Option(t, t));
  type.value = initial.type || "text";
  type.setAttribute("aria-label", "Kiểu dữ liệu");
  for (const [text, value] of [
    ["Không mặc định", "none"],
    ["UUID tự sinh", "uuid"],
    ["Thời gian hiện tại", "now"],
    ["Số tự tăng", "identity"],
  ])
    def.add(new Option(text, value));
  def.value = initial.default || "none";
  def.setAttribute("aria-label", "Giá trị mặc định");
  grid.append(name, type, def);
  const actions = el("div", "builder-actions"),
    nullable = el("input"),
    pk = el("input");
  nullable.type = pk.type = "checkbox";
  nullable.checked = initial.nullable !== false;
  pk.checked = !!initial.primaryKey;
  const nlabel = el("label", null, "Cho phép NULL");
  nlabel.prepend(nullable);
  actions.append(nlabel);
  if (allowPrimary) {
    const plabel = el("label", null, "Khoá chính");
    plabel.prepend(pk);
    actions.append(plabel);
    pk.onchange = () => {
      if (pk.checked) nullable.checked = false;
    };
  }
  box.append(grid, actions);
  return {
    box,
    read: () => ({
      name: name.value.trim(),
      type: type.value,
      default: def.value,
      nullable: nullable.checked,
      primaryKey: allowPrimary && pk.checked,
    }),
  };
}
let tableBuilders = [];
function appendTableColumn(initial = {}) {
  const builder = columnBuilder(initial);
  const remove = el("button", "icon-button");
  remove.type = "button";
  remove.setAttribute("aria-label", "Bỏ cột");
  remove.append(icon("close"));
  remove.onclick = () => {
    tableBuilders = tableBuilders.filter((b) => b !== builder);
    builder.box.remove();
  };
  builder.box.querySelector(".builder-actions").append(remove);
  tableBuilders.push(builder);
  $("new-table-columns").append(builder.box);
}
$("table-create").onclick = () => {
  if (state.busy) return;
  $("new-table-name").value = "";
  $("table-error").textContent = "";
  $("table-dialog-context").textContent =
    `${selectedProject()?.name || state.ref} / ${state.schema}`;
  tableBuilders = [];
  $("new-table-columns").replaceChildren();
  appendTableColumn({
    name: "id",
    type: "uuid",
    primaryKey: true,
    nullable: false,
    default: "uuid",
  });
  appendTableColumn({
    name: "created_at",
    type: "timestamptz",
    nullable: false,
    default: "now",
  });
  $("table-dialog").showModal();
};
$("new-table-column").onclick = () => appendTableColumn();
$("table-form").onsubmit = (e) => {
  e.preventDefault();
  if (state.busy) return;
  $("table-error").textContent = "";
  const name = $("new-table-name").value.trim(),
    input = {
      schema: state.schema,
      name,
      columns: tableBuilders.map((b) => b.read()),
      rls: true,
    };
  $("table-submit").disabled = true;
  work(async () => {
    await projectAction("schemaCreate", input);
    $("table-dialog").close();
    await refreshAfterWrite(
      () => loadCatalog({ schema: state.schema, table: name }),
      `Đã tạo bảng ${state.schema}.${name}. RLS đang bật.`,
    );
  }, "table-error").finally(() => {
    $("table-submit").disabled = false;
  });
};
let columnDraft = null;
function openColumn(column = null) {
  if (state.busy || !state.table) return;
  $("column-error").textContent = "";
  $("column-dialog-title").textContent = column ? "Đổi tên cột" : "Thêm cột";
  $("column-dialog-context").textContent = currentContext();
  const target = $("column-fields");
  target.replaceChildren();
  if (column) {
    const label = el("label", "field"),
      input = el("input");
    input.value = column.name;
    input.required = true;
    input.maxLength = 63;
    label.append(el("span", null, "Tên cột mới"), input);
    target.append(label);
    columnDraft = { column, input };
  } else {
    const builder = columnBuilder({}, false);
    target.append(builder.box);
    columnDraft = { builder };
  }
  $("column-dialog").showModal();
}
$("column-add").onclick = () => openColumn();
$("column-form").onsubmit = (e) => {
  e.preventDefault();
  if (state.busy) return;
  $("column-error").textContent = "";
  const d = columnDraft,
    input = {
      schema: state.schema,
      table: state.table.name,
      ...(d.column
        ? { from: d.column.name, to: d.input.value.trim() }
        : { column: d.builder.read() }),
    };
  $("column-submit").disabled = true;
  work(async () => {
    await projectAction(
      d.column ? "schemaRenameColumn" : "schemaAddColumn",
      input,
    );
    $("column-dialog").close();
    await refreshAfterWrite(
      () => chooseTable(state.table),
      "Đã cập nhật cấu trúc bảng.",
    );
  }, "column-error").finally(() => {
    $("column-submit").disabled = false;
  });
};
function updateLines() {
  $("line-numbers").textContent = Array.from(
    { length: $("sql-input").value.split("\n").length },
    (_, i) => i + 1,
  ).join("\n");
}
$("sql-input").oninput = updateLines;
$("sql-input").onscroll = () => {
  $("line-numbers").scrollTop = $("sql-input").scrollTop;
};
$("sql-reset").onclick = () => {
  $("sql-input").value =
    "select current_database() as database,\n       now() as thoi_gian;";
  updateLines();
};
$("sql-readonly").onchange = () => {
  $("sql-mode-note").replaceChildren(
    icon($("sql-readonly").checked ? "shield" : "info"),
    document.createTextNode(
      $("sql-readonly").checked
        ? "Vai trò supabase_read_only_user · Không thay đổi dữ liệu."
        : "Cho phép thay đổi dữ liệu và cấu trúc.",
    ),
  );
  updateControls();
};
$("sql-run").onclick = () =>
  work(async () => {
    const query = $("sql-input").value,
      readOnly = $("sql-readonly").checked;
    if (!query.trim()) throw Error("Nhập câu SQL cần chạy.");
    if (
      !readOnly &&
      !(await confirmAction(
        "Chạy SQL có quyền thay đổi?",
        `${selectedProject()?.name || state.ref} · ${state.ref}`,
        query,
        "Chạy SQL",
      ))
    )
      return;
    state.sqlResult = null;
    $("sql-results").replaceChildren(
      el("div", "loading-state", "Đang thực thi truy vấn…"),
    );
    $("sql-result-meta").textContent = "Đang chạy…";
    try {
      const d = await projectAction("sql", { query, readOnly });
      state.sqlResult = d;
      $("sql-results").replaceChildren();
      if (d.rows?.length) {
        const names = [
          ...new Set(
            d.rows.flatMap((r) =>
              r && typeof r === "object" ? Object.keys(r) : ["value"],
            ),
          ),
        ];
        const rows = d.rows.map((r) =>
          r && typeof r === "object" ? r : { value: r },
        );
        $("sql-results").append(dataGrid(rows, names));
      } else
        $("sql-results").append(
          el(
            "div",
            "simple-empty",
            d.result
              ? JSON.stringify(d.result, null, 2)
              : "Truy vấn hoàn tất. Không có dòng dữ liệu trả về.",
          ),
        );
      $("sql-result-meta").textContent =
        `${d.rowCount || 0} dòng · ${d.elapsedMs || 0} ms${d.truncated ? " · Chỉ hiển thị 500 dòng đầu" : ""}`;
      showNotice(
        readOnly
          ? "Đã chạy truy vấn chỉ đọc."
          : "Đã thực thi SQL. Làm mới danh sách bảng để xem thay đổi.",
      );
    } catch (err) {
      state.sqlResult = null;
      $("sql-results").replaceChildren(
        el("pre", "error-block", errorText(err)),
      );
      $("sql-result-meta").textContent = "Truy vấn chưa hoàn tất";
      throw err;
    }
  });
$("sql-download").onclick = () => {
  if (!state.sqlResult) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(state.sqlResult, null, 2)], {
      type: "application/json",
    }),
  );
  const a = el("a");
  a.href = url;
  a.download = "supadesk-ket-qua.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("sql-input").addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    if (!state.busy && !$("sql-run").disabled) $("sql-run").click();
  }
  if (e.key === "Tab") {
    e.preventDefault();
    const t = e.target,
      start = t.selectionStart,
      end = t.selectionEnd;
    t.setRangeText("  ", start, end, "end");
    updateLines();
  }
});
window.addEventListener("beforeunload", (e) => {
  if (state.busy) {
    e.preventDefault();
    e.returnValue = "";
  }
});
updateLines();
updateControls();
work(async () => {
  const session = await api("/api/session");
  state.backend = "ready";
  $("access-summary").textContent =
    "Backend sẵn sàng · Kết nối và chọn dự án để kiểm tra quyền.";
  state.connected = !!session.connected;
  state.projects = session.projects || [];
  fillProjects();
  if (state.connected) {
    const pref = readPreference(),
      ref =
        state.projects.find((p) => (p.ref || p.id) === pref.ref)?.ref ||
        state.projects.find((p) => (p.ref || p.id) === pref.ref)?.id ||
        (state.projects.length === 1
          ? state.projects[0].ref || state.projects[0].id
          : "");
    if (ref) {
      state.ref = ref;
      fillProjects();
      await chooseProject(ref);
    } else showNotice("Đã khôi phục kết nối. Chọn dự án để bắt đầu.");
  }
});

async function refreshAfterWrite(refresh, message) {
  showNotice(message);
  try {
    await refresh();
  } catch (err) {
    showNotice(
      message +
        " Chưa tải lại được giao diện: " +
        errorText(err) +
        " Không gửi lại thao tác vừa hoàn tất.",
      "warning",
    );
  }
}
async function loadAccess() {
  if (!state.ref) return;
  try {
    state.access = await projectAction("access", { schema: state.schema });
    if (!state.access?.read || !state.access?.write) {
      throw Error("Backend chưa trả về kết quả kiểm tra quyền hợp lệ.");
    }
  } catch (err) {
    state.access = null;
    if (
      ["SESSION_EXPIRED", "TOKEN_INVALID", "BACKEND_MISSING"].includes(err.code)
    ) {
      throw err;
    }
    $("access-summary").textContent =
      "Chưa kiểm tra được quyền: " + errorText(err);
    renderAccess();
    return;
  }
  const a = state.access;
  $("access-summary").textContent =
    `${state.schema} · Đọc: ${a.read?.status === "available" ? "sẵn sàng" : a.read?.status === "denied" ? "thiếu quyền" : "chưa xác định"} · Ghi: ${a.write?.status === "available" ? "API sẵn sàng (quyền từng bảng có thể khác)" : a.write?.status === "denied" ? "thiếu quyền" : "chưa xác định"}`;
  renderAccess();
  updateControls();
}
function renderAccess() {
  $("access-context").textContent =
    `${selectedProject()?.name || state.ref} / ${state.schema}`;
  const area = $("access-results");
  area.replaceChildren();
  if (!state.access) {
    area.append(
      el(
        "p",
        null,
        "Chưa có kết quả. Nếu backend cũ chưa hỗ trợ kiểm tra quyền, hãy cập nhật cả backend từ gói mã nguồn mới.",
      ),
    );
    return;
  }
  for (const [name, label] of [
    ["read", "Truy vấn chỉ đọc"],
    ["write", "API ghi và tạo cấu trúc"],
  ]) {
    const entry = state.access[name] || {},
      card = el("section", "access-card");
    card.append(
      el("h3", null, label),
      el(
        "strong",
        entry.status === "available" ? "access-ok" : "access-warning",
        entry.status === "available"
          ? "Gọi được API"
          : entry.status === "denied"
            ? "Thiếu quyền"
            : "Chưa xác định",
      ),
    );
    if (entry.status === "available")
      card.append(
        el(
          "p",
          null,
          `Vai trò: ${entry.role || "không rõ"} · USAGE schema: ${entry.schema_usage ? "có" : "không"} · CREATE schema: ${entry.schema_create ? "có" : "không"}`,
        ),
      );
    else
      card.append(
        el("p", null, [entry.message, entry.hint].filter(Boolean).join(" ")),
      );
    area.append(card);
  }
}
$("access-open").onclick = () => {
  renderAccess();
  $("access-dialog").showModal();
};
$("access-refresh").onclick = () => work(() => loadAccess());
