import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface UserStatusToggleProps {
  userId: number
  userName: string
  isActive: boolean
  onDeactivate: (id: number) => Promise<void>
  onReactivate: (id: number) => Promise<void>
}

export function UserStatusToggle({ userId, userName, isActive, onDeactivate, onReactivate }: UserStatusToggleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggle = () => {
    if (isActive) {
      setConfirmOpen(true)
    } else {
      handleReactivate()
    }
  }

  const handleDeactivate = async () => {
    setLoading(true)
    try {
      await onDeactivate(userId)
      setConfirmOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleReactivate = async () => {
    setLoading(true)
    try {
      await onReactivate(userId)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Switch
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={loading}
        aria-label={isActive ? 'Désactiver' : 'Réactiver'}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver l'utilisateur</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir désactiver le compte de {userName} ? L'utilisateur ne pourra plus se connecter.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={loading}>
              {loading ? 'Désactivation...' : 'Désactiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
