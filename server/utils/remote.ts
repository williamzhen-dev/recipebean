import type { UrlRejection } from '~~/shared/lib/recipe-import'
import { checkImportableUrl } from '~~/shared/lib/recipe-import'

/**
 * Identifies the fetcher honestly and gives site owners somewhere to complain.
 * Some sites behind a bot manager will refuse it; that is their call to make,
 * and the route turns the refusal into a message telling the cook to add the
 * recipe by hand.
 */
const USER_AGENT = 'RecipebeanBot/1.0 (+https://recipebean.app)'

const DEFAULT_TIMEOUT_MS = 8000

// Redirect chains on recipe sites are short: http→https, then a canonical
// trailing slash. Three hops covers that with room to spare.
const MAX_REDIRECTS = 3

const REJECTION_MESSAGES: Record<UrlRejection, string> = {
  invalid: 'That does not look like a web address.',
  protocol: 'Only http and https links can be imported.',
  credentials: 'Links with a username or password cannot be imported.',
  port: 'Links with a custom port cannot be imported.',
  host: 'That link points to a private address.',
}

export interface FetchCappedOptions {
  /** Hard ceiling on the response body. Enforced while reading, not from the header. */
  maxBytes: number
  /** Sent as the `Accept` header. */
  accept: string
  /** The response's content type must start with one of these. */
  contentTypes: string[]
  timeoutMs?: number
}

export interface CappedResponse {
  bytes: Uint8Array
  contentType: string
  /** Where the chain actually ended, so relative URLs resolve correctly. */
  finalUrl: URL
}

/**
 * Validates a URL for outbound fetching, or throws a 400 the cook can read.
 * The check itself lives in `shared/lib/recipe-import/url.ts` so it is unit
 * tested; this wrapper only turns a rejection into an H3 error.
 */
export function assertImportableUrl(input: string): URL {
  const checked = checkImportableUrl(input)

  if (!checked.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: REJECTION_MESSAGES[checked.reason],
      data: { reason: 'bad-url' },
    })
  }

  return checked.url
}

async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  const body = response.body
  if (!body) {
    throw createError({
      statusCode: 502,
      statusMessage: 'That site returned an empty page.',
      data: { reason: 'unreachable' },
    })
  }

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break

      total += value.byteLength
      // Checked as the bytes arrive rather than from Content-Length, which is
      // absent under chunked encoding and can simply be wrong.
      if (total > maxBytes) {
        throw createError({
          statusCode: 413,
          statusMessage: 'That page is too large to import.',
          data: { reason: 'too-large' },
        })
      }

      chunks.push(value)
    }
  }
  finally {
    await reader.cancel().catch(() => {})
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return bytes
}

/**
 * Fetches a URL on the user's behalf with every limit a worker needs: a
 * timeout, a byte cap, and redirects followed by hand.
 *
 * The manual redirect loop is the point. With `redirect: 'follow'` a public
 * URL could bounce to a private one and the guard on the first URL would have
 * bought nothing, so every hop is re-checked before it is fetched.
 */
export async function fetchCapped(target: URL, options: FetchCappedOptions): Promise<CappedResponse> {
  let url = target

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response: Response

    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        headers: {
          'user-agent': USER_AGENT,
          'accept': options.accept,
          'accept-language': 'en-US,en;q=0.9',
        },
      })
    }
    catch (error) {
      // A timeout aborts the signal; DNS, TLS and connection failures all
      // surface as TypeError. Neither is something the cook can fix.
      const timedOut = error instanceof Error
        && (error.name === 'TimeoutError' || error.name === 'AbortError')

      throw createError({
        statusCode: timedOut ? 504 : 502,
        statusMessage: timedOut
          ? 'That site took too long to respond.'
          : 'We could not reach that site.',
        data: { reason: timedOut ? 'timeout' : 'unreachable' },
      })
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        throw createError({
          statusCode: 502,
          statusMessage: 'That site returned a broken redirect.',
          data: { reason: 'unreachable' },
        })
      }

      url = assertImportableUrl(new URL(location, url).toString())
      continue
    }

    if (!response.ok) {
      // 401/403/429 mean a bot manager turned us away, which is a different
      // problem for the cook than a page that is simply not there.
      const blocked = [401, 403, 429, 503].includes(response.status)
      const missing = response.status === 404 || response.status === 410

      throw createError({
        statusCode: missing ? 404 : 502,
        statusMessage: blocked
          ? 'That site blocked the import. You can still add the recipe by hand.'
          : missing
            ? 'There is no page at that link.'
            : 'That site returned an error.',
        data: { reason: blocked ? 'blocked' : missing ? 'not-found' : 'unreachable' },
      })
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!options.contentTypes.some(type => contentType.toLowerCase().startsWith(type))) {
      throw createError({
        statusCode: 415,
        statusMessage: 'That link is not a web page.',
        data: { reason: 'unsupported' },
      })
    }

    return {
      bytes: await readCapped(response, options.maxBytes),
      contentType,
      finalUrl: url,
    }
  }

  throw createError({
    statusCode: 502,
    statusMessage: 'That link redirects too many times.',
    data: { reason: 'unreachable' },
  })
}

/**
 * Decodes a fetched page. Older food blogs still serve windows-1252, and
 * decoding those as UTF-8 turns every curly quote into a replacement character.
 */
export function decodeHtml(bytes: Uint8Array, contentType: string): string {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1]

  try {
    return new TextDecoder(charset ?? 'utf-8', { fatal: false }).decode(bytes)
  }
  catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  }
}
