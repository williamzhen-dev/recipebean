import type { RecipeIngredient, RecipeInput, RecipeInstruction, SerializedRecipe } from '~~/shared/schemas/recipes'
import { formatIngredient, scaleIngredient } from '~~/shared/lib/ingredient-parser'

export function withInstructionSteps(instructions: RecipeInstruction[]) {
  let step = 0
  return instructions.map((instruction, index) =>
    instruction.type === 'header'
      ? { instruction, step: null as number | null, index }
      : { instruction, step: ++step, index },
  )
}

/**
 * Scales every ingredient quantity by `factor` and renders it for display.
 * Headers carry no text of their own — read `ingredient.title` for those.
 */
export function withScaledIngredients(ingredients: RecipeIngredient[], factor: number) {
  return ingredients.map((ingredient, index) =>
    ingredient.type === 'header'
      ? { ingredient, text: null as string | null, index }
      : { ingredient, text: formatIngredient(scaleIngredient(ingredient, factor)), index },
  )
}

/**
 * Maps a saved recipe onto the form's value shape. The nullable text columns
 * become empty strings because the form schema requires strings, and the
 * arrays are cloned so editing the form never mutates the fetched payload.
 * `categoryIds` is left off: there is no category picker, and omitting it tells
 * the update route to leave the existing join rows untouched.
 */
export function toRecipeInput(recipe: SerializedRecipe): Omit<RecipeInput, 'categoryIds'> {
  return {
    name: recipe.name,
    imageFileId: recipe.imageFileId,
    description: recipe.description ?? '',
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    ingredients: structuredClone(toRaw(recipe.ingredients)),
    instructions: structuredClone(toRaw(recipe.instructions)),
    notes: recipe.notes ?? '',
  }
}
