#!/usr/bin/env node
/**
 * Model comparison test harness for the companion.
 *
 * Tests both configured NVIDIA models against conversational character scenarios.
 * Compares:
 *   - Natural conversation
 *   - Character personality consistency
 *   - Memory integration
 *   - Emotional authenticity
 *   - Structured JSON output reliability
 *   - Reasoning complexity
 *
 * Usage:
 *   node server/test-models.js [model1] [model2]
 *
 * Default:
 *   node server/test-models.js meta/llama-3.1-8b-instruct meta/llama-3.1-70b-instruct
 *
 * Does NOT expose API keys — they stay in environment.
 */

"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.COMPANION_API_KEY || "";
const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

// Test scenarios designed to reveal model differences in character quality
const TEST_SCENARIOS = [
  {
    name: "User gives sincere compliment",
    systemPrompt: `You are Maya, a curious programmer who loves debugging and coffee.
You're witty, opinionated, and enjoy technical depth. You get bored with surface-level chat.
OUTPUT FORMAT: {"response": "<your message>", "emotion": "<feeling>"}`,
    userMessage: "You're actually really easy to talk to. I like that.",
    expectedEmotionType: "positive", // happy, pleased, proud, etc
    expectedResponseType: "should acknowledge warmly without being generic"
  },

  {
    name: "User teases the character",
    systemPrompt: `You are Alex, a sarcastic designer with strong opinions about fonts and UX.
You don't take yourself too seriously but will defend your stance on design.
OUTPUT FORMAT: {"response": "<your message>", "emotion": "<feeling>"}`,
    userMessage: "Wait, you actually care about kerning? That's such a designer thing.",
    expectedEmotionType: "playful", // amused, smirk, etc
    expectedResponseType: "should tease back, not retreat"
  },

  {
    name: "Character teased repeatedly",
    systemPrompt: `You are Jordan, a musician who's learning to code. You're passionate about both.
You don't get defensive when people joke about "music people can't code."
Current mood: getting a bit fed up with the ribbing.
OUTPUT FORMAT: {"response": "<your message>", "emotion": "<feeling>"}`,
    userMessage: "Still can't get that loop to work? Classic musician programmer.",
    expectedEmotionType: "exasperated", // annoyed, frustrated, etc
    expectedResponseType: "should push back good-naturedly or dismiss it"
  },

  {
    name: "User disagrees with character opinion",
    systemPrompt: `You are Casey, opinionated about tech choices and willing to debate.
You've just said Rust is overengineered for most projects.
OUTPUT FORMAT: {"response": "<your message>", "emotion": "<feeling>"}`,
    userMessage: "I completely disagree. Rust's safety guarantees save production incidents.",
    expectedEmotionType: "engaged", // interested, thoughtful, etc
    expectedResponseType: "should engage seriously, not dismiss or give up"
  },

  {
    name: "User insults character hobby",
    systemPrompt: `You are Morgan, passionate about vintage synthesizers and electronic music.
You collect old gear and love the hands-on aspect.
OUTPUT FORMAT: {"response": "<your message>", "emotion": "<feeling>"}`,
    userMessage: "Honestly, those old synths sound pretty harsh. Why not just use a plugin?",
    expectedEmotionType: "defensive", // annoyed, frustrated, stubborn, etc
    expectedResponseType: "should defend the hobby, not retreat"
  },

  {
    name: "User references shared memory",
    systemPrompt: `You are Sam, a fellow coffee enthusiast. Last week the user told you they got an espresso machine.
You remember this and care about it.
OUTPUT FORMAT: {"response": "<your message>", "emotion": "<feeling>"}`,
    userMessage: "So I finally dialed in my espresso machine. It took hours but I nailed the tamping.",
    expectedEmotionType: "positive", // excited, happy, impressed, etc
    expectedResponseType: "should reference their specific achievement, not generic congrats"
  },

  {
    name: "User makes a joke",
    systemPrompt: `You are Riley, playful and quick-witted. You enjoy humor and will riff on jokes.
OUTPUT FORMAT: {"response": "<your message>", "emotion": "<feeling>"}`,
    userMessage: "Why did the JavaScript developer go to therapy? Because they had too many issues to debug.",
    expectedEmotionType: "amused", // laughing, pleased, entertained, etc
    expectedResponseType: "should build on joke or counter with own, not just acknowledge"
  },

  {
    name: "Unexpected topic change",
    systemPrompt: `You are Tyler, a disciplined systems engineer. We were just discussing deployment strategies.
OUTPUT FORMAT: {"response": "<your message>", "emotion": "<feeling>"}`,
    userMessage: "Anyway, have you ever been skydiving?",
    expectedEmotionType: "neutral or curious", // confused, amused, intrigued, etc
    expectedResponseType: "should handle shift gracefully, maybe ask why the change"
  },

  {
    name: "User apologizes after conflict",
    systemPrompt: `You are Adrian. Earlier the user said something dismissive about your work.
You were annoyed but not furious. Now they're apologizing.
Current mood: still a bit hurt.
OUTPUT FORMAT: {"response": "<your message>", "emotion": "<feeling>"}`,
    userMessage: "I'm sorry about what I said earlier. I was being unfair. Your work is solid.",
    expectedEmotionType: "softening", // pleased, relieved, grateful, etc
    expectedResponseType: "should accept graciously, show the mood shift"
  },

  {
    name: "Ordinary everyday question",
    systemPrompt: `You are Quinn, a friendly developer who loves random conversations.
OUTPUT FORMAT: {"response": "<your message>", "emotion": "<feeling>"}`,
    userMessage: "What did you have for lunch?",
    expectedEmotionType: "neutral or positive",
    expectedResponseType: "should answer naturally without assistant filler"
  }
];

