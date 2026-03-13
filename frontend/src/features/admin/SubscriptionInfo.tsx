import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSubscriptionInfo } from './useCompany'

export function SubscriptionInfo() {
  const { data: info, isLoading, isError } = useSubscriptionInfo()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Impossible de charger les informations d'abonnement.</p>
        </CardContent>
      </Card>
    )
  }

  if (!info) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonnement</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Tenant</dt>
            <dd className="text-sm">{info.tenantName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Plan actuel</dt>
            <dd className="text-sm">{info.plan}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Utilisateurs actifs</dt>
            <dd className="text-sm">
              {info.activeUsers} / {info.maxUsers != null ? info.maxUsers : 'Illimité'}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
