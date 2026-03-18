import { Link } from 'react-router'
import { Users } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'

export function Sidebar() {
  const { user } = useAuth()
  const role = user?.role

  return (
    <aside className="hidden w-64 border-r bg-sidebar text-sidebar-foreground md:block">
      <div className="p-4 space-y-2">
        {(role === 'Admin' || role === 'Chef' || role === 'Secretaire') && (
          <Link
            to="/clients"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Users className="h-4 w-4" />
            Clients
          </Link>
        )}
        {role === 'Admin' && (
          <Link
            to="/admin"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            Administration
          </Link>
        )}
      </div>
    </aside>
  )
}
