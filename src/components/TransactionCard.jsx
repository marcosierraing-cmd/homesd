import { useState } from 'react'
import { CATEGORIES, CUENTAS, USUARIOS } from '../data/budget.js'
import { usePrivacy } from '../context/PrivacyContext.jsx'

export default function TransactionCard({ tx, transaction, onDelete }) {
  const t = tx || transaction
  if (!t) return null

  const [confirmando, setConfirmando] = useState(false)
  const { mask } = usePrivacy()

  const cat = CATEGORIES.find(c => c.id === t.categoriaId)
  const cuenta = CUENTAS?.find(c => c.id === t.cuentaId)
  const usuario = USUARIOS?.find(u => u.id === t.usuarioId)

  const fecha = new Date(t.timestamp || t.createdAt)
  const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const mxn = n => '$' + Math.round(n || 0).toLocaleString('es-MX')

  const isIngreso = t.tipo === 'ingreso'

  if (confirmando) {
    return (
      <div style={{ background: 'var(--red-bg)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 12, padding: '12px 14px', marginBottom: 6 }}>
        <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10 }}>¿Eliminar <strong>{t.descripcion}</strong>?</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setConfirmando(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '0.5px solid var(--border2)', background: 'var(--card)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          <button onClick={() => { onDelete?.(t.id); setConfirmando(false) }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--red)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--card)', borderRadius: 12, padding: '12px 14px', marginBottom: 6, border: '0.5px solid ' + (isIngreso ? 'rgba(29,158,117,0.3)' : 'var(--border2)') }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: cat ? cat.color + '20' : (isIngreso ? 'var(--green-bg)' : 'var(--card2)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
          {isIngreso ? '💰' : (cat?.icon || '💸')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.descripcion}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            {cat && !isIngreso && <span style={{ fontSize: 10, color: cat.color, background: cat.color + '15', padding: '1px 7px', borderRadius: 6 }}>{cat.name}</span>}
            {isIngreso && <span style={{ fontSize: 10, color: 'var(--teal)', background: 'var(--green-bg)', padding: '1px 7px', borderRadius: 6 }}>Ingreso</span>}
            {cuenta && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{cuenta.name}</span>}
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{fechaStr} {horaStr}</span>
            {usuario && <span style={{ width: 16, height: 16, borderRadius: '50%', background: usuario.color + '30', border: '1px solid ' + usuario.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: usuario.color, fontWeight: 600 }}>{usuario.initial}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: isIngreso ? 'var(--teal)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{isIngreso ? '+' : ''}{mask(mxn(t.monto))}</span>
          <button onClick={() => setConfirmando(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text3)', padding: 0, lineHeight: 1 }}>×</button>
        </div>
      </div>
    </div>
  )
}
