import type { SettingsPreferences } from './settingsPreferences'
const API = import.meta.env.VITE_API_URL || '/api'

export type Tx = {
  id: string
  import_id: string
  tx_date: string
  description: string
  merchant: string
  category: string
  amount: string
  currency: string
}
export type Category = { name: string; amount: string; percentage: number }
export type Merchant = { name: string; amount: string; count: number }
export type Summary = {
  income: string
  expenses: string
  net_flow: string
  transaction_count: number
  category_totals: Category[]
  merchant_totals: Merchant[]
  monthly: { month: string; income: string; expenses: string }[]
  recent_transactions: Tx[]
}
export type ImportRecord = {
  id: string
  filename: string
  imported_at: string
  start_date: string
  end_date: string
  currency: string
  transaction_count: number
  warnings: string[] | string
  summary?: Summary
}
export type Settings = SettingsPreferences
export type SettingsUpdate = Omit<Settings, 'monthly_budget'> & { monthly_budget: string | null }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API}${path}`, init)
  } catch {
    throw new Error('Cannot reach the SpendSense backend. Start the API server and try again.')
  }
  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    try {
      const body = await response.json()
      message = body.detail || message
    } catch { /* The response may not contain JSON. */ }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const api = {
  imports: () => request<ImportRecord[]>('/imports'),
  upload: async (file: File, currency: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('currency', currency)
    return request<ImportRecord>('/imports', { method: 'POST', body: form })
  },
  removeImport: (id: string) => request<{ deleted: boolean }>(`/imports/${id}`, { method: 'DELETE' }),
  overview: (id: string, start = '', end = '') => {
    const params = new URLSearchParams()
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    return request<{ import: ImportRecord; summary: Summary }>(`/overview/${id}${params.size ? `?${params}` : ''}`)
  },
  transactions: (id: string, params = '') => request<{ items: Tx[]; total: number }>(`/transactions?import_id=${encodeURIComponent(id)}${params}`),
  analytics: (id: string) => request<Summary>(`/analytics/${id}`),
  compare: (left: string, right: string) => request<any>(`/compare?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}`),
  merchantDetail: (id: string, merchant: string) => request<{ merchant: string; transactions: Tx[]; total_spending: string }>(`/merchant-detail?import_id=${encodeURIComponent(id)}&merchant=${encodeURIComponent(merchant)}`),
  settings: () => request<Settings>('/settings'),
  saveSettings: (settings: SettingsUpdate) => request<Settings>('/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }),
  search: (q: string) => request<any>(`/search?q=${encodeURIComponent(q)}`),
  agent: (question: string, import_id: string) => request<{ answer: string; notice?: string | null }>('/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, import_id }) }),
  download: async (id: string, format: 'pdf' | 'csv') => {
    const response = await fetch(`${API}/reports/${id}/${format}`, { method: 'POST' })
    if (!response.ok) {
      let message = 'Report could not be generated.'
      try { message = (await response.json()).detail || message } catch { /* Keep the user-facing fallback. */ }
      throw new Error(message)
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `spendsense-report.${format}`
    anchor.click()
    URL.revokeObjectURL(url)
  },
}
