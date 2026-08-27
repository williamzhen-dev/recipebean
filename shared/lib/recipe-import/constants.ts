/**
 * Budgets for walking untrusted JSON. Every page we import comes from a
 * stranger's server, so each traversal and each field has a ceiling — a hostile
 * or merely broken document must not be able to spend the worker's whole CPU
 * slice or memory.
 */
export const MAX_JSON_LD_BLOCKS = 32
export const MAX_GRAPH_NODES = 2000
export const MAX_GRAPH_DEPTH = 8
export const MAX_INGREDIENTS = 250
export const MAX_INSTRUCTIONS = 250
export const MAX_FIELD_CHARS = 4000

/**
 * A week. Longer than this is bad data — a mis-read `P1M` (one month), not a
 * recipe — and the form's number inputs should not have to render it.
 */
export const MAX_MINUTES = 60 * 24 * 7

/**
 * `createRecipeSchema.servings` is a positive int, so extraction must never
 * hand back 0. The upper bound catches yields like "makes 2000 cookies".
 */
export const MIN_SERVINGS = 1
export const MAX_SERVINGS = 1000

/**
 * The named entities that actually turn up in recipe JSON-LD. The full HTML5
 * table is 2000+ entries and is not worth the bundle size on a worker;
 * anything missing is left as literal text rather than mangled.
 */
export const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  minus: '−',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  sbquo: '‚',
  bdquo: '„',
  bull: '•',
  middot: '·',
  times: '×',
  divide: '÷',
  deg: '°',
  frac12: '½',
  frac13: '⅓',
  frac14: '¼',
  frac15: '⅕',
  frac16: '⅙',
  frac18: '⅛',
  frac23: '⅔',
  frac25: '⅖',
  frac34: '¾',
  frac35: '⅗',
  frac38: '⅜',
  frac45: '⅘',
  frac56: '⅚',
  frac58: '⅝',
  frac78: '⅞',
  aacute: 'á',
  agrave: 'à',
  acirc: 'â',
  auml: 'ä',
  aring: 'å',
  ccedil: 'ç',
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  euml: 'ë',
  iacute: 'í',
  icirc: 'î',
  ntilde: 'ñ',
  oacute: 'ó',
  ocirc: 'ô',
  ouml: 'ö',
  uacute: 'ú',
  uuml: 'ü',
  szlig: 'ß',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  pound: '£',
}
