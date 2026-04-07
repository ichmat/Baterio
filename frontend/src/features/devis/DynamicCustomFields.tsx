import { Controller } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { CustomFieldResponse } from '@/features/admin/types'
import type { FormMode } from './FormModeSelector'

interface DynamicCustomFieldsProps {
  definitions: CustomFieldResponse[]
  control: Control<any>
  mode: FormMode
  requiredLevel?: 'RequiredAtCreation' | 'RequiredForSiteConversion'
}

function ObligationHint({ level }: { level: string }) {
  if (level === 'RequiredForSiteConversion') {
    return <span className="text-xs text-muted-foreground">(requis pour créer un chantier)</span>
  }
  if (level === 'Never') {
    return <span className="text-xs text-muted-foreground">(optionnel)</span>
  }
  return null
}

function parseChoices(options?: string): string[] {
  if (!options) return []
  try {
    const parsed = JSON.parse(options)
    return parsed.choices ?? []
  } catch {
    return []
  }
}

const OBLIGATION_ORDER: Record<string, number> = {
  RequiredAtCreation: 0,
  RequiredForSiteConversion: 1,
  Never: 2,
}

export function DynamicCustomFields({ definitions, control, mode, requiredLevel = 'RequiredAtCreation' }: DynamicCustomFieldsProps) {
  // Rapide → RequiredAtCreation seuls ; Libre/Complet → tout
  const visibleFields = definitions
    .filter((f) => {
      if (mode === 'rapide') return f.obligationLevel === 'RequiredAtCreation'
      return true
    })
    .sort((a, b) => (OBLIGATION_ORDER[a.obligationLevel] ?? 9) - (OBLIGATION_ORDER[b.obligationLevel] ?? 9))

  if (visibleFields.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Champs personnalisés</h3>
      {visibleFields.map((field) => {
        
        const isRequired =
          field.obligationLevel === requiredLevel ||
          (field.obligationLevel === 'RequiredAtCreation' && requiredLevel === 'RequiredForSiteConversion')
        const fieldName = `customFields.${field.id}`

        return (
          <div key={field.id} className="space-y-1">
            <Label htmlFor={fieldName}>
              {field.label} {isRequired && <span className="text-destructive">*</span>}
            </Label>
            <ObligationHint level={field.obligationLevel} />

            {field.fieldType === 'Text' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{ required: isRequired ? 'Ce champ est obligatoire' : false }}
                render={({ field: f, fieldState }) => (
                  <>
                    <Input id={fieldName} {...f} value={f.value ?? ''} />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            )}

            {field.fieldType === 'Number' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{ required: isRequired ? 'Ce champ est obligatoire' : false }}
                render={({ field: f, fieldState }) => (
                  <>
                    <Input
                      id={fieldName}
                      type="number"
                      {...f}
                      value={f.value ?? ''}
                      onChange={(e) => f.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            )}

            {field.fieldType === 'SingleChoice' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{ required: isRequired ? 'Ce champ est obligatoire' : false }}
                render={({ field: f, fieldState }) => (
                  <>
                    <Select key={f.value ?? ''} value={f.value || undefined} onValueChange={f.onChange}>
                      <SelectTrigger id={fieldName}>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {parseChoices(field.options).map((choice) => (
                          <SelectItem key={choice} value={choice}>
                            {choice}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            )}

            {field.fieldType === 'MultipleChoice' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{
                  validate: isRequired
                    ? (v) => (Array.isArray(v) && v.length > 0) || 'Ce champ est obligatoire'
                    : undefined,
                }}
                render={({ field: f, fieldState }) => {
                  const selected: string[] = f.value ?? []
                  return (
                    <>
                      <div className="flex flex-col gap-2">
                        {parseChoices(field.options).map((choice) => (
                          <label key={choice} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selected.includes(choice)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  f.onChange([...selected, choice])
                                } else {
                                  f.onChange(selected.filter((s) => s !== choice))
                                }
                              }}
                            />
                            {choice}
                          </label>
                        ))}
                      </div>
                      {fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </>
                  )
                }}
              />
            )}

            {field.fieldType === 'Date' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{ required: isRequired ? 'Ce champ est obligatoire' : false }}
                render={({ field: f, fieldState }) => (
                  <>
                    <Input id={fieldName} type="date" {...f} value={f.value ?? ''} />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
