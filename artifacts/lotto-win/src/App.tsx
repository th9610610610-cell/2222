import { useEffect } from 'react'
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './components/AuthProvider'
import { useAuth } from './lib/auth'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DrawsPage from './pages/DrawsPage'
import MyTicketsPage from './pages/MyTicketsPage'
import WalletPage from './pages/WalletPage'
import DepositPage from './pages/DepositPage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPage from './pages/AdminPage'
import WinnerPage from './pages/WinnerPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import NotFound from './pages/not-found'

const queryClient = new QueryClient()

function AdminGuard() {
  const { user, token, loading } = useAuth()
  const [, navigate] = useLocation()
  const verified = sessionStorage.getItem('lw_admin_verified') === '1'
  const isAdmin = ['admin', 'moderator'].includes(user?.role || '')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9b20d8', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}>Verifying access…</div>
      </div>
    )
  }

  if (!token || !isAdmin || !verified) {
    navigate('/lw-secure-7x9k')
    return null
  }
  return <AdminPage />
}

function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref && ref.trim()) {
      localStorage.setItem('lw_ref_code', ref.trim().toUpperCase())
    }
  }, [])
  return null
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dashboard">{() => <Redirect to="/" />}</Route>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/draws" component={DrawsPage} />
      <Route path="/my-tickets" component={MyTicketsPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/deposit" component={DepositPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/winner" component={WinnerPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/lw-secure-7x9k" component={AdminLoginPage} />
      <Route path="/admin" component={AdminGuard} />
      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ReferralCapture />
          <Router />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
