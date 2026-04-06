import { useState, useMemo } from 'react'
import SemaphoreCard from '../components/SemaphoreCard.jsx'
import { CATEGORIES } from '../data/budget.js'
import { usePrivacy } from '../context/PrivacyContext.jsx'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function parseYearMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return { year: y, month: m - 1 }
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getQuincenaActual() { return new Date().getDate() <= 15 ? 1 : 2 }

function calcularTotalQ(quincena, cat, budgets) {
  if (budgets && budgets[cat.id]) return quincena === 1 ? (budgets[cat.id].q1 || 0) : (budgets[cat.id].q2 || 0)
  return cat.subcategories.reduce((ss, sub) => {
    if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return ss
    return ss + (quincena === 1 ? (sub.q1 || 0) : (sub.q2 || 0))
  }, 0)
}

function calcularTotalMes(cat, budgets) {
  if (budgets && budgets[cat.id]) return (budgets[cat.id].q1 || 0) + (budgets[cat.id].q2 || 0)
  return cat.subcategories.reduce((ss, sub) => {
    if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return ss
    return ss + (sub.q1 || 0) + (sub.q2 || 0)
  }, 0)
}

const getQuincenaGastado = (transactions, catId, subId, quincena, mes, anio) =>
  transactions.filter(t => {
    if (t.tipo === 'ingreso') return false
    const d = new Date(t.timestamp || t.createdAt || t.created_at)
    const tQ = d.getDate() <= 15 ? 1 : 2
    return d.getFullYear() === anio && d.getMonth() === mes && tQ === quincena
      && t.categoriaId === catId && (!subId || t.subcategoriaId === subId)
  }).reduce((s, t) => s + (t.monto || 0), 0)

const getMesGastado = (transactions, catId, mes, anio) =>
  transactions.filter(t => {
    if (t.tipo === 'ingreso') return false
    const d = new Date(t.timestamp || t.createdAt || t.created_at)
    return d.getFullYear() === anio && d.getMonth() === mes && t.categoriaId === catId
  }).reduce((s, t) => s + (t.monto || 0), 0)

function getResumenSemanal(transactions) {
  const ahora = new Date()
  const hace7 = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
  const hace14 = new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000)
  const ultimos7 = transactions.filter(t => { if (t.tipo === 'ingreso') return false; return new Date(t.timestamp || t.createdAt || t.created_at) >= hace7 })
  const semanaAnterior = transactions.filter(t => { if (t.tipo === 'ingreso') return false; const d = new Date(t.timestamp || t.createdAt || t.created_at); return d >= hace14 && d < hace7 })
  const totalSemana = ultimos7.reduce((s, t) => s + (t.monto || 0), 0)
  const totalAnterior = semanaAnterior.reduce((s, t) => s + (t.monto || 0), 0)
  const porCat = {}
  ultimos7.forEach(t => { porCat[t.categoriaId] = (porCat[t.categoriaId] || 0) + (t.monto || 0) })
  const top3 = Object.entries(porCat).sort(([,a],[,b]) => b - a).slice(0, 3)
    .map(([id, monto]) => ({ id, monto, cat: CATEGORIES.find(c => c.id === id) })).filter(x => x.cat)
  return { totalSemana, totalAnterior, top3, count: ultimos7.length }
}

