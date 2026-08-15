package ai.companion.pixel.llm

import android.content.Context
import java.io.File

/**
 * Remembers which model the user chose, across restarts.
 *
 * The file itself surviving is not the interesting part — it sits in the app's
 * own directory and [ModelCatalog] finds it on every launch regardless. What
 * needs remembering is the *choice*: with two models on the device, the
 * catalog's "largest wins" guess is a reasonable default and a bad override of
 * someone who explicitly picked the smaller one.
 *
 * A selection that no longer resolves to a file is dropped rather than
 * reported. The file can vanish for ordinary reasons — cleared app storage,
 * a removal from another install — and a stale pointer should degrade to the
 * default choice, not to an error.
 */
object ModelStore {

    private const val PREFS = "companion_llm"
    private const val KEY_SELECTED_PATH = "selected_model_path"
    private const val KEY_IMPORTED_FROM = "imported_source_name"
    private const val KEY_IMPORTED_AT = "imported_at"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** The chosen model's path, or null if none was chosen or it is gone. */
    fun selectedPath(context: Context): String? {
        val path = prefs(context).getString(KEY_SELECTED_PATH, null) ?: return null
        if (!File(path).isFile) {
            prefs(context).edit().remove(KEY_SELECTED_PATH).apply()
            return null
        }
        return path
    }

    fun select(context: Context, path: String, sourceName: String? = null) {
        val editor = prefs(context).edit().putString(KEY_SELECTED_PATH, path)
        if (sourceName != null) {
            editor.putString(KEY_IMPORTED_FROM, sourceName)
            editor.putLong(KEY_IMPORTED_AT, System.currentTimeMillis())
        }
        editor.apply()
    }

    fun clearSelection(context: Context) {
        prefs(context).edit().remove(KEY_SELECTED_PATH).apply()
    }

    /** What the file was called where the user picked it up, if it was imported. */
    fun importedSourceName(context: Context): String? =
        prefs(context).getString(KEY_IMPORTED_FROM, null)

    fun importedAt(context: Context): Long = prefs(context).getLong(KEY_IMPORTED_AT, 0L)

    /**
     * Where imported models are written: the app's own internal storage, which
     * needs no permission to write, is invisible to other apps, and goes away
     * cleanly when the app is uninstalled instead of leaving half a gigabyte
     * behind on shared storage.
     */
    fun importDir(context: Context): File =
        File(context.applicationContext.filesDir, ModelCatalog.MODELS_DIR)

    /** True when this path is one the app wrote and may therefore delete. */
    fun isImported(context: Context, path: String): Boolean {
        val app = context.applicationContext
        val file = File(path).absoluteFile
        val owned = listOfNotNull(
            importDir(app),
            app.getExternalFilesDir(null)?.let { File(it, ModelCatalog.MODELS_DIR) }
        )
        return owned.any { dir -> file.parentFile?.absoluteFile == dir.absoluteFile }
    }
}
