import { useState, useCallback, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getCustomFields } from './api'
import { CustomFieldList } from './CustomFieldList'
import { CreateCustomFieldDialog, type CreateCustomFieldDefaultAppliesTo } from './CreateCustomFieldDialog'
import type { CustomFieldResponse } from './types'

export function CustomFieldsConfig() {
  const [fields, setFields] = useState<CustomFieldResponse[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [defaultAppliesTo, setDefaultAppliesTo] = useState<CreateCustomFieldDefaultAppliesTo>('quotes')

  const loadFields = useCallback(async () => {
    try {
      const data = await getCustomFields()
      setFields(data)
    } catch {
      toast.error('Erreur lors du chargement des champs personnalisés')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFields()
  }, [loadFields])

  const quoteFields = fields.filter(f => f.appliesToQuotes)
  const siteFields = fields.filter(f => f.appliesToSites)

  if (loading) {
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
          <CustomFieldList fields={quoteFields} allFields={fields} onRefresh={loadFields} />
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
          <CustomFieldList fields={siteFields} allFields={fields} onRefresh={loadFields} />
        </CardContent>
      </Card>

      <CreateCustomFieldDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadFields} 
        defaultAppliesTo={defaultAppliesTo} 
        />
    </div>
  )
}
