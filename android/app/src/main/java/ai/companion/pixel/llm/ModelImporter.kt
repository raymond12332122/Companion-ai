package ai.companion.pixel.llm

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Brings a model into the app from wherever the user keeps their downloads.
 *
 * The alternative this replaces was "put the file in
 * `/sdcard/Android/data/…/files/models/` yourself", which is a fine
 * instruction for a desktop with `adb` and a poor one for a phone: since
 * Android 11 that directory is not browsable by third-party file managers, so
 * following it requires either a cable or the one stock Files app that still
 * has an escape hatch. A document picker has none of that problem — the system
 * picker can reach Downloads, an SD card, Drive, or anything else with a
 * provider, and hands back a readable stream with no storage permission of any
 * kind. `MANAGE_EXTERNAL_STORAGE` in particular is exactly the permission
 * Google rejects apps for asking about, and nothing here needs it.
 *
 * The cost is a copy: `LlmInference` opens the model by filesystem path (it
 * memory-maps it in native code) and cannot be handed a content URI, so half a
 * gigabyte has to be read through the stream and written into app storage.
 * That takes long enough to need progress reporting, cancellation, and a
 * check that the file is worth copying *before* copying it.
 */
class ModelImporter {

    interface Listener {
        fun onProgress(copiedBytes: Long, totalBytes: Long)
        fun onDone(candidate: ModelCandidate, replacedExisting: Boolean)
        fun onError(message: String, code: String)
    }

    private companion object {
        const val TAG = "CompanionLlm"
        const val BUFFER_BYTES = 1 shl 20

        /**
         * Report at most this often. A 500 MB copy through a 1 MB buffer is
         * 500 bridge crossings if every buffer reports; each one wakes the
         * WebView to redraw a progress bar that moved a fifth of a percent.
         */
        const val PROGRESS_STEP_BYTES = 8L shl 20

        /**
         * Headroom left free after the copy. Filling the last byte of internal
         * storage does not just fail the import — it breaks whatever the
         * system tries to write next.
         */
        const val FREE_SPACE_MARGIN_BYTES = 256L shl 20

        const val PART_SUFFIX = ".part"
    }

