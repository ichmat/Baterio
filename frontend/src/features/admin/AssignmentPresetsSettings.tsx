import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useAssignmentPresets, useUpdateAssignmentPresets } from '@/features/chantiers/useSites'
import type { AssignmentPreset } from '@/features/chantiers/types'

const DEFAULT_PRESETS: AssignmentPreset[] = [
  { label: 'Matin', startTime: '08:00', endTime: '12:00', order: 0 },
  { label: 'Après-midi', startTime: '12:00', endTime: '17:00', order: 1 },
  { label: 'Journée complète', startTime: '08:00', endTime: '17:00', order: 2 },
]

export function AssignmentPresetsSettings() {
  const { data: savedPresets, isLoading } = useAssignmentPresets()
  const updateMutation = useUpdateAssignmentPresets()
  const [presets, setPresets] = useState<AssignmentPreset[]>([])

  useEffect(() => {
    if (savedPresets) setPresets(savedPresets)
  }, [savedPresets])

  const updatePreset = (index: number, patch: Partial<AssignmentPreset>) => {
    setPresets(prev => prev.map((p, i) => i === index ? { ...p, ...patch } : p))
  }

  const addPreset = () => {
    setPresets(prev => [...prev, { label: '', startTime: '08:00', endTime: '17:00', order: prev.length }])
  }

  const removePreset = (index: number) => {
    setPresets(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i })))
  }

  const resetDefaults = () => {
    setPresets(DEFAULT_PRESETS)
  }

  const handleSave = async () => {
    for (const p of presets) {
      if (!p.label.trim()) {
        toast.error('Le libellé de chaque preset est obligatoire')
        return
      }
      if (!p.startTime || !p.endTime || p.endTime <= p.startTime) {
        toast.error(`Preset « ${p.label || '?'} » : l'heure de fin doit être après l'heure de début`)
        return
      }
    }
    try {
      await updateMutation.mutateAsync(presets)
      toast.success('Presets enregistrés')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Presets d'attribution</CardTitle>
        <Button variant="outline" size="sm" onClick={resetDefaults}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Réinitialiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {presets.map((preset, index) => (
          <div key={`${preset.order}-${preset.label}`} className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label>Libellé</Label>
              <Input value={preset.label} onChange={e => updatePreset(index, { label: e.target.value })} placeholder="Ex: Matin" />
            </div>
            <div className="w-28 space-y-1">
              <Label>Début</Label>
              <Input type="time" value={preset.startTime} onChange={e => updatePreset(index, { startTime: e.target.value })} />
            </div>
            <div className="w-28 space-y-1">
              <Label>Fin</Label>
              <Input type="time" value={preset.endTime} onChange={e => updatePreset(index, { endTime: e.target.value })} />
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => removePreset(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addPreset}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un preset
        </Button>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les presets'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
