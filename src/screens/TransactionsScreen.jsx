import { useState, useMemo } from 'react'
import { CATEGORIES } from '../data/budget.js'
import TransactionCard from '../components/TransactionCard.jsx'
import { usePrivacy } from '../context/PrivacyContext.jsx'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function TransactionsScreen({ transactions, onDelete }) {
  const [mesIdx, setMesIdx] = useState(new Date().getMonth())
  const [catFiltro, setCatFiltro] = useState('todos')
  const [tipoFiltro, setTipoFiltro] = useState('gastos')
  const { mask } = usePrivacy()
  const mxn = n => '$' + Math.round(n || 0).toLocaleString('es-MX')

  // Transacciones del mes seleccionado
  const delMes = useMemo(() =>
    transactions.filter(t => t && t.id && new Date(t.timestamp || t.createdAt).getMonth() === mesIdx)
  , [transactions, mesIdx])

  // Totales por categoría del mes
  const totalesPorCat = useMemo(() => {
    const map = {}
    delMes.filter(t => t.tipo !== 'ingreso').forEach(t => {
      map[t.categoriaId] = (map[t.categoriaId] || 0) + (t.monto || 0)
    })
    return map
  }, [delMes])

  const totalGastos = useMemo(() => delMes.filter(t => t.tipo !== 'ingreso').reduce((s,t) => s+(t.monto||0), 0), [delMes])
  const totalIngresos = useMemo(() => delMes.filter(t => t.tipo === 'ingreso').reduce((s,t) => s+(t.monto||0), 0), [delMes])

  // Filtradas para mostrar
  const filtradas = useMemo(() => {
    return delMes.filter(t => {
      if (tipoFiltro === 'gastos' && t.tipo === 'ingreso') return false
      if (tipoFiltro === 'ingresos' && t.tipo !== 'ingreso') return false
      if (catFiltro !== 'todos' && t.categoriaId !== catFiltro) return false
      return true
    }).sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
  }, [delMes, catFiltro, tipoFiltro])

  // Agrupar por fecha
  const agrupadas = useMemo(() => {
    const grupos = {}
    filtradas.forEach(t => {
      const d = new Date(t.timestamp || t.createdAt)
      const key = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
      if (!grupos[key]) grupos[key] = { label: key, txs: [], total: 0 }
      grupos[key].txs.push(t)
      grupos[key].total += t.monto || 0
    })
    return Object.values(grupos)
  }, [filtradas])

  // Info de la categoría seleccionada
  const catSeleccionada = catFiltro !== 'todos' ? CATEGORIES.find(c => c.id === catFiltro) : null
  const totalFiltrado = filtradas.reduce((s, t) => s + (t.monto || 0), 0)

  return (
    <div className="screen" style={{ padding: '20px 16px 80px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Gastos</h2>

      {/* Filtro mes */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4, scrollbarWidth: 'none' }}>
        {MESES.map((m, i) => (
          <button key={i} onClick={() => { setMesIdx(i); setCatFiltro('todos') }}
            style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: mesIdx === i ? 'var(--gold)' : 'var(--card)', color: mesIdx === i ? 'var(--bg)' : 'var(--text3)', fontSize: 13, fontWeight: mesIdx === i ? 600 : 400 }}>
            {m}
          </button>
        ))}
      </div>

      {/* Toggle gastos/ingresos */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--card)', borderRadius: 10, padding: 3, marginBottom: 12 }}>
        {[['gastos','💸 Gastos'],['ingresos','💰 Ingresos'],['todos','Todos']].map(([val, label]) => (
          <button key={val} onClick={() => { setTipoFiltro(val); setCatFiltro('todos') }}
            style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: tipoFiltro === val ? 'var(--card2)' : 'transparent', color: tipoFiltro === val ? 'var(--gold)' : 'var(--text3)', fontSize: 12, fontWeight: 500 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Resumen del mes */}
      <div style={{ display: 'grid', gridTemplateColumns: totalIngresos > 0 ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'var(--red-bg)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontSize: 9, color: 'var(--red)', marginBottom: 2 }}>GASTOS {MESES[mesIdx].toUpperCase()}</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{mask(mxn(totalGastos))}</p>
        </div>
        {totalIngresos > 0 && (
          <div style={{ background: 'var(--green-bg)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 9, color: 'var(--teal)', marginBottom: 2 }}>INGRESOS {MESES[mesIdx].toUpperCase()}</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--teal)', fontVariantNumeric: 'tabular-nums' }}>{mask(mxn(totalIngresos))}</p>
          </div>
        )}
      </div>

      {/* Filtro categoría */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: catSeleccionada ? 8 : 16, paddingBottom: 4, scrollbarWidth: 'none' }}>
        <button onClick={() => setCatFiltro('todos')}
          style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 16, border: '0.5px solid ' + (catFiltro === 'todos' ? 'var(--gold-dim)' : 'var(--border2)'), cursor: 'pointer', background: catFiltro === 'todos' ? 'var(--gold-bg)' : 'var(--card)', color: catFiltro === 'todos' ? 'var(--gold)' : 'var(--text3)', fontSize: 12 }}>
          Todos
        </button>
        {CATEGORIES.map(cat => {
          const total = totalesPorCat[cat.id] || 0
          if (tipoFiltro === 'ingresos' && total === 0) return null
          return (
            <button key={cat.id} onClick={() => setCatFiltro(cat.id)}
              style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 16, border: '0.5px solid ' + (catFiltro === cat.id ? cat.color + '80' : 'var(--border2)'), cursor: 'pointer', background: catFiltro === cat.id ? cat.color + '20' : 'var(--card)', color: catFiltro === cat.id ? cat.color : 'var(--text3)', fontSize: 12 }}>
              {cat.icon} {cat.name}
            </button>
          )
        })}
      </div>

      {/* Total de categoría seleccionada */}
      {catSeleccionada && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: catSeleccionada.color + '15', border: '0.5px solid ' + catSeleccionada.color + '40', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{catSeleccionada.icon}</span>
            <div>
              <p style={{ fontSize: 11, color: catSeleccionada.color, fontWeight: 600 }}>{catSeleccionada.name}</p>
              <p style={{ fontSize: 10, color: 'var(--text3)' }}>{filtradas.length} movimiento{filtradas.length !== 1 ? 's' : ''} en {MESES[mesIdx]}</p>
            </div>
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: catSeleccionada.color, fontVariantNumeric: 'tabular-nums' }}>{mask(mxn(totalFiltrado))}</p>
        </div>
      )}

      {/* Lista agrupada */}
      {agrupadas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 14 }}>
          Sin movimientos en {MESES[mesIdx]}
        </div>
      ) : (
        agrupadas.map(grupo => (
          <div key={grupo.label} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{grupo.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{mask(mxn(grupo.total))}</span>
            </div>
            {grupo.txs.map(t => (
              <TransactionCard key={t.id} tx={t} onDelete={onDelete} />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
