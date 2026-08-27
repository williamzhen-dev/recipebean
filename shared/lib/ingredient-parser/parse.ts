import type { Ingredient, Quantity } from './schemas'
import { NUMBER_WORDS, UNIT_ALIASES } from './constants'
import { escapeRegExp, normalizeInput } from './utils'

function matchQuantity(input: string): {
  matched: string
  value: number
} | null {
  input = input.trimStart()

  // mixed fraction
  const mixedFractionMatch = input.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)/)
  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1])
    const numerator = Number(mixedFractionMatch[2])
    const denominator = Number(mixedFractionMatch[3])
    if (denominator !== 0) {
      return {
        matched: mixedFractionMatch[0],
        value: whole + numerator / denominator,
      }
    }
  }

  // simple fraction
  const fractionMatch = input.match(/^(\d+)\/(\d+)/)
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1])
    const denominator = Number(fractionMatch[2])
    if (denominator !== 0) {
      return {
        matched: fractionMatch[0],
        value: numerator / denominator,
      }
    }
  }

  // real number
  const numberMatch = input.match(/^\d+(?:\.\d+)?/)
  if (numberMatch) {
    return {
      matched: numberMatch[0],
      value: Number(numberMatch[0]),
    }
  }

  // number words
  const numberWordMatch = input.match(/^[a-z]+/i)
  if (numberWordMatch) {
    const word = numberWordMatch[0].toLowerCase()
    const value = NUMBER_WORDS[word]
    if (value !== undefined) {
      return {
        matched: numberWordMatch[0],
        value,
      }
    }
  }

  return null
}

function parseQuantity(input: string): {
  input: string
  quantity: Quantity
} | null {
  const minMatch = matchQuantity(input)

  if (!minMatch) {
    return null
  }

  input = input.slice(minMatch.matched.length).trimStart()

  const rangeMatch = input.match(/^(?:-|to)\s*/i)
  if (rangeMatch) {
    input = input.slice(rangeMatch[0].length).trimStart()
    const maxMatch = matchQuantity(input)

    if (maxMatch) {
      input = input.slice(maxMatch.matched.length).trimStart()

      return {
        input,
        quantity: {
          min: minMatch.value,
          max: maxMatch.value,
        },
      }
    }
  }

  return {
    input,
    quantity: {
      min: minMatch.value,
      max: null,
    },
  }
}

function aliasToRegex(alias: string): string {
  return escapeRegExp(alias).replace(/\s+/g, '\\s+')
}

function parseUnit(input: string): {
  input: string
  unit: string
} | null {
  for (const entry of UNIT_ALIASES) {
    const re = new RegExp(`^${aliasToRegex(entry.alias)}\\.? (?=\\s|$|\\)|,)`.replace(' ', ''), 'i')

    const match = input.match(re)
    if (match) {
      return {
        input: input.slice(match[0].length).trimStart(),
        unit: entry.unit,
      }
    }
  }

  return null
}

function removeLeadingOf(input: string): string {
  return input.trimStart().replace(/^of\s+/i, '').trimStart()
}

/**
 * Splits out parenthesised asides, counting depth as it goes.
 *
 * Depth matters because a flat `\\([^)]*\\)` stops at the first closing bracket
 * and leaves a stray one behind. Nobody types "(from 2 containers, Good Culture
 * (or ricotta))" by hand, but recipe sites publish it, so an imported line hits
 * this where a typed one never did.
 */
function extractParenComments(input: string): { rest: string, comments: string[] } {
  const comments: string[] = []
  let rest = ''
  let buffer = ''
  let depth = 0

  for (const char of input) {
    if (char === '(') {
      if (depth > 0) {
        buffer += char
      }
      depth++
      continue
    }

    if (char === ')' && depth > 0) {
      depth--
      if (depth > 0) {
        buffer += char
        continue
      }

      const comment = buffer.trim()
      if (comment) {
        comments.push(comment)
      }
      buffer = ''
      rest += ' '
      continue
    }

    if (depth > 0) {
      buffer += char
    }
    else {
      rest += char
    }
  }

  // An unclosed bracket is a typo, not an aside. Put the text back in the
  // product rather than swallowing the rest of the line into a comment.
  if (depth > 0) {
    rest += `(${buffer}`
  }

  return { rest, comments }
}

function parseProductAndComments(input: string): {
  product: string
  comments: string | null
} {
  const { rest, comments: parenComments } = extractParenComments(input)

  input = rest
    .replace(/\s+/g, ' ')
    .trim()

  let product = input
  let commaComment: string | null = null

  const commaIdx = input.indexOf(',')
  if (commaIdx !== -1) {
    product = input.slice(0, commaIdx).trim()
    const rest = input.slice(commaIdx + 1).trim()
    commaComment = rest || null
  }

  const comments = [...parenComments, ...(commaComment ? [commaComment] : [])]
    .join(', ') || null

  return { product, comments }
}

export function parseIngredient(raw: string): Ingredient {
  let input = normalizeInput(raw)

  const parsed: Ingredient = {
    raw,
    product: '',
    quantity: null,
    unit: null,
    comments: null,
    scalable: false,
  }

  const qty = parseQuantity(input)
  if (qty) {
    input = qty.input
    parsed.quantity = qty.quantity

    const unit = parseUnit(input)
    if (unit) {
      input = unit.input
      parsed.unit = unit.unit
    }
  }

  input = removeLeadingOf(input)

  const { product, comments } = parseProductAndComments(input)
  parsed.product = product
  parsed.comments = comments

  return parsed
}
