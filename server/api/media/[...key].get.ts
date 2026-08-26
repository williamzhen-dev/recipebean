import * as z from 'zod'
import { useMediaBucket } from '~~/server/utils/media'

const paramsSchema = z.object({
  key: z.string().min(1),
})

/**
 * Serves an R2 object.
 *
 * This is a local-development fallback. In production `mediaBaseUrl` points at
 * the bucket's custom domain, so images come straight from Cloudflare's edge
 * and this handler never runs.
 *
 * Deliberately unauthenticated, matching the bucket's public custom domain.
 * Keys are UUIDs and therefore not guessable. To make images private, drop the
 * custom domain, unset `mediaBaseUrl`, and add `requireAuth` plus an ownership
 * check here — no component changes, because everything resolves URLs through
 * `useMediaUrl`.
 */
export default defineEventHandler(async (event) => {
  const bucket = useMediaBucket(event)

  const { key } = await getValidatedRouterParams(event, paramsSchema.parse)

  const object = await bucket.get(key)
  if (!object)
    throw createError({ statusCode: 404, statusMessage: 'File not found' })

  setResponseHeaders(event, {
    'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'cache-control': object.httpMetadata?.cacheControl ?? 'public, max-age=31536000, immutable',
    'etag': object.httpEtag,
  })

  return object.body
})
