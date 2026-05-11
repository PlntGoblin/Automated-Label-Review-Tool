import { describe, it, expect } from 'vitest'
import { FIELD_LABELS, FIELD_ORDER, STATUS_CLASS } from '../constants'

describe('constants', () => {
  it('FIELD_ORDER has exactly 6 fields', () => {
    expect(FIELD_ORDER).toHaveLength(6)
  })

  it('every FIELD_ORDER entry has a matching FIELD_LABELS entry', () => {
    for (const key of FIELD_ORDER) {
      expect(FIELD_LABELS[key]).toBeDefined()
      expect(typeof FIELD_LABELS[key]).toBe('string')
    }
  })

  it('STATUS_CLASS covers all three statuses', () => {
    expect(STATUS_CLASS.PASS).toBe('status-badge--pass')
    expect(STATUS_CLASS.FLAG).toBe('status-badge--flag')
    expect(STATUS_CLASS.LOW_CONFIDENCE).toBe('status-badge--low-confidence')
  })

  it('FIELD_ORDER matches backend field names', () => {
    expect(FIELD_ORDER).toContain('brand_name')
    expect(FIELD_ORDER).toContain('class_or_type')
    expect(FIELD_ORDER).toContain('alcohol_content')
    expect(FIELD_ORDER).toContain('net_contents')
    expect(FIELD_ORDER).toContain('bottler_name_and_address')
    expect(FIELD_ORDER).toContain('country_of_origin')
  })
})
