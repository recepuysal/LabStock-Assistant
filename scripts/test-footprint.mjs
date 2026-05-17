import { readFileSync } from 'fs'
import { importFromSupplierUrl } from '../dist-electron/main/index.js'

const html = readFileSync('tmp-tme.html', 'utf8')
// direct test via dynamic import of supplier module - use built file
const mod = await import('../electron/main/supplierImport.ts').catch(() => null)
if (!mod) {
  console.log('run via tsc build only')
  process.exit(0)
}

const res = await mod.importFromSupplierUrl(
  'https://www.tme.eu/en/details/ne555p/watchdog-and-reset-circuits/texas-instruments/',
)
console.log(JSON.stringify(res, null, 2))
