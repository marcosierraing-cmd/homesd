import { useState, useMemo } from 'react'
import SemaphoreCard from '../components/SemaphoreCard.jsx'
import { CATEGORIES, INGRESO_QUINCENAL, getMesActual, getQuincenaActual, calcularTotalQ } from '../data/budget.js'
import { getQuincenaGastado, getMesGastado } from '../hooks/useStorage.js'
import { usePrivacy } from '../context/PrivacyContext.jsx'

export default function DashboardScreen({ transactions, user }) {
  const [vista, setVista] = useState('quincenal')
  const [quincena, setQuincena] = useState(getQuincenaActual())
  const { mask } = usePrivacy()
  const mes = new Date().getMonth()
  const mesNombre = getMesActual()
  const totalPresupuesto = useMemo(() => calcularTotalQ(quincena), [quincena])
  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

  const totalGastado = useMemo(() => {
    return transactions
      .filter(t => {
        const d = new Date(t.timestamp || t.createdAt)
        const tQ = d.getDate() <= 15 ? 1 : 2
        return d.getMonth() === mes && tQ === quincena
      })
      .reduce((s, t) => s + (t.monto || 0), 0)
  }, [transactions, mes, quincena])

  const pctTotal = totalPresupuesto > 0 ? totalGastado / totalPresupuesto : 0

  return (
    <div className="screen" style={{ padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 0',
        background: 'linear-gradient(180deg, var(--surface) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>
              {mesNombre} 2026
            </p>
            <h1 className="serif" style={{ fontSize: 26, color: 'var(--gold)', lineHeight: 1.1 }}>
              Home SD
            </h1>
          </div>
          {user && (
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: user.usuarioId === 'nayeli' ? 'rgba(93,202,165,0.2)' : 'rgba(223,202,143,0.2)',
              border: `1.5px solid ${user.usuarioId === 'nayeli' ? '#5DCAA5' : 'var(--gold)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600,
              color: user.usuarioId === 'nayeli' ? '#5DCAA5' : 'var(--gold)',
            }}>
              {user.name?.charAt(0)}
            </div>
          )}
        </div>

        {/* Vista toggle */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'var(--card)',
          borderRadius: 10, padding: 3,
          marginBottom: 16,
        }}>
          {['quincenal', 'mensual'].map(v => (
            <button key={v} onClick={() => setVista(v)}
              style={{
                flex: 1, padding: '8px 0',
                borderRadius: 8, border: 'none', cursor: 'pointer',
                background: vista === v ? 'var(--card2)' : 'transparent',
                color: vista === v ? 'var(--gold)' : 'var(--text3)',
                fontSize: 13, fontWeight: 500,
                transition: 'all 0.2s ease',
              }}>
              {v === 'quincenal' ? 'Quincenal' : 'Mensual'}
            </button>
          ))}
        </div>

        {vista === 'quincenal' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[1, 2].map(q => (
              <button key={q} onClick={() => setQuincena(q)}
                style={{
                  flex: 1, padding: '10px 0',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: quincena === q ? 'var(--gold-bg)' : 'var(--card)',
                  borderWidth: quincena === q ? 1 : 0.5,
                  borderStyle: 'solid',
                  borderColor: quincena === q ? 'var(--gold-dim)' : 'var(--border2)',
                  transition: 'all 0.2s ease',
                }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: quincena === q ? 'var(--gold)' : 'var(--text2)' }}>
                  Q{q}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                  {q === 1 ? 'Días 1-15' : 'Días 16-31'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)' }}>
                  {q === 1 ? 'nóm. 28 ant.' : 'nóm. 14 cte.'}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Big summary card */}
        <div className="card-glass" style={{ padding: '18px 20px', marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
                {vista === 'quincenal' ? `Gastado Q${quincena}` : 'Gastado este mes'}
              </p>
              <p className="serif amount" style={{ fontSize: 32, color: 'var(--text)', lineHeight: 1 }}>
                {mask(mxn(totalGastado))}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                de {mask(mxn(totalPresupuesto))} presupuestado
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 22, fontWeight: 700,
                color: pctTotal >= 1 ? 'var(--red)' : pctTotal >= 0.8 ? 'var(--amber)' : 'var(--teal)',
              }}>
                {mask(`${Math.round(pctTotal * 100)}%`)}
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: pctTotal >= 1 ? 'var(--red)' : pctTotal >= 0.8 ? 'var(--amber)' : 'var(--teal)',
                marginLeft: 'auto', marginTop: 4,
                boxShadow: `0 0 8px ${pctTotal >= 1 ? 'var(--red)' : pctTotal >= 0.8 ? 'var(--amber)' : 'var(--teal)'}`,
              }} />
            </div>
          </div>
          <div className="progress-track" style={{ marginTop: 14, height: 8 }}>
            <div className="progress-fill" style={{
              width: `${Math.min(pctTotal * 100, 100)}%`,
              background: pctTotal >= 1 ? '#E24B4A' : pctTotal >= 0.8 ? '#EF9F27' : '#1D9E75',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              Disponible: {mask(mxn(Math.max(totalPresupuesto - totalGastado, 0)))}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              Ingresos: {mask(mxn(INGRESO_QUINCENAL))}
            </span>
          </div>
        </div>
      </div>

      {/* Category semaphores */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 4 }}>
          POR CATEGORÍA
        </p>
        {CATEGORIES.map(cat => {
          let presupuesto = 0
          cat.subcategories.forEach(sub => {
            if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return
            presupuesto += vista === 'quincenal'
              ? (quincena === 1 ? sub.q1 : sub.q2)
              : (sub.q1 + sub.q2)
          })
          if (presupuesto === 0) return null
          const gastado = vista === 'quincenal'
            ? getQuincenaGastado(transactions, cat.id, null, quincena, mes)
            : getMesGastado(transactions, cat.id, mes)
          return (
            <SemaphoreCard
              key={cat.id}
              category={cat}
              gastado={gastado}
              presupuesto={presupuesto}
            />
          )
        })}
      </div>

      {/* Logros */}
      <div style={{ margin: '8px 16px 0', padding: '12px 14px', background: 'var(--green-bg)', borderRadius: 10 }}>
        <p style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500, marginBottom: 4 }}>
          Logros de marzo 2026
        </p>
        <p style={{ fontSize: 11, color: 'var(--text2)' }}>
          TC BBVA *2251 liquidada ✓ · Renta abr-may-jun prepagada ✓
        </p>
      </div>
    </div>
  )
}
