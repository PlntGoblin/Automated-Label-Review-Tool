import { useState } from 'react'
import type { ApplicationData, FieldOverride, VerificationResult } from './types'
import { verifyLabel } from './api'
import ApplicationForm from './components/ApplicationForm'
import LabelUpload from './components/LabelUpload'
import ReviewChecklist from './components/ReviewChecklist'
import AnalysisProgress from './components/AnalysisProgress'

const EMPTY_APPLICATION: ApplicationData = {
  brand_name: '',
  class_or_type: '',
  alcohol_content: '',
  net_contents: '',
  bottler_name_and_address: '',
  country_of_origin: '',
}


export default function App() {
  const [labelBase64, setLabelBase64] = useState<string | null>(null)
  const [labelDataUrl, setLabelDataUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [application, setApplication] = useState<ApplicationData>(EMPTY_APPLICATION)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [resultLabel, setResultLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, FieldOverride>>({})

  const canSubmit =
    labelBase64 !== null &&
    application.brand_name.trim() !== '' &&
    application.class_or_type.trim() !== '' &&
    !loading

  const handleSubmit = async () => {
    if (!labelBase64) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await verifyLabel({ label_image: labelBase64, application })
      setResult(res)
      setResultLabel(fileName)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelected = (base64: string, dataUrl: string, name: string) => {
    setLabelBase64(base64)
    setLabelDataUrl(dataUrl)
    setFileName(name)
    setResult(null)
    setError(null)
  }

  const handleOverride = (fieldName: string, initials: string, reason: string | null) => {
    setOverrides((prev) => ({
      ...prev,
      [fieldName]: { initials, reason, timestamp: new Date().toISOString() },
    }))
  }

  const handleReset = () => {
    setLabelBase64(null)
    setLabelDataUrl(null)
    setFileName(null)
    setApplication(EMPTY_APPLICATION)
    setResult(null)
    setResultLabel(null)
    setError(null)
    setOverrides({})
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] font-sans">
      {/* Header */}
      <header className="bg-primary border-b border-outline-variant sticky top-0 z-50">
        <div className="flex justify-between items-center px-margin-lg w-full max-w-max-width mx-auto h-16">
          <div className="flex items-center gap-margin-md">
            <button
              type="button"
              onClick={handleReset}
              className="text-headline-md font-black text-on-primary hover:text-on-primary/80 transition-colors"
              aria-label="Go to home page"
            >
              ALRT
            </button>
            <div className="hidden lg:block h-6 w-px bg-white/30 mx-2" />
            <span className="hidden lg:block text-label-bold text-on-primary/80">
              Automated Label Review Tool — TTB COLA Verification
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="text-on-primary hover:bg-white/10 transition-colors p-2 rounded-full" aria-label="Notifications">
              <span className="material-symbols-outlined text-[24px]">notifications</span>
            </button>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 20" width="38" height="20" aria-label="United States Government" role="img">
              {/* 13 stripes */}
              {Array.from({ length: 13 }).map((_, i) => (
                <rect key={i} x="0" y={i * (20 / 13)} width="38" height={20 / 13} fill={i % 2 === 0 ? '#B22234' : '#FFFFFF'} />
              ))}
              {/* Blue canton */}
              <rect x="0" y="0" width="15" height={20 * 7 / 13} fill="#3C3B6E" />
              {/* Stars — 5×4 + 4×5 = 50, simplified as white dots */}
              {[0,1,2,3,4].map(row =>
                [0,1,2,3,4,5].map(col => (
                  <circle key={`${row}-${col}`} cx={1.4 + col * 2.1} cy={1.1 + row * 1.5} r="0.5" fill="#FFFFFF" />
                ))
              )}
              {[0,1,2,3].map(row =>
                [0,1,2,3,4].map(col => (
                  <circle key={`b${row}-${col}`} cx={2.45 + col * 2.1} cy={1.85 + row * 1.5} r="0.5" fill="#FFFFFF" />
                ))
              )}
            </svg>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-max-width mx-auto w-full px-margin-lg py-margin-lg space-y-margin-lg">

        {result ? (
          /* ── Single results view ── */
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-headline-md font-headline-md text-primary">
                {resultLabel ?? 'Results'}
              </h2>
              <button
                type="button"
                onClick={handleReset}
                className="text-label-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                New Verification
              </button>
            </div>
            <ReviewChecklist result={result} labelDataUrl={labelDataUrl} overrides={overrides} onOverride={handleOverride} />
          </div>

        ) : (
          /* ── Landing page ── */
          <>
            {/* Page title + stepper */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold text-on-surface mb-6">New Label Verification</h1>
              <div className="flex items-center justify-center gap-0 max-w-2xl mx-auto">
                {/* Step 1 */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-label-bold transition-colors ${fileName ? 'bg-primary text-on-primary' : 'bg-primary text-on-primary'}`}>1</div>
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider ${fileName ? 'text-on-surface' : 'text-on-surface'}`}>Upload Label</span>
                </div>
                {/* Line */}
                <div className={`h-px flex-1 mx-2 mb-5 transition-colors ${fileName ? 'bg-on-surface' : 'bg-outline-variant'}`} />
                {/* Step 2 */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-label-bold border-2 transition-colors ${fileName ? 'border-primary bg-surface-container text-primary' : 'border-outline-variant bg-surface-container text-outline'}`}>2</div>
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider ${fileName ? 'text-on-surface' : 'text-secondary'}`}>Application Data</span>
                </div>
                {/* Line */}
                <div className={`h-px flex-1 mx-2 mb-5 transition-colors ${canSubmit ? 'bg-on-surface' : 'bg-outline-variant'}`} />
                {/* Step 3 */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-label-bold border-2 transition-colors ${canSubmit ? 'border-primary bg-surface-container text-primary' : 'border-outline-variant bg-surface-container text-outline'}`}>3</div>
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider ${canSubmit ? 'text-on-surface' : 'text-secondary'}`}>Review &amp; Run</span>
                </div>
              </div>
            </div>

          <section className="bg-surface-container-lowest border border-outline-variant">
            {/* Error */}
            {error && (
              <div className="mx-margin-lg mt-margin-md bg-error-container text-on-error-container px-4 py-3 flex items-start gap-2" role="alert">
                <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">error</span>
                <span className="text-label-bold">{error}</span>
              </div>
            )}

            {loading ? (
              <AnalysisProgress mode="single" />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 p-margin-lg gap-margin-lg">
                <div className="flex items-center justify-center h-full">
                  <LabelUpload onFileSelected={handleFileSelected} currentFileName={fileName} />
                </div>
                <div className="space-y-4">
                  <ApplicationForm data={application} onChange={setApplication} disabled={loading} />
                  <div className="pt-margin-md flex justify-end">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="bg-primary text-on-primary text-label-bold px-12 py-3 uppercase flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined">barcode_reader</span>
                      Run Automated Review
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-outline-variant mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center py-margin-md px-margin-lg w-full max-w-max-width mx-auto gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <span className="text-label-bold text-on-surface">ALRT</span>
            <span className="text-label-sm text-secondary">© 2026 TTB Automated Label Review Tool. United States Government.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-margin-md">
            {['Privacy Policy', 'Terms of Service', 'Agency Information', 'Accessibility'].map((link) => (
              <a key={link} href="#" className="text-label-sm text-secondary hover:text-primary hover:underline transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
