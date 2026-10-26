import { describe, expect, it } from 'vitest'
import { freeStorageBytes, storageUsage } from './storage'

describe('storageUsage', () => {
  it('turns honey from 70 % and red from 90 %', () => {
    expect(storageUsage(0)).toEqual({ percent: 0, tone: 'ok' })
    expect(storageUsage(freeStorageBytes * 0.69).tone).toBe('ok')
    expect(storageUsage(freeStorageBytes * 0.7).tone).toBe('warning')
    expect(storageUsage(freeStorageBytes * 0.9).tone).toBe('danger')
  })

  it('caps the bar at 100 %', () => {
    expect(storageUsage(freeStorageBytes * 2).percent).toBe(100)
  })
})
