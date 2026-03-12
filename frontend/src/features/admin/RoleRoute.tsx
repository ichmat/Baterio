import { Navigate } from 'react-router'
import { useAuth } from '@/features/auth/useAuth'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'

interface RoleRouteProps {
  role: string
  children: React.ReactNode
}

export function RoleRoute({ role, children }: RoleRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const toastShown = useRef(false)

  const hasAccess = isAuthenticated && user?.role === role

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasAccess && !toastShown.current) {
      toastShown.current = true
      toast.error('Accès interdit')
    }
  }, [isLoading, isAuthenticated, hasAccess])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
