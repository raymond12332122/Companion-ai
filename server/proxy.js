#!/usr/bin/env node
/**
 * Companion backend proxy — zero dependencies, Node 18+.
 *
 * Why this exists: an API key placed in front-end JavaScript is readable by
 * every visitor. This tiny server keeps the key in the process environment,
 * serves the static app, and exposes exactly one AI endpoint to the browser.
 *
 *   COMPANION_PROVIDER=nvidia COMPANION_API_KEY=nvapi-... \
 *   COMPANION_MODEL=meta/llama-3.1-8b-instruct node server/proxy.js
 *
 * Which vendor answers is decided here, by the PROVIDERS registry below — the
 * companion in the browser only knows about /api/chat.
 *
 * Endpoints:
 *   GET  /api/health -> { ready, provider, model, reason, missingEnv, providers }
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
  provider: (process.env.COMPANION_PROVIDER || "nvidia").toLowerCase(),
  apiKey: process.env.COMPANION_API_KEY || "",
  // No default. A model name invented here would be a name the configured
  // endpoint has never heard of, and the request would fail with a 404 that
  // looks like a network problem. Missing config is reported, never guessed.
  model: process.env.COMPANION_MODEL || "",
  apiUrl: process.env.COMPANION_API_URL || "",
  maxTokens: Number(process.env.COMPANION_MAX_TOKENS || 400)
};

/* =========================================================================
 * WIRE FORMATS — how a request is shaped and how a reply is read back.
 *
 * Several vendors speak the same wire format, so this layer is keyed by
 * format rather than by vendor: NVIDIA, OpenAI, Groq, Together and most
 * self-hosted servers all speak "openai". A new vendor on an existing format
 * is a registry entry with no new code.
 * ========================================================================= */
const WIRES = {
  openai: {
    buildRequest(payload) {
      const body = {
        model: payload.model,
        max_tokens: payload.maxTokens,
        temperature: payload.temperature,
        messages: [{ role: "system", content: payload.system }].concat(payload.messages)
      };
      // Some compatible endpoints reject unknown keys, so these travel only
      // when the caller actually asked for them.
      if (typeof payload.presencePenalty === "number") body.presence_penalty = payload.presencePenalty;
      if (typeof payload.frequencyPenalty === "number") body.frequency_penalty = payload.frequencyPenalty;
      // Constrained decoding, when the caller wants a JSON object back and the
      // endpoint supports it. callProvider retries without this if it is
      // rejected, so an endpoint that lacks it degrades instead of failing.
      if (payload.jsonMode && !payload.noJsonMode) body.response_format = { type: "json_object" };
      return {
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + CONFIG.apiKey },
        body
      };
    },
    readReply(data) {
      const choice = data && data.choices && data.choices[0];
      return choice && choice.message ? choice.message.content : "";
    }
  },

  anthropic: {
    buildRequest(payload) {
      return {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CONFIG.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: {
          model: payload.model,
          max_tokens: payload.maxTokens,
          temperature: payload.temperature,
          system: payload.system,
          messages: payload.messages
        }
      };
    },
    readReply(data) {
      const block = Array.isArray(data && data.content)
        ? data.content.find((c) => c.type === "text")
        : null;
      return block ? block.text : "";
    }
  }
};

/* =========================================================================
 * PROVIDER REGISTRY — the companion talks to this, never to a vendor.
 *
 * Each entry declares the wire format it speaks, where it posts by default,
 * and exactly which environment variables configure it. That last field is
 * what lets a misconfigured server tell the operator the variable names to
 * set instead of failing with an upstream 404.
 *
 * `implemented: false` means the slot is reserved and deliberately inert —
 * the shape is agreed, the code is not written yet.
 * ========================================================================= */
