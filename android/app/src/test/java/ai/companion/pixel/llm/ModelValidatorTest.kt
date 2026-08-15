package ai.companion.pixel.llm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The point of validating an imported file is to fail *before* copying half a
 * gigabyte, and to fail with a sentence someone can act on. `LlmInference`
 * rejects a file it cannot parse from inside native graph construction, with a
 * message that names neither the file nor the reason — every case below is one
 * that would otherwise surface that way, minutes later.
 *
 * The header bytes are real, read off conversions published by
 * litert-community rather than taken from documentation.
 */
class ModelValidatorTest {

    private val big = 600L * 1024 * 1024

    /** `.task` as published today: four zero bytes, then the zip header. */
    private fun taskHeader(): ByteArray {
        val header = ByteArray(ModelValidator.HEADER_BYTES)
        byteArrayOf(0, 0, 0, 0, 0x50, 0x4B, 0x03, 0x04).copyInto(header)
        "TF_LITE_PREFILL_DECODE".toByteArray().copyInto(header, 30)
        return header
    }

    private fun litertlmHeader(): ByteArray {
        val header = ByteArray(ModelValidator.HEADER_BYTES)
        "LITERTLM".toByteArray().copyInto(header)
        header[8] = 1
        return header
    }

    private fun headerOf(vararg bytes: Int): ByteArray {
        val header = ByteArray(ModelValidator.HEADER_BYTES)
        bytes.forEachIndexed { index, value -> header[index] = value.toByte() }
        return header
    }

    @Test
    fun `a task bundle is recognised through its leading padding`() {
        assertEquals(ModelFormat.TASK, ModelValidator.sniff(taskHeader()))
    }

    @Test
    fun `a zip starting at byte zero is still a task bundle`() {
        assertEquals(ModelFormat.TASK, ModelValidator.sniff(headerOf(0x50, 0x4B, 0x03, 0x04)))
    }

    @Test
    fun `a litertlm bundle is recognised`() {
        assertEquals(ModelFormat.LITERTLM, ModelValidator.sniff(litertlmHeader()))
    }

    @Test
    fun `a bare tflite flatbuffer is recognised`() {
        assertEquals(
            ModelFormat.TFLITE,
            ModelValidator.sniff(headerOf(0x18, 0x00, 0x00, 0x00, 0x54, 0x46, 0x4C, 0x33))
        )
    }

    @Test
    fun `gguf is recognised so the error can name it`() {
        assertEquals(ModelFormat.GGUF, ModelValidator.sniff(headerOf(0x47, 0x47, 0x55, 0x46, 3)))
    }

    @Test
    fun `html saved by a browser is not a model`() {
        val header = ByteArray(ModelValidator.HEADER_BYTES)
        "<!doctype html><html><head>".toByteArray().copyInto(header)
        assertEquals(ModelFormat.UNKNOWN, ModelValidator.sniff(header))
    }

    @Test
    fun `a real task bundle passes`() {
        val check = ModelValidator.check("gemma3-1b-it-int4.task", big, taskHeader())
        assertTrue(check.problem, check.ok)
        assertEquals(ModelFormat.TASK, check.format)
    }

    @Test
    fun `a litertlm named task is fine — the contents decide`() {
        assertTrue(ModelValidator.check("Qwen3_1.7B.task", big, litertlmHeader()).ok)
    }

    @Test
    fun `gguf is rejected by name, not by a generic message`() {
        val check = ModelValidator.check("llama-3.2-3b.gguf", big, headerOf(0x47, 0x47, 0x55, 0x46))
        assertFalse(check.ok)
        assertTrue(check.problem!!, check.problem.contains("GGUF"))
        assertTrue(check.problem, check.problem.contains("llama.cpp"))
    }

    @Test
    fun `gguf is caught even when renamed to task`() {
        // Renaming is exactly what someone does after reading that .gguf is
        // not accepted, so the content check has to outrank the extension.
        val check = ModelValidator.check("model.task", big, headerOf(0x47, 0x47, 0x55, 0x46))
        assertFalse(check.ok)
        assertTrue(check.problem!!, check.problem.contains("GGUF"))
    }

    @Test
    fun `an unrelated file is rejected on its name`() {
        val check = ModelValidator.check("holiday.jpg", big, taskHeader())
        assertFalse(check.ok)
        assertTrue(check.problem!!, check.problem.contains("holiday.jpg"))
    }

    @Test
    fun `an interrupted download is called what it is`() {
        val check = ModelValidator.check("gemma3-1b-it-int4.task", 12L * 1024 * 1024, taskHeader())
        assertFalse(check.ok)
        assertTrue(check.problem!!, check.problem.contains("interrupted"))
    }

    @Test
    fun `a model bundle with the wrong insides is rejected`() {
        val header = ByteArray(ModelValidator.HEADER_BYTES)
        "<!doctype html>".toByteArray().copyInto(header)
        val check = ModelValidator.check("gemma3-1b-it-int4.task", big, header)
        assertFalse(check.ok)
        assertEquals(ModelFormat.UNKNOWN, check.format)
    }

    @Test
    fun `an unknown size defers the size check rather than failing it`() {
        // Document providers are allowed not to answer; the copy checks what
        // actually arrived instead.
        assertTrue(ModelValidator.check("gemma3-1b-it-int4.task", -1L, taskHeader()).ok)
    }

    @Test
    fun `extensions the catalog lists are the ones import accepts`() {
        assertTrue(ModelValidator.hasAcceptedExtension("a.task"))
        assertTrue(ModelValidator.hasAcceptedExtension("A.LITERTLM"))
        assertTrue(ModelValidator.hasAcceptedExtension("a.bin"))
        assertFalse(ModelValidator.hasAcceptedExtension("a.gguf"))
        assertFalse(ModelValidator.hasAcceptedExtension("a.task.zip"))
    }

    @Test
    fun `sizes read the way a person would say them`() {
        assertEquals("529 MB", ModelValidator.describeSize(529L * 1024 * 1024))
        assertEquals("1.4 GB", ModelValidator.describeSize((1.4 * 1073741824).toLong()))
        assertEquals("an unknown size", ModelValidator.describeSize(-1))
    }

    @Test
    fun `a truncated header cannot read past its end`() {
        // The first read off a stream is allowed to be short, and a two-byte
        // file must be a rejection rather than an index-out-of-bounds.
        assertEquals(ModelFormat.UNKNOWN, ModelValidator.sniff(byteArrayOf(0x50, 0x4B)))
        assertEquals(ModelFormat.UNKNOWN, ModelValidator.sniff(ByteArray(0)))
    }
}
