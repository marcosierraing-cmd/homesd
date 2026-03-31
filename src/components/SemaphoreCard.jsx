import { useState } from 'react'

export default function SemaphoreCard({ category, gastado, presupuesto, subcats = [], mxn, mask }) {
  const [expanded, setExpanded] = useState(false)

  const mxnLocal = mxn || (n => '$' + Math.round(n).toLocaleString('es-MX'))
  const maskLocal = mask || (v => v)

  const pct = presupuesto > 0 ? Math.min(gastado / presupuesto, 1) : 0
  const pctDisplay = presupuesto > 0 ? Math.round((gastado / presupuesto) * 100) : 0

  let statusColor, barColor, bgTint
  if (pct >= 1) {
    statusColor = 'var(--red)'
    barColor = '#E24B4A'
    bgTint = 'rgba(226,75,74,0.06)'
  } else if (pct >= 0.8) {
    statusColor = 'var(--amber)'
    barColor = '#EF9F27'
    bgTint = 'rgba(239,159,39,0.06)'
  } else {
    statusColor = 'var(--teal)'
    barColor = '#1D9E75'
    bgTint = 'rgba(29,158,117,0.04)'
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, var(--card) 0%, ${bgTint} 100%)`,
      border: `0.5px solid rgba(255,255,255,0.06)`,
      borderLeft: `3px solid ${category.color}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header — siempre visible */}
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding: '12px 14px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{category.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{category.name}</span>
            {pct >= 0.8 && <span style={{ fontSize: 10 }}>{pct >= 1 ? '🔴' : '🟡'}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: statusColor, fontVariantNumeric: 'tabular-nums' }}>
                {maskLocal(mxnLocal(gastado))}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>/ {maskLocal(mxnLocal(presupuesto))}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct * 100}%`, background: barColor }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>
            {presupuesto > 0 ? `${maskLocal(mxnLocal(presupuesto - gastado))} disponible` : 'Sin presupuesto'}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: statusColor, background: bgTint, padding: '1px 6px', borderRadius: 10 }}>
            {pctDisplay}%
          </span>
        </div>
      </div>

      {/* Subcategorías expandibles */}
      {expanded && subcats.length > 0 && (
        <div style={{ borderTop: '0.5px solid var(--border2)', padding: '8px 14px 12px' }}>
          <p style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>DETALLE</p>
          {subcats.map((sub, i) => {
            const subPct = sub.presupuesto > 0 ? Math.min(sub.gastado / sub.presupuesto, 1) : 0
            const subColor = subPct >= 1 ? 'var(--red)' : subPct >= 0.8 ? 'var(--amber)' : 'var(--text2)'
            return (
              <div key={sub.id || i} style={{ marginBottom: i < subcats.length - 1 ? 10 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>{sub.name}</span>
                    {sub.obs && <p style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{sub.obs}</p>}
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: subColor, fontVariantNumeric: 'tabular-nums' }}>
                      {maskLocal(mxnLocal(sub.gastado))}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>
                      / {maskLocal(mxnLocal(sub.presupuesto))}
                    </span>
                  </div>
                </div>
                <div style={{ height: 4, background: 'var(--border2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${subPct * 100}%`, background: subPct >= 1 ? '#E24B4A' : subPct >= 0.8 ? '#EF9F27' : category.color, borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
