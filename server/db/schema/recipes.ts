import type { RecipeIngredient, RecipeInstruction } from '~~/shared/schemas/recipes'
import { relations } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { filesTable } from './files'
import { recipesCategoriesTable } from './recipes-categories'
import { usersTable } from './users'

export const recipesTable = pgTable('recipes', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().references(() => usersTable.id, {
    onDelete: 'cascade',
  }).notNull(),
  name: text().notNull(),
  // Banner image. `set null` rather than cascade: losing the file should blank
  // the banner, never delete the recipe.
  imageFileId: uuid().references(() => filesTable.id, {
    onDelete: 'set null',
  }),
  description: text(),
  prepTime: integer().notNull(),
  cookTime: integer().notNull(),
  servings: integer().notNull(),
  ingredients: jsonb().$type<RecipeIngredient[]>().notNull().default([]),
  instructions: jsonb().$type<RecipeInstruction[]>().notNull().default([]),
  notes: text(),
  isFavorite: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index('recipes_user_id_idx').on(table.userId),
])

export const recipesRelations = relations(recipesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [recipesTable.userId],
    references: [usersTable.id],
  }),
  image: one(filesTable, {
    fields: [recipesTable.imageFileId],
    references: [filesTable.id],
  }),
  recipesCategories: many(recipesCategoriesTable),
}))

export type Recipe = typeof recipesTable.$inferSelect
export type NewRecipe = typeof recipesTable.$inferInsert
