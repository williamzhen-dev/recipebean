import type { H3Event } from 'h3'
import { clerkClient } from '@clerk/nuxt/server'
import { eq } from 'drizzle-orm'
import { useDb } from '../db'
import { usersTable } from '../db/schema'

export async function requireAuth(event: H3Event) {
  const { userId: clerkId } = event.context.auth()
  if (!clerkId)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDb(event)
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  })
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  return user
}

/**
 * The Clerk Backend API, for the things Clerk owns rather than we do — the
 * user's name, and the user record itself.
 *
 * `@clerk/nuxt` bundles its own copy of h3, so its `H3Event` is a distinct type
 * from ours and the call will not typecheck without a cast. The webhook route
 * casts `verifyWebhook` the same way; this keeps that one cast in one place.
 */
export function useClerkApi(event: H3Event) {
  return clerkClient(event as Parameters<typeof clerkClient>[0])
}
