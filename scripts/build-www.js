#!/usr/bin/env node
/**
 * Copies the deployable static app into www/ for Capacitor to bundle into the
 * Android APK. Not a bundler — the app is a single index.html with no build
 * step, so this just stages the same files the Node proxy already serves.
 *
 * server/ is intentionally excluded: on Android there is no Node process, so
 * server/proxy.js never ships. Cloud calls (when the user opts into the NVIDIA
 * provider from the app) go straight to a configured remote proxy URL instead.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WWW = path.join(ROOT, "www");

const FILES = ["index.html", "manifest.json", "sw.js"];
const DIRS = ["assets"];

function copyFile(rel) {
  const src = path.join(ROOT, rel);
  const dest = path.join(WWW, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(rel) {
  const src = path.join(ROOT, rel);
  const dest = path.join(WWW, rel);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

FILES.forEach(copyFile);
DIRS.forEach(copyDir);

console.log("www/ staged: " + FILES.concat(DIRS).join(", "));
