import { useEffect } from 'react'
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
import { useUpdateCustomer } from './useCustomers'
import type { CustomerResponse, UpdateCustomerRequest } from './types'

interface EditClientDialogProps {
  customer: CustomerResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditClientDialog({ customer, open, onOpenChange }: EditClientDialogProps) {
  const updateCustomer = useUpdateCustomer()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateCustomerRequest>({
    defaultValues: {
      lastName: customer.lastName,
      firstName: customer.firstName,
      telephone: customer.telephone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        lastName: customer.lastName,
        firstName: customer.firstName,
        telephone: customer.telephone ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
      })
    }
  }, [open, customer, reset])

  const onSubmit = async (data: UpdateCustomerRequest) => {
    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        data: {
          lastName: data.lastName.trim(),
          firstName: data.firstName.trim(),
          telephone: data.telephone?.trim() || undefined,
          email: data.email?.trim() || undefined,
          address: data.address?.trim() || undefined,
        },
      })
      toast.success('Client modifié')
      onOpenChange(false)
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Une erreur est survenue')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-lastName">Nom</Label>
            <Input
              id="edit-lastName"
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
            <Label htmlFor="edit-firstName">Prénom</Label>
            <Input
              id="edit-firstName"
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
            <Label htmlFor="edit-telephone">Téléphone</Label>
            <Input
              id="edit-telephone"
              placeholder="Téléphone"
              {...register('telephone')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
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
            <Label htmlFor="edit-address">Adresse</Label>
            <Textarea
              id="edit-address"
              placeholder="Adresse"
              {...register('address')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateCustomer.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
