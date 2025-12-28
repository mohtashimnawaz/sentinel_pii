import { z } from 'zod'

export const TelemetryEventSchema = z.object({
  event_id: z.string().uuid().optional(),
  timestamp: z.string(),
  secret_type: z.enum(['AWS', 'Stripe']),
  action: z.enum(['blocked', 'allowed', 'detected_but_skipped']),
  app_name: z.string().optional().nullable(),
  rule: z.string().optional().nullable(),
  machine_id_hashed: z.string().optional().nullable(),
  agent_version: z.string().optional().nullable(),
})

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>

export function validateEvent(body: any) {
  return TelemetryEventSchema.safeParse(body)
}
