import { MAX_GRAPH_DEPTH, MAX_GRAPH_NODES } from './constants'

export type JsonLdNode = Record<string, unknown>

export function isNode(value: unknown): value is JsonLdNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asArray(value: unknown): unknown[] {
  if (value == null)
    return []

  return Array.isArray(value) ? value : [value]
}

/**
 * Parses each block on its own. Sites routinely ship one malformed block — a
 * template that emitted a trailing comma, an unescaped newline — next to a
 * perfectly good one, and the good one is usually the recipe.
 */
export function parseJsonLdBlocks(blocks: string[]): unknown[] {
  const documents: unknown[] = []

  for (const block of blocks) {
    try {
      documents.push(JSON.parse(block))
    }
    catch {
      // Skip it. A broken neighbour must not hide a valid recipe.
    }
  }

  return documents
}

/**
 * True when `@type` names the wanted type. Handles the three shapes seen in the
 * wild: a bare string, an array (`["Recipe", "NewsArticle"]`), and a full IRI
 * (`http://schema.org/Recipe`).
 */
export function hasType(value: unknown, wanted: string): boolean {
  if (!isNode(value))
    return false

  const target = wanted.toLowerCase()

  return asArray(value['@type']).some((entry) => {
    if (typeof entry !== 'string')
      return false

    const name = entry.split(/[/#]/).pop() ?? ''

    return name.toLowerCase() === target
  })
}

/**
 * Breadth-first search for the Recipe node across every parsed document.
 *
 * Breadth-first rather than depth-first on purpose: a page that carries both a
 * top-level `@graph` Recipe and a nested one (a "related recipes" card, say)
 * means the shallow node, which describes the page itself.
 */
export function findRecipeNode(documents: unknown[]): JsonLdNode | null {
  const queue: { value: unknown, depth: number }[] = documents.map(value => ({ value, depth: 0 }))
  let visits = 0

  while (queue.length > 0) {
    const { value, depth } = queue.shift()!

    if (++visits > MAX_GRAPH_NODES || depth > MAX_GRAPH_DEPTH)
      break

    if (Array.isArray(value)) {
      for (const item of value) {
        queue.push({ value: item, depth: depth + 1 })
      }
      continue
    }

    if (!isNode(value))
      continue

    if (hasType(value, 'Recipe'))
      return value

    // Only the containers that legitimately wrap a Recipe. Walking every value
    // would drag in review bodies and nutrition blocks for nothing.
    for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item'] as const) {
      if (value[key] != null)
        queue.push({ value: value[key], depth: depth + 1 })
    }
  }

  return null
}
