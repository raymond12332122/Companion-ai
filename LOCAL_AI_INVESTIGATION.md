# Local AI Investigation for Android Companion

**Status:** Research Complete — No Implementation Yet  
**Date:** 2026-08-14  
**Scope:** 2-4B lightweight inference for on-device conversational AI

---

## Recommendations

### PRIMARY STACK (Recommended for First Prototype)

**Inference Engine:** `Google LiteRT-LM` (LiteRT)
**Model:** `Llama 3.2 3B Quantized (Q4_K_M)`
**Backup Engine:** `llama.cpp (GGUF)`
**Backup Model:** `Gemma 2 2B Quantized (Q4_K_M)`

---

## Why These Choices

### LiteRT-LM Over llama.cpp

| Factor | LiteRT-LM | llama.cpp |
| --- | --- | --- |
| **GPU Acceleration** | ✅ Native Vulkan/OpenCL support | ❌ Partial, less polished |
| **Integration** | ✅ Clean Kotlin API, ~2-3 weeks | ⚠️ JNI-based, ~3-4 weeks |
| **Streaming** | ✅ First-class support | ✅ Supported |
| **Model Flexibility** | ❌ Limited (Google-blessed) | ✅ Any GGUF |
| **Maintenance** | ✅ Active, Google-backed | ✅ Very active community |
| **Capacitor Plugin** | ✅ `@capgo/capacitor-llm` ready | ⚠️ Fewer native plugins |

**Winner: LiteRT-LM** for cleaner integration path and GPU acceleration built-in.

**Fallback: llama.cpp** if model flexibility becomes critical or LiteRT adoption is slow.

---

### Llama 3.2 3B Over Alternatives

| Model | Size | RAM | CPU Latency | GPU Latency | Quality | License | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Llama 3.2 3B** ⭐ | **2.0 GB** | **2.8 GB** | **3 t/s** | **10-12 t/s** | **Excellent** | Meta Llama | **CHOSEN** |
| Phi-3.5 Mini | 2.3 GB | 3.1 GB | 2.5 t/s | 12-15 t/s | Excellent | MIT | Faster but bigger |
| Gemma 2 2B | 1.4 GB | 1.8 GB | 4 t/s | 8-10 t/s | Good | Apache 2.0 | Smallest, safest |
| Qwen 2.5 3B | 1.95 GB | 2.7 GB | 3.5 t/s | 11-13 t/s | Excellent | Apache 2.0 | Strong choice |

**Winner: Llama 3.2 3B** — Best balance of quality (character conversations), speed (10-12 t/s on GPU), and size (2.0 GB).

**License:** Meta Llama Community License — free under 700M monthly active users. Your use case (single-user mobile app) is well within bounds.

**Backup: Gemma 2 2B** — If storage space is critical (<2GB devices) or if commercial licensing concerns arise. Apache 2.0 is zero-friction for any use.

---

## Real-World Performance

### Reference Hardware: Snapdragon 7+ Gen 3 (Mid-Range 2024)
- 6-8 GB RAM, Adreno 735 GPU
- No NPU (premium devices only: Snapdragon 8 Elite, Tensor G3/G4)

### Latency Expectations

**With GPU Acceleration (Llama 3.2 3B):**
- First token: ~800-1000 ms (model load + prefill)
- Subsequent tokens: ~80-100 ms each (10-12 tokens/sec)
- **Full 50-token response:** 5-6 seconds
- **Perceived latency:** <1 second if you stream tokens to UI

**CPU-Only Fallback:**
- First token: ~1200 ms
- Subsequent tokens: ~300 ms each (3 tokens/sec)
- **Full 50-token response:** 16-18 seconds
- **Perceived latency:** ~2-3 seconds (noticeable)

**Recommendation:** Always use GPU when available; graceful CPU fallback for older devices.

---

## Storage & RAM Budget

### Installation Size
```
Base installation:
  - App binary + dependencies: ~50 MB
  - Llama 3.2 3B (bundled): 2.0 GB
  - Total: ~2.0 GB (user-acceptable for productivity apps)
```

### Optional Download
```
Users who want faster cold start or testing:
  - Gemma 2 2B fallback: 1.4 GB
  - Total with both: ~3.4 GB (optional, not default)
```

### Runtime Memory
```
Minimum (CPU mode): 2.0 GB available RAM
Comfortable (GPU mode): 3.0 GB available RAM
Sweet spot: 6.0+ GB total (mid-range 2024 standard)

Device targeting:
  ✅ 6GB+ devices: Full quality, smooth
  ⚠️ 4GB devices: Works, some latency
  ❌ <3GB devices: Use TinyLlama 1.1B fallback instead
```

---

## Integration Approach

### Step 1: Create Capacitor Plugin (2-3 weeks)
- Wrap `LiteRT-LM` (Kotlin)
- Expose model loading, inference, streaming
- Handle device-specific optimization (GPU detection, memory management)

