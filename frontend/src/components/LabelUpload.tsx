import { useCallback, useRef, useState } from 'react'

interface LabelUploadProps {
  onFileSelected: (base64: string, fileName: string) => void
  currentFileName: string | null
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip "data:image/png;base64," prefix — backend expects raw base64
      const base64 = result.split(',')[1]
      if (base64) resolve(base64)
      else reject(new Error('Failed to read file as base64'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const ACCEPTED = '.jpg,.jpeg,.png,.pdf'

export default function LabelUpload({ onFileSelected, currentFileName }: LabelUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const base64 = await fileToBase64(file)
        onFileSelected(base64, file.name)
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
    'drop-zone',
    dragActive ? 'drop-zone--active' : '',
    currentFileName ? 'drop-zone--has-file' : '',
  ]
    .filter(Boolean)
    .join(' ')

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
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      {currentFileName ? (
        <p><strong>{currentFileName}</strong> — click or drop to replace</p>
      ) : (
        <>
          <p><strong>Drag & drop</strong> a label image here, or <strong>click to browse</strong></p>
          <p style={{ fontSize: '0.8125rem', color: '#71767a' }}>JPEG, PNG, or PDF (max 10 MB)</p>
        </>
      )}
    </div>
  )
}
