"use strict";
/**
 * Deterministic mock for the CompanionGemma Capacitor plugin
 * (android/app/src/main/java/ai/companion/pixel/gemma/GemmaPlugin.kt).
 *
 * Shaped exactly like what `window.Capacitor.Plugins.CompanionGemma`
 * resolves to in the real app (see the DeviceGemma lookup in index.html):
 * the same method names, the same resolved-object fields the real plugin's
 * generate() puts in its JSObject (response, emotion, modelLoadMs,
 * promptPrepMs, inferenceMs, responseProcessingMs, rawOutput,
 * inferenceThread, engineInitialized, finalPrompt, promptTokens,
 * outputTokens, nativeCompletedAtMs).
 *
 * FOR DEVELOPMENT AND AUTOMATED TESTING ONLY. This module is never loaded
 * by the production app — see the __COMPANION_MOCK_GEMMA__ gate in
 * index.html, which only ever swaps DeviceGemma for a mock when that flag
 * is explicitly set by a test harness. A mock-based test result proves the
 * provider-abstraction code (prompt construction, history handling,
 * fallback logic, UI state) works against a well- or badly-behaved plugin.
 * It does NOT prove the real Gemma model or the real native inference
 * runtime works — see CLAUDE.md.
 */

/** Deterministic canned replies, matched by exact (trimmed) user input. */
const CANNED_REPLIES = new Map([
  ["Hi", "Hello!"],
  ["What is your name?", "I'm Gg."],
  ["What is 2 + 2?", "4"],
  ["My name is Raymond", "Nice to meet you, Raymond."]
]);

const FAILURE_MODES = [
  "model_unavailable",   // isAvailable() resolves available:false, no model imported
  "provider_unavailable", // generate() rejects as if the plugin itself can't run at all
  "empty_response",      // resolves with response: ""
  "timeout",              // generate() never resolves — exercises the app's own timeout race
  "native_exception",    // generate() rejects with a raw, .kind-less error (like an unwrapped native crash)
  "malformed_response"   // resolves with a JSObject missing the expected fields entirely
];

function nowMs() {
  return Date.now();
}

/**
 * @param {object} [opts]
 * @param {string} [opts.mode] - "ok" (default) or one of FAILURE_MODES.
 * @param {Map<string,string>} [opts.replies] - override/extend CANNED_REPLIES.
 * @param {string} [opts.modelId]
 * @param {number} [opts.sizeBytes]
 */
