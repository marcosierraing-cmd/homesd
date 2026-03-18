import { useState } from 'react'

const ALLOWED_EMAILS = [
  'marcosierraing@gmail.com',
  'naye.davila.gonzalez@gmail.com',
]

export default function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = () => {
    setLoading(true)
    setError('')

    // En producción: Google OAuth real
    // Por ahora: simulamos login para desarrollo
    // Cuando tengas tu Google Client ID, reemplaza esto
    setTimeout(() => {
      const mockUser = {
        id: 'marco',
        name: 'Marco Antonio',
        email: 'marco@example.com',
        avatar: null,
        usuarioId: 'marco',
      }
      onLogin(mockUser)
      setLoading(false)
    }, 800)
  }

  const handleNayeliLogin = () => {
    setLoading(true)
    setTimeout(() => {
      const mockUser = {
        id: 'nayeli',
        name: 'Nayeli Dávila',
        email: 'nayeli@example.com',
        avatar: null,
        usuarioId: 'nayeli',
      }
      onLogin(mockUser)
      setLoading(false)
    }, 800)
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 32px',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(223,202,143,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Icon */}
      <div style={{
        width: 100, height: 100,
        borderRadius: 24,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        boxShadow: '0 8px 40px rgba(223,202,143,0.1)',
      }}>
        <HouseIcon />
      </div>

      {/* Title */}
      <h1 className="serif" style={{
        fontSize: 36, color: 'var(--gold)',
        marginBottom: 6, letterSpacing: '-0.5px',
      }}>
        Home SD
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 48, textAlign: 'center' }}>
        Control financiero familiar
      </p>

      {/* Login buttons */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn btn-primary"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ width: '100%', gap: 10 }}
        >
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <GoogleIcon />
              <span>Continuar con Google</span>
            </>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="divider" style={{ flex: 1, margin: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>o accede como</span>
          <div className="divider" style={{ flex: 1, margin: 0 }} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{ flex: 1, fontSize: 13 }}
          >
            <UserDot color="#DFCA8F" />
            Marco
          </button>
          <button className="btn btn-secondary"
            onClick={handleNayeliLogin}
            disabled={loading}
            style={{ flex: 1, fontSize: 13 }}
          >
            <UserDot color="#5DCAA5" />
            Nayeli
          </button>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 16, textAlign: 'center' }}>{error}</p>
      )}

      <p style={{ color: 'var(--text3)', fontSize: 10, marginTop: 40, textAlign: 'center', lineHeight: 1.6 }}>
        Tus datos se almacenan de forma segura.{'\n'}
        Solo Marco y Nayeli tienen acceso.
      </p>
    </div>
  )
}

function HouseIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path d="M6 20L24 6L42 20V40C42 41.1 41.1 42 40 42H30V30H18V42H8C6.9 42 6 41.1 6 40V20Z"
        stroke="#DFCA8F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <rect x="20" y="32" width="8" height="10" rx="1" stroke="#DFCA8F" strokeWidth="1.5" fill="rgba(223,202,143,0.1)"/>
      <path d="M30 16h4M34 16v6" stroke="#2D7DD2" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function UserDot({ color }) {
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
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
