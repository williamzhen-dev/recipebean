import { and, eq, inArray, lt } from 'drizzle-orm'
import { createDb } from '~~/server/db'
import { filesTable } from '~~/server/db/schema'

const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000

// R2 accepts up to 1000 keys per delete call. Capping the batch also bounds how
// long a single scheduled invocation runs; leftovers go on the next night.
const BATCH_SIZE = 500

interface ScheduledEnv {
  HYPERDRIVE?: { connectionString: string }
  MEDIA?: R2Bucket
}

/**
 * Deletes abandoned uploads.
 *
 * A banner image is uploaded as soon as the user picks it, before the recipe
 * row exists. If they never save, the row stays `pending` forever. This sweeps
 * anything still `pending` after 7 days.
 *
 * Runs from the `triggers.crons` entry in wrangler.jsonc. Nitro's
 * cloudflare_module preset turns the Worker's `scheduled()` handler into this
 * hook, which gets no H3 event — hence `createDb` rather than `useDb`.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled', async ({ env }) => {
    const { HYPERDRIVE, MEDIA } = env as ScheduledEnv

    if (!HYPERDRIVE?.connectionString || !MEDIA) {
      console.error('[cleanup-pending-files] missing HYPERDRIVE or MEDIA binding')
      return
    }

    const { db, close } = createDb(HYPERDRIVE.connectionString)

    try {
      const expired = await db
        .select({ id: filesTable.id, key: filesTable.key })
        .from(filesTable)
        .where(and(
          eq(filesTable.status, 'pending'),
          lt(filesTable.createdAt, new Date(Date.now() - PENDING_TTL_MS)),
        ))
        .limit(BATCH_SIZE)

      if (expired.length === 0)
        return

      // R2 first: if this throws, the rows survive and the next run retries.
      // The reverse order would leak objects with nothing left pointing at them.
      await MEDIA.delete(expired.map(file => file.key))

      await db.delete(filesTable).where(inArray(filesTable.id, expired.map(file => file.id)))

      console.warn(`[cleanup-pending-files] removed ${expired.length} abandoned upload(s)`)
    }
    catch (error) {
      console.error('[cleanup-pending-files] sweep failed', error)
    }
    finally {
      // No request lifecycle here, so the pool must be closed by hand.
      await close()
    }
  })
})
