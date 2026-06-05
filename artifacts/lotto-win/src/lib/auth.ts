import { createContext, useContext } from 'react'
import { User } from '../types'

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (phone: string, password: string) => Promise<{ error?: string }>
  logout: () => void
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => ({}),
  logout: () => {},
  refresh: async () => {},
})

export const useAuth = () => useContext(AuthContext)
