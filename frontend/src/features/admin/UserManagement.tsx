import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RoleBadge } from './RoleBadge'
import { UserStatusToggle } from './UserStatusToggle'
import { CreateUserDialog } from './CreateUserDialog'
import { useAuth } from '@/features/auth/useAuth'
import { useUsers, useCreateUser, useUpdateUserRole, useDeactivateUser, useReactivateUser } from './useUsers'
import type { CreateUserRequest } from './types'
import { toast } from 'sonner'

const ROLES = ['Chef', 'Secretaire', 'Ouvrier'] as const

export function UserManagement() {
  const { user: currentUser } = useAuth()
  const { data: users, isLoading } = useUsers()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const createMutation = useCreateUser()
  const updateRoleMutation = useUpdateUserRole()
  const deactivateMutation = useDeactivateUser()
  const reactivateMutation = useReactivateUser()

  const handleCreateUser = async (data: CreateUserRequest) => {
    await createMutation.mutateAsync(data)
    toast.success('Utilisateur créé avec succès')
  }

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      await updateRoleMutation.mutateAsync({ id: userId, data: { role: newRole as CreateUserRequest['role'] } })
      toast.success('Rôle mis à jour avec succès')
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Erreur lors de la mise à jour du rôle')
    }
  }

  const handleDeactivate = async (userId: number) => {
    try {
      await deactivateMutation.mutateAsync(userId)
      toast.success('Utilisateur désactivé')
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Erreur lors de la désactivation')
      // Re-throw pour que UserStatusToggle garde le dialog ouvert
      throw err
    }
  }

  const handleReactivate = async (userId: number) => {
    try {
      await reactivateMutation.mutateAsync(userId)
      toast.success('Utilisateur réactivé')
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Erreur lors de la réactivation')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          Ajouter un utilisateur
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom complet</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(users ?? []).map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.firstName} {user.lastName}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <RoleBadge role={user.role} />
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                  {user.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </TableCell>
              <TableCell>
                {currentUser?.id !== user.id ? (
                  <div className="flex items-center gap-3">
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleUpdateRole(user.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <UserStatusToggle
                      userId={user.id}
                      userName={`${user.firstName} ${user.lastName}`}
                      isActive={user.isActive}
                      onDeactivate={handleDeactivate}
                      onReactivate={handleReactivate}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateUser}
      />
    </div>
  )
}
