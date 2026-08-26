import type { SQL } from 'drizzle-orm'
import { and, eq } from 'drizzle-orm'
import * as z from 'zod'
import { useDb } from '~~/server/db'
import { recipesTable } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'

const querySchema = z.object({
  favorite: z.coerce.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb(event)

  const query = await getValidatedQuery(event, querySchema.parse)

  const filters: SQL[] = []

  if (query.favorite) {
    filters.push(eq(recipesTable.isFavorite, true))
  }

  const recipes = await db.query.recipesTable.findMany({
    where: and(
      eq(recipesTable.userId, user.id),
      ...filters,
    ),
    with: { image: true },
  })

  return recipes
})
