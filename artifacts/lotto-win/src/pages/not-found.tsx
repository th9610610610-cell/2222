import { useLocation } from 'wouter'

export default function NotFound() {
  const [, navigate] = useLocation()
  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎯</div>
      <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>404 – Page Not Found</h1>
      <p style={{ color: '#8888aa', marginBottom: '24px' }}>This page doesn't exist.</p>
      <button onClick={() => navigate('/')} style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff', fontWeight: 700, fontSize: '15px' }}>Go Home</button>
    </div>
  )
}
