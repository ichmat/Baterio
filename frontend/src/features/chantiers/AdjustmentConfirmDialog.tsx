import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirmAdjustments } from './useSites'
import type { ProposedAdjustment } from './types'

interface AdjustmentConfirmDialogProps {
  siteId: number
  adjustments: ProposedAdjustment[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmed: () => void
  onCancel: () => void
}

function fmtDt(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function AdjustmentConfirmDialog({ siteId, adjustments, open, onOpenChange, onConfirmed, onCancel }: AdjustmentConfirmDialogProps) {
  const confirmMutation = useConfirmAdjustments(siteId)

  const hasDeletes = adjustments.some(a => a.action === 'delete')
  const hasAdjusts = adjustments.some(a => a.action === 'adjust')

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync(
        adjustments.map(a => ({
          assignmentId: a.assignmentId,
          newStartDatetime: a.newStartDatetime,
          newEndDatetime: a.newEndDatetime,
          action: a.action,
        }))
      )
      toast.success(hasDeletes && !hasAdjusts ? 'Attributions supprimées' : 'Attributions ajustées')
      onConfirmed()
      onOpenChange(false)
    } catch {
      toast.error("Erreur lors de l'ajustement")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Ajustements nécessaires
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {hasDeletes && !hasAdjusts
            ? "Les dates du chantier ont été supprimées. Les attributions avec des dates précises suivantes seront supprimées :"
            : "Les dates du chantier ont été enregistrées. Les attributions suivantes dépassent les nouvelles dates et doivent être ajustées :"}
        </p>
        <div className="space-y-2">
          {adjustments.map(a => (
            <div key={a.assignmentId} className={`rounded-md border p-3 text-sm ${a.action === 'delete' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className="font-medium">{a.userFullName}</p>
              <p className="text-muted-foreground">
                {a.action === 'delete'
                  ? `${fmtDt(a.oldStartDatetime)} - ${fmtDt(a.oldEndDatetime)} — sera supprimée`
                  : `${fmtDt(a.oldStartDatetime)} - ${fmtDt(a.oldEndDatetime)} → ${fmtDt(a.newStartDatetime)} - ${fmtDt(a.newEndDatetime)}`}
              </p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onCancel(); onOpenChange(false) }}>
            Ignorer les ajustements
          </Button>
          <Button onClick={handleConfirm} disabled={confirmMutation.isPending} variant={hasDeletes && !hasAdjusts ? 'destructive' : 'default'}>
            {confirmMutation.isPending ? 'Traitement...' : hasDeletes && !hasAdjusts ? 'Confirmer les suppressions' : 'Confirmer les ajustements'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
