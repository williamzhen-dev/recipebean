import * as z from 'zod'
import { PFP } from '~~/shared/misc/pfp'

// Request body of PATCH /api/me. The name is pushed on to Clerk, the avatar is
// an index into PFP and stays in our own `users` row.
export const updateAccountSchema = z.object({
  firstName: z.string().trim().min(1, { error: 'Required' }).max(64, { error: 'Too long' }),
  lastName: z.string().trim().min(1, { error: 'Required' }).max(64, { error: 'Too long' }),
  pfpId: z.int().min(0).max(PFP.length - 1),
})

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
