import { createServer } from "node:http";
import { parseArgs } from "node:util";
import { createNodeHandler } from "./lib/http.js";

const { values } = parseArgs({
  options: {
    port: { type: "string" },
    host: { type: "string" },
    strictPort: { type: "boolean" },
  },
});
const port = Number(values.port || process.env.PORT || 3000);
const host = values.host || process.env.HOST || "127.0.0.1";
const server = createServer(createNodeHandler());
server.requestTimeout = 35_000;
server.headersTimeout = 10_000;
server.listen(port, host, () =>
  console.log(
    `SupaDesk: http://${host === "0.0.0.0" ? "localhost" : host}:${port}`,
  ),
);
