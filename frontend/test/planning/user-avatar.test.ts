import { describe, it, expect } from 'vitest'
import { getInitials } from '@/features/planning/user-avatar'

describe('getInitials', () => {
  it('should return initials for a full name', () => {
    expect(getInitials('Martin Pierre')).toBe('MP')
  })

  it('should return single initial for a single name', () => {
    expect(getInitials('Martin')).toBe('M')
  })

  it('should return empty string for empty input', () => {
    expect(getInitials('')).toBe('')
  })

  it('should limit to 2 characters', () => {
    expect(getInitials('Jean Pierre Martin')).toBe('JP')
  })

  it('should uppercase initials', () => {
    expect(getInitials('jean pierre')).toBe('JP')
  })
})
