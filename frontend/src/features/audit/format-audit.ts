import {
  Plus,
  Pencil,
  ArrowRightLeft,
  MessageSquare,
  Paperclip,
  Trash2,
  Clock,
  type LucideIcon,
} from 'lucide-react'

export function formatAuditAction(action: string): { label: string; icon: LucideIcon } {
  switch (action) {
    case 'Created':
      return { label: 'Créé', icon: Plus }
    case 'Updated':
      return { label: 'Modifié', icon: Pencil }
    case 'StatusChanged':
      return { label: 'Statut modifié', icon: ArrowRightLeft }
    case 'CommentAdded':
      return { label: 'Commentaire ajouté', icon: MessageSquare }
    case 'FileAttached':
      return { label: 'Fichier ajouté', icon: Paperclip }
    case 'Deleted':
      return { label: 'Supprimé', icon: Trash2 }
    default:
      return { label: action, icon: Clock }
  }
}

const fieldLabels: Record<string, string> = {
  lastName: 'nom',
  firstName: 'prénom',
  telephone: 'téléphone',
  email: 'email',
  address: 'adresse',
}

export function formatAuditPayload(payload: string | null): string {
  if (!payload) return ''

  try {
    const parsed = JSON.parse(payload)
    if (parsed.changes && typeof parsed.changes === 'object') {
      const keys = Object.keys(parsed.changes)
      const labels = keys.map((k) => fieldLabels[k] || k)
      return `Modifié : ${labels.join(', ')}`
    }
    return payload.slice(0, 100)
  } catch {
    return payload.slice(0, 100)
  }
}

export function formatAuditDate(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString)
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMin <= 0) return 'à l\'instant'
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffH < 24) return `il y a ${diffH} h`
  if (diffDays < 7) return `il y a ${diffDays} ${diffDays === 1 ? 'jour' : 'jours'}`

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
