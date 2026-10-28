import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, UserRole } from '@/types'
import { api } from '@/lib/api-client'
import { parseError } from '@/lib/errors'

export interface RegisterInstitutionInput {
  institutionCode: string
  institutionName: string
  principalName: string
  email: string
  password: string
  state?: string
  city?: string
  type?: string
  contactPhone?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, pass: string) => Promise<User>
  registerInstitution: (data: RegisterInstitutionInput) => Promise<User>
  logout: () => Promise<void>
  switchRole: (role: UserRole) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check active session on mount
    api.auth
      .getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })

    // Listen for unauthorized events to redirect cleanly
    const handleUnauthorized = () => {
      setUser(null)
    }
    window.addEventListener('aicte:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('aicte:unauthorized', handleUnauthorized)
  }, [])

  const login = async (email: string, pass: string): Promise<User> => {
    try {
      const authenticatedUser = await api.auth.login(email, pass)
      setUser(authenticatedUser)
      return authenticatedUser
    } catch (err) {
      throw parseError(err)
    }
  }

  const registerInstitution = async (data: RegisterInstitutionInput): Promise<User> => {
    try {
      const authenticatedUser = await api.auth.registerInstitution(data)
      setUser(authenticatedUser)
      return authenticatedUser
    } catch (err) {
      throw parseError(err)
    }
  }

  const logout = async (): Promise<void> => {
    await api.auth.logout()
    setUser(null)
  }

  const switchRole = async (role: UserRole): Promise<void> => {
    const updated = await api.auth.switchRole(role)
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, registerInstitution, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
