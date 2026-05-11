import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ReviewChecklist from '../ReviewChecklist'
import { PASSING_RESULT, MANUAL_REVIEW_RESULT } from '../../__fixtures__/verification-result'

describe('ReviewChecklist', () => {
  it('renders all 6 field rows for a complete result', () => {
    render(<ReviewChecklist result={PASSING_RESULT} />)
    expect(screen.getByText('Brand Name')).toBeInTheDocument()
    expect(screen.getByText('Class / Type')).toBeInTheDocument()
    expect(screen.getByText('Alcohol Content')).toBeInTheDocument()
    expect(screen.getByText('Net Contents')).toBeInTheDocument()
    expect(screen.getByText('Bottler Name & Address')).toBeInTheDocument()
    expect(screen.getByText('Country of Origin')).toBeInTheDocument()
  })

  it('renders government warning panel', () => {
    render(<ReviewChecklist result={PASSING_RESULT} />)
    expect(screen.getByText('Government Warning')).toBeInTheDocument()
  })

  it('shows manual review alert for extraction failures', () => {
    render(<ReviewChecklist result={MANUAL_REVIEW_RESULT} />)
    expect(screen.getByText('Manual Review Required')).toBeInTheDocument()
    expect(screen.getByText('Vision extraction malformed: invalid JSON')).toBeInTheDocument()
  })

  it('renders no field rows when fields is empty (manual review)', () => {
    render(<ReviewChecklist result={MANUAL_REVIEW_RESULT} />)
    expect(screen.queryByText('Brand Name')).not.toBeInTheDocument()
  })

  it('has accessible section label', () => {
    render(<ReviewChecklist result={PASSING_RESULT} />)
    expect(screen.getByRole('region', { name: 'Verification results' })).toBeInTheDocument()
  })
})
