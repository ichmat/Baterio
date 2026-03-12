import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { RoleRoute } from '@/features/admin/RoleRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { AdminPage } from '@/pages/AdminPage'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Batério</h1>
      <p className="text-muted-foreground">
        Application de gestion des travaux
      </p>
      <Button>Commencer</Button>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <HomePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleRoute role="Admin">
                  <AppLayout>
                    <AdminPage />
                  </AppLayout>
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
