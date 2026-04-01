import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ArrowLeft, Users, FileText, Building2, Trash2, Edit2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EntityLinksBar } from '@/components/EntityLinksBar'
import type { EntityLink } from '@/components/EntityLinksBar'
import { toast } from 'sonner'
import { StatusPipeline } from '@/features/devis/StatusPipeline'
import { CommentSection } from '@/features/devis/CommentSection'
import { FileUploadZone } from '@/features/devis/FileUploadZone'
import { MediaGallery } from '@/features/devis/MediaGallery'
import { TimelineCompact } from '@/features/audit/TimelineCompact'
import { TimelineFull } from '@/features/audit/TimelineFull'
import { useAttachments } from '@/features/files/useFiles'
import { useSite, useDeleteSite } from './useSites'
import { SITE_STATUS_CONFIG, SITE_PIPELINE_CONFIG } from './status-config'
import { SiteStatusActions } from './SiteStatusActions'
import { EditChantierForm } from './EditChantierForm'

interface ChantierDetailPageProps {
  siteId?: number
  showBackButton?: boolean
}

export function ChantierDetailPage({ siteId: propSiteId, showBackButton = true }: ChantierDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const siteId = propSiteId ?? Number(id)
  const { data: site, isLoading, isError, refetch } = useSite(siteId)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const deleteMutation = useDeleteSite()
  const { data: attachments } = useAttachments('Site', siteId)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || !site) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-destructive">Chantier introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/chantiers')}>
          Retour aux chantiers
        </Button>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EditChantierForm site={site} onSuccess={() => setIsEditing(false)} />
      </div>
    )
  }

  const statusCfg = SITE_STATUS_CONFIG[site.status] ?? SITE_STATUS_CONFIG.Planned
  const StatusIcon = statusCfg.icon

  const links: EntityLink[] = [
    { label: 'Voir le client', href: `/clients/${site.customerId}`, icon: Users },
  ]
  if (site.quoteId) {
    links.push({ label: 'Voir le devis', href: `/devis/${site.quoteId}`, icon: FileText })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* 1. Header */}
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={() => navigate('/chantiers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{site.reference}</h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}>
              <StatusIcon className="h-3 w-3" />
              {statusCfg.label}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">{site.subject}</p>
        </div>
        <div className="flex items-center gap-2">
          {(attachments?.length ?? 0) > 0 && (
            <Button variant="outline" size="sm" onClick={() => setGalleryOpen(true)}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Galerie médias
            </Button>
          )}
          <Button size="sm" className="bg-yellow-500" onClick={() => setIsEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* 2. StatusPipeline + SiteStatusActions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusPipeline currentStatus={site.status} config={SITE_PIPELINE_CONFIG} />
        <SiteStatusActions siteId={site.id} currentStatus={site.status} onStatusChange={() => refetch()} />
      </div>

      {/* 3. EntityLinksBar */}
      <EntityLinksBar links={links} />

      {/* 4. Informations */}
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Client</dt>
              <dd className="mt-1">{site.customerName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Adresse du chantier</dt>
              <dd className="mt-1">{site.siteAddress}</dd>
            </div>
            {site.startDate && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Date de début</dt>
                <dd className="mt-1">{new Date(site.startDate + 'T00:00:00').toLocaleDateString('fr-FR')}</dd>
              </div>
            )}
            {site.endDate && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Date de fin prévue</dt>
                <dd className="mt-1">{new Date(site.endDate + 'T00:00:00').toLocaleDateString('fr-FR')}</dd>
              </div>
            )}
            {site.quoteReference && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Devis lié</dt>
                <dd className="mt-1">{site.quoteReference}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Créé par</dt>
              <dd className="mt-1">{site.createdByName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Date de création</dt>
              <dd className="mt-1">{new Date(site.createdAt).toLocaleDateString('fr-FR')}</dd>
            </div>
            {site.customFields && site.customFields.map((cf) => (
              <div key={cf.id}>
                <dt className="text-sm font-medium text-muted-foreground">{cf.label}</dt>
                <dd className="mt-1">{cf.value != null ? String(cf.value) : '—'}</dd>
              </div>
            ))}
          </dl>
          {site.notes && (
            <div className="mt-4 border-t pt-4">
              <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">{site.notes}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Historique compact */}
      <TimelineCompact
        entityType="Site"
        entityId={site.id}
        onViewDetails={() => setTimelineOpen(true)}
      />

      {/* 6. Commentaires */}
      <CommentSection entityType="Site" entityId={site.id} />

      {/* 7. Pièces jointes */}
      <FileUploadZone entityType="Site" entityId={site.id} />

      {/* 8. Dialogs */}
      <TimelineFull
        entityType="Site"
        entityId={site.id}
        entityLabel={`${site.reference} — ${site.subject}`}
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
      />

      <MediaGallery
        entityType="Site"
        entityId={site.id}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le chantier {site.reference} ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le chantier sera définitivement supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                try {
                  await deleteMutation.mutateAsync(siteId)
                  toast.success('Chantier supprimé')
                  navigate('/chantiers')
                } catch (err: unknown) {
                  const apiError = err as { message?: string }
                  toast.error(apiError?.message ?? 'Erreur lors de la suppression')
                }
              }}
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
