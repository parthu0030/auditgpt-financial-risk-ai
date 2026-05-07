const rawApiBase = import.meta.env.VITE_API_URL
// Prefer explicit env var; otherwise use same-origin in dev/prod so Vite proxy can handle API routing.
const API_BASE = (rawApiBase && rawApiBase.trim())
  ? rawApiBase.replace(/\/+$/, '')
  : ''

export async function analyzeCompany(companyName) {
  const token = localStorage.getItem('auditgpt_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}/api/analyze-company`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ company_name: companyName }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Analysis failed')
    throw new Error(msg)
  }
  return response.json()
}

export async function signupUserApi(name, email, password) {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Signup failed')
    throw new Error(msg)
  }
  return response.json()
}

export async function loginUserApi(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Login failed')
    throw new Error(msg)
  }
  return response.json()
}

export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error('Token validation failed')
  }
  return response.json()
}

export async function analyzePortfolio(companies) {
  const token = localStorage.getItem('auditgpt_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}/api/analyze-portfolio`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ companies }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Portfolio analysis failed')
    throw new Error(msg)
  }
  return response.json()
}

/**
 * Generate an AI report (streaming SSE).
 * @param {object} analysisData  – full analysis payload from /analyze-company
 * @param {function} onChunk     – called with each text chunk string
 * @returns {Promise<string>}    – resolves with the model name ("gpt-4o-mini" | "local")
 */
export async function generateReportStream(analysisData, onChunk) {
  const token = localStorage.getItem('auditgpt_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}/api/generate-report/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(analysisData),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Report generation failed')
    throw new Error(msg)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let model = 'local'

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    // SSE lines: "data: <content>\n\n"
    const lines = text.split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const content = line.slice(6)
      if (content.startsWith('[DONE]|')) {
        model = content.slice(7)
        break
      }
      // Restore newlines escaped for SSE
      const chunk = content.replace(/\\n/g, '\n')
      onChunk(chunk)
    }
  }

  return model
}

export async function getHistory(token) {
  const response = await fetch(`${API_BASE}/api/history`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Failed to fetch history')
    throw new Error(msg)
  }
  return response.json()
}

export async function getHistoryDetail(token, id) {
  const response = await fetch(`${API_BASE}/api/history/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Failed to fetch analysis detail')
    throw new Error(msg)
  }
  return response.json()
}

export async function deleteHistory(token, id) {
  const response = await fetch(`${API_BASE}/api/history/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Failed to delete record')
    throw new Error(msg)
  }
  return response.json()
}

/* ── Saved Portfolio APIs ──────────────────────────────────────── */

export async function getSavedPortfolio(token) {
  const response = await fetch(`${API_BASE}/api/portfolio`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Failed to fetch portfolio')
    throw new Error(msg)
  }
  return response.json()
}

export async function addToPortfolio(token, symbols) {
  const response = await fetch(`${API_BASE}/api/portfolio/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ symbols }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Failed to add to portfolio')
    throw new Error(msg)
  }
  return response.json()
}

export async function removeFromPortfolio(token, symbol) {
  const response = await fetch(`${API_BASE}/api/portfolio/remove`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ symbol }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Failed to remove from portfolio')
    throw new Error(msg)
  }
  return response.json()
}

export async function getAlertEmailConfig() {
  const response = await fetch(`${API_BASE}/api/alert-config`)
  if (!response.ok) {
    throw new Error('Failed to fetch alert config status')
  }
  return response.json()
}

export async function sendAlertEmail(payload) {
  const token = localStorage.getItem('auditgpt_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const response = await fetch(`${API_BASE}/api/send-alert`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail[0].msg : (err.detail || 'Failed to send alert email')
    throw new Error(msg)
  }
  return response.json()
}
