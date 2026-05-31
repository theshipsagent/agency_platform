// Local filesystem adapter for the storage port.
//
// Not "mock" in the sense of fake data — local-fs is a real persistence layer,
// just sized for dev / CI / demo rather than production. Production swaps in an
// S3-class adapter via PROVIDER_STORAGE; route + UI code never change.
//
// Layout: STORAGE_LOCAL_ROOT/{tenantId}/{portCallId}/{uuid}-{filename}
//   - The tenant prefix is structural defense-in-depth: the path itself encodes
//     scope, so a logic bug can't cause a cross-tenant read.
//   - {uuid}-{filename} guarantees uniqueness while preserving a
//     human-readable filename for forensic inspection of the disk.
//
// The adapter trusts whatever key it's handed and treats it as a relative path
// under STORAGE_LOCAL_ROOT. Path-traversal is rejected — see pathFor().
//
// STORAGE_LOCAL_ROOT defaults to apps/web/.uploads (gitignored). The smoke
// test overrides to /tmp/shipops-storage-smoke.

import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { IStorageProvider, UploadResult } from './port'

// Default storage location is apps/web/.uploads under the monorepo root.
// We can't trust process.cwd() — `next dev` runs from apps/web/, the smoke
// test runs from packages/services/, db scripts run from packages/db/, etc.
// So we walk up from cwd looking for pnpm-workspace.yaml (the unambiguous
// monorepo-root signal) and anchor the default there.
//
// __dirname would seem simpler, but webpack rewrites __dirname during the
// Next.js bundle so it can't be relied on. STORAGE_LOCAL_ROOT overrides
// this entirely — preferred for production, where the value is an absolute
// path to whatever durable volume the deployment mounts.

let _rootCache: string | null = null

function findMonorepoRoot(): string {
  let dir = process.cwd()
  while (dir !== '/' && dir !== '') {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  // Couldn't find the marker — fall back to cwd. The caller still gets a
  // valid absolute path; it just may not be the one they expected.
  return process.cwd()
}

function getRoot(): string {
  if (_rootCache) return _rootCache
  const override = process.env['STORAGE_LOCAL_ROOT']
  _rootCache = override
    ? resolve(override)
    : join(findMonorepoRoot(), 'apps/web/.uploads')
  return _rootCache
}

function pathFor(key: string): string {
  const root = getRoot()
  const absolute = resolve(root, key)
  // Guard against keys like "../../etc/passwd" that resolve outside the root.
  // resolve() collapses the relative segments, so absolute will not contain
  // ".." — the check is whether the result is still under root.
  if (!absolute.startsWith(root + '/') && absolute !== root) {
    throw new Error(`storage key escapes root: ${key}`)
  }
  return absolute
}

export const localFsStorageAdapter: IStorageProvider = {
  async upload(key, content, _mimeType): Promise<UploadResult> {
    const absolute = pathFor(key)
    await mkdir(dirname(absolute), { recursive: true })
    await writeFile(absolute, content)
    // url is empty for the local adapter — browsers can't fetch file:// from
    // a web page, and we don't want to hand out raw filesystem paths. The
    // route that owns the documents row (which has the document id) builds
    // the download URL as /api/documents/[id]/download. The url field stays
    // reserved for S3-style adapters that return a presigned https URL the
    // browser can hit directly.
    return { storageKey: key, url: '', sizeBytes: content.byteLength }
  },

  async download(key): Promise<Buffer> {
    return readFile(pathFor(key))
  },

  async getSignedUrl(key, _expiresInSeconds): Promise<string> {
    // No real presign on local — return a file:// URL useful for operator
    // debugging ("where on disk is this?") but never as a browser fetch URL.
    return `file://${pathFor(key)}`
  },

  async delete(key): Promise<void> {
    try {
      await unlink(pathFor(key))
    } catch (err: unknown) {
      // Idempotent — missing file is not an error (matches S3 DeleteObject).
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: unknown }).code === 'ENOENT'
      ) {
        return
      }
      throw err
    }
  },

  async exists(key): Promise<boolean> {
    try {
      await stat(pathFor(key))
      return true
    } catch {
      return false
    }
  },
}
