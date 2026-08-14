package ai.companion.pixel.llm

import org.json.JSONObject

/**
 * Pulls `{"response": "...", "emotion": "..."}` out of whatever the model
 * actually produced.
 *
 * The character's prompt asks for exactly that object, and cloud providers can
 * be told to enforce it with a JSON mode. On-device there is no such switch —
 * a 1-3B model asked for JSON will usually comply, and will sometimes wrap it
 * in a code fence, prefix it with "Sure!", or ignore the instruction and just
 * answer. All four have to end up as a reply on screen rather than an error,
 * because the fallback for a parse failure here is the offline brain, and
 * dropping a perfectly good sentence for having no braces around it would be
 * a worse answer than the one that replaced it.
 */
object StructuredReply {

    data class Parsed(val response: String, val emotion: String?)

    private val MOOD_TAG = Regex("""\[\[\s*mood\s*:\s*([a-z_-]+)\s*]]""", RegexOption.IGNORE_CASE)

    fun extract(raw: String): Parsed {
        val text = stripFences(raw).trim()
        if (text.isEmpty()) return Parsed("", null)

        objectSpan(text)?.let { span ->
            try {
                val json = JSONObject(text.substring(span.first, span.second))
                val response = json.optString("response", "").trim()
                val emotion = json.optString("emotion", "").trim().ifEmpty { null }
                if (response.isNotEmpty()) return Parsed(response, emotion)
            } catch (_: Exception) {
                // Malformed or truncated JSON — fall through to the prose path
                // rather than losing the text that is sitting right there.
            }
        }

        // Legacy shape, still produced by smaller models that saw it in the
        // prompt's examples: prose with a trailing [[mood:x]] tag.
        val tag = MOOD_TAG.find(text)
        if (tag != null) {
            return Parsed(MOOD_TAG.replace(text, "").trim(), tag.groupValues[1].lowercase())
        }

        return Parsed(text, null)
    }

    /**
     * The visible part of a reply that is still arriving, for streaming into
     * the UI. Returns "" while the model is still inside the JSON scaffolding,
     * so nobody watches `{"response": "` get typed out one character at a
     * time before the actual sentence starts.
     */
    fun partialResponse(raw: String): String {
        val text = stripFences(raw)
        val trimmed = text.trimStart()
        if (trimmed.isEmpty()) return ""
        if (!trimmed.startsWith("{")) return MOOD_TAG.replace(text, "").trim()

        val key = trimmed.indexOf("\"response\"")
        if (key < 0) return ""
        // The key's own closing quote is already behind us, so the next quote
        // opens the value.
        val open = trimmed.indexOf('"', key + "\"response\"".length)
        if (open < 0) return ""

        val out = StringBuilder()
        var index = open + 1
        while (index < trimmed.length) {
            val c = trimmed[index]
            if (c == '\\') {
                val next = trimmed.getOrNull(index + 1) ?: break
                out.append(unescape(next, trimmed, index))
                index += if (next == 'u') 6 else 2
                continue
            }
            if (c == '"') break
            out.append(c)
            index++
        }
        return out.toString()
    }

    private fun unescape(marker: Char, source: String, at: Int): String = when (marker) {
        'n' -> "\n"
        't' -> "\t"
        'r' -> "\r"
        'u' -> source.substring(at + 2, minOf(at + 6, source.length))
            .takeIf { it.length == 4 }
            ?.toIntOrNull(16)
            ?.toChar()?.toString() ?: ""
        else -> marker.toString()
    }

    /** ```json … ``` fences, which instruction-tuned models add unprompted. */
    private fun stripFences(raw: String): String {
        val fence = raw.indexOf("```")
        if (fence < 0) return raw
        val afterOpen = raw.indexOf('\n', fence).takeIf { it >= 0 }?.plus(1) ?: return raw
        val close = raw.indexOf("```", afterOpen)
        return if (close < 0) raw.substring(afterOpen) else raw.substring(afterOpen, close)
    }

    /**
     * Span of the first balanced `{…}`, ignoring braces inside string literals
     * — the response text itself routinely contains them, and counting those
     * would close the object early and lose the emotion field.
     */
    private fun objectSpan(text: String): Pair<Int, Int>? {
        val start = text.indexOf('{')
        if (start < 0) return null
        var depth = 0
        var inString = false
        var escaped = false
        for (i in start until text.length) {
            val c = text[i]
            if (inString) {
                when {
                    escaped -> escaped = false
                    c == '\\' -> escaped = true
                    c == '"' -> inString = false
                }
                continue
            }
            when (c) {
                '"' -> inString = true
                '{' -> depth++
                '}' -> {
                    depth--
                    if (depth == 0) return start to (i + 1)
                }
            }
        }
        return null
    }
}
