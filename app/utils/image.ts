export interface ProcessedImage {
  blob: Blob
  width: number
  height: number
}

// Long edge of the stored image. A recipe banner renders at 400px wide on the
// form and full-bleed on the detail page, so 1600 covers 2x displays with room
// to spare.
const MAX_EDGE = 1600

// Rejected before decoding. A 12MP phone photo is roughly 4MB, so this only
// stops pathological input.
const MAX_INPUT_BYTES = 15 * 1024 * 1024

const QUALITY = 0.82

export class ImageProcessingError extends Error {}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, QUALITY))
}

/**
 * Downscales and re-encodes an image in the browser.
 *
 * Resizing has to happen client-side: `sharp` is a native module and cannot run
 * on Cloudflare Workers. Doing it here also cuts the upload by roughly 10x and
 * yields the dimensions for free.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/'))
    throw new ImageProcessingError('That file is not an image.')

  if (file.size > MAX_INPUT_BYTES)
    throw new ImageProcessingError('That image is larger than 15MB.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  }
  catch {
    throw new ImageProcessingError('That image could not be read.')
  }

  try {
    // Never upscale: a small source stays at its original size.
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context)
      throw new ImageProcessingError('That image could not be processed.')

    context.drawImage(bitmap, 0, 0, width, height)

    // Safari only gained canvas WebP encoding in 16; older versions return null
    // rather than throwing, so fall back to JPEG.
    const blob = await toBlob(canvas, 'image/webp') ?? await toBlob(canvas, 'image/jpeg')
    if (!blob)
      throw new ImageProcessingError('That image could not be encoded.')

    return { blob, width, height }
  }
  finally {
    bitmap.close()
  }
}
