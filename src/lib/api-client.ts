import { ApiError } from './errors'
import {
  FDRRecord,
  Institution,
  NotificationItem,
  AuditRecord,
  RenewalRequest,
  ReleaseRequest,
  DashboardSummary,
  User,
  HoldRecord,
  PortalSetting,
  ReleaseStage,
  PrecheckResponse,
} from '@/types'

// Use VITE_API_URL or fallback to VITE_API_BASE_URL or default to http://localhost:5000/api/v1
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api/v1'

const TOKEN_KEY = 'aicte_jwt_token'

// In-memory token storage with localStorage persistence across page reloads
let memoryToken: string | null = null

export function getStoredToken(): string | null {
  if (memoryToken) return memoryToken
  const stored = localStorage.getItem(TOKEN_KEY)
  if (stored) {
    memoryToken = stored
  }
  return memoryToken
}

export function setStoredToken(token: string): void {
  memoryToken = token
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  memoryToken = null
  localStorage.removeItem(TOKEN_KEY)
}

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const headers = new Headers(options.headers || {})

  const token = getStoredToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    })

    // Handle 401 Unauthorized with automatic refresh token flow
    if (res.status === 401 && !isRetry && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })

          if (refreshRes.ok) {
            const data = await refreshRes.json()
            const newToken = data.token
            setStoredToken(newToken)
            isRefreshing = false
            onRefreshed(newToken)
            return request<T>(path, options, true)
          } else {
            throw new Error('Refresh failed')
          }
        } catch {
          isRefreshing = false
          clearStoredToken()
          window.dispatchEvent(new CustomEvent('aicte:unauthorized'))
          throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.')
        }
      } else {
        // Wait for active refresh
        return new Promise<T>((resolve, reject) => {
          refreshSubscribers.push((newToken: string) => {
            headers.set('Authorization', `Bearer ${newToken}`)
            fetch(url, { ...options, headers, credentials: 'include' })
              .then((r) => r.json() as Promise<T>)
              .then(resolve)
              .catch(reject)
          })
        })
      }
    }

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      const message =
        data?.error?.message ||
        data?.message ||
        `Request failed with status ${res.status}`
      const code = data?.error?.code || data?.code || 'API_ERROR'
      throw new ApiError(res.status, code, message, data?.error?.details || data?.details)
    }

    // Handle empty responses
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return (await res.json()) as T
    }
    return (await res.text()) as unknown as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Network connection failure. Unable to reach AICTE portal services.'
    )
  }
}

