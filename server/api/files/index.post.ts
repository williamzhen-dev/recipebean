import { requireAuth } from '~~/server/utils/auth'
import { storeImage } from '~~/server/utils/media'
import { readImageMeta } from '~~/shared/lib/image-meta'

// The client already downscales to roughly 150-400KB (app/utils/image.ts), so
// anything near this cap did not come from our own form.
const MAX_BYTES = 5 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Raw body rather than multipart: the request carries exactly one image and
  // no other fields.
  const body = await readRawBody(event, false)
  if (!body?.length)
    throw createError({ statusCode: 400, statusMessage: 'Empty request body' })

  if (body.length > MAX_BYTES)
    throw createError({ statusCode: 413, statusMessage: 'Image is larger than 5MB' })

  // Derived from the bytes, never from the Content-Type header, so a client
  // cannot make us store a mislabelled file.
  const bytes = new Uint8Array(body)
  const meta = readImageMeta(bytes)
  if (!meta)
    throw createError({ statusCode: 415, statusMessage: 'Unsupported image type' })

  return await storeImage(event, user.id, bytes, meta)
})
