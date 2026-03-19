import type { ReactNode } from 'react'
import { Paperclip } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
  return fieldLabelsRegistry[entityType]?.[fieldKey] ?? fieldKey
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  if (action === 'FileAttached' && isFileAttached(payload)) {
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
    <div className="mt-2 flex items-center gap-1 text-xs">
      <Badge variant="outline">
        <Paperclip className="mr-1 h-3 w-3" />
        {payload.filename}
      </Badge>
      <span className="text-muted-foreground">{formatFileSize(payload.size)}</span>
    </div>
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
  if (action === 'FileAttached' && isFileAttached(payload)) {
    return renderFileAttachedFull(payload)
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
