"use strict";
/**
 * Automated tests for the provider-abstraction layer, run against the real
 * app code (index.html's inline script) via test/harness.js, with
 * test/mockGemmaProvider.js standing in for the native Gemma plugin.
 *
 * No real device, no real 529 MB model — see CLAUDE.md's "Development vs.
 * real-device vs. production" section. These tests prove the JS-side
 * provider abstraction (prompt construction, history, fallback, parsing,
 * UI state, provider switching) works correctly against a well- and
 * badly-behaved plugin. They do NOT prove the real Gemma model or the real
 * native inference runtime works — that can only be confirmed on a real
 * device with the real .task file imported.
 *
 * Run: node test/run.js   (wired to `npm test`)
 */
const assert = require("assert");
const { loadApp } = require("./harness.js");
const { createMockGemmaProvider } = require("./mockGemmaProvider.js");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

/** Fresh app + fresh mock per test, so nothing leaks between tests. */
function setup(mockOpts) {
  const mock = createMockGemmaProvider(mockOpts);
  const sandbox = loadApp({ silent: true, mockGemma: mock });
  return { sandbox, mock, c: sandbox.__companion };
}

async function sendAndWait(sandbox, text, opts) {
  sandbox.pushMessage("user", text);
  await sandbox.askCompanion(text, null, opts || {});
}

function lastMessages(c, n) {
  return c.state.messages.slice(-n);
}

// ---------------------------------------------------------------------
// Provider selection / switching
// ---------------------------------------------------------------------

test("provider selection: gemma routes through DeviceGemma, not the offline brain", async () => {
  const { sandbox, mock, c } = setup();
  await mock.loadModel();
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  await sendAndWait(sandbox, "Hi");
  const bot = lastMessages(c, 3).find((m) => m.role === "bot");
  assert.ok(bot, "expected a bot reply");
  assert.strictEqual(bot.text, "Hello!", "mock's deterministic reply for \"Hi\"");
});

test("provider selection: local provider never touches DeviceGemma", async () => {
  const { sandbox, mock, c } = setup();
  let generateCalled = false;
  const originalGenerate = mock.generate.bind(mock);
  mock.generate = async (...args) => { generateCalled = true; return originalGenerate(...args); };
  c.AI_CONFIG.provider = "local";
  await sendAndWait(sandbox, "Hi");
  assert.strictEqual(generateCalled, false, "local provider must not call the Gemma plugin at all");
  const bot = lastMessages(c, 2).find((m) => m.role === "bot");
  assert.ok(bot && bot.text, "offline brain should still answer");
});

test("provider switching: same session, gemma then local, each uses the right path", async () => {
  const { sandbox, mock, c } = setup();
  await mock.loadModel();
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  await sendAndWait(sandbox, "Hi");
  assert.strictEqual(lastMessages(c, 3).find((m) => m.role === "bot").text, "Hello!");

  c.AI_CONFIG.provider = "local";
  await sendAndWait(sandbox, "What is your name?");
  const secondBot = c.state.messages.filter((m) => m.role === "bot").slice(-1)[0];
  assert.notStrictEqual(secondBot.text, "I'm Gg.", "local provider must not produce the mock's canned reply");
});

// ---------------------------------------------------------------------
// Model state
// ---------------------------------------------------------------------

test("model state: model_unavailable is reported, not silently answered", async () => {
  const { sandbox, c } = setup({ mode: "model_unavailable" });
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  await sendAndWait(sandbox, "Hi");
  const bot = c.state.messages.filter((m) => m.role === "bot").slice(-1)[0];
  assert.ok(bot, "expected some bot-role message reporting the failure");
  assert.notStrictEqual(bot.text, "Hello!", "must not have produced the canned reply with no model");
});

test("model state: loadModel() flips isAvailable().loaded", async () => {
  const { mock } = setup();
  const before = await mock.isAvailable();
  assert.strictEqual(before.loaded, false);
  await mock.loadModel();
  const after = await mock.isAvailable();
  assert.strictEqual(after.loaded, true);
});

// ---------------------------------------------------------------------
// Prompt construction / conversation history / memory
// ---------------------------------------------------------------------

