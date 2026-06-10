import { createContext, useContext } from 'react'
import { User } from '../types'

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (emailOrPhone: string, password: string) => Promise<{ error?: string; new_device?: boolean; email?: string }>
  loginWithToken: (token: string, user: User) => void
  logout: () => void
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => ({}),
  loginWithToken: () => {},
  logout: () => {},
  refresh: async () => {},
})

export const useAuth = () => useContext(AuthContext)
