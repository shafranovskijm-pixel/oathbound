import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (process.env.VERCEL !== "1" && existsSync("dist/client/index.html")) {
  const html = readFileSync("dist/client/index.html", "utf8");
  const worker = `const HTML = ${JSON.stringify(html)};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isPage = request.method === "GET" && !url.pathname.split("/").pop()?.includes(".");
    if (isPage) {
      return new Response(HTML, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" },
      });
    }
    if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};
`;
  writeFileSync("dist/server/index.js", worker);
}