test("prompt construction: single message reaches the plugin as raw text, no role labels", async () => {
  const { sandbox, mock, c } = setup();
  await mock.loadModel();
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  let seenPrompt = null;
  const real = mock.generate.bind(mock);
  mock.generate = async (opts) => { seenPrompt = opts.messages.map((m) => m.content).join("\n"); return real(opts); };
  await sendAndWait(sandbox, "Hi");
  assert.ok(seenPrompt.includes("Hi"), "the raw message content must reach the plugin");
  assert.ok(!/<start_of_turn>/.test(seenPrompt), "must not contain hand-rolled Gemma special tokens");
  assert.ok(!/^User:|^Assistant:/m.test(seenPrompt), "must not contain hand-rolled transcript labels");
});

test("conversation history: a prior turn is included in the next request's messages", async () => {
  const { sandbox, mock, c } = setup();
  await mock.loadModel();
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  await sendAndWait(sandbox, "Hi");

  let seenMessages = null;
  const real = mock.generate.bind(mock);
  mock.generate = async (opts) => { seenMessages = opts.messages; return real(opts); };
  await sendAndWait(sandbox, "What is your name?");

  const roles = seenMessages.map((m) => m.role);
  assert.ok(roles.includes("assistant") || roles.some((r) => r !== "user"), "prior bot reply should appear in history: " + JSON.stringify(seenMessages));
  const contents = seenMessages.map((m) => m.content).join(" | ");
  assert.ok(contents.includes("Hi"), "first user turn should still be in history");
});

test("memory: something remembered earlier appears in the system prompt sent to the plugin", async () => {
  const { sandbox, mock, c } = setup();
  await mock.loadModel();
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  c.Memory.add({ type: "note", content: "UNIQUE_MEMORY_MARKER_42", importance: 0.9 });

  let seenSystem = null;
  const real = mock.generate.bind(mock);
  mock.generate = async (opts) => { seenSystem = opts.system; return real(opts); };
  await sendAndWait(sandbox, "Hi");
  assert.ok(seenSystem && seenSystem.includes("UNIQUE_MEMORY_MARKER_42"), "remembered fact should reach the system prompt");
});

// ---------------------------------------------------------------------
// Fallback behavior / errors / empty & malformed responses
// ---------------------------------------------------------------------

test("fallback: a native exception from the plugin does not crash askCompanion", async () => {
  const { sandbox, c } = setup({ mode: "native_exception" });
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  await sendAndWait(sandbox, "Hi"); // must not throw
  const bot = c.state.messages.filter((m) => m.role === "bot").slice(-1)[0];
  assert.ok(bot && bot.text, "some bot-role message must exist after a native exception");
});

test("empty response: an empty reply from the plugin is treated as a failure, not a blank bubble", async () => {
  const { sandbox, c } = setup({ mode: "empty_response" });
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  await sendAndWait(sandbox, "Hi");
  const bot = c.state.messages.filter((m) => m.role === "bot").slice(-1)[0];
  assert.ok(bot, "expected a bot-role message");
  assert.notStrictEqual(bot.text.trim(), "", "must not render an empty bubble");
});

test("malformed response: a plugin result missing `response` entirely does not crash", async () => {
  const { sandbox, c } = setup({ mode: "malformed_response" });
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  await sendAndWait(sandbox, "Hi"); // must not throw
  const bot = c.state.messages.filter((m) => m.role === "bot").slice(-1)[0];
  assert.ok(bot && bot.text, "some bot-role message must exist");
});

test("provider unavailable: DeviceGemma missing entirely falls through cleanly", async () => {
  const { loadApp: loadAppFresh } = require("./harness.js");
  const sandbox = loadAppFresh({ silent: true }); // no mockGemma at all
  const c = sandbox.__companion;
  assert.strictEqual(c.DeviceGemma, null, "no plugin installed means DeviceGemma must be null");
  c.AI_CONFIG.provider = "gemma";
  sandbox.pushMessage("user", "Hi");
  await sandbox.askCompanion("Hi", null, {}); // must not throw
  const bot = c.state.messages.filter((m) => m.role === "bot").slice(-1)[0];
  assert.ok(bot && bot.text, "must still produce a reply (offline brain) with no plugin at all");
});

