import { useState } from 'react'
import { Button, Alert } from '@trussworks/react-uswds'
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
      const res = await verifyLabel({
        label_image: labelBase64,
        application,
      })
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
    <>
      <header className="alrt-header">
        <h1>ALRT</h1>
        <p>Automated Label Review Tool — TTB COLA Verification</p>
      </header>

      <main className="alrt-main">
        {result ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="usa-heading" style={{ margin: 0 }}>
                Results{resultLabel ? ` — ${resultLabel}` : ''}
              </h2>
              <Button type="button" unstyled onClick={handleReset}>
                ← New Verification
              </Button>
            </div>
            <ReviewChecklist result={result} />
          </>
        ) : batchResults ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="usa-heading" style={{ margin: 0 }}>
                Batch Results — {batchResults.length} label{batchResults.length !== 1 ? 's' : ''}
              </h2>
              <Button type="button" unstyled onClick={handleReset}>
                ← New Verification
              </Button>
            </div>
            <BatchResults results={batchResults} fileNames={batchFileNames} />
          </>
        ) : (
          <>
            <section style={{ marginBottom: '2rem' }}>
              <h2 className="usa-heading">Quick Demo</h2>
              <p style={{ fontSize: '0.875rem', color: '#565c65', marginBottom: '0.75rem' }}>
                Try a pre-loaded scenario to see how ALRT compares label data against a COLA application.
              </p>
              <div className="demo-cards">
                {DEMO_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    className="demo-card"
                    onClick={() => handleDemo(scenario.id)}
                    type="button"
                  >
                    <strong>{scenario.title}</strong>
                    <span>{scenario.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid #dfe1e2', margin: '1.5rem 0' }} />

            <div className="verify-tabs" role="tablist" aria-label="Verification mode">
              <button
                role="tab"
                id="tab-single"
                aria-selected={activeTab === 'single'}
                aria-controls="tabpanel-single"
                className={`verify-tab ${activeTab === 'single' ? 'verify-tab--active' : ''}`}
                onClick={() => setActiveTab('single')}
                type="button"
              >
                Single Label
              </button>
              <button
                role="tab"
                id="tab-batch"
                aria-selected={activeTab === 'batch'}
                aria-controls="tabpanel-batch"
                className={`verify-tab ${activeTab === 'batch' ? 'verify-tab--active' : ''}`}
                onClick={() => setActiveTab('batch')}
                type="button"
              >
                Batch Upload
              </button>
            </div>

            {error && (
              <Alert type="error" headingLevel="h3" heading="Error" slim>
                {error}
              </Alert>
            )}

            {loading ? (
              <div className="loading-overlay" role="status" aria-live="polite">
                <div className="loading-spinner" aria-hidden="true" />
                <p>{activeTab === 'batch' ? 'Analyzing batch with AI vision...' : 'Analyzing label with AI vision...'}</p>
              </div>
            ) : activeTab === 'single' ? (
              <div role="tabpanel" id="tabpanel-single" aria-labelledby="tab-single">
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3>1. Upload Label Image</h3>
                  <LabelUpload onFileSelected={handleFileSelected} currentFileName={fileName} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h3>2. Enter Application Data</h3>
                  <ApplicationForm data={application} onChange={setApplication} disabled={loading} />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
                    Verify Label
                  </Button>
                </div>
              </div>
            ) : (
              <div role="tabpanel" id="tabpanel-batch" aria-labelledby="tab-batch">
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3>Upload Labels + CSV</h3>
                  <p style={{ fontSize: '0.875rem', color: '#565c65', marginBottom: '0.75rem' }}>
                    Upload multiple label images and a CSV with application data. Filenames in the CSV must match the uploaded image filenames.
                  </p>
                  <BatchUpload onSubmit={handleBatchSubmit} disabled={loading} />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
