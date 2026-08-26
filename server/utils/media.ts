import type { H3Event } from 'h3'

// The MEDIA binding is the recipebean-media R2 bucket. In `nuxt dev` it is a
// Miniflare emulator backed by .wrangler/state/v3/r2 on local disk, so this is
// one code path in both environments.
export function useMediaBucket(event: H3Event): R2Bucket {
  const cloudflare = event.context.cloudflare as
    | { env?: { MEDIA?: R2Bucket } }
    | undefined

  const bucket = cloudflare?.env?.MEDIA
  if (!bucket)
    throw createError({ statusCode: 500, statusMessage: 'R2 binding is not available' })

  return bucket
}
