import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AdminUnlockModal } from '@/components/AdminUnlockModal'
import { NAV_ICON, NavIcon } from '@/components/NavIcon'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { useInventory } from '@/context/InventoryContext'
import { useSimpleAccess } from '@/context/SimpleAccessContext'

const NAV: Array<{
  to: string
  end: boolean
  label: string
  testId?: string
}> = [
  { to: '/app', end: true, label: 'Depo' },
  { to: '/app/kayit', end: false, label: 'Kayıt', testId: 'nav-kayit' },
  { to: '/app/sohbet', end: false, label: 'Sohbet', testId: 'nav-sohbet' },
  { to: '/app/ayarlar', end: false, label: 'Ayarlar', testId: 'nav-ayarlar' },
]

function navIconFor(path: string) {
  if (path === '/app' || path === '/') return NAV_ICON['/']!
  const key = path.replace('/app', '') || '/'
  return NAV_ICON[key] ?? NAV_ICON['/kayit']!
}

export function AppShell() {
  const navigate = useNavigate()
  const { parts } = useInventory()
  const { logout } = useAuth()
  const { isViewer, hasAdminPin, tryUnlock, lockAdminSession } = useSimpleAccess()
  const [unlockOpen, setUnlockOpen] = useState(false)
  const location = useLocation()

  const pageTitle =
    NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))?.label ??
    'LabStock'

  return (
    <div className="ls-shell">
      <AdminUnlockModal open={unlockOpen} onClose={() => setUnlockOpen(false)} onSubmit={tryUnlock} />

      <aside className="ls-sidebar hidden md:flex">
        <div className="ls-sidebar-brand">
          <NavLink
            to="/app"
            end
            className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ls-accent/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ls-accent text-sm font-bold text-ls-on-accent">
              LS
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ls-text">LabStock</p>
              <p className="truncate text-2xs text-ls-text-muted">Depo asistanı</p>
            </div>
          </NavLink>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Ana gezinme">
          {NAV.map(({ to, end, label, testId }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={testId}
              className={({ isActive }) => `ls-nav-item ${isActive ? 'ls-nav-item-active' : ''}`}
            >
              <NavIcon name={navIconFor(to)} className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-ls-line p-3">
          <div className="flex items-center justify-between rounded-lg bg-ls-muted px-3 py-2.5 text-xs">
            <span className="text-ls-text-muted">Kayıtlı parça</span>
            <span className="tabular-nums text-sm font-semibold text-ls-text">{parts.length}</span>
          </div>
          {hasAdminPin ? (
            isViewer ? (
              <button type="button" onClick={() => setUnlockOpen(true)} className="ls-btn-secondary w-full text-xs">
                PIN ile düzenle
              </button>
            ) : (
              <button type="button" onClick={() => lockAdminSession()} className="ls-btn-ghost w-full text-xs">
                Oturumu kapat
              </button>
            )
          ) : null}
          <ThemeToggle variant="sidebar" />
          <button
            type="button"
            onClick={() => {
              void logout()
              navigate('/', { replace: true })
            }}
            className="ls-btn-ghost w-full text-xs"
          >
            Çıkış yap
          </button>
        </div>
      </aside>

      <div className="ls-shell-body">
        <header className="ls-mobile-header md:hidden">
          <NavLink to="/app" end className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ls-accent text-[10px] font-bold text-ls-on-accent">
              LS
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ls-text">{pageTitle}</p>
              <p className="truncate text-2xs text-ls-text-muted">{parts.length} parça</p>
            </div>
          </NavLink>
          <div className="flex shrink-0 items-center gap-1.5">
            {hasAdminPin && isViewer ? (
              <button type="button" onClick={() => setUnlockOpen(true)} className="ls-badge-accent px-2 py-1 text-[10px]">
                Salt okunur
              </button>
            ) : null}
            <ThemeToggle variant="icon" />
          </div>
        </header>

        <main className="ls-main">
          <Outlet />
        </main>

        <nav className="ls-bottom-nav md:hidden" aria-label="Mobil gezinme">
          {NAV.map(({ to, end, label, testId }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={testId}
              className={({ isActive }) => `ls-bottom-nav-item ${isActive ? 'ls-bottom-nav-item-active' : ''}`}
            >
              <NavIcon name={navIconFor(to)} className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
