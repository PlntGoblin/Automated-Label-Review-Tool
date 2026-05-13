import { useCallback, useMemo, useRef, useState } from 'react'
import type { ApplicationData, VerifyRequest } from '../types'
import { FIELD_ORDER } from '../constants'
import { fileToBase64 } from '../util'
import ApplicationForm from './ApplicationForm'

interface BatchUploadProps {
  onSubmit: (requests: VerifyRequest[], fileNames: string[]) => void
  disabled: boolean
}

interface ParsedRow {
  filename: string
  application: ApplicationData
}

const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.pdf'
const CSV_ACCEPT = '.csv'

const REQUIRED_COLUMNS = ['filename', ...FIELD_ORDER] as const

const EMPTY_APPLICATION: ApplicationData = {
  brand_name: '',
  class_or_type: '',
  alcohol_content: '',
  net_contents: '',
  bottler_name_and_address: '',
  country_of_origin: '',
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

export function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  const errors: string[] = []

  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must have a header row and at least one data row.'] }
  }

  const header = parseCSVLine(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, '_'))
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c))
  if (missing.length > 0) {
    return { rows: [], errors: [`CSV missing required columns: ${missing.join(', ')}`] }
  }

  const ci: Record<string, number> = {}
  for (const c of REQUIRED_COLUMNS) ci[c] = header.indexOf(c)
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]!)
    const filename = fields[ci['filename']!] ?? ''
    if (!filename) {
      errors.push(`Row ${i + 1}: missing filename.`)
      continue
    }
    rows.push({
      filename,
      application: {
        brand_name: fields[ci['brand_name']!] ?? '',
        class_or_type: fields[ci['class_or_type']!] ?? '',
        alcohol_content: fields[ci['alcohol_content']!] ?? '',
        net_contents: fields[ci['net_contents']!] ?? '',
        bottler_name_and_address: fields[ci['bottler_name_and_address']!] ?? '',
        country_of_origin: fields[ci['country_of_origin']!] ?? '',
      },
    })
  }

  return { rows, errors }
}

