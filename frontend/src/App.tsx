import { useState } from 'react'
import type { ApplicationData, VerificationResult, VerifyRequest } from './types'
import { verifyLabel, verifyBatch } from './api'
import { DEMO_SCENARIOS } from './demo-scenarios'
import ApplicationForm from './components/ApplicationForm'
import LabelUpload from './components/LabelUpload'
import ReviewChecklist from './components/ReviewChecklist'
import BatchUpload from './components/BatchUpload'
import BatchResults from './components/BatchResults'

const EMPTY_APPLICATION: ApplicationData = {
  brand_name: '',
  class_or_type: '',
  alcohol_content: '',
  net_contents: '',
  bottler_name_and_address: '',
  country_of_origin: '',
}

const DEMO_BADGES = [
  { label: 'PASS', icon: 'check_circle', className: 'bg-green-100 text-green-800' },
  { label: 'FLAGGED', icon: 'warning', className: 'bg-error-container text-on-error-container' },
  { label: 'MANUAL REVIEW', icon: 'visibility', className: 'bg-secondary-container text-on-secondary-container' },
]

export default function App() {
  const [labelBase64, setLabelBase64] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [application, setApplication] = useState<ApplicationData>(EMPTY_APPLICATION)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [resultLabel, setResultLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batchResults, setBatchResults] = useState<VerificationResult[] | null>(null)
  const [batchFileNames, setBatchFileNames] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single')

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

  const handleFileSelected = (base64: string, name: string) => {
    setLabelBase64(base64)
    setFileName(name)
    setResult(null)
    setError(null)
  }

  const handleDemo = (scenarioId: string) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId)
    if (!scenario) return
    setResult(scenario.result)
    setResultLabel(`Demo: ${scenario.title}`)
  }

  const handleBatchSubmit = async (requests: VerifyRequest[], fileNames: string[]) => {
    setLoading(true)
    setError(null)
    setBatchResults(null)
    try {
      const res = await verifyBatch(requests)
      setBatchResults(res)
      setBatchFileNames(fileNames)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setLabelBase64(null)
    setFileName(null)
    setApplication(EMPTY_APPLICATION)
    setResult(null)
    setResultLabel(null)
    setError(null)
    setBatchResults(null)
    setBatchFileNames([])
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] font-sans">
      {/* Header */}
      <header className="bg-primary border-b border-outline-variant sticky top-0 z-50">
        <div className="flex justify-between items-center px-margin-lg w-full max-w-max-width mx-auto h-16">
          <div className="flex items-center gap-margin-md">
            <span className="text-headline-md font-black text-on-primary">ALRT</span>
            <div className="hidden lg:block h-6 w-px bg-white/30 mx-2" />
            <span className="hidden lg:block text-label-bold text-on-primary/80">
              Automated Label Review Tool — TTB COLA Verification
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-margin-lg h-full" aria-label="Main navigation">
            <button
              type="button"
              onClick={() => { handleReset(); setActiveTab('single') }}
              className={`text-label-bold h-full flex items-center border-b-2 transition-colors ${
                activeTab === 'single' && !result && !batchResults
                  ? 'text-on-primary border-on-primary'
                  : 'text-on-primary/70 border-transparent hover:text-on-primary'
              }`}
            >
              Single Label
            </button>
            <button
              type="button"
              onClick={() => { handleReset(); setActiveTab('batch') }}
              className={`text-label-bold h-full flex items-center px-4 border-b-2 transition-colors ${
                activeTab === 'batch' && !result && !batchResults
                  ? 'text-on-primary border-on-primary'
                  : 'text-on-primary/70 border-transparent hover:text-on-primary'
              }`}
            >
              Batch Upload
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" className="text-on-primary hover:bg-white/10 transition-colors p-2 rounded-full" aria-label="Notifications">
              <span className="material-symbols-outlined text-[24px]">notifications</span>
            </button>
            <button type="button" className="text-on-primary hover:bg-white/10 transition-colors p-2 rounded-full" aria-label="Account">
              <span className="material-symbols-outlined text-[24px]">account_circle</span>
            </button>
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
            <ReviewChecklist result={result} />
          </div>

        ) : batchResults ? (
          /* ── Batch results view ── */
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-headline-md font-headline-md text-primary">
                Batch Results — {batchResults.length} label{batchResults.length !== 1 ? 's' : ''}
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
            <BatchResults results={batchResults} fileNames={batchFileNames} />
          </div>

        ) : (
          /* ── Landing page ── */
          <>
            {/* Demo section */}
            <section>
              <h1 className="text-display-lg text-primary mb-1">Quick Demo</h1>
              <p className="text-body-lg text-secondary">Select a scenario to see the automated verification in action.</p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter max-w-3xl mx-auto" aria-label="Demo scenarios">
              {DEMO_SCENARIOS.map((scenario, i) => {
                const badge = DEMO_BADGES[i]!
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => handleDemo(scenario.id)}
                    className="bg-surface-container-lowest border border-outline-variant hover:border-primary transition-all cursor-pointer p-margin-md text-center flex flex-col items-center gap-3"
                    aria-label={`Load ${scenario.title} demo`}
                  >
                    <span className="material-symbols-outlined text-[40px] text-outline">{badge.icon}</span>
                    <div>
                      <h3 className="text-headline-sm text-primary mb-1">{scenario.title}</h3>
                      <p className="text-label-sm text-secondary">{scenario.description}</p>
                    </div>
                    <span className={`${badge.className} text-[10px] font-bold px-2 py-1 flex items-center gap-1 uppercase tracking-wider`}>
                      {badge.label}
                    </span>
                  </button>
                )
              })}
            </section>

            {/* Upload section */}
            <section className="bg-surface-container-lowest border border-outline-variant">
              {/* Tab headers */}
              <div className="flex border-b border-outline-variant" role="tablist" aria-label="Verification mode">
                <button
                  role="tab"
                  id="tab-single"
                  aria-selected={activeTab === 'single'}
                  aria-controls="tabpanel-single"
                  type="button"
                  onClick={() => setActiveTab('single')}
                  className={`px-margin-lg py-margin-md text-label-bold border-b-2 transition-colors ${
                    activeTab === 'single'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                >
                  Single Label
                </button>
                <button
                  role="tab"
                  id="tab-batch"
                  aria-selected={activeTab === 'batch'}
                  aria-controls="tabpanel-batch"
                  type="button"
                  onClick={() => setActiveTab('batch')}
                  className={`px-margin-lg py-margin-md text-label-bold border-b-2 transition-colors ${
                    activeTab === 'batch'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                >
                  Batch Upload
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mx-margin-lg mt-margin-md bg-error-container text-on-error-container px-4 py-3 flex items-start gap-2" role="alert">
                  <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">error</span>
                  <span className="text-label-bold">{error}</span>
                </div>
              )}

              {/* Loading */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4" role="status" aria-live="polite">
                  <div className="w-10 h-10 border-4 border-outline-variant border-t-primary rounded-full animate-spin" aria-hidden="true" />
                  <p className="text-label-bold text-secondary uppercase tracking-wider">
                    {activeTab === 'batch' ? 'Analyzing batch with AI vision…' : 'Analyzing label with AI vision…'}
                  </p>
                </div>

              ) : activeTab === 'single' ? (
                <div
                  role="tabpanel"
                  id="tabpanel-single"
                  aria-labelledby="tab-single"
                  className="grid grid-cols-1 lg:grid-cols-2 p-margin-lg gap-margin-lg"
                >
                  <LabelUpload onFileSelected={handleFileSelected} currentFileName={fileName} />
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

              ) : (
                <div
                  role="tabpanel"
                  id="tabpanel-batch"
                  aria-labelledby="tab-batch"
                  className="p-margin-lg"
                >
                  <p className="text-body-md text-secondary mb-margin-md">
                    Upload multiple label images and a CSV with application data. Filenames in the CSV must match the uploaded image filenames.
                  </p>
                  <BatchUpload onSubmit={handleBatchSubmit} disabled={loading} />
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
