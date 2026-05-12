import { useCallback, useEffect, useRef, useState } from 'react'
import { fileToBase64, fileToDataUrl } from '../util'

interface ImageEntry {
  base64: string
  dataUrl: string
  fileName: string
}

interface LabelUploadProps {
  onFilesChanged: (base64s: string[], dataUrls: string[], fileNames: string[]) => void
  currentFileNames: string[]
}

const ACCEPTED = '.jpg,.jpeg,.png,.pdf'

export default function LabelUpload({ onFilesChanged, currentFileNames }: LabelUploadProps) {
  const [images, setImages] = useState<ImageEntry[]>([])
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentFileNames.length === 0) setImages([])
  }, [currentFileNames])

  const addFiles = useCallback(
    async (files: File[]) => {
      try {
        const entries = await Promise.all(
          files.map(async (file) => {
            const [base64, dataUrl] = await Promise.all([fileToBase64(file), fileToDataUrl(file)])
            return { base64, dataUrl, fileName: file.name }
          })
        )
        setImages((prev) => {
          const next = [...prev, ...entries]
          onFilesChanged(next.map((e) => e.base64), next.map((e) => e.dataUrl), next.map((e) => e.fileName))
          return next
        })
      } catch {
        // Silently fail — the user can try again
      }
    },
    [onFilesChanged],
  )

  const removeImage = useCallback(
    (index: number) => {
      setImages((prev) => {
        const next = prev.filter((_, i) => i !== index)
        onFilesChanged(next.map((e) => e.base64), next.map((e) => e.dataUrl), next.map((e) => e.fileName))
        return next
      })
    },
    [onFilesChanged],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length) addFiles(files)
    },
    [addFiles],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length) addFiles(files)
      e.target.value = ''
    },
    [addFiles],
  )

  return (
    <div className="flex flex-col gap-2 w-3/5">
      <p className="text-label-bold text-on-surface uppercase tracking-wider">Label Preview</p>

      <div className="bg-white border border-outline-variant rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-4 flex flex-col gap-3">

        {/* Drop zone */}
        <div
          className={[
            'border-2 border-dashed rounded-sm flex flex-col items-center justify-center text-center cursor-pointer select-none transition-colors overflow-hidden',
            images.length > 0 ? 'py-4' : 'aspect-[3/4] w-full',
            dragActive
              ? 'border-primary bg-primary/5'
              : images.length > 0
                ? 'border-outline-variant hover:border-primary hover:bg-surface-container'
                : 'border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-surface-container',
          ].join(' ')}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          aria-label="Upload label images"
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            onChange={handleChange}
            className="hidden"
            aria-hidden="true"
          />

          {images.length > 0 ? (
            <div className="flex flex-col items-center gap-1 px-4">
              <span className="material-symbols-outlined text-[28px] text-primary">add_photo_alternate</span>
              <p className="text-label-sm text-secondary">Drop another image to add it</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4">
              <span className="material-symbols-outlined text-[96px] text-outline">cloud_upload</span>
              <p className="text-body-md text-on-surface font-semibold">Upload Label Image</p>
              <p className="text-label-sm text-secondary">PNG, JPG, PDF up to 10 MB</p>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 0 && (
          <div className="flex flex-col gap-2">
            {images.map((img, i) => (
              <div key={i} className="flex items-center gap-2 border border-outline-variant rounded-sm p-1">
                <img
                  src={img.dataUrl}
                  alt={img.fileName}
                  className="w-10 h-14 object-contain shrink-0 bg-surface-container-lowest"
                />
                <p className="text-label-sm text-on-surface truncate flex-1 min-w-0">{img.fileName}</p>
                <button
                  type="button"
                  aria-label={`Remove ${img.fileName}`}
                  onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                  className="text-secondary hover:text-error transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Guardrail note */}
        <p className="text-label-sm text-secondary text-center">
          All images must be labels for the same product
        </p>
      </div>
    </div>
  )
}
