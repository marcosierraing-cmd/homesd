import { useState, useRef } from 'react'
import { CATEGORIES, CUENTAS, USUARIOS, autoAsignar } from '../data/budget.js'
import { usePrivacy } from '../context/PrivacyContext.jsx'

const MODO_OPCIONES = [
  { id: 'importar', label: 'Foto / PDF' },
  { id: 'conciliar', label: 'Conciliar' },
  { id: 'csv',      label: 'CSV / XML' },
]

const PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}

async function pdfToImages(pdfData) {
  await loadScript(PDFJS_CDN)
  const pdfjsLib = window.pdfjsLib
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
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
    canvas.width = viewport.width; canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.8))
  }
  return images
}

const TIPO_CONFIG = {
  gasto:   { color: 'var(--red)',   bg: 'var(--red-bg)',   label: 'Gasto',   icon: '💸' },
  ingreso: { color: 'var(--teal)',  bg: 'var(--green-bg)', label: 'Ingreso', icon: '💰' },
  ignorar: { color: 'var(--text3)', bg: 'var(--card)',      label: 'Ignorar', icon: '⏭️' },
}

// ─── CSV / XML helpers ──────────────────────────────────────────────────────

function buildTimestamp(fechaStr) {
  // fechaStr expected as YYYY-MM-DD
  const [y, m, d] = fechaStr.split('-').map(Number)
  if (!y || !m || !d) return new Date().toISOString()
  return new Date(y, m - 1, d, 12, 0, 0).toISOString()
}

function parseCSVFile(text) {
  // Strip BOM
  const clean = text.replace(/^﻿/, '').trim()
  const lines = clean.split(/
?
/).filter(l => l.trim())
  if (lines.length < 2) return []
  // Parse header
  const header = splitCSVLine(lines[0]).map(h => h.toLowerCase().trim())
  const fechaIdx = header.findIndex(h => h === 'fecha')
  const descIdx  = header.findIndex(h => h === 'descripcion' || h === 'descripción')
  const montoIdx = header.findIndex(h => h === 'monto')
  const tipoIdx  = header.findIndex(h => h === 'tipo')
  if (fechaIdx < 0 || montoIdx < 0) return []
  const movs = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i])
    const fecha = (cols[fechaIdx] || '').trim()
    const desc  = (cols[descIdx]  || '').trim()
    const monto = parseFloat((cols[montoIdx] || '0').replace(/,/g, ''))
    const tipo  = (cols[tipoIdx]  || 'egreso').trim().toLowerCase()
    if (!fecha || isNaN(monto)) continue
    movs.push({
      fecha,
      descripcion: desc,
      monto: Math.abs(monto),
      tipo: tipo === 'ingreso' ? 'ingreso' : 'gasto',
    })
  }
  return movs
}

function splitCSVLine(line) {
  const result = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

function parseXMLFile(text) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'application/xml')
    const nodes = doc.querySelectorAll('movimiento')
    const movs = []
    nodes.forEach(n => {
      const fecha = n.querySelector('fecha')?.textContent?.trim() || ''
      const desc  = n.querySelector('descripcion')?.textContent?.trim() || ''
      const monto = parseFloat(n.querySelector('monto')?.textContent?.trim() || '0')
      const tipo  = (n.querySelector('tipo')?.textContent?.trim() || 'egreso').toLowerCase()
      if (!fecha || isNaN(monto)) return
      movs.push({
        fecha,
        descripcion: desc,
        monto: Math.abs(monto),
        tipo: tipo === 'ingreso' ? 'ingreso' : 'gasto',
      })
    })
    return movs
  } catch {
    return []
  }
}

