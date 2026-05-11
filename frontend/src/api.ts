import type { VerifyRequest, VerificationResult } from './types'

const API_BASE = '/api'

export async function verifyLabel(
  request: VerifyRequest,
): Promise<VerificationResult> {
  const res = await fetch(`${API_BASE}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Verification failed (${res.status}): ${detail}`)
  }

  return (await res.json()) as VerificationResult
}
