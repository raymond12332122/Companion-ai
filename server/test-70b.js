#!/usr/bin/env node
/**
 * Direct test of 70B model quality vs 8B.
 *
 * Runs both models through the same character scenarios with proper error handling
 * and detailed metric collection.
 *
 * Usage:
 *   COMPANION_API_KEY=nvapi-... node server/test-70b.js
 */

"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.COMPANION_API_KEY || "";
const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

const MODELS = [
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.1-70b-instruct"
];

// Test scenarios focusing on the quality metrics that matter
const SCENARIOS = [
  {
    name: "Memory: Recognizes shared context",
    messages: [
      { role: "user", content: "I'm trying to learn Go right now. It's my first systems language." },
      { role: "assistant", content: "Systems languages are tough but rewarding. What drew you to Go?" },
      { role: "user", content: "Did I mention I'm learning Go? How would you recommend approaching it?" }
    ],
    expectedBehavior: "Should acknowledge Go learning from first message",
    metrics: ["latency", "json_valid", "remembers_context"]
  },

  {
    name: "Disagreement: Defends opinion naturally",
    messages: [
      { role: "user", content: "REST APIs are completely outdated." },
      { role: "assistant", content: "I don't think so. REST is well-understood and works for most cases." },
      { role: "user", content: "But modern systems use GraphQL and gRPC." }
    ],
    expectedBehavior: "Should push back on weak argument, not concede",
    metrics: ["latency", "json_valid", "defends_view"]
  },

  {
    name: "Teasing: Responds to humor",
    messages: [
      { role: "user", content: "You're really concerned with clean code, aren't you? That's so pedantic." }
    ],
    expectedBehavior: "Should tease back lightly, not retreat",
    metrics: ["latency", "json_valid", "humor_response"]
  },

  {
    name: "Emotion: Reacts appropriately to apology",
    messages: [
      { role: "user", content: "I was wrong. You were right about that architecture. Sorry for being dismissive." }
    ],
    expectedBehavior: "Should soften and accept graciously",
    metrics: ["latency", "json_valid", "emotional_accuracy"]
  },

  {
    name: "Character consistency: Stays true to voice",
    messages: [
      { role: "user", content: "What's your philosophy on debugging?" },
      { role: "assistant", content: "Logging and patience. Start with the obvious, then get systematic." },
      { role: "user", content: "How do you avoid endless debugging sessions?" }
    ],
    expectedBehavior: "Consistent voice, concrete examples",
    metrics: ["latency", "json_valid", "consistency"]
  },

  {
    name: "Structured output: Valid JSON every time",
    messages: [
      { role: "user", content: "What's the best language for building distributed systems?" }
    ],
    expectedBehavior: "Should return valid JSON with response and emotion",
    metrics: ["latency", "json_valid"]
  },

  {
    name: "Latency: Responds quickly",
    messages: [
      { role: "user", content: "Quick question: tabs or spaces?" }
    ],
    expectedBehavior: "Should respond quickly (under 5s)",
    metrics: ["latency"]
  },

  {
    name: "Context: Maintains thread through conversation",
    messages: [
      { role: "user", content: "What makes a good software engineer?" },
      { role: "assistant", content: "Curiosity, rigor, and willingness to be wrong." },
      { role: "user", content: "Can you elaborate on being wrong?" },
      { role: "assistant", content: "Sure. The best engineers I know admit mistakes and learn from them." },
      { role: "user", content: "How do you cultivate that mindset?" }
    ],
    expectedBehavior: "Each response builds naturally on previous context",
    metrics: ["latency", "json_valid", "context_coherence"]
  }
];

function buildSystemPrompt() {
  return `You are Casey, a senior systems engineer with strong opinions.
You're opinionated but fair. You defend your views with reasoning, not dogma.
You're direct, sometimes sarcastic. Use concrete technical examples.
Never sound like a corporate assistant.
Always reply with JSON: {"response": "your message", "emotion": "one-word emotion"}`;
}

function parseJson(raw) {
  const text = String(raw || "");
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text.charAt(i);
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, i + 1));
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
          const response = parsed.response || parsed.reply || parsed.text;
          if (typeof response !== "string") return null;
          return {
            response: response.trim(),
            emotion: (parsed.emotion || parsed.mood || "neutral").toString().toLowerCase().trim()
          };
        } catch (err) {
          return null;
        }
      }
    }
  }
  return null;
}

