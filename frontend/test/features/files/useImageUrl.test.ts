import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useImageUrl, invalidateImageCache } from '@/features/files/useImageUrl'

// Track calls to downloadFileBlob
let downloadCalls = 0
let resolvers: Array<(blob: Blob) => void> = []

vi.mock('@/features/files/api', () => ({
  downloadFileBlob: vi.fn((_id: number) => {
    downloadCalls++
    return new Promise<Blob>((resolve) => {
      resolvers.push(resolve)
    })
  }),
}))

// Mock URL.createObjectURL / revokeObjectURL
const createdUrls: string[] = []
const revokedUrls: string[] = []
let urlCounter = 0

beforeEach(() => {
  downloadCalls = 0
  resolvers = []
  createdUrls.length = 0
  revokedUrls.length = 0
  urlCounter = 0

  vi.stubGlobal('URL', {
    ...globalThis.URL,
    createObjectURL: vi.fn((_blob: Blob) => {
      const url = `blob:test-${++urlCounter}`
      createdUrls.push(url)
      return url
    }),
    revokeObjectURL: vi.fn((url: string) => {
      revokedUrls.push(url)
    }),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useImageUrl', () => {
  it('deduplication : 2 hooks simultanes avec le meme attachmentId → 1 seul downloadFileBlob', async () => {
    const { result: result1 } = renderHook(() => useImageUrl(42))
    const { result: result2 } = renderHook(() => useImageUrl(42))

    // Both hooks should trigger only 1 download
    expect(downloadCalls).toBe(1)

    // Resolve the single download
    await act(async () => {
      resolvers[0](new Blob(['img'], { type: 'image/png' }))
      // Let microtasks flush
      await new Promise(r => setTimeout(r, 0))
    })

    await waitFor(() => {
      expect(result1.current).toBe('blob:test-1')
      expect(result2.current).toBe('blob:test-1')
    })
  })

  it('demontage du dernier ref → revokeObjectURL appele', async () => {
    const { result, unmount } = renderHook(() => useImageUrl(10))

    expect(downloadCalls).toBe(1)

    // Resolve download
    await act(async () => {
      resolvers[0](new Blob(['data'], { type: 'image/jpeg' }))
      await new Promise(r => setTimeout(r, 0))
    })

    await waitFor(() => {
      expect(result.current).toBe('blob:test-1')
    })

    // Unmount — last ref, should revoke
    unmount()

    expect(revokedUrls).toContain('blob:test-1')
  })

  it('invalidateImageCache avec composant actif → url passe a null', async () => {
    const { result } = renderHook(() => useImageUrl(99))

    // Resolve download
    await act(async () => {
      resolvers[0](new Blob(['pic'], { type: 'image/png' }))
      await new Promise(r => setTimeout(r, 0))
    })

    await waitFor(() => {
      expect(result.current).toBe('blob:test-1')
    })

    // Invalidate the cache while component is still mounted
    act(() => {
      invalidateImageCache(99)
    })

    await waitFor(() => {
      expect(result.current).toBeNull()
    })

    // The blob URL should have been revoked
    expect(revokedUrls).toContain('blob:test-1')
  })
})
