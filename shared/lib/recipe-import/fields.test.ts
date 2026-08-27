import { describe, expect, it } from 'bun:test'
import { parseServings, pickImageUrl, toIngredientRows, toInstructionRows, toPlainText } from './fields'

describe('toPlainText', () => {
  it('flattens the shapes schema.org allows for a text field', () => {
    expect(toPlainText('a &amp; b')).toBe('a & b')
    expect(toPlainText(['', 'second'])).toBe('second')
    expect(toPlainText({ '@value': 'wrapped' })).toBe('wrapped')
    expect(toPlainText({ text: 'from text' })).toBe('from text')
    expect(toPlainText(undefined)).toBe('')
  })
})

describe('parseServings', () => {
  it('reads the yield shapes sites publish', () => {
    expect(parseServings(['8', '8 servings'])).toBe(8)
    expect(parseServings('Makes 12 cookies')).toBe(12)
    expect(parseServings(6)).toBe(6)
    expect(parseServings('4-6')).toBe(4)
  })

  it('never returns zero, which the recipe schema would reject', () => {
    expect(parseServings('0')).toBe(1)
    expect(parseServings('one loaf')).toBe(1)
    expect(parseServings(undefined)).toBe(1)
  })
})

describe('toIngredientRows', () => {
  it('runs each line through the ingredient parser', () => {
    const rows = toIngredientRows(['1 1/2 cups shredded mozzarella (divided)'])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      type: 'ingredient',
      product: 'shredded mozzarella',
      unit: 'cup',
      comments: 'divided',
    })
    expect(rows[0]).toHaveProperty('quantity.min', 1.5)
  })

  it('turns a group heading into a header row', () => {
    // schema.org has no ingredient groups, so sites write them as list items.
    const rows = toIngredientRows(['For the sauce:', '1 onion'])

    expect(rows[0]).toEqual({ type: 'header', title: 'For the sauce' })
    expect(rows[1]?.type).toBe('ingredient')
  })

  it('skips empty entries', () => {
    expect(toIngredientRows(['', '   ', null])).toEqual([])
  })
})

describe('toInstructionRows', () => {
  it('splits one blob of text into a step per line', () => {
    const rows = toInstructionRows('<p>Chop.</p><p>Fry.</p>')

    expect(rows).toEqual([
      { type: 'instruction', raw: 'Chop.' },
      { type: 'instruction', raw: 'Fry.' },
    ])
  })

  it('reads an array of plain strings', () => {
    expect(toInstructionRows(['Chop.', 'Fry.'])).toHaveLength(2)
  })

  it('prefers the text of a HowToStep over its truncated name', () => {
    const rows = toInstructionRows([{ '@type': 'HowToStep', 'name': 'Chop', 'text': 'Chop the onion finely.' }])

    expect(rows[0]).toEqual({ type: 'instruction', raw: 'Chop the onion finely.' })
  })

  it('turns a HowToSection into a header followed by its steps', () => {
    const rows = toInstructionRows([
      {
        '@type': 'HowToSection',
        'name': 'For the sauce',
        'itemListElement': [
          { '@type': 'HowToStep', 'text': 'Simmer.' },
        ],
      },
      { '@type': 'HowToStep', 'text': 'Assemble.' },
    ])

    expect(rows).toEqual([
      { type: 'header', title: 'For the sauce' },
      { type: 'instruction', raw: 'Simmer.' },
      { type: 'instruction', raw: 'Assemble.' },
    ])
  })

  it('decodes entities in step text', () => {
    const rows = toInstructionRows([{ '@type': 'HowToStep', 'text': 'it&#39;s fine' }])

    expect(rows[0]).toEqual({ type: 'instruction', raw: 'it\'s fine' })
  })
})

describe('pickImageUrl', () => {
  const base = 'https://example.com/recipes/lasagna'

  it('takes the first usable URL from any of the published shapes', () => {
    expect(pickImageUrl('https://cdn.example.com/a.jpg', base)).toBe('https://cdn.example.com/a.jpg')
    expect(pickImageUrl(['https://cdn.example.com/a.jpg', 'b.jpg'], base)).toBe('https://cdn.example.com/a.jpg')
    expect(pickImageUrl({ '@type': 'ImageObject', 'url': 'https://cdn.example.com/a.jpg' }, base)).toBe('https://cdn.example.com/a.jpg')
  })

  it('resolves a relative path against the source page', () => {
    expect(pickImageUrl('/img/a.jpg', base)).toBe('https://example.com/img/a.jpg')
  })

  it('skips entries that are not http URLs', () => {
    expect(pickImageUrl(['data:image/png;base64,AAAA', 'https://cdn.example.com/a.jpg'], base))
      .toBe('https://cdn.example.com/a.jpg')
    expect(pickImageUrl([], base)).toBeNull()
  })
})
