import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CustomFieldList } from './CustomFieldList'
import { CreateCustomFieldDialog, type CreateCustomFieldDefaultAppliesTo } from './CreateCustomFieldDialog'
import { useCustomFields } from './useCustomFields'

export function CustomFieldsConfig() {
  const { data: fields, isLoading } = useCustomFields()
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false)
  const [defaultAppliesTo, setDefaultAppliesTo] = useState<CreateCustomFieldDefaultAppliesTo>('quotes')

  const quoteFields = (fields ?? [])
    .filter(f => f.appliesToQuotes)
    .sort((a, b) => (a.displayOrderQuotes ?? 0) - (b.displayOrderQuotes ?? 0))
  const siteFields = (fields ?? [])
    .filter(f => f.appliesToSites)
    .sort((a, b) => (a.displayOrderSites ?? 0) - (b.displayOrderSites ?? 0))

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Champs Devis</CardTitle>
          <Button size="sm" onClick={() => {
            setDefaultAppliesTo('quotes');
            setCreateDialogOpen(true);
          }}>Ajouter un champ</Button>
        </CardHeader>
        <CardContent>
          <CustomFieldList fields={quoteFields} context="quotes" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Champs Chantier</CardTitle>
          <Button size="sm" onClick={() => {
            setDefaultAppliesTo('sites');
            setCreateDialogOpen(true);
          }}>Ajouter un champ</Button>
        </CardHeader>
        <CardContent>
          <CustomFieldList fields={siteFields} context="sites" />
        </CardContent>
      </Card>

      <CreateCustomFieldDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultAppliesTo={defaultAppliesTo}
      />
    </div>
  )
}
