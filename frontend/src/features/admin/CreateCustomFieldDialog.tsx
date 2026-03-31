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
import { useCreateCustomField } from './useCustomFields'
import { FIELD_TYPES, OBLIGATION_LEVELS } from './custom-field-constants'
import type { FieldType, ObligationLevel } from './types'

export type CreateCustomFieldDefaultAppliesTo = 'quotes' | 'sites'

interface CreateCustomFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultAppliesTo: CreateCustomFieldDefaultAppliesTo
}

interface CreateCustomFieldForm {
  label: string
  fieldType: string
  obligationLevel: string
  appliesToQuotes: boolean
  appliesToSites: boolean
  options: { value: string }[]
}

export function CreateCustomFieldDialog({ open, onOpenChange, defaultAppliesTo }: CreateCustomFieldDialogProps) {
  const createMutation = useCreateCustomField()

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting }, setError, clearErrors } = useForm<CreateCustomFieldForm & { apiError?: string; appliesTo?: string }>({
    defaultValues: {
      label: '',
      fieldType: '',
      obligationLevel: '',
      appliesToQuotes: true,
      appliesToSites: true,
      options: [{ value: '' }],
    },
  })

  const { fields: optionFields, append, remove, move } = useFieldArray({ control, name: 'options' })
  const fieldType = watch('fieldType')
  const obligationLevel = watch('obligationLevel')
  const isChoiceType = fieldType === 'SingleChoice' || fieldType === 'MultipleChoice'

  useEffect(() => {
    if (open) {
      reset({
        label: '',
        fieldType: '',
        obligationLevel: '',
        appliesToQuotes: defaultAppliesTo === 'quotes',
        appliesToSites: defaultAppliesTo === 'sites',
        options: [{ value: '' }],
      })
    }
  }, [open, defaultAppliesTo, reset])

  const onSubmit = async (data: CreateCustomFieldForm) => {
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

      await createMutation.mutateAsync({
        label: data.label.trim(),
        fieldType: data.fieldType as FieldType,
        obligationLevel: data.obligationLevel as ObligationLevel,
        appliesToQuotes: data.appliesToQuotes,
        appliesToSites: data.appliesToSites,
        options: optionsJson,
      })
      toast.success('Champ créé')
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
          <DialogTitle>Ajouter un champ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cf-label">Label du champ</Label>
            <Input
              id="cf-label"
              placeholder="Ex: Surface m²"
              {...register('label', { required: 'Le label est requis', validate: v => {
                if (v.trim() === '') return 'Le label est requis'
                if (v.includes(':')) return "Le libellé ne peut pas contenir ':'"
                return true
              } })}
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
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                Devis
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Controller
                  name="appliesToSites"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
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
            <Label htmlFor="cf-type">Type</Label>
            <Controller
              name="fieldType"
              control={control}
              rules={{ required: 'Le type est requis' }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="cf-type">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.fieldType && (
              <p className="text-sm text-destructive">{errors.fieldType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-obligation">Obligation</Label>
            <Controller
              name="obligationLevel"
              control={control}
              rules={{ required: "Le niveau d'obligation est requis" }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="cf-obligation">
                    <SelectValue placeholder="Sélectionner le niveau d'obligation" />
                  </SelectTrigger>
                  <SelectContent>
                    {OBLIGATION_LEVELS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.obligationLevel && (
              <p className="text-sm text-destructive">{errors.obligationLevel.message}</p>
            )}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting || createMutation.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {(isSubmitting || createMutation.isPending) ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
