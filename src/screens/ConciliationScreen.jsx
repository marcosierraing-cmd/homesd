import { useState, useRef } from 'react'

export default function ConciliationScreen({ transactions }) {
  const fileRef = useRef()
  const [step, setStep] = useState('idle')
  const [results, setResults] = useState(null)
  const [imageData, setImageData] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImageData(ev.target.result)
      setStep('preview')
    }
    reader.readAsDataURL(file)
  }

  const processConciliation = async () => {
    setStep('processing')
    try {
      const response = await fetch('/api/conciliate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, transactions })
      })
      const data = await response.json()
      setResults(data)
      setStep('results')
    } catch {
      setStep('results')
      setResults({ conciliados: [], pendientes: [], fugas: [] })
    }
  }

  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

  return (
    <div className="screen" style={{ padding: '20px 20px 80px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Conciliación</h2>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
        Sube el corte semanal o estado de cuenta para cruzar gastos
      </p>

      {step === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input ref={fileRef} type="file" accept="image/*,application/pdf"
            style={{ display: 'none' }} onChange={handleFile} />

          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}
            style={{ width: '100%', height: 80, flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 24 }}>📸</span>
            <span>Foto de movimientos</span>
          </button>

          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}
            style={{ width: '100%', height: 70, flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <span style={{ fontSize: 13 }}>Subir PDF estado de cuenta</span>
          </button>

          <div style={{ padding: '14px', background: 'var(--card)', borderRadius: 12, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, marginBottom: 8 }}>
              ¿Cómo funciona?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['📷', 'Fotografías corte semanal o sube PDF del estado de cuenta'],
                ['🤖', 'Claude extrae todos los movimientos del banco'],
                ['🔄', 'Cruza automáticamente con tus registros'],
                ['🚨', 'Muestra fugas: movimientos sin ticket registrado'],
              ].map(([icon, text]) => (
                <div key={icon} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <div style={{ background: 'var(--card)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>GASTOS REGISTRADOS</p>
              <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--teal)' }}>{transactions.length}</p>
            </div>
            <div style={{ background: 'var(--card)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>TOTAL REGISTRADO</p>
              <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {mxn(transactions.reduce((s,t) => s + (t.monto||0), 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && imageData && (
        <div>
          <img src={imageData} alt="preview"
            style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 300, objectFit: 'cover' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setStep('idle')} style={{ flex: 1 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={processConciliation} style={{ flex: 2 }}>
              Conciliar con IA
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            border: '2px solid var(--gold-bg)', borderTopColor: 'var(--gold)',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
          }} />
          <p style={{ color: 'var(--text2)' }}>Analizando movimientos...</p>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>Claude está cruzando banco vs registros</p>
        </div>
      )}

      {step === 'results' && results && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            {[
              { label: 'Cuadran', count: results.conciliados?.length || 0, color: 'var(--teal)', bg: 'var(--green-bg)' },
              { label: 'Sin ticket', count: results.fugas?.length || 0, color: 'var(--red)', bg: 'var(--red-bg)' },
              { label: 'Pendientes', count: results.pendientes?.length || 0, color: 'var(--amber)', bg: 'var(--amber-bg)' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.count}</p>
                <p style={{ fontSize: 10, color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>

          {(results.fugas?.length || 0) > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--red)', fontWeight: 500, marginBottom: 8 }}>
                Fugas sin ticket registrado
              </p>
              {results.fugas.map((f, i) => (
                <div key={i} style={{ background: 'var(--red-bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{f.descripcion}</span>
                    <span style={{ fontSize: 13, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{mxn(f.monto)}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{f.fecha}</span>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-secondary" onClick={() => { setStep('idle'); setResults(null) }}
            style={{ width: '100%' }}>
            Nueva conciliación
          </button>
        </div>
      )}
    </div>
  )
}
