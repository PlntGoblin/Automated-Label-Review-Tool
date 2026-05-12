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
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation()
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

  const hasImages = images.length > 0

  return (
    <div className="flex flex-col gap-2 w-3/5">
      <p className="text-label-bold text-on-surface uppercase tracking-wider">Label Preview</p>

      <div className={`border rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-4 flex flex-col gap-3 transition-colors ${hasImages ? 'bg-green-100 border-green-400' : 'bg-white border-outline-variant'}`}>

        {/* Drop zone — always portrait aspect ratio */}
        <div
          className={[
            'border-2 border-dashed rounded-sm cursor-pointer select-none transition-colors overflow-hidden aspect-[3/4] w-full relative',
            dragActive
              ? 'border-primary bg-primary/5'
              : hasImages
                ? 'border-green-400 bg-green-50/60'
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

          {hasImages ? (
            /* Image preview grid inside the zone */
            <div className="absolute inset-0 flex flex-col">
              {images.map((img, i) => (
                <div key={i} className={`relative w-full flex-1 min-h-0 overflow-hidden ${i > 0 ? 'border-t-2 border-dashed border-green-400' : ''}`}>
                  <img
                    src={img.dataUrl}
                    alt={img.fileName}
                    className="w-full h-full object-contain"
                  />
                  {/* X button */}
                  <button
                    type="button"
                    aria-label={`Remove ${img.fileName}`}
                    onClick={(e) => removeImage(i, e)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full gap-2 px-4 text-center">
              <span className="material-symbols-outlined text-[96px] text-outline">cloud_upload</span>
              <p className="text-body-md text-on-surface font-semibold">Upload Label Image</p>
              <p className="text-label-sm text-secondary">PNG, JPG, PDF up to 10 MB</p>
            </div>
          )}

          {/* "Add more" hint when images present */}
          {hasImages && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-1 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-white text-[14px]">add_photo_alternate</span>
              <span className="text-white text-[11px] font-semibold uppercase tracking-wider">Drop to add more</span>
            </div>
          )}
        </div>

        <p className="text-label-sm text-secondary text-center">
          All images must be labels for the same product
        </p>
      </div>
    </div>
  )
}
