import type { H3Event } from 'h3'
import { requireAuth } from '~~/server/utils/auth'
import { storeImage } from '~~/server/utils/media'
import { assertImportableUrl, decodeHtml, fetchCapped } from '~~/server/utils/remote'
import { readImageMeta } from '~~/shared/lib/image-meta'
import { extractRecipe } from '~~/shared/lib/recipe-import'
import { importRecipeSchema } from '~~/shared/schemas/recipes'

// The verified Skinnytaste page is 733KB, and recipe pages are heavy with ads.
// This is generous enough for the worst of them and still bounded.
const MAX_HTML_BYTES = 2 * 1024 * 1024

// The same ceiling POST /api/files applies to a cook's own upload.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const HTML_TYPES = ['text/html', 'application/xhtml+xml']

/**
 * Copies the source page's lead photo into our bucket.
 *
 * Best effort by design: a missing or hotlink-protected photo must not cost the
 * cook the recipe text, which is the part that took the work to extract.
 *
 * Note the photo is stored at its published size. `app/utils/image.ts`
 * downscales a cook's own upload in the browser, and there is no equivalent
 * here because sharp cannot run on Workers.
 */
async function importImage(event: H3Event, userId: string, imageUrl: string) {
  try {
    const url = assertImportableUrl(imageUrl)
    const { bytes } = await fetchCapped(url, {
      maxBytes: MAX_IMAGE_BYTES,
      accept: 'image/webp,image/jpeg,image/png,image/*;q=0.8',
      contentTypes: ['image/'],
    })

    // Read from the bytes, not the header, exactly as the upload route does.
    const meta = readImageMeta(bytes)
    if (!meta)
      return null

    return await storeImage(event, userId, bytes, meta)
  }
  catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Not readValidatedBody: a Zod dump is no use to someone who mistyped a link
  // into a dialog.
  const body = await readBody(event)
  const parsed = importRecipeSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Enter a valid recipe link.',
      data: { reason: 'bad-url' },
    })
  }

  const url = assertImportableUrl(parsed.data.url)

  const page = await fetchCapped(url, {
    maxBytes: MAX_HTML_BYTES,
    accept: 'text/html,application/xhtml+xml;q=0.9',
    contentTypes: HTML_TYPES,
  })

  // Extract against the URL the chain ended on, so relative image paths and the
  // attribution line both point at the real page.
  const source = page.finalUrl.toString()
  const imported = extractRecipe(decodeHtml(page.bytes, page.contentType), source)

  if (!imported || imported.name.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'We could not find a recipe on that page.',
      data: { reason: 'no-recipe' },
    })
  }

  const { imageUrl, ...recipe } = imported
  const image = imageUrl ? await importImage(event, user.id, imageUrl) : null

  return {
    ...recipe,
    imageFileId: image?.id ?? null,
    imageKey: image?.key ?? null,
  }
})
