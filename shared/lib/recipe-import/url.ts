export type UrlRejection = 'invalid' | 'protocol' | 'credentials' | 'port' | 'host'

export type UrlCheck
  = | { ok: true, url: URL }
    | { ok: false, reason: UrlRejection }

// Hostnames that resolve inside a network rather than on the internet.
const PRIVATE_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa']

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

function isPrivateIpv4(a: number, b: number): boolean {
  if (a === 0 || a === 10 || a === 127)
    return true
  // 169.254/16 is link-local, and 169.254.169.254 is the cloud metadata
  // endpoint on every major provider. It is the reason this function exists.
  if (a === 169 && b === 254)
    return true
  if (a === 172 && b >= 16 && b <= 31)
    return true
  if (a === 192 && b === 168)
    return true
  // Carrier-grade NAT, and everything from multicast upward.
  if (a === 100 && b >= 64 && b <= 127)
    return true

  return a >= 224
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (host === 'localhost' || PRIVATE_SUFFIXES.some(suffix => host.endsWith(suffix)))
    return true

  const ipv4 = IPV4_RE.exec(host)
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number)
    if (octets.some(octet => octet > 255))
      return true

    return isPrivateIpv4(octets[0]!, octets[1]!)
  }

  // IPv6 literal. Only global unicast (2000::/3) is public; loopback,
  // link-local, unique-local and IPv4-mapped addresses all fall outside it.
  if (host.includes(':'))
    return !/^[23]/.test(host)

  return false
}

/**
 * Decides whether a URL is safe to fetch on the user's behalf.
 *
 * This is the server-side request forgery guard. It cannot stop DNS rebinding —
 * a public hostname whose A record points at a private address — and it does
 * not try to. On deployed Workers that case is largely closed by the runtime,
 * which egresses through Cloudflare and has no route to a metadata service or
 * to anyone's LAN. The case this guard really carries is `nuxt dev`, where the
 * same code runs on a developer's machine and can reach the local network.
 *
 * Redirects are the other hole, and the caller closes it by re-checking every
 * hop rather than letting fetch follow them.
 *
 * Pure on purpose: it lives beside the extractor so the unit tests cover it.
 */
export function checkImportableUrl(input: string): UrlCheck {
  let url: URL

  try {
    url = new URL(input.trim())
  }
  catch {
    return { ok: false, reason: 'invalid' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    return { ok: false, reason: 'protocol' }

  if (url.username.length > 0 || url.password.length > 0)
    return { ok: false, reason: 'credentials' }

  // URL blanks the port when it is the default for the scheme, so anything
  // left here is a non-standard port — the shape a port scan takes.
  if (url.port.length > 0)
    return { ok: false, reason: 'port' }

  if (isPrivateHost(url.hostname))
    return { ok: false, reason: 'host' }

  return { ok: true, url }
}
