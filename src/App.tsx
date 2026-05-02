import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { InventoryProvider } from '@/context/InventoryContext'
import { SimpleAccessProvider } from '@/context/SimpleAccessContext'
import { AppShell } from '@/layout/AppShell'
import { GirisPage } from '@/pages/GirisPage'
import { HomePage } from '@/pages/HomePage'
import { KayitPage } from '@/pages/KayitPage'
import { SettingsPage } from '@/pages/SettingsPage'
import './App.css'

export default function App() {
  return (
    <HashRouter>
      <InventoryProvider>
        <SimpleAccessProvider>
          <div className="app-shell flex h-full min-h-0 flex-1 flex-col">
            <Routes>
              <Route path="/" element={<AppShell />}>
                <Route index element={<GirisPage />} />
                <Route path="sohbet" element={<HomePage />} />
                <Route path="kayit" element={<KayitPage />} />
                <Route path="ayarlar" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </SimpleAccessProvider>
      </InventoryProvider>
    </HashRouter>
  )
}
