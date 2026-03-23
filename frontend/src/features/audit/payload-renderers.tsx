import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { InlineImagePreview } from './InlineImagePreview'

export type PayloadRenderer = (
  payload: Record<string, unknown>,
  action: string,
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
    .filter(([, v]) => isDiffValue(v))
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
    return renderDiffCompact(payload, entityType)
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
    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
      {entries.map(([key, val]) => {
        const diff = val as { Old: unknown; New: unknown }
        return (
          <span key={key} className="inline-flex items-center gap-1">
            <span className="text-muted-foreground text-nowrap">{getFieldLabel(entityType, key)} :</span>
            <Badge variant="outline" className="line-through text-muted-foreground">
              {String(diff.Old)}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="secondary">{String(diff.New)}</Badge>
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
        {String(payload.OldValue)}
      </Badge>
      <span className="text-muted-foreground">→</span>
      <Badge variant="secondary">{String(payload.NewValue)}</Badge>
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

// Entity-specific renderer registry — extensible for Epic 3/4
export const entityRenderers: Record<string, PayloadRenderer> = {}

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Brouillon',
  Sent: 'Envoyé',
  Accepted: 'Validé',
  Refused: 'Refusé',
}

const PRIORITY_LABELS: Record<string, string> = {
  Low: 'Basse',
  Normal: 'Normale',
  High: 'Haute',
}

entityRenderers['Quote'] = (payload, action) => {
  if (action === 'StatusChanged') {
    const old = STATUS_LABELS[String(payload.Old)] ?? String(payload.Old)
    const nw = STATUS_LABELS[String(payload.New)] ?? String(payload.New)
    return (
      <div className="mt-2 flex items-center gap-1 text-xs">
        <span className="text-muted-foreground">statut :</span>
        <Badge variant="outline" className="line-through text-muted-foreground">
          {old}
        </Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant="secondary">{nw}</Badge>
      </div>
    )
  }
  // Updated with Priority diff — translate values
  if (action === 'Updated' && isDiffValue(payload.Priority)) {
    //const priorityDiff = payload.Priority as { Old: unknown; New: unknown }
    const entries = Object.entries(payload).filter(([, v]) => isDiffValue(v))
    return (
      <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
        {entries.map(([key, val]) => {
          const diff = val as { Old: unknown; New: unknown }
          const isPriority = key === 'Priority' || key === 'priority'
          const oldVal = isPriority
            ? (PRIORITY_LABELS[String(diff.Old)] ?? String(diff.Old))
            : String(diff.Old)
          const newVal = isPriority
            ? (PRIORITY_LABELS[String(diff.New)] ?? String(diff.New))
            : String(diff.New)
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
      </div>
    )
  }
  return null
}
