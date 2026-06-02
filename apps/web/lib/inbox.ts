// Server-side inbox query, shared by the GET /api/inbox route and the
// /inbox server-component page so the list+resolve logic lives in exactly one
// place (server component querying the DB directly is the house pattern — see
// the documents tab page — but the PC-number resolution is non-trivial enough
// to be worth not duplicating).

import { tenantQuery } from '@shipops/db'
import {
  type CommunicationRow,
  COMMUNICATION_COLUMNS,
  toCommunication,
} from '@/lib/api/communications'

export interface SuggestedPortCall {
  id: string
  portCallNumber: string
  vesselName: string
  phase: string
}

export type InboxItem = ReturnType<typeof toCommunication> & {
  suggestedPortCall: SuggestedPortCall | null
}

export async function listInbox(tenantId: string): Promise<InboxItem[]> {
  const rows = await tenantQuery<CommunicationRow>(
    tenantId,
    `SELECT ${COMMUNICATION_COLUMNS}
       FROM communications
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY received_at DESC`,
    [tenantId]
  )
  const communications = rows.map(toCommunication)

  // Resolve the AI-suggested PC numbers (for not-yet-linked items) to real
  // port calls in a single batched query, so the UI can offer one-click linking.
  const suggestedNumbers = [
    ...new Set(
      communications
        .filter((c) => c.portCallId === null)
        .map((c) => c.classification?.portCallNumber)
        .filter((n): n is string => typeof n === 'string' && n.length > 0)
    ),
  ]

  const resolved = new Map<string, SuggestedPortCall>()
  if (suggestedNumbers.length > 0) {
    const pcRows = await tenantQuery<{
      id: string
      port_call_number: string
      vessel_name: string
      phase: string
    }>(
      tenantId,
      `SELECT pc.id, pc.port_call_number, v.name AS vessel_name, pc.phase::text AS phase
         FROM port_calls pc
         JOIN vessels v ON v.id = pc.vessel_id
        WHERE pc.tenant_id = $1
          AND pc.deleted_at IS NULL
          AND pc.port_call_number = ANY($2)`,
      [tenantId, suggestedNumbers]
    )
    for (const r of pcRows) {
      resolved.set(r.port_call_number, {
        id: r.id,
        portCallNumber: r.port_call_number,
        vesselName: r.vessel_name,
        phase: r.phase,
      })
    }
  }

  return communications.map((c) => {
    const num = c.portCallId === null ? c.classification?.portCallNumber ?? null : null
    return { ...c, suggestedPortCall: num ? resolved.get(num) ?? null : null }
  })
}
