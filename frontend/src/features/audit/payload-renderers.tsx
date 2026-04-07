import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { InlineImagePreview } from './InlineImagePreview'
import { formatMontant } from '@/lib/format-montant'

export type PayloadRenderer = (
  payload: Record<string, unknown>,
  action: string,
  compact: boolean
) => ReactNode | null

const fieldLabelsRegistry: Record<string, Record<string, string>> = {
  Customer: {
    lastName: 'nom',
    LastName: 'nom',
    firstName: 'prénom',
    FirstName: 'prénom',
    telephone: 'téléphone',
    Telephone: 'téléphone',
    email: 'email',
    Email: 'email',
    address: 'adresse',
    Address: 'adresse',
  },
  User: {
    Email: 'email',
    Role: 'rôle',
    IsActive: 'actif',
  },
  CustomField: {
    Label: 'libellé',
    Options: 'options',
    ObligationLevel: 'obligation',
    AppliesToQuotes: 'appliqué aux devis',
    AppliesToSites: 'appliqué aux chantiers',
  },
  Quote: {
    Subject: 'objet',
    subject: 'objet',
    Priority: 'priorité',
    priority: 'priorité',
    Status: 'statut',
    status: 'statut',
    ReminderDate: 'date de relance',
    reminderDate: 'date de relance',
    ValidityDate: 'date de validité',
    validityDate: 'date de validité',
    EstimatedDuration: 'durée estimée',
    estimatedDuration: 'durée estimée',
    SiteAddress: 'adresse chantier',
    siteAddress: 'adresse chantier',
    TaxRate: 'taux TVA',
    taxRate: 'taux TVA',
    Notes: 'notes',
    notes: 'notes',
    AmountExclTax: 'montant HT',
    amountExclTax: 'montant HT',
    AmountInclTax: 'montant TTC',
    amountInclTax: 'montant TTC',
    LegalMentions: 'mentions légales',
    legalMentions: 'mentions légales',
  },
  Site: {
    Subject: 'objet',
    subject: 'objet',
    Status: 'statut',
    status: 'statut',
    SiteAddress: 'adresse chantier',
    siteAddress: 'adresse chantier',
    StartDate: 'date de début',
    startDate: 'date de début',
    EndDate: 'date de fin',
    endDate: 'date de fin',
    Notes: 'notes',
    notes: 'notes',
  },
  CompanyInfo: {
    CompanyName: 'raison sociale',
    Address: 'adresse',
    Siret: 'SIRET',
    VatNumber: 'n° TVA',
    LegalForm: 'forme juridique',
    InsurancePolicyNumber: 'n° police',
    InsuranceProvider: 'assureur',
    InsuranceCoverage: 'couverture',
    DefaultPaymentTerms: 'conditions de paiement',
  },
}

export function getFieldLabel(entityType: string, fieldKey: string): string {
  if (fieldKey === 'CustomFields') return 'champs personnalisés'
  if (fieldKey.startsWith('CustomFields:')) {
    const afterPrefix = fieldKey.slice('CustomFields:'.length)
    const colonIdx = afterPrefix.indexOf(':')
    return colonIdx >= 0 ? afterPrefix.slice(colonIdx + 1) : afterPrefix
  }
  return fieldLabelsRegistry[entityType]?.[fieldKey] ?? fieldKey
}

function isDiffValue(val: unknown): val is { Old: unknown; New: unknown } {
  return (
    typeof val === 'object' &&
    val !== null &&
    'Old' in val &&
    'New' in val
  )
}

export function formatDiffValue(value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return <em className="text-muted-foreground font-light italic">vide</em>
  }
  return String(value)
}

function isSingleFieldUpdate(
  p: Record<string, unknown>,
): p is { Field: string; OldValue: unknown; NewValue: unknown } {
  return 'Field' in p && 'OldValue' in p && 'NewValue' in p
}

function isReorder(
  p: Record<string, unknown>,
): p is { Action: string; Context: string; FieldIds: unknown[] } {
  return p.Action === 'Reorder' && typeof p.Context === 'string'
}

function isFileAttached(
  p: Record<string, unknown>,
): p is { attachmentId: number; filename: string; contentType: string; size: number } {
  return typeof p.filename === 'string' && typeof p.size === 'number'
}

function isFileRemoved(
  p: Record<string, unknown>,
): p is { attachmentId: number; filename: string } {
  return typeof p.filename === 'string' && typeof p.attachmentId === 'number' && !('size' in p)
}

// --- Compact renderers (inline text) ---

