import { useState, useRef } from 'react'
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
import { createCustomField } from './api'
import { FIELD_TYPES, OBLIGATION_LEVELS } from './custom-field-constants'
import type { FieldType, ObligationLevel } from './types'

interface OptionItem {
  id: number
  value: string
}

export type CreateCustomFieldDefaultAppliesTo = 'quotes' | 'sites'

interface CreateCustomFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  defaultAppliesTo: CreateCustomFieldDefaultAppliesTo
}

export function CreateCustomFieldDialog({ open, onOpenChange, onSuccess, defaultAppliesTo }: CreateCustomFieldDialogProps) {
  const [label, setLabel] = useState<string>('')
  const [fieldType, setFieldType] = useState<string>('')
  const [obligationLevel, setObligationLevel] = useState<string>('')
  const [appliesToQuotes, setAppliesToQuotes] = useState<boolean>(true)
  const [appliesToSites, setAppliesToSites] = useState<boolean>(true)
  const [options, setOptions] = useState<OptionItem[]>([{ id: 1, value: '' }])
  const nextOptionId = useRef(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const isChoiceType = fieldType === 'SingleChoice' || fieldType === 'MultipleChoice'

  const resetForm = () => {
    setLabel('')
    setFieldType('')
    setObligationLevel('')
    setAppliesToQuotes(defaultAppliesTo === 'quotes')
    setAppliesToSites(defaultAppliesTo === 'sites')
    setOptions([{ id: 1, value: '' }])
    nextOptionId.current = 2
    setError(null)
    setValidationErrors({})
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!label.trim()) errors.label = 'Le label est requis'
    if (!fieldType) errors.fieldType = 'Le type est requis'
    if (!obligationLevel) errors.obligationLevel = "Le niveau d'obligation est requis"
    if (!appliesToQuotes && !appliesToSites) errors.appliesTo = 'Le champ doit s\'appliquer aux devis et/ou aux chantiers'
    if (isChoiceType) {
      const validOptions = options.filter(o => o.value.trim())
      if (validOptions.length === 0) errors.options = 'Au moins une option est requise'
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError(null)
    try {
      const optionsJson = isChoiceType
        ? JSON.stringify({ choices: options.filter(o => o.value.trim()).map(o => o.value.trim()) })
        : undefined

      await createCustomField({
        label: label.trim(),
        fieldType: fieldType as FieldType,
        obligationLevel: obligationLevel as ObligationLevel,
        appliesToQuotes,
        appliesToSites,
        options: optionsJson,
      })
      toast.success('Champ créé')
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      setError(apiError?.message ?? 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (value: boolean) => {
    if (value) resetForm()
    onOpenChange(value)
  }

  const addOption = () => {
    setOptions([...options, { id: nextOptionId.current++, value: '' }])
  }
  const removeOption = (id: number) => setOptions(options.filter(o => o.id !== id))
  const updateOption = (id: number, value: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, value } : o))
  }
  const moveOptionUp = (index: number) => {
    if (index === 0) return
    const updated = [...options]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    setOptions(updated)
  }
  const moveOptionDown = (index: number) => {
    if (index === options.length - 1) return
    const updated = [...options]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    setOptions(updated)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un champ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cf-label">Label du champ</Label>
            <Input
              id="cf-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Surface m²"
            />
            {validationErrors.label && (
              <p className="text-sm text-destructive">{validationErrors.label}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>S'applique à</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={appliesToQuotes}
                  onCheckedChange={(checked) => setAppliesToQuotes(checked === true)}
                />
                Devis
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={appliesToSites}
                  onCheckedChange={(checked) => setAppliesToSites(checked === true)}
                />
                Chantier
              </label>
            </div>
            {validationErrors.appliesTo && (
              <p className="text-sm text-destructive">{validationErrors.appliesTo}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-type">Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger id="cf-type">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.fieldType && (
              <p className="text-sm text-destructive">{validationErrors.fieldType}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-obligation">Obligation</Label>
            <Select value={obligationLevel} onValueChange={setObligationLevel}>
              <SelectTrigger id="cf-obligation">
                <SelectValue placeholder="Sélectionner le niveau d'obligation" />
              </SelectTrigger>
              <SelectContent>
                {OBLIGATION_LEVELS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.obligationLevel && (
              <p className="text-sm text-destructive">{validationErrors.obligationLevel}</p>
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
              {options.map((option, index) => (
                <div key={option.id} className="flex gap-2">
                  <Input
                    value={option.value}
                    onChange={(e) => updateOption(option.id, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => moveOptionUp(index)} disabled={index === 0} aria-label="Monter option">
                    ↑
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => moveOptionDown(index)} disabled={index === options.length - 1} aria-label="Descendre option">
                    ↓
                  </Button>
                  {options.length > 1 && (
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeOption(option.id)} aria-label="Supprimer option">
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                Ajouter une option
              </Button>
              {validationErrors.options && (
                <p className="text-sm text-destructive">{validationErrors.options}</p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
