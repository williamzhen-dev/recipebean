import { MAX_MINUTES } from './constants'

// ISO-8601, as schema.org specifies: "PT15M", "PT1H30M", "P1DT2H".
// The `M` before `T` is months. It is captured only so the pattern still
// matches, and then ignored — no recipe takes months, so reading it as minutes
// would turn a publisher's typo into a nonsense cook time.
const ISO_DURATION_RE = /^P(?:\d+(?:\.\d+)?Y)?(?:\d+(?:\.\d+)?M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i

// The plain-language strings sites emit when their plugin does not enforce
// ISO: "1 hr 30 min", "90 minutes", "45".
const HOURS_RE = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i
const MINUTES_RE = /(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/i

function toNumber(value: string | undefined): number {
  if (value === undefined)
    return 0

  const parsed = Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : 0
}

function clamp(minutes: number): number | null {
  if (!Number.isFinite(minutes) || minutes < 0)
    return null

  return Math.min(Math.round(minutes), MAX_MINUTES)
}

/**
 * Reads a schema.org duration as whole minutes. Returns null when the value
 * carries no usable duration, so a caller can tell "zero minutes" apart from
 * "not published".
 */
export function parseDurationMinutes(value: unknown): number | null {
  if (typeof value === 'number')
    return clamp(value)

  if (Array.isArray(value))
    return value.length > 0 ? parseDurationMinutes(value[0]) : null

  if (typeof value !== 'string')
    return null

  const input = value.trim()
  if (input.length === 0)
    return null

  const iso = ISO_DURATION_RE.exec(input)
  if (iso) {
    const [, weeks, days, hours, minutes, seconds] = iso

    return clamp(
      toNumber(weeks) * 10080
      + toNumber(days) * 1440
      + toNumber(hours) * 60
      + toNumber(minutes)
      + toNumber(seconds) / 60,
    )
  }

  const hours = HOURS_RE.exec(input)
  const minutes = MINUTES_RE.exec(input)
  if (hours || minutes)
    return clamp(toNumber(hours?.[1]) * 60 + toNumber(minutes?.[1]))

  // A bare number is minutes, which is how sites that skip ISO write it.
  if (/^\d+(?:\.\d+)?$/.test(input))
    return clamp(Number.parseFloat(input))

  return null
}
