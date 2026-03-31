import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { downloadFileBlob } from './api'

type CacheEntry =
  | { status: 'pending'; promise: Promise<string>; refCount: number }
  | { status: 'ready'; url: string; refCount: number }

const imageCache = new Map<number, CacheEntry>()
const evictionTimers = new Map<number, ReturnType<typeof setTimeout>>()
const CACHE_TTL_MS = 60_000 * 5 // garder les entrees ready 5 min apres le dernier unmount

// --- Reactive notification for invalidations ---
let cacheVersion = 0
const listeners = new Set<() => void>()
function notifyListeners() {
  cacheVersion++
  listeners.forEach(l => l())
}
function subscribeCacheChanges(callback: () => void) {
  listeners.add(callback)
  return () => { listeners.delete(callback) }
}
function getCacheVersion() { return cacheVersion }

/** Charge une image protegee par Bearer token et retourne une blob URL (avec cache et deduplication) */
export function useImageUrl(attachmentId: number | null) {
  const [url, setUrl] = useState<string | null>(null)

  // Re-render + re-run effect quand le cache est invalide (ex: suppression de fichier)
  const version = useSyncExternalStore(subscribeCacheChanges, getCacheVersion, getCacheVersion)

  // Track which attachmentId has been processed — distinguishes "first mount" (download needed)
  // from "invalidated entry" (no re-download) when the cache has no entry.
  const mountedForRef = useRef<number | null>(null)

  useEffect(() => {
    if (!attachmentId) { setUrl(null); mountedForRef.current = null; return }

    const existing = imageCache.get(attachmentId)

    // No cache entry but we already processed this id → entry was invalidated, don't re-download
    if (!existing && mountedForRef.current === attachmentId) {
      setUrl(null)
      return
    }

    mountedForRef.current = attachmentId

    if (existing?.status === 'ready') {
      existing.refCount++
      cancelEviction(attachmentId)
      setUrl(existing.url)
      return () => release(attachmentId)
    }

    if (existing?.status === 'pending') {
      existing.refCount++
      let cancelled = false
      existing.promise.then(blobUrl => {
        if (!cancelled) setUrl(blobUrl)
      }).catch(() => { if (!cancelled) setUrl(null) })
      return () => { cancelled = true; release(attachmentId) }
    }

    // No entry — start download and create pending entry
    const promise = downloadFileBlob(attachmentId).then(blob => {
      const blobUrl = URL.createObjectURL(blob)
      const entry = imageCache.get(attachmentId)
      if (entry && entry.status === 'pending') {
        if (entry.refCount > 0) {
          imageCache.set(attachmentId, {
            status: 'ready', url: blobUrl, refCount: entry.refCount,
          })
        } else {
          // Plus personne n'ecoute — nettoyer
          URL.revokeObjectURL(blobUrl)
          imageCache.delete(attachmentId)
        }
      }
      return blobUrl
    })

    imageCache.set(attachmentId, { status: 'pending', promise, refCount: 1 })

    let cancelled = false
    promise.then(blobUrl => {
      if (!cancelled) setUrl(blobUrl)
    }).catch(() => {
      imageCache.delete(attachmentId)
      if (!cancelled) setUrl(null)
    })

    return () => { cancelled = true; release(attachmentId) }
  }, [attachmentId, version])

  return url
}

function release(attachmentId: number) {
  const entry = imageCache.get(attachmentId)
  if (!entry) return
  entry.refCount--
  if (entry.refCount <= 0 && entry.status === 'ready') {
    scheduleEviction(attachmentId)
  }
  // Les entrees pending restent — la resolution de la promesse nettoiera si refCount <= 0
}

function scheduleEviction(attachmentId: number) {
  cancelEviction(attachmentId)
  evictionTimers.set(attachmentId, setTimeout(() => {
    evictionTimers.delete(attachmentId)
    const entry = imageCache.get(attachmentId)
    if (entry && entry.status === 'ready' && entry.refCount <= 0) {
      URL.revokeObjectURL(entry.url)
      imageCache.delete(attachmentId)
    }
  }, CACHE_TTL_MS))
}

function cancelEviction(attachmentId: number) {
  const timer = evictionTimers.get(attachmentId)
  if (timer) {
    clearTimeout(timer)
    evictionTimers.delete(attachmentId)
  }
}

/** Invalide le cache pour un attachement supprime.
 *  Revoque l'URL et notifie les consommateurs actifs via useSyncExternalStore. */
export function invalidateImageCache(attachmentId: number) {
  cancelEviction(attachmentId)
  const entry = imageCache.get(attachmentId)
  if (entry) {
    if (entry.status === 'ready') URL.revokeObjectURL(entry.url)
    imageCache.delete(attachmentId)
    notifyListeners()
  }
}
