import type { ReactNode } from 'react'
import {
  entityRenderers,
  renderPayloadFull,
  renderPayloadCompact,
} from './payload-renderers'

interface AuditPayloadDisplayProps {
  payload: string | null
  action: string
  entityType: string
  compact?: boolean
}

export function AuditPayloadDisplay({
  payload,
  action,
  entityType,
  compact = false,
}: AuditPayloadDisplayProps) {
  if (!payload) return null

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(payload)
  } catch {
    const truncated = payload.slice(0, 100)
    return <span className="text-xs text-muted-foreground">{truncated}</span>
  }

  // Check entity-specific renderer first
  const specificRenderer = entityRenderers[entityType]
  if (specificRenderer) {
    const result = specificRenderer(parsed, action, compact)
    if (result !== null) return <>{result}</>
  }

  if (compact) {
    const text = renderPayloadCompact(parsed, action, entityType)
    if (!text) return null
    const truncated = text.length > 80 ? text.slice(0, 77) + '…' : text
    return <span className="text-xs text-muted-foreground"> · {truncated}</span>
  }

  const node: ReactNode = renderPayloadFull(parsed, action, entityType)
  if (!node) return null
  return <>{node}</>
}
