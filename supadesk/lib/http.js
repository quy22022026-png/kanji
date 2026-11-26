import { Readable } from "node:stream";
import { readFile } from "node:fs/promises";
import { createApplication, SECURITY_HEADERS } from "./application.js";

const publicRoot = new URL("../public/", import.meta.url);
const STATIC = {
  "/": ["index.html", "text/html"],
  "/index.html": ["index.html", "text/html"],
  "/app.js": ["app.js", "text/javascript"],
  "/style.css": ["style.css", "text/css"],
  "/favicon.svg": ["favicon.svg", "image/svg+xml"],
};

export function createNodeHandler(config = {}) {
  // Initialised lazily, so a configuration error produces a readable JSON error on Vercel.
  let application;
  return async function nodeHandler(req, res) {
    try {
      const production =
        config.production ?? process.env.NODE_ENV === "production";
      const origins =
        config.origins ||
        (process.env.APP_ORIGIN
          ? [new URL(process.env.APP_ORIGIN).origin]
          : [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
              .filter(Boolean)
              .map((host) => `https://${host}`));
      const protocol = origins[0]
        ? new URL(origins[0]).protocol
        : req.socket.encrypted
          ? "https:"
          : "http:";
      const url = new URL(
        req.url,
        `${protocol}//${req.headers.host || "localhost"}`,
      );
      if (config.vercel && url.searchParams.has("path"))
        url.pathname = "/api/" + url.searchParams.get("path");
      if (!url.pathname.startsWith("/api/")) {
        const entry = STATIC[url.pathname];
        if (!entry || !["GET", "HEAD"].includes(req.method)) {
          res.writeHead(404, SECURITY_HEADERS);
          res.end("Not found");
          return;
        }
        const content = await readFile(new URL(entry[0], publicRoot));
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          "Content-Type": `${entry[1]}; charset=utf-8`,
          "Content-Length": content.length,
        });
        res.end(req.method === "HEAD" ? undefined : content);
        return;
      }
      application ||= createApplication({
        ...config,
        production,
        origins,
        secret: config.secret || process.env.SESSION_SECRET,
      });
      let data;
      if (!["GET", "HEAD"].includes(req.method)) {
        if (req.body !== undefined) {
          data =
            typeof req.body === "string" || Buffer.isBuffer(req.body)
              ? req.body
              : JSON.stringify(req.body);
        } else {
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 1_000_000) {
              res.writeHead(413, {
                ...SECURITY_HEADERS,
                "Content-Type": "application/json",
              });
              res.end(
                JSON.stringify({
                  error: {
                    code: "BODY_TOO_LARGE",
                    message: "Dữ liệu gửi lên quá lớn (tối đa 1 MB).",
                  },
                }),
              );
              return;
            }
            chunks.push(chunk);
          }
          data = Buffer.concat(chunks);
        }
      }
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        ...(data === undefined ? {} : { body: data }),
      });
      const response = await application(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) Readable.fromWeb(response.body).pipe(res);
      else res.end();
    } catch (error) {
      console.error("[SupaDesk] Server configuration error:", error.name);
      if (res.headersSent) {
        res.end();
        return;
      }
      res.writeHead(503, {
        ...SECURITY_HEADERS,
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          error: {
            code: "SERVER_CONFIGURATION",
            message: "Backend chưa được cấu hình đúng.",
            hint: "Đặt SESSION_SECRET ít nhất 32 ký tự và APP_ORIGIN đúng URL app trong cấu hình hosting, sau đó triển khai lại.",
          },
        }),
      );
    }
  };
}
