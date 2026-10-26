import { describe, expect, it } from 'vitest'
import { eventTypeLabels, hiveStatusLabels, label, plannedActionLabels } from './labels'

describe('label', () => {
  it('translates known values', () => {
    expect(label(hiveStatusLabels, 'dead')).toBe('Muerta')
    expect(label(plannedActionLabels, 'feed')).toBe('Alimentar')
    expect(label(eventTypeLabels, 'qr_relabel')).toBe('Cambio de etiqueta QR')
  })

  it('shows an unknown value as is and a missing one as a dash', () => {
    expect(label(hiveStatusLabels, 'hibernating')).toBe('hibernating')
    expect(label(hiveStatusLabels, null)).toBe('—')
  })

  it('does not read inherited keys', () => {
    expect(label(hiveStatusLabels, 'toString')).toBe('toString')
  })
})
