import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FieldRow from '../FieldRow'
import type { FieldResult } from '../../types'

const BASE_RESULT: FieldResult = {
  status: 'PASS',
  extracted_value: 'Test Vodka',
  application_value: 'Test Vodka',
  region_crop: null,
  note: null,
}

describe('FieldRow', () => {
  it('renders field label from FIELD_LABELS lookup', () => {
    render(<FieldRow name="brand_name" result={BASE_RESULT} />)
    expect(screen.getByText('Brand Name')).toBeInTheDocument()
  })

  it('falls back to raw name for unknown fields', () => {
    render(<FieldRow name="unknown_field" result={BASE_RESULT} />)
    expect(screen.getByText('unknown_field')).toBeInTheDocument()
  })

  it('displays extracted and application values', () => {
    const result: FieldResult = { ...BASE_RESULT, extracted_value: 'Extracted Brand', application_value: 'App Brand' }
    render(<FieldRow name="brand_name" result={result} />)
    expect(screen.getByText('Extracted Brand')).toBeInTheDocument()
    expect(screen.getByText('App Brand')).toBeInTheDocument()
  })

  it('shows "Not found" when extracted_value is null', () => {
    const result: FieldResult = { ...BASE_RESULT, extracted_value: null, status: 'FLAG' }
    render(<FieldRow name="brand_name" result={result} />)
    expect(screen.getByText('Not found')).toBeInTheDocument()
  })

  it('renders PASS badge with correct class', () => {
    render(<FieldRow name="brand_name" result={BASE_RESULT} />)
    const badge = screen.getByText('PASS')
    expect(badge).toHaveClass('bg-green-100')
  })

  it('renders FLAG badge with correct class', () => {
    const result: FieldResult = { ...BASE_RESULT, status: 'FLAG', note: 'Mismatch' }
    render(<FieldRow name="brand_name" result={result} />)
    const badge = screen.getByText('FLAG')
    expect(badge).toHaveClass('bg-error-container')
  })

  it('renders LOW CONFIDENCE badge with correct class', () => {
    const result: FieldResult = { ...BASE_RESULT, status: 'LOW_CONFIDENCE' }
    render(<FieldRow name="brand_name" result={result} />)
    const badge = screen.getByText('LOW CONFIDENCE')
    expect(badge).toHaveClass('bg-amber-100')
  })

  it('displays note when present', () => {
    const result: FieldResult = { ...BASE_RESULT, status: 'FLAG', note: 'Brand name does not match.' }
    render(<FieldRow name="brand_name" result={result} />)
    expect(screen.getByText('Brand name does not match.')).toBeInTheDocument()
  })

  it('hides note when null', () => {
    render(<FieldRow name="brand_name" result={BASE_RESULT} />)
    // note paragraph should not appear when note is null
    expect(screen.queryByRole('paragraph', { name: /note/i })).not.toBeInTheDocument()
    // only the two value lines are present (Label: and Application:)
    expect(screen.queryByText(/Brand name does not match/)).not.toBeInTheDocument()
  })

  it('shows crop placeholder when region_crop is null', () => {
    render(<FieldRow name="brand_name" result={BASE_RESULT} />)
    expect(screen.getByText('image_not_supported')).toBeInTheDocument()
  })

  it('shows crop image when region_crop is present', () => {
    const result: FieldResult = { ...BASE_RESULT, region_crop: 'data:image/png;base64,AAAA' }
    render(<FieldRow name="brand_name" result={result} />)
    const img = screen.getByAltText('Label crop for Brand Name')
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA')
  })
})
