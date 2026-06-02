// /api/inbox/sync
//
// POST — pull unread mail from the email provider, classify each with the AI
// provider, and persist one communications row per NEW message. Idempotent:
// a message already ingested (same tenant + external_id) is skipped, so the
// endpoint is safe to call repeatedly (a "Sync inbox" button, a cron, etc.).
//
// Flow per message:
//   1. Skip if (tenant_id, external_id) already exists.
//   2. ai.classifyEmail(subject, body) → ClassifyEmailResult (stored verbatim).
//   3. auditedMutation INSERT communications row, status TRIAGED, portCallId
//      NULL (a human links it later — the AI suggestion is advice, not authority).
//   4. email.markAsRead(id) so a real provider won't re-serve it.
//
// Each message is its own auditedMutation (its own transaction + audit row).
// That matches the "single mutation per transaction" design — there's no
// cross-message atomicity requirement here; a partial sync is fine and the
// next call picks up the rest.

import { tenantQueryOne, auditedMutation } from '@shipops/db'
import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getRequestContext } from '@/lib/api/auth'
import { getServices, type ServiceRegistry } from '@shipops/services'
import { CommunicationStatus } from '@shipops/shared'
import {
  type CommunicationRow,
  COMMUNICATION_COLUMNS,
  toCommunication,
} from '@/lib/api/communications'

// Module-level service cache — same pattern as the FDA + documents routes.
let servicesPromise: Promise<ServiceRegistry> | null = null
function services(): Promise<ServiceRegistry> {
  if (!servicesPromise) servicesPromise = getServices()
  return servicesPromise
}

export async function POST(_req: NextRequest) {
  const ctx = await getRequestContext()

  // Ingest must attribute rows to a real user (audit_logs.user_id is NOT NULL).
  if (ctx.actor.kind !== 'user') {
    return Response.json({ error: 'Inbox sync requires a user actor' }, { status: 403 })
  }

  const svc = await services()
  const unread = await svc.email.getUnreadMessages()

  const ingested: ReturnType<typeof toCommunication>[] = []
  let skipped = 0

  for (const msg of unread) {
    // 1. Idempotency guard — already ingested?
    const existing = await tenantQueryOne<{ id: string }>(
      ctx.tenantId,
      `SELECT id FROM communications
        WHERE tenant_id = $1 AND external_id = $2 AND deleted_at IS NULL`,
      [ctx.tenantId, msg.id]
    )
    if (existing) {
      skipped += 1
      continue
    }

    // 2. Classify.
    const classification = await svc.ai.classifyEmail(msg.subject, msg.bodyText)

    // 3. Audited INSERT. classification → jsonb via JSON.stringify + ::jsonb.
    const id = randomUUID()
    const row = await auditedMutation<CommunicationRow>({
      tenantId: ctx.tenantId,
      actor: ctx.actor,
      audit: {
        action: 'CREATE',
        resourceType: 'communication',
        resourceId: id,
      },
      mutationSql: `
        INSERT INTO communications (
          id, tenant_id, external_id, from_addr, to_addrs, cc_addrs,
          subject, body_text, body_html, received_at,
          classification, status, port_call_id,
          created_at, updated_at, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11::jsonb, $12::"CommunicationStatus", NULL,
          NOW(), NOW(), $13, $13
        )
        RETURNING ${COMMUNICATION_COLUMNS}`,
      mutationParams: [
        id,
        ctx.tenantId,
        msg.id,
        msg.from,
        msg.to,
        msg.cc,
        msg.subject,
        msg.bodyText,
        msg.bodyHtml,
        msg.receivedAt,
        JSON.stringify(classification),
        CommunicationStatus.TRIAGED,
        ctx.actor.userId,
      ],
    })

    if (row) {
      ingested.push(toCommunication(row))
      // 4. Mark read so a real provider stops serving it. Done only after a
      // successful, committed INSERT — if the INSERT rolled back we WANT the
      // next sync to retry this message.
      await svc.email.markAsRead(msg.id)
    }
  }

  return Response.json({
    ingested: ingested.length,
    skipped,
    total: unread.length,
    communications: ingested,
  })
}