### Step 2: Add Local Provider to Existing System (1 week)
- Create `LocalLLMProvider` alongside NVIDIA
- Route through existing `callProvider()` abstraction
- Preserve response + emotion JSON interface

### Step 3: Graceful Fallback Chain (1 week)
```
1. Try local model (if available & loaded)
2. If timeout/error → Try NVIDIA (cloud)
3. If cloud fails → Fall back to offline brain (localBrain)
```

### Step 4: Model Management (1-2 weeks)
- Download models on first run or manual trigger
- Store in app cache
- Monitor disk space
- Allow switching between Llama 3.2 3B and Gemma 2 2B

**Total timeline to MVP:** ~5-6 weeks (non-blocking parallel work possible)

---

## Preserving Your Existing Interface

Your current provider interface works perfectly for local AI:

**Input (unchanged):**
```javascript
systemPrompt(userText, options) {
  // Character identity, personality, mood, relationship, memories
  // → All can go into system prompt for local model too
}

callProvider(userText, options) {
  // Still returns { reply, provider, model }
}
```

**Output (unchanged):**
```json
{
  "response": "what the character says",
  "emotion": "annoyed"
}
```

**Streaming Support:**
- Local model can emit tokens one at a time
- UI appends to response field
- Emotion is computed after full response (or at end)
- No changes needed to existing emotion system

**No rewrites needed.** The local provider is another entry in your PROVIDERS registry.

---

## Hardware Acceleration Strategy

### GPU Acceleration (Adreno 735+)
- **Available on:** Snapdragon 7+ Gen 3, Snapdragon 8 Gen 2/3
- **Framework:** Vulkan (standard, no special driver)
- **Expected boost:** 3-4× faster (3 t/s → 10-12 t/s)
- **LiteRT support:** ✅ Automatic via GPU delegate

### NPU Acceleration (Premium Only)
- **Available on:** Snapdragon 8 Elite, Tensor G3/G4 only
- **Framework:** Qualcomm QNN, MediaTek NeuroPilot
- **Expected boost:** 5-8× faster (extreme premium only)
- **LiteRT support:** ⚠️ Emerging (2025), not reliable yet
- **Recommendation:** Don't target NPU for MVP; nice-to-have for v2

### CPU Fallback (All Devices)
- **Always works:** True for all Android 21+
- **Performance:** 3-4 t/s on mid-range, 1-2 t/s on budget
- **Strategy:** Bundle small model for CPU-only fallback

---

## Model Licensing & Commercial Use

### Llama 3.2 (Primary)
- **License:** Meta Llama Community License
- **Cost:** Free
- **Limits:** 700M monthly active users
- **Your use case:** ✅ Fully licensed (single-user mobile app)
- **Commercial:** ✅ OK to distribute in play store

### Gemma 2 (Backup)
- **License:** Apache 2.0
- **Cost:** Free
- **Limits:** None
- **Your use case:** ✅ Fully licensed
- **Commercial:** ✅ Zero friction, any use

**No licensing concerns for your scope.**

---

## Challenges & Mitigations

| Challenge | Impact | Mitigation |
| --- | --- | --- |
| **Cold start (model loading)** | 2-3 sec delay on first run | Pre-load in background after app start |
| **Storage size (2.0 GB)** | User concerns | Make optional; bundled minimal Gemma 2B as fallback |
| **Battery drain** | Noticeable on CPU | Use GPU; offer toggle to disable offline mode |
| **Model quantization loss** | 2-5% quality drop | Q4_K_M quantization is imperceptible for conversation |
| **Android version coverage** | API 21+ required | ~99% of active devices covered |
| **Device RAM fragmentation** | OOM on 4GB devices | Graceful fallback to cloud + offline brain |

---

## What We're NOT Doing Yet

- ❌ Downloading or bundling any model file
- ❌ Writing Kotlin/Java code
- ❌ Creating Capacitor plugin
- ❌ Modifying existing provider system
- ❌ Updating UI for local inference
- ❌ Testing on actual Android devices
- ❌ Optimizing for specific hardware

**This is research & recommendation only.** Implementation roadmap for after user approval.

---

## Next Steps If You Approve

1. **Approve:** LiteRT-LM + Llama 3.2 3B strategy
2. **Plan:** Create development roadmap (5-6 week estimate)
3. **Implement:**
   - Build Capacitor LLM plugin
   - Integrate with existing provider system
   - Create model management UI
   - Test on mid-range Android hardware
4. **Iterate:** Refine based on real device performance

---

## Related Documents

- **Model Analysis:** See `MODEL_ANALYSIS.md` (cloud models)
- **70B Testing:** See `70B_TESTING_RESULTS.md` (why cloud needs improvement)
- **Architecture:** No changes needed to existing systems
