import { describe, expect, it } from 'bun:test'
import { formatIngredient } from './format'
import { parseIngredient } from './parse'

describe('parseIngredient comments', () => {
  it('reads a single parenthesised aside', () => {
    expect(parseIngredient('1 1/2 cups mozzarella (divided)')).toMatchObject({
      product: 'mozzarella',
      unit: 'cup',
      comments: 'divided',
    })
  })

  it('keeps a nested aside in one piece', () => {
    // Recipe sites publish nested brackets; a cook typing a line by hand does
    // not. A non-nesting match used to stop at the inner ")" and leave the
    // stray bracket sitting in the product name.
    const parsed = parseIngredient('24 ounces cottage cheese (from 2 containers, Good Culture (or ricotta))')

    expect(parsed.product).toBe('cottage cheese')
    expect(parsed.comments).toBe('from 2 containers, Good Culture (or ricotta)')
    expect(formatIngredient(parsed)).toBe('24 oz cottage cheese, from 2 containers, Good Culture (or ricotta)')
  })

  it('leaves an unclosed bracket in the product rather than swallowing the line', () => {
    expect(parseIngredient('2 cups flour (sifted').product).toBe('flour (sifted')
  })

  it('joins a parenthesised aside and a trailing one', () => {
    expect(parseIngredient('3 cloves garlic (peeled), minced').comments).toBe('peeled, minced')
  })
})
