import { useCallback, useMemo, useRef, useState } from 'react'
import type { ApplicationData, VerifyRequest } from '../types'
import { FIELD_ORDER } from '../constants'
import { fileToBase64, fileToDataUrl } from '../util'
import ApplicationForm from './ApplicationForm'

interface BatchUploadProps {
  onSubmit: (requests: VerifyRequest[], fileNames: string[], dataUrls: string[][]) => void
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
  interface ManualProduct { files: File[]; form: ApplicationData }
  const [manualProducts, setManualProducts] = useState<ManualProduct[]>([{ files: [], form: { ...EMPTY_APPLICATION } }])
  const [manualDragActiveIdx, setManualDragActiveIdx] = useState<number | null>(null)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleModeSwitch = (mode: 'csv' | 'manual') => {
    setInputMode(mode)
    setImageFiles([])
    setCsvRows([])
    setCsvFileName(null)
    setValidationErrors([])
    setManualProducts([{ files: [], form: { ...EMPTY_APPLICATION } }])
  }

  // ── CSV mode handlers ──────────────────────────────────────────────

  const handleImageFiles = useCallback((files: FileList | File[] | null) => {
    if (!files || files.length === 0) return
    setImageFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      const incoming = Array.from(files).filter((f) => !existing.has(f.name))
      return [...prev, ...incoming]
    })
    setValidationErrors([])
  }, [])

  const removeImageFile = useCallback((index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
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
    const dataUrls: string[][] = []
    for (const row of csvRows) {
      const file = fileMap.get(row.filename)
      if (!file) continue
      const [base64, dataUrl] = await Promise.all([fileToBase64(file), fileToDataUrl(file)])
      requests.push({ label_images: [base64], application: row.application })
      fileNames.push(row.filename)
      dataUrls.push([dataUrl])
    }
    onSubmit(requests, fileNames, dataUrls)
  }

  // ── Manual mode handlers ───────────────────────────────────────────

  const addProduct = useCallback(() => {
    setManualProducts((prev) => [...prev, { files: [], form: { ...EMPTY_APPLICATION } }])
  }, [])

  const removeProduct = useCallback((idx: number) => {
    setManualProducts((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const addFilesToProduct = useCallback((idx: number, incoming: File[]) => {
    if (incoming.length === 0) return
    setManualProducts((prev) => prev.map((p, i) => {
      if (i !== idx) return p
      const existing = new Set(p.files.map((f) => f.name))
      const next = [...p.files, ...incoming.filter((f) => !existing.has(f.name))]
      return { ...p, files: next }
    }))
  }, [])

  const removeFileFromProduct = useCallback((productIdx: number, fileIdx: number) => {
    setManualProducts((prev) => prev.map((p, i) =>
      i !== productIdx ? p : { ...p, files: p.files.filter((_, fi) => fi !== fileIdx) }
    ))
  }, [])

  const updateProductForm = useCallback((idx: number, data: ApplicationData) => {
    setManualProducts((prev) => prev.map((p, i) => i !== idx ? p : { ...p, form: data }))
  }, [])

  const canSubmitManual =
    manualProducts.length > 0 &&
    manualProducts.every((p) => p.files.length > 0 && p.form.brand_name.trim() !== '' && p.form.class_or_type.trim() !== '') &&
    !disabled

  const handleSubmitManual = async () => {
    const requests: VerifyRequest[] = []
    const fileNames: string[] = []
    const dataUrls: string[][] = []
    for (const product of manualProducts) {
      const [base64s, urls] = await Promise.all([
        Promise.all(product.files.map(fileToBase64)),
        Promise.all(product.files.map(fileToDataUrl)),
      ])
      requests.push({ label_images: base64s, application: product.form })
      fileNames.push(product.files[0]?.name ?? 'unknown')
      dataUrls.push(urls)
    }
    onSubmit(requests, fileNames, dataUrls)
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
              <input ref={imageInputRef} type="file" accept={IMAGE_ACCEPT} multiple onChange={(e) => { handleImageFiles(e.target.files); e.target.value = '' }} className="hidden" aria-hidden="true" />
              {imageFiles.length > 0 ? (
                <div
                  className={`border-2 border-dashed transition-colors ${imageDragActive ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'}`}
                  onDragOver={(e) => { e.preventDefault(); setImageDragActive(true) }}
                  onDragLeave={() => setImageDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setImageDragActive(false); handleImageFiles(e.dataTransfer.files) }}
                >
                  {/* Scrollable file list */}
                  <div className="overflow-y-auto max-h-48">
                    {imageFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-outline-variant last:border-b-0 group">
                        <span className="text-label-sm text-on-surface font-mono truncate pr-2">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeImageFile(i)}
                          aria-label={`Remove ${file.name}`}
                          className="text-secondary hover:text-error transition-colors shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add-more strip */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1 py-2 text-label-sm text-secondary hover:text-primary hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                    Add more images
                  </button>
                </div>
              ) : (
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
                  <span className="material-symbols-outlined text-[32px] text-outline">photo_library</span>
                  <p className="text-label-bold text-on-surface">Click or drop images here</p>
                  <p className="text-label-sm text-secondary">JPEG, PNG, or PDF</p>
                </div>
              )}
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
          {/* One product card per entry */}
          <div className="space-y-4">
            {manualProducts.map((product, idx) => (
              <div key={idx} className="border border-outline-variant bg-surface-container-lowest">

                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-2 bg-surface-container border-b border-outline-variant">
                  <span className="text-label-bold text-on-surface uppercase tracking-wider">
                    Product {idx + 1}
                  </span>
                  {manualProducts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(idx)}
                      className="text-secondary hover:text-error transition-colors text-label-sm flex items-center gap-1"
                      aria-label={`Remove product ${idx + 1}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      Remove
                    </button>
                  )}
                </div>

                {/* Card body — 50/50 split */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-margin-lg p-margin-lg">

                  {/* Left: image zone for this product */}
                  <div>
                    <p className="text-label-bold text-secondary uppercase tracking-wider mb-2">Label Images</p>
                    <input
                      ref={(el) => { fileInputRefs.current[idx] = el }}
                      type="file"
                      accept={IMAGE_ACCEPT}
                      multiple
                      onChange={(e) => { addFilesToProduct(idx, Array.from(e.target.files ?? [])); e.target.value = '' }}
                      className="hidden"
                      aria-hidden="true"
                    />
                    {product.files.length > 0 ? (
                      <div
                        className={`border-2 border-dashed transition-colors ${manualDragActiveIdx === idx ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'}`}
                        onDragOver={(e) => { e.preventDefault(); setManualDragActiveIdx(idx) }}
                        onDragLeave={() => setManualDragActiveIdx(null)}
                        onDrop={(e) => { e.preventDefault(); setManualDragActiveIdx(null); addFilesToProduct(idx, Array.from(e.dataTransfer.files)) }}
                      >
                        <div className="overflow-y-auto max-h-48">
                          {product.files.map((file, fi) => (
                            <div key={fi} className="flex items-center justify-between px-3 py-2 border-b border-outline-variant last:border-b-0">
                              <span className="text-label-sm text-on-surface font-mono truncate pr-2">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeFileFromProduct(idx, fi)}
                                aria-label={`Remove ${file.name}`}
                                className="text-secondary hover:text-error transition-colors shrink-0"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[idx]?.click()}
                          className="w-full flex items-center justify-center gap-1 py-2 text-label-sm text-secondary hover:text-primary hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                          Add more images
                        </button>
                      </div>
                    ) : (
                      <div
                        className={dropZoneClass(manualDragActiveIdx === idx)}
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        onDragOver={(e) => { e.preventDefault(); setManualDragActiveIdx(idx) }}
                        onDragLeave={() => setManualDragActiveIdx(null)}
                        onDrop={(e) => { e.preventDefault(); setManualDragActiveIdx(null); addFilesToProduct(idx, Array.from(e.dataTransfer.files)) }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRefs.current[idx]?.click() }}
                        aria-label={`Upload images for product ${idx + 1}`}
                      >
                        <span className="material-symbols-outlined text-[32px] text-outline">photo_library</span>
                        <p className="text-label-bold text-on-surface">Click or drop images here</p>
                        <p className="text-label-sm text-secondary">JPEG, PNG, or PDF</p>
                      </div>
                    )}
                  </div>

                  {/* Right: application form for this product */}
                  <div>
                    <ApplicationForm
                      data={product.form}
                      onChange={(data) => updateProductForm(idx, data)}
                      disabled={disabled}
                    />
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* Add product + Verify row */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={addProduct}
              className="text-label-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Another Product
            </button>
            <button
              type="button"
              onClick={handleSubmitManual}
              disabled={!canSubmitManual}
              className="bg-primary text-on-primary text-label-bold px-12 py-3 uppercase flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">batch_prediction</span>
              Verify {manualProducts.length} Product{manualProducts.length !== 1 ? 's' : ''}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
