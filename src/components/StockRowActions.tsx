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
    return <span className="text-xs text-ls-text-muted">—</span>
  }

  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-ls-line bg-ls-surface">
      <button
        type="button"
        disabled={!canSubtract}
        onClick={() => {
          onApplyDelta(part.mpn, -n)
          setAmount('1')
        }}
        className="flex h-8 w-8 items-center justify-center text-sm font-medium text-ls-danger transition hover:bg-ls-danger-soft disabled:opacity-30"
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
        className="h-8 w-10 border-x border-ls-line bg-transparent text-center text-xs font-semibold tabular-nums text-ls-text outline-none focus:bg-ls-muted"
        title="Miktar"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={() => {
          onApplyDelta(part.mpn, n)
          setAmount('1')
        }}
        className="flex h-8 w-8 items-center justify-center text-sm font-medium text-ls-accent transition hover:bg-ls-accent-soft disabled:opacity-30"
        title="Stoka ekle"
        aria-label={`${part.mpn} stoka ${n} ekle`}
      >
        +
      </button>
    </div>
  )
}
