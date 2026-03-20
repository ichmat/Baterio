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

export function formatAuditDate(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z')
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
