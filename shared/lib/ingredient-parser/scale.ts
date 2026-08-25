import type { Ingredient } from './schemas'

/**
 * Multiplies an ingredient's quantity by `factor`, for serving-size scaling.
 *
 * `raw` is deliberately untouched — it stays the record of what the user typed.
 * Read the result through `formatIngredient` to render it.
 *
 * An ingredient with no quantity ("salt to taste") is returned unchanged, which
 * is why no `scalable` flag is needed to protect it.
 */
export function scaleIngredient(ingredient: Ingredient, factor: number): Ingredient {
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1 || !ingredient.quantity)
    return ingredient

  const { min, max } = ingredient.quantity

  return {
    ...ingredient,
    quantity: {
      min: min * factor,
      max: max == null ? null : max * factor,
    },
  }
}
