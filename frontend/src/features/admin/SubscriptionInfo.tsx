import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { getSubscriptionInfo } from './api'
import type { SubscriptionInfoResponse } from './types'

export function SubscriptionInfo() {
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState<SubscriptionInfoResponse | null>(null)
  const [error, setError] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const data = await getSubscriptionInfo()
      setInfo(data)
    } catch {
      setError(true)
      toast.error('Erreur lors du chargement des informations d\'abonnement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (error) {
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
