// Lightweight standalone HTTP Server for Urban Mart REST APIs
import http from "http";
import url from "url";
import { handleApiRequest } from "./api-handler";

const PORT = process.env.PORT || 3001;

export function createServer() {
  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || "", true);
    const path = (parsedUrl.pathname || "").replace(/^\/+/, "");
    const method = req.method || "GET";

    let body: any = null;
    if (["POST", "PUT"].includes(method)) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString();
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = {};
      }
    }

    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers[k] = v;
    }

    const query: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsedUrl.query)) {
      if (typeof v === "string") query[k] = v;
    }

    try {
      const result = await handleApiRequest({
        method,
        path,
        query,
        body,
        headers,
      });

      res.writeHead(result.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result.data !== undefined ? result.data : { error: result.error }));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Internal server error" }));
    }
  });

  return server;
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`[Urban Mart Server] Listening on http://localhost:${PORT}`);
  });
}
