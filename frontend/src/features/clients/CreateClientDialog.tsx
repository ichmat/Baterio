import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useCreateCustomer } from './useCustomers'
import type { CreateCustomerRequest } from './types'

interface CreateClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateClientDialog({ open, onOpenChange }: CreateClientDialogProps) {
  const createCustomer = useCreateCustomer()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCustomerRequest>({
    defaultValues: {
      lastName: '',
      firstName: '',
      telephone: '',
      email: '',
      address: '',
    },
  })

  const onSubmit = async (data: CreateCustomerRequest) => {
    try {
      await createCustomer.mutateAsync({
        lastName: data.lastName.trim(),
        firstName: data.firstName.trim(),
        telephone: data.telephone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        address: data.address?.trim() || undefined,
      })
      toast.success('Client créé')
      reset()
      onOpenChange(false)
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Une erreur est survenue')
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
          <DialogTitle>Nouveau client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input
              id="lastName"
              placeholder="Nom"
              {...register('lastName', {
                required: 'Le nom est requis',
                validate: (v) => v.trim() !== '' || 'Le nom est requis',
              })}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom</Label>
            <Input
              id="firstName"
              placeholder="Prénom"
              {...register('firstName', {
                required: 'Le prénom est requis',
                validate: (v) => v.trim() !== '' || 'Le prénom est requis',
              })}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input
              id="telephone"
              placeholder="Téléphone"
              {...register('telephone')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="email@exemple.fr"
              {...register('email', {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "L'email n'est pas valide",
                },
              })}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              placeholder="Adresse"
              {...register('address')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createCustomer.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
