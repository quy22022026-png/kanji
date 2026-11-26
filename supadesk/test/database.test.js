import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import {
  identifier,
  buildCreateTable,
  columnDefinition,
  COLUMNS_SQL,
  createDatabase,
} from "../lib/database.js";

let db, action;
const ref = "abcdefghijklmnopqrst";
before(async () => {
  db = new PGlite();
  action = createDatabase({
    query: async (_token, _ref, sql, parameters) => {
      if (sql.includes("BEGIN;")) {
        const results = await db.exec(sql);
        return results.at(-1).rows;
      }
      return (await db.query(sql, parameters)).rows;
    },
  });
  await db.exec(`CREATE TABLE public.items (
    id bigint PRIMARY KEY, amount numeric, name text NOT NULL,
    details jsonb, enabled boolean DEFAULT true, tags text[],
    double_id bigint GENERATED ALWAYS AS (id * 2) STORED
  ); INSERT INTO public.items (id, amount, name, details, tags)
    VALUES (9007199254740993, 12345678901234567890.123456789, '100%_test', '{"x":1}', ARRAY['a','b']);`);
});
after(async () => {
  await db?.close();
});
const context = { schema: "public", table: "items" };
const run = (name, input) =>
  action("token", ref, name, { ...context, ...input });

test("identifier quoting and default/type validation reject injected DDL", () => {
  assert.equal(
    identifier('a"; DROP TABLE items; --'),
    '"a""; DROP TABLE items; --"',
  );
  assert.throws(() => identifier("a".repeat(64)));
  assert.throws(() => identifier("v\0x"));
  assert.throws(() =>
    columnDefinition({ name: "a", type: "text", default: "identity" }),
  );
  assert.throws(() =>
    columnDefinition({
      name: "a",
      type: "text; DROP TABLE items",
      default: "none",
    }),
  );
  assert.throws(() =>
    buildCreateTable({
      schema: "public",
      name: "x",
      columns: [
        { name: "a", type: "text" },
        { name: "a", type: "text" },
      ],
    }),
  );
});

test("catalog, schemas and column metadata execute on PostgreSQL", async () => {
  const catalog = await run("catalog", {});
  assert.ok(
    catalog.tables.find((t) => t.name === "items" && t.kind === "table"),
  );
  assert.ok(catalog.schemas.includes("public"));
  const data = await run("columns", {});
  assert.deepEqual(data.primaryKeys, ["id"]);
  assert.equal(
    data.columns.find((c) => c.name === "double_id").is_generated,
    true,
  );
});

test("rows preserve bigint/numeric precision and return concurrency fingerprints", async () => {
  const data = await run("rows", { offset: 0, limit: 25 });
  assert.equal(data.rows[0].id, "9007199254740993");
  assert.equal(data.rows[0].amount, "12345678901234567890.123456789");
  assert.equal(data.rows[0].double_id, "18014398509481986");
  assert.deepEqual(data.rows[0].tags, ["a", "b"]);
  assert.match(data.originals[0], /^[a-f0-9]{32}$/);
  assert.equal(data.hasMore, false);
});

test("typed equality and escaped ILIKE filters resist SQL injection", async () => {
  const args = { offset: 0, limit: 25 };
  assert.equal(
    (
      await run("rows", {
        ...args,
        filter: { column: "id", operator: "eq", value: "9007199254740993" },
      })
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await run("rows", {
        ...args,
        filter: { column: "name", operator: "ilike", value: "%100\\%\\_test%" },
      })
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await run("rows", {
        ...args,
        filter: {
          column: "name",
          operator: "eq",
          value: "'; DROP TABLE public.items; --",
        },
      })
    ).rows.length,
    0,
  );
  await assert.rejects(
    run("rows", {
      ...args,
      filter: { column: "name", operator: "bogus", value: "" },
    }),
  );
});

