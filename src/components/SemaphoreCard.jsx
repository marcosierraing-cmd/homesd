export default function SemaphoreCard({ category, gastado, presupuesto, onClick }) {
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

  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

  return (
    <div onClick={onClick}
      style={{
        background: `linear-gradient(135deg, var(--card) 0%, ${bgTint} 100%)`,
        border: `0.5px solid rgba(255,255,255,0.06)`,
        borderLeft: `3px solid ${category.color}`,
        borderRadius: 12,
        padding: '12px 14px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{category.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{category.name}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: statusColor, fontVariantNumeric: 'tabular-nums' }}>
            {mxn(gastado)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>/ {mxn(presupuesto)}</span>
        </div>
      </div>

      <div className="progress-track">
        <div className="progress-fill"
          style={{
            width: `${pct * 100}%`,
            background: barColor,
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>
          {presupuesto > 0 ? `${mxn(presupuesto - gastado)} disponible` : 'Sin presupuesto asignado'}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: statusColor,
          background: bgTint,
          padding: '1px 6px',
          borderRadius: 10,
        }}>
          {pctDisplay}%
        </span>
      </div>
    </div>
  )
}