function renderDiffCompact(
  payload: Record<string, unknown>,
  entityType: string,
): string {
  const fields = Object.entries(payload)
    .filter(([k, v]) => !k.startsWith('Lines:') && isDiffValue(v))
    .map(([k]) => getFieldLabel(entityType, k))
  return fields.length > 0 ? fields.join(', ') : ''
}

function renderSingleFieldCompact(
  payload: { Field: string; OldValue: unknown; NewValue: unknown },
  entityType: string,
): string {
  return getFieldLabel(entityType, payload.Field)
}

function renderCreatedCompact(
  payload: Record<string, unknown>,
  entityType: string,
): string {
  const parts = Object.entries(payload)
    .filter(([, v]) => v != null && v !== '')
    .slice(0, 3)
    .map(([k, v]) => `${getFieldLabel(entityType, k)} : ${String(v)}`)
  return parts.join(', ')
}

export function renderPayloadCompact(
  payload: Record<string, unknown>,
  action: string,
  entityType: string,
): string {
  if (action === 'CommentAdded' && typeof payload.content === 'string') {
    return payload.content as string
  }
  if (action === 'FileAttached' && isFileAttached(payload)) {
    return payload.filename
  }
  if (action === 'FileRemoved' && isFileRemoved(payload)) {
    return payload.filename
  }
  if (action === 'Deleted') {
    return typeof payload.Label === 'string' ? payload.Label : ''
  }
  if (isReorder(payload)) {
    const ctx = payload.Context === 'quotes' ? 'devis' : payload.Context === 'sites' ? 'chantiers' : payload.Context
    return `Réorganisation des champs ${ctx}`
  }
  if (isSingleFieldUpdate(payload)) {
    return renderSingleFieldCompact(payload, entityType)
  }
  const hasDiff = Object.values(payload).some(isDiffValue)
  if (hasDiff) {
    const diffCompact = renderDiffCompact(payload, entityType)
    const linesCompact = renderQuoteLinesDiff(payload, true)
    if (linesCompact) {
      return diffCompact ? diffCompact + ', ' + linesCompact : (linesCompact as string)
    }
    return diffCompact
  }
  const linesCompact = renderQuoteLinesDiff(payload, true)
  if (linesCompact) {
    return linesCompact as string
  }
  if (action === 'Created') {
    return renderCreatedCompact(payload, entityType)
  }
  return ''
}

// --- Full renderers (ReactNode with badges) ---

function renderDiffFull(
  payload: Record<string, unknown>,
  entityType: string,
): ReactNode {
  const entries = Object.entries(payload).filter(([, v]) => isDiffValue(v))
  if (entries.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap flex-col gap-1 text-xs">
      {entries.map(([key, val]) => {
        const diff = val as { Old: unknown; New: unknown }
        return (
          <span key={key} className="flex flex-row flex-wrap items-center gap-1">
            <span className="text-muted-foreground text-nowrap">{getFieldLabel(entityType, key)} :</span>
            <Badge variant="outline" className="line-through text-muted-foreground">
              {formatDiffValue(diff.Old)}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="secondary">{formatDiffValue(diff.New)}</Badge>
          </span>
        )
      })}
    </div>
  )
}

function renderSingleFieldFull(
  payload: { Field: string; OldValue: unknown; NewValue: unknown },
  entityType: string,
): ReactNode {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
      <span className="text-muted-foreground">{getFieldLabel(entityType, payload.Field)} :</span>
      <Badge variant="outline" className="line-through text-muted-foreground">
        {formatDiffValue(payload.OldValue)}
      </Badge>
      <span className="text-muted-foreground">→</span>
      <Badge variant="secondary">{formatDiffValue(payload.NewValue)}</Badge>
    </div>
  )
}

function renderCreatedFull(
  payload: Record<string, unknown>,
  entityType: string,
): ReactNode {
  const entries = Object.entries(payload).filter(([, v]) => v != null && v !== '')
  if (entries.length === 0) return null

  return (
    <div className="mt-2 text-xs text-muted-foreground">
      {entries.map(([k, v], i) => (
        <span key={k}>
          {i > 0 && ', '}
          {getFieldLabel(entityType, k)} : {String(v)}
        </span>
      ))}
    </div>
  )
}

function renderFileAttachedFull(
  payload: { attachmentId: number; filename: string; contentType: string; size: number },
): ReactNode {
  return (
    <InlineImagePreview
      attachmentId={payload.attachmentId}
      filename={payload.filename}
      contentType={payload.contentType}
      size={payload.size}
    />
  )
}

