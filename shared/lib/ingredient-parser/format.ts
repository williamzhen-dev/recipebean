import type { Ingredient } from './schemas'
import { UNICODE_FRACTIONS, UNIT_DEFS } from './constants'

const ASCII_TO_UNICODE: Record<string, string> = Object.fromEntries(
  Object.entries(UNICODE_FRACTIONS).map(([symbol, ascii]) => [ascii, symbol]),
)

/**
 * Denominators a cook can actually measure. Searching every denominator up to 16
 * turns a scaled 2.1 into "2⅒" and 0.9 into "9/10"; anything outside this set
 * reads better as a decimal.
 */
const KITCHEN_DENOMINATORS = [2, 3, 4, 6, 8]

/** Snap to a fraction only when the value is genuinely close to one. */
const FRACTION_TOLERANCE = 1e-3

const EPSILON = 1e-6

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a || 1
}

function toFraction(fractional: number): { numerator: number, denominator: number } | null {
  let bestNum = 1
  let bestDen = 1
  let bestError = Number.POSITIVE_INFINITY

  for (const den of KITCHEN_DENOMINATORS) {
    const num = Math.round(fractional * den)
    if (num === 0 || num === den)
      continue
    const error = Math.abs(fractional - num / den)
    if (error < bestError - EPSILON || (Math.abs(error - bestError) < EPSILON && den < bestDen)) {
      bestError = error
      bestNum = num
      bestDen = den
    }
  }

  if (bestError > FRACTION_TOLERANCE)
    return null

  const divisor = gcd(bestNum, bestDen)
  return {
    numerator: bestNum / divisor,
    denominator: bestDen / divisor,
  }
}

function formatQuantityValue(n: number): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)

  if (Number.isInteger(abs) || Math.abs(abs - Math.round(abs)) < EPSILON) {
    return `${sign}${Math.round(abs)}`
  }

  const whole = Math.floor(abs)
  const fractional = abs - whole
  const fraction = toFraction(fractional)

  if (!fraction) {
    const rounded = Math.round(abs * 10) / 10
    // A tiny amount must not round away to nothing.
    if (rounded === 0)
      return `${sign}${Number(abs.toPrecision(2))}`
    return `${sign}${rounded}`
  }

  const ascii = `${fraction.numerator}/${fraction.denominator}`
  const unicode = ASCII_TO_UNICODE[ascii]

  if (whole === 0) {
    return `${sign}${unicode ?? ascii}`
  }

  if (unicode) {
    return `${sign}${whole}${unicode}`
  }

  return `${sign}${whole} ${ascii}`
}

/**
 * Renders a stored unit key for display. The parser stores the UNIT_DEFS key
 * (`fl_oz`, `cup`), which is not what a cook should read.
 */
export function formatUnit(unit: string, count: number): string {
  const def = UNIT_DEFS[unit]

  if (!def)
    return unit.replace(/_/g, ' ')

  if (def.invariant)
    return def.singular

  // A fraction of a unit stays singular: "¾ cup", not "¾ cups".
  return Math.abs(count) <= 1 ? def.singular : def.plural
}

export function formatIngredient(ingredient: Ingredient): string {
  const parts: string[] = []

  if (ingredient.quantity) {
    const { min, max } = ingredient.quantity
    const qty
      = max != null
        ? `${formatQuantityValue(min)}-${formatQuantityValue(max)}`
        : formatQuantityValue(min)
    parts.push(qty)
  }

  if (ingredient.unit) {
    // A range pluralises off its upper bound: "1-2 cups". With no quantity at
    // all the count is unknown, so fall back to the plural.
    const count = ingredient.quantity
      ? ingredient.quantity.max ?? ingredient.quantity.min
      : 0
    parts.push(formatUnit(ingredient.unit, count))
  }

  if (ingredient.product)
    parts.push(ingredient.product)

  let result = parts.join(' ')

  if (ingredient.comments)
    result += `, ${ingredient.comments}`

  return result
}
