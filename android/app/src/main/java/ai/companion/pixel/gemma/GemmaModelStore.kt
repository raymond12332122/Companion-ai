package ai.companion.pixel.gemma

import android.content.Context
import android.content.SharedPreferences
import java.io.File

/**
 * Where the imported Gemma `.task` file lives, and the little bit of metadata
 * about it that isn't recoverable from the file itself (the name the user
 * picked it under).
 *
 * Deliberately a single fixed slot rather than a catalog: this provider
 * exists to run one model, the one the user imports, not to manage a
 * library. That keeps the whole surface — storage, picking, loading — small
 * enough to reason about independently of [ai.companion.pixel.llm], which
 * this package shares no code with on purpose.
 */
object GemmaModelStore {
    private const val PREFS = "companion_gemma_store"
    private const val KEY_DISPLAY_NAME = "display_name"

    /** Minimum plausible size for a real model bundle, not a truncated one. */
    const val MIN_SIZE_BYTES = 20L * 1024 * 1024

    private fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun dir(context: Context): File =
        File(context.applicationContext.filesDir, "gemma").apply { mkdirs() }

    /** Fixed path the model always lands at, overwritten on re-import. */
    fun modelFile(context: Context): File = File(dir(context), "model.task")

    fun partFile(context: Context): File = File(dir(context), "model.task.part")

    fun exists(context: Context): Boolean = modelFile(context).isFile

    fun displayName(context: Context): String? =
        prefs(context).getString(KEY_DISPLAY_NAME, null)

    fun remember(context: Context, displayName: String) {
        prefs(context).edit().putString(KEY_DISPLAY_NAME, displayName).apply()
    }

    fun forget(context: Context) {
        prefs(context).edit().remove(KEY_DISPLAY_NAME).apply()
    }

    fun delete(context: Context): Boolean {
        val file = modelFile(context)
        val gone = !file.exists() || file.delete()
        if (gone) forget(context)
        return gone
    }
}
