import { useRef, useState } from 'react'
import { Paperclip, Download, Trash2, FileImage, FileText, File, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttachments, useUploadFile, useDeleteAttachment, useDownloadFile } from '@/features/files/useFiles'
import { formatAuditDate } from '@/features/audit/format-audit'
import type { AttachmentResponse } from '@/features/files/types'

interface FileUploadZoneProps {
  quoteId: number
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return <FileImage className="h-4 w-4 text-blue-500" />
  if (contentType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
  return <File className="h-4 w-4 text-gray-500" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function FileUploadZone({ quoteId }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [deleteTarget, setDeleteTarget] = useState<AttachmentResponse | null>(null)
  const { data: attachments, isLoading } = useAttachments('Quote', quoteId)
  const uploadMutation = useUploadFile('Quote', quoteId)
  const deleteMutation = useDeleteAttachment('Quote', quoteId)
  const download = useDownloadFile()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await uploadMutation.mutateAsync(file)
      toast.success('Fichier ajouté')
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? 'Erreur lors de l\'upload'
      toast.error(message)
    }

    // Reset input
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Fichier supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
    setDeleteTarget(null)
  }

  const handleDownload = async (id: number, filename: string) => {
    try {
      await download(id, filename)
    } catch {
      toast.error('Erreur lors du téléchargement')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Pièces jointes
            </span>
            <div>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Paperclip className="mr-2 h-4 w-4" />}
                Ajouter un fichier
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}

          {!isLoading && (!attachments || attachments.length === 0) && (
            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <Paperclip className="h-8 w-8 opacity-40" />
              <p className="text-sm">Aucune pièce jointe</p>
            </div>
          )}

          {!isLoading && attachments && attachments.length > 0 && (
            <div className="space-y-1">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 py-1.5 text-sm">
                  {getFileIcon(att.contentType)}
                  <span className="flex-1 truncate">{att.filename}</span>
                  <span className="text-xs text-muted-foreground">{formatFileSize(att.size)}</span>
                  <span className="text-xs text-muted-foreground">{att.uploadedByName}</span>
                  <span className="text-xs text-muted-foreground">{formatAuditDate(att.createdAt)}</span>
                  <Button variant="ghost" size="icon" aria-label={`Télécharger ${att.filename}`} onClick={() => handleDownload(att.id, att.filename)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Supprimer ${att.filename}`} onClick={() => setDeleteTarget(att)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce fichier ?</DialogTitle>
            <DialogDescription>
              Le fichier « {deleteTarget?.filename} » sera définitivement supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
