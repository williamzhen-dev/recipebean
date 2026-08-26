import type { Serialize } from 'nitropack/types'
import type { filesTable } from '~~/server/db/schema'
import * as z from 'zod'

// Mirrors the `file_status` pgEnum in server/db/schema/files.ts.
export const fileStatusSchema = z.enum(['pending', 'attached'])

// Response body of POST /api/files.
export const uploadedFileSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  width: z.int().nullable(),
  height: z.int().nullable(),
})

export type FileStatus = z.infer<typeof fileStatusSchema>
export type UploadedFile = z.infer<typeof uploadedFileSchema>
export type SerializedFile = Serialize<typeof filesTable.$inferSelect>
