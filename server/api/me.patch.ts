import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/db'
import { usersTable } from '~~/server/db/schema'
import { requireAuth, useClerkApi } from '~~/server/utils/auth'
import { updateAccountSchema } from '~~/shared/schemas/account'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, updateAccountSchema.parse)

  // The name lives in Clerk, the avatar in our row, so this write cannot be
  // atomic. Clerk goes first because it is the half that can be rejected from
  // outside; the row update below is a single column and does not fail on its
  // own. The reverse order would leave a saved avatar next to an unsaved name.
  await useClerkApi(event).users.updateUser(user.clerkId, {
    firstName: body.firstName,
    lastName: body.lastName,
  })

  const db = useDb(event)
  await db
    .update(usersTable)
    .set({ pfpId: body.pfpId })
    .where(eq(usersTable.id, user.id))

  // Same shape as GET /api/me, so the cached entry can be replaced with this.
  return { pfpId: body.pfpId }
})
