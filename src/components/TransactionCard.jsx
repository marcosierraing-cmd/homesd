import { useState } from 'react'
import { CATEGORIES, CUENTAS, USUARIOS } from '../data/budget.js'

export default function TransactionCard({ tx, onDelete }) {
  const [confirmando, setConfirmando] = useState(false)

  const cat = CATEGORIES.find(c => c.id === tx.categoriaId)
  const cuenta = CUENTAS.find(c => c.id === tx.cuentaId)
  const usuario = USUARIOS.find(u => u.id === tx.usuarioId)

  const fecha = new Date(tx.timestamp)
  const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

  if (confirmando) {
    return (
      <div style={{
        background: 'var(--red-bg)',
        border: '0.5px solid rgba(226,75,74,0.3)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>¿Eliminar este gasto?</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {tx.descripcion || cat?.name} · {mxn(tx.monto)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setConfirmando(false)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--border)',
              background: 'var(--card)', color: 'var(--text2)',
              fontSize: 12, cursor: 'pointer',
            }}>
            No
          </button>
          <button onClick={() => onDelete(tx.id)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: 'none',
              background: 'var(--red)', color: 'white',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            Eliminar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--card)',
      border: '0.5px solid var(--border2)',
      borderRadius: 12,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Ícono categoría */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: cat ? `${cat.color}20` : 'var(--card2)',
        border: `1.5px solid ${cat?.color || 'var(--border)'}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>
        {cat?.icon || '💰'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.descripcion || cat?.name || 'Sin descripción'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          {cat && (
            <span style={{ fontSize: 10, color: cat.color, background: `${cat.color}15`, padding: '1px 6px', borderRadius: 8 }}>
              {cat.name}
            </span>
          )}
          {cuenta && (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{cuenta.name}</span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{fechaStr} {horaStr}</span>
        </div>
      </div>

      {/* Monto + usuario + borrar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
          {mxn(tx.monto)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {usuario && (
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: `${usuario.color}25`,
              border: `1.5px solid ${usuario.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 7, fontWeight: 700, color: usuario.color,
            }}>
              {usuario.initials.charAt(0)}
            </div>
          )}
          {onDelete && (
            <button onClick={() => setConfirmando(true)}
              style={{
                width: 22, height: 22, borderRadius: 6,
                background: 'transparent',
                border: '0.5px solid var(--border2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text3)',
                fontSize: 12, lineHeight: 1,
              }}>
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
