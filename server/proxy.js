#!/usr/bin/env node
/**
 * Companion backend proxy — zero dependencies, Node 18+.
 *
 * Why this exists: an API key placed in front-end JavaScript is readable by
 * every visitor. This tiny server keeps the key in the process environment,
 * serves the static app, and exposes exactly one AI endpoint to the browser.
 *
 *   COMPANION_PROVIDER=anthropic COMPANION_API_KEY=sk-... node server/proxy.js
 *
 * Endpoints:
 *   GET  /api/health -> { configured, provider, model }
 *   POST /api/chat   -> { reply, provider, model }
 *   GET  /*          -> static files from the repository root
 */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 8080);

const CONFIG = {
  provider: (process.env.COMPANION_PROVIDER || "anthropic").toLowerCase(),
  apiKey: process.env.COMPANION_API_KEY || "",
  model: process.env.COMPANION_MODEL || "claude-opus-5",
  apiUrl: process.env.COMPANION_API_URL || "",
  maxTokens: Number(process.env.COMPANION_MAX_TOKENS || 320)
};

const DEFAULT_URLS = {
  anthropic: "https://api.anthropic.com/v1/messages",
  openai: "https://api.openai.com/v1/chat/completions"
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const MAX_BODY_BYTES = 256 * 1024;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("Body was not valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Only allow well-formed chat turns through to the provider. Anthropic requires
 * the first turn to be from the user and roles to alternate, so a leading
 * assistant turn is dropped and same-role runs are merged.
 */
function sanitiseMessages(input) {
  if (!Array.isArray(input)) return [];
  const cleaned = input
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content.slice(0, 8000)
    }))
    .slice(-40);

  const out = [];
  for (const turn of cleaned) {
    if (!out.length && turn.role !== "user") continue;
    const previous = out[out.length - 1];
    if (previous && previous.role === turn.role) previous.content += "\n\n" + turn.content;
    else out.push(turn);
  }
  return out;
}

async function callAnthropic(payload) {
  const url = CONFIG.apiUrl || DEFAULT_URLS.anthropic;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CONFIG.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: payload.model,
      max_tokens: payload.maxTokens,
      temperature: payload.temperature,
      system: payload.system,
      messages: payload.messages
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data && data.error && data.error.message) || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  const block = Array.isArray(data && data.content)
    ? data.content.find((c) => c.type === "text")
    : null;
  return block ? block.text : "";
}

async function callOpenAiCompatible(payload) {
  const url = CONFIG.apiUrl || DEFAULT_URLS.openai;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + CONFIG.apiKey
    },
    body: JSON.stringify({
      model: payload.model,
      max_tokens: payload.maxTokens,
      temperature: payload.temperature,
      messages: [{ role: "system", content: payload.system }].concat(payload.messages)
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data && data.error && data.error.message) || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  const choice = data && data.choices && data.choices[0];
  return choice && choice.message ? choice.message.content : "";
}

async function handleChat(req, res) {
  if (!CONFIG.apiKey) {
    sendJson(res, 503, {
      error: { message: "No COMPANION_API_KEY set on the server — the companion is running offline." }
    });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    sendJson(res, 400, { error: { message: err.message } });
    return;
  }

  const messages = sanitiseMessages(body.messages);
  if (!messages.length) {
    sendJson(res, 400, { error: { message: "No messages supplied" } });
    return;
  }

  const payload = {
    model: typeof body.model === "string" && body.model ? body.model : CONFIG.model,
    system: typeof body.system === "string" ? body.system.slice(0, 12000) : "",
    messages,
    maxTokens: Math.min(Number(body.maxTokens) || CONFIG.maxTokens, 1024),
    temperature: typeof body.temperature === "number" ? body.temperature : 0.85
  };

  try {
    const reply =
      CONFIG.provider === "anthropic"
        ? await callAnthropic(payload)
        : await callOpenAiCompatible(payload);

    sendJson(res, 200, {
      reply: typeof reply === "string" ? reply : "",
      provider: CONFIG.provider,
      model: payload.model
    });
  } catch (err) {
    console.error("[proxy] upstream failure:", err.message);
    // Never leak the key or raw upstream payloads to the browser.
    sendJson(res, err.status && err.status >= 400 && err.status < 600 ? err.status : 502, {
      error: { message: "Upstream AI request failed: " + err.message }
    });
  }
}

function serveStatic(req, res, pathname) {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const target = path.resolve(ROOT, relative);

  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    sendJson(res, 403, { error: { message: "Forbidden" } });
    return;
  }

  fs.stat(target, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream",
      "Content-Length": stats.size,
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(target).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const pathname = url.pathname;

  if (pathname === "/api/health") {
    sendJson(res, 200, {
      configured: Boolean(CONFIG.apiKey),
      provider: CONFIG.provider,
      model: CONFIG.model
    });
    return;
  }

  if (pathname === "/api/chat") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: { message: "Use POST" } });
      return;
    }
    handleChat(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: { message: "Method not allowed" } });
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log("Companion app:  http://localhost:" + PORT);
  console.log(
    CONFIG.apiKey
      ? "AI provider:    " + CONFIG.provider + " (" + CONFIG.model + ")"
      : "AI provider:    none configured — the browser will use the built-in offline brain."
  );
});
