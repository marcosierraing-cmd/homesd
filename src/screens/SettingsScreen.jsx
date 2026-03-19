import { useState } from 'react'
import { BUDGET_VERSION, INGRESO_QUINCENAL, INGRESO_MENSUAL, calcularTotalQ } from '../data/budget.js'
import { usePrivacy } from '../context/PrivacyContext.jsx'

export default function SettingsScreen({ user, onLogout, settings, onUpdateSettings }) {
  const [notif, setNotif] = useState(settings?.notificationsEnabled || false)
  const { mask } = usePrivacy()
  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

  const totalQ1 = calcularTotalQ(1)
  const totalQ2 = calcularTotalQ(2)
  const totalMes = totalQ1 + totalQ2

  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setNotif(true)
      onUpdateSettings?.({ ...settings, notificationsEnabled: true })
    }
  }

  return (
    <div className="screen" style={{ padding: '20px 20px 80px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Configuración</h2>

      {user && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: user.usuarioId === 'nayeli' ? 'rgba(93,202,165,0.2)' : 'var(--gold-bg)',
            border: `2px solid ${user.usuarioId === 'nayeli' ? '#5DCAA5' : 'var(--gold)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700,
            color: user.usuarioId === 'nayeli' ? '#5DCAA5' : 'var(--gold)',
          }}>
            {user.name?.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 500 }}>{user.name}</p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>{user.email}</p>
          </div>
          <button className="btn btn-ghost" onClick={onLogout} style={{ fontSize: 12, color: 'var(--red)' }}>
            Salir
          </button>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 10 }}>
          RESUMEN DEL PRESUPUESTO BASE
        </p>
        <div className="card">
          {[
            ['Ingreso mensual', mxn(INGRESO_MENSUAL), 'var(--teal)'],
            ['Total Q1 (días 1-15)', mxn(totalQ1), totalQ1 > INGRESO_QUINCENAL ? 'var(--red)' : 'var(--text)'],
            ['Total Q2 (días 16-31)', mxn(totalQ2), totalQ2 > INGRESO_QUINCENAL ? 'var(--red)' : 'var(--text)'],
            ['Total mes', mxn(totalMes), totalMes > INGRESO_MENSUAL ? 'var(--red)' : 'var(--text)'],
            ['Margen mensual', mxn(INGRESO_MENSUAL - totalMes), INGRESO_MENSUAL - totalMes < 0 ? 'var(--red)' : 'var(--teal)'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border2)' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color, fontVariantNumeric: 'tabular-nums' }}>{mask(value)}</span>
            </div>
          ))}
          <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8 }}>Versión presupuesto: {BUDGET_VERSION}</p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 10 }}>ALERTAS</p>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }}>Alerta al 80%</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Notificación cuando una categoría llega al 80% del techo</p>
            </div>
            <button onClick={notif ? undefined : requestNotifications}
              style={{
                width: 44, height: 26, borderRadius: 13,
                background: notif ? 'var(--teal)' : 'var(--card2)',
                border: `0.5px solid ${notif ? 'var(--teal)' : 'var(--border)'}`,
                position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease',
              }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3, transition: 'left 0.2s ease',
                left: notif ? 21 : 3,
              }} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 10 }}>ESTADO DE DEUDAS</p>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { name: 'TC BBVA *2251', status: 'LIQUIDADA ✓', color: 'var(--teal)', detail: 'Eliminada en marzo 2026' },
            { name: 'Renta abr-may-jun', status: 'PREPAGADA ✓', color: 'var(--teal)', detail: '3 meses cubiertos' },
            { name: 'Préstamo Scotiabank', status: '55/60 pagos', color: 'var(--text)', detail: mask('$444,779 restante') + ' · 24.77%' },
            { name: 'GM Tracker', status: '27 rentas', color: 'var(--text)', detail: mask('$297,928') + ' · vence 11 c/mes' },
            { name: 'Peugeot 3008', status: '29 rentas', color: 'var(--text)', detail: mask('~$372,730') + ' · vence día 5 c/mes' },
            { name: 'TC Scotia *6201', status: mask('$72,202'), color: 'var(--amber)', detail: '34.28% tasa · atacar con abonos' },
          ].map(d => (
            <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 500 }}>{d.name}</p>
                <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{d.detail}</p>
              </div>
              <span style={{ fontSize: 11, color: d.color, fontWeight: 500, textAlign: 'right' }}>{d.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px', background: 'var(--card)', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 4 }}>Home SD v1.0</p>
        <p style={{ fontSize: 11, color: 'var(--text3)' }}>Sierra Dávila · 2026</p>
        <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>Powered by Claude Haiku — datos seguros en Google Drive</p>
      </div>
    </div>
  )
}
