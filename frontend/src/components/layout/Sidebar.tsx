import { Link } from 'react-router'
import { useAuth } from '@/features/auth/useAuth'

export function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="hidden w-64 border-r bg-sidebar text-sidebar-foreground md:block">
      <div className="p-4 space-y-2">
        {user?.role === 'Admin' && (
          <Link
            to="/admin"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            Gestion utilisateurs
          </Link>
        )}
      </div>
    </aside>
  )
}
