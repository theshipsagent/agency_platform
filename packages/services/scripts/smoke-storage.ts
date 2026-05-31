// Smoke test for the local-fs storage adapter.
// Run with: pnpm --filter @shipops/services smoke-storage
//
// Validates the full round-trip lifecycle:
//   1. upload writes bytes + returns sizeBytes matching input length
//   2. exists returns true after upload
//   3. download bytes are identical to upload bytes (SHA-256 match)
//   4. delete removes the file
//   5. exists returns false after delete
//   6. delete is idempotent (calling on a missing key is a no-op, not a throw)
//   7. path traversal in the key is rejected
//
// Each assertion prints a ✓ / ✗ line; non-zero exit if any fail.

import { createHash, randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

// Point the adapter at a scratch directory under /tmp so this test never
// touches the dev .uploads/ tree.
process.env['STORAGE_LOCAL_ROOT'] = '/tmp/shipops-storage-smoke'

import { localFsStorageAdapter } from '../src/storage/local-fs-adapter'

let failures = 0

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`✓ ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    console.log(`✗ ${label}${detail ? ` — ${detail}` : ''}`)
    failures += 1
  }
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

async function main() {
  const SCRATCH = resolve('/tmp/shipops-storage-smoke')

  // Start clean — old runs may have left files behind.
  await rm(SCRATCH, { recursive: true, force: true })

  // ─── Fixture ──────────────────────────────────────────────────────────────
  // Random buffer so the test is independent of any specific file content.
  const sourceBytes = Buffer.from(
    `SHIPOPS-SMOKE-${randomUUID()}\n${'x'.repeat(2048)}`,
    'utf-8'
  )
  const sourceHash = sha256(sourceBytes)
  const tenantId = 'tenant-smoke'
  const portCallId = 'pc-smoke-001'
  const key = `${tenantId}/${portCallId}/${randomUUID()}-test.txt`

  // ─── 1. upload ────────────────────────────────────────────────────────────
  const uploadResult = await localFsStorageAdapter.upload(
    key,
    sourceBytes,
    'text/plain'
  )
  check(
    'upload returns storageKey matching input',
    uploadResult.storageKey === key,
    `got ${uploadResult.storageKey}`
  )
  check(
    'upload returns sizeBytes matching input length',
    uploadResult.sizeBytes === sourceBytes.byteLength,
    `${uploadResult.sizeBytes} == ${sourceBytes.byteLength}`
  )

  // ─── 2. exists after upload ───────────────────────────────────────────────
  const existsAfterUpload = await localFsStorageAdapter.exists(key)
  check('exists returns true after upload', existsAfterUpload === true)

  // ─── 3. download identity ─────────────────────────────────────────────────
  const downloaded = await localFsStorageAdapter.download(key)
  check(
    'download bytes are identical to upload bytes (SHA-256)',
    sha256(downloaded) === sourceHash,
    `${sha256(downloaded).slice(0, 12)}... vs ${sourceHash.slice(0, 12)}...`
  )

  // ─── 4. delete ────────────────────────────────────────────────────────────
  await localFsStorageAdapter.delete(key)

  // ─── 5. exists after delete ───────────────────────────────────────────────
  const existsAfterDelete = await localFsStorageAdapter.exists(key)
  check('exists returns false after delete', existsAfterDelete === false)

  // ─── 6. delete is idempotent ──────────────────────────────────────────────
  let idempotent = true
  try {
    await localFsStorageAdapter.delete(key)
  } catch {
    idempotent = false
  }
  check('delete is idempotent (no throw on missing key)', idempotent)

  // ─── 7. path traversal is rejected ───────────────────────────────────────
  let traversalRejected = false
  try {
    await localFsStorageAdapter.upload(
      '../../etc/passwd-mock',
      Buffer.from('nope'),
      'text/plain'
    )
  } catch (err) {
    traversalRejected =
      err instanceof Error && /escapes root/.test(err.message)
  }
  check(
    'path traversal in storage key is rejected',
    traversalRejected,
    'expected upload to throw "escapes root"'
  )

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(
    `\n${failures === 0 ? '✓ ALL CHECKS PASSED' : `✗ ${failures} FAILURE(S)`} — root: ${SCRATCH}`
  )
  if (failures > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
