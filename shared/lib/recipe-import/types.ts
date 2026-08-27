import type { Ingredient } from '../ingredient-parser'

/**
 * The row shapes are declared here rather than imported from
 * `shared/schemas/recipes.ts` so this module depends on nothing but its sibling
 * parser. They are structurally identical to `RecipeIngredient` and
 * `RecipeInstruction`, so the route assigns the result straight into the form's
 * value without a cast.
 */
export interface ImportedHeader {
  type: 'header'
  title: string
}

export type ImportedIngredient = { type: 'ingredient' } & Ingredient

export interface ImportedInstruction {
  type: 'instruction'
  raw: string
}

export interface ImportedRecipe {
  name: string
  description: string
  prepTime: number
  cookTime: number
  servings: number
  ingredients: (ImportedHeader | ImportedIngredient)[]
  instructions: (ImportedHeader | ImportedInstruction)[]
  notes: string
  /** Absolute URL of the source page's lead photo, for the route to store. */
  imageUrl: string | null
}
