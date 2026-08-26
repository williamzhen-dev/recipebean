export interface ImageMeta {
  contentType: string
  extension: string
  width: number
  height: number
}

// Formats the upload endpoint accepts. WebP is what the browser encodes to in
// app/utils/image.ts; JPEG and PNG are kept for clients whose canvas cannot
// produce WebP.
const JPEG = { contentType: 'image/jpeg', extension: 'jpg' }
const PNG = { contentType: 'image/png', extension: 'png' }
const WEBP = { contentType: 'image/webp', extension: 'webp' }

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length)
    return false

  return signature.every((byte, index) => bytes[offset + index] === byte)
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16)
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8)
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16) | (bytes[offset + 3]! << 24)) >>> 0
}

// PNG: 8-byte signature, then an IHDR chunk whose first 8 data bytes are the
// width and height as big-endian uint32s.
function readPngMeta(bytes: Uint8Array): ImageMeta | null {
  if (!startsWith(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
    return null

  // 8 signature + 4 length + 4 type "IHDR" = data starts at 16.
  if (bytes.length < 24 || !startsWith(bytes, [0x49, 0x48, 0x44, 0x52], 12))
    return null

  return { ...PNG, width: readUint32BE(bytes, 16), height: readUint32BE(bytes, 20) }
}

// JPEG: walk the marker segments until a Start Of Frame, whose payload carries
// height then width as big-endian uint16s after a one-byte sample precision.
function readJpegMeta(bytes: Uint8Array): ImageMeta | null {
  if (!startsWith(bytes, [0xFF, 0xD8, 0xFF]))
    return null

  let offset = 2

  while (offset + 9 < bytes.length) {
    // Markers are 0xFF followed by a non-0xFF, non-zero id; 0xFF is also used
    // as padding between segments, so skip any run of it.
    if (bytes[offset] !== 0xFF) {
      offset += 1
      continue
    }

    const marker = bytes[offset + 1]!

    if (marker === 0xFF) {
      offset += 1
      continue
    }

    // SOF0-SOF15, excluding DHT (0xC4), JPG (0xC8) and DAC (0xCC), which share
    // the range but are not frame headers.
    const isStartOfFrame = marker >= 0xC0 && marker <= 0xCF
      && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC

    if (isStartOfFrame) {
      return {
        ...JPEG,
        height: readUint16BE(bytes, offset + 5),
        width: readUint16BE(bytes, offset + 7),
      }
    }

    // Standalone markers carry no length field.
    if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) {
      offset += 2
      continue
    }

    const segmentLength = readUint16BE(bytes, offset + 2)
    if (segmentLength < 2)
      return null

    offset += 2 + segmentLength
  }

  return null
}

// WebP: "RIFF" + file size + "WEBP", then one of three chunk layouts.
function readWebpMeta(bytes: Uint8Array): ImageMeta | null {
  if (!startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) || !startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return null

  // Lossy ("VP8 "): 3-byte frame tag, the 0x9D012A start code, then 16-bit
  // little-endian width and height whose top 2 bits are an upscale factor.
  if (startsWith(bytes, [0x56, 0x50, 0x38, 0x20], 12) && bytes.length >= 30) {
    if (!startsWith(bytes, [0x9D, 0x01, 0x2A], 23))
      return null

    return {
      ...WEBP,
      width: readUint16LE(bytes, 26) & 0x3FFF,
      height: readUint16LE(bytes, 28) & 0x3FFF,
    }
  }

  // Lossless ("VP8L"): a 0x2F signature, then 4 little-endian bytes holding
  // width-1 in bits 0-13 and height-1 in bits 14-27.
  if (startsWith(bytes, [0x56, 0x50, 0x38, 0x4C], 12) && bytes.length >= 25 && bytes[20] === 0x2F) {
    const packed = readUint32LE(bytes, 21)

    return {
      ...WEBP,
      width: (packed & 0x3FFF) + 1,
      height: ((packed >>> 14) & 0x3FFF) + 1,
    }
  }

  // Extended ("VP8X"): 4 flag bytes, then 24-bit little-endian canvas
  // dimensions minus one.
  if (startsWith(bytes, [0x56, 0x50, 0x38, 0x58], 12) && bytes.length >= 30) {
    return {
      ...WEBP,
      width: readUint24LE(bytes, 24) + 1,
      height: readUint24LE(bytes, 27) + 1,
    }
  }

  return null
}

/**
 * Identifies an image from its header bytes.
 *
 * The upload endpoint uses this instead of the request's Content-Type so that
 * the stored type and dimensions never come from a client claim. Returns null
 * for anything that is not a JPEG, PNG or WebP with a readable header.
 */
export function readImageMeta(bytes: Uint8Array): ImageMeta | null {
  const meta = readPngMeta(bytes) ?? readJpegMeta(bytes) ?? readWebpMeta(bytes)

  if (!meta || meta.width <= 0 || meta.height <= 0)
    return null

  return meta
}
