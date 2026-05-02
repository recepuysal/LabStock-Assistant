import { useState } from 'react'
import type { Part } from '@/data/sampleParts'

type Props = {
  part: Part
  onApplyDelta: (mpn: string, delta: number) => void
  readOnly?: boolean
}

export function StockRowActions({ part, onApplyDelta, readOnly }: Props) {
  const [amount, setAmount] = useState('1')
  const raw = amount.trim()
  const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN
  const valid = Number.isFinite(n) && n > 0
  const canSubtract = valid && n <= part.quantity && part.quantity > 0

  if (readOnly) {
    return <span className="text-2xs font-medium text-slate-400">Salt okunur</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        disabled={!canSubtract}
        onClick={() => {
          onApplyDelta(part.mpn, -n)
          setAmount('1')
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 text-base font-bold leading-none text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
        title="Stoktan düş"
        aria-label={`${part.mpn} stoktan ${n} düş`}
      >
        −
      </button>
      <label className="sr-only" htmlFor={`qty-adj-${part.mpn}`}>
        {part.mpn} miktar
      </label>
      <input
        id={`qty-adj-${part.mpn}`}
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="h-8 w-12 rounded-lg border border-ls-line bg-white px-1 text-center text-xs font-semibold text-slate-900 tabular-nums outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/25"
        title="Düşürülecek veya eklenecek adet"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={() => {
          onApplyDelta(part.mpn, n)
          setAmount('1')
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-base font-bold leading-none text-teal-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-40"
        title="Stoka ekle"
        aria-label={`${part.mpn} stoka ${n} ekle`}
      >
        +
      </button>
    </div>
  )
}
