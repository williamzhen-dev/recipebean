import { describe, expect, it } from 'bun:test'
import { formatIngredient } from '../ingredient-parser'
import { extractRecipe } from './extract'

const SOURCE = 'https://example.com/recipes/lasagna'

// A trimmed capture of the Skinnytaste lasagna page: the JSON-LD block only,
// which is the part under test.
const FIXTURE_HTML = await Bun.file(new URL('./fixtures/skinnytaste-lasagna.html', import.meta.url)).text()

function page(jsonLd: unknown): string {
  return `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body></body></html>`
}

describe('extractRecipe', () => {
  it('returns null when the page has no structured recipe', () => {
    expect(extractRecipe('<html><body>just prose</body></html>', SOURCE)).toBeNull()
    expect(extractRecipe(page({ '@type': 'Article', 'headline': 'x' }), SOURCE)).toBeNull()
  })

  it('returns null for the stub recipe nodes on index pages', () => {
    // A category page publishes a Recipe with a name and a photo and nothing
    // else. Seeding the form from one of those looks like a bug to the cook.
    expect(extractRecipe(page({ '@type': 'Recipe', 'name': 'Lasagna', 'image': 'a.jpg' }), SOURCE)).toBeNull()
  })

  it('fills in the cook time from the total when only prep is published', () => {
    const recipe = extractRecipe(page({
      '@type': 'Recipe',
      'name': 'Stew',
      'prepTime': 'PT20M',
      'totalTime': 'PT80M',
      'recipeIngredient': ['1 onion'],
    }), SOURCE)

    expect(recipe?.prepTime).toBe(20)
    expect(recipe?.cookTime).toBe(60)
  })

  it('keeps a published cook time of zero rather than deriving one', () => {
    const recipe = extractRecipe(page({
      '@type': 'Recipe',
      'name': 'Salad',
      'prepTime': 'PT10M',
      'cookTime': 'PT0M',
      'totalTime': 'PT10M',
      'recipeIngredient': ['1 onion'],
    }), SOURCE)

    expect(recipe?.cookTime).toBe(0)
  })

  it('records where the recipe came from', () => {
    const recipe = extractRecipe(page({
      '@type': 'Recipe',
      'name': 'Stew',
      'recipeIngredient': ['1 onion'],
    }), SOURCE)

    expect(recipe?.notes).toBe(`Imported from ${SOURCE}`)
  })

  it('imports a recipe that only publishes instructions', () => {
    const recipe = extractRecipe(page({
      '@type': 'Recipe',
      'name': 'Toast',
      'recipeInstructions': 'Toast the bread.',
    }), SOURCE)

    expect(recipe?.ingredients).toEqual([])
    expect(recipe?.instructions).toHaveLength(1)
  })
})

describe('extractRecipe against a real page', () => {
  const source = 'https://www.skinnytaste.com/lasagna-recipe/'
  const recipe = extractRecipe(FIXTURE_HTML, source)

  it('reads the header fields, entities and all', () => {
    expect(recipe).not.toBeNull()
    expect(recipe!.name).toBe('Easy Lasagna Recipe (High-Protein & No-Boil)')
    expect(recipe!.prepTime).toBe(15)
    expect(recipe!.cookTime).toBe(90)
    expect(recipe!.servings).toBe(8)
    expect(recipe!.imageUrl).toBe('https://www.skinnytaste.com/wp-content/uploads/2023/09/Lasagna-12.jpg')
  })

  it('parses every ingredient into quantity, unit and product', () => {
    expect(recipe!.ingredients).toHaveLength(12)

    const mozzarella = recipe!.ingredients.find(
      row => row.type === 'ingredient' && row.product.includes('mozzarella'),
    )

    expect(mozzarella).toMatchObject({
      unit: 'cup',
      product: 'part-skim shredded mozzarella cheese',
      comments: 'divided',
    })
    expect(mozzarella).toHaveProperty('quantity.min', 1.5)
    expect(formatIngredient(mozzarella as never)).toBe('1½ cups part-skim shredded mozzarella cheese, divided')
  })

  it('keeps a nested aside in one piece', () => {
    // "(from 1 1/2 16-ounce containers, Good Culture (or use ricotta cheese))".
    // Blogs write nested brackets; a cook typing by hand does not.
    const cottage = recipe!.ingredients.find(
      row => row.type === 'ingredient' && row.product.includes('cottage cheese'),
    )

    expect(cottage).toMatchObject({
      quantity: { min: 24, max: null },
      unit: 'oz',
      product: 'part-skim cottage cheese',
      comments: 'from 1 1/2 16 ounce containers, Good Culture (or use ricotta cheese)',
    })
  })

  it('reads every instruction step', () => {
    expect(recipe!.instructions).toHaveLength(9)
    expect(recipe!.instructions[0]).toEqual({ type: 'instruction', raw: 'Preheat oven to 375F degrees.' })
    // The source writes "it&#39;s okay if they overlap".
    expect(recipe!.instructions[4]).toMatchObject({ raw: expect.stringContaining('it\'s okay if they overlap') })
  })
})
