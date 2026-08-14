package ai.companion.pixel.gemma

import org.json.JSONObject

/**
 * Pulls `{"response": "...", "emotion": "..."}` out of whatever Gemma
 * actually produced. Small instruction-tuned models comply with a JSON
 * request most of the time, wrap it in a code fence some of the time, and
 * occasionally just answer in prose — all three have to become a reply on
 * screen rather than a parse error.
 */
object GemmaReply {

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
                // Fall through to the prose path.
            }
        }

        val tag = MOOD_TAG.find(text)
        if (tag != null) {
            return Parsed(MOOD_TAG.replace(text, "").trim(), tag.groupValues[1].lowercase())
        }

        return Parsed(text, null)
    }

    /** Visible-so-far text for streaming, with JSON scaffolding stripped. */
    fun partialResponse(raw: String): String {
        val text = stripFences(raw)
        val trimmed = text.trimStart()
        if (trimmed.isEmpty()) return ""
        if (!trimmed.startsWith("{")) return MOOD_TAG.replace(text, "").trim()

        val key = trimmed.indexOf("\"response\"")
        if (key < 0) return ""
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

    private fun stripFences(raw: String): String {
        val fence = raw.indexOf("```")
        if (fence < 0) return raw
        val afterOpen = raw.indexOf('\n', fence).takeIf { it >= 0 }?.plus(1) ?: return raw
        val close = raw.indexOf("```", afterOpen)
        return if (close < 0) raw.substring(afterOpen) else raw.substring(afterOpen, close)
    }

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
