import { useState, useEffect, ReactNode } from 'react'
import { AuthContext } from '../lib/auth'
import { User } from '../types'
import { API_BASE } from '../lib/apiBase'

const BASE = API_BASE

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lw_token'))

  const refresh = async () => {
    const t = localStorage.getItem('lw_token')
    if (!t) { setUser(null); return }
    try {
      const res = await fetch(`${BASE}/api/user/me`, { headers: { Authorization: `Bearer ${t}` } })
      if (!res.ok) { logout(); return }
      const data = await res.json()
      setUser(data.user)
    } catch { logout() }
  }

  useEffect(() => { refresh() }, [])

  const login = async (emailOrPhone: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrPhone, password, device_ua: navigator.userAgent }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'Login failed' }
    if (data.new_device) return { new_device: true, email: data.email }
    localStorage.setItem('lw_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return {}
  }

  const loginWithToken = (tok: string, u: User) => {
    localStorage.setItem('lw_token', tok)
    setToken(tok)
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('lw_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithToken, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}
