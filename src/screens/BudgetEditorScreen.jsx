import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/budget.js'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function parseYearMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return { year: y, month: m - 1 }
}

export default function BudgetEditorScreen({ budgets = {}, selectedMonth, setSelectedMonth, saveBudget, copyBudgetFromPrevMonth }) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copying, setCopying] = useState(false)

  const { year: anio, month: mes } = useMemo(() => parseYearMonth(selectedMonth), [selectedMonth])
  const mesNombre = MESES[mes]

  // Estado local de edición — inicializar con budgets actuales o fallback a CATEGORIES
  const [localBudgets, setLocalBudgets] = useState(() => {
    const init = {}
    CATEGORIES.forEach(cat => {
      if (budgets[cat.id]) {
        init[cat.id] = { q1: budgets[cat.id].q1 || 0, q2: budgets[cat.id].q2 || 0 }
      } else {
        // Fallback: sumar subcategorías del estático
        const q1 = cat.subcategories.reduce((s, sub) => {
          if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return s
          return s + (sub.q1 || 0)
        }, 0)
        const q2 = cat.subcategories.reduce((s, sub) => {
          if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return s
          return s + (sub.q2 || 0)
        }, 0)
        init[cat.id] = { q1, q2 }
      }
    })
    return init
  })

  // Recalcular cuando cambia selectedMonth
  useMemo(() => {
    const init = {}
    CATEGORIES.forEach(cat => {
      if (budgets[cat.id]) {
        init[cat.id] = { q1: budgets[cat.id].q1 || 0, q2: budgets[cat.id].q2 || 0 }
      } else {
        const q1 = cat.subcategories.reduce((s, sub) => { if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return s; return s + (sub.q1 || 0) }, 0)
        const q2 = cat.subcategories.reduce((s, sub) => { if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return s; return s + (sub.q2 || 0) }, 0)
        init[cat.id] = { q1, q2 }
      }
    })
    setLocalBudgets(init)
  }, [budgets])

  const handleChange = (catId, q, value) => {
    setLocalBudgets(prev => ({ ...prev, [catId]: { ...prev[catId], [q]: Number(value) || 0 } }))
    setSaved(false)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    for (const cat of CATEGORIES) {
      const b = localBudgets[cat.id] || { q1: 0, q2: 0 }
      await saveBudget(selectedMonth, cat.id, b.q1, b.q2)
    }
    setSaving(false)
    setSaved(true)
  }

  const handleCopy = async () => {
    setCopying(true)
    const ok = await copyBudgetFromPrevMonth(selectedMonth)
    setCopying(false)
    if (!ok) alert('No hay presupuesto guardado en el mes anterior.')
  }

  const totalQ1 = Object.values(localBudgets).reduce((s, b) => s + (b.q1 || 0), 0)
  const totalQ2 = Object.values(localBudgets).reduce((s, b) => s + (b.q2 || 0), 0)
  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

  return (
    <div className="screen" style={{ padding: '0 0 100px' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 12px', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Presupuesto por mes</h1>
          <button onClick={handleSaveAll} disabled={saving}
            style={{ background: saved ? 'transparent' : 'var(--teal)', border: saved ? '0.5px solid var(--teal)' : 'none', color: saved ? 'var(--teal)' : '#fff', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>

        {/* Selector de mes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
            style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--gold)', minWidth: 120, textAlign: 'center' }}>{mesNombre} {anio}</span>
          <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
            style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>›</button>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>

        {/* Botón copiar mes anterior */}
        <button onClick={handleCopy} disabled={copying}
          style={{ width: '100%', background: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text2)', padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginBottom: 16 }}>
          {copying ? 'Copiando...' : '📋 Copiar presupuesto del mes anterior'}
        </button>

        {/* Headers de columnas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8, marginBottom: 8, padding: '0 4px' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>CATEGORÍA</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textAlign: 'center' }}>Q1 (1-15)</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textAlign: 'center' }}>Q2 (16-31)</div>
        </div>

        {/* Filas por categoría */}
        {CATEGORIES.map(cat => {
          const b = localBudgets[cat.id] || { q1: 0, q2: 0 }
          return (
            <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{cat.name}</span>
              </div>
              <input
                type="number"
                value={b.q1 || ''}
                onChange={e => handleChange(cat.id, 'q1', e.target.value)}
                placeholder="0"
                style={{ background: 'var(--card)', border: '0.5px solid var(--border)', color: cat.color || 'var(--text)', padding: '8px 6px', borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'center', width: '100%', outline: 'none', boxSizing: 'border-box' }}
              />
              <input
                type="number"
                value={b.q2 || ''}
                onChange={e => handleChange(cat.id, 'q2', e.target.value)}
                placeholder="0"
                style={{ background: 'var(--card)', border: '0.5px solid var(--border)', color: cat.color || 'var(--text)', padding: '8px 6px', borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'center', width: '100%', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )
        })}

        {/* Totales */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>TOTAL</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', textAlign: 'center' }}>{mxn(totalQ1)}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', textAlign: 'center' }}>{mxn(totalQ2)}</div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
            Total mes: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{mxn(totalQ1 + totalQ2)}</span>
          </p>
        </div>

      </div>
    </div>
  )
}
