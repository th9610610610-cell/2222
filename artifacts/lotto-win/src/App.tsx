import { Switch, Route, Router as WouterRouter } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './components/AuthProvider'
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
import DeployPage from './pages/DeployPage'
import NotFound from './pages/not-found'

const queryClient = new QueryClient()

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
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
      <Route path="/admin" component={AdminPage} />
      <Route path="/deploy" component={DeployPage} />
      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
