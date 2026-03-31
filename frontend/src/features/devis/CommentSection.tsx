import { useState, useCallback } from 'react'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { formatAuditDate } from '@/features/audit/format-audit'
import { useComments, useAddComment } from '@/features/comments/useComments'
import type { CommentResponse } from '@/features/comments/types'

interface CommentSectionProps {
  quoteId: number
}

export function CommentSection({ quoteId }: CommentSectionProps) {
  const [content, setContent] = useState('')
  // page=0 means "last page" (backend convention)
  const [currentPage, setCurrentPage] = useState(0)
  const [olderComments, setOlderComments] = useState<CommentResponse[]>([])

  const { data, isLoading } = useComments('Quote', quoteId, currentPage)
  const addMutation = useAddComment('Quote', quoteId)

  const resolvedPage = data?.pagination.page ?? 1
  const hasOlderPages = resolvedPage > 1

  const loadOlder = useCallback(() => {
    if (!data || resolvedPage <= 1) return
    setOlderComments(prev => [...data.data, ...prev])
    setCurrentPage(resolvedPage - 1)
  }, [data, resolvedPage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      await addMutation.mutateAsync({ content: content.trim() })
      setContent('')
      // Reset to last page so new comment is visible
      setOlderComments([])
      setCurrentPage(0)
      toast.success('Commentaire ajouté')
    } catch {
      toast.error("Erreur lors de l'ajout du commentaire")
    }
  }

  const allComments = [...(data?.data ?? []), ...olderComments]
  const isEmpty = !isLoading && allComments.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Commentaires
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-5/6" />
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-sm">Aucun commentaire</p>
          </div>
        )}

        {!isLoading && hasOlderPages && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={loadOlder}
          >
            Charger les précédents
          </Button>
        )}

        {!isLoading && allComments.map(comment => (
          <div key={comment.id} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {comment.userFullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{comment.userFullName}</div>
              <div className="text-xs text-muted-foreground">{formatAuditDate(comment.createdAt)}</div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="min-h-[60px]"
            maxLength={2000}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Envoyer le commentaire"
            disabled={!content.trim() || addMutation.isPending}
          >
            {addMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
