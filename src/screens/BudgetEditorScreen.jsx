import { useState, useMemo } from 'react'
import { CATEGORIES } from '../data/budget.js'
import { mergeBudget } from '../utils/budgetMerge.js'
import { usePrivacy } from '../context/PrivacyContext.jsx'

const TIPOS = [
  { id: 'fijo', label: 'Fijo' },
  { id: 'variable', label: 'Variable' },
  { id: 'liquidado', label: 'Liquidado' },
  { id: 'prepagado', label: 'Prepagado' },
  { id: 'pendiente', label: 'Pendiente' },
]

const COLORES = [
  '#E24B4A', '#378ADD', '#7F77DD', '#1D9E75', '#EF9F27',
  '#D85A30', '#BA7517', '#888780', '#5DCAA5', '#AFA9EC',
  '#B5D4F4', '#5F5E5A', '#DFCA8F', '#FF6B9D', '#00BCD4',
]

const ICONOS = ['💳','📚','📡','🏠','🧹','🛒','🍽️','⛽','🏥','👥','👦','🔧','💰','🎯','✈️','🎓','💊','🐾','🎮','🛍️']

export default function BudgetEditorScreen({ budgetOverrides = {}, onUpdateBudgetOverride }) {
  const { mask } = usePrivacy()
  const [catSeleccionada, setCatSeleccionada] = useState(null)
  const [editandoSub, setEditandoSub] = useState(null) // { catId, subId, isNew }
  const [formSub, setFormSub] = useState({})
  const [agregandoCat, setAgregandoCat] = useState(false)
  const [formCat, setFormCat] = useState({ name: '', icon: '💰', color: '#DFCA8F' })
  const [guardando, setGuardando] = useState(false)

  const categories = useMemo(() => mergeBudget(budgetOverrides), [budgetOverrides])
  const mxn = n => '$' + Math.round(n || 0).toLocaleString('es-MX')

  // ── Guardar override de subcategoría ──────────────────────────────────────
  const guardarSub = async () => {
    setGuardando(true)
    const { catId, subId, isNew } = editandoSub

    if (isNew) {
      const newSub = {
        id: `custom_${Date.now()}`,
        name: formSub.name || 'Nueva subcategoría',
        q1: parseFloat(formSub.q1) || 0,
        q2: parseFloat(formSub.q2) || 0,
        type: formSub.type || 'variable',
        obs: formSub.obs || '',
        day: 0,
      }
      const existing = budgetOverrides.newSubcategories?.[catId] || []
      await onUpdateBudgetOverride('newSubcategories', {
        ...budgetOverrides.newSubcategories,
        [catId]: [...existing, newSub],
      })
    } else {
      await onUpdateBudgetOverride('subcategories', {
        ...budgetOverrides.subcategories,
        [subId]: {
          name: formSub.name,
          q1: parseFloat(formSub.q1) || 0,
          q2: parseFloat(formSub.q2) || 0,
          type: formSub.type,
          obs: formSub.obs || '',
        },
      })
    }

    setEditandoSub(null)
    setFormSub({})
    setGuardando(false)
  }

  // ── Ocultar subcategoría ──────────────────────────────────────────────────
  const ocultarSub = async (subId) => {
    const hidden = budgetOverrides.hiddenSubcategories || []
    await onUpdateBudgetOverride('hiddenSubcategories', [...hidden, subId])
  }

  // ── Guardar categoría nueva ───────────────────────────────────────────────
  const guardarCat = async () => {
    if (!formCat.name) return
    setGuardando(true)
    const newCat = {
      id: `cat_${Date.now()}`,
      name: formCat.name,
      icon: formCat.icon,
      color: formCat.color,
      subcategories: [],
    }
    await onUpdateBudgetOverride('newCategories', [
      ...(budgetOverrides.newCategories || []),
      newCat,
    ])
    setAgregandoCat(false)
    setFormCat({ name: '', icon: '💰', color: '#DFCA8F' })
    setGuardando(false)
  }

  // ── Abrir editor de subcategoría ──────────────────────────────────────────
  const abrirEditor = (catId, sub, isNew = false) => {
    setEditandoSub({ catId, subId: sub?.id, isNew })
    setFormSub(isNew
      ? { name: '', q1: '', q2: '', type: 'variable', obs: '' }
      : {
          name: sub.name,
          q1: String(sub.q1 || 0),
          q2: String(sub.q2 || 0),
          type: sub.type || 'variable',
          obs: sub.obs || '',
        }
    )
  }

  // ── Modal editor de subcategoría ──────────────────────────────────────────
  if (editandoSub) {
    const cat = categories.find(c => c.id === editandoSub.catId)
    return (
      <div className="screen" style={{ padding: '20px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setEditandoSub(null)}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 20, cursor: 'pointer' }}>
            ←
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>
            {editandoSub.isNew ? 'Nueva subcategoría' : 'Editar subcategoría'}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>NOMBRE</label>
            <input className="input" value={formSub.name}
              onChange={e => setFormSub(f => ({ ...f, name: e.target.value }))}
              placeholder="Nombre de la subcategoría" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>
                Q1 (días 1-15)
              </label>
              <input className="input" type="number" inputMode="decimal"
                value={formSub.q1}
                onChange={e => setFormSub(f => ({ ...f, q1: e.target.value }))}
                placeholder="0" style={{ textAlign: 'center', fontSize: 18, fontWeight: 600 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>
                Q2 (días 16-31)
              </label>
              <input className="input" type="number" inputMode="decimal"
                value={formSub.q2}
                onChange={e => setFormSub(f => ({ ...f, q2: e.target.value }))}
                placeholder="0" style={{ textAlign: 'center', fontSize: 18, fontWeight: 600 }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>TIPO</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TIPOS.map(t => (
                <button key={t.id} onClick={() => setFormSub(f => ({ ...f, type: t.id }))}
                  style={{
                    padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    border: `0.5px solid ${formSub.type === t.id ? 'var(--gold-dim)' : 'var(--border2)'}`,
                    background: formSub.type === t.id ? 'var(--gold-bg)' : 'var(--card)',
                    color: formSub.type === t.id ? 'var(--gold)' : 'var(--text3)',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>NOTAS</label>
            <input className="input" value={formSub.obs}
              onChange={e => setFormSub(f => ({ ...f, obs: e.target.value }))}
              placeholder="Observaciones opcionales" />
          </div>

          <div style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>RESUMEN MENSUAL</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gold)' }}>
              {mask(mxn((parseFloat(formSub.q1) || 0) + (parseFloat(formSub.q2) || 0)))} / mes
            </p>
          </div>

          <button className="btn btn-primary" onClick={guardarSub} disabled={guardando}
            style={{ width: '100%', marginTop: 8 }}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button className="btn btn-ghost" onClick={() => setEditandoSub(null)}
            style={{ width: '100%' }}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // ── Vista de subcategorías de una categoría ───────────────────────────────
  if (catSeleccionada) {
    const cat = categories.find(c => c.id === catSeleccionada)
    if (!cat) { setCatSeleccionada(null); return null }

    return (
      <div className="screen" style={{ padding: '20px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setCatSeleccionada(null)}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 20, cursor: 'pointer' }}>
            ←
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>{cat.icon}</span>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: cat.color }}>{cat.name}</h2>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cat.subcategories.map(sub => {
            const mensual = (sub.q1 || 0) + (sub.q2 || 0)
            const isInactive = sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente'
            return (
              <div key={sub.id} style={{
                background: 'var(--card)',
                borderRadius: 12,
                padding: '12px 14px',
                border: `0.5px solid ${isInactive ? 'var(--border2)' : cat.color + '40'}`,
                opacity: isInactive ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{sub.name}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 6,
                        background: `${cat.color}20`, color: cat.color,
                      }}>{sub.type}</span>
                      {!isInactive && (
                        <>
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                            Q1: {mask(mxn(sub.q1))}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                            Q2: {mask(mxn(sub.q2))}
                          </span>
                        </>
                      )}
                    </div>
                    {sub.obs ? (
                      <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{sub.obs}</p>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    {!isInactive && (
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                        {mask(mxn(mensual))}
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => abrirEditor(cat.id, sub)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                          border: '0.5px solid var(--gold-dim)', background: 'var(--gold-bg)', color: 'var(--gold)',
                        }}>
                        Editar
                      </button>
                      <button onClick={() => ocultarSub(sub.id)}
                        style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                          border: '0.5px solid var(--border2)', background: 'var(--card)', color: 'var(--text3)',
                        }}>
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Agregar subcategoría */}
          <button onClick={() => abrirEditor(cat.id, null, true)}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer',
              border: `1px dashed ${cat.color}60`,
              background: `${cat.color}08`,
              color: cat.color, fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            + Agregar subcategoría
          </button>
        </div>
      </div>
    )
  }

  // ── Vista principal — lista de categorías ─────────────────────────────────
  return (
    <div className="screen" style={{ padding: '20px 20px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600 }}>Editor de presupuesto</h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Toca una categoría para editar
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {categories.map(cat => {
          const totalCat = cat.subcategories
            .filter(s => s.type !== 'liquidado' && s.type !== 'prepagado' && s.type !== 'pendiente')
            .reduce((s, sub) => s + (sub.q1 || 0) + (sub.q2 || 0), 0)

          return (
            <button key={cat.id} onClick={() => setCatSeleccionada(cat.id)}
              style={{
                width: '100%', background: 'var(--card)',
                border: `0.5px solid ${cat.color}40`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${cat.color}20`,
                border: `1.5px solid ${cat.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>
                {cat.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: cat.color }}>{cat.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {cat.subcategories.length} subcategorías
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                  {mask(mxn(totalCat))}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text3)' }}>/mes</p>
              </div>
            </button>
          )
        })}

        {/* Agregar categoría nueva */}
        {!agregandoCat ? (
          <button onClick={() => setAgregandoCat(true)}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, cursor: 'pointer',
              border: '1px dashed var(--border)',
              background: 'transparent',
              color: 'var(--text3)', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            + Nueva categoría
          </button>
        ) : (
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Nueva categoría</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input" value={formCat.name}
                onChange={e => setFormCat(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre de la categoría" />

              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>ÍCONO</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ICONOS.map(ic => (
                    <button key={ic} onClick={() => setFormCat(f => ({ ...f, icon: ic }))}
                      style={{
                        width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer',
                        border: `1.5px solid ${formCat.icon === ic ? 'var(--gold)' : 'var(--border2)'}`,
                        background: formCat.icon === ic ? 'var(--gold-bg)' : 'var(--card)',
                      }}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>COLOR</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {COLORES.map(c => (
                    <button key={c} onClick={() => setFormCat(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: `2.5px solid ${formCat.color === c ? 'white' : 'transparent'}`,
                        boxShadow: formCat.color === c ? `0 0 0 2px ${c}` : 'none',
                      }} />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setAgregandoCat(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={guardarCat} disabled={guardando || !formCat.name}
                  style={{ flex: 2 }}>
                  {guardando ? 'Guardando...' : 'Crear categoría'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