function createMockGemmaProvider(opts) {
  const options = opts || {};
  let mode = options.mode || "ok";
  const replies = options.replies || CANNED_REPLIES;
  const modelId = options.modelId || "mock-gemma3-1b-it-int4.task";
  const sizeBytes = typeof options.sizeBytes === "number" ? options.sizeBytes : 529 * 1024 * 1024;

  let loaded = false;
  let generating = false;
  const listeners = new Map(); // eventName -> Set<callback>

  function setMode(next) {
    if (mode !== "ok" && !FAILURE_MODES.includes(next) && next !== "ok") {
      throw new Error("Unknown mock mode: " + next);
    }
    mode = next;
  }

  function emit(eventName, payload) {
    const set = listeners.get(eventName);
    if (!set) return;
    set.forEach(function (cb) { cb(payload); });
  }

  const provider = {
    __isMock: true, // TEMP DEBUG marker, checked by tests and by GemmaDebug's "Provider: MOCK" line

    setMode: setMode,
    getMode: function () { return mode; },

    async isAvailable() {
      if (mode === "provider_unavailable") {
        // Represents the plugin bridge itself being unusable; a real caller
        // would normally see this as DeviceGemma being null rather than a
        // resolved isAvailable() call, but some tests want to exercise the
        // "resolved but says unavailable" path distinctly from "no bridge
        // at all" (which is tested separately, by not installing a mock).
        return { available: false, loaded: false, reason: "provider_unavailable_mock" };
      }
      if (mode === "model_unavailable") {
        return { available: false, loaded: false, reason: "no_model_imported" };
      }
      return {
        available: true,
        loaded: loaded,
        reason: loaded ? null : "not_loaded",
        modelId: modelId,
        sizeBytes: sizeBytes,
        backend: loaded ? "cpu" : null,
        modelPath: "/mock/files/gemma/model.task",
        engineInitialized: loaded
      };
    },

    async loadModel() {
      if (mode === "model_unavailable" || mode === "provider_unavailable") {
        throw Object.assign(new Error("No Gemma model imported yet."), { code: "model_load_failed" });
      }
      loaded = true;
      return { loaded: true, backend: "cpu", loadMillis: 5 };
    },

    async unloadModel() {
      loaded = false;
    },

    async removeModel() {
      loaded = false;
      return { removed: true };
    },

    async importModel() {
      // Deterministic "picked and copied a file" outcome; progress events
      // fire synchronously here rather than over real time.
      emit("importProgress", { copiedBytes: sizeBytes, totalBytes: sizeBytes, percent: 100 });
      loaded = false;
      return { imported: true, cancelled: false, modelId: modelId, sizeBytes: sizeBytes };
    },

    async cancel() {
      generating = false;
    },

    addListener(eventName, callback) {
      if (!listeners.has(eventName)) listeners.set(eventName, new Set());
      listeners.get(eventName).add(callback);
      const handle = {
        remove: async function () {
          const set = listeners.get(eventName);
          if (set) set.delete(callback);
        }
      };
      // Real Capacitor addListener returns a Promise<handle> for native
      // plugins; match that shape so `await DeviceGemma.addListener(...)`
      // and `.then()` chains both work against this mock.
      return Promise.resolve(handle);
    },

    async generate(options) {
      const system = (options && options.system) || "";
      const messages = (options && options.messages) || [];
      const lastUser = [...messages].reverse().find(function (m) { return m.role !== "assistant"; });
      const userText = lastUser ? String(lastUser.content).trim() : "";
      const finalPrompt = (system ? system + "\n\n" : "") + messages.map(function (m) { return m.content; }).join("\n");

      if (mode === "model_unavailable" || mode === "provider_unavailable") {
        throw Object.assign(new Error("No Gemma model imported yet."), { code: "model_load_failed" });
      }
      if (generating) {
        throw Object.assign(new Error("A reply is already being generated"), { code: "busy" });
      }
      if (mode === "timeout") {
        generating = true;
        return new Promise(function () { /* never resolves — exercises the app's own timeout race */ });
      }
      if (mode === "native_exception") {
        // No .kind — matches a raw Capacitor call.reject() surfacing as a
        // plain rejected promise with just a message, the way an unwrapped
        // native crash would look before callProvider()'s gemma branch
        // wraps it into AiError("network", ...).
        throw new Error("RuntimeException: native inference crashed (mock)");
      }
      if (mode === "malformed_response") {
        // Missing `response` entirely — exercises the
        // `typeof result.response === "string" ? ... : ""` guard.
        return { garbage: true, unexpectedShape: 42 };
      }

      generating = true;
      const startedAt = nowMs();
      // A real microtask/macrotask gap, not just synchronous work wrapped in
      // a resolved Promise — without this, two back-to-back generate() calls
      // (as a "concurrent request" test would make) never actually overlap:
      // the first would run to completion synchronously before the second
      // is even issued, and the busy guard below would never see it set.
      await new Promise(function (resolve) { setImmediate(resolve); });
      const responseText = mode === "empty_response" ? "" : (replies.get(userText) || ("Mock reply to: " + userText));

      // Simulate token streaming so GemmaStream-equivalent listeners have
      // something to react to, synchronously (no real timers) so tests stay
      // fast and deterministic.
      const tokens = responseText ? responseText.split(/(?<=\s)/) : [];
      let partial = "";
      tokens.forEach(function (t) {
        partial += t;
        emit("gemmaToken", { token: t, partial: partial });
      });

      generating = false;
      const elapsed = Math.max(1, nowMs() - startedAt);

      return {
        response: responseText,
        emotion: null,
        modelLoadMs: 0,
        promptPrepMs: 0,
        inferenceMs: elapsed,
        responseProcessingMs: 0,
        rawOutput: responseText,
        inferenceThread: "mock-thread",
        engineInitialized: true,
        finalPrompt: finalPrompt,
        promptTokens: Math.max(1, Math.round(finalPrompt.length / 4)),
        outputTokens: Math.max(0, Math.round(responseText.length / 4)),
        nativeCompletedAtMs: nowMs()
      };
    }
  };

  return provider;
}

module.exports = { createMockGemmaProvider, CANNED_REPLIES, FAILURE_MODES };
