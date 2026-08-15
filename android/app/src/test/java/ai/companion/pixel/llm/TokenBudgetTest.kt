package ai.companion.pixel.llm

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Bundle filenames from the litert-community conversions carry the KV cache
 * size they were built with. Asking for a bigger window than the file holds
 * fails inside native graph construction, with an error that never mentions
 * the number.
 */
class TokenBudgetTest {

    private val engine = MediaPipeLlmEngine()

    @Test
    fun `no hint means the default window`() {
        assertEquals(2048, engine.tokenBudgetFor("gemma3-1b-it-int4.task"))
    }

    @Test
    fun `a smaller hint caps the window`() {
        assertEquals(1280, engine.tokenBudgetFor("Gemma3-1B-IT_multi-prefill-seq_q4_ekv1280.task"))
        assertEquals(512, engine.tokenBudgetFor("something_ekv512.litertlm"))
    }

    @Test
    fun `a larger hint does not raise it`() {
        assertEquals(2048, engine.tokenBudgetFor("Gemma3-1B-IT_seq128_q8_ekv4096.task"))
    }

    @Test
    fun `the hint is read case-insensitively`() {
        assertEquals(1280, engine.tokenBudgetFor("Gemma3-1B-IT_q4_EKV1280_sm8650.litertlm"))
    }
}
