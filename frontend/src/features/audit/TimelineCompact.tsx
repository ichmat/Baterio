import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAuditEvents } from './useAuditEvents'
import { formatAuditAction, formatAuditDate } from './format-audit'
import { AuditPayloadDisplay } from './AuditPayloadDisplay'

interface TimelineCompactProps {
  entityType: string
  entityId: number
  onViewDetails: () => void
}

export function TimelineCompact({ entityType, entityId, onViewDetails }: TimelineCompactProps) {
  const { data, isLoading } = useAuditEvents(entityType, entityId, 1, 5)
  const events = data?.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun historique</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const { label, icon: Icon } = formatAuditAction(event.action)
              return (
                <div key={event.id} className="flex items-start gap-2 text-sm">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    {label} par {event.userFullName}
                    <AuditPayloadDisplay
                      payload={event.payload}
                      action={event.action}
                      entityType={entityType}
                      compact
                    />
                    {' — '}{formatAuditDate(event.createdAt)}
                  </span>
                </div>
              )
            })}
            <Button variant="ghost" size="sm" className="w-full" onClick={onViewDetails}>
              Voir les détails →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
