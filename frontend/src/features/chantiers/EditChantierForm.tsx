import { useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { getCustomFields } from '@/features/admin/api'
import { DynamicCustomFields } from '@/features/devis/DynamicCustomFields'
import { useUpdateSite } from './useSites'
import { AdjustmentConfirmDialog } from './AdjustmentConfirmDialog'
import type { SiteResponse, UpdateSiteRequest, ProposedAdjustment } from './types'

interface EditChantierFormProps {
  site: SiteResponse
  onSuccess: () => void
}

export function EditChantierForm({ site, onSuccess }: EditChantierFormProps) {
  const updateMutation = useUpdateSite(site.id)
  const [pendingAdjustments, setPendingAdjustments] = useState<ProposedAdjustment[] | null>(null)

  const { data: definitions } = useQuery({
    queryKey: ['custom-fields', 'sites'],
    queryFn: () => getCustomFields({ appliesToSites: true }),
    select: (fields) =>
      [...fields].sort(
        (a, b) => (a.displayOrderSites ?? 999) - (b.displayOrderSites ?? 999),
      ),
  })

  const form = useForm<UpdateSiteRequest>({
    defaultValues: {
      subject: site.subject,
      siteAddress: site.siteAddress,
      startDate: site.startDate || undefined,
      endDate: site.endDate || undefined,
      notes: site.notes || undefined,
    },
  })

  const cfDefs = definitions ?? []

  useEffect(() => {
    if (site.customFields && cfDefs.length > 0) {
      for (const cf of site.customFields) {
        const fieldName = `customFields.${cf.id}` as any
        if (form.getValues(fieldName) === undefined) {
          form.setValue(fieldName, cf.value)
        }
      }
    }
  }, [cfDefs.length, site.customFields, form])

  const onSubmit = async (data: UpdateSiteRequest) => {
    const customFields = cfDefs.map((def) => ({
      id: def.id,
      label: def.label,
      value: (data as any).customFields?.[def.id] ?? null,
    })).filter((cf) => cf.value !== undefined && cf.value !== null && cf.value !== '')

    try {
      const response = await updateMutation.mutateAsync({
        subject: data.subject,
        siteAddress: data.siteAddress,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        notes: data.notes || null,
        customFields: customFields.length > 0 ? customFields : null,
      })
      toast.success('Chantier modifié')
      if (response.proposedAdjustments && response.proposedAdjustments.length > 0) {
        setPendingAdjustments(response.proposedAdjustments)
      } else {
        onSuccess()
      }
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Erreur lors de la modification')
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-xl font-bold">Modifier le chantier</h2>

        <div>
          <Label htmlFor="subject">Objet *</Label>
          <Input id="subject" {...form.register('subject', { required: true })} maxLength={500} />
        </div>
        <div>
          <Label htmlFor="siteAddress">Adresse *</Label>
          <Input id="siteAddress" {...form.register('siteAddress', { required: true })} maxLength={1000} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Date de début</Label>
            <Input id="startDate" type="date" {...form.register('startDate')} />
          </div>
          <div>
            <Label htmlFor="endDate">Date de fin</Label>
            <Input id="endDate" type="date" {...form.register('endDate')} />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...form.register('notes')} maxLength={5000} rows={4} />
        </div>
        {cfDefs.length > 0 && (
          <DynamicCustomFields
            definitions={cfDefs}
            control={form.control}
            mode="complet"
            requiredLevel="RequiredForSiteConversion"
          />
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Annuler
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>

      {pendingAdjustments && (
        <AdjustmentConfirmDialog
          siteId={site.id}
          adjustments={pendingAdjustments}
          open={!!pendingAdjustments}
          onOpenChange={(open) => { if (!open) { setPendingAdjustments(null); onSuccess() } }}
          onConfirmed={() => { setPendingAdjustments(null); onSuccess() }}
          onCancel={() => { setPendingAdjustments(null); onSuccess() }}
        />
      )}
    </FormProvider>
  )
}
