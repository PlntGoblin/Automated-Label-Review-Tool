import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import WarningPanel from '../WarningPanel'
import type { WarningResult } from '../../types'

const BASE_WARNING: WarningResult = {
  status: 'PASS',
  extracted_text: 'GOVERNMENT WARNING: test text',
  canonical_text: 'GOVERNMENT WARNING: canonical text',
  is_all_caps: true,
  is_bold: true,
  is_continuous_paragraph: true,
  region_crop: null,
}

describe('WarningPanel', () => {
  it('renders the heading', () => {
    render(<WarningPanel warning={BASE_WARNING} />)
    expect(screen.getByText('Government Warning')).toBeInTheDocument()
  })

  it('displays extracted text', () => {
    render(<WarningPanel warning={BASE_WARNING} />)
    expect(screen.getByText('GOVERNMENT WARNING: test text')).toBeInTheDocument()
  })

  it('shows "Not found on label" when extracted_text is null', () => {
    const warning: WarningResult = { ...BASE_WARNING, extracted_text: null, status: 'FLAG' }
    render(<WarningPanel warning={warning} />)
    expect(screen.getByText('Not found on label')).toBeInTheDocument()
  })

  it('displays canonical text', () => {
    render(<WarningPanel warning={BASE_WARNING} />)
    expect(screen.getByText('GOVERNMENT WARNING: canonical text')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<WarningPanel warning={BASE_WARNING} />)
    expect(screen.getByText('PASS')).toHaveClass('bg-green-100')
  })

  it('displays visual properties', () => {
    render(<WarningPanel warning={BASE_WARNING} />)
    expect(screen.getByText('All caps: Yes')).toBeInTheDocument()
    expect(screen.getByText('Bold: Yes')).toBeInTheDocument()
    expect(screen.getByText('Continuous: Yes')).toBeInTheDocument()
  })

  it('shows Unknown for null visual properties', () => {
    const warning: WarningResult = { ...BASE_WARNING, is_all_caps: null, is_bold: null, is_continuous_paragraph: null }
    render(<WarningPanel warning={warning} />)
    expect(screen.getByText('All caps: Unknown')).toBeInTheDocument()
    expect(screen.getByText('Bold: Unknown')).toBeInTheDocument()
    expect(screen.getByText('Continuous: Unknown')).toBeInTheDocument()
  })

  it('shows No for false visual properties', () => {
    const warning: WarningResult = { ...BASE_WARNING, is_all_caps: false, is_bold: false, is_continuous_paragraph: false }
    render(<WarningPanel warning={warning} />)
    expect(screen.getByText('All caps: No')).toBeInTheDocument()
    expect(screen.getByText('Bold: No')).toBeInTheDocument()
    expect(screen.getByText('Continuous: No')).toBeInTheDocument()
  })

  it('renders crop image when present', () => {
    const warning: WarningResult = { ...BASE_WARNING, region_crop: 'data:image/png;base64,BBBB' }
    render(<WarningPanel warning={warning} />)
    const img = screen.getByAltText('Government warning region crop')
    expect(img).toHaveAttribute('src', 'data:image/png;base64,BBBB')
  })

  it('hides crop section when region_crop is null', () => {
    render(<WarningPanel warning={BASE_WARNING} />)
    expect(screen.queryByAltText('Government warning region crop')).not.toBeInTheDocument()
  })
})
