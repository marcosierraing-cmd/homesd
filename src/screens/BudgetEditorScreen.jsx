import { useState, useMemo, useEffect } from 'react'
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

export default function BudgetEditorScreen({ budgets = {}, subcategories = {}, selectedMonth, setSelectedMonth, saveBudget, copyBudgetFromPrevMonth, saveSubcategoryName, copySubcategoriesFromPrevMonth }) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copying, setCopying] = useState(false)
  const [editingSubcat, setEditingSubcat] = useState(null) // subcategory_id en edición
  const [editingName, setEditingName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [tab, setTab] = useState('presupuesto') // 'presupuesto' | 'proveedores'

  const { year: anio, month: mes } = useMemo(() => parseYearMonth(selectedMonth), [selectedMonth])
  const mesNombre = MESES[mes]

  // Estado local de presupuesto
  const [localBudgets, setLocalBudgets] = useState({})

  useEffect(() => {
    const init = {}
    CATEGORIES.forEach(cat => {
      if (budgets[cat.id]) {
        init[cat.id] = { q1: budgets[cat.id].q1 || 0, q2: budgets[cat.id].q2 || 0 }
      } else {
        init[cat.id] = {
          q1: cat.subcategories.reduce((s, sub) => { if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return s; return s + (sub.q1 || 0) }, 0),
          q2: cat.subcategories.reduce((s, sub) => { if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return s; return s + (sub.q2 || 0) }, 0),
        }
      }
    })
    setLocalBudgets(init)
    setSaved(false)
  }, [budgets, selectedMonth])

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
    const okB = await copyBudgetFromPrevMonth(selectedMonth)
    const okS = await copySubcategoriesFromPrevMonth(selectedMonth)
    setCopying(false)
    if (!okB && !okS) alert('No hay datos guardados en el mes anterior.')
  }

  // Iniciar edición de nombre de subcategoría
  const startEditName = (sub, catId) => {
    setEditingSubcat({ id: sub.id, catId })
    setEditingName(subcategories[sub.id] || sub.name)
  }

  const saveEditName = async () => {
    if (!editingSubcat || !editingName.trim()) { setEditingSubcat(null); return }
    setSavingName(true)
    await saveSubcategoryName(selectedMonth, editingSubcat.id, editingSubcat.catId, editingName.trim())
    setSavingName(false)
    setEditingSubcat(null)
  }

  const totalQ1 = Object.values(localBudgets).reduce((s, b) => s + (b?.q1 || 0), 0)
  const totalQ2 = Object.values(localBudgets).reduce((s, b) => s + (b?.q2 || 0), 0)
  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

  return (
    <div className="screen" style={{ padding: '0 0 100px' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 12px', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Editor de Presupuesto</h1>
          {tab === 'presupuesto' ? (
            <button onClick={handleSaveAll} disabled={saving}
              style={{ background: saved ? 'transparent' : 'var(--teal)', border: saved ? '0.5px solid var(--teal)' : 'none', color: saved ? 'var(--teal)' : '#fff', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? '...' : saved ? '✓ Listo' : 'Guardar'}
            </button>
          ) : <div style={{ width: 60 }} />}
        </div>

        {/* Selector de mes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
          <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
            style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--gold)', minWidth: 130, textAlign: 'center' }}>{mesNombre} {anio}</span>
          <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
            style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>›</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 10, padding: 3, gap: 3 }}>
          {[{ k: 'presupuesto', l: '💰 Presupuesto' }, { k: 'proveedores', l: '🏷️ Proveedores' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: tab === t.k ? 'var(--bg)' : 'transparent', color: tab === t.k ? 'var(--text)' : 'var(--text3)', fontSize: 12, fontWeight: tab === t.k ? 600 : 400, cursor: 'pointer' }}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>

        {/* Botón copiar mes anterior */}
        <button onClick={handleCopy} disabled={copying}
          style={{ width: '100%', background: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text2)', padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginBottom: 16 }}>
          {copying ? 'Copiando...' : '📋 Copiar todo del mes anterior'}
        </button>

        {/* ── TAB PRESUPUESTO ── */}
        {tab === 'presupuesto' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 86px 86px', gap: 8, marginBottom: 8, padding: '0 4px' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>CATEGORÍA</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textAlign: 'center' }}>Q1 (1-15)</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textAlign: 'center' }}>Q2 (16-31)</div>
            </div>
            {CATEGORIES.map(cat => {
              const b = localBudgets[cat.id] || { q1: 0, q2: 0 }
              return (
                <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: '1fr 86px 86px', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{cat.icon}</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{cat.name}</span>
                  </div>
                  <input type="number" value={b.q1 || ''} onChange={e => handleChange(cat.id, 'q1', e.target.value)} placeholder="0"
                    style={{ background: 'var(--card)', border: '0.5px solid var(--border)', color: cat.color || 'var(--text)', padding: '8px 4px', borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'center', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
                  <input type="number" value={b.q2 || ''} onChange={e => handleChange(cat.id, 'q2', e.target.value)} placeholder="0"
                    style={{ background: 'var(--card)', border: '0.5px solid var(--border)', color: cat.color || 'var(--text)', padding: '8px 4px', borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'center', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )
            })}
            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 86px 86px', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>TOTAL</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', textAlign: 'center' }}>{mxn(totalQ1)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', textAlign: 'center' }}>{mxn(totalQ2)}</div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                Total mes: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{mxn(totalQ1 + totalQ2)}</span>
              </p>
            </div>
          </>
        )}

        {/* ── TAB PROVEEDORES ── */}
        {tab === 'proveedores' && (
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>
              Toca ✏️ para renombrar un proveedor para <span style={{ color: 'var(--gold)' }}>{mesNombre} {anio}</span>. No afecta otros meses.
            </p>
            {CATEGORIES.map(cat => {
              const subcatsEditables = cat.subcategories.filter(sub =>
                sub.type !== 'liquidado' && sub.type !== 'prepagado' && sub.type !== 'pendiente'
              )
              if (!subcatsEditables.length) return null
              return (
                <div key={cat.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: cat.color || 'var(--text2)' }}>{cat.name}</span>
                  </div>
                  {subcatsEditables.map(sub => {
                    const nombreActual = subcategories[sub.id] || sub.name
                    const esEditando = editingSubcat?.id === sub.id
                    return (
                      <div key={sub.id} style={{ background: 'var(--card)', border: `0.5px solid ${esEditando ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                        {esEditando ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEditName()}
                              autoFocus
                              style={{ flex: 1, background: 'var(--bg)', border: '0.5px solid var(--teal)', color: 'var(--text)', padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none' }}
                            />
                            <button onClick={saveEditName} disabled={savingName}
                              style={{ background: 'var(--teal)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              {savingName ? '...' : '✓'}
                            </button>
                            <button onClick={() => setEditingSubcat(null)}
                              style={{ background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--text3)', padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: nombreActual !== sub.name ? 600 : 400 }}>{nombreActual}</p>
                              {nombreActual !== sub.name && (
                                <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Original: {sub.name}</p>
                              )}
                            </div>
                            <button onClick={() => startEditName(sub, cat.id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 16, cursor: 'pointer', padding: '4px 8px' }}>
                              ✏️
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
