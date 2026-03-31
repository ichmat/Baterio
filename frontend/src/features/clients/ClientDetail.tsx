import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Pencil, FileText, Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityLinksBar } from '@/components/EntityLinksBar'
import { TimelineCompact } from '@/features/audit/TimelineCompact'
import { TimelineFull } from '@/features/audit/TimelineFull'
import { useQuotes } from '@/features/devis/useDevis'
import { STATUS_CONFIG } from '@/features/devis/status-config'
import { formatMontant } from '@/lib/format-montant'
import { useCustomer } from './useCustomers'
import { EditClientDialog } from './EditClientDialog'

interface ClientDetailProps {
  customerId: number
  showBackButton?: boolean
  onBack?: () => void
}

export function ClientDetail({ customerId, showBackButton = false, onBack }: ClientDetailProps) {
  const navigate = useNavigate()
  const { data: customer, isLoading, isError } = useCustomer(customerId)
  const { data: quotesData } = useQuotes()
  const [editOpen, setEditOpen] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(false)

  const customerName = customer ? `${customer.lastName} ${customer.firstName}`.trim() : ''
  const customerQuotes = quotesData?.data.filter((q) => q.customerName === customerName) ?? []

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-64" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="mb-4 text-lg text-muted-foreground">Client introuvable</p>
        {showBackButton && onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && onBack && (
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-2xl font-bold">
            {customer.lastName} {customer.firstName}
          </h1>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Modifier
        </Button>
      </div>

      {/* EntityLinksBar — vide pour l'instant, prêt pour Epic 3/4 */}
      <EntityLinksBar links={[]} />

      {/* Grille principale */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Colonne gauche : Informations */}
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-muted-foreground">Téléphone : </span>
              <span>{customer.telephone || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email : </span>
              <span>{customer.email || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Adresse : </span>
              <span>{customer.address || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Créé le : </span>
              <span>{new Date(customer.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Colonne droite : Devis, Chantiers, Historique */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Devis associés
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customerQuotes.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Aucun devis pour ce client</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/devis/new')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un devis
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerQuotes.map((q) => {
                    const statusCfg = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.Draft
                    const StatusIcon = statusCfg.icon
                    return (
                      <div
                        key={q.id}
                        className="flex cursor-pointer items-center justify-between rounded-md border p-2 text-sm hover:bg-accent/50"
                        onClick={() => navigate(`/devis/${q.id}`)}
                      >
                        <div>
                          <span className="font-medium">{q.reference}</span>
                          <span className="ml-2 text-muted-foreground">{q.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </span>
                          {q.amountInclTax != null && (
                            <span className="text-xs font-medium">{formatMontant(q.amountInclTax)}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Chantiers associés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Aucun chantier pour ce client — les chantiers seront disponibles prochainement
              </p>
            </CardContent>
          </Card>

          <TimelineCompact
            entityType="Customer"
            entityId={customerId}
            onViewDetails={() => setTimelineOpen(true)}
          />
        </div>
      </div>

      <TimelineFull
        entityType="Customer"
        entityId={customerId}
        entityLabel={`${customer.lastName} ${customer.firstName}`}
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
      />

      <EditClientDialog customer={customer} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}
