import { describe, expect, it } from 'bun:test'
import { parseDurationMinutes } from './duration'

describe('parseDurationMinutes', () => {
  it('reads ISO-8601 durations as whole minutes', () => {
    expect(parseDurationMinutes('PT15M')).toBe(15)
    expect(parseDurationMinutes('PT1H30M')).toBe(90)
    expect(parseDurationMinutes('PT90M')).toBe(90)
    expect(parseDurationMinutes('P1DT2H')).toBe(1560)
    expect(parseDurationMinutes('PT30S')).toBe(1)
    expect(parseDurationMinutes('P0D')).toBe(0)
  })

  it('ignores the months field instead of reading it as minutes', () => {
    // "P1M" is one month. Read positionally it would become one minute, which
    // is a plausible-looking cook time and therefore the worse failure.
    expect(parseDurationMinutes('P1M')).toBe(0)
    expect(parseDurationMinutes('P1MT45M')).toBe(45)
  })

  it('reads the plain-language strings sites write instead of ISO', () => {
    expect(parseDurationMinutes('1 hr 30 min')).toBe(90)
    expect(parseDurationMinutes('45 minutes')).toBe(45)
    expect(parseDurationMinutes('2 hours')).toBe(120)
    expect(parseDurationMinutes('20')).toBe(20)
  })

  it('clamps anything longer than a week', () => {
    expect(parseDurationMinutes('P30D')).toBe(60 * 24 * 7)
  })

  it('returns null when nothing is published, to keep it apart from zero', () => {
    expect(parseDurationMinutes(undefined)).toBeNull()
    expect(parseDurationMinutes('')).toBeNull()
    expect(parseDurationMinutes('a while')).toBeNull()
    expect(parseDurationMinutes(null)).toBeNull()
  })
})
