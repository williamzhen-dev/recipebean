import type { RecipeIngredient, RecipeInstruction } from '~~/shared/schemas/recipes'
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
