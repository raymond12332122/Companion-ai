package ai.companion.pixel.llm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ChatTemplateTest {

    private val system = "You are Pixel."
    private val turns = listOf(
        ChatMessage("user", "hi"),
        ChatMessage("assistant", "hey"),
        ChatMessage("user", "how are you")
    )

    @Test
    fun `family comes from the filename`() {
        assertEquals(ChatTemplate.Family.GEMMA, ChatTemplate.familyFor("gemma3-1b-it-int4.task"))
        assertEquals(ChatTemplate.Family.LLAMA3, ChatTemplate.familyFor("Llama-3.2-3B-Instruct.task"))
        assertEquals(ChatTemplate.Family.PHI3, ChatTemplate.familyFor("phi-3.5-mini.litertlm"))
        assertEquals(ChatTemplate.Family.CHATML, ChatTemplate.familyFor("qwen2.5-3b.task"))
        assertEquals(ChatTemplate.Family.PLAIN, ChatTemplate.familyFor("something-else.task"))
    }

    @Test
    fun `a model carrying both names is templated as llama`() {
        assertEquals(ChatTemplate.Family.LLAMA3, ChatTemplate.familyFor("tinyllama-1.1b-chat.task"))
    }

    @Test
    fun `gemma folds the system prompt into the first user turn`() {
        val prompt = ChatTemplate.format(ChatTemplate.Family.GEMMA, system, turns)
        // Gemma has no system role at all; losing this would cost the
        // character its entire identity and memory.
        assertTrue(prompt.startsWith("<start_of_turn>user\n$system\n\nhi<end_of_turn>"))
        assertTrue(prompt.endsWith("<start_of_turn>model\n"))
        assertEquals(1, Regex(Regex.escape(system)).findAll(prompt).count())
    }

    @Test
    fun `gemma still carries the system prompt when there are no turns yet`() {
        val prompt = ChatTemplate.format(ChatTemplate.Family.GEMMA, system, emptyList())
        assertTrue(prompt.contains(system))
        assertTrue(prompt.endsWith("<start_of_turn>model\n"))
    }

    @Test
    fun `llama3 omits BOS because the tokenizer adds it`() {
        val prompt = ChatTemplate.format(ChatTemplate.Family.LLAMA3, system, turns)
        assertFalse(prompt.contains("<|begin_of_text|>"))
        assertTrue(prompt.contains("<|start_header_id|>system<|end_header_id|>\n\n$system<|eot_id|>"))
        assertTrue(prompt.endsWith("<|start_header_id|>assistant<|end_header_id|>\n\n"))
    }

    @Test
    fun `assistant turns are labelled as the model's own`() {
        val prompt = ChatTemplate.format(ChatTemplate.Family.CHATML, system, turns)
        assertTrue(prompt.contains("<|im_start|>assistant\nhey<|im_end|>"))
        assertTrue(prompt.endsWith("<|im_start|>assistant\n"))
    }

    @Test
    fun `phi3 opens with the system block`() {
        val prompt = ChatTemplate.format(ChatTemplate.Family.PHI3, system, turns)
        assertTrue(prompt.startsWith("<|system|>\n$system<|end|>\n"))
        assertTrue(prompt.endsWith("<|assistant|>\n"))
    }

    @Test
    fun `plain adds no markers`() {
        val prompt = ChatTemplate.format(ChatTemplate.Family.PLAIN, system, turns)
        assertFalse(prompt.contains("<|"))
        assertFalse(prompt.contains("<start_of_turn>"))
        assertTrue(prompt.endsWith("Assistant: "))
    }

    @Test
    fun `generation is cut at the first end-of-turn marker`() {
        // Without a runtime stop sequence, a model that runs on writes the
        // user's next line and answers it — all of which would be shown.
        assertEquals(
            "Hello.",
            ChatTemplate.trimAtStop("Hello.<end_of_turn>\n<start_of_turn>user\n", ChatTemplate.Family.GEMMA)
        )
        assertEquals(
            "Hello.",
            ChatTemplate.trimAtStop("Hello.<|eot_id|>", ChatTemplate.Family.LLAMA3)
        )
    }

    @Test
    fun `text without a marker is left alone`() {
        assertEquals("Hello.", ChatTemplate.trimAtStop("Hello.", ChatTemplate.Family.GEMMA))
    }

    @Test
    fun `template ids round-trip so the plugin can force one`() {
        assertEquals(ChatTemplate.Family.GEMMA, ChatTemplate.Family.byId("gemma"))
        assertEquals(ChatTemplate.Family.PLAIN, ChatTemplate.Family.byId("plain"))
        assertEquals(null, ChatTemplate.Family.byId("nonsense"))
        assertEquals(null, ChatTemplate.Family.byId(null))
    }
}
