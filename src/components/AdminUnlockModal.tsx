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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-unlock-title"
    >
      <div className="ls-card w-full max-w-sm p-5">
        <h2 id="admin-unlock-title" className="text-base font-semibold text-ls-text">
          Yönetici girişi
        </h2>
        <p className="mt-2 text-sm text-ls-text-muted">Stok düzenlemek için PIN girin.</p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value)
              setErr(false)
            }}
            className="ls-input"
            placeholder="PIN"
            autoFocus
          />
          {err ? <p className="text-sm font-medium text-ls-danger">PIN eşleşmedi.</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="ls-btn-ghost">
              Vazgeç
            </button>
            <button type="submit" disabled={busy || !pin.trim()} className="ls-btn-primary">
              Aç
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