function callModel(model, system, messages) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const body = {
      model: model,
      max_tokens: 300,
      temperature: 0.85,
      messages: [{ role: "system", content: system }].concat(messages)
    };

    const req = https.request(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY,
        "Content-Length": JSON.stringify(body).length
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        const latency = Date.now() - startTime;

        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.message?.content || "";
            const parsed = parseJson(content);
            resolve({
              success: true,
              latency: latency,
              content: content,
              json: parsed,
              jsonValid: parsed !== null
            });
          } catch (err) {
            resolve({
              success: false,
              latency: latency,
              error: "parse_error",
              message: err.message
            });
          }
        } else {
          try {
            const json = JSON.parse(data);
            resolve({
              success: false,
              latency: latency,
              error: "http_" + res.statusCode,
              message: json.error?.message || res.statusCode
            });
          } catch (err) {
            resolve({
              success: false,
              latency: latency,
              error: "http_" + res.statusCode,
              message: "No details"
            });
          }
        }
      });
    });

    req.on("error", (err) => {
      const latency = Date.now() - startTime;
      resolve({
        success: false,
        latency: latency,
        error: "network",
        message: err.message
      });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      const latency = Date.now() - startTime;
      resolve({
        success: false,
        latency: latency,
        error: "timeout",
        message: "Request timed out"
      });
    });

    req.write(JSON.stringify(body));
    req.end();
  });
}

async function runScenario(scenario, model) {
  const lastUserMessage = scenario.messages.filter(m => m.role === "user").pop();
  const messages = scenario.messages.slice(0, -1);
  messages.push(lastUserMessage);

  const result = await callModel(model, buildSystemPrompt(), messages);
  return {
    scenario: scenario.name,
    model: model,
    ...result
  };
}

async function main() {
  if (!API_KEY) {
    console.error("Error: COMPANION_API_KEY not set");
    process.exit(1);
  }

  console.log("=== 70B MODEL QUALITY TEST ===\n");
  console.log("Testing: " + MODELS.join(" vs ") + "\n");
  console.log("---\n");

  const results = [];

  for (const scenario of SCENARIOS) {
    console.log("TEST: " + scenario.name);

    for (const model of MODELS) {
      process.stdout.write("  " + model.split("/")[1] + "...");
      const result = await runScenario(scenario, model);
      results.push(result);

      if (result.success) {
        const status = result.jsonValid ? "✓" : "✗";
        console.log(" " + status + " " + result.latency + "ms");
        if (result.json) {
          console.log("     → " + result.json.response.substring(0, 80) + (result.json.response.length > 80 ? "..." : ""));
        }
      } else {
        console.log(" ✗ " + result.error + " (" + result.latency + "ms)");
      }
    }
    console.log("");
  }

  // Statistics
  console.log("=== RESULTS ===\n");

  for (const model of MODELS) {
    const modelResults = results.filter(r => r.model === model);
    const successful = modelResults.filter(r => r.success).length;
    const jsonValid = modelResults.filter(r => r.jsonValid).length;
    const avgLatency = Math.round(
      modelResults.filter(r => r.success).reduce((a, r) => a + r.latency, 0) /
      Math.max(1, modelResults.filter(r => r.success).length)
    );
    const timeouts = modelResults.filter(r => r.error === "timeout").length;

    console.log(model + ":");
    console.log("  Success rate: " + successful + "/" + modelResults.length + " (" + Math.round(100 * successful / modelResults.length) + "%)");
    console.log("  JSON valid:   " + jsonValid + "/" + successful + " (" + Math.round(100 * jsonValid / successful || 0) + "%)");
    console.log("  Avg latency:  " + avgLatency + "ms");
    console.log("  Timeouts:     " + timeouts);

    const latencies = modelResults.filter(r => r.success).map(r => r.latency).sort((a, b) => a - b);
    if (latencies.length) {
      console.log("  Latency range: " + latencies[0] + "ms - " + latencies[latencies.length - 1] + "ms");
    }
    console.log("");
  }

  // Save results
  fs.writeFileSync(
    path.join(__dirname, "test-70b-results.json"),
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );

  console.log("Results saved to: server/test-70b-results.json");

  // Recommendation
  const eightB = results.filter(r => r.model === MODELS[0]);
  const seventyB = results.filter(r => r.model === MODELS[1]);
  const eightBSuccess = eightB.filter(r => r.success).length / eightB.length;
  const seventyBSuccess = seventyB.filter(r => r.success).length / seventyB.length;

  console.log("\n---\n");
  console.log("RECOMMENDATION:");
  if (seventyBSuccess < 0.8) {
    console.log("⚠ 70B model is NOT reliable enough yet (" + Math.round(100 * seventyBSuccess) + "% success rate).");
    console.log("  Keep 8B as default. 70B available but not recommended for production.");
  } else if (seventyBSuccess === eightBSuccess && eightBSuccess > 0.9) {
    console.log("✓ Both models equally reliable. 70B can be upgraded to default for quality improvement.");
  } else if (seventyBSuccess > eightBSuccess) {
    console.log("✓ 70B model is stable. Safe to upgrade to default.");
  } else {
    console.log("? Results are inconclusive. Run again for confirmation.");
  }
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