test("insert/update/delete handle JSON and reject stale row versions and missing keys", async () => {
  await run("insert", {
    values: {
      id: "7",
      name: "new",
      amount: "1.25",
      details: { nested: [true, null] },
      tags: ["test"],
      enabled: false,
    },
  });
  let page = await run("rows", {
    offset: 0,
    limit: 25,
    filter: { column: "id", operator: "eq", value: "7" },
  });
  assert.deepEqual(page.rows[0].details, { nested: [true, null] });
  const original = page.originals[0];
  await run("update", {
    key: { id: "7" },
    original,
    values: { name: "edited", amount: null },
  });
  await assert.rejects(
    run("update", { key: { id: "7" }, original, values: { name: "stale" } }),
    { code: "ROW_CONFLICT" },
  );
  await assert.rejects(run("delete", { key: {}, original }), /khoá chính/);
  await assert.rejects(
    run("update", { key: { id: "7" }, original, values: {} }),
    /Chưa có giá trị/,
  );
  await assert.rejects(
    run("insert", { values: { id: "8", name: null } }),
    /không cho phép NULL/,
  );
  await assert.rejects(
    run("insert", { values: { id: "8", name: "x", double_id: "100" } }),
    /tự sinh/,
  );
  page = await run("rows", {
    offset: 0,
    limit: 25,
    filter: { column: "id", operator: "eq", value: "7" },
  });
  assert.equal(page.rows[0].amount, null);
  assert.deepEqual(
    await run("delete", { key: { id: "7" }, original: page.originals[0] }),
    { affected: 1 },
  );
});

test("composite primary keys, paging and columns named like object properties work", async () => {
  await db.exec(`CREATE TABLE public.composite (a integer, b text, "__proto__" text, PRIMARY KEY(a,b));
    INSERT INTO public.composite SELECT i, 'b', 'value' FROM generate_series(1,26) i;`);
  const c = { schema: "public", table: "composite" };
  const data = await action("token", ref, "rows", {
    ...c,
    offset: 0,
    limit: 25,
  });
  assert.equal(data.rows.length, 25);
  assert.equal(data.hasMore, true);
  assert.equal(data.rows[0].__proto__, "value");
  await action("token", ref, "update", {
    ...c,
    key: { a: 1, b: "b" },
    original: data.originals[0],
    values: JSON.parse('{"__proto__":"changed"}'),
  });
  assert.equal(
    (await db.query('SELECT "__proto__" FROM public.composite WHERE a=1'))
      .rows[0].__proto__,
    "changed",
  );
});

test("create table enables RLS atomically; add and rename columns work", async () => {
  await action("token", ref, "schemaCreate", {
    schema: "public",
    name: "created",
    columns: [
      { name: "id", type: "uuid", default: "uuid", primaryKey: true },
      {
        name: "created_at",
        type: "timestamptz",
        default: "now",
        nullable: false,
      },
    ],
  });
  assert.equal(
    (
      await db.query(
        "SELECT relrowsecurity FROM pg_class WHERE oid='public.created'::regclass",
      )
    ).rows[0].relrowsecurity,
    true,
  );
  await action("token", ref, "schemaAddColumn", {
    schema: "public",
    table: "created",
    column: { name: "count", type: "integer", default: "none" },
  });
  await action("token", ref, "schemaRenameColumn", {
    schema: "public",
    table: "created",
    from: "count",
    to: "total",
  });
  const list = (await db.query(COLUMNS_SQL, ["public", "created"])).rows;
  assert.ok(list.some((c) => c.name === "total"));
  assert.deepEqual(
    await action("token", ref, "insert", {
      schema: "public",
      table: "created",
      values: {},
    }),
    { affected: 1 },
  );
});

test("access diagnostics only use SELECT statements", async () => {
  const queries = [];
  const mock = createDatabase({
    query: async (_t, _r, q) => {
      queries.push(q);
      return [{ role: "test", schema_usage: true, schema_create: true }];
    },
  });
  const result = await mock("token", ref, "access", { schema: "public" });
  assert.equal(result.write.status, "available");
  assert.equal(queries.length, 2);
  assert.ok(queries.every((q) => /^SELECT/.test(q)));
});
