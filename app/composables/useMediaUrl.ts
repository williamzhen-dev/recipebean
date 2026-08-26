/**
 * Resolves an R2 object key to a URL.
 *
 * Locally `mediaBaseUrl` is blank, so keys resolve to the /api/media worker
 * route reading Miniflare's on-disk R2. In production it is the bucket's
 * custom domain, so images load from the edge without invoking the worker.
 * Components only ever see a key, so switching between the two is one env var.
 */
export function useMediaUrl() {
  const config = useRuntimeConfig()

  function mediaUrl(key: string | null | undefined): string | undefined {
    if (!key)
      return undefined

    const base = config.public.mediaBaseUrl

    return base ? `${base.replace(/\/$/, '')}/${key}` : `/api/media/${key}`
  }

  return { mediaUrl }
}
