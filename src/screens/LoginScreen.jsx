import { useState } from 'react'

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || ''

const USUARIOS = [
  { id: 'marco',  name: 'Marco',  color: '#DFCA8F', initials: 'MA' },
  { id: 'nayeli', name: 'Nayeli', color: '#5DCAA5', initials: 'NI' },
]

export default function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [selectedUser, setSelectedUser] = useState('marco')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    if (!password) return
    if (password !== APP_PASSWORD && APP_PASSWORD !== '') {
      setError(true)
      setTimeout(() => setError(false), 2000)
      return
    }
    setLoading(true)
    const user = USUARIOS.find(u => u.id === selectedUser)
    localStorage.setItem('homesd_auth', '1')
    localStorage.setItem('homesd_user', JSON.stringify({
      id: user.id,
      name: user.name,
      usuarioId: user.id,
      color: user.color,
    }))
    setTimeout(() => onLogin({
      id: user.id,
      name: user.name,
      usuarioId: user.id,
      color: user.color,
    }), 400)
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 32px', background: 'var(--bg)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow background */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(223,202,143,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Ícono */}
      <div style={{
        width: 100, height: 100, borderRadius: 24,
        background: 'var(--card)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, boxShadow: '0 8px 40px rgba(223,202,143,0.1)',
        overflow: 'hidden',
      }}>
        <img src="/icons/icon-192.png" alt="Home SD"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none' }} />
        <HouseIcon />
      </div>

      <h1 className="serif" style={{ fontSize: 36, color: 'var(--gold)', marginBottom: 6, letterSpacing: '-0.5px' }}>
        Home SD
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 40, textAlign: 'center' }}>
        Control financiero familiar
      </p>

      {/* Selector de usuario */}
      <div style={{ width: '100%', marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, marginBottom: 10, letterSpacing: '0.06em' }}>
          ¿QUIÉN ERES?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          {USUARIOS.map(u => (
            <button key={u.id} onClick={() => setSelectedUser(u.id)}
              style={{
                flex: 1, padding: '14px 0',
                borderRadius: 12,
                border: `1.5px solid ${selectedUser === u.id ? u.color : 'var(--border)'}`,
                background: selectedUser === u.id ? `${u.color}15` : 'var(--card)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', margin: '0 auto 8px',
                background: `${u.color}20`,
                border: `2px solid ${selectedUser === u.id ? u.color : 'transparent'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: u.color,
              }}>
                {u.initials}
              </div>
              <p style={{
                fontSize: 13, fontWeight: 600,
                color: selectedUser === u.id ? u.color : 'var(--text2)',
              }}>{u.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Contraseña */}
      <div style={{ width: '100%', marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, marginBottom: 8, letterSpacing: '0.06em' }}>
          CONTRASEÑA
        </p>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false) }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="••••••••"
          style={{
            width: '100%', padding: '16px',
            borderRadius: 12,
            border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`,
            background: 'var(--card)', color: 'var(--text)',
            fontSize: 20, textAlign: 'center', letterSpacing: 6,
            outline: 'none', boxSizing: 'border-box',
            fontFamily: 'monospace',
            transition: 'border-color 0.15s',
          }}
        />
        {error && (
          <p style={{ color: 'var(--red)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            Contraseña incorrecta
          </p>
        )}
      </div>

      <button
        onClick={handleLogin}
        disabled={!password || loading}
        className="btn btn-primary"
        style={{ width: '100%' }}>
        {loading ? <LoadingSpinner /> : `Entrar como ${USUARIOS.find(u => u.id === selectedUser)?.name}`}
      </button>

      <p style={{ color: 'var(--text3)', fontSize: 10, marginTop: 32, textAlign: 'center', lineHeight: 1.6 }}>
        Solo Marco y Nayeli tienen acceso.{'\n'}
        Datos sincronizados en tiempo real.
      </p>
    </div>
  )
}

function HouseIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path d="M6 20L24 6L42 20V40C42 41.1 41.1 42 40 42H30V30H18V42H8C6.9 42 6 41.1 6 40V20Z"
        stroke="#DFCA8F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      border: '2px solid rgba(10,22,40,0.3)',
      borderTopColor: '#0A1628',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}
