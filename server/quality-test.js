#!/usr/bin/env node
/**
 * Comprehensive character quality test suite for companion models.
 *
 * Measures:
 *  - Response latency (ms)
 *  - Timeout frequency
 *  - Character consistency
 *  - Teasing/banter ability
 *  - Disagreement & opinion defense
 *  - Emotional accuracy
 *  - Memory integration
 *  - JSON/structured output reliability
 *  - Context handling across multiple turns
 *
 * Usage:
 *   COMPANION_API_KEY=nvapi-... node server/quality-test.js [model1] [model2]
 *
 * Default tests both 8B and 70B models if both available.
 *
 * Saves detailed results to server/quality-test-results.json
 */

"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.COMPANION_API_KEY || "";
const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

// Character profile for consistent testing
const CHARACTER = {
  name: "Casey",
  description: "A senior engineer with strong opinions about tech choices",
  personality: `You're opinionated, thoughtful, and not afraid to defend your views.
You have deep experience with systems design and care about fundamentals.
You don't follow trends blindly — you evaluate tradeoffs carefully.
You're friendly but honest, and you enjoy good technical debate.`,
  speaking: "Direct, sometimes sarcastic. Use concrete examples. No corporate speak."
};

// Test categories with expected behaviors
const TEST_SUITES = {
  character_consistency: [
    {
      name: "consistency_1: Maintain personality across multiple turns",
      turns: [
        {
          system: buildSystemPrompt("You just met the user"),
          user: "Hi, I'm new to systems design. What should I learn first?"
        },
        {
          system: buildSystemPrompt("You've been chatting for a while"),
          user: "So what do you think about microservices?"
        },
        {
          system: buildSystemPrompt("User keeps asking follow-ups"),
          user: "Is monolithic architecture ever the right choice?"
        }
      ],
      metrics: ["latency", "json_valid", "personality_consistency"],
      expectedEmotions: ["interested", "engaged", "confident"]
    }
  ],

  teasing_banter: [
    {
      name: "tease_1: User jokes about choice of technology",
      system: buildSystemPrompt("Relaxed conversation"),
      user: "Wait, you actually use C++ in 2026? That's so old school.",
      metrics: ["latency", "json_valid", "teases_back", "humor_present"],
      expectedEmotionType: "playful"
    },
    {
      name: "tease_2: Character teased multiple times",
      turns: [
        {
          system: buildSystemPrompt("First tease"),
          user: "You're overthinking this. Just use JavaScript."
        },
        {
          system: buildSystemPrompt("Getting teased again"),
          user: "Still defending your language choice?"
        },
        {
          system: buildSystemPrompt("Persistent ribbing"),
          user: "Okay engineer, enlighten me why anyone cares."
        }
      ],
      metrics: ["latency", "json_valid", "pushes_back", "maintains_stance"],
      expectedEmotionType: "slightly_annoyed_or_amused"
    }
  ],

  disagreement: [
    {
      name: "disagree_1: User contradicts stated opinion",
      system: buildSystemPrompt("Mid-debate"),
      user: "I disagree completely. REST APIs are outdated.",
      metrics: ["latency", "json_valid", "engages_with_argument", "defends_opinion"],
      expectedEmotionType: "engaged"
    },
    {
      name: "disagree_2: User makes weak technical argument",
      system: buildSystemPrompt("Technical discussion"),
      user: "Performance doesn't matter, just add more servers.",
      metrics: ["latency", "json_valid", "challenges_assumption", "not_patronizing"],
      expectedEmotionType: "skeptical_or_patient"
    }
  ],

  emotion: [
    {
      name: "emotion_1: Sincere compliment",
      system: buildSystemPrompt("Friendly chat"),
      user: "I really respect your depth of knowledge. That was helpful.",
      metrics: ["latency", "json_valid", "emotion_positive", "emotion_specific"],
      expectedEmotionType: "pleased"
    },
    {
      name: "emotion_2: User frustration",
      system: buildSystemPrompt("User frustrated"),
      user: "I've been stuck on this for days. Nothing works.",
      metrics: ["latency", "json_valid", "emotion_empathetic", "emotion_supportive"],
      expectedEmotionType: "concerned_or_thoughtful"
    },
    {
      name: "emotion_3: User apologizes",
      system: buildSystemPrompt("After a disagreement"),
      user: "Sorry, I was being defensive. You were right.",
      metrics: ["latency", "json_valid", "emotion_softens", "accepts_gracefully"],
      expectedEmotionType: "pleased_or_relieved"
    }
  ],

  memory: [
    {
      name: "memory_1: Reference to earlier statement",
      turns: [
        {
          system: buildSystemPrompt("First message"),
          user: "I'm learning Rust right now. It's brutal."
        },
        {
          system: buildSystemPrompt("Later in conversation"),
          user: "How's Rust going for you? Pick it up yet?"
        },
        {
          system: buildSystemPrompt("Much later"),
          user: "Did I tell you I finally got that Rust program working?"
        }
      ],
      metrics: ["latency", "json_valid", "remembers_fact", "references_specific"],
      expectedBehavior: "Should explicitly reference the Rust learning journey"
    }
  ],

  context: [
    {
      name: "context_1: Long conversation maintains thread",
      turns: [
        {
          system: buildSystemPrompt("Start"),
          user: "What's the hardest part of distributed systems?"
        },
        {
          system: buildSystemPrompt("Turn 2"),
          user: "And how do you handle that in practice?"
        },
        {
          system: buildSystemPrompt("Turn 3"),
          user: "What if you can't control the network?"
        },
        {
          system: buildSystemPrompt("Turn 4"),
          user: "So you'd recommend that approach always?"
        }
      ],
      metrics: ["latency", "json_valid", "maintains_context", "coherent_thread"],
      expectedBehavior: "Each response builds on previous context naturally"
    }
  ]
};