function isYaRegistrado(mov, transactions) {
  const ts = buildTimestamp(mov.fecha)
  const d0 = new Date(ts)
  return transactions.some(t => {
    const d1 = new Date(t.timestamp || t.createdAt || '')
    const diffDays = Math.abs(d0 - d1) / 86400000
    const diffMonto = Math.abs((t.monto || 0) - mov.monto) / (mov.monto || 1)
    return diffDays <= 1 && diffMonto <= 0.02
  })
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ConciliationScreen({ transactions, onAdd }) {
  const fileRef    = useRef()
  const csvFileRef = useRef()

  // ── Existing PDF / foto state ──────────────────────────────────────────
  const [modo, setModo]               = useState('importar')
  const [step, setStep]               = useState('idle')
  const [imageData, setImageData]     = useState(null)
  const [fileType, setFileType]       = useState('')
  const [pdfImages, setPdfImages]     = useState([])
  const [resultados, setResultados]   = useState(null)
  const [seleccionados, setSeleccionados] = useState({})
  const [guardando, setGuardando]     = useState(false)
  const [guardados, setGuardados]     = useState(0)
  const [processingMsg, setProcessingMsg] = useState('')
  const [filtroTipo, setFiltroTipo]   = useState('todos')

  // ── CSV / XML state ────────────────────────────────────────────────────
  const [csvStep, setCsvStep]         = useState('idle')   // idle | preview | done
  const [csvMovs, setCsvMovs]         = useState([])       // parsed movimientos
  const [csvSel, setCsvSel]           = useState({})       // selected map
  const [csvGuardando, setCsvGuardando] = useState(false)
  const [csvGuardados, setCsvGuardados] = useState(0)
  const [csvError, setCsvError]       = useState('')
  const [csvDefaults, setCsvDefaults] = useState({ cuentaId: '', usuarioId: 'marco' })

  const { mask } = usePrivacy()
  const mxn = n => '$' + Math.round(n || 0).toLocaleString('es-MX')

  // ── Tab switch — reset CSV state when leaving ──────────────────────────
  const handleModoChange = (m) => {
    setModo(m)
    if (m !== 'csv') {
      setCsvStep('idle'); setCsvMovs([]); setCsvSel({})
      setCsvGuardado(0); setCsvError('')
    }
    if (m === 'csv') {
      setStep('idle'); setImageData(null); setFileType('')
      setPdfImages([]); setResultados(null)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  const setCsvGuardado = (n) => setCsvGuardados(n) // alias

  // ── PDF / foto handlers (unchanged) ───────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const data = ev.target.result
      setImageData(data); setFileType(file.type)
      if (file.type === 'application/pdf') {
        setStep('converting')
        try {
          const imgs = await pdfToImages(data)
          setPdfImages(imgs); setStep('preview')
        } catch { setStep('preview') }
      } else { setStep('preview') }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const procesar = async () => {
    setStep('processing')
    try {
      if (modo === 'importar') await procesarImportar()
      else await procesarConciliar()
    } catch (err) { setResultados({ error: err.message }); setStep('results') }
  }

  const procesarImportar = async () => {
    const isPDF = fileType === 'application/pdf'
    const allMovimientos = []
    let periodo = ''
    if (isPDF && pdfImages.length > 0) {
      for (let i = 0; i < pdfImages.length; i++) {
        setProcessingMsg('Página ' + (i + 1) + ' de ' + pdfImages.length + '...')
        try {
          const response = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: pdfImages[i], transactions })
          })
          if (!response.ok) continue
          const data = await response.json()
          if (data.movimientos) allMovimientos.push(...data.movimientos)
          if (i === 0 && data.periodo) periodo = data.periodo
        } catch { continue }
      }
    } else {
      setProcessingMsg('Procesando imagen...')
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, transactions })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.movimientos) allMovimientos.push(...data.movimientos)
        if (data.periodo) periodo = data.periodo
      }
    }
    const result = {
      movimientos: allMovimientos,
      total_movimientos: allMovimientos.length,
      suma_total_gastos: allMovimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0),
      suma_total_ingresos: allMovimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0),
      periodo
    }
    setResultados(result)
    const sel = {}
    allMovimientos.forEach((m, i) => { sel[i] = m.tipo !== 'ignorar' })
    setSeleccionados(sel)
    setStep('results')
  }

  const procesarConciliar = async () => {
    const response = await fetch('/api/conciliate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData, transactions })
    })
    const data = await response.json()
    setResultados(data); setStep('results')
  }

  const toggleSeleccion = (i) => setSeleccionados(s => ({ ...s, [i]: !s[i] }))

  const cambiarTipo = (i, tipo) => {
    setResultados(r => ({ ...r, movimientos: r.movimientos.map((m, idx) => idx === i ? { ...m, tipo } : m) }))
    setSeleccionados(s => ({ ...s, [i]: tipo !== 'ignorar' }))
  }

  const cambiarCategoria = (i, catId) => {
    setResultados(r => ({ ...r, movimientos: r.movimientos.map((m, idx) => idx === i ? { ...m, categoria: catId } : m) }))
  }

  const guardarSeleccionados = async () => {
    if (!onAdd) return
    setGuardando(true)
    const aGuardar = resultados.movimientos.filter((_, i) => seleccionados[i])
    const nuevasTx = aGuardar.map(mov => ({
      monto: mov.monto,
      descripcion: mov.descripcion,
      categoriaId: mov.tipo === 'ingreso' ? 'ingreso' : (mov.categoria || 'imprevistos'),
      subcategoriaId: mov.subcategoria || '',
      cuentaId: 'nu',
      usuarioId: 'marco',
      tipo: mov.tipo || 'gasto',
      nota: 'Importado de estado de cuenta',
      timestamp: mov.fecha ? new Date(mov.fecha).toISOString() : new Date().toISOString(),
      modoCaptura: 'estado_cuenta',
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '-' + Math.random().toString(36).slice(2, 5),
      createdAt: new Date().toISOString(),
    }))
    await onAdd(nuevasTx)
    setGuardados(nuevasTx.length); setGuardando(false); setStep('done')
  }

  const reset = () => {
    setStep('idle'); setImageData(null); setFileType(''); setPdfImages([])
    setResultados(null); setSeleccionados({}); setGuardados(0)
    setProcessingMsg(''); setFiltroTipo('todos')
  }

  const movsFiltrados = resultados?.movimientos
    ? resultados.movimientos.filter(m => filtroTipo === 'todos' || m.tipo === filtroTipo)
    : []

  const countSel = Object.values(seleccionados).filter(Boolean).length
  const totalSel = resultados?.movimientos
    ? resultados.movimientos.filter((_, i) => seleccionados[i]).reduce((s, m) => s + (m.monto || 0), 0)
    : 0

  // ── CSV / XML handlers ─────────────────────────────────────────────────
  const handleCsvFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError('')
    try {
      const text = await file.text()
      const isXML = file.name.toLowerCase().endsWith('.xml') || text.trim().startsWith('<')
      const parsed = isXML ? parseXMLFile(text) : parseCSVFile(text)
      if (!parsed.length) { setCsvError('No se encontraron movimientos. Verifica el formato del archivo.'); return }
      // Enrich with autoAsignar + ya_registrado
      const enriched = parsed.map(m => {
        const asig = autoAsignar(m.descripcion)
        return {
          ...m,
          categoriaId:    m.tipo === 'ingreso' ? '' : (asig?.categoria    || ''),
          subcategoriaId: m.tipo === 'ingreso' ? '' : (asig?.subcategoria || ''),
          ya_registrado:  isYaRegistrado(m, transactions),
        }
      })
      setCsvMovs(enriched)
      const sel = {}
      enriched.forEach((m, i) => { sel[i] = !m.ya_registrado })
      setCsvSel(sel)
      setCsvStep('preview')
    } catch (err) {
      setCsvError('Error al leer el archivo: ' + err.message)
    }
    e.target.value = ''
  }

  const toggleCsvSel = (i) => setCsvSel(s => ({ ...s, [i]: !s[i] }))

  const cambiarCsvTipo = (i, tipo) => {
    setCsvMovs(ms => ms.map((m, idx) => idx === i ? { ...m, tipo } : m))
    setCsvSel(s => ({ ...s, [i]: tipo !== 'ignorar' }))
  }

  const cambiarCsvCat = (i, catId) => {
    setCsvMovs(ms => ms.map((m, idx) => idx === i ? { ...m, categoriaId: catId } : m))
  }

  const guardarCSV = async () => {
    if (!onAdd || !csvDefaults.cuentaId) return
    setCsvGuardando(true)
    const aGuardar = csvMovs.filter((_, i) => csvSel[i])
    const nuevasTx = aGuardar.map(mov => ({
      monto:          mov.monto,
      descripcion:    mov.descripcion,
      tipo:           mov.tipo,
      categoriaId:    mov.tipo === 'ingreso' ? 'ingreso' : (mov.categoriaId || 'imprevistos'),
      subcategoriaId: mov.subcategoriaId || '',
      cuentaId:       csvDefaults.cuentaId,
      usuarioId:      csvDefaults.usuarioId || 'marco',
      nota:           'Importado via CSV/XML',
      timestamp:      buildTimestamp(mov.fecha),
      modoCaptura:    'csv_import',
      id:             Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      createdAt:      new Date().toISOString(),
    }))
    await onAdd(nuevasTx)
    setCsvGuardados(nuevasTx.length)
    setCsvGuardando(false)
    setCsvStep('done')
  }

  const resetCSV = () => {
    setCsvStep('idle'); setCsvMovs([]); setCsvSel({})
    setCsvGuardados(0); setCsvError('')
  }

  const csvCountSel  = Object.values(csvSel).filter(Boolean).length
  const csvTotalSel  = csvMovs.filter((_, i) => csvSel[i]).reduce((s, m) => s + (m.monto || 0), 0)
  const csvSumGastos = csvMovs.filter((_, i) => csvSel[i] && csvMovs[i].tipo !== 'ingreso').reduce((s, m) => s + m.monto, 0)
  const csvNuevos    = csvMovs.filter(m => !m.ya_registrado).length

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="screen" style={{ padding: '20px 20px 80px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Estado de cuenta</h2>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Importa o concilia movimientos bancarios</p>

      {/* ── Tab selector (always visible when idle) ── */}
      {(step === 'idle' || modo === 'csv') && csvStep !== 'done' && step !== 'done' && (
        <div style={{ display: 'flex', gap: 4, background: 'var(--card)', borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {MODO_OPCIONES.map(m => (
            <button key={m.id}
              onClick={() => handleModoChange(m.id)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: modo === m.id ? 'var(--card2)' : 'transparent',
                color: modo === m.id ? 'var(--gold)' : 'var(--text3)',
                fontSize: 12, fontWeight: 500 }}>
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          CSV / XML FLOW
      ══════════════════════════════════════════════ */}
      {modo === 'csv' && (<>

        {/* ── CSV idle ── */}
        {csvStep === 'idle' && (
          <div>
            {/* How-to card */}
            <div style={{ background: 'var(--card)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['🛠️', 'Usa el extractor HTML para generar el CSV desde tu PDF'],
                  ['📂', 'Sube el archivo CSV o XML aquí'],
                  ['⚙️', 'Elige la cuenta y usuario antes de guardar'],
                  ['✅', 'Revisa, ajusta categorías y guarda de un jalón'],
                ].map(([icon, text]) => (
                  <div key={icon} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 14 }}>{icon}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {csvError && (
              <div style={{ background: 'var(--red-bg)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--red)' }}>{csvError}</p>
              </div>
            )}

            <input ref={csvFileRef} type="file" accept=".csv,.xml,text/csv,application/xml,text/xml"
              style={{ display: 'none' }} onChange={handleCsvFile} />
            <button className="btn btn-primary" onClick={() => csvFileRef.current?.click()}
              style={{ width: '100%', height: 72, flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 22 }}>📂</span>
              <span>Subir CSV o XML</span>
            </button>
          </div>
        )}

        {/* ── CSV preview ── */}
        {csvStep === 'preview' && (
          <div>
            {/* Resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>TOTAL</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{csvMovs.length}</p>
              </div>
              <div style={{ background: 'var(--green-bg)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--teal)', marginBottom: 2 }}>NUEVOS</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--teal)' }}>{csvNuevos}</p>
              </div>
              <div style={{ background: 'var(--red-bg)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--red)', marginBottom: 2 }}>GASTOS SEL</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>{mask(mxn(csvSumGastos))}</p>
              </div>
            </div>

            {/* Defaults panel */}
            <div style={{ background: 'var(--card)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.5px' }}>CONFIGURACIÓN DE IMPORTACIÓN</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Cuenta */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>CUENTA *</p>
                  <select value={csvDefaults.cuentaId}
                    onChange={e => setCsvDefaults(d => ({ ...d, cuentaId: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid ' + (csvDefaults.cuentaId ? 'var(--border)' : 'var(--gold)'), background: 'var(--card2)', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}>
                    <option value="">— Selecciona —</option>
                    {CUENTAS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {/* Usuario */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>USUARIO</p>
                  <select value={csvDefaults.usuarioId}
                    onChange={e => setCsvDefaults(d => ({ ...d, usuarioId: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}>
                    {USUARIOS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              {!csvDefaults.cuentaId && (
                <p style={{ fontSize: 11, color: 'var(--gold)' }}>⚠️ Selecciona la cuenta de origen para habilitar el botón de guardar</p>
              )}
            </div>

            {/* Contador seleccionados */}
            <div style={{ background: 'var(--card)', borderRadius: 10, padding: '8px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{csvCountSel} seleccionados</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { const s = {}; csvMovs.forEach((_, i) => { s[i] = true }); setCsvSel(s) }}
                  style={{ fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Todos
                </button>
                <button onClick={() => { const s = {}; csvMovs.forEach((m, i) => { s[i] = !m.ya_registrado }); setCsvSel(s) }}
                  style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Solo nuevos
                </button>
              </div>
            </div>

            {/* Lista de movimientos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 80 }}>
              {csvMovs.map((mov, i) => {
                const sel = !!csvSel[i]
                const tipoConf = TIPO_CONFIG[mov.tipo] || TIPO_CONFIG.gasto
                const cat = CATEGORIES.find(c => c.id === mov.categoriaId)
                return (
                  <div key={i} style={{
                    background: 'var(--card)', borderRadius: 12, padding: '10px 12px',
                    border: '0.5px solid ' + (sel ? tipoConf.color + '50' : 'var(--border2)'),
                    opacity: mov.ya_registrado && !sel ? 0.55 : 1
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Checkbox */}
                      <div onClick={() => toggleCsvSel(i)}
                        style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          border: '1.5px solid ' + (sel ? tipoConf.color : 'var(--border)'),
                          background: sel ? tipoConf.color : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        {sel && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
                      </div>
                      {/* Ícono categoría */}
                      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: cat ? cat.color + '20' : tipoConf.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                        {cat?.icon || tipoConf.icon}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {mov.descripcion || '—'}
                        </p>
                        <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{mov.fecha}</span>
                          {/* Tipo selector */}
                          <select value={mov.tipo}
                            onChange={e => { e.stopPropagation(); cambiarCsvTipo(i, e.target.value) }}
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: 10, padding: '1px 4px', borderRadius: 6,
                              border: '0.5px solid ' + tipoConf.color,
                              background: tipoConf.bg, color: tipoConf.color, cursor: 'pointer' }}>
                            <option value="gasto">💸 Gasto</option>
                            <option value="ingreso">💰 Ingreso</option>
                            <option value="ignorar">⏭️ Ignorar</option>
                          </select>
                          {/* Categoría (solo gastos) */}
                          {mov.tipo === 'gasto' && (
                            <select value={mov.categoriaId || ''}
                              onChange={e => { e.stopPropagation(); cambiarCsvCat(i, e.target.value) }}
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: 10, padding: '1px 4px', borderRadius: 6,
                                border: '0.5px solid ' + (cat?.color || 'var(--border2)'),
                                background: cat ? cat.color + '15' : 'var(--card)',
                                color: cat?.color || 'var(--text3)', cursor: 'pointer' }}>
                              <option value="">— categoría —</option>
                              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </select>
                          )}
                          {/* Badges */}
                          {mov.ya_registrado && (
                            <span style={{ fontSize: 10, color: 'var(--teal)', background: 'var(--green-bg)', padding: '1px 6px', borderRadius: 6 }}>
                              ya registrado
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Monto */}
                      <div style={{ fontSize: 13, fontWeight: 600, color: tipoConf.color, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {mov.tipo === 'ingreso' ? '+' : ''}{mask(mxn(mov.monto))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Botón guardar sticky */}
            <div style={{ position: 'sticky', bottom: 80, paddingBottom: 8, display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={resetCSV} style={{ flex: '0 0 44px', height: 44 }}>✕</button>
              <button className="btn btn-primary" onClick={guardarCSV}
                disabled={csvGuardando || csvCountSel === 0 || !csvDefaults.cuentaId}
                style={{ flex: 1, fontSize: 13 }}>
                {csvGuardando
                  ? 'Guardando...'
                  : csvDefaults.cuentaId
                    ? 'Guardar ' + csvCountSel + ' movimientos · ' + mask(mxn(csvTotalSel))
                    : 'Selecciona la cuenta primero'}
              </button>
            </div>
          </div>
        )}

        {/* ── CSV done ── */}
        {csvStep === 'done' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-bg)', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
            <p style={{ color: 'var(--teal)', fontSize: 18, fontWeight: 600 }}>{csvGuardados} movimientos guardados</p>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>Importados desde CSV/XML</p>
            <button className="btn btn-secondary" onClick={resetCSV} style={{ marginTop: 24, width: '100%' }}>
              Importar otro archivo
            </button>
          </div>
        )}

      </>)}

      {/* ══════════════════════════════════════════════
          FOTO / PDF + CONCILIAR FLOW (sin cambios)
      ══════════════════════════════════════════════ */}
      {modo !== 'csv' && (<>

        {step === 'idle' && (<>
          <div style={{ background: 'var(--card)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['📸','Sube foto o PDF del estado de cuenta'],['🤖','Claude clasifica cada movimiento: gasto, ingreso o ignorar'],['✅','Revisas, ajustas y seleccionas cuáles guardar'],['💾','Se guardan todos de un jalón en Drive']].map(([icon, text]) => (
                <div key={icon} style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{text}</span>
                </div>
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
              <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>TOTAL GASTOS</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                {mask(mxn(transactions.filter(t => t.tipo !== 'ingreso').reduce((s, t) => s + (t.monto || 0), 0)))}
              </p>
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
                <p style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>PDF listo · {pdfImages.length} página{pdfImages.length !== 1 ? 's' : ''}</p>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Claude procesará cada página</p>
              </div>
            ) : (
              <img src={imageData} alt="preview" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 300, objectFit: 'cover' }} />
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={reset} style={{ flex: 1 }}>Cambiar</button>
              <button className="btn btn-primary" onClick={procesar} style={{ flex: 2 }}>
                {modo === 'importar' ? 'Extraer movimientos' : 'Conciliar con IA'}
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid var(--gold-bg)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ color: 'var(--text2)', fontSize: 15 }}>Claude está leyendo el estado de cuenta...</p>
            <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>{processingMsg || 'Extrayendo y clasificando movimientos...'}</p>
          </div>
        )}

        {step === 'results' && modo === 'importar' && resultados?.movimientos && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ background: 'var(--red-bg)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--red)', marginBottom: 2 }}>GASTOS</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>{mask(mxn(resultados.suma_total_gastos || 0))}</p>
              </div>
              <div style={{ background: 'var(--green-bg)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--teal)', marginBottom: 2 }}>INGRESOS</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)' }}>{mask(mxn(resultados.suma_total_ingresos || 0))}</p>
              </div>
              <div style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>TOTAL</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{resultados.movimientos.length}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {['todos','gasto','ingreso','ignorar'].map(t => (
                <button key={t} onClick={() => setFiltroTipo(t)}
                  style={{ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                    border: '0.5px solid ' + (filtroTipo === t ? 'var(--gold-dim)' : 'var(--border2)'),
                    background: filtroTipo === t ? 'var(--gold-bg)' : 'var(--card)',
                    color: filtroTipo === t ? 'var(--gold)' : 'var(--text3)' }}>
                  {t === 'todos' ? 'Todos' : t === 'gasto' ? '💸 Gastos' : t === 'ingreso' ? '💰 Ingresos' : '⏭️ Ignorar'}
                </button>
              ))}
            </div>

            <div style={{ background: 'var(--card)', borderRadius: 10, padding: '8px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{countSel} seleccionados · {resultados.periodo || ''}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>{mask(mxn(totalSel))}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 80 }}>
              {resultados.movimientos.map((mov, i) => {
                if (filtroTipo !== 'todos' && mov.tipo !== filtroTipo) return null
                const cat = CATEGORIES.find(c => c.id === mov.categoria)
                const sel = !!seleccionados[i]
                const tipoConf = TIPO_CONFIG[mov.tipo || 'gasto'] || TIPO_CONFIG.gasto
                return (
                  <div key={i} style={{ background: 'var(--card)', borderRadius: 12, padding: '10px 12px', border: '0.5px solid ' + (sel ? tipoConf.color + '50' : 'var(--border2)'), opacity: mov.tipo === 'ignorar' ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div onClick={() => toggleSeleccion(i)} style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: '1.5px solid ' + (sel ? tipoConf.color : 'var(--border)'), background: sel ? tipoConf.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        {sel && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
                      </div>
                      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: cat ? cat.color + '20' : tipoConf.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                        {cat?.icon || tipoConf.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mov.descripcion}</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{mov.fecha}</span>
                          <select value={mov.tipo || 'gasto'} onChange={e => { e.stopPropagation(); cambiarTipo(i, e.target.value) }} onClick={e => e.stopPropagation()}
                            style={{ fontSize: 10, padding: '1px 4px', borderRadius: 6, border: '0.5px solid ' + tipoConf.color, background: tipoConf.bg, color: tipoConf.color, cursor: 'pointer' }}>
                            <option value="gasto">💸 Gasto</option>
                            <option value="ingreso">💰 Ingreso</option>
                            <option value="ignorar">⏭️ Ignorar</option>
                          </select>
                          {mov.tipo === 'gasto' && (
                            <select value={mov.categoria || ''} onChange={e => { e.stopPropagation(); cambiarCategoria(i, e.target.value) }} onClick={e => e.stopPropagation()}
                              style={{ fontSize: 10, padding: '1px 4px', borderRadius: 6, border: '0.5px solid ' + (cat?.color || 'var(--border2)'), background: cat ? cat.color + '15' : 'var(--card)', color: cat?.color || 'var(--text3)', cursor: 'pointer' }}>
                              <option value="">— categoría —</option>
                              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </select>
                          )}
                          {mov.ya_registrado && <span style={{ fontSize: 10, color: 'var(--teal)', background: 'var(--green-bg)', padding: '1px 6px', borderRadius: 6 }}>ya registrado</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: tipoConf.color, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {mov.tipo === 'ingreso' ? '+' : ''}{mask(mxn(mov.monto))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ position: 'sticky', bottom: 80, paddingBottom: 8 }}>
              <button className="btn btn-primary" onClick={guardarSeleccionados} disabled={guardando || countSel === 0} style={{ width: '100%', fontSize: 14 }}>
                {guardando ? 'Guardando...' : 'Guardar ' + countSel + ' movimientos · ' + mask(mxn(totalSel))}
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
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>Sincronizados en Drive</p>
            <button className="btn btn-secondary" onClick={reset} style={{ marginTop: 24, width: '100%' }}>Importar otro estado</button>
          </div>
        )}

        {step === 'results' && resultados?.error && (
          <div style={{ background: 'var(--red-bg)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <p style={{ color: 'var(--red)', fontSize: 13 }}>Error: {resultados.error}</p>
            <button className="btn btn-secondary" onClick={reset} style={{ marginTop: 12 }}>Reintentar</button>
          </div>
        )}

      </>)}

    </div>
  )
}