const PROVIDERS = {
  nvidia: {
    label: "NVIDIA NIM",
    wire: "openai",
    defaultUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
    requiredEnv: ["COMPANION_API_KEY", "COMPANION_MODEL"],
    optionalEnv: ["COMPANION_API_URL", "COMPANION_MAX_TOKENS"],
    hint: "COMPANION_MODEL must name a model your NVIDIA account can call, e.g. meta/llama-3.1-8b-instruct. Browse the catalogue at build.nvidia.com."
  },

  openai: {
    label: "OpenAI",
    wire: "openai",
    defaultUrl: "https://api.openai.com/v1/chat/completions",
    requiredEnv: ["COMPANION_API_KEY", "COMPANION_MODEL"],
    optionalEnv: ["COMPANION_API_URL", "COMPANION_MAX_TOKENS"],
    hint: "COMPANION_API_URL also points this provider at any OpenAI-compatible endpoint."
  },

  anthropic: {
    label: "Anthropic",
    wire: "anthropic",
    defaultUrl: "https://api.anthropic.com/v1/messages",
    requiredEnv: ["COMPANION_API_KEY", "COMPANION_MODEL"],
    optionalEnv: ["COMPANION_API_URL", "COMPANION_MAX_TOKENS"],
    hint: "COMPANION_MODEL takes an Anthropic model id, e.g. claude-opus-5."
  },

  gemini: {
    label: "Google Gemini",
    implemented: false,
    // Gemini's generateContent format is neither of the wires above; it needs
    // its own adapter (contents[]/parts[], systemInstruction, x-goog-api-key).
    requiredEnv: ["COMPANION_API_KEY", "COMPANION_MODEL"],
    optionalEnv: ["COMPANION_API_URL"],
    hint: "Reserved. The Gemini wire adapter is not written yet."
  },

  local: {
    label: "Local / on-device",
    implemented: false,
    requiredEnv: [],
    optionalEnv: [],
    hint: "Reserved. Not implemented — the browser's built-in offline brain covers this case for now."
  }
};

/** Provider names the server can actually serve a request with. */
function availableProviders() {
  return Object.keys(PROVIDERS).filter((name) => PROVIDERS[name].implemented !== false);
}

/**
 * Whether the process environment configures the selected provider, and if
 * not, precisely which variables are missing. Returned to /api/health so the
 * operator sees variable names rather than a failed request.
 */
function inspectConfig() {
  const name = CONFIG.provider;
  const spec = PROVIDERS[name];

  if (!spec) {
    return {
      ready: false,
      reason: "unknown_provider",
      missingEnv: ["COMPANION_PROVIDER"],
      message: 'COMPANION_PROVIDER is set to "' + name + '", which is not a known provider. Known providers: ' +
        Object.keys(PROVIDERS).join(", ") + ". Currently implemented: " + availableProviders().join(", ") + "."
    };
  }

  if (spec.implemented === false) {
    return {
      ready: false,
      reason: "not_implemented",
      missingEnv: [],
      message: spec.label + " is a reserved provider slot and is not implemented yet. " +
        "Set COMPANION_PROVIDER to one of: " + availableProviders().join(", ") + "."
    };
  }

  const missing = spec.requiredEnv.filter((key) => !String(process.env[key] || "").trim());
  if (missing.length) {
    return {
      ready: false,
      reason: "missing_env",
      missingEnv: missing,
      message: "Set " + missing.join(" and ") + " in the server environment to use " + spec.label + ". " + spec.hint
    };
  }

  return { ready: true, reason: "ok", missingEnv: [], message: "" };
}

/**
 * Remove anything that could carry a credential out of the process. Applied
 * to every string that reaches a log line or an HTTP response body, because
 * upstream error payloads sometimes echo the Authorization header back.
 */
function redact(text) {
  let out = String(text == null ? "" : text);
  const key = CONFIG.apiKey;
  if (key && key.length >= 8) out = out.split(key).join("[redacted]");
  // Common credential shapes, in case a key other than ours appears.
  out = out.replace(/\b(nvapi-|sk-ant-|sk-|AIza|gsk_)[A-Za-z0-9_\-]{8,}/g, "[redacted]");
  out = out.replace(/(Bearer\s+)[A-Za-z0-9._\-]{8,}/gi, "$1[redacted]");
  return out;
}

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

function clampPenalty(value) {
  if (typeof value !== "number" || !isFinite(value)) return undefined;
  return Math.max(-2, Math.min(2, value));
}

