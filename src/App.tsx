import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/RequireAuth'
import { AuthProvider } from '@/context/AuthContext'
import { InventoryProvider } from '@/context/InventoryContext'
import { SimpleAccessProvider } from '@/context/SimpleAccessContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AppShell } from '@/layout/AppShell'
import { AuthPage } from '@/pages/AuthPage'
import { DepoHomePage } from '@/pages/DepoHomePage'
import { HomePage } from '@/pages/HomePage'
import { KayitPage } from '@/pages/KayitPage'
import { SettingsPage } from '@/pages/SettingsPage'
import './App.css'

function AuthenticatedApp() {
  return (
    <InventoryProvider>
      <SimpleAccessProvider>
        <AppShell />
      </SimpleAccessProvider>
    </InventoryProvider>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="app-shell">
            <Routes>
              <Route path="/" element={<AuthPage />} />

              <Route element={<RequireAuth />}>
                <Route path="/app" element={<AuthenticatedApp />}>
                  <Route index element={<DepoHomePage />} />
                  <Route path="kayit" element={<KayitPage />} />
                  <Route path="sohbet" element={<HomePage />} />
                  <Route path="ayarlar" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="/kayit" element={<Navigate to="/app/kayit" replace />} />
              <Route path="/sohbet" element={<Navigate to="/app/sohbet" replace />} />
              <Route path="/ayarlar" element={<Navigate to="/app/ayarlar" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  )
}
