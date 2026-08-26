import { relations } from 'drizzle-orm'
import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { usersTable } from './users'

// A file is uploaded before the row that references it exists, so it starts as
// `pending` and is promoted to `attached` when that row is saved. Anything
// still `pending` after 7 days was abandoned and gets swept by the cron in
// server/plugins/cleanup-pending-files.ts.
export const fileStatusEnum = pgEnum('file_status', ['pending', 'attached'])

export const filesTable = pgTable('files', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().references(() => usersTable.id, {
    onDelete: 'cascade',
  }).notNull(),
  // R2 object key, e.g. recipes/<userId>/<uuid>.webp. Stored instead of a full
  // URL so the serving origin can change without rewriting rows.
  key: text().notNull().unique(),
  status: fileStatusEnum().notNull().default('pending'),
  contentType: text().notNull(),
  size: integer().notNull(),
  width: integer(),
  height: integer(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index('files_user_id_idx').on(table.userId),
  // Drives the sweep query.
  index('files_status_created_at_idx').on(table.status, table.createdAt),
])

export const filesRelations = relations(filesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [filesTable.userId],
    references: [usersTable.id],
  }),
}))

export type FileStatus = (typeof fileStatusEnum.enumValues)[number]
export type FileRecord = typeof filesTable.$inferSelect
export type NewFileRecord = typeof filesTable.$inferInsert
