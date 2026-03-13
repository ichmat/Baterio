import { useForm, Controller } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateUserRequest } from './types'

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateUserRequest) => Promise<void>
}

const ROLES = [
  { value: 'Chef', label: 'Chef' },
  { value: 'Secretaire', label: 'Secrétaire' },
  { value: 'Ouvrier', label: 'Ouvrier' },
] as const

export function CreateUserDialog({ open, onOpenChange, onSubmit }: CreateUserDialogProps) {
  const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset, setError, clearErrors } = useForm<CreateUserRequest & { apiError?: string }>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: '' as CreateUserRequest['role'],
    },
  })

  const handleFormSubmit = async (data: CreateUserRequest) => {
    clearErrors('apiError')
    try {
      await onSubmit({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        password: data.password,
        role: data.role,
      })
      reset()
      onOpenChange(false)
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      setError('apiError', { message: apiError?.message ?? 'Une erreur est survenue' })
    }
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) reset()
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom</Label>
            <Input
              id="firstName"
              placeholder="Prénom"
              {...register('firstName', { required: 'Le prénom est requis', validate: v => v.trim() !== '' || 'Le prénom est requis' })}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input
              id="lastName"
              placeholder="Nom"
              {...register('lastName', { required: 'Le nom est requis', validate: v => v.trim() !== '' || 'Le nom est requis' })}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemple.fr"
              {...register('email', {
                required: "L'email est requis",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "L'email n'est pas valide" },
              })}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe temporaire</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 caractères"
              {...register('password', {
                required: 'Le mot de passe est requis',
                minLength: { value: 8, message: 'Le mot de passe doit contenir au moins 8 caractères' },
              })}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Controller
              name="role"
              control={control}
              rules={{ required: 'Le rôle est requis' }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          {errors.apiError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors.apiError.message}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
