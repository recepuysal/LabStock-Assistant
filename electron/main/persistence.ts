import { app } from 'electron'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DATA_FILE = 'labstock-data.json'

export function getLabstockDataPath(): string {
  return path.join(app.getPath('userData'), DATA_FILE)
}

export async function loadLabstockDataFile(): Promise<{ ok: true; data: string | null } | { ok: false; error: string }> {
  const f = getLabstockDataPath()
  try {
    const data = await readFile(f, 'utf-8')
    return { ok: true, data }
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return { ok: true, data: null }
    return { ok: false, error: err.message ?? String(e) }
  }
}

export async function saveLabstockDataFile(json: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const f = getLabstockDataPath()
  const dir = path.dirname(f)
  const tmp = `${f}.tmp`
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(tmp, json, 'utf-8')
    try {
      await rename(tmp, f)
    } catch {
      await writeFile(f, json, 'utf-8')
      await unlink(tmp).catch(() => {})
    }
    return { ok: true }
  } catch (e: unknown) {
    const err = e as Error
    await unlink(tmp).catch(() => {})
    return { ok: false, error: err.message ?? String(e) }
  }
}
