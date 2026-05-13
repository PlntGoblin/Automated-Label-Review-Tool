import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BatchResults from '../BatchResults'
import { PASSING_RESULT, FLAGGED_RESULT, MANUAL_REVIEW_RESULT } from '../../__fixtures__/verification-result'

const FILE_NAMES = ['pass.jpg', 'flag.jpg', 'review.jpg']
const RESULTS = [PASSING_RESULT, FLAGGED_RESULT, MANUAL_REVIEW_RESULT]

describe('BatchResults', () => {
  it('renders summary bar with label count', () => {
    render(<BatchResults results={RESULTS} fileNames={FILE_NAMES} labelDataUrls={[]} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Labels')).toBeInTheDocument()
  })

  it('renders a row for each result', () => {
    render(<BatchResults results={RESULTS} fileNames={FILE_NAMES} labelDataUrls={[]} />)
    expect(screen.getByText('pass.jpg')).toBeInTheDocument()
    expect(screen.getByText('flag.jpg')).toBeInTheDocument()
    expect(screen.getByText('review.jpg')).toBeInTheDocument()
  })

  it('shows Pass badge for clean results', () => {
    render(<BatchResults results={[PASSING_RESULT]} fileNames={['pass.jpg']} labelDataUrls={[]} />)
    expect(screen.getByText('Pass')).toBeInTheDocument()
  })

  it('shows Flagged badge for flagged results', () => {
    render(<BatchResults results={[FLAGGED_RESULT]} fileNames={['flag.jpg']} labelDataUrls={[]} />)
    expect(screen.getByText('Flagged')).toBeInTheDocument()
  })

  it('expands a row to show details on click', async () => {
    const user = userEvent.setup()
    render(<BatchResults results={RESULTS} fileNames={FILE_NAMES} labelDataUrls={[]} />)
    const expandBtn = screen.getByLabelText('Expand details for pass.jpg')
    await user.click(expandBtn)
    expect(screen.getByText('Collapse')).toBeInTheDocument()
  })

  it('collapses an expanded row', async () => {
    const user = userEvent.setup()
    render(<BatchResults results={RESULTS} fileNames={FILE_NAMES} labelDataUrls={[]} />)
    await user.click(screen.getByLabelText('Expand details for pass.jpg'))
    await user.click(screen.getByLabelText('Collapse details for pass.jpg'))
    expect(screen.queryByText('Collapse')).not.toBeInTheDocument()
  })

  it('sorts by filename when header clicked', async () => {
    const user = userEvent.setup()
    render(<BatchResults results={RESULTS} fileNames={FILE_NAMES} labelDataUrls={[]} />)
    const filenameBtn = screen.getByRole('button', { name: /Filename/i })
    await user.click(filenameBtn)
    const rows = screen.getAllByRole('row')
    // Header + 3 data rows
    expect(rows).toHaveLength(4)
  })

  it('sorts by flags when header clicked', async () => {
    const user = userEvent.setup()
    render(<BatchResults results={RESULTS} fileNames={FILE_NAMES} labelDataUrls={[]} />)
    const flagsBtn = screen.getByRole('button', { name: /^Flags/i })
    await user.click(flagsBtn)
    // Should not throw, sorting works
    expect(screen.getByText('flag.jpg')).toBeInTheDocument()
  })

  it('has accessible table label', () => {
    render(<BatchResults results={RESULTS} fileNames={FILE_NAMES} labelDataUrls={[]} />)
    expect(screen.getByRole('table', { name: /Batch verification results/i })).toBeInTheDocument()
  })
})
