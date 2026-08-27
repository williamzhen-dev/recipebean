import { describe, expect, it } from 'bun:test'
import { checkImportableUrl } from './url'

function reason(input: string) {
  const checked = checkImportableUrl(input)

  return checked.ok ? 'ok' : checked.reason
}

describe('checkImportableUrl', () => {
  it('accepts ordinary public recipe links', () => {
    expect(reason('https://www.skinnytaste.com/lasagna-recipe/')).toBe('ok')
    expect(reason('http://example.com/recipe')).toBe('ok')
    expect(reason('https://example.com:443/recipe')).toBe('ok')
  })

  it('rejects loopback, private and link-local addresses', () => {
    expect(reason('http://127.0.0.1/')).toBe('host')
    expect(reason('http://localhost/')).toBe('host')
    expect(reason('http://10.0.0.5/')).toBe('host')
    expect(reason('http://172.16.0.1/')).toBe('host')
    expect(reason('http://192.168.1.1/')).toBe('host')
    expect(reason('http://[::1]/')).toBe('host')
    expect(reason('http://printer.local/')).toBe('host')
  })

  it('rejects the cloud metadata endpoint', () => {
    expect(reason('http://169.254.169.254/latest/meta-data/')).toBe('host')
  })

  it('rejects non-http schemes, embedded credentials and custom ports', () => {
    expect(reason('file:///etc/passwd')).toBe('protocol')
    expect(reason('ftp://example.com/x')).toBe('protocol')
    expect(reason('https://user:pass@example.com/')).toBe('credentials')
    expect(reason('https://example.com:8080/')).toBe('port')
  })

  it('rejects anything that is not a URL', () => {
    expect(reason('not a url')).toBe('invalid')
    expect(reason('')).toBe('invalid')
  })

  it('still allows public IPv6 literals', () => {
    expect(reason('https://[2606:4700::1111]/recipe')).toBe('ok')
  })
})