/**
 * Send one completion request through the configured provider. The only place
 * in the server that performs an upstream fetch, so credential handling and
 * error redaction have exactly one home.
 */
async function callProvider(payload, attempt) {
  const spec = PROVIDERS[CONFIG.provider];
  const wire = WIRES[spec.wire];
  const url = CONFIG.apiUrl || spec.defaultUrl;
  const shaped = wire.buildRequest(payload);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: shaped.headers,
      body: JSON.stringify(shaped.body)
    });
  } catch (err) {
    // DNS/TLS/socket failures. The message can contain the target URL but
    // never the key; redacted anyway on the way out.
    const error = new Error("could not reach the " + spec.label + " endpoint");
    error.status = 502;
    error.detail = redact(err && err.message);
    throw error;
  }

  const raw = await response.text().catch(() => "");
  let data = null;
  if (raw) { try { data = JSON.parse(raw); } catch (err) { data = null; } }

  if (!response.ok) {
    const upstream = (data && data.error && (data.error.message || data.error)) || response.statusText;
    const text = typeof upstream === "string" ? upstream : "request rejected";

    // Endpoints that don't implement constrained decoding reject the whole
    // request for it. Drop the hint and try once more rather than failing a
    // conversation over an optional optimisation.
    if (!attempt && payload.jsonMode && response.status === 400 && /response_format|json_object/i.test(text)) {
      console.warn("[proxy] endpoint rejected response_format; retrying without it");
      return callProvider(Object.assign({}, payload, { noJsonMode: true }), 1);
    }

    const error = new Error(redact(text));
    error.status = response.status;
    throw error;
  }
  if (!data) {
    const error = new Error("the " + spec.label + " endpoint returned a response that was not JSON");
    error.status = 502;
    throw error;
  }

  return wire.readReply(data);
}

async function handleChat(req, res) {
  const config = inspectConfig();
  if (!config.ready) {
    // The operator needs variable names; the browser only needs to know the
    // backend is unavailable so it can fall back cleanly.
    sendJson(res, 503, {
      error: {
        message: config.message,
        reason: config.reason,
        missingEnv: config.missingEnv
      }
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
    temperature: typeof body.temperature === "number" ? body.temperature : 0.85,
    // Clamped to the range every OpenAI-compatible endpoint accepts. Anthropic
    // has no equivalent, so callAnthropic simply ignores both.
    presencePenalty: clampPenalty(body.presencePenalty),
    frequencyPenalty: clampPenalty(body.frequencyPenalty),
    jsonMode: body.jsonMode === true
  };

  try {
    const reply = await callProvider(payload);

    sendJson(res, 200, {
      reply: typeof reply === "string" ? reply : "",
      provider: CONFIG.provider,
      model: payload.model
    });
  } catch (err) {
    console.error("[proxy] upstream failure:", redact(err.message), redact(err.detail || ""));
    // Redacted twice on purpose: once where the error is built, once here, so
    // a future throw site that forgets cannot leak a credential to the browser.
    sendJson(res, err.status && err.status >= 400 && err.status < 600 ? err.status : 502, {
      error: { message: "Upstream AI request failed: " + redact(err.message) }
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
    const config = inspectConfig();
    // Reports names and readiness only — never the key, never its length.
    sendJson(res, 200, {
      configured: config.ready,
      ready: config.ready,
      provider: CONFIG.provider,
      model: CONFIG.model,
      reason: config.reason,
      missingEnv: config.missingEnv,
      message: config.message,
      providers: availableProviders()
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

server.listen(PORT, "0.0.0.0", () => {
  const config = inspectConfig();
  const spec = PROVIDERS[CONFIG.provider];
  console.log("Companion app:  http://0.0.0.0:" + PORT);
  if (config.ready) {
    console.log("AI provider:    " + spec.label + " (" + CONFIG.model + ")");
  } else {
    // Names the variables to set. Never echoes a value.
    console.log("AI provider:    not ready — the browser will use the built-in offline brain.");
    console.log("                " + config.message);
  }
});
