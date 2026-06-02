// /api/inbox
//
// GET — list ingested communications for the tenant, newest first, each with
// its AI-suggested port call resolved to a real { id, vesselName, number } so
// the triage UI can offer one-click linking. The list+resolve logic lives in
// lib/inbox.ts and is shared with the /inbox server-component page.
//
// Read-only — no mutation, no audit row.

import { NextRequest } from 'next/server'
import { getTenantId } from '@/lib/api/auth'
import { listInbox } from '@/lib/inbox'

export async function GET(_req: NextRequest) {
  const tenantId = await getTenantId()
  const communications = await listInbox(tenantId)
  return Response.json({ communications })
}
