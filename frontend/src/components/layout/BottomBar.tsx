import { Link } from 'react-router'
import { Users, FileText, Building2 } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'

export function BottomBar() {
  const { user } = useAuth()
  const role = user?.role
  const showNav = role === 'Admin' || role === 'Chef' || role === 'Secretaire'

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-2 md:hidden">
      <div className="flex justify-around">
        {showNav && (
          <>
            <Link to="/clients" className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-5 w-5" />
              Clients
            </Link>
            <Link to="/devis" className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-5 w-5" />
              Devis
            </Link>
            <Link to="/chantiers" className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-5 w-5" />
              Chantiers
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
