import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/db'
import { filesTable, usersTable } from '~~/server/db/schema'
import { requireAuth, useClerkApi } from '~~/server/utils/auth'
import { useMediaBucket } from '~~/server/utils/media'

// R2 accepts up to 1000 keys per delete call.
const DELETE_BATCH_SIZE = 500

/**
 * Closes the account for good: every recipe, collection and uploaded photo
 * goes with it.
 *
 * The three steps run in the order that fails safest. R2 first, because the
 * rows that name those keys are about to disappear and nothing would ever
 * collect the objects again — the nightly sweep only looks at `pending` rows.
 * Clerk second, because deleting the Clerk user fires the `user.deleted`
 * webhook, which removes the row on its own if the last step never runs.
 * The row last, which cascades to recipes, categories and file rows.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb(event)
  const bucket = useMediaBucket(event)

  const files = await db
    .select({ key: filesTable.key })
    .from(filesTable)
    .where(eq(filesTable.userId, user.id))

  for (let i = 0; i < files.length; i += DELETE_BATCH_SIZE) {
    const batch = files.slice(i, i + DELETE_BATCH_SIZE)
    await bucket.delete(batch.map(file => file.key))
  }

  await useClerkApi(event).users.deleteUser(user.clerkId)

  await db.delete(usersTable).where(eq(usersTable.id, user.id))

  setResponseStatus(event, 204)
})