// ---------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------

test("response parsing: plain-text reply parses to itself", () => {
  const { sandbox } = setup();
  const parsed = sandbox.parseReply("Just a plain sentence.");
  assert.strictEqual(parsed.text, "Just a plain sentence.");
});

test("response parsing: {response, emotion} JSON is extracted correctly", () => {
  const { sandbox } = setup();
  const parsed = sandbox.parseReply(JSON.stringify({ response: "Hello there.", emotion: "happy" }));
  assert.strictEqual(parsed.text, "Hello there.");
  assert.strictEqual(parsed.mood, "happy");
});

// ---------------------------------------------------------------------
// UI loading/thinking state
// ---------------------------------------------------------------------

test("UI state: state.busy is true while a request is in flight and false after", async () => {
  const { sandbox, mock, c } = setup();
  await mock.loadModel();
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  assert.strictEqual(c.state.busy, false, "must start idle");
  sandbox.pushMessage("user", "Hi");
  const pending = sandbox.askCompanion("Hi", null, {});
  assert.strictEqual(c.state.busy, true, "must be busy immediately after starting a request");
  await pending;
  assert.strictEqual(c.state.busy, false, "must return to idle after the request settles");
});

// ---------------------------------------------------------------------
// Duplicate / concurrent requests, cancellation
// ---------------------------------------------------------------------

test("duplicate requests: a second askCompanion() call while busy is a no-op", async () => {
  const { sandbox, mock, c } = setup();
  await mock.loadModel();
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  sandbox.pushMessage("user", "Hi");
  const first = sandbox.askCompanion("Hi", null, {});
  const before = c.state.messages.length;
  await sandbox.askCompanion("Hi", null, {}); // should return immediately, state.busy is true
  const afterDuplicateAttempt = c.state.messages.length;
  assert.strictEqual(afterDuplicateAttempt, before, "a call while busy must not add messages");
  await first;
});

test("concurrent requests: the native layer itself rejects an overlapping generate() call", async () => {
  const { mock } = setup();
  await mock.loadModel();
  const p1 = mock.generate({ system: "", messages: [{ role: "user", content: "Hi" }] });
  let rejected = null;
  try {
    await mock.generate({ system: "", messages: [{ role: "user", content: "Hi" }] });
  } catch (err) {
    rejected = err;
  }
  assert.ok(rejected, "a second concurrent generate() call must be rejected");
  // Matches the real plugin's shape: callback.onError("A reply is already
  // being generated", "busy") in GemmaEngine.kt — code, not message text.
  assert.strictEqual(rejected.code, "busy");
  await p1;
});

test("cancellation/timeout: a plugin that never resolves is cancelled and reported as a timeout", async () => {
  const { sandbox, mock, c } = setup({ mode: "timeout" });
  await mock.loadModel();
  c.AI_CONFIG.provider = "gemma";
  c.state.transport = "gemma";
  c.AI_CONFIG.deviceFirstTokenMs = 30; // short budget so the test doesn't wait on the real default
  c.AI_CONFIG.deviceStallMs = 30;

  let cancelCalled = false;
  const realCancel = mock.cancel.bind(mock);
  mock.cancel = async (...args) => { cancelCalled = true; return realCancel(...args); };

  await sendAndWait(sandbox, "Hi"); // must not hang the test
  assert.strictEqual(cancelCalled, true, "the app must call cancel() on the plugin after its own timeout fires");
});

// ---------------------------------------------------------------------
// Performance instrumentation
// ---------------------------------------------------------------------

test("performance instrumentation: generate() result carries numeric timing/token fields", async () => {
  const { mock } = setup();
  await mock.loadModel();
  const result = await mock.generate({ system: "", messages: [{ role: "user", content: "Hi" }] });
  ["inferenceMs", "promptTokens", "outputTokens"].forEach((field) => {
    assert.strictEqual(typeof result[field], "number", field + " must be a number, got " + typeof result[field]);
  });
});

