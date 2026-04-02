import { useState } from 'react'
import { UserPlus, Clock, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSiteAssignments } from './useSites'
import { AssignWorkerDialog } from './AssignWorkerDialog'
import { EditAssignmentDialog } from './EditAssignmentDialog'
import type { SiteAssignment } from './types'

interface ChantierEquipeProps {
  siteId: number
}

function formatSlot(start: string | null, end: string | null): string {
  if (!start && !end) return 'Toute la durée'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (start && end) {
    const sameDay = new Date(start).toDateString() === new Date(end).toDateString()
    if (sameDay) return `${fmtDate(start)} ${fmtTime(start)}-${fmtTime(end)}`
    return `${fmtDate(start)} ${fmtTime(start)} → ${fmtDate(end)} ${fmtTime(end)}`
  }
  return '—'
}

export function ChantierEquipe({ siteId }: ChantierEquipeProps) {
  const { data: assignments, isLoading } = useSiteAssignments(siteId)
  const [assignOpen, setAssignOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<SiteAssignment | null>(null)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Équipe</CardTitle>
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Attribuer l'équipe
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {!isLoading && (!assignments || assignments.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucun ouvrier attribué</p>
          )}
          {assignments && assignments.length > 0 && (
            <div className="space-y-2">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {a.userFullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{a.userFullName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatSlot(a.startDatetime, a.endDatetime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingAssignment(a)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignWorkerDialog siteId={siteId} open={assignOpen} onOpenChange={setAssignOpen} />

      {editingAssignment && (
        <EditAssignmentDialog
          siteId={siteId}
          assignment={editingAssignment}
          open={!!editingAssignment}
          onOpenChange={(open) => { if (!open) setEditingAssignment(null) }}
        />
      )}
    </>
  )
}
