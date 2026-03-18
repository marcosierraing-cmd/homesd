import { useState, useRef } from 'react'
import { CATEGORIES, CUENTAS, USUARIOS, autoAsignar } from '../data/budget.js'
import { useNavigate } from 'react-router-dom'

const MODOS = ['ticket', 'movimiento', 'manual']

export default function CaptureScreen({ onAdd, user }) {
  const navigate = useNavigate()
  const fileRef = useRef()
  const [modo, setModo] = useState('ticket')
  const [step, setStep] = useState('idle') // idle | preview | processing | confirm | saving
  const [imageData, setImageData] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [form, setForm] = useState({
    monto: '',
    descripcion: '',
    categoriaId: '',
    subcategoriaId: '',
    cuentaId: 'nu',
    usuarioId: user?.usuarioId || 'marco',
    nota: '',
  })
  const [error, setError] = useState('')

  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImageData(ev.target.result)
      setStep('preview')
    }
    reader.readAsDataURL(file)
  }

  const processWithClaude = async () => {
    setStep('processing')
    setError('')
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          tipo: modo,
        })
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
      }))
      setStep('confirm')
    } catch (err) {
      setError('No se pudo procesar la imagen. Captura manual.')
      setStep('confirm')
    }
  }

  const handleSave = () => {
    if (!form.monto || isNaN(parseFloat(form.monto))) {
      setError('El monto es requerido')
      return
    }
    if (!form.categoriaId) {
      setError('Selecciona una categoría')
      return
    }
    setStep('saving')
    onAdd({
      ...form,
      monto: parseFloat(form.monto),
      imagen: imageData,
      modoCaptura: modo,
    })
    setTimeout(() => navigate('/transactions'), 600)
  }

  const reset = () => {
    setStep('idle')
    setImageData(null)
    setExtracted(null)
    setForm({ monto: '', descripcion: '', categoriaId: '', subcategoriaId: '', cuentaId: 'nu', usuarioId: user?.usuarioId || 'marco', nota: '' })
    setError('')
  }

  const cat = CATEGORIES.find(c => c.id === form.categoriaId)

  return (
    <div className="screen" style={{ padding: '20px 20px 80px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
        Registrar gasto
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
        Foto de ticket o movimiento bancario
      </p>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          { id: 'ticket', label: 'Ticket' },
          { id: 'movimiento', label: 'Movimiento' },
          { id: 'manual', label: 'Manual' },
        ].map(m => (
          <button key={m.id}
            onClick={() => { setModo(m.id); reset() }}
            style={{
              flex: 1, padding: '8px 0',
              borderRadius: 8, border: `0.5px solid ${modo === m.id ? 'var(--gold-dim)' : 'var(--border2)'}`,
              background: modo === m.id ? 'var(--gold-bg)' : 'var(--card)',
              color: modo === m.id ? 'var(--gold)' : 'var(--text3)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* IDLE: camera button */}
      {step === 'idle' && modo !== 'manual' && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }} onChange={handlePhoto} />
          <button className="btn btn-primary"
            onClick={() => fileRef.current?.click()}
            style={{ width: '100%', height: 120, flexDirection: 'column', gap: 12, borderRadius: 16 }}>
            <CameraIcon />
            <span style={{ fontSize: 15 }}>
              {modo === 'ticket' ? 'Fotografiar ticket' : 'Fotografiar movimiento'}
            </span>
          </button>
          <button className="btn btn-ghost"
            onClick={() => setStep('confirm')}
            style={{ width: '100%', marginTop: 12, fontSize: 13 }}>
            Captura manual
          </button>
        </div>
      )}

      {/* PREVIEW */}
      {step === 'preview' && imageData && (
        <div>
          <img src={imageData} alt="preview"
            style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 280, objectFit: 'cover' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={reset} style={{ flex: 1 }}>Retomar</button>
            <button className="btn btn-primary" onClick={processWithClaude} style={{ flex: 2 }}>
              Procesar con IA
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING */}
      {step === 'processing' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '2px solid var(--gold-bg)',
            borderTopColor: 'var(--gold)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Analizando con Claude...</p>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>Extrayendo monto, comercio y categoría</p>
        </div>
      )}

      {/* CONFIRM / FORM */}
      {(step === 'confirm' || modo === 'manual') && step !== 'processing' && step !== 'saving' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {imageData && (
            <img src={imageData} alt="preview"
              style={{ width: '100%', borderRadius: 10, maxHeight: 160, objectFit: 'cover', opacity: 0.7 }} />
          )}

          {extracted && (
            <div style={{ background: 'var(--green-bg)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontSize: 11, color: 'var(--teal)' }}>
                IA extrajo: {extracted.comercio} · {mxn(extracted.monto)} · {extracted.fecha}
              </p>
            </div>
          )}

          {/* Monto */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>MONTO *</label>
            <input className="input" type="number" inputMode="decimal"
              placeholder="0.00"
              value={form.monto}
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
              style={{ fontSize: 24, fontWeight: 600, textAlign: 'center' }}
            />
          </div>

          {/* Descripción */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>DESCRIPCIÓN</label>
            <input className="input"
              placeholder="Ej: Carnicería Coyotl, gasolina..."
              value={form.descripcion}
              onChange={e => {
                const desc = e.target.value
                const auto = autoAsignar(desc)
                setForm(f => ({
                  ...f,
                  descripcion: desc,
                  categoriaId: auto?.categoria || f.categoriaId,
                  subcategoriaId: auto?.subcategoria || f.subcategoriaId,
                }))
              }}
            />
          </div>

          {/* Categoría */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>
              CATEGORÍA *
              {cat && <span style={{ color: cat.color, marginLeft: 6 }}>{cat.icon} {cat.name}</span>}
            </label>
            <select className="input"
              value={form.categoriaId}
              onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value, subcategoriaId: '' }))}>
              <option value="">— Seleccionar —</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Subcategoría */}
          {form.categoriaId && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>SUBCATEGORÍA</label>
              <select className="input"
                value={form.subcategoriaId}
                onChange={e => setForm(f => ({ ...f, subcategoriaId: e.target.value }))}>
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
            <div style={{ display: 'flex', gap: 8 }}>
              {CUENTAS.map(c => (
                <button key={c.id}
                  onClick={() => setForm(f => ({ ...f, cuentaId: c.id }))}
                  style={{
                    flex: 1, padding: '8px 0',
                    borderRadius: 8,
                    border: `0.5px solid ${form.cuentaId === c.id ? c.color : 'var(--border2)'}`,
                    background: form.cuentaId === c.id ? `${c.color}15` : 'var(--card)',
                    color: form.cuentaId === c.id ? c.color : 'var(--text3)',
                    fontSize: 11, cursor: 'pointer',
                  }}>
                  {c.icon}<br />{c.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Usuario */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>QUIEN PAGA</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {USUARIOS.map(u => (
                <button key={u.id}
                  onClick={() => setForm(f => ({ ...f, usuarioId: u.id }))}
                  style={{
                    flex: 1, padding: '8px 0',
                    borderRadius: 8,
                    border: `0.5px solid ${form.usuarioId === u.id ? u.color : 'var(--border2)'}`,
                    background: form.usuarioId === u.id ? `${u.color}15` : 'var(--card)',
                    color: form.usuarioId === u.id ? u.color : 'var(--text3)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}>
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>}

          <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%', marginTop: 4 }}>
            Guardar gasto
          </button>
          <button className="btn btn-ghost" onClick={reset} style={{ width: '100%', fontSize: 13 }}>
            Cancelar
          </button>
        </div>
      )}

      {/* SAVING */}
      {step === 'saving' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <p style={{ color: 'var(--teal)', fontSize: 16, fontWeight: 500 }}>Guardado</p>
        </div>
      )}
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}
