import { useDb } from '~~/server/db'
import { filesTable } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { useMediaBucket } from '~~/server/utils/media'
import { readImageMeta } from '~~/shared/lib/image-meta'

// The client already downscales to roughly 150-400KB (app/utils/image.ts), so
// anything near this cap did not come from our own form.
const MAX_BYTES = 5 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb(event)
  const bucket = useMediaBucket(event)

  // Raw body rather than multipart: the request carries exactly one image and
  // no other fields.
  const body = await readRawBody(event, false)
  if (!body?.length)
    throw createError({ statusCode: 400, statusMessage: 'Empty request body' })

  if (body.length > MAX_BYTES)
    throw createError({ statusCode: 413, statusMessage: 'Image is larger than 5MB' })

  // Derived from the bytes, never from the Content-Type header, so a client
  // cannot make us store a mislabelled file.
  const meta = readImageMeta(new Uint8Array(body))
  if (!meta)
    throw createError({ statusCode: 415, statusMessage: 'Unsupported image type' })

  const key = `recipes/${user.id}/${crypto.randomUUID()}.${meta.extension}`

  await bucket.put(key, body, {
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
      userId: user.id,
      key,
      contentType: meta.contentType,
      size: body.length,
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
})