export default function DashboardScreen({ transactions, user, budgetOverrides, budgets = {}, subcategories = {}, selectedMonth, setSelectedMonth, logros = [], addLogro, deleteLogro, syncing, online }) {
  const [vista, setVista] = useState('quincenal')
  const [quincena, setQuincena] = useState(getQuincenaActual())
  const [showLogrosEditor, setShowLogrosEditor] = useState(false)
  const [nuevoLogro, setNuevoLogro] = useState('')
  const [expandSemanal, setExpandSemanal] = useState(false)
  const { mask } = usePrivacy()

  const { year: anio, month: mes } = useMemo(() => parseYearMonth(selectedMonth), [selectedMonth])
  const mesNombre = MESES[mes]
  const todayYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const esHoy = selectedMonth === todayYM

  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')
  const resumenSemanal = useMemo(() => getResumenSemanal(transactions), [transactions])

  const totalPresupuesto = useMemo(() =>
    CATEGORIES.reduce((s, cat) => s + (vista === 'quincenal' ? calcularTotalQ(quincena, cat, budgets) : calcularTotalMes(cat, budgets)), 0)
  , [quincena, vista, budgets])

  const { totalGastado, totalIngresos } = useMemo(() => {
    const filtrados = transactions.filter(t => {
      const d = new Date(t.timestamp || t.createdAt || t.created_at)
      if (d.getFullYear() !== anio || d.getMonth() !== mes) return false
      if (vista === 'quincenal') return (d.getDate() <= 15 ? 1 : 2) === quincena
      return true
    })
    return {
      totalGastado: filtrados.filter(t => t.tipo !== 'ingreso').reduce((s, t) => s + (t.monto || 0), 0),
      totalIngresos: filtrados.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + (t.monto || 0), 0),
    }
  }, [transactions, anio, mes, quincena, vista])

  const pctTotal = totalPresupuesto > 0 ? totalGastado / totalPresupuesto : 0
  const saldoReal = totalIngresos - totalGastado

  const handleAddLogro = async () => {
    if (!nuevoLogro.trim()) return
    await addLogro(nuevoLogro.trim())
    setNuevoLogro('')
  }

  return (
    <div className="screen" style={{ padding: '0 0 80px' }}>
      <div style={{ padding: '20px 20px 0' }}>

        {/* Header con navegación de meses */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>‹</button>
              <p style={{ fontSize: 12, color: esHoy ? 'var(--text3)' : 'var(--amber)', fontWeight: esHoy ? 400 : 600, minWidth: 110, textAlign: 'center' }}>
                {mesNombre} {anio}{!esHoy ? ' · planeando' : ''}
              </p>
              <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>›</button>
            </div>
            <h1 className="serif" style={{ fontSize: 26, color: 'var(--gold)', lineHeight: 1.1 }}>Home SD</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {syncing && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', animation: 'pulse 1s infinite' }} />}
            {!online && <div style={{ fontSize: 10, color: 'var(--red)', background: 'var(--red-bg)', padding: '2px 8px', borderRadius: 8 }}>Sin internet</div>}
            {user && (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: user.usuarioId === 'nayeli' ? 'rgba(93,202,165,0.2)' : 'rgba(223,202,143,0.2)', border: '1.5px solid ' + (user.usuarioId === 'nayeli' ? '#5DCAA5' : 'var(--gold)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: user.usuarioId === 'nayeli' ? '#5DCAA5' : 'var(--gold)' }}>
                {user.name?.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Toggle Quincenal / Mensual */}
        <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 12, padding: 4, marginBottom: 14, gap: 4 }}>
          {['quincenal', 'mensual'].map(v => (
            <button key={v} onClick={() => setVista(v)}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: vista === v ? 'var(--bg)' : 'transparent', color: vista === v ? 'var(--text)' : 'var(--text3)', fontSize: 13, fontWeight: vista === v ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize' }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Selector Q1 / Q2 */}
        {vista === 'quincenal' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[1, 2].map(q => (
              <button key={q} onClick={() => setQuincena(q)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: quincena === q ? '1.5px solid var(--gold)' : '0.5px solid var(--border)', background: quincena === q ? 'transparent' : 'var(--card)', color: quincena === q ? 'var(--gold)' : 'var(--text3)', fontSize: 12, fontWeight: quincena === q ? 700 : 400, cursor: 'pointer' }}>
                <div style={{ fontWeight: 700 }}>Q{q}</div>
                <div style={{ fontSize: 10, marginTop: 2 }}>Días {q === 1 ? '1-15' : '16-31'}</div>
              </button>
            ))}
          </div>
        )}

        {/* Card principal */}
        <div className="card-glass" style={{ padding: '18px 20px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{vista === 'quincenal' ? 'Gastado Q' + quincena : 'Gastado ' + mesNombre}</p>
              <p className="serif amount" style={{ fontSize: 32, color: 'var(--text)', lineHeight: 1 }}>{mask(mxn(totalGastado))}</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>de {mask(mxn(totalPresupuesto))} presupuestado</p>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: pctTotal >= 1 ? 'var(--red)' : pctTotal >= 0.8 ? 'var(--amber)' : 'var(--teal)' }}>
              {mask(Math.round(pctTotal * 100) + '%')}
            </div>
          </div>
          <div className="progress-track" style={{ marginTop: 14, height: 8 }}>
            <div className="progress-fill" style={{ width: Math.min(pctTotal * 100, 100) + '%', background: pctTotal >= 1 ? '#E24B4A' : pctTotal >= 0.8 ? '#EF9F27' : '#1D9E75' }} />
          </div>
          <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>Disponible: {mask(mxn(Math.max(totalPresupuesto - totalGastado, 0)))}</p>
        </div>

        {/* Ingresos / Gastos / Saldo */}
        {totalIngresos > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            {[
              { label: 'INGRESOS', value: mxn(totalIngresos), color: 'var(--teal)', bg: 'var(--green-bg)' },
              { label: 'GASTOS', value: mxn(totalGastado), color: 'var(--red)', bg: 'var(--red-bg)' },
              { label: 'SALDO', value: mxn(saldoReal), color: saldoReal >= 0 ? 'var(--teal)' : 'var(--red)', bg: saldoReal >= 0 ? 'var(--green-bg)' : 'var(--red-bg)' },
            ].map((item, i) => (
              <div key={i} style={{ background: item.bg, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: item.color, marginBottom: 2 }}>{item.label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{mask(item.value)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Resumen semanal — solo mes actual */}
        {esHoy && (
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }} onClick={() => setExpandSemanal(!expandSemanal)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>📅 Esta semana</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{mask(mxn(resumenSemanal.totalSemana))}</span>
                {resumenSemanal.totalAnterior > 0 && (
                  <span style={{ fontSize: 10, color: resumenSemanal.totalSemana <= resumenSemanal.totalAnterior ? 'var(--teal)' : 'var(--red)', background: resumenSemanal.totalSemana <= resumenSemanal.totalAnterior ? 'var(--green-bg)' : 'var(--red-bg)', padding: '2px 6px', borderRadius: 6 }}>
                    {resumenSemanal.totalSemana <= resumenSemanal.totalAnterior ? '↓' : '↑'} vs sem ant.
                  </span>
                )}
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>{expandSemanal ? '▲' : '▼'}</span>
              </div>
            </div>
            {expandSemanal && resumenSemanal.top3.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, marginBottom: 2 }}>TOP CATEGORÍAS</p>
                {resumenSemanal.top3.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{item.cat.icon}</span>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{item.cat.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: item.cat.color }}>{mask(mxn(item.monto))}</span>
                  </div>
                ))}
                <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{resumenSemanal.count} movimientos · semana anterior: {mask(mxn(resumenSemanal.totalAnterior))}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Categorías */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 4 }}>POR CATEGORÍA · toca para ver detalle</p>
        {CATEGORIES.map(cat => {
          const presupuesto = vista === 'quincenal' ? calcularTotalQ(quincena, cat, budgets) : calcularTotalMes(cat, budgets)
          if (presupuesto === 0) return null
          const gastado = vista === 'quincenal'
            ? getQuincenaGastado(transactions, cat.id, null, quincena, mes, anio)
            : getMesGastado(transactions, cat.id, mes, anio)

          const subcats = cat.subcategories
            .filter(sub => {
              if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return false
              const p = vista === 'quincenal' ? (quincena === 1 ? (sub.q1 || 0) : (sub.q2 || 0)) : ((sub.q1 || 0) + (sub.q2 || 0))
              return p > 0
            })
            .map(sub => {
              const p = vista === 'quincenal' ? (quincena === 1 ? (sub.q1 || 0) : (sub.q2 || 0)) : ((sub.q1 || 0) + (sub.q2 || 0))
              const g = vista === 'quincenal'
                ? getQuincenaGastado(transactions, cat.id, sub.id, quincena, mes, anio)
                : getMesGastado(transactions, cat.id, mes, anio)
              // Usar nombre dinámico si existe, sino el estático
              const nombre = subcategories[sub.id] || sub.name
              return { ...sub, name: nombre, presupuesto: p, gastado: g }
            })

          return (
            <SemaphoreCard
              key={cat.id}
              category={cat}
              gastado={gastado}
              presupuesto={presupuesto}
              subcats={subcats}
              mxn={mxn}
              mask={mask}
            />
          )
        })}
      </div>

      {/* Logros del mes */}
      <div style={{ margin: '8px 16px 0', padding: '12px 14px', background: 'var(--green-bg)', borderRadius: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: logros.length > 0 ? 8 : 0 }}>
          <p style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500 }}>🏆 Logros {mesNombre}</p>
          <button onClick={() => setShowLogrosEditor(!showLogrosEditor)}
            style={{ fontSize: 10, color: 'var(--teal)', background: 'transparent', border: '0.5px solid var(--teal)', padding: '2px 8px', borderRadius: 6, cursor: 'pointer' }}>
            {showLogrosEditor ? 'Cerrar' : '+ Agregar'}
          </button>
        </div>
        {logros.map(l => (
          <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <p style={{ fontSize: 11, color: 'var(--text2)' }}>✓ {l.texto}</p>
            {showLogrosEditor && (
              <button onClick={() => deleteLogro(l.id)} style={{ fontSize: 10, color: 'var(--red)', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            )}
          </div>
        ))}
        {logros.length === 0 && !showLogrosEditor && (
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>Sin logros registrados aún</p>
        )}
        {showLogrosEditor && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input value={nuevoLogro} onChange={e => setNuevoLogro(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddLogro()}
              placeholder="Ej: TC BBVA liquidada ✓"
              style={{ flex: 1, background: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text)', padding: '7px 10px', borderRadius: 8, fontSize: 12, outline: 'none' }} />
            <button onClick={handleAddLogro} style={{ background: 'var(--teal)', border: 'none', color: '#fff', padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓</button>
          </div>
        )}
      </div>
    </div>
  )
}