function renderReorderFull(
  payload: { Action: string; Context: string; FieldIds: unknown[] },
): ReactNode {
  const ctx = payload.Context === 'quotes' ? 'devis' : payload.Context === 'sites' ? 'chantiers' : payload.Context
  return (
    <div className="mt-2 text-xs text-muted-foreground">
      Réorganisation des champs {ctx}
    </div>
  )
}

function renderDeletedFull(payload: Record<string, unknown>): ReactNode {
  if (typeof payload.Label === 'string') {
    return (
      <div className="mt-2 text-xs text-muted-foreground">{payload.Label}</div>
    )
  }
  return null
}

export function renderPayloadFull(
  payload: Record<string, unknown>,
  action: string,
  entityType: string,
): ReactNode {
  if (action === 'CommentAdded' && typeof payload.content === 'string') {
    return (
      <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
        {payload.content as string}
      </div>
    )
  }
  if (action === 'FileAttached' && isFileAttached(payload)) {
    return renderFileAttachedFull(payload)
  }
  if (action === 'FileRemoved' && isFileRemoved(payload)) {
    return (
      <div className="mt-2 text-xs text-muted-foreground">{payload.filename}</div>
    )
  }
  if (action === 'Deleted') {
    return renderDeletedFull(payload)
  }
  if (isReorder(payload)) {
    return renderReorderFull(payload)
  }
  if (isSingleFieldUpdate(payload)) {
    return renderSingleFieldFull(payload, entityType)
  }
  const hasDiff = Object.values(payload).some(isDiffValue)
  if (hasDiff) {
    return renderDiffFull(payload, entityType)
  }
  if (action === 'Created') {
    return renderCreatedFull(payload, entityType)
  }
  return null
}

// --- Quote lines diff renderer ---

const LINE_FIELD_LABELS: Record<string, string> = {
  Description: 'description',
  Quantity: 'quantité',
  UnitPriceExclTax: 'prix unitaire HT',
  DisplayOrder: 'ordre',
}

export function renderQuoteLinesDiff(
  payload: Record<string, unknown>,
  compact: boolean,
): ReactNode | string | null {
  const lineEntries = Object.entries(payload).filter(([k]) => k.startsWith('Lines:'))
  if (lineEntries.length === 0) return null

  if (compact) {
    const addedIds = new Set<string>()
    const modifiedIds = new Set<string>()
    const removedIds = new Set<string>()
    for (const [key] of lineEntries) {
      const parts = key.split(':')
      const action = parts[1]
      const lineId = parts[2]
      if (action === 'Added') addedIds.add(lineId)
      else if (action === 'Modified') modifiedIds.add(lineId)
      else if (action === 'Removed') removedIds.add(lineId)
    }
    const summaryParts: string[] = []
    if (modifiedIds.size > 0)
      summaryParts.push(`${modifiedIds.size} ligne${modifiedIds.size > 1 ? 's' : ''} modifiée${modifiedIds.size > 1 ? 's' : ''}`)
    if (addedIds.size > 0)
      summaryParts.push(`${addedIds.size} ligne${addedIds.size > 1 ? 's' : ''} ajoutée${addedIds.size > 1 ? 's' : ''}`)
    if (removedIds.size > 0)
      summaryParts.push(`${removedIds.size} ligne${removedIds.size > 1 ? 's' : ''} supprimée${removedIds.size > 1 ? 's' : ''}`)
    return summaryParts.join(', ')
  }

  // Full mode
  const elements: ReactNode[] = []

  for (const [key, val] of lineEntries) {
    const parts = key.split(':')
    const action = parts[1]
    const lineId = parts[2]

    if (action === 'Added') {
      const snap = val as { Description: string; Quantity: number; UnitPriceExclTax: number }
      elements.push(
        <span key={key} className="flex flex-row flex-wrap items-center gap-1">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Ligne ajoutée : <strong>{snap.Description}</strong> ({snap.Quantity} × {formatMontant(snap.UnitPriceExclTax)})
          </Badge>
        </span>
      )
    } else if (action === 'Removed') {
      const snap = val as { Description: string; Quantity: number; UnitPriceExclTax: number }
      elements.push(
        <span key={key} className="flex flex-row flex-wrap items-center gap-1">
          <Badge variant="outline" className="line-through text-muted-foreground">
            Ligne supprimée : {snap.Description} ({snap.Quantity} × {formatMontant(snap.UnitPriceExclTax)})
          </Badge>
        </span>
      )
    } else if (action === 'Modified') {
      const field = parts[3]
      const diff = val as { Old: unknown; New: unknown; LineDescription?: string }
      const fieldLabel = LINE_FIELD_LABELS[field] ?? field
      const isPrice = field === 'UnitPriceExclTax'
      elements.push(
        <span key={key} className="flex flex-row flex-wrap items-center gap-1">
          <span className="text-muted-foreground text-nowrap">
            {diff.LineDescription
              ? <><strong>{diff.LineDescription}</strong> (Ligne #{lineId}), </>
              : <><strong>Ligne #{lineId}</strong>, </>
            }
            {fieldLabel} :
          </span>
          <Badge variant="outline" className="line-through text-muted-foreground">
            {isPrice ? formatMontant(diff.Old as number) : formatDiffValue(diff.Old)}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="secondary">
            {isPrice ? formatMontant(diff.New as number) : formatDiffValue(diff.New)}
          </Badge>
        </span>
      )
    }
  }

  return <>{elements}</>
}

// Entity-specific renderer registry — extensible for Epic 3/4
export const entityRenderers: Record<string, PayloadRenderer> = {}

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Brouillon',
  Sent: 'Envoyé',
  Accepted: 'Validé',
  Refused: 'Refusé',
}

