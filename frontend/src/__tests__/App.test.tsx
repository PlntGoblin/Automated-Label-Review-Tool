import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'

// Mock the API module
vi.mock('../api', () => ({
  verifyLabel: vi.fn(),
}))

import { verifyLabel } from '../api'
import { PASSING_RESULT } from '../__fixtures__/verification-result'

const mockedVerify = vi.mocked(verifyLabel)

// Helper: create a mock FileReader class that resolves immediately
function mockFileReader(base64Result: string) {
  const MockFR = vi.fn().mockImplementation(function (this: {
    readAsDataURL: () => void
    onload: (() => void) | null
    result: string
  }) {
    this.result = base64Result
    this.onload = null
    this.readAsDataURL = vi.fn(function (this: { onload: (() => void) | null }) {
      setTimeout(() => this.onload?.(), 0)
    }.bind(this))
  })
  vi.stubGlobal('FileReader', MockFR)
}

async function setupFileAndFields() {
  mockFileReader('data:image/jpeg;base64,ZmFrZQ==')

  const dropZone = screen.getByRole('button', { name: 'Upload label images' })
  const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['fake'], 'label.jpg', { type: 'image/jpeg' })

  await userEvent.upload(fileInput, file)
  await act(async () => { await new Promise((r) => setTimeout(r, 10)) })

  await userEvent.type(screen.getByLabelText('Brand Name'), 'Test Vodka')
  await userEvent.type(screen.getByLabelText('Class / Type'), 'Vodka')
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('renders the header', () => {
    render(<App />)
    expect(screen.getAllByText('ALRT').length).toBeGreaterThan(0)
    expect(screen.getByText(/TTB COLA Verification/)).toBeInTheDocument()
  })

  it('renders the landing page with stepper', () => {
    render(<App />)
    expect(screen.getByText('New Label Verification')).toBeInTheDocument()
    expect(screen.getByText('Upload Label')).toBeInTheDocument()
    expect(screen.getByText('Application Data')).toBeInTheDocument()
    expect(screen.getByText('Review & Run')).toBeInTheDocument()
  })

  it('renders the upload drop zone', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Upload label images' })).toBeInTheDocument()
  })

  it('disables submit button when no file is selected', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /Run Automated Review/i })
    expect(button).toBeDisabled()
  })

  it('enables submit when file + required fields are present', async () => {
    render(<App />)
    await setupFileAndFields()
    const button = screen.getByRole('button', { name: /Run Automated Review/i })
    expect(button).toBeEnabled()
  })

  it('shows results view after successful verification', async () => {
    mockedVerify.mockResolvedValueOnce(PASSING_RESULT)
    render(<App />)
    await setupFileAndFields()

    await userEvent.click(screen.getByRole('button', { name: /Run Automated Review/i }))

    expect(await screen.findByText('Verification Results')).toBeInTheDocument()
  })

  it('shows error alert on API failure', async () => {
    mockedVerify.mockRejectedValueOnce(new Error('Network error'))
    render(<App />)
    await setupFileAndFields()

    await userEvent.click(screen.getByRole('button', { name: /Run Automated Review/i }))

    expect(await screen.findByText(/Network error/)).toBeInTheDocument()
  })

  it('resets to initial state on New Verification click', async () => {
    mockedVerify.mockResolvedValueOnce(PASSING_RESULT)
    render(<App />)
    await setupFileAndFields()

    await userEvent.click(screen.getByRole('button', { name: /Run Automated Review/i }))
    await screen.findByText('Verification Results')

    await userEvent.click(screen.getByRole('button', { name: /New Verification/i }))

    expect(screen.getByText('New Label Verification')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload label images' })).toBeInTheDocument()
  })

  it('loading spinner has accessible role', async () => {
    mockedVerify.mockImplementation(() => new Promise(() => {}))
    render(<App />)
    await setupFileAndFields()

    await userEvent.click(screen.getByRole('button', { name: /Run Automated Review/i }))

    const spinner = await screen.findByRole('status')
    expect(spinner).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText(/Running AI vision/)).toBeInTheDocument()
  })
})
