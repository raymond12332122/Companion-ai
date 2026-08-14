"use strict";
/**
 * Loads the real index.html script into a Node `vm` sandbox with a minimal
 * browser/DOM shim, so provider-abstraction tests (callProvider, askCompanion,
 * parseReply, GemmaDebug, provider switching, ...) run against the ACTUAL
 * app code — not a reimplementation of it — with a mock Gemma plugin
 * standing in for the native side. No real device, no real 529 MB model.
 *
 * FOR DEVELOPMENT/TEST ONLY. See CLAUDE.md's "Development vs. real-device
 * vs. production" section: this proves the provider-abstraction code works
 * against the mock. It does not prove the real Gemma model or native
 * runtime works.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function extractInlineScript(html) {
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (matches.length !== 1) {
    throw new Error("Expected exactly one inline <script> block in index.html, found " + matches.length);
  }
  return matches[0][1];
}

/** A DOM element stub permissive enough to survive code that pokes at
 * arbitrary properties/methods (classList, style, dataset, children, ...)
 * without the harness having to enumerate every one used across a 7000+
 * line app. Real values are tracked where tests actually need to observe
 * them (textContent, hidden, value, checked); everything else is inert. */
function createElementStub(tagName) {
  const listeners = new Map();
  const el = {
    tagName: (tagName || "div").toUpperCase(),
    id: "",
    className: "",
    textContent: "",
    innerHTML: "",
    value: "",
    hidden: false,
    disabled: false,
    checked: false,
    dataset: {},
    style: new Proxy({}, { get: () => "", set: () => true }),
    children: [],
    childNodes: [],
    parentNode: null,
    // Not real DOM structure (each getElementById() stub is independent) —
    // these are inert stand-ins so code that pokes at a sibling/parent for
    // cosmetic purposes (e.g. "grey out the label next to this input")
    // doesn't throw. Never assert against these in a test.
    get parentElement() { return createElementStub("div"); },
    get previousElementSibling() { return createElementStub("div"); },
    get nextElementSibling() { return createElementStub("div"); },
    get firstElementChild() { return createElementStub("div"); },
    get lastElementChild() { return createElementStub("div"); },
    attributes: {},
    classList: {
      add() {}, remove() {}, toggle() {}, contains() { return false; }
    },
    addEventListener(type, cb) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(cb);
    },
    removeEventListener(type, cb) {
      const set = listeners.get(type);
      if (set) set.delete(cb);
    },
    dispatchEvent(evt) {
      const set = listeners.get(evt && evt.type);
      if (set) set.forEach((cb) => cb(evt));
      return true;
    },
    appendChild(child) {
      el.children.push(child);
      el.childNodes.push(child);
      if (child) child.parentNode = el;
      return child;
    },
    removeChild(child) {
      el.children = el.children.filter((c) => c !== child);
      return child;
    },
    insertBefore(child) {
      el.children.push(child);
      return child;
    },
    setAttribute(name, val) { el.attributes[name] = val; },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(el.attributes, name) ? el.attributes[name] : null; },
    removeAttribute(name) { delete el.attributes[name]; },
    closest() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
    cloneNode() { return createElementStub(tagName); }
  };
  return el;
}

function buildSandbox(opts) {
  const options = opts || {};
  const elementsById = new Map();
  const localStorageStore = new Map();

  function getElementById(id) {
    if (!elementsById.has(id)) elementsById.set(id, createElementStub("div"));
    return elementsById.get(id);
  }

  const documentStub = {
    getElementById,
    createElement: (tag) => createElementStub(tag),
    querySelector: () => createElementStub("div"),
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    documentElement: createElementStub("html"),
    body: createElementStub("body"),
    activeElement: null,
    createTextNode: (text) => ({ nodeType: 3, textContent: text }),
    visibilityState: "visible"
  };

  const localStorageStub = {
    getItem: (k) => (localStorageStore.has(k) ? localStorageStore.get(k) : null),
    setItem: (k, v) => { localStorageStore.set(k, String(v)); },
    removeItem: (k) => { localStorageStore.delete(k); },
    clear: () => { localStorageStore.clear(); }
  };

  const windowStub = {};
  const consoleStub = options.silent
    ? { log() {}, warn() {}, error() {}, info() {} }
    : console;

  Object.assign(windowStub, {
    document: documentStub,
    localStorage: localStorageStub,
    navigator: { userAgent: "node-test-harness", serviceWorker: undefined, clipboard: { writeText: async () => {} } },
    location: { href: "http://localhost/", search: "" },
    console: consoleStub,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    // Unref'd: FpsProbe.start() recurses on this forever (real requestAnimationFrame
    // has no equivalent concept of "keep the process alive"), so without unref()
    // a test process would never exit on its own.
    requestAnimationFrame: (cb) => {
      const t = setTimeout(() => cb(Date.now()), 0);
      if (t && typeof t.unref === "function") t.unref();
      return t;
    },
    cancelAnimationFrame: (id) => clearTimeout(id),
    addEventListener() {},
    removeEventListener() {},
    Image: class { constructor() { this.onload = null; this.onerror = null; } set src(_v) {} },
    fetch: options.fetch || (() => Promise.reject(new Error("fetch not available in test harness"))),
    matchMedia: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }),
    visualViewport: { addEventListener() {}, removeEventListener() {}, height: 800, width: 400 },
    confirm: () => true,
    alert: () => {},
    crypto: { randomUUID: () => "test-" + Math.random().toString(36).slice(2) },
    Capacitor: options.capacitor || undefined,
    __COMPANION_MOCK_GEMMA__: options.mockGemma || undefined,
    getComputedStyle: () => ({ getPropertyValue: () => "" })
  });
  windowStub.window = windowStub;
  windowStub.self = windowStub;
  windowStub.globalThis = windowStub;

  return windowStub;
}

/**
 * Loads index.html's app script into a fresh sandbox and returns the
 * sandbox (with window.__companion available once boot() completes).
 */
function loadApp(opts) {
  const options = opts || {};
  const htmlPath = options.htmlPath || path.join(__dirname, "..", "index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const script = extractInlineScript(html);

  const sandbox = buildSandbox(options);
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox, { filename: "index.html (inline script)" });
  return sandbox;
}

module.exports = { loadApp, buildSandbox, extractInlineScript, createElementStub };
