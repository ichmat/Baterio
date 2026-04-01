import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUpdateSiteStatus } from './useSites'

interface TransitionButton {
  label: string
  targetStatus: string
  variant: 'default' | 'secondary' | 'destructive'
  className?: string
  needsConfirmation: boolean
}

const SITE_TRANSITION_BUTTONS: Record<string, TransitionButton[]> = {
  Planned: [
    { label: 'Démarrer', targetStatus: 'InProgress', variant: 'default', needsConfirmation: false },
  ],
  InProgress: [
    { label: 'Mettre en pause', targetStatus: 'Paused', variant: 'secondary', needsConfirmation: false },
    { label: 'Terminer', targetStatus: 'Completed', variant: 'default', className: 'bg-green-600 text-white hover:bg-green-700', needsConfirmation: true },
  ],
  Paused: [
    { label: 'Reprendre', targetStatus: 'InProgress', variant: 'default', needsConfirmation: false },
    { label: 'Terminer', targetStatus: 'Completed', variant: 'default', className: 'bg-green-600 text-white hover:bg-green-700', needsConfirmation: true },
  ],
  Completed: [],
}

interface SiteStatusActionsProps {
  siteId: number
  currentStatus: string
  onStatusChange: () => void
}

export function SiteStatusActions({ siteId, currentStatus, onStatusChange }: SiteStatusActionsProps) {
  const [confirmTransition, setConfirmTransition] = useState<TransitionButton | null>(null)
  const [pendingTarget, setPendingTarget] = useState<string | null>(null)
  const { mutate, isPending } = useUpdateSiteStatus(siteId)

  const buttons = SITE_TRANSITION_BUTTONS[currentStatus] ?? []

  function handleClick(transition: TransitionButton) {
    if (transition.needsConfirmation) {
      setConfirmTransition(transition)
    } else {
      executeTransition(transition)
    }
  }

  function executeTransition(transition: TransitionButton) {
    setPendingTarget(transition.targetStatus)
    mutate(transition.targetStatus, {
      onSuccess: () => {
        toast.success('Statut mis à jour')
        setConfirmTransition(null)
        setPendingTarget(null)
        onStatusChange()
      },
      onError: () => {
        toast.error('Erreur lors du changement de statut')
        setPendingTarget(null)
      },
    })
  }

  if (buttons.length === 0) return null

  return (
    <>
      <div className="flex items-center gap-2">
        {buttons.map((btn) => {
          const isThisLoading = isPending && pendingTarget === btn.targetStatus
          return (
            <Button
              key={btn.targetStatus}
              variant={btn.variant}
              size="sm"
              disabled={isPending}
              className={btn.className}
              onClick={() => handleClick(btn)}
            >
              {isThisLoading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              {btn.label}
            </Button>
          )
        })}
      </div>

      <Dialog open={!!confirmTransition} onOpenChange={(open) => !open && setConfirmTransition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le changement de statut</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir <strong>{confirmTransition?.label.toLowerCase()}</strong> ce chantier ? Cette action est définitive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTransition(null)} disabled={isPending}>
              Annuler
            </Button>
            <Button
              variant={confirmTransition?.variant === 'secondary' ? 'default' : (confirmTransition?.variant ?? 'default')}
              className={confirmTransition?.className}
              onClick={() => confirmTransition && executeTransition(confirmTransition)}
              disabled={isPending}
            >
              {isPending && pendingTarget === confirmTransition?.targetStatus && (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              )}
              {confirmTransition?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