    private val worker = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "companion-llm-import").apply { isDaemon = true }
    }

    private val cancelled = AtomicBoolean(false)

    @Volatile private var running = false

    val isRunning: Boolean get() = running

    /**
     * A wildcard MIME type rather than a filter: `.task` and `.litertlm` are
     * registered with no MIME type anywhere, so a narrower filter greys them
     * out in the picker and leaves the user unable to select the file they are
     * looking straight at. The real check is [ModelValidator], on content.
     */
    fun pickIntent(): Intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "*/*"
        putExtra(Intent.EXTRA_LOCAL_ONLY, false)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }

    fun cancel() {
        if (running) cancelled.set(true)
    }

    /** Deletes an imported model. Refuses paths the app did not write. */
    fun remove(context: Context, path: String): Boolean {
        if (!ModelStore.isImported(context, path)) return false
        val file = File(path)
        val gone = !file.exists() || file.delete()
        if (gone && ModelStore.selectedPath(context) == path) ModelStore.clearSelection(context)
        return gone
    }

    fun importFrom(context: Context, uri: Uri, listener: Listener) {
        val app = context.applicationContext
        cancelled.set(false)
        running = true
        worker.execute {
            try {
                copyBlocking(app, uri, listener)
            } catch (t: Throwable) {
                Log.e(TAG, "Model import failed", t)
                listener.onError(t.message ?: "The import failed.", "io_error")
            } finally {
                running = false
            }
        }
    }

    /** Runs on [worker]. */
    private fun copyBlocking(context: Context, uri: Uri, listener: Listener) {
        val resolver = context.contentResolver
        val displayName = queryDisplayName(context, uri) ?: uri.lastPathSegment?.substringAfterLast('/')
        if (displayName.isNullOrBlank()) {
            listener.onError("Couldn't read that file's name. Try picking it from Downloads.", "unreadable")
            return
        }
        val declaredSize = querySize(context, uri)

        val target = File(ModelStore.importDir(context), safeName(displayName))
        val part = File(target.parentFile, target.name + PART_SUFFIX)

        // Re-importing the same file is a 500 MB no-op worth skipping. Same
        // name and same length is not proof of identity, but the failure mode
        // it risks — reusing a model byte-identical in all but content — is far
        // less likely than someone tapping Import twice.
        if (target.isFile && declaredSize > 0 && target.length() == declaredSize) {
            ModelStore.select(context, target.absolutePath, displayName)
            listener.onDone(describe(target), true)
            return
        }

        val stream: InputStream = try {
            resolver.openInputStream(uri)
        } catch (e: SecurityException) {
            null
        } catch (e: IOException) {
            null
        } ?: run {
            listener.onError("Couldn't open that file. Try picking it from Downloads.", "unreadable")
            return
        }

        stream.use { input ->
            // Validate on the header before committing to the copy, then write
            // those same bytes out — the stream is not rewindable, and the
            // header is part of the file.
            val header = ByteArray(ModelValidator.HEADER_BYTES)
            val headerBytes = readFully(input, header)
            if (headerBytes <= 0) {
                listener.onError("\"$displayName\" is empty.", "invalid_model")
                return
            }
            val check = ModelValidator.check(displayName, declaredSize, header.copyOf(headerBytes))
            if (!check.ok) {
                listener.onError(check.problem ?: "That file isn't a model this engine can read.", "invalid_model")
                return
            }

            val dir = target.parentFile
            if (dir != null && !dir.isDirectory && !dir.mkdirs()) {
                listener.onError("Couldn't create the app's model folder.", "io_error")
                return
            }

            if (declaredSize > 0) {
                val free = (dir ?: context.filesDir).usableSpace
                if (free < declaredSize + FREE_SPACE_MARGIN_BYTES) {
                    listener.onError(
                        "Not enough room: \"$displayName\" needs ${ModelValidator.describeSize(declaredSize)} " +
                            "and there's ${ModelValidator.describeSize(free)} free. Free up some space and try again.",
                        "no_space"
                    )
                    return
                }
            }

            part.delete()
            var copied = 0L
            var reported = 0L
            try {
                part.outputStream().use { output ->
                    output.write(header, 0, headerBytes)
                    copied += headerBytes

                    val buffer = ByteArray(BUFFER_BYTES)
                    while (true) {
                        if (cancelled.get()) {
                            part.delete()
                            listener.onError("Import cancelled.", "cancelled")
                            return
                        }
                        val read = input.read(buffer)
                        if (read < 0) break
                        output.write(buffer, 0, read)
                        copied += read
                        if (copied - reported >= PROGRESS_STEP_BYTES) {
                            reported = copied
                            listener.onProgress(copied, declaredSize)
                        }
                    }
                    output.flush()
                }
            } catch (e: IOException) {
                part.delete()
                Log.e(TAG, "Import copy failed", e)
                val message = if (e.message?.contains("space", ignoreCase = true) == true) {
                    "Ran out of storage part-way through the copy."
                } else {
                    "The copy failed part-way through: ${e.message ?: "read error"}"
                }
                listener.onError(message, "io_error")
                return
            }

            // A provider that lied about the size, or a transfer that stopped
            // early without raising, both land here rather than at load time.
            if (copied < ModelValidator.MIN_SIZE_BYTES) {
                part.delete()
                listener.onError(
                    "Only ${ModelValidator.describeSize(copied)} came through — the file didn't copy completely.",
                    "invalid_model"
                )
                return
            }

            val replaced = target.isFile
            if (replaced) target.delete()
            if (!part.renameTo(target)) {
                part.delete()
                listener.onError("Couldn't finish writing the model into app storage.", "io_error")
                return
            }

            ModelStore.select(context, target.absolutePath, displayName)
            listener.onProgress(copied, copied)
            listener.onDone(describe(target), replaced)
        }
    }

    private fun describe(file: File) = ModelCandidate(
        id = file.name,
        path = file.absolutePath,
        sizeBytes = file.length(),
        family = ChatTemplate.familyFor(file.name).id
    )

    /**
     * A display name arrives from another app and is not to be trusted with
     * path separators; `../` in it would write outside the models directory.
     */
    private fun safeName(displayName: String): String {
        val base = displayName.substringAfterLast('/').substringAfterLast('\\')
        val cleaned = base.replace(Regex("""[^A-Za-z0-9._-]"""), "_").trimStart('.')
        return if (cleaned.isBlank()) "model.task" else cleaned.take(120)
    }

    private fun queryDisplayName(context: Context, uri: Uri): String? = queryColumn(context, uri) { cursor ->
        val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (index >= 0 && !cursor.isNull(index)) cursor.getString(index) else null
    }

    private fun querySize(context: Context, uri: Uri): Long = queryColumn(context, uri) { cursor ->
        val index = cursor.getColumnIndex(OpenableColumns.SIZE)
        if (index >= 0 && !cursor.isNull(index)) cursor.getLong(index) else null
    } ?: -1L

    private fun <T> queryColumn(context: Context, uri: Uri, read: (android.database.Cursor) -> T?): T? = try {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) read(cursor) else null
        }
    } catch (t: Throwable) {
        null
    }

    /** [InputStream.read] may return short reads; the header check needs all of it. */
    private fun readFully(input: InputStream, buffer: ByteArray): Int {
        var total = 0
        while (total < buffer.size) {
            val read = input.read(buffer, total, buffer.size - total)
            if (read < 0) break
            total += read
        }
        return total
    }
}
