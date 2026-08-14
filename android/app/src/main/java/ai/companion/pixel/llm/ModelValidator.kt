package ai.companion.pixel.llm

/** What a picked file turned out to actually be, judged by its first bytes. */
enum class ModelFormat(val id: String) {
    /** MediaPipe task bundle: a zip of the tflite graph plus its metadata. */
    TASK("task"),

    /** LiteRT-LM's own container, what current conversions emit. */
    LITERTLM("litertlm"),

    /** A bare TFLite flatbuffer, as some older Gemma exports shipped. */
    TFLITE("tflite"),

    /** llama.cpp's format. Recognised only so the error can say so. */
    GGUF("gguf"),

    UNKNOWN("unknown")
}

data class ModelCheck(
    val ok: Boolean,
    val format: ModelFormat,
    /** Ready to show a person. Null when [ok]. */
    val problem: String?
)

/**
 * Decides whether a file the user picked is a model this engine can load,
 * before spending minutes copying half a gigabyte to find out.
 *
 * The check is worth doing properly because the failure it prevents is the
 * worst kind: `LlmInference` rejects a file it cannot parse from inside native
 * graph construction, and the message that surfaces names neither the file nor
 * the reason. Everything below reads the first few dozen bytes and says the
 * true thing instead.
 *
 * Magic numbers here were read off real conversions from
 * [litert-community](https://huggingface.co/litert-community), not inferred
 * from documentation:
 *
 *  - `.task`     — a zip whose local file header sits at offset 0 **or 4**;
 *                  the bundles published today carry four leading zero bytes
 *                  before `PK\x03\x04`, so the signature is searched for
 *                  rather than asserted at a fixed offset.
 *  - `.litertlm` — the ASCII bytes `LITERTLM` at offset 0.
 *  - `.tflite`   — `TFL3` at offset 4, the flatbuffer file identifier.
 */
object ModelValidator {

    /** Enough for every signature below, and cheap to read off a stream. */
    const val HEADER_BYTES = 64

    /**
     * Below this a file is a partial download or a placeholder, not a model.
     * The smallest thing anyone would sensibly load here is a few hundred
     * megabytes; 50 MB is a floor low enough to never reject a real model and
     * high enough to catch a transfer that died a third of the way through.
     */
    const val MIN_SIZE_BYTES = 50L * 1024L * 1024L

    /** Extensions [ModelCatalog] will list. An import has to land on one. */
    private val ACCEPTED_EXTENSIONS = listOf(".task", ".litertlm", ".bin")

    private val ZIP_MAGIC = byteArrayOf(0x50, 0x4B, 0x03, 0x04)          // PK\x03\x04
    private val LITERTLM_MAGIC = "LITERTLM".toByteArray(Charsets.US_ASCII)
    private val TFLITE_MAGIC = "TFL3".toByteArray(Charsets.US_ASCII)
    private val GGUF_MAGIC = "GGUF".toByteArray(Charsets.US_ASCII)

    fun sniff(header: ByteArray): ModelFormat = when {
        startsWith(header, LITERTLM_MAGIC) -> ModelFormat.LITERTLM
        startsWith(header, GGUF_MAGIC) -> ModelFormat.GGUF
        // The published bundles pad the zip with four leading zero bytes, and
        // nothing guarantees that stays exactly four, so look for it.
        indexOf(header, ZIP_MAGIC, limit = 16) >= 0 -> ModelFormat.TASK
        matchesAt(header, TFLITE_MAGIC, 4) -> ModelFormat.TFLITE
        else -> ModelFormat.UNKNOWN
    }

    fun hasAcceptedExtension(displayName: String): Boolean {
        val lower = displayName.lowercase()
        return ACCEPTED_EXTENSIONS.any { lower.endsWith(it) }
    }

    /**
     * [sizeBytes] may be negative when the document provider would not say how
     * big the file is; the size rule is then skipped here and applied to the
     * bytes actually copied.
     */
    fun check(displayName: String, sizeBytes: Long, header: ByteArray): ModelCheck {
        val format = sniff(header)

        if (format == ModelFormat.GGUF) {
            return ModelCheck(
                ok = false,
                format = format,
                problem = "That's a GGUF file, which llama.cpp reads and this engine can't. " +
                    "Look for the same model as a .task or .litertlm bundle."
            )
        }

        if (!hasAcceptedExtension(displayName)) {
            return ModelCheck(
                ok = false,
                format = format,
                problem = "\"$displayName\" isn't a model bundle. Pick a .task or .litertlm file."
            )
        }

        if (sizeBytes in 0 until MIN_SIZE_BYTES) {
            return ModelCheck(
                ok = false,
                format = format,
                problem = "\"$displayName\" is only ${describeSize(sizeBytes)}. A model is at least " +
                    "several hundred MB, so this is probably an interrupted download."
            )
        }

        if (format == ModelFormat.UNKNOWN) {
            return ModelCheck(
                ok = false,
                format = format,
                problem = "\"$displayName\" has the right name but not the contents of a model " +
                    "bundle. Check the download finished and wasn't saved as a web page."
            )
        }

        return ModelCheck(ok = true, format = format, problem = null)
    }

    fun describeSize(bytes: Long): String = when {
        bytes < 0 -> "an unknown size"
        bytes >= 1073741824L -> String.format("%.1f GB", bytes / 1073741824.0)
        bytes >= 1048576L -> String.format("%.0f MB", bytes / 1048576.0)
        bytes >= 1024L -> String.format("%.0f KB", bytes / 1024.0)
        else -> "$bytes bytes"
    }

    private fun startsWith(data: ByteArray, prefix: ByteArray) = matchesAt(data, prefix, 0)

    private fun matchesAt(data: ByteArray, pattern: ByteArray, offset: Int): Boolean {
        if (offset < 0 || offset + pattern.size > data.size) return false
        for (i in pattern.indices) if (data[offset + i] != pattern[i]) return false
        return true
    }

    private fun indexOf(data: ByteArray, pattern: ByteArray, limit: Int): Int {
        val last = minOf(limit, data.size - pattern.size)
        for (start in 0..last) if (matchesAt(data, pattern, start)) return start
        return -1
    }
}
