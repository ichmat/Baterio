import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers } from '@/features/admin/useUsers'
import { useAssignmentPresets, useCreateBatchAssignment, useCheckConflicts } from './useSites'
import type { CreateAssignmentRequest, AssignmentConflict } from './types'

interface AssignWorkerDialogProps {
  siteId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AssignmentMode = 'full_duration' | 'date_preset' | 'range_preset' | 'free'

interface WorkerConfig {
  userId: number
  mode: AssignmentMode
  date: string
  startDate: string
  endDate: string
  presetStartTime: string
  presetEndTime: string
  startDatetime: string
  endDatetime: string
}

export function AssignWorkerDialog({ siteId, open, onOpenChange }: AssignWorkerDialogProps) {
  const { data: users } = useUsers()
  const { data: presets } = useAssignmentPresets()
  const batchMutation = useCreateBatchAssignment(siteId)
  const conflictCheck = useCheckConflicts(siteId)

  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [configs, setConfigs] = useState<Record<number, WorkerConfig>>({})
  const [conflicts, setConflicts] = useState<AssignmentConflict[]>([])
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState<CreateAssignmentRequest[] | null>(null)
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  const workers = users?.filter(u => u.role === 'Ouvrier' && u.isActive) ?? []

  const resetState = () => {
    setSelectedUserIds([])
    setConfigs({})
    setConflicts([])
    setShowConflictDialog(false)
    setPendingSubmit(null)
    setCheckingConflicts(false)
  }

  const resetAndClose = () => {
    resetState()
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    onOpenChange(newOpen)
  }

  const toggleWorker = (userId: number) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId)
      return [...prev, userId]
    })
    if (!configs[userId]) {
      setConfigs(prev => ({
        ...prev,
        [userId]: { userId, mode: 'full_duration', date: '', startDate: '', endDate: '', presetStartTime: '', presetEndTime: '', startDatetime: '', endDatetime: '' },
      }))
    }
  }

  const updateConfig = (userId: number, patch: Partial<WorkerConfig>) => {
    setConfigs(prev => ({ ...prev, [userId]: { ...prev[userId], ...patch } }))
  }

  const applyPreset = (userId: number, startTime: string, endTime: string) => {
    updateConfig(userId, { presetStartTime: startTime, presetEndTime: endTime })
  }

  const validateConfig = (cfg: WorkerConfig): string | null => {
    if (cfg.mode === 'date_preset') {
      if (!cfg.date) return 'La date est requise'
      if (!cfg.presetStartTime || !cfg.presetEndTime) return 'Sélectionnez un preset horaire'
    } else if (cfg.mode === 'range_preset') {
      if (!cfg.startDate || !cfg.endDate) return 'Les dates de début et fin sont requises'
      if (!cfg.presetStartTime || !cfg.presetEndTime) return 'Sélectionnez un preset horaire'
    } else if (cfg.mode === 'free') {
      if (!cfg.startDatetime || !cfg.endDatetime) return 'Les dates/heures sont requises'
      if (cfg.endDatetime <= cfg.startDatetime) return 'La date de fin doit être après la date de début'
    }
    return null
  }

  const buildRequests = (): CreateAssignmentRequest[] => {
    return selectedUserIds.map(userId => {
      const cfg = configs[userId]
      const base: CreateAssignmentRequest = { userId, mode: cfg.mode }
      if (cfg.mode === 'date_preset') {
        base.date = cfg.date
        base.presetStartTime = cfg.presetStartTime
        base.presetEndTime = cfg.presetEndTime
      } else if (cfg.mode === 'range_preset') {
        base.startDate = cfg.startDate
        base.endDate = cfg.endDate
        base.presetStartTime = cfg.presetStartTime
        base.presetEndTime = cfg.presetEndTime
      } else if (cfg.mode === 'free') {
        base.startDatetime = cfg.startDatetime
        base.endDatetime = cfg.endDatetime
      }
      return base
    })
  }

  const computeEffectiveDatetimes = (req: CreateAssignmentRequest, cfg: WorkerConfig): { start: string | null; end: string | null } => {
    if (cfg.mode === 'full_duration') return { start: null, end: null }
    if (cfg.mode === 'free') return { start: req.startDatetime ?? null, end: req.endDatetime ?? null }
    if (cfg.mode === 'date_preset' && cfg.date && cfg.presetStartTime && cfg.presetEndTime) {
      return { start: `${cfg.date}T${cfg.presetStartTime}`, end: `${cfg.date}T${cfg.presetEndTime}` }
    }
    if (cfg.mode === 'range_preset' && cfg.startDate && cfg.endDate && cfg.presetStartTime && cfg.presetEndTime) {
      return { start: `${cfg.startDate}T${cfg.presetStartTime}`, end: `${cfg.endDate}T${cfg.presetEndTime}` }
    }
    return { start: null, end: null }
  }

  const handleSubmit = async () => {
    // Validate all configs
    for (const userId of selectedUserIds) {
      const cfg = configs[userId]
      const error = validateConfig(cfg)
      if (error) {
        const worker = workers.find(w => w.id === userId)
        toast.error(`${worker?.lastName ?? 'Ouvrier'} : ${error}`)
        return
      }
    }

    const requests = buildRequests()

    // Check conflicts for all workers in parallel
    setCheckingConflicts(true)
    try {
      const conflictPromises = requests.map(async (req) => {
        const cfg = configs[req.userId]
        const { start, end } = computeEffectiveDatetimes(req, cfg)
        return conflictCheck.mutateAsync({
          userId: req.userId,
          startDatetime: start,
          endDatetime: end,
        })
      })

      const results = await Promise.all(conflictPromises)
      const allConflicts = results.flat()

      if (allConflicts.length > 0) {
        setConflicts(allConflicts)
        setPendingSubmit(requests)
        setShowConflictDialog(true)
        return
      }
    } catch {
      toast.error('Erreur lors de la vérification des conflits')
      return
    } finally {
      setCheckingConflicts(false)
    }

    await doSubmit(requests)
  }

  const doSubmit = async (requests: CreateAssignmentRequest[]) => {
    try {
      await batchMutation.mutateAsync({ assignments: requests })
      toast.success('Équipe attribuée')
      resetAndClose()
    } catch {
      toast.error("Erreur lors de l'attribution")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Attribuer l'équipe
            </DialogTitle>
          </DialogHeader>

          {/* Workers list */}
          <div className="space-y-3">
            <Label>Sélectionner les ouvriers</Label>
            {workers.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun ouvrier actif</p>
            )}
            {workers.map(worker => {
              const isSelected = selectedUserIds.includes(worker.id)
              return (
                <div key={worker.id} className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer rounded-md border p-3 hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleWorker(worker.id)}
                      className="h-4 w-4"
                    />
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {worker.firstName?.[0]}{worker.lastName?.[0]}
                      </div>
                      <span className="font-medium">{worker.lastName} {worker.firstName}</span>
                    </div>
                  </label>

                  {isSelected && configs[worker.id] && (
                    <div className="ml-10 space-y-2 rounded-md border p-3 bg-muted/50">
                      <div className="flex flex-wrap gap-2">
                        {(['full_duration', 'date_preset', 'range_preset', 'free'] as AssignmentMode[]).map(mode => (
                          <Button
                            key={mode}
                            type="button"
                            size="sm"
                            variant={configs[worker.id].mode === mode ? 'default' : 'outline'}
                            onClick={() => updateConfig(worker.id, { mode })}
                          >
                            {mode === 'full_duration' && 'Toute la durée'}
                            {mode === 'date_preset' && 'Date + preset'}
                            {mode === 'range_preset' && 'Plage + preset'}
                            {mode === 'free' && 'Datetime libre'}
                          </Button>
                        ))}
                      </div>

                      {configs[worker.id].mode === 'date_preset' && (
                        <div className="space-y-2">
                          <Input type="date" value={configs[worker.id].date} onChange={e => updateConfig(worker.id, { date: e.target.value })} />
                          <div className="flex flex-wrap gap-2">
                            {presets?.map(p => (
                              <Button key={p.label} type="button" size="sm" variant="outline"
                                onClick={() => applyPreset(worker.id, p.startTime, p.endTime)}
                                className={configs[worker.id].presetStartTime === p.startTime && configs[worker.id].presetEndTime === p.endTime ? 'border-primary' : ''}>
                                {p.label} ({p.startTime}-{p.endTime})
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {configs[worker.id].mode === 'range_preset' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input type="date" value={configs[worker.id].startDate} onChange={e => updateConfig(worker.id, { startDate: e.target.value })} placeholder="Date début" />
                            <Input type="date" value={configs[worker.id].endDate} onChange={e => updateConfig(worker.id, { endDate: e.target.value })} placeholder="Date fin" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {presets?.map(p => (
                              <Button key={p.label} type="button" size="sm" variant="outline"
                                onClick={() => applyPreset(worker.id, p.startTime, p.endTime)}
                                className={configs[worker.id].presetStartTime === p.startTime && configs[worker.id].presetEndTime === p.endTime ? 'border-primary' : ''}>
                                {p.label} ({p.startTime}-{p.endTime})
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {configs[worker.id].mode === 'free' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="datetime-local" value={configs[worker.id].startDatetime} onChange={e => updateConfig(worker.id, { startDatetime: e.target.value })} />
                          <Input type="datetime-local" value={configs[worker.id].endDatetime} onChange={e => updateConfig(worker.id, { endDatetime: e.target.value })} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={selectedUserIds.length === 0 || batchMutation.isPending || checkingConflicts}>
              {checkingConflicts ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification...</>
              ) : batchMutation.isPending ? 'Attribution...' : `Attribuer (${selectedUserIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict warning dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {conflicts.some(c => c.type === 'conflict') ? 'Conflits détectés' : 'Informations'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {conflicts.map((c, i) => (
              <div key={i} className={`rounded-md p-3 text-sm ${c.type === 'conflict' ? 'bg-red-50 border-red-200 border' : 'bg-amber-50 border-amber-200 border'}`}>
                {c.message}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConflictDialog(false)}>Annuler</Button>
            <Button onClick={async () => {
              setShowConflictDialog(false)
              if (pendingSubmit) await doSubmit(pendingSubmit)
            }}>
              Confirmer malgré les conflits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
