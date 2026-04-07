import { useParams, useNavigate } from 'react-router'
import { ClientDetail } from './ClientDetail'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="container mx-auto py-6 px-4">
      <ClientDetail
        customerId={Number(id)}
        showBackButton={true}
        onBack={() => navigate(-1)}
      />
    </div>
  )
}
