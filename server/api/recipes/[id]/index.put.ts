import { and, eq } from 'drizzle-orm'
import * as z from 'zod'
import { useDb } from '~~/server/db'
import { filesTable, recipesCategoriesTable, recipesTable } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { updateRecipeSchema } from '~~/shared/schemas/recipes'

const paramsSchema = z.object({
  id: z.uuid(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb(event)

  const params = await getValidatedRouterParams(event, paramsSchema.parse)

  const { categoryIds, ...recipeData } = await readValidatedBody(event, updateRecipeSchema.parse)

  await db.transaction(async (tx) => {
    // The ownership check and the previous banner come from the same read.
    const existing = await tx.query.recipesTable.findFirst({
      columns: { id: true, imageFileId: true },
      where: and(
        eq(recipesTable.id, params.id),
        eq(recipesTable.userId, user.id),
      ),
    })

    if (!existing)
      throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })

    if (recipeData.imageFileId !== existing.imageFileId) {
      // Claim the new banner the same way the create route does: scoping to the
      // current user and to `pending` stops one recipe stealing another's image.
      if (recipeData.imageFileId) {
        const [file] = await tx
          .update(filesTable)
          .set({ status: 'attached' })
          .where(and(
            eq(filesTable.id, recipeData.imageFileId),
            eq(filesTable.userId, user.id),
            eq(filesTable.status, 'pending'),
          ))
          .returning()

        if (!file)
          throw createError({ statusCode: 400, statusMessage: 'Image is not available' })
      }

      // Release the old banner back to `pending` so the nightly sweep in
      // server/plugins/cleanup-pending-files.ts drops the object and the row.
      if (existing.imageFileId) {
        await tx
          .update(filesTable)
          .set({ status: 'pending' })
          .where(and(
            eq(filesTable.id, existing.imageFileId),
            eq(filesTable.userId, user.id),
          ))
      }
    }

    await tx
      .update(recipesTable)
      .set(recipeData)
      .where(and(
        eq(recipesTable.id, params.id),
        eq(recipesTable.userId, user.id),
      ))

    // Only rewrite the join table when the client actually sent categories.
    if (categoryIds) {
      await tx.delete(recipesCategoriesTable)
        .where(eq(recipesCategoriesTable.recipeId, params.id))

      if (categoryIds.length > 0) {
        await tx.insert(recipesCategoriesTable)
          .values(categoryIds.map(categoryId => ({ recipeId: params.id, categoryId })))
      }
    }
  })

  return params.id
})
