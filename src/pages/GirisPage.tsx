import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminUnlockModal } from '@/components/AdminUnlockModal'
import { useInventory } from '@/context/InventoryContext'
import { useSimpleAccess } from '@/context/SimpleAccessContext'
import { LS_START_ON_KAYIT } from '@/lib/settingsKeys'

export function GirisPage() {
  const navigate = useNavigate()
  const { parts } = useInventory()
  const { isViewer, isAdmin, hasAdminPin, tryUnlock } = useSimpleAccess()
  const [unlockOpen, setUnlockOpen] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_START_ON_KAYIT) === '1') {
        navigate('/kayit', { replace: true })
      }
    } catch {
      /* yoksay */
    }
  }, [navigate])

  async function onUnlockSubmit(pin: string) {
    const ok = await tryUnlock(pin)
    if (ok) navigate('/kayit')
    return ok
  }

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-8 sm:py-10">
      <AdminUnlockModal open={unlockOpen} onClose={() => setUnlockOpen(false)} onSubmit={onUnlockSubmit} />

      <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-teal-700/90">Hoş geldiniz</p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem] sm:leading-tight">
        Depo girişi
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Stok listesi <strong className="font-semibold text-slate-800">bu uygulamanın kurulu olduğu bilgisayarda</strong>{' '}
        tutulur. Aynı depoyu başka kişiler kendi PC’lerinde görmek için bugün itibarıyla{' '}
        <strong className="font-semibold text-slate-800">yedek dosyayı (Ayarlar → JSON)</strong> paylaşıp onların içe
        aktarması gerekir; ileride tek hesapla bulut senkron eklenebilir.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Bu ekrandan <strong className="font-semibold text-slate-800">Kayıt</strong> tablosuna veya{' '}
        <strong className="font-semibold text-slate-800">sohbet</strong> ekranına geçebilirsiniz. Yönetici bir{' '}
        <Link to="/ayarlar" className="font-semibold text-teal-700 underline-offset-2 hover:underline">
          PIN
        </Link>{' '}
        tanımladıysa düzenleme için PIN gerekir; diğerleri salt okunur kullanır.
      </p>

      <div className="mt-2 rounded-xl border border-ls-line bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-800">Kayıtlı satır:</span>{' '}
        <span className="tabular-nums font-semibold text-teal-900">{parts.length}</span>
        <span className="mx-2 text-slate-300">·</span>
        <span className="text-slate-600">
          {hasAdminPin ? (isViewer ? 'Salt okunur modu' : 'Yönetici oturumu') : 'PIN yok — herkes düzenleyebilir'}
        </span>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/kayit')}
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-bubble transition hover:brightness-110"
        >
          Depoyu aç (Kayıt)
        </button>
        <button
          type="button"
          onClick={() => navigate('/sohbet')}
          className="rounded-xl border border-ls-line bg-ls-surface px-5 py-3 text-sm font-semibold text-slate-800 shadow-card transition hover:bg-slate-50"
        >
          Depo sohbeti
        </button>
        <Link
          to="/ayarlar"
          className="inline-flex items-center justify-center rounded-xl border border-ls-line bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-card transition hover:bg-slate-50"
        >
          Ayarlar
        </Link>
      </div>

      {hasAdminPin && isViewer ? (
        <div className="mt-8 ls-card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Yönetici misiniz?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Stok eklemek veya adet değiştirmek için PIN ile oturum açın.
          </p>
          <button
            type="button"
            onClick={() => setUnlockOpen(true)}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-slate-800"
          >
            Yönetici PIN ile giriş
          </button>
        </div>
      ) : null}

      {hasAdminPin && isAdmin ? (
        <p className="mt-6 text-sm text-teal-800">
          Yönetici oturumu açık — depoyu düzenleyebilirsiniz. Üst menüden oturumu kapatabilirsiniz.
        </p>
      ) : null}
    </main>
  )
}
