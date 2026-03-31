import { useState } from 'react'
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Plus } from 'lucide-react'
import { formatMontant } from '@/lib/format-montant'
import { CustomerAutocomplete } from '@/features/clients/CustomerAutocomplete'
import { CreateClientDialog } from '@/features/clients/CreateClientDialog'
import { getCustomerById } from '@/features/clients/api'
import type { CustomerSearchResult, CustomerResponse } from '@/features/clients/types'
import { FormModeSelector } from './FormModeSelector'
import type { FormMode } from './FormModeSelector'
import { QuoteLineFields } from './QuoteLineFields'
import { DynamicCustomFields } from './DynamicCustomFields'
import { useCustomFieldDefinitions } from './useCustomFieldDefinitions'

function safeNumber(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function QuoteTotals() {
  const lines = useWatch({ name: 'lines' }) ?? []
  const taxRate = safeNumber(useWatch({ name: 'taxRate' }))

  const totalHT = (lines as any[]).reduce((sum: number, line: any) => {
    return sum + (safeNumber(line?.quantity) * safeNumber(line?.unitPriceExclTax))
  }, 0)
  const tva = totalHT * taxRate / 100
  const totalTTC = totalHT + tva

  if (lines.length === 0) return null

  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <h3 className="mb-3 text-sm font-medium">Totaux</h3>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Total HT</span>
          <span className="font-medium">{formatMontant(totalHT)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>TVA ({taxRate}%)</span>
          <span>{formatMontant(tva)}</span>
        </div>
        <div className="flex justify-between border-t pt-1 font-semibold">
          <span>Total TTC</span>
          <span>{formatMontant(totalTTC)}</span>
        </div>
      </div>
    </div>
  )
}

interface DevisFormFieldsProps {
  mode: FormMode
  onModeChange: (mode: FormMode) => void
  selectedCustomer: CustomerSearchResult | null
  onCustomerSelect: (customer: CustomerSearchResult) => void
  isEdit?: boolean
  hideFormModeSelector?: boolean
}

export function DevisFormFields({
  mode,
  onModeChange,
  selectedCustomer,
  onCustomerSelect,
  isEdit = false,
  hideFormModeSelector = false,
}: DevisFormFieldsProps) {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const [showCreateClient, setShowCreateClient] = useState(false)

  const { data: customFieldDefs } = useCustomFieldDefinitions()

  // Nouvelle logique de visibilite
  const showDatesAndLines = mode !== 'rapide'       // Dates, TVA, duree, lignes
  const showInternalFields = mode === 'complet'      // Priorite, relance, notes

  const handleCustomerSelect = async (customer: CustomerSearchResult) => {
    onCustomerSelect(customer)
    setValue('customerId', customer.id)
    try {
      const full = await getCustomerById(customer.id)
      if (full.address && !watch('siteAddress')) {
        setValue('siteAddress', full.address)
      }
    } catch {
      // Non bloquant
    }
  }

  const handleCustomerCreated = (customer: CustomerResponse) => {
    setShowCreateClient(false)
    const searchResult: CustomerSearchResult = {
      id: customer.id,
      lastName: customer.lastName,
      firstName: customer.firstName,
      telephone: customer.telephone,
      email: customer.email,
      quoteCount: 0,
      siteCount: 0,
    }
    onCustomerSelect(searchResult)
    setValue('customerId', customer.id)
    if (customer.address && !watch('siteAddress')) {
      setValue('siteAddress', customer.address)
    }
  }

  return (
    <div className="space-y-6">
      {/* FormModeSelector — masque en edition */}
      {!hideFormModeSelector && <FormModeSelector mode={mode} onModeChange={onModeChange} />}

      {/* 1. Client */}
      <div className="space-y-2">
        <Label>
          Client <span className="text-destructive">*</span>
        </Label>
        {isEdit ? (
          <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
            {selectedCustomer ? `${selectedCustomer.lastName} ${selectedCustomer.firstName}`.trim() : '—'}
          </div>
        ) : (
          <CustomerAutocomplete
            value={selectedCustomer}
            onSelect={handleCustomerSelect}
            onCreateNew={() => setShowCreateClient(true)}
          />
        )}
        {errors.customerId && (
          <p className="text-sm text-destructive">Le client est obligatoire</p>
        )}
      </div>

      {/* 2. Objet */}
      <div className="space-y-2">
        <Label htmlFor="subject">
          Objet <span className="text-destructive">*</span>
        </Label>
        <Input
          id="subject"
          placeholder="Objet du devis"
          {...register('subject', {
            required: "L'objet est obligatoire",
            validate: (v) => v.trim() !== '' || "L'objet est obligatoire",
          })}
        />
        {errors.subject && (
          <p className="text-sm text-destructive">{(errors.subject as any).message}</p>
        )}
      </div>

      {/* 3. Adresse du chantier — OBLIGATOIRE */}
      <div className="space-y-2">
        <Label htmlFor="siteAddress">
          Adresse du chantier <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="siteAddress"
          placeholder="Adresse du chantier"
          {...register('siteAddress', {
            required: "L'adresse du chantier est obligatoire",
            validate: (v) => v.trim() !== '' || "L'adresse du chantier est obligatoire",
          })}
          rows={2}
        />
        {errors.siteAddress && (
          <p className="text-sm text-destructive">{(errors.siteAddress as any).message}</p>
        )}
      </div>

      {/* 4. Champs personnalises */}
      {customFieldDefs && customFieldDefs.length > 0 && (
        <DynamicCustomFields definitions={customFieldDefs} control={control} mode={mode} />
      )}

      {/* Bouton "Renseigner plus" en mode Rapide — apres les champs custom */}
      {mode === 'rapide' && (
        <Button type="button" variant="outline" onClick={() => onModeChange('libre')} className="w-full">
          Renseigner plus d'informations
        </Button>
      )}

      {/* ─── Separateur ─── */}
      {showDatesAndLines && <Separator />}

      {/* 5. Date de validite, Duree estimee, Taux TVA */}
      {showDatesAndLines && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="validityDate">Date de validité <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <Input id="validityDate" type="date" {...register('validityDate')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedDuration">Durée estimée <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <Input id="estimatedDuration" placeholder="Ex: 2 semaines" {...register('estimatedDuration')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxRate">Taux TVA (%) <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <Input
              id="taxRate"
              type="number"
              min={0}
              step="0.1"
              {...register('taxRate', { valueAsNumber: true })}
            />
          </div>
        </div>
      )}

      {/* ─── Separateur ─── */}
      {showInternalFields && <Separator />}

      {/* 6. Priorite, Date de relance, Notes — mode Complet uniquement */}
      {showInternalFields && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="priority">Priorité <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <Select
              value={watch('priority') ?? 'Normal'}
              onValueChange={(v) => setValue('priority', v)}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Basse</SelectItem>
                <SelectItem value="Normal">Normale</SelectItem>
                <SelectItem value="High">Haute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderDate">Date de relance <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <Input id="reminderDate" type="date" {...register('reminderDate')} />
          </div>

          <div className="col-span-full space-y-2">
            <Label htmlFor="notes">Notes <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <Textarea id="notes" placeholder="Notes internes" {...register('notes')} rows={3} />
          </div>
        </div>
      )}

      {/* ─── Separateur ─── */}
      {showDatesAndLines && <Separator />}

      {/* 7. Lignes de prestations + totaux */}
      {showDatesAndLines && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Lignes de prestations</h3>
          {fields.map((field, index) => (
            <QuoteLineFields
              key={field.id}
              index={index}
              onRemove={() => remove(index)}
              canRemove={fields.length > 1}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ description: '', quantity: 1, unitPriceExclTax: 0, displayOrder: fields.length })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une prestation
          </Button>
          <QuoteTotals />
        </div>
      )}

      <CreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onCustomerCreated={handleCustomerCreated}
      />
    </div>
  )
}