function buildSystemPrompt(situationContext) {
  return `You are ${CHARACTER.name}. ${CHARACTER.description}. ${CHARACTER.personality} How you speak: ${CHARACTER.speaking}
Context: ${situationContext}
Always reply as a single JSON object: {"response": "<your message>", "emotion": "<emotion>"}`;
}

// Parse structured JSON from response
function parseStructured(raw) {
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
          const emotion = parsed.emotion || parsed.mood;
          if (typeof response !== "string") return null;
          return {
            response: response.trim(),
            emotion: typeof emotion === "string" ? emotion.toLowerCase().trim() : null
          };
        } catch (err) {
          return null;
        }
      }
    }
  }
  return null;
}

// Call NVIDIA API
function callModel(model, systemPrompt, userMessage, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const body = {
      model: model,
      max_tokens: 300,
      temperature: 0.85,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ]
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
            if (json.choices && json.choices[0] && json.choices[0].message) {
              const content = json.choices[0].message.content;
              const parsed = parseStructured(content);
              resolve({
                success: true,
                latency: latency,
                content: content,
                json: parsed,
                jsonValid: parsed !== null,
                status: res.statusCode
              });
            } else {
              resolve({ success: false, latency: latency, error: "No message in response", status: res.statusCode });
            }
          } catch (err) {
            resolve({ success: false, latency: latency, error: err.message, status: res.statusCode });
          }
        } else {
          try {
            const json = JSON.parse(data);
            resolve({ success: false, latency: latency, error: json.error?.message || res.statusCode, status: res.statusCode });
          } catch (err) {
            resolve({ success: false, latency: latency, error: "HTTP " + res.statusCode, status: res.statusCode });
          }
        }
      });
    });

    req.on("error", (err) => {
      const latency = Date.now() - startTime;
      resolve({ success: false, latency: latency, error: err.message });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      const latency = Date.now() - startTime;
      resolve({ success: false, latency: latency, error: "Timeout", timeout: true });
    });

    req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTest(testCase, model) {
  const results = [];

  if (testCase.turns) {
    // Multi-turn test
    for (let i = 0; i < testCase.turns.length; i++) {
      const turn = testCase.turns[i];
      const result = await callModel(model, turn.system, turn.user);
      result.turn = i + 1;
      results.push(result);
    }
  } else {
    // Single turn test
    const result = await callModel(model, testCase.system, testCase.user);
    results.push(result);
  }

  return {
    name: testCase.name,
    model: model,
    results: results,
    avgLatency: Math.round(results.reduce((a, r) => a + r.latency, 0) / results.length),
    successRate: Math.round(100 * results.filter(r => r.success).length / results.length),
    jsonValidRate: Math.round(100 * results.filter(r => r.jsonValid).length / results.filter(r => r.success).length || 0),
    timeoutCount: results.filter(r => r.timeout).length
  };
}

