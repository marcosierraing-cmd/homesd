import { useState, useRef, useMemo } from 'react'
import { CATEGORIES, CUENTAS, USUARIOS, autoAsignar } from '../data/budget.js'
import { useNavigate } from 'react-router-dom'
import { usePrivacy } from '../context/PrivacyContext.jsx'

// Fecha de hoy en formato YYYY-MM-DD usando zona local
function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Calcular frecuentes automáticos del historial
function calcularFrecuentes(transactions) {
  if (!transactions?.length) return []
  const hace60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  const recientes = transactions.filter(t => {
    if (t.tipo === 'ingreso') return false
    const d = new Date(t.timestamp || t.createdAt || t.created_at)
    return d >= hace60
  })
  if (!recientes.length) return []

  // Agrupar por subcategoriaId (si existe) o descripcion normalizada
  const grupos = {}
  recientes.forEach(t => {
    const key = t.subcategoriaId || t.subcategoria_id || t.descripcion?.toLowerCase().trim() || 'otro'
    if (!grupos[key]) grupos[key] = { montos: [], categoriaId: t.categoriaId || t.categoria_id, subcategoriaId: t.subcategoriaId || t.subcategoria_id, descripcion: t.descripcion, count: 0 }
    grupos[key].montos.push(t.monto || 0)
    grupos[key].count++
  })

  return Object.entries(grupos)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 4)
    .map(([key, g]) => {
      // Promedio de últimas 3 ocurrencias
      const ultimas3 = g.montos.slice(-3)
      const monto = Math.round(ultimas3.reduce((s, m) => s + m, 0) / ultimas3.length)
      // Buscar nombre en CATEGORIES
      let label = g.descripcion || key
      if (g.subcategoriaId) {
        for (const cat of CATEGORIES) {
          const sub = cat.subcategories.find(s => s.id === g.subcategoriaId)
          if (sub) { label = sub.name; break }
        }
      }
      // Emoji de la categoría
      const cat = CATEGORIES.find(c => c.id === g.categoriaId)
      const emoji = cat?.icon || '💸'
      return {
        label: `${emoji} ${label.split(' — ')[0].split(' (')[0]}`, // nombre corto
        monto,
        categoriaId: g.categoriaId,
        subcategoriaId: g.subcategoriaId,
        descripcion: g.descripcion || label,
      }
    })
    .filter(f => f.monto > 0)
}

