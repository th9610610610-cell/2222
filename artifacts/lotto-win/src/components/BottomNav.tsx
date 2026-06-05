import { useLocation, useNavigate } from 'react-router-dom'

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname

  const items = [
    {
      label: 'Home', path: '/',
      icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/></svg>
    },
    {
      label: 'Draws', path: '/draws',
      icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" fill="currentColor"/></svg>
    },
    {
      label: 'Tickets', path: '/my-tickets',
      icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2zm-2 5.5H6v-11h12v11z" fill="currentColor"/></svg>
    },
    {
      label: 'Wallet', path: '/wallet',
      icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"/></svg>
    },
    {
      label: 'Profile', path: '/profile',
      icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" fill="currentColor"/></svg>
    },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, width: '390px',
      background: '#0e0c24',
      borderTop: '1px solid rgba(100,50,200,0.25)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around',
      padding: '9px 0 20px', zIndex: 100,
    }}>
      {items.map(item => {
        const active = pathname === item.path
        return (
          <div key={item.path} onClick={() => navigate(item.path)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '4px', flex: 1, cursor: 'pointer', position: 'relative', paddingTop: '2px',
          }}>
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: '28px', height: '3px',
                background: 'linear-gradient(90deg, #f0a500, #e8187a)',
                borderRadius: '0 0 4px 4px',
              }} />
            )}
            <span style={{ color: active ? '#f0a500' : '#6060a0' }}>{item.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: active ? '#f0a500' : '#6060a0' }}>{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}
