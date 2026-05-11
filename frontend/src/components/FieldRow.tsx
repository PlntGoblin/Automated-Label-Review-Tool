import { useState } from 'react'
import type { FieldResult } from '../types'
import { FIELD_LABELS, STATUS_COLOR } from '../constants'

interface FieldRowProps {
  name: string
  result: FieldResult
}

export default function FieldRow({ name, result }: FieldRowProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <>
      <div className="bg-surface-container-lowest border border-outline-variant flex flex-col overflow-hidden">
        {/* Field title */}
        <div className="bg-primary/90 px-3 py-2 text-center border-b border-outline-variant">
          <span className="text-label-bold text-on-primary font-black uppercase tracking-wider">
            {FIELD_LABELS[name] ?? name}
          </span>
        </div>

        {/* Crop image */}
        {result.region_crop ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="relative w-full bg-black/5 hover:bg-black/10 transition-colors cursor-zoom-in group"
            aria-label={`Expand image for ${FIELD_LABELS[name] ?? name}`}
          >
            <img
              src={result.region_crop}
              alt={`Label crop for ${FIELD_LABELS[name] ?? name}`}
              className="w-full h-36 object-contain"
            />
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-black/50 text-white rounded-full p-1">
                <span className="material-symbols-outlined text-[20px]">zoom_in</span>
              </span>
            </span>
          </button>
        ) : (
          <div className="w-full h-36 flex items-center justify-center bg-surface-container-low">
            <span className="material-symbols-outlined text-[32px] text-outline">image_not_supported</span>
          </div>
        )}

        {/* Values + status */}
        <div className="p-3 space-y-1 flex-1 flex flex-col">
          <div className="space-y-1 flex-1">
            <p className="text-body-md text-on-surface">
              <span className="text-label-sm text-secondary uppercase tracking-wider mr-1">Label:</span>
              {result.extracted_value ?? <em className="text-secondary">Not found</em>}
            </p>
            <p className="text-body-md text-on-surface">
              <span className="text-label-sm text-secondary uppercase tracking-wider mr-1">Application:</span>
              {result.application_value}
            </p>
            {result.note && (
              <p className="text-label-sm text-error mt-1">{result.note}</p>
            )}
          </div>
          <div className="pt-2 flex justify-end">
            <span className={`inline-flex items-center text-sm font-black px-4 py-1.5 uppercase tracking-widest ${STATUS_COLOR[result.status]}`}>
              {result.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && result.region_crop && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Full size image for ${FIELD_LABELS[name] ?? name}`}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-label-bold text-white uppercase tracking-wider">
                {FIELD_LABELS[name] ?? name}
              </span>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="text-white hover:text-white/70 transition-colors"
                aria-label="Close image"
              >
                <span className="material-symbols-outlined text-[28px]">close</span>
              </button>
            </div>
            <img
              src={result.region_crop}
              alt={`Full size label crop for ${FIELD_LABELS[name] ?? name}`}
              className="w-full max-h-[80vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  )
}