const SITE_STATUS_LABELS: Record<string, string> = {
  Planned: 'Planifié',
  InProgress: 'En cours',
  Paused: 'Pause',
  Completed: 'Terminé',
}

const PRIORITY_LABELS: Record<string, string> = {
  Low: 'Basse',
  Normal: 'Normale',
  High: 'Haute',
}

entityRenderers['Quote'] = (payload, action, compact) => {
  if (action === 'StatusChanged') {
    const old = STATUS_LABELS[String(payload.Old)] ?? formatDiffValue(payload.Old)
    const nw = STATUS_LABELS[String(payload.New)] ?? formatDiffValue(payload.New)
    return (
      <div className={`flex items-center gap-1 text-xs ${compact ? '' : 'mt-2 '}`}>
        <span className="text-muted-foreground">statut :</span>
        <Badge variant="outline" className="line-through text-muted-foreground">
          {old}
        </Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant="secondary">{nw}</Badge>
      </div>
    )
  }
  if (action === 'Updated') {
    const hasLineEntries = Object.keys(payload).some(k => k.startsWith('Lines:'))
    const hasPriority = isDiffValue(payload.Priority)

    // If no Lines:* entries and no Priority, let the default renderer handle it
    if (!hasLineEntries && !hasPriority) return null

    // Render standard diffs (non-Lines:* entries)
    const standardEntries = Object.entries(payload)
      .filter(([k, v]) => !k.startsWith('Lines:') && isDiffValue(v))

    const linesDiff = renderQuoteLinesDiff(payload, compact)

    if (compact) {
      const standardParts = standardEntries.map(([k]) => getFieldLabel('Quote', k))
      const parts: string[] = []
      if (standardParts.length > 0) parts.push(standardParts.join(', '))
      if (linesDiff) parts.push(linesDiff as string)
      return parts.length > 0 ? parts.join(', ') : null
    }

    // Full mode
    return (
      <div className="mt-2 flex flex-wrap flex-col gap-1 text-xs">
        {standardEntries.map(([key, val]) => {
          const diff = val as { Old: unknown; New: unknown }
          const isPriority = key === 'Priority' || key === 'priority'
          const oldVal = isPriority
            ? (PRIORITY_LABELS[String(diff.Old)] ?? formatDiffValue(diff.Old))
            : formatDiffValue(diff.Old)
          const newVal = isPriority
            ? (PRIORITY_LABELS[String(diff.New)] ?? formatDiffValue(diff.New))
            : formatDiffValue(diff.New)
          return (
            <span key={key} className="inline-flex items-center gap-1">
              <span className="text-muted-foreground text-nowrap">
                {getFieldLabel('Quote', key)} :
              </span>
              <Badge variant="outline" className="line-through text-muted-foreground">
                {oldVal}
              </Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="secondary">{newVal}</Badge>
            </span>
          )
        })}
        {linesDiff}
      </div>
    )
  }
  return null
}

entityRenderers['Site'] = (payload, action, compact) => {
  if (action === 'StatusChanged') {
    const old = SITE_STATUS_LABELS[String(payload.Old)] ?? formatDiffValue(payload.Old)
    const nw = SITE_STATUS_LABELS[String(payload.New)] ?? formatDiffValue(payload.New)
    return (
      <div className={`flex items-center gap-1 text-xs ${compact ? '' : 'mt-2 '}`}>
        <span className="text-muted-foreground">statut :</span>
        <Badge variant="outline" className="line-through text-muted-foreground">
          {old}
        </Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant="secondary">{nw}</Badge>
      </div>
    )
  }
  return null
}
