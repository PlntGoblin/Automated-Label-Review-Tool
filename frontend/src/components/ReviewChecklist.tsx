import { useState, useEffect } from 'react'
import type { FieldOverride, VerificationResult } from '../types'
import { FIELD_ORDER } from '../constants'
import FieldRow from './FieldRow'
import SummaryBar from './SummaryBar'
import WarningPanel from './WarningPanel'

interface ReviewChecklistProps {
  result: VerificationResult
  labelDataUrls: string[]
  overrides: Record<string, FieldOverride>
  onOverride: (fieldName: string, initials: string, reason: string | null) => void
}

export default function ReviewChecklist({ result, labelDataUrls, overrides, onOverride }: ReviewChecklistProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!lightboxUrl) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxUrl(null) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxUrl])

  const fieldEntries = FIELD_ORDER.flatMap((name) => {
    const field = result.fields[name]
    return field ? [{ type: 'field' as const, name, field }] : []
  })

  const govWarning = result.government_warning

  // A field is "effectively passed" if it passed OR has been overridden
  const isEffectivePass = (name: string, status: string) =>
    status === 'PASS' || !!overrides[name]

  const flagged = fieldEntries.filter((e) => !isEffectivePass(e.name, e.field.status))
  const passed  = fieldEntries.filter((e) => isEffectivePass(e.name, e.field.status))
  const govIsFlagged = !isEffectivePass('government_warning', govWarning.status)

  return (
    <section aria-label="Verification results" className="space-y-margin-md">
      <div className="flex items-center gap-4">
        <h2 className="text-headline-md font-semibold text-primary shrink-0">Verification Results</h2>
        <div className="w-3/4 ml-auto">
          <SummaryBar
            summary={result.summary}
            manualReviewRequired={result.manual_review_required}
            errorReason={result.error_reason}
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant p-margin-md">
        <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0,58fr) minmax(0,42fr)' }}>

          {/* Left col: field rows, flags on top, passes on bottom */}
          <div role="list" aria-label="Field comparison results" className="space-y-2 text-sm">

            {/* Flagged fields */}
            {flagged.map(({ name, field }) => (
              <div key={name} role="listitem">
                <FieldRow name={name} result={field} override={overrides[name]} onOverride={(i, r) => onOverride(name, i, r)} />
              </div>
            ))}
            {govIsFlagged && (
              <WarningPanel warning={govWarning} compact override={overrides['government_warning']} onOverride={(i, r) => onOverride('government_warning', i, r)} />
            )}

            {/* Divider */}
            {(flagged.length > 0 || govIsFlagged) && (passed.length > 0 || !govIsFlagged) && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 border-t border-outline-variant" />
                <span className="text-xs text-secondary uppercase tracking-wider">Passed</span>
                <div className="flex-1 border-t border-outline-variant" />
              </div>
            )}

            {/* Passed fields */}
            {passed.map(({ name, field }) => (
              <div key={name} role="listitem">
                <FieldRow name={name} result={field} override={overrides[name]} onOverride={(i, r) => onOverride(name, i, r)} />
              </div>
            ))}
            {!govIsFlagged && (
              <WarningPanel warning={govWarning} compact override={overrides['government_warning']} onOverride={(i, r) => onOverride('government_warning', i, r)} />
            )}
          </div>

          {/* Right col: all label images stacked */}
          <div className="flex flex-col gap-2 items-stretch bg-surface-container-low border border-outline-variant p-2">
            {labelDataUrls.length > 0 ? (
              labelDataUrls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxUrl(url)}
                  className="group relative w-full cursor-zoom-in focus:outline-none"
                  aria-label={`Expand label image ${i + 1}`}
                >
                  <img
                    src={url}
                    alt={`Label image ${i + 1}`}
                    className="w-full object-contain max-h-[60vh]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-2">
                    <span className="material-symbols-outlined text-white text-[64px] opacity-0 group-hover:opacity-100 drop-shadow transition-opacity">zoom_in</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-outline">
                <span className="material-symbols-outlined text-[48px]">image_not_supported</span>
                <span className="text-label-sm">No image available</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Label image fullscreen"
        >
          <img
            src={lightboxUrl}
            alt="Label fullscreen"
            className="max-w-full max-h-full object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            aria-label="Close fullscreen"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
      )}
    </section>
  )
}
