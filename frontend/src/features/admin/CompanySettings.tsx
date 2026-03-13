import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useCompanyInfo, useUpdateCompanyInfo } from './useCompany'
import type { UpdateCompanyInfoRequest } from './types'

export function CompanySettings() {
  const { data: companyData, isLoading, isError } = useCompanyInfo()
  const updateMutation = useUpdateCompanyInfo()

  useEffect(() => {
    if (isError) {
      toast.error('Erreur lors du chargement des informations entreprise')
    }
  }, [isError])

  const { register, handleSubmit, reset } = useForm<UpdateCompanyInfoRequest>({
    defaultValues: {
      companyName: '',
      address: '',
      siret: '',
      vatNumber: '',
      legalForm: '',
      insurancePolicyNumber: '',
      insuranceProvider: '',
      insuranceCoverage: '',
      defaultPaymentTerms: '',
    },
  })

  useEffect(() => {
    if (companyData) {
      reset({
        companyName: companyData.companyName ?? '',
        address: companyData.address ?? '',
        siret: companyData.siret ?? '',
        vatNumber: companyData.vatNumber ?? '',
        legalForm: companyData.legalForm ?? '',
        insurancePolicyNumber: companyData.insurancePolicyNumber ?? '',
        insuranceProvider: companyData.insuranceProvider ?? '',
        insuranceCoverage: companyData.insuranceCoverage ?? '',
        defaultPaymentTerms: companyData.defaultPaymentTerms ?? '',
      })
    }
  }, [companyData, reset])

  const onSubmit = async (data: UpdateCompanyInfoRequest) => {
    try {
      await updateMutation.mutateAsync(data)
      toast.success('Informations enregistrées')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Raison sociale</Label>
            <Input
              id="companyName"
              {...register('companyName')}
              placeholder="Ex: Mon Entreprise SARL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Ex: 12 rue des Artisans, 75011 Paris"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalForm">Forme juridique</Label>
            <Input
              id="legalForm"
              {...register('legalForm')}
              placeholder="Ex: SARL, SAS, EURL, Auto-entrepreneur"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identification fiscale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input
              id="siret"
              {...register('siret')}
              placeholder="14 chiffres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vatNumber">N° TVA intracommunautaire</Label>
            <Input
              id="vatNumber"
              {...register('vatNumber')}
              placeholder="Ex: FR12345678901"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assurance décennale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="insurancePolicyNumber">Numéro de police</Label>
            <Input
              id="insurancePolicyNumber"
              {...register('insurancePolicyNumber')}
              placeholder="Ex: DEC-2024-001234"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceProvider">Assureur</Label>
            <Input
              id="insuranceProvider"
              {...register('insuranceProvider')}
              placeholder="Ex: AXA Assurances"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceCoverage">Couverture géographique</Label>
            <Input
              id="insuranceCoverage"
              {...register('insuranceCoverage')}
              placeholder="Ex: France métropolitaine"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conditions de paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultPaymentTerms">Conditions par défaut</Label>
            <Textarea
              id="defaultPaymentTerms"
              {...register('defaultPaymentTerms')}
              placeholder="Ex: Paiement à 30 jours"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
