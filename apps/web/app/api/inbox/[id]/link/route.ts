// /api/inbox/[id]/link
//
// POST — link an ingested communication to a port call. Body: { portCallId }.
// Sets status = LINKED and port_call_id. The operator's choice is authoritative
// — it's often the AI's suggested port call, but they can pick any (the AI
// suggestion is advice, not a lock).
//
// This is an UPDATE, so auditedMutation captures a `before` snapshot
// (table: 'communications') — the audit row shows the status/link transition.

import { tenantQueryOne, auditedMutation } from '@shipops/db'
import { NextRequest } from 'next/server'
import { getRequestContext } from '@/lib/api/auth'
import { parseBody } from '@/lib/api/parse'
import { LinkCommunicationBodySchema } from '@shipops/shared/validation'
import { CommunicationStatus } from '@shipops/shared'
import {
  type CommunicationRow,
  COMMUNICATION_COLUMNS,
  toCommunication,
} from '@/lib/api/communications'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getRequestContext()
  if (ctx.actor.kind !== 'user') {
    return Response.json({ error: 'Linking requires a user actor' }, { status: 403 })
  }

  const parsed = parseBody(LinkCommunicationBodySchema, await req.json().catch(() => null))
  if (!parsed.ok) return parsed.response
  const { portCallId } = parsed.data

  // 1. Communication exists + belongs to tenant.
  const comm = await tenantQueryOne<{ id: string }>(
    ctx.tenantId,
    `SELECT id FROM communications
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [params.id, ctx.tenantId]
  )
  if (!comm) {
    return Response.json({ error: 'Communication not found' }, { status: 404 })
  }

  // 2. Target port call exists + belongs to tenant. Verifying here turns a
  // would-be FK error into a clean 400 with a useful message.
  const pc = await tenantQueryOne<{ id: string }>(
    ctx.tenantId,
    `SELECT id FROM port_calls
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [portCallId, ctx.tenantId]
  )
  if (!pc) {
    return Response.json({ error: 'Target port call not found' }, { status: 400 })
  }

  // 3. Audited UPDATE — before snapshot from communications.
  const row = await auditedMutation<CommunicationRow>({
    tenantId: ctx.tenantId,
    actor: ctx.actor,
    audit: {
      action: 'LINK_TO_PORT_CALL',
      resourceType: 'communication',
      resourceId: params.id,
      auditedTable: 'communications',
    },
    mutationSql: `
      UPDATE communications
         SET status = $1::"CommunicationStatus",
             port_call_id = $2,
             updated_at = NOW(),
             updated_by = $3
       WHERE id = $4 AND tenant_id = $5 AND deleted_at IS NULL
       RETURNING ${COMMUNICATION_COLUMNS}`,
    mutationParams: [
      CommunicationStatus.LINKED,
      portCallId,
      ctx.actor.userId,
      params.id,
      ctx.tenantId,
    ],
  })

  if (!row) {
    return Response.json(
      { error: 'Link UPDATE returned no row (transaction rolled back)' },
      { status: 500 }
    )
  }

  return Response.json({ communication: toCommunication(row) })
}
