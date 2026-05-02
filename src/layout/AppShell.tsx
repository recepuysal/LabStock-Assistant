import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { AdminUnlockModal } from '@/components/AdminUnlockModal'
import { useInventory } from '@/context/InventoryContext'
import { useSimpleAccess } from '@/context/SimpleAccessContext'

const pillBase =
  'rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2'

export function AppShell() {
  const { parts } = useInventory()
  const { isViewer, hasAdminPin, tryUnlock, lockAdminSession } = useSimpleAccess()
  const [unlockOpen, setUnlockOpen] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-mesh bg-ls-canvas text-slate-900">
      <AdminUnlockModal open={unlockOpen} onClose={() => setUnlockOpen(false)} onSubmit={tryUnlock} />
      <header className="shrink-0 border-b border-ls-line bg-ls-surface/90 shadow-bar backdrop-blur-md">
        <div className="mx-auto flex h-[3.25rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink
            to="/"
            end
            className="group flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-bold tracking-tight text-white shadow-bubble"
              aria-hidden
            >
              LS
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-900">LabStock</p>
              <p className="truncate text-2xs font-medium text-slate-500">Envanter asistanı</p>
            </div>
          </NavLink>

          <nav
            className="flex shrink-0 items-center gap-0.5 rounded-xl bg-slate-100/90 p-1 ring-1 ring-slate-200/80"
            aria-label="Ana gezinme"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${pillBase} ${isActive ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'}`
              }
            >
              Giriş
            </NavLink>
            <NavLink
              to="/sohbet"
              data-testid="nav-sohbet"
              className={({ isActive }) =>
                `${pillBase} ${isActive ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'}`
              }
            >
              Sohbet
            </NavLink>
            <NavLink
              to="/kayit"
              data-testid="nav-kayit"
              className={({ isActive }) =>
                `${pillBase} ${isActive ? 'bg-brand text-white shadow-bubble' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'}`
              }
            >
              Kayıt
            </NavLink>
            <NavLink
              to="/ayarlar"
              data-testid="nav-ayarlar"
              className={({ isActive }) =>
                `${pillBase} ${isActive ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'}`
              }
            >
              Ayarlar
            </NavLink>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {hasAdminPin ? (
              isViewer ? (
                <button
                  type="button"
                  onClick={() => setUnlockOpen(true)}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-amber-900 sm:px-3"
                >
                  Salt okunur
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => lockAdminSession()}
                  className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-teal-900 sm:px-3"
                  title="Bu sekmede yönetici oturumunu kapat"
                >
                  Yönetici
                </button>
              )
            ) : null}
            <div className="hidden items-center gap-2 sm:flex">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-slate-500">
                Kayıt
              </span>
              <span className="tabular-nums text-base font-semibold text-slate-900">{parts.length}</span>
            </div>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
