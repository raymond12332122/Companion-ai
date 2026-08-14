package ai.companion.pixel.llm

/**
 * Turns `{system, messages}` into the single prompt string the LLM Inference
 * API takes.
 *
 * The API has no notion of roles — it accepts text and continues it. Every
 * instruction-tuned model was fine-tuned on one specific arrangement of turn
 * markers, and feeding it a different one costs a surprising amount of
 * quality: the model stops recognising where its own turn begins and starts
 * writing the user's next line, or answers as if the system prompt were part
 * of the conversation. So the markers have to match the model actually
 * loaded, and the only thing available to infer that from is the filename.
 *
 * [Family.PLAIN] exists because inference from a filename is a guess. Newer
 * `.litertlm` bundles can carry their own prompt template and apply it inside
 * the runtime, in which case adding markers here would double them up. When a
 * model answers strangely, forcing `plain` is the first thing to try.
 */
object ChatTemplate {

    enum class Family(
        val id: String,
        /** Emitted verbatim after the last turn to hand the floor to the model. */
        val stops: List<String>
    ) {
        GEMMA("gemma", listOf("<end_of_turn>", "<start_of_turn>")),
        LLAMA3("llama3", listOf("<|eot_id|>", "<|end_of_text|>", "<|start_header_id|>")),
        PHI3("phi3", listOf("<|end|>", "<|user|>", "<|system|>")),
        CHATML("chatml", listOf("<|im_end|>", "<|im_start|>")),
        PLAIN("plain", listOf("\nUser:", "\nuser:"));

        companion object {
            fun byId(id: String?): Family? =
                id?.lowercase()?.let { wanted -> entries.firstOrNull { it.id == wanted } }
        }
    }

    /**
     * Filename → family. Ordering matters: "llama" is checked before the
     * generic ChatML fallbacks because several Llama derivatives carry both
     * names, and the Llama-3 markers are the ones those files were tuned on.
     */
    fun familyFor(fileName: String): Family {
        val name = fileName.lowercase()
        return when {
            name.contains("gemma") -> Family.GEMMA
            name.contains("llama") -> Family.LLAMA3
            name.contains("phi") -> Family.PHI3
            name.contains("qwen") || name.contains("chatml") -> Family.CHATML
            name.contains("stablelm") || name.contains("tinyllama") -> Family.CHATML
            else -> Family.PLAIN
        }
    }

    fun format(family: Family, system: String, messages: List<ChatMessage>): String = when (family) {
        Family.GEMMA -> gemma(system, messages)
        Family.LLAMA3 -> llama3(system, messages)
        Family.PHI3 -> phi3(system, messages)
        Family.CHATML -> chatml(system, messages)
        Family.PLAIN -> plain(system, messages)
    }

    private fun isAssistant(role: String) = role == "assistant" || role == "model" || role == "bot"

    /**
     * Gemma has no system role at all. The convention its instruction tuning
     * used is to fold the system text into the first user turn, which is what
     * this does — dropping it instead would throw away the character's entire
     * identity, personality and memory.
     */
    private fun gemma(system: String, messages: List<ChatMessage>): String {
        val out = StringBuilder()
        var systemPending = system.isNotBlank()
        for (message in messages) {
            if (isAssistant(message.role)) {
                out.append("<start_of_turn>model\n").append(message.content).append("<end_of_turn>\n")
            } else {
                out.append("<start_of_turn>user\n")
                if (systemPending) {
                    out.append(system).append("\n\n")
                    systemPending = false
                }
                out.append(message.content).append("<end_of_turn>\n")
            }
        }
        if (systemPending) {
            out.append("<start_of_turn>user\n").append(system).append("<end_of_turn>\n")
        }
        out.append("<start_of_turn>model\n")
        return out.toString()
    }

    /**
     * No `<|begin_of_text|>`: MediaPipe's tokenizer adds the BOS token itself,
     * and a second one shifts every position the model was trained to expect.
     */
    private fun llama3(system: String, messages: List<ChatMessage>): String {
        val out = StringBuilder()
        if (system.isNotBlank()) {
            out.append("<|start_header_id|>system<|end_header_id|>\n\n")
                .append(system).append("<|eot_id|>")
        }
        for (message in messages) {
            val role = if (isAssistant(message.role)) "assistant" else "user"
            out.append("<|start_header_id|>").append(role).append("<|end_header_id|>\n\n")
                .append(message.content).append("<|eot_id|>")
        }
        out.append("<|start_header_id|>assistant<|end_header_id|>\n\n")
        return out.toString()
    }

    private fun phi3(system: String, messages: List<ChatMessage>): String {
        val out = StringBuilder()
        if (system.isNotBlank()) out.append("<|system|>\n").append(system).append("<|end|>\n")
        for (message in messages) {
            val role = if (isAssistant(message.role)) "assistant" else "user"
            out.append("<|").append(role).append("|>\n").append(message.content).append("<|end|>\n")
        }
        out.append("<|assistant|>\n")
        return out.toString()
    }

    private fun chatml(system: String, messages: List<ChatMessage>): String {
        val out = StringBuilder()
        if (system.isNotBlank()) {
            out.append("<|im_start|>system\n").append(system).append("<|im_end|>\n")
        }
        for (message in messages) {
            val role = if (isAssistant(message.role)) "assistant" else "user"
            out.append("<|im_start|>").append(role).append("\n")
                .append(message.content).append("<|im_end|>\n")
        }
        out.append("<|im_start|>assistant\n")
        return out.toString()
    }

    /** Markerless: for bundles that apply their own template inside the runtime. */
    private fun plain(system: String, messages: List<ChatMessage>): String {
        val out = StringBuilder()
        if (system.isNotBlank()) out.append(system).append("\n\n")
        for (message in messages) {
            val label = if (isAssistant(message.role)) "Assistant" else "User"
            out.append(label).append(": ").append(message.content).append("\n")
        }
        out.append("Assistant: ")
        return out.toString()
    }

    /**
     * The API exposes no stop-sequence setting, so a model that keeps going
     * past its own end-of-turn marker — and writes the user's next line, and
     * answers it — has to be cut here instead. Trimming the first marker seen
     * is what a runtime-level stop sequence would have done anyway.
     */
    fun trimAtStop(text: String, family: Family): String {
        var cut = text.length
        for (stop in family.stops) {
            val index = text.indexOf(stop)
            if (index in 0 until cut) cut = index
        }
        return text.substring(0, cut)
    }
}
