import { useNavigate } from 'react-router'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ChantiersPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Chantiers</h1>
        </div>
        <Button onClick={() => navigate('/chantiers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau chantier
        </Button>
      </div>
      <p className="text-muted-foreground">
        Aucun chantier pour le moment — les listes et filtres arrivent bientôt
      </p>
    </div>
  )
}
