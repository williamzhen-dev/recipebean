export const UNICODE_FRACTIONS: Record<string, string> = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅐': '1/7',
  '⅑': '1/9',
  '⅒': '1/10',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
}

export const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  half: 0.5,
  quarter: 0.25,
  dozen: 12,
}

export interface UnitDef {
  aliases: string[]
  singular: string
  plural: string
  type: 'mass' | 'volume' | 'length' | 'count' | 'container' | 'imprecise'
  invariant: boolean
}

export const UNIT_DEFS: Record<string, UnitDef> = {
  // weight
  mg: {
    aliases: ['mg', 'milligram', 'milligrams'],
    singular: 'mg',
    plural: 'mg',
    type: 'mass',
    invariant: true,
  },
  g: {
    aliases: ['g', 'gram', 'grams', 'gramme', 'grammes'],
    singular: 'g',
    plural: 'g',
    type: 'mass',
    invariant: true,
  },
  kg: {
    aliases: ['kg', 'kilogram', 'kilograms'],
    singular: 'kg',
    plural: 'kg',
    type: 'mass',
    invariant: true,
  },
  lb: {
    aliases: ['lb', 'lbs', 'pound', 'pounds'],
    singular: 'lb',
    plural: 'lb',
    type: 'mass',
    invariant: true,
  },
  oz: {
    aliases: ['oz', 'oz.', 'ounce', 'ounces'],
    singular: 'oz',
    plural: 'oz',
    type: 'mass',
    invariant: true,
  },
  // volume
  mL: {
    aliases: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
    singular: 'mL',
    plural: 'mL',
    type: 'volume',
    invariant: true,
  },
  L: {
    aliases: ['l', 'liter', 'liters', 'litre', 'litres'],
    singular: 'L',
    plural: 'L',
    type: 'volume',
    invariant: true,
  },
  dL: {
    aliases: ['dl', 'deciliter', 'deciliters', 'decilitre', 'decilitres'],
    singular: 'dL',
    plural: 'dL',
    type: 'volume',
    invariant: true,
  },
  tsp: {
    aliases: ['tsp', 'tsp.', 'teaspoon', 'teaspoons'],
    singular: 'tsp',
    plural: 'tsp',
    type: 'volume',
    invariant: true,
  },
  tbsp: {
    aliases: ['tbsp', 'tbsp.', 'tablespoon', 'tablespoons'],
    singular: 'tbsp',
    plural: 'tbsp',
    type: 'volume',
    invariant: true,
  },
  fl_oz: {
    aliases: ['fl oz', 'fl. oz', 'fl. oz.', 'fluid ounce', 'fluid ounces'],
    singular: 'fl oz',
    plural: 'fl oz',
    type: 'volume',
    invariant: true,
  },
  cup: {
    aliases: ['c', 'cup', 'cups'],
    singular: 'cup',
    plural: 'cups',
    type: 'volume',
    invariant: false,
  },
  pint: {
    aliases: ['pt', 'pint', 'pints'],
    singular: 'pint',
    plural: 'pints',
    type: 'volume',
    invariant: false,
  },
  quart: {
    aliases: ['qt', 'quart', 'quarts'],
    singular: 'quart',
    plural: 'quarts',
    type: 'volume',
    invariant: false,
  },
  gallon: {
    aliases: ['gal', 'gallon', 'gallons'],
    singular: 'gallon',
    plural: 'gallons',
    type: 'volume',
    invariant: false,
  },
  // length
  mm: {
    aliases: ['mm', 'millimeter', 'millimeters', 'millimetre', 'millimetres'],
    singular: 'mm',
    plural: 'mm',
    type: 'length',
    invariant: true,
  },
  cm: {
    aliases: ['cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres'],
    singular: 'cm',
    plural: 'cm',
    type: 'length',
    invariant: true,
  },
  m: {
    aliases: ['m', 'meter', 'meters', 'metre', 'metres'],
    singular: 'm',
    plural: 'm',
    type: 'length',
    invariant: true,
  },
  in: {
    aliases: ['in', 'inch', 'inches'],
    singular: 'in',
    plural: 'in',
    type: 'length',
    invariant: true,
  },
  yard: {
    aliases: ['yard', 'yards'],
    singular: 'yard',
    plural: 'yards',
    type: 'length',
    invariant: false,
  },
  // count
  clove: {
    aliases: ['clove', 'cloves'],
    singular: 'clove',
    plural: 'cloves',
    type: 'count',
    invariant: false,
  },
}

export const UNIT_ALIASES = Object.entries(UNIT_DEFS)
  .flatMap(([unit, def]) => def.aliases.map(alias => ({
    unit,
    alias,
    type: def.type,
  })))
  .sort((a, b) => b.alias.length - a.alias.length)
