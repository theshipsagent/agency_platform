import type { DisbursementAccount, PortCall, Vessel, Organization, TimelineEvent } from '@shipops/shared'
import type { BillOfLadingType } from './bills/bill-types'

export interface GenerateFDAInput {
  portCall: PortCall
  vessel: Vessel
  principal: Organization
  da: DisbursementAccount
  agencyName: string
}

export interface GenerateSOFInput {
  portCall: PortCall
  vessel: Vessel
  events: TimelineEvent[]
  agencyName: string
}

// ─── Bill of Lading ───────────────────────────────────────────────────────────
// Field model for the page-1 data grid. Like the other inputs here, this is a
// minimal PDF view-contract (NOT a DB row mirror) — the route marshals platform
// rows + manual entry into it. Source of each field is annotated:
//   [platform] derivable from PortCall / Vessel / CargoLine
//   [manual]   cargo-trade data the port-call model does not hold yet — entered
//              on the B/L form (Shipper/Consignee/Notify chain). See session notes.
//   [b/l]      B/L-specific identifiers / issuance fields.

export interface BillOfLadingParty {
  name: string
  /** Multi-line address; rendered under the name. */
  address?: string
}

export interface GenerateBillOfLadingInput {
  billType: BillOfLadingType

  // Identifiers
  blNumber: string // [b/l]
  referenceNo?: string // [b/l]

  // Cargo-trade parties
  shipper: BillOfLadingParty // [manual]
  consignee: BillOfLadingParty // [manual]
  notifyAddress: BillOfLadingParty // [manual]

  // Voyage
  vesselName: string // [platform] Vessel.name
  portOfLoading: string // [platform] PortCall port
  portOfDischarge: string // [platform/manual] next port — may not be modelled

  // Cargo
  descriptionOfGoods: string // [platform] CargoLine.description(s)
  grossWeight: string // [platform] CargoLine quantity/unit
  onDeckQuantity?: string // [manual] "(of which … on deck at shipper's risk)"

  // Freight
  freightPayableAs: string // [b/l] e.g. "per Charter Party"
  charterPartyDate?: string // [platform/manual] governing CP date
  freightAdvanceReceived?: string // [b/l]

  // Issuance
  dateShippedOnBoard?: string // [b/l]
  placeAndDateOfIssue: string // [b/l]
  numberOfOriginals: string // [b/l] e.g. "3/three"

  // Signature block
  signedBy?: 'Master' | 'Agent' | 'Owner' | 'Charterer' // [b/l]
  agentName?: string // [manual] when signed by Agent
  agencyName: string // [platform] tenant org
}

export interface IPDFProvider {
  generateFDA(input: GenerateFDAInput): Promise<Buffer>
  generateSOF(input: GenerateSOFInput): Promise<Buffer>
  generateBillOfLading(input: GenerateBillOfLadingInput): Promise<Buffer>
}