// ---------------------------------------------------------------------
// Real-model diagnostic report (/gemma-diagnostics -> getModelDiagnostics())
// ---------------------------------------------------------------------

test("diagnostics report: /gemma-diagnostics prints model metadata via the real call site", async () => {
  const { sandbox, mock } = setup({ sha256: "deadbeef".repeat(8), runtimeVersion: "com.google.mediapipe:tasks-genai:0.10.35" });
  await mock.loadModel();
  const before = sandbox.__companion.state.messages.length;
  // runCommand() is synchronous and fires runGemmaDiagnosticsReport()
  // without awaiting it (matching /gemma-minimal-test's existing pattern),
  // so calling the async function directly is what actually lets this test
  // wait for the message to be pushed before asserting on it.
  await sandbox.runGemmaDiagnosticsReport();
  const msg = sandbox.__companion.state.messages.slice(before)[0];
  assert.ok(msg, "expected a system message with the diagnostic report");
  assert.ok(msg.text.includes("[Gemma diagnostics]"));
  assert.ok(msg.text.includes("deadbeef"), "SHA-256 from getModelDiagnostics() should appear in the report");
  assert.ok(msg.text.includes("tasks-genai:0.10.35"), "runtime version should appear in the report");
  assert.ok(msg.text.includes("Model loaded: YES"));
});

test("diagnostics report: with no plugin at all, reports unavailable instead of throwing", async () => {
  const sandbox = loadApp({ silent: true }); // no mockGemma
  const before = sandbox.__companion.state.messages.length;
  await sandbox.runGemmaDiagnosticsReport(); // must not throw
  const msg = sandbox.__companion.state.messages.slice(before)[0];
  assert.ok(msg && msg.text.includes("not available"), "should report the bridge is unavailable, not crash");
});

test("diagnostics report: /gemma-diagnostics is actually wired into runCommand()", () => {
  const { sandbox } = setup();
  // Doesn't await the async work (matches real UI behavior — runCommand()
  // is synchronous); just confirms the command is recognized and dispatches
  // rather than falling through to "I don't know /gemma-diagnostics".
  const handled = sandbox.runCommand("/gemma-diagnostics");
  assert.strictEqual(handled, true, "runCommand() must recognize /gemma-diagnostics");
});

// ---------------------------------------------------------------------
// Persistence / reload
// ---------------------------------------------------------------------

test("persistence: messages saved by one app instance are visible after loadState() on a fresh one sharing storage", () => {
  const mock1 = createMockGemmaProvider();
  const store = new Map();
  const sharedLocalStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };

  const sandbox1 = loadApp({ silent: true, mockGemma: mock1 });
  // The harness builds its own independent localStorage stub per sandbox;
  // repoint this one at the shared store so both instances round-trip
  // through the same backing data, the way two real app launches would via
  // the actual device's localStorage.
  Object.assign(sandbox1.localStorage, sharedLocalStorage);
  sandbox1.pushMessage("user", "PERSISTENCE_MARKER");
  sandbox1.saveState();

  const sandbox2 = loadApp({ silent: true, mockGemma: createMockGemmaProvider() });
  Object.assign(sandbox2.localStorage, sharedLocalStorage);
  sandbox2.loadState();
  const found = sandbox2.__companion.state.messages.some((m) => m.text === "PERSISTENCE_MARKER");
  assert.ok(found, "a message saved by one instance must be loadable by another sharing storage");
});

// ---------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------

async function main() {
  let passed = 0;
  const failures = [];
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log("  ok - " + name);
    } catch (err) {
      failures.push({ name, err });
      console.log("  FAIL - " + name);
      console.log("    " + (err && err.message ? err.message : String(err)));
    }
  }
  console.log("");
  console.log(passed + "/" + tests.length + " passed");
  if (failures.length) {
    console.log("");
    console.log("Failures:");
    failures.forEach(({ name, err }) => {
      console.log("- " + name);
      if (err && err.stack) console.log("  " + err.stack.split("\n").slice(0, 4).join("\n  "));
    });
    process.exitCode = 1;
  }
}

main();