export default function CaptureScreen({ onAdd, user, transactions = [] }) {
  const navigate = useNavigate()
  const { hidden, toggle } = usePrivacy()
  const cameraRef = useRef()
  const galleryRef = useRef()
  const [tipo, setTipo] = useState('gasto')
  const [modo, setModo] = useState('manual')
  const [step, setStep] = useState('idle')
  const [imageData, setImageData] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)
  const [showUndo, setShowUndo] = useState(false)
  const [duplicado, setDuplicado] = useState(null) // transacción duplicada detectada
  const [form, setForm] = useState({
    monto: '',
    descripcion: '',
    categoriaId: '',
    subcategoriaId: '',
    cuentaId: 'nu',
    usuarioId: user?.usuarioId || 'marco',
    nota: '',
    fecha: todayLocal(), // ← campo fecha
  })
  const [error, setError] = useState('')
  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

  // Frecuentes automáticos
  const frecuentes = useMemo(() => calcularFrecuentes(transactions), [transactions])

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setImageData(ev.target.result); setStep('preview') }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const processWithClaude = async () => {
    setStep('processing')
    setError('')
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, tipo: modo })
      })
      if (!response.ok) throw new Error('Error al procesar')
      const data = await response.json()
      const autocat = autoAsignar(data.descripcion || data.comercio)
      setExtracted(data)
      setForm(prev => ({
        ...prev,
        monto: String(data.monto || ''),
        descripcion: data.descripcion || data.comercio || '',
        categoriaId: autocat?.categoria || '',
        subcategoriaId: autocat?.subcategoria || '',
        fecha: data.fecha || todayLocal(), // ← IA llena la fecha si la detecta
      }))
      setStep('confirm')
    } catch {
      setError('No se pudo procesar la imagen. Completa manualmente.')
      setStep('confirm')
    }
  }

  const applyFrecuente = (f) => {
    setForm(prev => ({
      ...prev,
      monto: String(f.monto),
      descripcion: f.descripcion,
      categoriaId: f.categoriaId,
      subcategoriaId: f.subcategoriaId,
    }))
    setStep('confirm')
  }

  // Detectar duplicado por fecha exacta + monto ±2% + misma categoría
  const detectarDuplicado = () => {
    if (!form.monto || !form.categoriaId || !form.fecha) return null
    const monto = parseFloat(form.monto)
    return transactions.find(t => {
      if (t.tipo === 'ingreso') return false
      const tFecha = new Date(t.timestamp || t.createdAt || t.created_at)
      const tFechaStr = `${tFecha.getFullYear()}-${String(tFecha.getMonth() + 1).padStart(2, '0')}-${String(tFecha.getDate()).padStart(2, '0')}`
      if (tFechaStr !== form.fecha) return false
      if ((t.categoriaId || t.categoria_id) !== form.categoriaId) return false
      const tMonto = t.monto || 0
      return Math.abs(tMonto - monto) / Math.max(tMonto, monto) <= 0.02
    }) || null
  }

  const handleSave = async (forzar = false) => {
    if (!form.monto || isNaN(parseFloat(form.monto))) { setError('El monto es requerido'); return }
    if (tipo === 'gasto' && !form.categoriaId) { setError('Selecciona una categoría'); return }

    // Verificar duplicado (solo si no se forzó)
    if (!forzar) {
      const dup = detectarDuplicado()
      if (dup) { setDuplicado(dup); return }
    }

    setDuplicado(null)
    setStep('saving')

    // Construir timestamp con la fecha elegida en zona local
    const [y, m, d] = form.fecha.split('-').map(Number)
    const timestampFecha = new Date(y, m - 1, d, 12, 0, 0).toISOString()

    const transaction = {
      ...form,
      tipo,
      monto: parseFloat(form.monto),
      imagen: imageData,
      modoCaptura: modo,
      timestamp: timestampFecha, // ← usa la fecha elegida
    }
    const saved = await onAdd(transaction)
    setLastSaved(saved)
    setShowUndo(true)
    setTimeout(() => setShowUndo(false), 4000)
    setTimeout(() => navigate('/dashboard'), 1200)
  }

  const reset = () => {
    setStep('idle')
    setImageData(null)
    setExtracted(null)
    setDuplicado(null)
    setForm({ monto: '', descripcion: '', categoriaId: '', subcategoriaId: '', cuentaId: 'nu', usuarioId: user?.usuarioId || 'marco', nota: '', fecha: todayLocal() })
    setError('')
  }

  const cat = CATEGORIES.find(c => c.id === form.categoriaId)

  return (
    <div className="screen" style={{ padding: '20px 20px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Registrar</h2>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>Ticket, movimiento o captura manual</p>
        </div>
        <button onClick={toggle} title={hidden ? 'Mostrar cifras' : 'Ocultar cifras'}
          style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${hidden ? 'var(--gold-dim)' : 'var(--border2)'}`, background: hidden ? 'var(--gold-bg)' : 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}>
          {hidden ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {/* Toggle GASTO / INGRESO */}
      <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 12, padding: 3, marginBottom: 16, border: '0.5px solid var(--border)' }}>
        {[
          { id: 'gasto', label: '💸 Gasto', activeColor: 'var(--red)', activeBg: 'var(--red-bg, rgba(226,75,74,0.1))' },
          { id: 'ingreso', label: '💰 Ingreso', activeColor: 'var(--teal)', activeBg: 'var(--green-bg)' },
        ].map(t => (
          <button key={t.id} onClick={() => { setTipo(t.id); reset() }}
            style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: tipo === t.id ? `1.5px solid ${t.activeColor}` : '1.5px solid transparent', cursor: 'pointer', background: tipo === t.id ? t.activeBg : 'transparent', color: tipo === t.id ? t.activeColor : 'var(--text3)', fontSize: 14, fontWeight: 600, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Modo de captura */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[{ id: 'manual', label: '✏️ Manual' }, { id: 'ticket', label: '🧾 Ticket' }, { id: 'movimiento', label: '📱 Banco' }].map(m => (
          <button key={m.id} onClick={() => { setModo(m.id); reset() }}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `0.5px solid ${modo === m.id ? 'var(--gold-dim)' : 'var(--border2)'}`, background: modo === m.id ? 'var(--gold-bg)' : 'var(--card)', color: modo === m.id ? 'var(--gold)' : 'var(--text3)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* IDLE — Frecuentes automáticos + botones de captura */}
      {step === 'idle' && (
        <>
          {/* Frecuentes */}
          {tipo === 'gasto' && frecuentes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.05em', marginBottom: 8 }}>FRECUENTES</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {frecuentes.map((f, i) => (
                  <button key={i} onClick={() => applyFrecuente(f)}
                    style={{ background: 'var(--card)', border: '0.5px solid var(--border2)', borderRadius: 12, padding: '12px 14px', textAlign: 'left', cursor: 'pointer' }}>
                    <p style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500, marginBottom: 4 }}>{f.label}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>{mxn(f.monto)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Captura por ticket/banco */}
          {(modo === 'ticket' || modo === 'movimiento') && (
            <>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
              <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              <button className="btn btn-primary" onClick={() => cameraRef.current?.click()}
                style={{ width: '100%', height: 72, flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                <CameraIcon /><span style={{ fontSize: 13 }}>Tomar foto</span>
              </button>
              <button className="btn btn-secondary" onClick={() => galleryRef.current?.click()}
                style={{ width: '100%', height: 52, gap: 10, marginBottom: 10 }}>
                <GalleryIcon /><span style={{ fontSize: 13 }}>Elegir de galería</span>
              </button>
            </>
          )}

          {/* Manual — ir directo al formulario */}
          {modo === 'manual' && (
            <button className="btn btn-secondary" onClick={() => setStep('confirm')}
              style={{ width: '100%', height: 52 }}>
              ✏️ Captura manual
            </button>
          )}

          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }}
            onClick={() => setStep('confirm')}>
            Otro monto / categoría →
          </p>
        </>
      )}

      {/* Preview */}
      {step === 'preview' && (
        <div>
          <img src={imageData} alt="preview" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 280, objectFit: 'cover' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={reset} style={{ flex: 1 }}>Cambiar</button>
            <button className="btn btn-primary" onClick={processWithClaude} style={{ flex: 2 }}>⚡ Procesar con IA</button>
          </div>
          <button className="btn btn-ghost" onClick={() => setStep('confirm')} style={{ width: '100%', marginTop: 8, fontSize: 12 }}>
            Saltar IA — capturar manualmente
          </button>
        </div>
      )}

      {/* Processing */}
      {step === 'processing' && (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--gold-bg)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Claude está leyendo el {modo === 'ticket' ? 'ticket' : 'movimiento'}...</p>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>Extrayendo monto, fecha y categoría</p>
        </div>
      )}

      {/* Modal duplicado */}
      {duplicado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340 }}>
            <p style={{ fontSize: 22, textAlign: 'center', marginBottom: 12 }}>⚠️</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textAlign: 'center', marginBottom: 8 }}>Posible duplicado</p>
            <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 20 }}>
              Ya existe un gasto de <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{mxn(duplicado.monto)}</span> en <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{form.fecha}</span> en la misma categoría.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDuplicado(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => handleSave(true)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Guardar igual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      {(step === 'confirm' || (modo === 'manual' && step !== 'idle' && step !== 'processing' && step !== 'saving')) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {imageData && (
            <img src={imageData} alt="preview" style={{ width: '100%', borderRadius: 10, maxHeight: 140, objectFit: 'contain', background: 'var(--card)', opacity: 0.8 }} />
          )}
          {extracted && (
            <div style={{ background: 'var(--green-bg)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500 }}>
                IA extrajo: {extracted.comercio} · {extracted.monto ? mxn(extracted.monto) : '?'} · confianza: {extracted.confianza}
                {extracted.fecha && <span> · fecha: {extracted.fecha}</span>}
              </p>
            </div>
          )}

          {/* Fecha — siempre visible y editable */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>
              📅 FECHA DEL {tipo === 'ingreso' ? 'INGRESO' : 'GASTO'}
              {form.fecha !== todayLocal() && (
                <span style={{ marginLeft: 8, color: 'var(--amber)', fontSize: 10 }}>
                  · {new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </label>
            <input className="input" type="date" value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              style={{ fontSize: 15, color: form.fecha !== todayLocal() ? 'var(--amber)' : 'var(--text)' }}
            />
          </div>

          {/* Monto */}
          <div>
            <label style={{ fontSize: 11, color: tipo === 'ingreso' ? 'var(--teal)' : 'var(--red)', marginBottom: 6, display: 'block', fontWeight: 600 }}>
              {tipo === 'ingreso' ? '💰 MONTO INGRESO *' : '💸 MONTO GASTO *'}
            </label>
            <input className="input" type="number" inputMode="decimal" placeholder="0.00"
              value={form.monto}
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
              style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', color: tipo === 'ingreso' ? 'var(--teal)' : 'var(--text)', borderColor: tipo === 'ingreso' ? 'rgba(29,158,117,0.4)' : undefined }}
            />
          </div>

          {/* Ingreso rápido */}
          {tipo === 'ingreso' && (
            <button onClick={() => setForm(f => ({ ...f, monto: '47765', descripcion: 'Quincena', categoriaId: '' }))}
              style={{ width: '100%', padding: '10px', borderRadius: 10, border: '0.5px solid var(--teal)', background: 'var(--green-bg)', color: 'var(--teal)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Registrar quincena completa ($47,765)
            </button>
          )}

          {/* Descripción */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>DESCRIPCIÓN</label>
            <input className="input"
              placeholder={tipo === 'ingreso' ? 'Ej: Quincena Marco, Bono...' : 'Ej: Coyotl, Costco, Gasolina...'}
              value={form.descripcion}
              onChange={e => {
                const desc = e.target.value
                const auto = autoAsignar(desc)
                setForm(f => ({ ...f, descripcion: desc, categoriaId: auto?.categoria || f.categoriaId, subcategoriaId: auto?.subcategoria || f.subcategoriaId }))
              }}
            />
          </div>

          {/* Categoría */}
          {tipo === 'gasto' && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>
                CATEGORÍA * {cat && <span style={{ color: cat.color, marginLeft: 6 }}>{cat.icon} {cat.name}</span>}
              </label>
              <select className="input" value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value, subcategoriaId: '' }))}>
                <option value="">— Seleccionar —</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          )}

          {/* Subcategoría */}
          {tipo === 'gasto' && form.categoriaId && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>SUBCATEGORÍA</label>
              <select className="input" value={form.subcategoriaId} onChange={e => setForm(f => ({ ...f, subcategoriaId: e.target.value }))}>
                <option value="">— General —</option>
                {(CATEGORIES.find(c => c.id === form.categoriaId)?.subcategories || []).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cuenta */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>CUENTA</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CUENTAS.map(c => (
                <button key={c.id} onClick={() => setForm(f => ({ ...f, cuentaId: c.id }))}
                  style={{ flex: '1 1 auto', padding: '8px 4px', borderRadius: 8, border: `0.5px solid ${form.cuentaId === c.id ? c.color : 'var(--border2)'}`, background: form.cuentaId === c.id ? `${c.color}15` : 'var(--card)', color: form.cuentaId === c.id ? c.color : 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>
                  {c.icon}<br /><span style={{ fontSize: 9 }}>{c.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Usuario */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>QUIÉN PAGA</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {USUARIOS.map(u => (
                <button key={u.id} onClick={() => setForm(f => ({ ...f, usuarioId: u.id }))}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `0.5px solid ${form.usuarioId === u.id ? u.color : 'var(--border2)'}`, background: form.usuarioId === u.id ? `${u.color}15` : 'var(--card)', color: form.usuarioId === u.id ? u.color : 'var(--text3)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>}

          <button className="btn btn-primary" onClick={() => handleSave(false)} style={{ width: '100%', marginTop: 4, background: tipo === 'ingreso' ? 'var(--teal)' : undefined }}>
            {tipo === 'ingreso' ? '💰 Guardar ingreso' : '💸 Guardar gasto'}
          </button>
          <button className="btn btn-ghost" onClick={reset} style={{ width: '100%', fontSize: 13 }}>Cancelar</button>
        </div>
      )}

      {/* Saving */}
      {step === 'saving' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-bg)', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
            {tipo === 'ingreso' ? '💰' : '✓'}
          </div>
          <p style={{ color: 'var(--teal)', fontSize: 18, fontWeight: 600 }}>
            {form.monto ? mxn(parseFloat(form.monto)) : ''} guardado
          </p>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            {cat ? `${cat.icon} ${cat.name}` : tipo === 'ingreso' ? 'Ingreso registrado' : 'Gasto registrado'}
          </p>
          {form.fecha !== todayLocal() && (
            <p style={{ color: 'var(--amber)', fontSize: 12, marginTop: 4 }}>
              📅 {new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function EyeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
function EyeOffIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
}
function CameraIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
}
function GalleryIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}
