import { useState, useEffect, ReactNode } from 'react'
import { AuthContext } from '../lib/auth'
import { User } from '../types'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lw_token'))

  const refresh = async () => {
    const t = localStorage.getItem('lw_token')
    if (!t) { setUser(null); return }
    try {
      const res = await fetch(`${BASE}/api/user/me`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (!res.ok) { logout(); return }
      const data = await res.json()
      setUser(data.user)
    } catch {
      logout()
    }
  }

  useEffect(() => { refresh() }, [])

  const login = async (phone: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
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
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}
