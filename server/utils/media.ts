import type { H3Event } from 'h3'
import type { ImageMeta } from '~~/shared/lib/image-meta'
import { useDb } from '../db'
import { filesTable } from '../db/schema'

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

/**
 * Puts already-validated image bytes in R2 and records the file row.
 *
 * The row is created `pending`: it belongs to nobody until a recipe claims it.
 * `POST /api/recipes` flips it to `attached` inside its transaction, and the
 * nightly sweep in server/plugins/cleanup-pending-files.ts collects it if the
 * cook walks away from the form.
 *
 * Shared by the upload route and the link importer, which differ only in where
 * the bytes came from.
 */
export async function storeImage(
  event: H3Event,
  userId: string,
  bytes: Uint8Array,
  meta: ImageMeta,
) {
  const bucket = useMediaBucket(event)
  const db = useDb(event)

  const key = `recipes/${userId}/${crypto.randomUUID()}.${meta.extension}`

  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: meta.contentType,
      // Keys are unique per upload and objects are never rewritten, so the
      // bucket's custom domain can cache them forever.
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })

  const [file] = await db
    .insert(filesTable)
    .values({
      userId,
      key,
      contentType: meta.contentType,
      size: bytes.byteLength,
      width: meta.width,
      height: meta.height,
    })
    .returning()

  return {
    id: file!.id,
    key: file!.key,
    width: file!.width,
    height: file!.height,
  }
}
