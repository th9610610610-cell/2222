import { useState, useEffect, ReactNode } from 'react'
import { AuthContext } from '../lib/auth'
import { User } from '../types'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lw_token'))
  const [loading, setLoading] = useState<boolean>(true)

  const refresh = async () => {
    const t = localStorage.getItem('lw_token')
    if (!t) { setUser(null); setToken(null); setLoading(false); return }
    try {
      const res = await fetch(`${BASE}/api/user/me`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (!res.ok) { logout(); return }
      const data = await res.json()
      setUser(data.user)
      setToken(t)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'Login failed' }

    localStorage.setItem('lw_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return {}
  }

  const logout = () => {
    localStorage.removeItem('lw_token')
    setToken(null)
    setUser(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}
