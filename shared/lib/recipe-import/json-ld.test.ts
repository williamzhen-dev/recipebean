import { describe, expect, it } from 'bun:test'
import { findRecipeNode, hasType, parseJsonLdBlocks } from './json-ld'

describe('parseJsonLdBlocks', () => {
  it('keeps the good blocks when a neighbour is malformed', () => {
    // Sites ship a template-mangled block next to a valid one all the time, and
    // the valid one is usually the recipe.
    expect(parseJsonLdBlocks(['{"a":1,}', '{"b":2}'])).toEqual([{ b: 2 }])
  })
})

describe('hasType', () => {
  it('matches a string, an array and a full IRI', () => {
    expect(hasType({ '@type': 'Recipe' }, 'Recipe')).toBe(true)
    expect(hasType({ '@type': ['Recipe', 'NewsArticle'] }, 'Recipe')).toBe(true)
    expect(hasType({ '@type': 'http://schema.org/Recipe' }, 'Recipe')).toBe(true)
    expect(hasType({ '@type': 'recipe' }, 'Recipe')).toBe(true)
  })

  it('does not match a different type', () => {
    expect(hasType({ '@type': 'Article' }, 'Recipe')).toBe(false)
    expect(hasType({}, 'Recipe')).toBe(false)
    expect(hasType(null, 'Recipe')).toBe(false)
  })
})

describe('findRecipeNode', () => {
  it('finds a bare recipe object', () => {
    expect(findRecipeNode([{ '@type': 'Recipe', 'name': 'A' }])?.name).toBe('A')
  })

  it('finds a recipe in a top-level array', () => {
    expect(findRecipeNode([[{ '@type': 'Article' }, { '@type': 'Recipe', 'name': 'A' }]])?.name).toBe('A')
  })

  it('finds a recipe inside @graph', () => {
    const doc = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage' }, { '@type': 'Recipe', 'name': 'A' }] }

    expect(findRecipeNode([doc])?.name).toBe('A')
  })

  it('finds a recipe under mainEntity', () => {
    expect(findRecipeNode([{ '@type': 'WebPage', 'mainEntity': { '@type': 'Recipe', 'name': 'A' } }])?.name).toBe('A')
  })

  it('prefers the shallower recipe, which describes the page itself', () => {
    const doc = {
      '@graph': [
        { '@type': 'Recipe', 'name': 'page recipe' },
        { '@type': 'WebPage', 'mainEntity': { '@type': 'Recipe', 'name': 'related recipe' } },
      ],
    }

    expect(findRecipeNode([doc])?.name).toBe('page recipe')
  })

  it('returns null when the page has no recipe', () => {
    expect(findRecipeNode([{ '@type': 'Article' }])).toBeNull()
    expect(findRecipeNode([])).toBeNull()
  })
})
