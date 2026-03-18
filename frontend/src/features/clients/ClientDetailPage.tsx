import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomer } from './useCustomers'
import { EditClientDialog } from './EditClientDialog'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: customer, isLoading, isError } = useCustomer(Number(id))
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 w-64 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError || !customer) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="mb-4 text-lg text-muted-foreground">Client introuvable</p>
          <Button variant="outline" onClick={() => navigate('/clients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {customer.lastName} {customer.firstName}
          </h1>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Modifier
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-muted-foreground">Téléphone : </span>
              <span>{customer.telephone || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email : </span>
              <span>{customer.email || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Adresse : </span>
              <span>{customer.address || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Créé le : </span>
              <span>{new Date(customer.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Devis associés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Aucun devis — à venir</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chantiers associés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Aucun chantier — à venir</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditClientDialog
        customer={customer}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}
