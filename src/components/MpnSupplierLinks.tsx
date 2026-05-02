import { digikeySearchUrl, lcscSearchUrl, mouserSearchUrl } from '@/lib/mpnSupplierUrls'

type Props = { mpn: string }

const linkCls =
  'inline-flex items-center rounded-md border border-ls-line bg-white px-1.5 py-0.5 text-2xs font-semibold text-slate-600 shadow-card transition hover:border-teal-300 hover:text-teal-800'

export function MpnSupplierLinks({ mpn }: Props) {
  const q = mpn.trim()
  if (!q) return null
  return (
    <span className="flex flex-wrap items-center gap-1" title="Tedarikçi sitelerinde MPN ara">
      <a href={lcscSearchUrl(q)} target="_blank" rel="noreferrer" className={linkCls}>
        LCSC
      </a>
      <a href={mouserSearchUrl(q)} target="_blank" rel="noreferrer" className={linkCls}>
        Mouser
      </a>
      <a href={digikeySearchUrl(q)} target="_blank" rel="noreferrer" className={linkCls}>
        DigiKey
      </a>
    </span>
  )
}
