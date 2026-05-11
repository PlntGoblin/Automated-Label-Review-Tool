import { useState } from 'react'
import { Button, Alert } from '@trussworks/react-uswds'
import type { ApplicationData, VerificationResult } from './types'
import { verifyLabel } from './api'
import { DEMO_SCENARIOS } from './demo-scenarios'
import ApplicationForm from './components/ApplicationForm'
import LabelUpload from './components/LabelUpload'
import ReviewChecklist from './components/ReviewChecklist'

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

  const handleReset = () => {
    setLabelBase64(null)
    setFileName(null)
    setApplication(EMPTY_APPLICATION)
    setResult(null)
    setResultLabel(null)
    setError(null)
  }

  return (
    <>
      <header className="alrt-header">
        <h1>ALRT</h1>
        <p>Automated Label Review Tool — TTB COLA Verification</p>
      </header>

      <main className="alrt-main">
        {!result ? (
          <>
            <section style={{ marginBottom: '2rem' }}>
              <h2 className="usa-heading">Quick Demo</h2>
              <p style={{ fontSize: '0.875rem', color: '#71767a', marginBottom: '0.75rem' }}>
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

            <h2 className="usa-heading">Verify Your Own Label</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3>1. Upload Label Image</h3>
              <LabelUpload onFileSelected={handleFileSelected} currentFileName={fileName} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3>2. Enter Application Data</h3>
              <ApplicationForm data={application} onChange={setApplication} disabled={loading} />
            </div>

            {error && (
              <Alert type="error" headingLevel="h3" heading="Error" slim>
                {error}
              </Alert>
            )}

            {loading ? (
              <div className="loading-overlay" role="status" aria-live="polite">
                <div className="loading-spinner" aria-hidden="true" />
                <p>Analyzing label with AI vision...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
                  Verify Label
                </Button>
              </div>
            )}
          </>
        ) : (
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
        )}
      </main>
    </>
  )
}
