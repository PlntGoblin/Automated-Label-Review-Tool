import { useCallback, useRef, useState } from 'react'
import { fileToBase64, fileToDataUrl } from '../util'

interface LabelUploadProps {
  onFileSelected: (base64: string, dataUrl: string, fileName: string) => void
  currentFileName: string | null
}

const ACCEPTED = '.jpg,.jpeg,.png,.pdf'

export default function LabelUpload({ onFileSelected, currentFileName }: LabelUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const [base64, dataUrl] = await Promise.all([fileToBase64(file), fileToDataUrl(file)])
        onFileSelected(base64, dataUrl, file.name)
      } catch {
        // Silently fail — the user can try again
      }
    },
    [onFileSelected],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const zoneClass = [
    'border-2 border-dashed flex flex-col items-center justify-center gap-3 min-h-[224px] p-margin-lg text-center cursor-pointer select-none transition-colors',
    dragActive
      ? 'border-primary bg-primary/5'
      : currentFileName
        ? 'border-green-500 bg-green-500/10'
        : 'border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-surface-container',
  ].join(' ')

  return (
    <div
      className={zoneClass}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      aria-label="Upload label image"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
      {currentFileName ? (
        <>
          <span className="material-symbols-outlined text-green-500" style={{ fontSize: '122px' }}>check_circle</span>
          <p className="text-label-bold text-on-surface">{currentFileName}</p>
          <p className="text-label-sm text-secondary">Click or drop to replace</p>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[48px] text-outline">cloud_upload</span>
          <div>
            <p className="text-body-md text-on-surface font-semibold">Drag &amp; drop a label image</p>
            <p className="text-label-sm text-secondary mt-1">JPEG, PNG, or PDF (max 10 MB)</p>
          </div>
          <button
            type="button"
            tabIndex={-1}
            className="bg-primary text-on-primary text-label-bold px-6 py-2 uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Select File
          </button>
        </>
      )}
    </div>
  )
}