export const api = {
  // 1. Auth & Session
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      const res = await request<User & { token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (res.token) {
        setStoredToken(res.token)
      }
      return res
    },
    registerInstitution: async (data: {
      institutionCode: string
      institutionName: string
      principalName: string
      email: string
      password: string
      state?: string
      city?: string
      type?: string
      contactPhone?: string
    }): Promise<User> => {
      const res = await request<User & { token: string }>('/auth/register-institution', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (res.token) {
        setStoredToken(res.token)
      }
      return res
    },
    refresh: async (): Promise<{ token: string; user?: User }> => {
      const res = await request<{ token: string; user?: User }>('/auth/refresh', {
        method: 'POST',
      })
      if (res.token) {
        setStoredToken(res.token)
      }
      return res
    },
    logout: async (): Promise<void> => {
      try {
        await request<void>('/auth/logout', { method: 'POST' })
      } finally {
        clearStoredToken()
      }
    },
    getCurrentUser: async (): Promise<User | null> => {
      if (!getStoredToken()) return null
      return request<User>('/auth/me')
    },
    switchRole: async (role: string): Promise<User> => {
      const emailMap: Record<string, string> = {
        INSTITUTION_USER: 'principal@iiitm-delhi.ac.in',
        REVIEWER: 'reviewer@aicte.gov.in',
        APPROVER: 'approver@aicte.gov.in',
        ADMIN: 'admin@aicte.gov.in',
        AICTE_OFFICIAL: 'reviewer@aicte.gov.in',
        AICTE_ADMIN: 'admin@aicte.gov.in',
      }
      const email = emailMap[role] || 'principal@iiitm-delhi.ac.in'
      return api.auth.login(email, 'password123')
    },
  },

  // 2. Institutions
  institutions: {
    list: async (params?: { search?: string; page?: number; limit?: number }): Promise<Institution[]> => {
      const query = new URLSearchParams()
      if (params?.search) query.set('search', params.search)
      if (params?.page) query.set('page', String(params.page))
      if (params?.limit) query.set('limit', String(params.limit))
      const q = query.toString()
      return request<Institution[]>(`/institutions${q ? `?${q}` : ''}`)
    },
    getById: async (id: string): Promise<Institution> => {
      return request<Institution>(`/institutions/${id}`)
    },
    create: async (data: {
      institutionCode: string
      name: string
      address?: string
      city?: string
      state?: string
      region?: string
      type?: string
      contactEmail?: string
      contactPhone?: string
      principalName?: string
    }): Promise<Institution> => {
      return request<Institution>('/institutions', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    createHold: async (
      institutionId: string,
      data: { reason: string; sourceBody: string; referenceNumber?: string; referenceNo?: string }
    ): Promise<HoldRecord> => {
      const ref = data.referenceNumber || data.referenceNo
      return request<HoldRecord>(`/institutions/${institutionId}/holds`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          referenceNumber: ref,
          referenceNo: ref,
        }),
      })
    },
  },

  // 3. Instruments (FDRs, Guarantees, Deposits)
  fdrs: {
    list: async (params?: {
      search?: string
      status?: string
      institutionId?: string
      bank?: string
      instrumentType?: string
      trustLevel?: string
      verificationStatus?: string
      riskLevel?: string
    }): Promise<FDRRecord[]> => {
      const query = new URLSearchParams()
      if (params?.search) query.set('search', params.search)
      if (params?.status && params.status !== 'all') query.set('status', params.status)
      if (params?.institutionId && params.institutionId !== 'all') query.set('institutionId', params.institutionId)
      if (params?.bank && params.bank !== 'all') query.set('bank', params.bank)
      if (params?.instrumentType && params.instrumentType !== 'all') query.set('instrumentType', params.instrumentType)
      if (params?.trustLevel && params.trustLevel !== 'all') query.set('trustLevel', params.trustLevel)
      if (params?.verificationStatus && params.verificationStatus !== 'all') query.set('verificationStatus', params.verificationStatus)
      if (params?.riskLevel && params.riskLevel !== 'all') query.set('riskLevel', params.riskLevel)
      const q = query.toString()
      return request<FDRRecord[]>(`/fdrs${q ? `?${q}` : ''}`)
    },
    getById: async (id: string): Promise<FDRRecord> => {
      return request<FDRRecord>(`/fdrs/${id}`)
    },
    create: async (data: any): Promise<FDRRecord> => {
      return request<FDRRecord>('/fdrs', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    update: async (id: string, data: any): Promise<FDRRecord> => {
      return request<FDRRecord>(`/fdrs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    getRequiredSlots: async (instrumentType = 'FDR'): Promise<{ instrumentType: string; requiredSlots: string[]; descriptions: Record<string, string> }> => {
      return request<{ instrumentType: string; requiredSlots: string[]; descriptions: Record<string, string> }>(`/documents/required-slots?instrumentType=${instrumentType}`)
    },
    getPrecheck: async (id: string): Promise<PrecheckResponse> => {
      return request<PrecheckResponse>(`/fdrs/${id}/precheck`)
    },
    runPrecheck: async (id: string): Promise<PrecheckResponse> => {
      return request<PrecheckResponse>(`/fdrs/${id}/precheck`, {
        method: 'POST',
      })
    },
    uploadDocument: async (
      fdrId: string,
      file: File,
      documentType: string,
      slotType?: string
    ): Promise<any> => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      if (slotType) {
        formData.append('slotType', slotType)
      } else {
        formData.append('slotType', documentType)
      }

      return request(`/fdrs/${fdrId}/documents`, {
        method: 'POST',
        body: formData,
      })
    },
    downloadDocumentUrl: (documentId: string): string => {
      return `${API_BASE_URL}/documents/${documentId}/download`
    },
    downloadDocument: async (documentId: string, fileName: string): Promise<void> => {
      const token = getStoredToken()
      const res = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new ApiError(res.status, 'DOWNLOAD_ERROR', 'Failed to download document.')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || 'document.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    },
    submit: async (id: string): Promise<FDRRecord> => {
      return request<FDRRecord>(`/fdrs/${id}/submit`, {
        method: 'POST',
      })
    },
    verify: async (
      id: string,
      payload: { result: 'VERIFIED' | 'DISCREPANCY' | 'REJECTED'; remarks: string }
    ): Promise<FDRRecord> => {
      return request<FDRRecord>(`/fdrs/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    bankVerify: async (
      id: string,
      payload?: { simulate?: boolean; simulatedStatus?: string }
    ): Promise<any> => {
      return request(`/fdrs/${id}/bank-verify`, {
        method: 'POST',
        body: JSON.stringify(payload || { simulate: true }),
      })
    },
    updateLien: async (
      id: string,
      payload: {
        lienStatus: string
        lienReferenceNumber?: string
        lienConfirmedAt?: string
        remarks?: string
      }
    ): Promise<FDRRecord> => {
      return request<FDRRecord>(`/fdrs/${id}/lien`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    },
  },

  // 4. Renewals
  renewals: {
    list: async (): Promise<RenewalRequest[]> => {
      return request<RenewalRequest[]>('/renewals')
    },
    getById: async (id: string): Promise<RenewalRequest> => {
      return request<RenewalRequest>(`/renewals/${id}`)
    },
    create: async (fdrId: string, data: any): Promise<RenewalRequest> => {
      return request<RenewalRequest>(`/fdrs/${fdrId}/renewals`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    decision: async (
      id: string,
      payload: { decision: 'APPROVED' | 'DECLINED'; remarks: string }
    ): Promise<any> => {
      return request(`/renewals/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  },

  // 5. Release Requests & Multi-Office Stages
  releases: {
    list: async (): Promise<ReleaseRequest[]> => {
      return request<ReleaseRequest[]>('/release-requests')
    },
    getById: async (id: string): Promise<ReleaseRequest> => {
      return request<ReleaseRequest>(`/release-requests/${id}`)
    },
    create: async (fdrId: string, data: any): Promise<ReleaseRequest> => {
      return request<ReleaseRequest>(`/fdrs/${fdrId}/release-requests`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    review: async (id: string, payload: { remarks: string }): Promise<any> => {
      return request(`/release-requests/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    stageAction: async (
      releaseRequestId: string,
      stageId: string,
      payload: {
        action: 'APPROVE' | 'REJECT' | 'RETURN'
        remarks: string
        nextOffice?: string
      }
    ): Promise<any> => {
      return request(`/release-requests/${releaseRequestId}/stages/${stageId}/action`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    decision: async (
      id: string,
      payload: { decision: 'APPROVED' | 'DECLINED'; remarks: string }
    ): Promise<any> => {
      return request(`/release-requests/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    getOrderUrl: (id: string): string => {
      return `${API_BASE_URL}/release-requests/${id}/order`
    },
    downloadOrder: async (id: string, fileName?: string): Promise<void> => {
      const token = getStoredToken()
      const res = await fetch(`${API_BASE_URL}/release-requests/${id}/order`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        throw new ApiError(res.status, 'DOWNLOAD_ERROR', 'Failed to download Sanction Order / NOC.')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || `AICTE-Sanction-Order-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    },
  },

  // 6. Regulatory Holds
  holds: {
    list: async (params?: { institutionId?: string; status?: string }): Promise<HoldRecord[]> => {
      const query = new URLSearchParams()
      if (params?.institutionId) query.set('institutionId', params.institutionId)
      if (params?.status && params.status !== 'all') query.set('status', params.status)
      const q = query.toString()
      return request<HoldRecord[]>(`/holds${q ? `?${q}` : ''}`)
    },
    clear: async (
      holdId: string,
      data: { remarks: string; referenceNumber?: string }
    ): Promise<HoldRecord> => {
      return request<HoldRecord>(`/holds/${holdId}/clear`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
  },

  // 7. Settings
  settings: {
    list: async (): Promise<PortalSetting[]> => {
      return request<PortalSetting[]>('/settings')
    },
    update: async (key: string, value: any): Promise<PortalSetting> => {
      return request<PortalSetting>(`/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      })
    },
  },

  // 8. Bulk CSV Import
  import: {
    instruments: async (
      file: File,
      dryRun = false
    ): Promise<{
      totalRows: number
      validRows: number
      errorRows: number
      errors: Array<{ row: number; field: string; message: string; data?: any }>
      preview?: any[]
      insertedCount?: number
    }> => {
      const formData = new FormData()
      formData.append('file', file)
      return request(`/import/instruments?dryRun=${dryRun}`, {
        method: 'POST',
        body: formData,
      })
    },
  },

  // 9. Dashboard & Drilldowns
  dashboard: {
    getSummary: async (): Promise<DashboardSummary> => {
      return request<DashboardSummary>('/dashboard/summary')
    },
    getDrilldown: async (
      drilldownType:
        | 'trust-level'
        | 'expiry-band'
        | 'stuck-stages'
        | 'missing-documents'
        | 'active-holds'
        | 'unconfirmed-liens',
      params?: Record<string, string>
    ): Promise<any> => {
      const query = new URLSearchParams(params || {})
      const q = query.toString()
      return request(`/dashboard/drilldown/${drilldownType}${q ? `?${q}` : ''}`)
    },
  },

  // 10. Documents
  documents: {
    getDownloadUrl: async (documentId: string): Promise<{ downloadUrl: string }> => {
      return request<{ downloadUrl: string }>(`/documents/${documentId}/download-url`)
    },
  },

  // 11. Notifications
  notifications: {
    list: async (): Promise<NotificationItem[]> => {
      return request<NotificationItem[]>('/notifications')
    },
    markRead: async (id: string): Promise<void> => {
      return request<void>(`/notifications/${id}/read`, { method: 'POST' })
    },
    markAllRead: async (): Promise<void> => {
      return request<void>('/notifications/mark-all-read', { method: 'POST' })
    },
  },

  // 12. Reports
  reports: {
    getFdrs: async (params?: {
      type?: string
      institution?: string
      status?: string
      bank?: string
      instrumentType?: string
      from?: string
      to?: string
      format?: 'json' | 'csv'
    }): Promise<{ type: string; totalCount: number; data: any[] }> => {
      const query = new URLSearchParams()
      if (params?.type) query.set('type', params.type)
      if (params?.institution && params.institution !== 'all') query.set('institution', params.institution)
      if (params?.status && params.status !== 'all') query.set('status', params.status)
      if (params?.bank && params.bank !== 'all') query.set('bank', params.bank)
      if (params?.instrumentType && params.instrumentType !== 'all') query.set('instrumentType', params.instrumentType)
      if (params?.from) query.set('from', params.from)
      if (params?.to) query.set('to', params.to)
      query.set('format', params?.format || 'json')
      return request(`/reports/fdrs?${query.toString()}`)
    },
    downloadCsv: async (params?: {
      type?: string
      institution?: string
      status?: string
      bank?: string
      instrumentType?: string
      from?: string
      to?: string
    }): Promise<void> => {
      const query = new URLSearchParams()
      if (params?.type) query.set('type', params.type)
      if (params?.institution && params.institution !== 'all') query.set('institution', params.institution)
      if (params?.status && params.status !== 'all') query.set('status', params.status)
      if (params?.bank && params.bank !== 'all') query.set('bank', params.bank)
      if (params?.instrumentType && params.instrumentType !== 'all') query.set('instrumentType', params.instrumentType)
      if (params?.from) query.set('from', params.from)
      if (params?.to) query.set('to', params.to)
      query.set('format', 'csv')

      const token = getStoredToken()
      const res = await fetch(`${API_BASE_URL}/reports/fdrs?${query.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new ApiError(res.status, 'DOWNLOAD_ERROR', 'Failed to export CSV report.')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aicte-fdr-report-${params?.type || 'all'}-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    },
  },

  // 13. Audit Logs
  audit: {
    list: async (params?: { actorId?: string; entityType?: string; action?: string }): Promise<AuditRecord[]> => {
      const query = new URLSearchParams()
      if (params?.actorId) query.set('actorId', params.actorId)
      if (params?.entityType) query.set('entityType', params.entityType)
      if (params?.action) query.set('action', params.action)
      const q = query.toString()
      return request<AuditRecord[]>(`/audit-logs${q ? `?${q}` : ''}`)
    },
  },

  // 14. Admin System Control
  admin: {
    runMaturityCheck: async (): Promise<{
      success: boolean
      message: string
      stats: {
        instrumentsChecked: number
        remindersGenerated: number
        maturedCount: number
        expiringCount: number
        escalationsCount: number
      }
    }> => {
      return request('/admin/run-maturity-check', { method: 'POST' })
    },
  },
}
