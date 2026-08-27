import { MAX_JSON_LD_BLOCKS, NAMED_ENTITIES } from './constants'

// A `script` element's content is raw text, and per the HTML spec it cannot
// contain the literal `</script`. A non-greedy match therefore lands exactly on
// the element boundary — this is not the usual "parsing HTML with a regex"
// mistake, because nothing here is nested.
const JSON_LD_RE = /<script\s[^>]*?type\s*=\s*["']?application\/ld\+json[^>]*>([\s\S]*?)<\/script\s*>/gi

// WordPress plugins and older CMSes wrap the JSON in comment or CDATA guards
// that are left over from the XHTML era.
const BLOCK_GUARDS = [
  /^\s*<!--/,
  /-->\s*$/,
  /^\s*(?:\/\/\s*)?<!\[CDATA\[/,
  /(?:\/\/\s*)?\]\]>\s*$/,
]

const ENTITY_RE = /&(#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z\d]{1,31});/gi

// Block-level markup carries the only sentence breaks in an instruction blob,
// so it becomes a newline before the remaining tags are dropped.
const BLOCK_TAG_RE = /<\/?(?:br|p|div|li|ul|ol|h[1-6]|tr)\b[^>]*>/gi
const VOID_CONTENT_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi

export function findJsonLdBlocks(html: string): string[] {
  const blocks: string[] = []

  for (const match of html.matchAll(JSON_LD_RE)) {
    if (blocks.length >= MAX_JSON_LD_BLOCKS)
      break

    let block = match[1] ?? ''
    for (const guard of BLOCK_GUARDS) {
      block = block.replace(guard, '')
    }

    block = block.trim()
    if (block.length > 0)
      blocks.push(block)
  }

  return blocks
}

/**
 * Decodes character references in one pass. One pass is the point: replacing
 * `&amp;` first and numeric references second would turn `&amp;#39;` — which
 * recipe plugins do emit — into an apostrophe the source never wrote.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input.includes('&'))
    return input

  return input.replace(ENTITY_RE, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const isHex = entity[1] === 'x' || entity[1] === 'X'
      const code = Number.parseInt(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10)

      // Surrogates and out-of-range values would throw in fromCodePoint, and a
      // half-decoded string is worse than the literal source text.
      if (!Number.isFinite(code) || code <= 0 || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF))
        return match

      return String.fromCodePoint(code)
    }

    // Matched case-insensitively so `&AMP;` is recognised, but only an exact
    // key is substituted: `&Eacute;` and `&eacute;` are different characters.
    return NAMED_ENTITIES[entity] ?? match
  })
}

/**
 * Reduces an HTML fragment to plain text, keeping paragraph breaks as newlines
 * so a caller can still split a multi-step blob into separate steps.
 */
export function stripHtml(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(VOID_CONTENT_RE, ' ')
      .replace(BLOCK_TAG_RE, '\n')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}
