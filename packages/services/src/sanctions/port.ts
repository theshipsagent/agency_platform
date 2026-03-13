export interface SanctionsCheckResult {
  isMatch: boolean
  matchScore: number  // 0-1
  matchedEntity: string | null
  listName: string | null
  details: string | null
}

export interface ISanctionsProvider {
  checkEntity(name: string, country?: string): Promise<SanctionsCheckResult>
  checkVessel(imoNumber: string, vesselName: string): Promise<SanctionsCheckResult>
}
