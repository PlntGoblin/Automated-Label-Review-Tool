import { useCallback, useEffect, useRef, useState } from 'react'
import { fileToBase64, fileToDataUrl } from '../util'

interface LabelUploadProps {
  onFileSelected: (base64: string, dataUrl: string, fileName: string) => void
  currentFileName: string | null
}

const ACCEPTED = '.jpg,.jpeg,.png,.pdf'

export default function LabelUpload({ onFileSelected, currentFileName }: LabelUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Clear preview when parent resets the form
  useEffect(() => {
    if (!currentFileName) setPreviewUrl(null)
  }, [currentFileName])

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const [base64, dataUrl] = await Promise.all([fileToBase64(file), fileToDataUrl(file)])
        setPreviewUrl(dataUrl)
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

  return (
    <div className="flex flex-col gap-2 w-3/5">
      {/* Card header */}
      <p className="text-label-bold text-on-surface uppercase tracking-wider">Label Preview</p>

      {/* Outer card */}
      <div className="bg-white border border-outline-variant rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-4">
        {/* Inner dashed drop zone — portrait aspect ratio */}
        <div
          className={[
            'border-2 border-dashed rounded-sm flex flex-col items-center justify-center text-center cursor-pointer select-none transition-colors overflow-hidden',
            'aspect-[3/4] w-full',
            dragActive
              ? 'border-primary bg-primary/5'
              : previewUrl
                ? 'border-outline-variant'
                : 'border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-surface-container',
          ].join(' ')}
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

          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Label preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-4">
              <span className="material-symbols-outlined text-[96px] text-outline">cloud_upload</span>
              <p className="text-body-md text-on-surface font-semibold">Upload Label Image</p>
              <p className="text-label-sm text-secondary">PNG, JPG, PDF up to 10 MB</p>
            </div>
          )}
        </div>

        {/* File name + replace hint */}
        {currentFileName && (
          <p className="text-label-sm text-secondary text-center mt-2 truncate">
            {currentFileName} — <span className="underline cursor-pointer hover:text-primary" onClick={() => inputRef.current?.click()}>replace</span>
          </p>
        )}
      </div>
    </div>
  )
}
