import { useLocation } from 'wouter'

export default function BottomNav() {
  const [pathname, navigate] = useLocation()

  const items = [
    {
      label: 'Home', path: '/',
      activeColor: '#f0a500',
      icon: (active: boolean) => (
        <div style={{
          width: '38px', height: '38px', borderRadius: '12px',
          background: active ? 'rgba(240,165,0,0.18)' : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 12L12 4L21 12V20H15V15H9V20H3V12Z"
              stroke={active ? '#f0a500' : '#8888cc'}
              strokeWidth="2" strokeLinejoin="round"
              fill={active ? 'rgba(240,165,0,0.2)' : 'none'} />
          </svg>
        </div>
      ),
    },
    {
      label: 'Draws', path: '/draws',
      activeColor: '#9b20d8',
      icon: (active: boolean) => (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M6 9H18M6 9C6 9 4 9 4 7V5H20V7C20 9 18 9 18 9M6 9C6 9 6 14 12 17C18 14 18 9 18 9" stroke={active ? '#9b20d8' : '#7777bb'} strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 17V21M9 21H15" stroke={active ? '#9b20d8' : '#7777bb'} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Tickets', path: '/my-tickets',
      activeColor: '#22d3ee',
      icon: (active: boolean) => (
        <svg width="28" height="28" viewBox="0 0 32 20" fill="none">
          <rect x="1" y="1" width="30" height="18" rx="3" stroke={active ? '#22d3ee' : '#5599bb'} strokeWidth="2"/>
          <circle cx="1" cy="10" r="3" fill="#13112e" stroke={active ? '#22d3ee' : '#5599bb'} strokeWidth="1.5"/>
          <circle cx="31" cy="10" r="3" fill="#13112e" stroke={active ? '#22d3ee' : '#5599bb'} strokeWidth="1.5"/>
          <line x1="12" y1="1" x2="12" y2="19" stroke={active ? '#22d3ee' : '#5599bb'} strokeWidth="1.5" strokeDasharray="3 2"/>
          <line x1="20" y1="1" x2="20" y2="19" stroke={active ? '#22d3ee' : '#5599bb'} strokeWidth="1.5" strokeDasharray="3 2"/>
          <path d="M15 7L17 10L15 13M17 7L15 10L17 13" stroke={active ? '#22d3ee' : '#5599bb'} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Wallet', path: '/wallet',
      activeColor: '#2dd4bf',
      icon: (active: boolean) => (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="15" rx="3" stroke={active ? '#2dd4bf' : '#449988'} strokeWidth="2"/>
          <path d="M2 10H22" stroke={active ? '#2dd4bf' : '#449988'} strokeWidth="2"/>
          <rect x="15" y="13" width="4" height="3" rx="1.5" fill={active ? '#2dd4bf' : '#449988'}/>
        </svg>
      ),
    },
    {
      label: 'Profile', path: '/profile',
      activeColor: '#f472b6',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke={active ? '#f472b6' : '#bb6688'} strokeWidth="2"/>
          <path d="M4 20C4 17 7.6 15 12 15C16.4 15 20 17 20 20" stroke={active ? '#f472b6' : '#bb6688'} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)',
      width: '390px', maxWidth: 'calc(100vw - 20px)',
      background: 'linear-gradient(135deg, #16143a 0%, #0f0d2a 100%)',
      borderRadius: '22px',
      border: '1px solid rgba(120,80,220,0.35)',
      boxShadow: '0 4px 28px rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '10px 4px 12px', zIndex: 100,
    }}>
      {items.map(item => {
        const active = pathname === item.path
        return (
          <div key={item.path} onClick={() => navigate(item.path)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '5px', flex: 1, cursor: 'pointer', position: 'relative',
          }}>
            {active && (
              <div style={{
                position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                width: '28px', height: '3px',
                background: item.activeColor,
                borderRadius: '0 0 4px 4px',
              }} />
            )}
            {item.icon(active)}
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: active ? item.activeColor : '#7777aa',
              fontFamily: 'Poppins, sans-serif',
            }}>{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}
