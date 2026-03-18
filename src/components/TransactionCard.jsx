import { CATEGORIES, CUENTAS, USUARIOS } from '../data/budget.js'

export default function TransactionCard({ tx, onEdit, onDelete }) {
  const cat = CATEGORIES.find(c => c.id === tx.categoriaId)
  const cuenta = CUENTAS.find(c => c.id === tx.cuentaId)
  const usuario = USUARIOS.find(u => u.id === tx.usuarioId)

  const fecha = new Date(tx.timestamp)
  const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

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
      {/* Category color dot */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          {cat && (
            <span style={{ fontSize: 10, color: cat.color, background: `${cat.color}15`, padding: '1px 6px', borderRadius: 8 }}>
              {cat.name}
            </span>
          )}
          {cuenta && (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              {cuenta.name}
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{fechaStr} {horaStr}</span>
        </div>
      </div>

      {/* Amount + user */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
          {mxn(tx.monto)}
        </div>
        {usuario && (
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: `${usuario.color}25`,
            border: `1.5px solid ${usuario.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 600, color: usuario.color,
            marginLeft: 'auto', marginTop: 4,
          }}>
            {usuario.initials.charAt(0)}
          </div>
        )}
      </div>
    </div>
  )
}
