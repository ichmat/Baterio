import { useState, useEffect, useRef } from 'react'
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
import { updateCustomField } from './api'
import { FIELD_TYPE_LABELS, OBLIGATION_LEVELS } from './custom-field-constants'
import type { CustomFieldResponse, ObligationLevel } from './types'

interface OptionItem {
  id: number
  value: string
}

interface EditCustomFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: CustomFieldResponse
  onSuccess: () => void
}

export function EditCustomFieldDialog({ open, onOpenChange, field, onSuccess }: EditCustomFieldDialogProps) {
  const [label, setLabel] = useState('')
  const [obligationLevel, setObligationLevel] = useState<string>('')
  const [appliesToQuotes, setAppliesToQuotes] = useState(false)
  const [appliesToSites, setAppliesToSites] = useState(false)
  const [options, setOptions] = useState<OptionItem[]>([])
  const nextOptionId = useRef(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const isChoiceType = field.fieldType === 'SingleChoice' || field.fieldType === 'MultipleChoice'

  useEffect(() => {
    if (!open) return
    setLabel(field.label)
    setObligationLevel(field.obligationLevel)
    setAppliesToQuotes(field.appliesToQuotes)
    setAppliesToSites(field.appliesToSites)
    setError(null)
    setValidationErrors({})
    if (isChoiceType && field.options) {
      try {
        const parsed = JSON.parse(field.options)
        const choices = (parsed.choices ?? []) as string[]
        const items = choices.map((c, i) => ({ id: i + 1, value: c }))
        setOptions(items)
        nextOptionId.current = items.length + 1
      } catch {
        setOptions([])
      }
    } else {
      setOptions([])
    }
  }, [field, isChoiceType, open])

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!label.trim()) errors.label = 'Le label est requis'
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

      await updateCustomField(field.id, {
        label: label.trim(),
        obligationLevel: obligationLevel as ObligationLevel,
        appliesToQuotes,
        appliesToSites,
        options: optionsJson,
      })
      toast.success('Champ mis à jour')
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      setError(apiError?.message ?? 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const addOption = () => {
    setOptions([...options, { id: nextOptionId.current++, value: '' }])
  }
  const removeOption = (id: number) => setOptions(options.filter(o => o.id !== id))
  const updateOptionValue = (id: number, value: string) => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le champ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-cf-label">Label du champ</Label>
            <Input
              id="edit-cf-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
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
            <Label>Type</Label>
            <Input value={FIELD_TYPE_LABELS[field.fieldType] ?? field.fieldType} disabled />
            <p className="text-xs text-muted-foreground">Le type ne peut pas être modifié après création</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cf-obligation">Obligation</Label>
            <Select value={obligationLevel} onValueChange={setObligationLevel}>
              <SelectTrigger id="edit-cf-obligation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBLIGATION_LEVELS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    onChange={(e) => updateOptionValue(option.id, e.target.value)}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
