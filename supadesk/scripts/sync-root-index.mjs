import { readFile, writeFile } from "node:fs/promises";

// Keep a complete HTML entry at the repository root for static hosts.
// Node and Vercel continue to serve the canonical public/index.html.
const project = new URL("../", import.meta.url);
const source = await readFile(new URL("public/index.html", project), "utf8");
const entry = source.replace(
  /\b(href|src)="\.\/(favicon\.svg|style\.css|app\.js)"/g,
  '$1="./public/$2"',
);
await writeFile(new URL("index.html", project), entry);
console.log("Created index.html at the repository root.");
