import { and, eq } from 'drizzle-orm'
import { useDb } from '~~/server/db'
import { filesTable, recipesCategoriesTable, recipesTable } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { createRecipeSchema } from '~~/shared/schemas/recipes'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb(event)

  const { categoryIds, ...recipeData } = await readValidatedBody(event, createRecipeSchema.parse)

  const recipeId = await db.transaction(async (tx) => {
    // The banner was uploaded before this recipe existed, so it is still
    // `pending`. Claim it here: scoping to the current user and to `pending`
    // stops one recipe from stealing another's image.
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

    const [recipe] = await tx
      .insert(recipesTable)
      .values({ userId: user.id, ...recipeData })
      .returning()

    if (categoryIds.length > 0) {
      await tx.insert(recipesCategoriesTable)
        .values(categoryIds.map(categoryId => ({ recipeId: recipe!.id, categoryId })))
    }

    return recipe!.id
  })

  return recipeId
})
