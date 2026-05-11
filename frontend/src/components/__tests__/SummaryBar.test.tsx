import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SummaryBar from '../SummaryBar'
import type { VerificationSummary } from '../../types'

const BASE_SUMMARY: VerificationSummary = {
  pass_count: 5,
  flag_count: 1,
  low_confidence_count: 0,
  requires_full_manual_review: false,
}

describe('SummaryBar', () => {
  it('renders count labels', () => {
    render(<SummaryBar summary={BASE_SUMMARY} manualReviewRequired={false} errorReason={null} />)
    expect(screen.getByText('Passed')).toBeInTheDocument()
    expect(screen.getByText('Flagged')).toBeInTheDocument()
  })

  it('renders correct pass count', () => {
    render(<SummaryBar summary={BASE_SUMMARY} manualReviewRequired={false} errorReason={null} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows manual review alert with error reason', () => {
    render(<SummaryBar summary={BASE_SUMMARY} manualReviewRequired={true} errorReason="Vision API failed" />)
    expect(screen.getByText('Manual Review Required')).toBeInTheDocument()
    expect(screen.getByText('Vision API failed')).toBeInTheDocument()
  })

  it('shows default manual review message when errorReason is null', () => {
    render(<SummaryBar summary={BASE_SUMMARY} manualReviewRequired={true} errorReason={null} />)
    expect(screen.getByText(/Vision extraction failed/)).toBeInTheDocument()
  })

  it('shows low confidence alert when requires_full_manual_review is true', () => {
    const summary: VerificationSummary = { ...BASE_SUMMARY, requires_full_manual_review: true }
    render(<SummaryBar summary={summary} manualReviewRequired={false} errorReason={null} />)
    expect(screen.getByText(/Multiple fields could not be read/)).toBeInTheDocument()
  })

  it('does not show low confidence alert when manualReviewRequired trumps it', () => {
    const summary: VerificationSummary = { ...BASE_SUMMARY, requires_full_manual_review: true }
    render(<SummaryBar summary={summary} manualReviewRequired={true} errorReason="error" />)
    expect(screen.getByText('Manual Review Required')).toBeInTheDocument()
    expect(screen.queryByText(/Multiple fields could not be read/)).not.toBeInTheDocument()
  })

  it('has accessible role and label on the summary bar', () => {
    render(<SummaryBar summary={BASE_SUMMARY} manualReviewRequired={false} errorReason={null} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Verification summary')
  })
})
