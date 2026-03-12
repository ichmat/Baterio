import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserManagement } from '@/features/admin/UserManagement'
import { CompanySettings } from '@/features/admin/CompanySettings'
import { SubscriptionInfo } from '@/features/admin/SubscriptionInfo'

export function AdminPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="company">Entreprise</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        <TabsContent value="company" className="space-y-6">
          <SubscriptionInfo />
          <CompanySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
