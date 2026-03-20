import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ArrowLeft, Edit2, Users, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EntityLinksBar } from '@/components/EntityLinksBar'
import { formatMontant } from '@/lib/format-montant'
import { useQuote } from './useDevis'
import { STATUS_CONFIG } from './status-config'
import { EditDevisForm } from './EditDevisForm'
import { StatusPipeline } from './StatusPipeline'
import { StatusActions } from './StatusActions'
import { QuickEditPriority } from './QuickEditPriority'
import { QuickEditReminderDate } from './QuickEditReminderDate'
import { CommentSection } from './CommentSection'
import { FileUploadZone } from './FileUploadZone'
import { MediaGallery } from './MediaGallery'
import { useAttachments } from '@/features/files/useFiles'

export function DevisDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const quoteId = Number(id)
  const { data: quote, isLoading, isError, refetch } = useQuote(quoteId)
  const [isEditing, setIsEditing] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const { data: attachments } = useAttachments('Quote', quoteId)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || !quote) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <p className="text-destructive">Devis introuvable</p>
        <Button variant="outline" onClick={() => navigate('/devis')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux devis
        </Button>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EditDevisForm quote={quote} onSuccess={() => setIsEditing(false)} />
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.Draft
  const StatusIcon = statusCfg.icon

  const totalHT = quote.amountExclTax ?? 0
  const totalTTC = quote.amountInclTax ?? 0
  const tva = totalTTC - totalHT

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/devis')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{quote.reference}</h1>
            <p className="text-muted-foreground">{quote.subject}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${statusCfg.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusCfg.label}
          </span>
          <QuickEditPriority quote={quote} onUpdate={() => refetch()} />
          {(attachments?.length ?? 0) > 0 && (
            <Button variant="outline" size="sm" onClick={() => setGalleryOpen(true)}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Galerie médias
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>

      {/* StatusPipeline + StatusActions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusPipeline currentStatus={quote.status} />
        <div className="flex items-center gap-2">
          <StatusActions quoteId={quote.id} currentStatus={quote.status} onStatusChange={() => refetch()} />
          {quote.status === 'Accepted' && (
            <Button disabled title="Disponible prochainement">
              Créer le chantier
            </Button>
          )}
        </div>
      </div>

      {/* Quick-edit date de relance */}
      <div className="flex items-center gap-4">
        <QuickEditReminderDate quote={quote} onUpdate={() => refetch()} />
      </div>

      {/* EntityLinksBar */}
      <EntityLinksBar
        links={[
          { label: 'Voir le client', href: `/clients/${quote.customerId}`, icon: Users },
        ]}
      />

      {/* Informations */}
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Client</dt>
              <dd className="font-medium">{quote.customerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Créé par</dt>
              <dd>{quote.createdByName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Date de création</dt>
              <dd>{new Date(quote.createdAt).toLocaleDateString('fr-FR')}</dd>
            </div>
            {quote.validityDate && (
              <div>
                <dt className="text-muted-foreground">Date de validité</dt>
                <dd>{new Date(quote.validityDate).toLocaleDateString('fr-FR')}</dd>
              </div>
            )}
            {quote.estimatedDuration && (
              <div>
                <dt className="text-muted-foreground">Durée estimée</dt>
                <dd>{quote.estimatedDuration}</dd>
              </div>
            )}
            {quote.siteAddress && (
              <div>
                <dt className="text-muted-foreground">Adresse du chantier</dt>
                <dd>{quote.siteAddress}</dd>
              </div>
            )}
            {quote.notes && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="whitespace-pre-wrap">{quote.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Lignes de devis */}
      {quote.lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lignes de devis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">PU HT</TableHead>
                  <TableHead className="text-right">Total HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">{formatMontant(line.unitPriceExclTax)}</TableCell>
                    <TableCell className="text-right">{formatMontant(line.lineTotalExclTax)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">Total HT</TableCell>
                  <TableCell className="text-right font-medium">{formatMontant(totalHT)}</TableCell>
                </TableRow>
                {quote.taxRate != null && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-right text-muted-foreground">TVA ({quote.taxRate}%)</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMontant(tva)}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">Total TTC</TableCell>
                  <TableCell className="text-right font-bold">{formatMontant(totalTTC)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Commentaires */}
      <CommentSection quoteId={quote.id} />

      {/* Pièces jointes */}
      <FileUploadZone quoteId={quote.id} />

      {/* Galerie médias */}
      <MediaGallery quoteId={quote.id} open={galleryOpen} onOpenChange={setGalleryOpen} />

      {/* Mentions légales */}
      <Card>
        <CardHeader>
          <CardTitle>Mentions légales</CardTitle>
        </CardHeader>
        <CardContent>
          {quote.legalMentions ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quote.legalMentions}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Il manque <strong>les informations légales</strong> pour afficher les mentions — compléter dans Configuration
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
