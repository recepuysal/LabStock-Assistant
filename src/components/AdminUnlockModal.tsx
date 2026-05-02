import { FormEvent, useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (pin: string) => Promise<boolean>
}

export function AdminUnlockModal({ open, onSubmit, onClose }: Props) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(false)
    setBusy(true)
    try {
      const ok = await onSubmit(pin)
      if (ok) {
        setPin('')
        onClose()
      } else {
        setErr(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-unlock-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-ls-line bg-ls-surface p-5 shadow-float">
        <h2 id="admin-unlock-title" className="text-base font-semibold text-slate-900">
          Yönetici girişi
        </h2>
        <p className="mt-2 text-sm text-slate-600">Stok düzenlemek için yönetici PIN’ini girin.</p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value)
              setErr(false)
            }}
            className="ls-input py-2.5"
            placeholder="PIN"
            autoFocus
          />
          {err ? <p className="text-sm font-medium text-red-600">PIN eşleşmedi.</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setPin('')
                setErr(false)
                onClose()
              }}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={busy || !pin.trim()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-bubble transition hover:brightness-110 disabled:opacity-40"
            >
              Aç
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
