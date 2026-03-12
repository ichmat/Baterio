import { useCallback, useEffect, useState } from 'react'
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
import { getUsers, createUser, updateUserRole, deactivateUser, reactivateUser } from './api'
import type { UserResponse, CreateUserRequest } from './types'
import { toast } from 'sonner'

const ROLES = ['Admin', 'Chef', 'Secretaire', 'Ouvrier'] as const

export function UserManagement() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch {
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleCreateUser = async (data: CreateUserRequest) => {
    await createUser(data)
    toast.success('Utilisateur créé avec succès')
    await loadUsers()
  }

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      await updateUserRole(userId, { role: newRole as CreateUserRequest['role'] })
      toast.success('Rôle mis à jour avec succès')
      await loadUsers()
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Erreur lors de la mise à jour du rôle')
    }
  }

  const handleDeactivate = async (userId: number) => {
    try {
      await deactivateUser(userId)
      toast.success('Utilisateur désactivé')
      await loadUsers()
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Erreur lors de la désactivation')
    }
  }

  const handleReactivate = async (userId: number) => {
    try {
      await reactivateUser(userId)
      toast.success('Utilisateur réactivé')
      await loadUsers()
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Erreur lors de la réactivation')
    }
  }

  if (loading) {
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
          {users.map((user) => (
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
