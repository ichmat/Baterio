import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useUpdateCustomField } from './useCustomFields'
import { FIELD_TYPE_LABELS, OBLIGATION_LEVELS } from './custom-field-constants'
import type { CustomFieldResponse, ObligationLevel } from './types'

interface EditCustomFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: CustomFieldResponse
}

interface EditCustomFieldForm {
  label: string
  obligationLevel: string
  appliesToQuotes: boolean
  appliesToSites: boolean
  options: { value: string }[]
}

export function EditCustomFieldDialog({ open, onOpenChange, field }: EditCustomFieldDialogProps) {
  const updateMutation = useUpdateCustomField()
  const isChoiceType = field.fieldType === 'SingleChoice' || field.fieldType === 'MultipleChoice'

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting }, setError, clearErrors } = useForm<EditCustomFieldForm & { apiError?: string; appliesTo?: string }>({
    defaultValues: {
      label: '',
      obligationLevel: '',
      appliesToQuotes: false,
      appliesToSites: false,
      options: [],
    },
  })

  const { fields: optionFields, append, remove, move } = useFieldArray({ control, name: 'options' })
  const obligationLevel = watch('obligationLevel')

  useEffect(() => {
    if (!open) return
    let parsedOptions: { value: string }[] = []
    if (isChoiceType && field.options) {
      try {
        const parsed = JSON.parse(field.options)
        parsedOptions = ((parsed.choices ?? []) as string[]).map(c => ({ value: c }))
      } catch {
        parsedOptions = []
      }
    }
    reset({
      label: field.label,
      obligationLevel: field.obligationLevel,
      appliesToQuotes: field.appliesToQuotes,
      appliesToSites: field.appliesToSites,
      options: parsedOptions,
    })
  }, [field, isChoiceType, open, reset])

  const onSubmit = async (data: EditCustomFieldForm) => {
    clearErrors('apiError')
    clearErrors('appliesTo')

    if (!data.appliesToQuotes && !data.appliesToSites) {
      setError('appliesTo', { message: 'Le champ doit s\'appliquer aux devis et/ou aux chantiers' })
      return
    }

    if (isChoiceType) {
      const validOptions = data.options.filter(o => o.value.trim())
      if (validOptions.length === 0) {
        setError('root.optionsError', { message: 'Au moins une option est requise' })
        return
      }
    }

    try {
      const optionsJson = isChoiceType
        ? JSON.stringify({ choices: data.options.filter(o => o.value.trim()).map(o => o.value.trim()) })
        : undefined

      await updateMutation.mutateAsync({
        id: field.id,
        data: {
          label: data.label.trim(),
          obligationLevel: data.obligationLevel as ObligationLevel,
          appliesToQuotes: data.appliesToQuotes,
          appliesToSites: data.appliesToSites,
          options: optionsJson,
        },
      })
      toast.success('Champ mis à jour')
      onOpenChange(false)
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      setError('apiError', { message: apiError?.message ?? 'Une erreur est survenue' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le champ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-cf-label">Label du champ</Label>
            <Input
              id="edit-cf-label"
              {...register('label', { required: 'Le label est requis', validate: v => v.trim() !== '' || 'Le label est requis' })}
            />
            {errors.label && (
              <p className="text-sm text-destructive">{errors.label.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>S'applique à</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Controller
                  name="appliesToQuotes"
                  control={control}
                  render={({ field: f }) => (
                    <Checkbox
                      checked={f.value}
                      onCheckedChange={(checked) => f.onChange(checked === true)}
                    />
                  )}
                />
                Devis
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Controller
                  name="appliesToSites"
                  control={control}
                  render={({ field: f }) => (
                    <Checkbox
                      checked={f.value}
                      onCheckedChange={(checked) => f.onChange(checked === true)}
                    />
                  )}
                />
                Chantier
              </label>
            </div>
            {errors.appliesTo && (
              <p className="text-sm text-destructive">{errors.appliesTo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Input value={FIELD_TYPE_LABELS[field.fieldType] ?? field.fieldType} disabled />
            <p className="text-xs text-muted-foreground">Le type ne peut pas être modifié après création</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cf-obligation">Obligation</Label>
            <Controller
              name="obligationLevel"
              control={control}
              render={({ field: f }) => (
                <Select onValueChange={f.onChange} value={f.value}>
                  <SelectTrigger id="edit-cf-obligation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OBLIGATION_LEVELS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {obligationLevel === 'RequiredAtCreation' && (
            <Alert variant="default" className="border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-200">
              <AlertDescription>
                Attention — ce champ sera requis à chaque création de devis/chantier. Cela peut ralentir le flux rapide.
              </AlertDescription>
            </Alert>
          )}

          {isChoiceType && (
            <div className="space-y-2">
              <Label>Options</Label>
              {optionFields.map((optField, index) => (
                <div key={optField.id} className="flex gap-2">
                  <Input
                    {...register(`options.${index}.value`)}
                    placeholder={`Option ${index + 1}`}
                  />
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="Monter option">
                    ↑
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => move(index, index + 1)} disabled={index === optionFields.length - 1} aria-label="Descendre option">
                    ↓
                  </Button>
                  {optionFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => remove(index)} aria-label="Supprimer option">
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}>
                Ajouter une option
              </Button>
              {errors.root?.optionsError && (
                <p className="text-sm text-destructive">{errors.root.optionsError.message}</p>
              )}
            </div>
          )}

          {errors.apiError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors.apiError.message}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting || updateMutation.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
              {(isSubmitting || updateMutation.isPending) ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