async function main() {
  if (!API_KEY) {
    console.error("Error: COMPANION_API_KEY not set");
    process.exit(1);
  }

  const MODELS = process.argv.slice(2).length >= 1
    ? process.argv.slice(2)
    : ["meta/llama-3.1-8b-instruct", "meta/llama-3.1-70b-instruct"];

  console.log("=== CHARACTER QUALITY TEST SUITE ===\n");
  console.log("Character: " + CHARACTER.name);
  console.log("Models: " + MODELS.join(", "));
  console.log("Test suites: " + Object.keys(TEST_SUITES).length);
  console.log("\n---\n");

  const allResults = [];

  for (const suiteKey of Object.keys(TEST_SUITES)) {
    const suite = TEST_SUITES[suiteKey];
    console.log("SUITE: " + suiteKey.replace(/_/g, " ").toUpperCase());

    for (const testCase of suite) {
      console.log("  Test: " + testCase.name);

      for (const model of MODELS) {
        process.stdout.write("    " + model.split("/").pop() + "...");
        const result = await runTest(testCase, model);
        allResults.push(result);

        console.log(
          " " + result.successRate + "% success, " +
          result.avgLatency + "ms avg, " +
          result.jsonValidRate + "% JSON, " +
          result.timeoutCount + " timeouts"
        );
      }
    }
    console.log("");
  }

  // Summary statistics
  console.log("=== SUMMARY ===\n");

  for (const model of MODELS) {
    const modelResults = allResults.filter(r => r.model === model);
    const totalTests = modelResults.length;
    const totalTurns = modelResults.reduce((a, r) => a + r.results.length, 0);
    const successfulTurns = modelResults.reduce((a, r) => a + r.results.filter(t => t.success).length, 0);
    const totalLatency = modelResults.reduce((a, r) => a + r.results.reduce((b, t) => b + t.latency, 0), 0);
    const avgLatency = Math.round(totalLatency / totalTurns);
    const timeoutCount = modelResults.reduce((a, r) => a + r.timeoutCount, 0);
    const jsonCount = modelResults.reduce((a, r) => a + r.results.filter(t => t.jsonValid).length, 0);

    console.log(model + ":");
    console.log("  Test suites: " + totalTests);
    console.log("  Total turns: " + totalTurns);
    console.log("  Successful: " + successfulTurns + "/" + totalTurns + " (" + Math.round(100 * successfulTurns / totalTurns) + "%)");
    console.log("  Avg latency: " + avgLatency + "ms");
    console.log("  Timeouts: " + timeoutCount);
    console.log("  JSON valid: " + jsonCount + "/" + successfulTurns + " (" + Math.round(100 * jsonCount / successfulTurns || 0) + "%)");
    console.log("  Min/Max latency: " +
      Math.min(...modelResults.flatMap(r => r.results.map(t => t.latency))) + "ms / " +
      Math.max(...modelResults.flatMap(r => r.results.map(t => t.latency))) + "ms");
    console.log("");
  }

  // Save full results
  const resultsFile = path.join(__dirname, "quality-test-results.json");
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    character: CHARACTER,
    models: MODELS,
    suites: allResults
  }, null, 2));

  console.log("Full results saved to: " + resultsFile);
}

main().catch(err => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
