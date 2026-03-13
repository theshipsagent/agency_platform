import type { DisbursementAccount, PortCall, Vessel, Organization, TimelineEvent } from '@shipops/shared'

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

export interface IPDFProvider {
  generateFDA(input: GenerateFDAInput): Promise<Buffer>
  generateSOF(input: GenerateSOFInput): Promise<Buffer>
}
