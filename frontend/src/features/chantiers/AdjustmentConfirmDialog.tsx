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

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync(
        adjustments.map(a => ({
          assignmentId: a.assignmentId,
          newStartDatetime: a.newStartDatetime,
          newEndDatetime: a.newEndDatetime,
        }))
      )
      toast.success('Attributions ajustées')
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
          Les dates du chantier ont été modifiées. Les attributions suivantes seront ajustées :
        </p>
        <div className="space-y-2">
          {adjustments.map(a => (
            <div key={a.assignmentId} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-medium">{a.userFullName}</p>
              <p className="text-muted-foreground">
                {fmtDt(a.oldStartDatetime)} - {fmtDt(a.oldEndDatetime)} → {fmtDt(a.newStartDatetime)} - {fmtDt(a.newEndDatetime)}
              </p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onCancel(); onOpenChange(false) }}>
            Annuler les modifications
          </Button>
          <Button onClick={handleConfirm} disabled={confirmMutation.isPending}>
            {confirmMutation.isPending ? 'Ajustement...' : 'Confirmer les ajustements'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
