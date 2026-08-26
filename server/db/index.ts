import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { H3Event } from 'h3'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Database = NodePgDatabase<typeof schema>

interface HyperdriveBinding {
  connectionString: string
}

// Builds a client from a Hyperdrive connection string. Callers that own the
// pool must `await close()`; request handlers can ignore it (see `useDb`).
export function createDb(connectionString: string): { db: Database, close: () => Promise<void> } {
  const pool = new Pool({ connectionString })
  const db = drizzle({ client: pool, schema, casing: 'snake_case' })

  return { db, close: () => pool.end() }
}

// Cloudflare Workers forbid reusing a database connection across requests, so
// the client must be created per-request and never cached in module scope.
// Hyperdrive pools the underlying connection to the origin database, so
// creating a new client on each request is cheap, and it tears the client down
// automatically when the request ends (no manual `end()` required).
export function useDb(event: H3Event): Database {
  const cached = event.context.db as Database | undefined
  if (cached)
    return cached

  const cloudflare = event.context.cloudflare as
    | { env?: { HYPERDRIVE?: HyperdriveBinding } }
    | undefined

  const connectionString = cloudflare?.env?.HYPERDRIVE?.connectionString
  if (!connectionString)
    throw createError({ statusCode: 500, statusMessage: 'Hyperdrive binding is not available' })

  const { db } = createDb(connectionString)

  event.context.db = db
  return db
}
