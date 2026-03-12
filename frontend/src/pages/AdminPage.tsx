import { UserManagement } from '@/features/admin/UserManagement'
import { Toaster } from '@/components/ui/sonner'

export function AdminPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <UserManagement />
      <Toaster />
    </div>
  )
}
