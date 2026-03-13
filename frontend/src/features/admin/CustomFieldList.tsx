import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useDeleteCustomField, useReorderCustomFields } from './useCustomFields'
import { EditCustomFieldDialog } from './EditCustomFieldDialog'
import { FIELD_TYPE_LABELS, OBLIGATION_LABELS } from './custom-field-constants'
import type { CustomFieldResponse } from './types'

interface CustomFieldListProps {
  fields: CustomFieldResponse[]
  allFields: CustomFieldResponse[]
}

export function CustomFieldList({ fields, allFields }: CustomFieldListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fieldToDelete, setFieldToDelete] = useState<CustomFieldResponse | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [fieldToEdit, setFieldToEdit] = useState<CustomFieldResponse | null>(null)

  const deleteMutation = useDeleteCustomField()
  const reorderMutation = useReorderCustomFields()

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucun champ personnalisé. Ajoutez votre premier champ pour adapter les formulaires à votre métier.
      </p>
    )
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    try {
      const reordered = [...allFields]
      const fieldIndex = reordered.findIndex(f => f.id === fields[index].id)
      const prevIndex = reordered.findIndex(f => f.id === fields[index - 1].id)
      ;[reordered[fieldIndex], reordered[prevIndex]] = [reordered[prevIndex], reordered[fieldIndex]]
      await reorderMutation.mutateAsync({ fieldIds: reordered.map(f => f.id) })
    } catch {
      toast.error('Erreur lors du réordonnancement')
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index === fields.length - 1) return
    try {
      const reordered = [...allFields]
      const fieldIndex = reordered.findIndex(f => f.id === fields[index].id)
      const nextIndex = reordered.findIndex(f => f.id === fields[index + 1].id)
      ;[reordered[fieldIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[fieldIndex]]
      await reorderMutation.mutateAsync({ fieldIds: reordered.map(f => f.id) })
    } catch {
      toast.error('Erreur lors du réordonnancement')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!fieldToDelete) return
    try {
      await deleteMutation.mutateAsync(fieldToDelete.id)
      toast.success('Champ supprimé')
      setDeleteDialogOpen(false)
      setFieldToDelete(null)
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <Card key={field.id} size="sm">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-6 text-center">{field.displayOrder + 1}</span>
                <span className="font-medium">{field.label}</span>
                <Badge variant="secondary">{FIELD_TYPE_LABELS[field.fieldType] ?? field.fieldType}</Badge>
                <Badge variant="outline">{OBLIGATION_LABELS[field.obligationLevel] ?? field.obligationLevel}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || reorderMutation.isPending}
                  aria-label="Monter"
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === fields.length - 1 || reorderMutation.isPending}
                  aria-label="Descendre"
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => { setFieldToEdit(field); setEditDialogOpen(true) }}
                  aria-label="Modifier"
                >
                  ✎
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => { setFieldToDelete(field); setDeleteDialogOpen(true) }}
                  aria-label="Supprimer"
                >
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le champ « {fieldToDelete?.label} » ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Les données existantes ne seront pas impactées.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {fieldToEdit && (
        <EditCustomFieldDialog
          open={editDialogOpen}
          onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setFieldToEdit(null) }}
          field={fieldToEdit}
        />
      )}
    </>
  )
}
