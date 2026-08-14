package ai.companion.pixel.llm

import android.content.Context
import java.io.File

data class ModelCandidate(
    val id: String,
    val path: String,
    val sizeBytes: Long,
    val family: String
)

/**
 * Finds model files on the device.
 *
 * No model ships inside the APK and none is downloaded automatically. A 2 GB
 * asset would blow past every distribution limit worth respecting, and
 * fetching one silently on first run spends someone's mobile data without
 * asking. So the model is something the user puts on the device, and this
 * class's whole job is noticing that they did.
 *
 * The primary location is the app's own external files directory, because it
 * is the one place writable from a host machine without granting the app any
 * storage permission at all:
 *
 *   adb push gemma3-1b-it-int4.task \
 *     /sdcard/Android/data/ai.companion.pixel/files/models/
 *
 * A file manager can drop one in the same folder. Internal storage is checked
 * too, for builds that want the model unreachable from outside the app.
 */
object ModelCatalog {

    /**
     * MediaPipe's LLM Inference API reads its own bundle formats: `.task` (the
     * long-standing one) and `.litertlm` (what current LiteRT-LM conversions
     * emit). `.bin` is accepted because some older Gemma exports use it.
     * Plain GGUF is deliberately absent — this engine cannot read it, and
     * listing it would turn "wrong file format" into a confusing native crash
     * at load time instead of an honest "no model found" at startup.
     */
    private val EXTENSIONS = listOf(".task", ".litertlm", ".bin")

    /**
     * Anything smaller than this is a partial download, a placeholder, or
     * somebody's notes with a .task extension — not a language model. Loading
     * it would fail deep inside native code with an unhelpful message, so it
     * is filtered out here where the reason can still be explained.
     */
    private const val MIN_PLAUSIBLE_SIZE_BYTES = 50L * 1024L * 1024L

    const val MODELS_DIR = "models"

    fun searchRoots(context: Context): List<File> {
        val roots = ArrayList<File>()
        context.getExternalFilesDir(null)?.let {
            roots.add(File(it, MODELS_DIR))
            roots.add(it)
        }
        roots.add(File(context.filesDir, MODELS_DIR))
        roots.add(context.filesDir)
        return roots
    }

    /**
     * Every usable model file, best first. "Best" is: known bundle extension
     * over `.bin`, then largest — between two real models the bigger one is
     * the more capable, and someone who put two on the device and picked
     * neither explicitly most likely wants the better one.
     */
    fun list(context: Context): List<ModelCandidate> {
        val seen = HashSet<String>()
        val found = ArrayList<ModelCandidate>()

        for (root in searchRoots(context)) {
            val files = root.takeIf { it.isDirectory }?.listFiles() ?: continue
            for (file in files) {
                if (!file.isFile) continue
                val name = file.name.lowercase()
                if (EXTENSIONS.none { name.endsWith(it) }) continue
                if (file.length() < MIN_PLAUSIBLE_SIZE_BYTES) continue
                if (!seen.add(file.absolutePath)) continue
                found.add(
                    ModelCandidate(
                        id = file.name,
                        path = file.absolutePath,
                        sizeBytes = file.length(),
                        family = ChatTemplate.familyFor(file.name).id
                    )
                )
            }
        }

        return found.sortedWith(
            compareBy<ModelCandidate> { candidate ->
                val name = candidate.id.lowercase()
                EXTENSIONS.indexOfFirst { name.endsWith(it) }.takeIf { it >= 0 } ?: EXTENSIONS.size
            }.thenByDescending { it.sizeBytes }
        )
    }

    fun best(context: Context): ModelCandidate? = list(context).firstOrNull()

    /** Where to tell the user to put a model, when none was found. */
    fun preferredDropDir(context: Context): String {
        val external = context.getExternalFilesDir(null)
        return if (external != null) File(external, MODELS_DIR).absolutePath
        else File(context.filesDir, MODELS_DIR).absolutePath
    }
}
