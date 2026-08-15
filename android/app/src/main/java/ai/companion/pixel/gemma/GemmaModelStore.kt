package ai.companion.pixel.gemma

import android.content.Context
import android.content.SharedPreferences
import java.io.File
import java.security.MessageDigest

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

    // TEMP DEBUG — SHA-256 of the imported model file, for the real-device
    // diagnostic report. Cached in-memory, keyed by (path, length,
    // lastModified) so a re-import (which overwrites the same fixed path)
    // invalidates it automatically without needing an explicit cache-clear
    // call site. Hashing 500+ MB takes real time — this is deliberately
    // never called from a hot path like isAvailable(); only from an
    // explicit diagnostics request.
    @Volatile private var cachedSha256: Triple<String, Long, Long>? = null // path, length, lastModified
    @Volatile private var cachedSha256Value: String? = null

    fun sha256(context: Context): String? {
        val file = modelFile(context)
        if (!file.isFile) return null
        val key = Triple(file.absolutePath, file.length(), file.lastModified())
        if (cachedSha256 == key) return cachedSha256Value

        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(1 shl 20)
            while (true) {
                val read = input.read(buffer)
                if (read < 0) break
                digest.update(buffer, 0, read)
            }
        }
        val hex = digest.digest().joinToString("") { "%02x".format(it) }
        cachedSha256 = key
        cachedSha256Value = hex
        return hex
    }
}
