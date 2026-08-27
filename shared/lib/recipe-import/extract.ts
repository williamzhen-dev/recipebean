import type { ImportedRecipe } from './types'
import { parseDurationMinutes } from './duration'
import { parseServings, pickImageUrl, toIngredientRows, toInstructionRows, toPlainText } from './fields'
import { findJsonLdBlocks } from './html'
import { findRecipeNode, parseJsonLdBlocks } from './json-ld'

/**
 * Reads a page's schema.org Recipe into the shape the recipe form holds.
 *
 * Returns null when the page carries no recipe worth importing. That includes
 * a page with a Recipe node that has neither ingredients nor instructions:
 * category and index pages publish stub nodes carrying only a name and a
 * photo, and seeding the form from one of those looks like a bug to the cook.
 */
export function extractRecipe(html: string, sourceUrl: string): ImportedRecipe | null {
  const node = findRecipeNode(parseJsonLdBlocks(findJsonLdBlocks(html)))
  if (!node)
    return null

  const ingredients = toIngredientRows(node.recipeIngredient ?? node.ingredients)
  const instructions = toInstructionRows(node.recipeInstructions)
  if (ingredients.length === 0 && instructions.length === 0)
    return null

  const prepTime = parseDurationMinutes(node.prepTime) ?? 0
  const totalTime = parseDurationMinutes(node.totalTime)
  // Many sites publish prep and total but no cook time. The rest of the clock
  // is the cooking, and showing it beats showing a zero.
  const cookTime = parseDurationMinutes(node.cookTime)
    ?? (totalTime === null ? 0 : Math.max(0, totalTime - prepTime))

  return {
    name: toPlainText(node.name ?? node.headline),
    description: toPlainText(node.description),
    prepTime,
    cookTime,
    servings: parseServings(node.recipeYield),
    ingredients,
    instructions,
    // The recipes table has no source column, so the attribution rides along in
    // the notes the cook can see and edit.
    notes: `Imported from ${sourceUrl}`,
    imageUrl: pickImageUrl(node.image, sourceUrl),
  }
}
