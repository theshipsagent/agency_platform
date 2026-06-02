// Inbox Triage — Server Component.
//
// Fetches the classified communications server-side (one round trip on first
// render via lib/inbox.listInbox), then hands them to the InboxTriage client
// component which drives Sync / Link actions + router.refresh().
//
// This is the marquee "AI reads your inbox and links mail to the right port
// call" surface — backed by the email + ai mock service ports.

import { getTenantId } from '@/lib/api/auth'
import { listInbox } from '@/lib/inbox'
import { InboxTriage } from '@/components/inbox/InboxTriage'

export default async function InboxPage() {
  const tenantId = await getTenantId()
  const items = await listInbox(tenantId)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Inbox Triage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Incoming mail, classified by AI and linked to the right port call.
          Sync pulls new messages; the AI suggests which port call each belongs
          to — confirm with one click, or link manually.
        </p>
      </header>

      <InboxTriage items={items} />
    </div>
  )
}
