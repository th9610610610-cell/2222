import { useLocation } from 'wouter'

export default function BottomNav() {
  const [pathname, navigate] = useLocation()

  const items = [
    {
      label: 'Home', path: '/',
      activeColor: '#f0a500',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
            stroke={active ? '#f0a500' : '#6060a0'}
            strokeWidth="2" strokeLinejoin="round"
            fill={active ? 'rgba(240,165,0,0.15)' : 'none'} />
        </svg>
      ),
    },
    {
      label: 'Draws', path: '/draws',
      activeColor: '#9b20d8',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M8 21H6C5 21 3 20 3 18V16C3 16 5 16 6 14C7 12 6 10 6 10H18C18 10 17 12 18 14C19 16 21 16 21 16V18C21 20 19 21 18 21H16" stroke={active ? '#9b20d8' : '#6060a0'} strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 21C8 21 8 17 12 17C16 17 16 21 16 21" stroke={active ? '#9b20d8' : '#6060a0'} strokeWidth="2" strokeLinecap="round"/>
          <path d="M12 10V6" stroke={active ? '#9b20d8' : '#6060a0'} strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 6H16" stroke={active ? '#9b20d8' : '#6060a0'} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Tickets', path: '/my-tickets',
      activeColor: '#22d3ee',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="7" width="20" height="10" rx="2" stroke={active ? '#22d3ee' : '#6060a0'} strokeWidth="2"/>
          <path d="M15 7V17" stroke={active ? '#22d3ee' : '#6060a0'} strokeWidth="2" strokeDasharray="2 2"/>
          <path d="M9 7V17" stroke={active ? '#22d3ee' : '#6060a0'} strokeWidth="2" strokeDasharray="2 2"/>
          <circle cx="6" cy="12" r="1" fill={active ? '#22d3ee' : '#6060a0'}/>
          <circle cx="18" cy="12" r="1" fill={active ? '#22d3ee' : '#6060a0'}/>
        </svg>
      ),
    },
    {
      label: 'Wallet', path: '/wallet',
      activeColor: '#2dd4bf',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke={active ? '#2dd4bf' : '#6060a0'} strokeWidth="2"/>
          <path d="M2 10H22" stroke={active ? '#2dd4bf' : '#6060a0'} strokeWidth="2"/>
          <rect x="15" y="13" width="4" height="3" rx="1" fill={active ? '#2dd4bf' : '#6060a0'}/>
        </svg>
      ),
    },
    {
      label: 'Profile', path: '/profile',
      activeColor: '#f472b6',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke={active ? '#f472b6' : '#6060a0'} strokeWidth="2"/>
          <path d="M4 20C4 17 7.6 15 12 15C16.4 15 20 17 20 20" stroke={active ? '#f472b6' : '#6060a0'} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)',
      width: '390px', maxWidth: 'calc(100vw - 24px)',
      background: '#12102e',
      borderRadius: '24px',
      border: '1px solid rgba(100,50,200,0.3)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '10px 8px 10px', zIndex: 100,
    }}>
      {items.map(item => {
        const active = pathname === item.path
        return (
          <div key={item.path} onClick={() => navigate(item.path)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '4px', flex: 1, cursor: 'pointer', position: 'relative', paddingTop: '4px',
          }}>
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: '24px', height: '3px',
                background: item.activeColor,
                borderRadius: '0 0 4px 4px',
              }} />
            )}
            {item.icon(active)}
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: active ? item.activeColor : '#6060a0',
              fontFamily: 'Poppins, sans-serif',
            }}>{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}
