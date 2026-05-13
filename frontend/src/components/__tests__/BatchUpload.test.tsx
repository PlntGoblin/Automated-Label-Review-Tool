import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import BatchUpload, { parseCSV } from '../BatchUpload'

// --- parseCSV unit tests ---

describe('parseCSV', () => {
  const validHeader = 'filename,brand_name,class_or_type,alcohol_content,net_contents,bottler_name_and_address,country_of_origin'

  it('parses a valid CSV with one data row', () => {
    const csv = `${validHeader}\nlabel.jpg,Acme,Bourbon,45%,750 mL,"Acme Inc, KY",USA`
    const { rows, errors } = parseCSV(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.filename).toBe('label.jpg')
    expect(rows[0]!.application.brand_name).toBe('Acme')
    expect(rows[0]!.application.bottler_name_and_address).toBe('Acme Inc, KY')
  })

  it('parses multiple rows', () => {
    const csv = `${validHeader}\na.jpg,A,Type,5%,355 mL,Brewer,USA\nb.jpg,B,Wine,12%,750 mL,Winery,France`
    const { rows, errors } = parseCSV(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(2)
    expect(rows[0]!.filename).toBe('a.jpg')
    expect(rows[1]!.filename).toBe('b.jpg')
  })

  it('returns error for missing header', () => {
    const { rows, errors } = parseCSV('just one line')
    expect(rows).toHaveLength(0)
    expect(errors[0]).toMatch(/header row/)
  })

  it('returns error for missing required columns', () => {
    const csv = 'filename,brand_name\nlabel.jpg,Test'
    const { errors } = parseCSV(csv)
    expect(errors[0]).toMatch(/missing required columns/)
    expect(errors[0]).toContain('class_or_type')
  })

  it('flags rows with missing filename', () => {
    const csv = `${validHeader}\n,Acme,Bourbon,45%,750 mL,Acme Inc,USA`
    const { rows, errors } = parseCSV(csv)
    expect(rows).toHaveLength(0)
    expect(errors[0]).toMatch(/Row 2.*missing filename/)
  })

  it('handles quoted fields with commas', () => {
    const csv = `${validHeader}\nlabel.jpg,Acme,Bourbon,45%,750 mL,"Louisville, KY 40004",USA`
    const { rows } = parseCSV(csv)
    expect(rows[0]!.application.bottler_name_and_address).toBe('Louisville, KY 40004')
  })

  it('handles empty CSV', () => {
    const { rows, errors } = parseCSV('')
    expect(rows).toHaveLength(0)
    expect(errors[0]).toMatch(/header row/)
  })
})

// --- BatchUpload component tests ---

describe('BatchUpload', () => {
  const mockSubmit = vi.fn()

  it('renders image and CSV upload zones', () => {
    render(<BatchUpload onSubmit={mockSubmit} disabled={false} />)
    expect(screen.getByLabelText(/Upload label images/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Upload CSV/i)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<BatchUpload onSubmit={mockSubmit} disabled={false} />)
    expect(screen.getByRole('button', { name: /Verify Batch/i })).toBeInTheDocument()
  })

  it('disables submit button when disabled prop is true', () => {
    render(<BatchUpload onSubmit={mockSubmit} disabled={true} />)
    expect(screen.getByRole('button', { name: /Verify Batch/i })).toBeDisabled()
  })

  it('shows CSV upload zone in default mode', () => {
    render(<BatchUpload onSubmit={mockSubmit} disabled={false} />)
    expect(screen.getByText(/Application Data \(CSV\)/i)).toBeInTheDocument()
  })

  it('upload zones are keyboard accessible', async () => {
    render(<BatchUpload onSubmit={mockSubmit} disabled={false} />)
    const imageZone = screen.getByLabelText(/Upload label images/i)
    const csvZone = screen.getByLabelText(/Upload CSV/i)
    expect(imageZone).toHaveAttribute('tabIndex', '0')
    expect(csvZone).toHaveAttribute('tabIndex', '0')
  })
})
