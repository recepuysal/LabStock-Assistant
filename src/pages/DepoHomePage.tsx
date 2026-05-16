import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminUnlockModal } from '@/components/AdminUnlockModal'
import { NavIcon } from '@/components/NavIcon'
import { useAuth } from '@/context/AuthContext'
import { useInventory } from '@/context/InventoryContext'
import { useSimpleAccess } from '@/context/SimpleAccessContext'
import { LS_START_ON_KAYIT } from '@/lib/settingsKeys'

export function DepoHomePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { parts } = useInventory()
  const { isViewer, isAdmin, hasAdminPin, tryUnlock } = useSimpleAccess()
  const [unlockOpen, setUnlockOpen] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_START_ON_KAYIT) === '1') {
        navigate('/app/kayit', { replace: true })
      }
    } catch {
      /* yoksay */
    }
  }, [navigate])

  async function onUnlockSubmit(pin: string) {
    const ok = await tryUnlock(pin)
    if (ok) navigate('/app/kayit')
    return ok
  }

  return (
    <div className="ls-page flex max-w-3xl flex-col justify-start">
      <AdminUnlockModal open={unlockOpen} onClose={() => setUnlockOpen(false)} onSubmit={onUnlockSubmit} />

      <header className="ls-page-header mb-1">
        <h1>Hoş geldiniz</h1>
        <p>
          {user?.email ? (
            <>
              <span className="text-ls-text">{user.email}</span> — stok, sohbet ve yedekleme.
            </>
          ) : (
            'Stok kaydı, depo sohbeti ve yedekleme tek yerde.'
          )}
        </p>
      </header>

      <div className="ls-card flex items-center gap-4 p-5">
        <p className="text-3xl font-semibold tabular-nums text-ls-accent">{parts.length}</p>
        <div>
          <p className="text-sm font-medium text-ls-text">Kayıtlı parça</p>
          <p className="text-xs text-ls-text-muted">
            {hasAdminPin
              ? isViewer
                ? 'Salt okunur mod'
                : 'Yönetici oturumu açık'
              : 'Tam erişim'}
          </p>
        </div>
      </div>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => navigate('/app/kayit')} className="ls-action-tile">
          <NavIcon name="inventory" className="h-6 w-6 text-ls-accent" />
          <span className="text-sm font-semibold text-ls-text">Stok listesi</span>
          <span className="text-xs text-ls-text-muted">Kayıt sayfasında ara ve düzenle</span>
        </button>
        <button type="button" onClick={() => navigate('/app/sohbet')} className="ls-action-tile">
          <NavIcon name="chat" className="h-6 w-6 text-ls-accent" />
          <span className="text-sm font-semibold text-ls-text">Depo sohbeti</span>
          <span className="text-xs text-ls-text-muted">Stok hakkında soru sorun</span>
        </button>
      </div>

      <div className="mt-1 flex flex-wrap gap-2">
        <button type="button" onClick={() => navigate('/app/ayarlar')} className="ls-btn-ghost">
          Ayarlar ve yedekleme
        </button>
        <button
          type="button"
          onClick={() => {
            void logout()
            navigate('/', { replace: true })
          }}
          className="ls-btn-ghost text-ls-text-muted"
        >
          Çıkış yap
        </button>
      </div>

      {hasAdminPin && isViewer ? (
        <div className="ls-card-muted mt-4 p-4">
          <p className="text-sm text-ls-text-muted">Düzenleme için yönetici PIN gerekir.</p>
          <button type="button" onClick={() => setUnlockOpen(true)} className="ls-btn-primary mt-3 w-full sm:w-auto">
            PIN ile giriş
          </button>
        </div>
      ) : null}

      {hasAdminPin && isAdmin ? (
        <p className="mt-3 text-center text-xs font-medium text-ls-accent">Yönetici oturumu açık</p>
      ) : null}
    </div>
  )
}
