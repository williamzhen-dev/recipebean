import { and, eq } from 'drizzle-orm'
import * as z from 'zod'
import { useDb } from '~~/server/db'
import { filesTable, recipesTable } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'

const paramsSchema = z.object({
  id: z.uuid(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb(event)

  const params = await getValidatedRouterParams(event, paramsSchema.parse)

  await db.transaction(async (tx) => {
    // Scoping the delete to the user makes a foreign id a 404 rather than a
    // silent no-op. `recipes_categories` rows go with it via cascade.
    const [recipe] = await tx
      .delete(recipesTable)
      .where(and(
        eq(recipesTable.id, params.id),
        eq(recipesTable.userId, user.id),
      ))
      .returning({ imageFileId: recipesTable.imageFileId })

    if (!recipe)
      throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })

    // Without this the banner stays `attached` forever: the sweep only looks at
    // `pending` rows, so the R2 object would leak.
    if (recipe.imageFileId) {
      await tx
        .update(filesTable)
        .set({ status: 'pending' })
        .where(and(
          eq(filesTable.id, recipe.imageFileId),
          eq(filesTable.userId, user.id),
        ))
    }
  })

  setResponseStatus(event, 204)
})
