export interface UploadResult {
  storageKey: string
  url: string
  sizeBytes: number
}

export interface IStorageProvider {
  upload(key: string, content: Buffer, mimeType: string): Promise<UploadResult>
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}