export default function BatchUpload({ onSubmit, disabled }: BatchUploadProps) {
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv')

  // CSV mode state
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([])
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const imageInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  // CSV mode drag state
  const [imageDragActive, setImageDragActive] = useState(false)
  const [csvDragActive, setCsvDragActive] = useState(false)

  // Manual mode state
  const [manualFiles, setManualFiles] = useState<File[]>([])
  const [manualForms, setManualForms] = useState<ApplicationData[]>([])
  const manualInputRef = useRef<HTMLInputElement>(null)
  const [manualDragActive, setManualDragActive] = useState(false)

  const handleModeSwitch = (mode: 'csv' | 'manual') => {
    setInputMode(mode)
    setImageFiles([])
    setCsvRows([])
    setCsvFileName(null)
    setValidationErrors([])
    setManualFiles([])
    setManualForms([])
  }

  // ── CSV mode handlers ──────────────────────────────────────────────

  const handleImageFiles = useCallback((files: FileList | null) => {
    if (!files) return
    setImageFiles(Array.from(files))
    setValidationErrors([])
  }, [])

  const handleCSVFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const { rows, errors } = parseCSV(text)
      setCsvRows(rows)
      setCsvFileName(file.name)
      setValidationErrors(errors)
    }
    reader.readAsText(file)
  }, [])

  const matchErrors = useMemo((): string[] => {
    if (imageFiles.length === 0 || csvRows.length === 0) return []
    const imageNames = new Set(imageFiles.map((f) => f.name))
    const csvNames = new Set(csvRows.map((r) => r.filename))

    const errors: string[] = []
    const unmatchedImages = [...imageNames].filter((n) => !csvNames.has(n))
    const unmatchedCSV = [...csvNames].filter((n) => !imageNames.has(n))

    if (unmatchedImages.length > 0)
      errors.push(`Images without CSV data: ${unmatchedImages.join(', ')}`)
    if (unmatchedCSV.length > 0)
      errors.push(`CSV rows without images: ${unmatchedCSV.join(', ')}`)
    return errors
  }, [imageFiles, csvRows])

  const canSubmitCSV =
    imageFiles.length > 0 &&
    csvRows.length > 0 &&
    matchErrors.length === 0 &&
    validationErrors.length === 0 &&
    !disabled

  const handleSubmitCSV = async () => {
    if (matchErrors.length > 0) { setValidationErrors(matchErrors); return }
    const fileMap = new Map<string, File>()
    for (const f of imageFiles) fileMap.set(f.name, f)
    const requests: VerifyRequest[] = []
    const fileNames: string[] = []
    for (const row of csvRows) {
      const file = fileMap.get(row.filename)
      if (!file) continue
      const base64 = await fileToBase64(file)
      requests.push({ label_images: [base64], application: row.application })
      fileNames.push(row.filename)
    }
    onSubmit(requests, fileNames)
  }

  // ── Manual mode handlers ───────────────────────────────────────────

  const handleManualFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    setManualFiles((prev) => {
      const next = [...prev, ...files]
      setManualForms((prevForms) => [
        ...prevForms,
        ...files.map(() => ({ ...EMPTY_APPLICATION })),
      ])
      return next
    })
  }, [])

  const removeManualFile = useCallback((index: number) => {
    setManualFiles((prev) => prev.filter((_, i) => i !== index))
    setManualForms((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateManualForm = useCallback((index: number, data: ApplicationData) => {
    setManualForms((prev) => prev.map((f, i) => (i === index ? data : f)))
  }, [])

  const canSubmitManual =
    manualFiles.length > 0 &&
    manualForms.every((f) => f.brand_name.trim() !== '' && f.class_or_type.trim() !== '') &&
    !disabled

  const handleSubmitManual = async () => {
    const requests: VerifyRequest[] = []
    const fileNames: string[] = []
    for (let i = 0; i < manualFiles.length; i++) {
      const file = manualFiles[i]!
      const base64 = await fileToBase64(file)
      requests.push({ label_images: [base64], application: manualForms[i]! })
      fileNames.push(file.name)
    }
    onSubmit(requests, fileNames)
  }

  // ── Shared styles ──────────────────────────────────────────────────

  const dropZoneClass = (active: boolean) =>
    `border-2 border-dashed flex flex-col items-center justify-center gap-2 min-h-[120px] p-margin-md text-center cursor-pointer select-none transition-colors ${
      active
        ? 'border-primary bg-primary/5'
        : 'border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-surface-container'
    }`

  const allErrors = [...validationErrors, ...matchErrors]

  return (
    <div className="space-y-margin-md">

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeSwitch('csv')}
          className={`text-label-bold px-5 py-2 uppercase tracking-wider transition-colors ${inputMode === 'csv' ? 'bg-primary text-on-primary' : 'bg-surface-container text-secondary hover:text-primary'}`}
        >
          CSV Upload
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('manual')}
          className={`text-label-bold px-5 py-2 uppercase tracking-wider transition-colors ${inputMode === 'manual' ? 'bg-primary text-on-primary' : 'bg-surface-container text-secondary hover:text-primary'}`}
        >
          Manual Entry
        </button>
      </div>

      {inputMode === 'csv' ? (
        <>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {/* Images */}
            <div>
              <p className="text-label-bold text-secondary uppercase tracking-wider mb-2">Label Images</p>
              <div
                className={dropZoneClass(imageDragActive)}
                onClick={() => imageInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setImageDragActive(true) }}
                onDragLeave={() => setImageDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setImageDragActive(false); handleImageFiles(e.dataTransfer.files) }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') imageInputRef.current?.click() }}
                aria-label="Upload label images for batch"
              >
                <input ref={imageInputRef} type="file" accept={IMAGE_ACCEPT} multiple onChange={(e) => handleImageFiles(e.target.files)} className="hidden" aria-hidden="true" />
                <span className="material-symbols-outlined text-[32px] text-outline">photo_library</span>
                {imageFiles.length > 0 ? (
                  <>
                    <p className="text-label-bold text-on-surface">{imageFiles.length} file{imageFiles.length !== 1 ? 's' : ''} selected</p>
                    <p className="text-label-sm text-secondary">Click or drop to change</p>
                  </>
                ) : (
                  <>
                    <p className="text-label-bold text-on-surface">Click or drop images here</p>
                    <p className="text-label-sm text-secondary">JPEG, PNG, or PDF</p>
                  </>
                )}
              </div>
            </div>

            {/* CSV */}
            <div>
              <p className="text-label-bold text-secondary uppercase tracking-wider mb-2">Application Data (CSV)</p>
              <div
                className={dropZoneClass(csvDragActive)}
                onClick={() => csvInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setCsvDragActive(true) }}
                onDragLeave={() => setCsvDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setCsvDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleCSVFile(f) }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') csvInputRef.current?.click() }}
                aria-label="Upload CSV with application data"
              >
                <input ref={csvInputRef} type="file" accept={CSV_ACCEPT} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCSVFile(f) }} className="hidden" aria-hidden="true" />
                <span className="material-symbols-outlined text-[32px] text-outline">table_chart</span>
                {csvFileName ? (
                  <>
                    <p className="text-label-bold text-on-surface">{csvFileName}</p>
                    <p className="text-label-sm text-secondary">{csvRows.length} row{csvRows.length !== 1 ? 's' : ''} parsed — click or drop to change</p>
                  </>
                ) : (
                  <p className="text-label-bold text-on-surface">Click or drop CSV here</p>
                )}
              </div>
            </div>
          </div>

          {allErrors.length > 0 && (
            <div className="bg-error-container text-on-error-container px-4 py-3 flex items-start gap-2" role="alert">
              <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">error</span>
              <ul className="space-y-0.5">
                {allErrors.map((err, i) => <li key={i} className="text-label-bold">{err}</li>)}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={handleSubmitCSV} disabled={!canSubmitCSV} className="bg-primary text-on-primary text-label-bold px-12 py-3 uppercase flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined">batch_prediction</span>
              Verify {csvRows.length > 0 ? `${csvRows.length} Label${csvRows.length !== 1 ? 's' : ''}` : 'Batch'}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Image drop zone */}
          <div>
            <p className="text-label-bold text-secondary uppercase tracking-wider mb-2">Label Images</p>
            <div
              className={dropZoneClass(manualDragActive)}
              onClick={() => manualInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setManualDragActive(true) }}
              onDragLeave={() => setManualDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setManualDragActive(false); handleManualFiles(Array.from(e.dataTransfer.files)) }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') manualInputRef.current?.click() }}
              aria-label="Upload label images for manual entry"
            >
              <input ref={manualInputRef} type="file" accept={IMAGE_ACCEPT} multiple onChange={(e) => { handleManualFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} className="hidden" aria-hidden="true" />
              <span className="material-symbols-outlined text-[32px] text-outline">photo_library</span>
              {manualFiles.length > 0 ? (
                <p className="text-label-bold text-on-surface">{manualFiles.length} image{manualFiles.length !== 1 ? 's' : ''} — drop more to add</p>
              ) : (
                <p className="text-label-bold text-on-surface">Click or drop images here</p>
              )}
            </div>
          </div>

          {/* One form card per image */}
          {manualFiles.map((file, i) => (
            <div key={i} className="border border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center justify-between px-4 py-2 bg-surface-container border-b border-outline-variant">
                <span className="text-label-bold text-on-surface font-mono text-[13px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeManualFile(i)}
                  className="text-secondary hover:text-error transition-colors text-label-sm flex items-center gap-1"
                  aria-label={`Remove ${file.name}`}
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  Remove
                </button>
              </div>
              <div className="p-4">
                <ApplicationForm data={manualForms[i]!} onChange={(data) => updateManualForm(i, data)} disabled={disabled} />
              </div>
            </div>
          ))}

          {manualFiles.length > 0 && (
            <div className="flex justify-end">
              <button type="button" onClick={handleSubmitManual} disabled={!canSubmitManual} className="bg-primary text-on-primary text-label-bold px-12 py-3 uppercase flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined">batch_prediction</span>
                Verify {manualFiles.length} Label{manualFiles.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
