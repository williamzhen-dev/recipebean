import type { ImportedHeader, ImportedIngredient, ImportedInstruction } from './types'
import { parseIngredient } from '../ingredient-parser'
import {
  MAX_FIELD_CHARS,
  MAX_INGREDIENTS,
  MAX_INSTRUCTIONS,
  MAX_SERVINGS,
  MIN_SERVINGS,
} from './constants'
import { stripHtml } from './html'
import { asArray, hasType, isNode } from './json-ld'

/**
 * Flattens any of the shapes schema.org allows for a text field into plain
 * text. Every string in this module funnels through here, so tag stripping and
 * entity decoding happen in exactly one place.
 */
export function toPlainText(value: unknown): string {
  if (typeof value === 'string')
    return stripHtml(value).slice(0, MAX_FIELD_CHARS)

  if (typeof value === 'number' && Number.isFinite(value))
    return String(value)

  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = toPlainText(entry)
      if (text.length > 0)
        return text
    }

    return ''
  }

  if (isNode(value))
    return toPlainText(value['@value'] ?? value.text ?? value.name)

  return ''
}

/**
 * `recipeYield` is the least disciplined field in the vocabulary: a number, a
 * string, "8 servings", "Makes 4-6", or an array holding several of those.
 * Take the first integer found, because a range's lower bound is the safer
 * default when the cook is about to scale it anyway.
 */
export function parseServings(value: unknown): number {
  for (const entry of asArray(value)) {
    const text = toPlainText(entry)
    const match = /\d+/.exec(text)
    if (!match)
      continue

    const parsed = Number.parseInt(match[0], 10)
    if (Number.isFinite(parsed) && parsed >= MIN_SERVINGS)
      return Math.min(parsed, MAX_SERVINGS)
  }

  return MIN_SERVINGS
}

// schema.org has no concept of an ingredient group, so sites smuggle groups
// into the flat list as a heading line. This app has a first-class header row,
// so recognise the shape: a trailing colon and no digits anywhere.
function isIngredientHeading(text: string): boolean {
  return text.endsWith(':') && !/\d/.test(text)
}

export function toIngredientRows(value: unknown): (ImportedHeader | ImportedIngredient)[] {
  const rows: (ImportedHeader | ImportedIngredient)[] = []

  for (const entry of asArray(value)) {
    if (rows.length >= MAX_INGREDIENTS)
      break

    const text = toPlainText(entry)
    if (text.length === 0)
      continue

    if (isIngredientHeading(text)) {
      rows.push({ type: 'header', title: text.slice(0, -1).trim() })
      continue
    }

    rows.push({ type: 'ingredient', ...parseIngredient(text) })
  }

  return rows
}

function pushSteps(text: string, rows: (ImportedHeader | ImportedInstruction)[]): void {
  // `stripHtml` keeps block-level breaks as newlines, so a single blob of
  // markup still splits into the steps its author wrote.
  for (const line of text.split('\n')) {
    if (rows.length >= MAX_INSTRUCTIONS)
      return

    const step = line.trim()
    if (step.length > 0)
      rows.push({ type: 'instruction', raw: step })
  }
}

/**
 * Walks `recipeInstructions`, which may be one string, an array of strings, an
 * array of HowToStep, or HowToSection groups holding those. A HowToSection maps
 * straight onto this app's header row, so grouped recipes keep their structure.
 */
export function toInstructionRows(value: unknown, depth = 0): (ImportedHeader | ImportedInstruction)[] {
  const rows: (ImportedHeader | ImportedInstruction)[] = []
  if (depth > 3)
    return rows

  for (const entry of asArray(value)) {
    if (rows.length >= MAX_INSTRUCTIONS)
      break

    if (typeof entry === 'string') {
      pushSteps(toPlainText(entry), rows)
      continue
    }

    if (!isNode(entry))
      continue

    if (hasType(entry, 'HowToSection')) {
      const title = toPlainText(entry.name)
      if (title.length > 0)
        rows.push({ type: 'header', title })

      rows.push(...toInstructionRows(entry.itemListElement ?? entry.steps, depth + 1))
      continue
    }

    // An ItemList groups steps without naming them, so it contributes no header.
    if (hasType(entry, 'ItemList')) {
      rows.push(...toInstructionRows(entry.itemListElement, depth + 1))
      continue
    }

    // `name` on a HowToStep is usually a truncated copy of `text`, so prefer
    // `text` and fall back only when it is missing.
    pushSteps(toPlainText(entry.text) || toPlainText(entry.name), rows)
  }

  return rows.slice(0, MAX_INSTRUCTIONS)
}

/**
 * Picks the lead photo. `image` may be a URL, an ImageObject, or an array of
 * either — publishers list crops of the same shot, largest first.
 */
export function pickImageUrl(value: unknown, baseUrl: string): string | null {
  for (const entry of asArray(value)) {
    const candidate = typeof entry === 'string'
      ? entry
      : isNode(entry)
        ? toPlainText(entry.url ?? entry.contentUrl)
        : ''

    if (candidate.length === 0)
      continue

    try {
      const resolved = new URL(candidate, baseUrl)
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:')
        return resolved.toString()
    }
    catch {
      // Not a URL. Try the next entry.
    }
  }

  return null
}
