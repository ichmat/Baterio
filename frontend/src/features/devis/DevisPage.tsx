import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMontant } from '@/lib/format-montant'
import { useQuotes } from './useDevis'
import { STATUS_CONFIG, PRIORITY_CONFIG } from './status-config'

export function DevisPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuotes()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Devis</h1>
        <Button onClick={() => navigate('/devis/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau devis
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {data && data.data.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          Aucun devis pour le moment
        </p>
      )}

      {data && data.data.length > 0 && (
        <div className="space-y-3">
          {data.data.map((quote) => {
            const statusCfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.Draft
            const StatusIcon = statusCfg.icon
            const priorityCfg = PRIORITY_CONFIG[quote.priority] ?? PRIORITY_CONFIG.Normal

            return (
              <Card
                key={quote.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => navigate(`/devis/${quote.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{quote.reference}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${priorityCfg.color}`}>
                        {priorityCfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {quote.customerName} — {quote.subject}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {quote.amountInclTax != null ? formatMontant(quote.amountInclTax) : '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(quote.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