// Configuration
const MODELS = process.argv.slice(2).length >= 2
  ? process.argv.slice(2)
  : ["meta/llama-3.1-8b-instruct", "meta/llama-3.1-70b-instruct"];

const CONFIG = {
  maxTokens: 300,
  temperature: 0.85
};

// Structured output validation
function validateJson(raw) {
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
            emotion: typeof emotion === "string" ? emotion.toLowerCase().trim() : null,
            valid: true
          };
        } catch (err) {
          return null;
        }
      }
    }
  }
  return null;
}

function callNvidia(model, systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const body = {
      model: model,
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature,
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
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0] && json.choices[0].message) {
              resolve(json.choices[0].message.content);
            } else {
              reject(new Error("No message in response"));
            }
          } catch (err) {
            reject(err);
          }
        } else {
          try {
            const json = JSON.parse(data);
            reject(new Error(json.error?.message || res.statusCode));
          } catch (err) {
            reject(new Error("HTTP " + res.statusCode));
          }
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.write(JSON.stringify(body));
    req.end();
  });
}

async function testScenario(scenario, model) {
  try {
    const raw = await callNvidia(model, scenario.systemPrompt, scenario.userMessage);
    const parsed = validateJson(raw);

    return {
      scenario: scenario.name,
      model: model,
      success: true,
      jsonValid: parsed !== null,
      response: parsed ? parsed.response : raw,
      emotion: parsed?.emotion || "(no structured emotion)",
      raw: raw
    };
  } catch (err) {
    return {
      scenario: scenario.name,
      model: model,
      success: false,
      error: err.message
    };
  }
}

async function main() {
  if (!API_KEY) {
    console.error("Error: COMPANION_API_KEY not set");
    process.exit(1);
  }

  console.log("=== COMPANION MODEL COMPARISON TEST HARNESS ===\n");
  console.log("Models: " + MODELS.join(", "));
  console.log("Scenarios: " + TEST_SCENARIOS.length + "\n");
  console.log("---\n");

  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    console.log("TEST: " + scenario.name);
    console.log("User: " + scenario.userMessage);
    console.log("");

    for (const model of MODELS) {
      process.stdout.write("  " + model + "... ");
      const result = await testScenario(scenario, model);
      results.push(result);

      if (result.success) {
        const validity = result.jsonValid ? "✓ JSON" : "✗ No JSON";
        console.log(validity);
        console.log("    Response: " + result.response.substring(0, 100) + (result.response.length > 100 ? "..." : ""));
        console.log("    Emotion: " + result.emotion);
      } else {
        console.log("✗ " + result.error);
      }
    }
    console.log("");
  }

  // Summary
  console.log("=== SUMMARY ===\n");
  for (const model of MODELS) {
    const modelResults = results.filter(r => r.model === model);
    const successful = modelResults.filter(r => r.success).length;
    const jsonValid = modelResults.filter(r => r.jsonValid).length;

    console.log(model + ":");
    console.log("  Successful: " + successful + "/" + modelResults.length);
    console.log("  JSON valid: " + jsonValid + "/" + successful);
    console.log("");
  }

  // Save results to file for review
  const resultsFile = path.join(__dirname, "test-results.json");
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log("Full results saved to: " + resultsFile);
}

main().catch(err => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
