const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const MAX_BODY_BYTES = 35 * 1024 * 1024;

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();
const SERVER_DEFAULT_KEY = (process.env.GEMINI_API_KEY || "").trim();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Upload is too large. Maximum request size is 35 MB."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON request."));
      }
    });

    req.on("error", reject);
  });
}

async function analyze(req, res) {
  const apiKey = req.headers["x-goog-api-key"] || SERVER_DEFAULT_KEY;
  if (!apiKey) {
    send(res, 400, JSON.stringify({ error: { message: "Missing Gemini API key." } }));
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "Api-Revision": "2026-05-20"
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    console.log(`--- Gemini response: HTTP ${upstream.status} ---`);
    try {
      const parsed = JSON.parse(text);
      console.log("status field:", parsed.status);
      console.log(
        "step types:",
        (parsed.steps || []).map((s) => s.type)
      );
      (parsed.steps || []).forEach((step, i) => {
        if (step.type !== "model_output") return;
        console.log(`step[${i}] (model_output) content:`, JSON.stringify(step.content));
      });
      if (parsed.error) console.log("error field:", JSON.stringify(parsed.error));
    } catch {
      console.log(text.length > 2000 ? text.slice(0, 2000) + "\n...[truncated, not valid JSON]..." : text);
    }
    console.log("--- end Gemini response ---");
    send(res, upstream.status, text, upstream.headers.get("content-type") || "application/json; charset=utf-8");
  } catch (err) {
    console.error("Analyze request failed before reaching Google:", err.message || err);
    send(res, 500, JSON.stringify({ error: { message: err.message || "Analyze request failed." } }));
  }
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const target = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(ROOT, target);

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(ROOT, "index.html"), (fallbackErr, fallback) => {
        if (fallbackErr) send(res, 404, "Not found", "text/plain; charset=utf-8");
        else send(res, 200, fallback, "text/html; charset=utf-8");
      });
      return;
    }

    send(res, 200, data, mimeTypes[path.extname(filePath)] || "application/octet-stream");
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/analyze") {
    analyze(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/api/key-status") {
    send(res, 200, JSON.stringify({ hasKey: Boolean(SERVER_DEFAULT_KEY) }));
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  send(res, 405, "Method not allowed", "text/plain; charset=utf-8");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`QP.ai running at http://127.0.0.1:${PORT}/`);
  console.log(SERVER_DEFAULT_KEY ? "Gemini key loaded from .env — Profile screen will show it as already connected." : "No .env key found — add one to .env or enter a key in the app's Profile screen.");
});
