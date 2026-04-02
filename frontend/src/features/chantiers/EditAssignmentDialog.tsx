import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useUpdateAssignment, useDeleteAssignment } from './useSites'
import type { SiteAssignment } from './types'

interface EditAssignmentDialogProps {
  siteId: number
  assignment: SiteAssignment
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toLocalDatetimeStr(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  // format: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EditAssignmentDialog({ siteId, assignment, open, onOpenChange }: EditAssignmentDialogProps) {
  const updateMutation = useUpdateAssignment(siteId)
  const deleteMutation = useDeleteAssignment(siteId)
  const [startDatetime, setStartDatetime] = useState(toLocalDatetimeStr(assignment.startDatetime))
  const [endDatetime, setEndDatetime] = useState(toLocalDatetimeStr(assignment.endDatetime))
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isFullDuration = !assignment.startDatetime && !assignment.endDatetime

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        assignmentId: assignment.id,
        data: {
          startDatetime: startDatetime || null,
          endDatetime: endDatetime || null,
        },
      })
      toast.success('Attribution modifiée')
      onOpenChange(false)
    } catch {
      toast.error('Erreur lors de la modification')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(assignment.id)
      toast.success('Attribution supprimée')
      onOpenChange(false)
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'attribution</DialogTitle>
          <DialogDescription>{assignment.userFullName}</DialogDescription>
        </DialogHeader>

        {isFullDuration ? (
          <p className="text-sm text-muted-foreground">Attribution pour toute la durée du chantier. Modifiez les dates pour passer en créneau précis, ou supprimez l'attribution.</p>
        ) : null}

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Début</Label>
            <Input type="datetime-local" value={startDatetime} onChange={e => setStartDatetime(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Fin</Label>
            <Input type="datetime-local" value={endDatetime} onChange={e => setEndDatetime(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {!confirmDelete ? (
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">Confirmer ?</span>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending}>
                Oui
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Non
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
