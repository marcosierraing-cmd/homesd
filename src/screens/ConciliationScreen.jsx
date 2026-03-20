import { useState, useRef } from 'react'
import { CATEGORIES } from '../data/budget.js'
import { usePrivacy } from '../context/PrivacyContext.jsx'

const MODO_OPCIONES = [
  { id: 'importar', label: 'Importar' },
  { id: 'conciliar', label: 'Conciliar' },
]

// Convierte un PDF a imágenes usando pdf.js
async function pdfToImages(pdfData) {
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  
  const base64 = pdfData.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
  const images = []
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.8))
  }
  return images
}

export default function ConciliationScreen({ transactions, onAdd }) {
  const fileRef = useRef()
  const [modo, setModo] = useState('importar')
  const [step, setStep] = useState('idle')
  const [imageData, setImageData] = useState(null)
  const [fileType, setFileType] = useState('')
  const [pdfImages, setPdfImages] = useState([])
  const [resultados, setResultados] = useState(null)
  const [seleccionados, setSeleccionados] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [guardados, setGuardados] = useState(0)
  const [processingMsg, setProcessingMsg] = useState('')
  const { mask } = usePrivacy()

  const mxn = n => '$' + Math.round(n || 0).toLocaleString('es-MX')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const data = ev.target.result
      setImageData(data)
      setFileType(file.type)
      if (file.type === 'application/pdf') {
        setStep('converting')
        try {
          const imgs = await pdfToImages(data)
          setPdfImages(imgs)
          setStep('preview')
        } catch (err) {
          console.error('PDF conversion error:', err)
          setStep('preview')
        }
      } else {
        setStep('preview')
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const procesar = async () => {
    setStep('processing')
    try {
      if (modo === 'importar') await procesarImportar()
      else await procesarConciliar()
    } catch (err) {
      setResultados({ error: err.message })
      setStep('results')
    }
  }

  const procesarImportar = async () => {
    const isPDF = fileType === 'application/pdf'
    const allResults = { movimientos: [], suma_total: 0, periodo: '' }
    
    if (isPDF && pdfImages.length > 0) {
      // Procesar cada página del PDF como imagen
      for (let i = 0; i < pdfImages.length; i++) {
        setProcessingMsg('Procesando página ' + (i+1) + ' de ' + pdfImages.length + '...')
        const response = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: pdfImages[i], transactions, pagina: i+1 })
        })
        if (!response.ok) throw new Error('Error ' + response.status + ' en página ' + (i+1))
        const data = await response.json()
        if (data.movimientos) {
          allResults.movimientos.push(...data.movimientos)
          allResults.suma_total += data.suma_total || 0
        }
        if (i === 0 && data.periodo) allResults.periodo = data.periodo
      }
      allResults.total_movimientos = allResults.movimientos.length
    } else {
      setProcessingMsg('Procesando imagen...')
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, transactions })
      })
      if (!response.ok) throw new Error('Error ' + response.status)
      const data = await response.json()
      Object.assign(allResults, data)
    }
    
    setResultados(allResults)
    if (allResults.movimientos) {
      const sel = {}
      allResults.movimientos.forEach((m, i) => { sel[i] = !m.ya_registrado })
      setSeleccionados(sel)
    }
    setStep('results')
  }

  const procesarConciliar = async () => {
    const response = await fetch('/api/conciliate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData, transactions })
    })
    const data = await response.json()
    setResultados(data)
    setStep('results')
  }

  const toggleSeleccion = (i) => setSeleccionados(s => ({ ...s, [i]: !s[i] }))
  const seleccionarTodos = (valor) => {
    const sel = {}
    resultados.movimientos.forEach((_, i) => { sel[i] = valor })
    setSeleccionados(sel)
  }
  const cambiarCategoria = (i, catId) => {
    setResultados(r => ({ ...r, movimientos: r.movimientos.map((m, idx) => idx === i ? { ...m, categoria: catId } : m) }))
  }
  const guardarSeleccionados = async () => {
    if (!onAdd) return
    setGuardando(true)
    const aGuardar = resultados.movimientos.filter((_, i) => seleccionados[i])
    let count = 0
    for (const mov of aGuardar) {
      await onAdd({
        monto: mov.monto, descripcion: mov.descripcion,
        categoriaId: mov.categoria || 'imprevistos', subcategoriaId: mov.subcategoria || '',
        cuentaId: 'scotiabank', usuarioId: 'marco', nota: 'Importado de estado de cuenta',
        timestamp: mov.fecha ? new Date(mov.fecha).toISOString() : new Date().toISOString(),
        modoCaptura: 'estado_cuenta',
      })
      count++
    }
    setGuardados(count); setGuardando(false); setStep('done')
  }
  const reset = () => { setStep('idle'); setImageData(null); setFileType(''); setPdfImages([]); setResultados(null); setSeleccionados({}); setGuardados(0); setProcessingMsg('') }

  const totalSeleccionado = resultados?.movimientos ? resultados.movimientos.filter((_, i) => seleccionados[i]).reduce((s, m) => s + (m.monto || 0), 0) : 0
  const countSeleccionados = Object.values(seleccionados).filter(Boolean).length

  return (
    <div className="screen" style={{ padding: '20px 20px 80px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Estado de cuenta</h2>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Importa o concilia movimientos bancarios</p>

      {step === 'idle' && (<>
        <div style={{ display: 'flex', gap: 4, background: 'var(--card)', borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {MODO_OPCIONES.map(m => (
            <button key={m.id} onClick={() => setModo(m.id)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: modo === m.id ? 'var(--card2)' : 'transparent', color: modo === m.id ? 'var(--gold)' : 'var(--text3)', fontSize: 13, fontWeight: 500 }}>{m.label}</button>
          ))}
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[['📸','Sube foto o PDF del estado de cuenta'],['🤖','Claude extrae todos los movimientos'],['✅','Revisas y seleccionas cuáles guardar'],['💾','Se guardan en Drive']].map(([icon, text]) => (
              <div key={icon} style={{ display: 'flex', gap: 10 }}><span style={{ fontSize: 14 }}>{icon}</span><span style={{ fontSize: 12, color: 'var(--text3)' }}>{text}</span></div>
            ))}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 80, flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>📸</span><span>Foto del estado de cuenta</span>
        </button>
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 56, gap: 10 }}>
          <span style={{ fontSize: 18 }}>📄</span><span style={{ fontSize: 13 }}>Subir PDF</span>
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
          <div style={{ background: 'var(--card)', borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>REGISTRADOS</p>
            <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--teal)' }}>{transactions.length}</p>
          </div>
          <div style={{ background: 'var(--card)', borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>TOTAL</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{mask(mxn(transactions.reduce((s, t) => s + (t.monto || 0), 0)))}</p>
          </div>
        </div>
      </>)}

      {step === 'converting' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid var(--gold-bg)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Preparando PDF...</p>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>Convirtiendo páginas a imagen</p>
        </div>
      )}

      {step === 'preview' && (
        <div>
          {fileType === 'application/pdf' ? (
            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '24px', marginBottom: 16, textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 8 }}>📄</p>
              <p style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>PDF listo · {pdfImages.length} páginas</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Claude procesará cada página</p>
            </div>
          ) : (
            <img src={imageData} alt="preview" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 300, objectFit: 'cover' }} />
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={reset} style={{ flex: 1 }}>Cambiar</button>
            <button className="btn btn-primary" onClick={procesar} style={{ flex: 2 }}>{modo === 'importar' ? 'Extraer movimientos' : 'Conciliar con IA'}</button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid var(--gold-bg)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Claude está leyendo el estado de cuenta...</p>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>{processingMsg || 'Extrayendo movimientos...'}</p>
        </div>
      )}

      {step === 'results' && modo === 'importar' && resultados?.movimientos && (
        <div>
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{resultados.periodo || 'Estado de cuenta'}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{resultados.movimientos.length} movimientos</p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>Total: {mask(mxn(resultados.movimientos.reduce((s, m) => s + m.monto, 0)))}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)' }}>{countSeleccionados} seleccionados</p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>{mask(mxn(totalSeleccionado))}</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => seleccionarTodos(true)} style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '0.5px solid var(--border2)', background: 'var(--card)', color: 'var(--text2)' }}>Todos</button>
            <button onClick={() => seleccionarTodos(false)} style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '0.5px solid var(--border2)', background: 'var(--card)', color: 'var(--text2)' }}>Ninguno</button>
            <button onClick={() => { const sel = {}; resultados.movimientos.forEach((m, i) => { sel[i] = !m.ya_registrado }); setSeleccionados(sel) }} style={{ flex: 2, padding: '7px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '0.5px solid var(--gold-dim)', background: 'var(--gold-bg)', color: 'var(--gold)' }}>Solo nuevos</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 80 }}>
            {resultados.movimientos.map((mov, i) => {
              const cat = CATEGORIES.find(c => c.id === mov.categoria)
              const sel = !!seleccionados[i]
              return (
                <div key={i} onClick={() => toggleSeleccion(i)} style={{ background: 'var(--card)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', border: '0.5px solid ' + (sel ? (cat?.color + '60' || 'var(--gold-dim)') : 'var(--border2)'), opacity: mov.ya_registrado && !sel ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: '1.5px solid ' + (sel ? 'var(--teal)' : 'var(--border)'), background: sel ? 'var(--teal)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sel && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: cat ? cat.color + '20' : 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{cat?.icon || '💰'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mov.descripcion}</p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{mov.fecha}</span>
                        {mov.ya_registrado && <span style={{ fontSize: 10, color: 'var(--teal)', background: 'var(--green-bg)', padding: '1px 6px', borderRadius: 6 }}>ya registrado</span>}
                        <select value={mov.categoria || ''} onChange={e => { e.stopPropagation(); cambiarCategoria(i, e.target.value) }} onClick={e => e.stopPropagation()} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 6, border: '0.5px solid ' + (cat?.color || 'var(--border2)'), background: cat ? cat.color + '15' : 'var(--card)', color: cat?.color || 'var(--text3)', cursor: 'pointer' }}>
                          <option value="">— categoría —</option>
                          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{mask(mxn(mov.monto))}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ position: 'sticky', bottom: 80, paddingBottom: 8 }}>
            <button className="btn btn-primary" onClick={guardarSeleccionados} disabled={guardando || countSeleccionados === 0} style={{ width: '100%', fontSize: 14 }}>
              {guardando ? 'Guardando...' : 'Guardar ' + countSeleccionados + ' movimientos · ' + mask(mxn(totalSeleccionado))}
            </button>
          </div>
        </div>
      )}

      {step === 'results' && modo === 'conciliar' && resultados && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            {[{label:'Cuadran',count:resultados.conciliados?.length||0,color:'var(--teal)',bg:'var(--green-bg)'},{label:'Sin ticket',count:resultados.fugas?.length||0,color:'var(--red)',bg:'var(--red-bg)'},{label:'Pendientes',count:resultados.pendientes?.length||0,color:'var(--amber)',bg:'var(--amber-bg)'}].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.count}</p>
                <p style={{ fontSize: 10, color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={reset} style={{ width: '100%' }}>Nueva conciliación</button>
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-bg)', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
          <p style={{ color: 'var(--teal)', fontSize: 18, fontWeight: 600 }}>{guardados} movimientos guardados</p>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>Ya están sincronizados en Drive</p>
          <button className="btn btn-secondary" onClick={reset} style={{ marginTop: 24, width: '100%' }}>Importar otro estado</button>
        </div>
      )}

      {step === 'results' && resultados?.error && (
        <div style={{ background: 'var(--red-bg)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--red)', fontSize: 13 }}>Error: {resultados.error}</p>
          <button className="btn btn-secondary" onClick={reset} style={{ marginTop: 12 }}>Reintentar</button>
        </div>
      )}
    </div>
  )
}
