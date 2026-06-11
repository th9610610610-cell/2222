import { useState } from 'react'

export default function DeployPage() {
  const [githubToken, setGithubToken] = useState('')
  const [vercelToken, setVercelToken] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [vercelProject, setVercelProject] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleDeploy() {
    if (!githubToken || !vercelToken) {
      setStatus('❌ Please enter both GitHub and Vercel tokens.')
      return
    }
    setLoading(true)
    setStatus('⏳ Pushing to GitHub and deploying to Vercel...')
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubToken, vercelToken, githubRepo, vercelProject }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus(`✅ ${data.message || 'Deployed successfully!'}`)
      } else {
        setStatus(`❌ ${data.error || 'Deploy failed.'}`)
      }
    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08071a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#100f28',
        borderRadius: '16px',
        border: '1px solid #2a2850',
        padding: '2rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <h1 style={{
          color: '#f0a500',
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '0.25rem',
          fontFamily: 'Poppins, sans-serif',
        }}>🚀 Deploy Settings</h1>
        <p style={{ color: '#6b6b8a', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
          Enter your tokens to push code to GitHub and deploy to Vercel.
        </p>

        <label style={labelStyle}>GitHub Token</label>
        <input
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          value={githubToken}
          onChange={e => setGithubToken(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>GitHub Repository</label>
        <input
          type="text"
          placeholder="username/repo-name"
          value={githubRepo}
          onChange={e => setGithubRepo(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Vercel Token</label>
        <input
          type="password"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
          value={vercelToken}
          onChange={e => setVercelToken(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Vercel Project Name</label>
        <input
          type="text"
          placeholder="my-project"
          value={vercelProject}
          onChange={e => setVercelProject(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={handleDeploy}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.85rem',
            borderRadius: '10px',
            border: 'none',
            background: loading ? '#6b6b8a' : 'linear-gradient(90deg, #f0a500 0%, #ffd700 100%)',
            color: '#08071a',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Poppins, sans-serif',
            marginTop: '0.5rem',
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Deploying...' : '🚀 Push & Deploy'}
        </button>

        {status && (
          <div style={{
            marginTop: '1.25rem',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            background: '#0d0c22',
            border: '1px solid #2a2850',
            color: '#e8e8f0',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            wordBreak: 'break-all',
          }}>
            {status}
          </div>
        )}

        <p style={{ marginTop: '1.5rem', color: '#3d3b6b', fontSize: '0.75rem', textAlign: 'center' }}>
          Tokens are sent directly to the server and never stored.
        </p>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#9b9bbf',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '0.35rem',
  marginTop: '1rem',
  fontFamily: 'Poppins, sans-serif',
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  background: '#0d0c22',
  border: '1px solid #2a2850',
  borderRadius: '10px',
  color: '#e8e8f0',
  fontSize: '0.9rem',
  fontFamily: 'Poppins, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}
