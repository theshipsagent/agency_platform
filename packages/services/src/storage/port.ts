export interface UploadResult {
  storageKey: string
  url: string
  sizeBytes: number
}

export interface IStorageProvider {
  upload(key: string, content: Buffer, mimeType: string): Promise<UploadResult>
  // Read raw bytes back. Used by the download route so it stays
  // adapter-agnostic — local-fs reads from disk, an S3 adapter calls
  // GetObject. The route always pulls bytes through this method rather than
  // reaching into adapter internals.
  download(key: string): Promise<Buffer>
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}
