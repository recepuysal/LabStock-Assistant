import { digikeySearchUrl, lcscSearchUrl, mouserSearchUrl } from '@/lib/mpnSupplierUrls'

type Props = { mpn: string }

export function MpnSupplierLinks({ mpn }: Props) {
  const q = mpn.trim()
  if (!q) return null
  const linkCls =
    'text-xs text-ls-text-muted transition hover:text-ls-accent hover:underline underline-offset-2'
  return (
    <span className="flex flex-wrap items-center gap-x-2" title="Tedarikçi sitelerinde MPN ara">
      <a href={lcscSearchUrl(q)} target="_blank" rel="noreferrer" className={linkCls}>
        LCSC
      </a>
      <span className="text-ls-line" aria-hidden>
        ·
      </span>
      <a href={mouserSearchUrl(q)} target="_blank" rel="noreferrer" className={linkCls}>
        Mouser
      </a>
      <span className="text-ls-line" aria-hidden>
        ·
      </span>
      <a href={digikeySearchUrl(q)} target="_blank" rel="noreferrer" className={linkCls}>
        DigiKey
      </a>
    </span>
  )
}
