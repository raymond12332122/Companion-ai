package ai.companion.pixel.llm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The on-device path has no JSON mode to lean on, so everything a 1-3B model
 * does to a "reply with one JSON object" instruction has to land as text on
 * screen. Each case here is a shape those models actually produce.
 */
class StructuredReplyTest {

    @Test
    fun `clean object`() {
        val parsed = StructuredReply.extract("""{"response": "Hey.", "emotion": "happy"}""")
        assertEquals("Hey.", parsed.response)
        assertEquals("happy", parsed.emotion)
    }

    @Test
    fun `code fence around the object`() {
        val parsed = StructuredReply.extract(
            "```json\n{\"response\": \"Fenced.\", \"emotion\": \"curious\"}\n```"
        )
        assertEquals("Fenced.", parsed.response)
        assertEquals("curious", parsed.emotion)
    }

    @Test
    fun `preamble before the object`() {
        val parsed = StructuredReply.extract(
            "Sure! Here you go:\n{\"response\": \"Answered.\", \"emotion\": \"neutral\"}"
        )
        assertEquals("Answered.", parsed.response)
        assertEquals("neutral", parsed.emotion)
    }

    @Test
    fun `braces inside the response do not end the object early`() {
        val parsed = StructuredReply.extract(
            """{"response": "Use {curly} braces.", "emotion": "thinking"}"""
        )
        assertEquals("Use {curly} braces.", parsed.response)
        assertEquals("thinking", parsed.emotion)
    }

    @Test
    fun `plain prose survives as the reply`() {
        val parsed = StructuredReply.extract("No JSON here, just talking.")
        assertEquals("No JSON here, just talking.", parsed.response)
        assertNull(parsed.emotion)
    }

    @Test
    fun `legacy mood tag`() {
        val parsed = StructuredReply.extract("Fine, whatever. [[mood:annoyed]]")
        assertEquals("Fine, whatever.", parsed.response)
        assertEquals("annoyed", parsed.emotion)
    }

    @Test
    fun `truncated json falls back to prose rather than being dropped`() {
        val parsed = StructuredReply.extract("""{"response": "Half a sen""")
        assertEquals("""{"response": "Half a sen""", parsed.response)
    }

    @Test
    fun `missing emotion is null, not empty`() {
        val parsed = StructuredReply.extract("""{"response": "Just words."}""")
        assertEquals("Just words.", parsed.response)
        assertNull(parsed.emotion)
    }

    @Test
    fun `partial hides the scaffolding until the sentence starts`() {
        assertEquals("", StructuredReply.partialResponse("""{"resp"""))
        assertEquals("", StructuredReply.partialResponse("""{"response""""))
        assertEquals("", StructuredReply.partialResponse("""{"response": """"))
    }

    @Test
    fun `partial reveals the sentence as it arrives`() {
        assertEquals("Hey th", StructuredReply.partialResponse("""{"response": "Hey th"""))
    }

    @Test
    fun `partial stops at the closing quote`() {
        assertEquals(
            "Done.",
            StructuredReply.partialResponse("""{"response": "Done.", "emotion": "ha""")
        )
    }

    @Test
    fun `partial unescapes as it goes`() {
        assertEquals(
            "line\nbreak \"quoted\"",
            StructuredReply.partialResponse("""{"response": "line\nbreak \"quoted\"""")
        )
    }

    @Test
    fun `partial passes prose straight through`() {
        assertEquals("Just talking", StructuredReply.partialResponse("Just talking"))
    }
}
