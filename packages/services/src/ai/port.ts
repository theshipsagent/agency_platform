import type { DocumentType } from '@shipops/shared'

export interface ClassifyEmailResult {
  isPortCallRelated: boolean
  portCallNumber: string | null    // extracted PC-YYYY-NNNN if present
  suggestedDocumentType: DocumentType | null
  extractedEta: Date | null
  extractedFigures: Record<string, number>
  summary: string
  confidence: number
}

export interface SuggestedAction {
  action: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

export interface IAIProvider {
  classifyEmail(subject: string, body: string): Promise<ClassifyEmailResult>
  suggestActions(portCallContext: string): Promise<SuggestedAction[]>
  extractDataFromText(text: string, schema: Record<string, string>): Promise<Record<string, unknown>>
}
