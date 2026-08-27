import type { Serialize } from 'nitropack/types'
import type { filesTable, recipesTable } from '~~/server/db/schema'
import * as z from 'zod'
import { ingredientSchema } from '~~/shared/lib/ingredient-parser'

const headerSchema = z.object({
  type: z.literal('header'),
  title: z.string(),
})

const ingredientTypeSchema = z.object({
  type: z.literal('ingredient'),
  ...ingredientSchema.shape,
})

const instructionSchema = z.object({
  type: z.literal('instruction'),
  raw: z.string(),
})

const recipeIngredientSchema = z.discriminatedUnion('type', [
  headerSchema,
  ingredientTypeSchema,
])

const recipeInstructionSchema = z.discriminatedUnion('type', [
  headerSchema,
  instructionSchema,
])

export const createRecipeSchema = z.object({
  name: z.string().min(1, { error: 'Required' }),
  imageFileId: z.uuid().nullable(),
  description: z.string(),
  prepTime: z.int().nonnegative(),
  cookTime: z.int().nonnegative(),
  servings: z.int().positive(),
  ingredients: z.array(recipeIngredientSchema),
  instructions: z.array(recipeInstructionSchema),
  notes: z.string(),
  categoryIds: z.array(z.string()),
})

// An update replaces the whole recipe body, so it takes the same shape as a
// create. `categoryIds` is optional because the form has no category picker
// yet: omitting it must leave the existing join rows alone, not wipe them.
export const updateRecipeSchema = createRecipeSchema.extend({
  categoryIds: z.array(z.string()).optional(),
})

export const toggleFavoriteSchema = z.object({
  isFavorite: z.boolean(),
})

// Request body of POST /api/import/recipe.
export const importRecipeSchema = z.object({
  url: z.url({ error: 'Enter a recipe link.' }).max(2048),
})

// The value the recipe form holds and submits, shared by the create and edit pages.
export type RecipeInput = z.infer<typeof createRecipeSchema>
// Response body of POST /api/import/recipe. It seeds the form and nothing
// else: `categoryIds` is left off because there is no category picker, and
// `imageKey` rides along so the page can show the banner it just stored.
export type ImportedRecipeResponse = Omit<RecipeInput, 'categoryIds'> & {
  imageKey: string | null
}
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>
export type RecipeInstruction = z.infer<typeof recipeInstructionSchema>
// The recipe GET routes join the banner image, so the serialized shape carries
// the file row alongside the recipe columns.
export type SerializedRecipe = Serialize<
  typeof recipesTable.$inferSelect & { image: typeof filesTable.$inferSelect | null }
>
