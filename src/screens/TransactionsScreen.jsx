import { useState, useMemo } from 'react'
import TransactionCard from '../components/TransactionCard.jsx'
import { CATEGORIES } from '../data/budget.js'

export default function TransactionsScreen({ transactions, onDelete }) {
  const [filtrocat, setFiltrocat] = useState('all')
  const [filtromes, setFiltromes] = useState(new Date().getMonth())

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.timestamp)
      const matchMes = d.getMonth() === filtromes
      const matchCat = filtrocat === 'all' || t.categoriaId === filtrocat
      return matchMes && matchCat
    })
  }, [transactions, filtrocat, filtromes])

  const totalFiltrado = filtered.reduce((s, t) => s + (t.monto || 0), 0)
  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX')

  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(t => {
      const d = new Date(t.timestamp)
      const key = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return groups
  }, [filtered])

  return (
    <div className="screen" style={{ padding: '20px 0 80px' }}>
      <div style={{ padding: '0 20px 16px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Gastos</h2>

        {/* Filtro mes */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
          {meses.map((m, i) => (
            <button key={i} onClick={() => setFiltromes(i)}
              style={{
                flexShrink: 0, padding: '6px 14px',
                borderRadius: 20, border: 'none', cursor: 'pointer',
                background: filtromes === i ? 'var(--gold)' : 'var(--card)',
                color: filtromes === i ? '#0A1628' : 'var(--text3)',
                fontSize: 12, fontWeight: filtromes === i ? 600 : 400,
              }}>
              {m}
            </button>
          ))}
        </div>

        {/* Filtro categoría */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <button onClick={() => setFiltrocat('all')}
            style={{
              flexShrink: 0, padding: '5px 12px',
              borderRadius: 16,
              border: `0.5px solid ${filtrocat === 'all' ? 'var(--gold-dim)' : 'var(--border2)'}`,
              background: filtrocat === 'all' ? 'var(--gold-bg)' : 'var(--card)',
              color: filtrocat === 'all' ? 'var(--gold)' : 'var(--text3)',
              fontSize: 11, cursor: 'pointer', fontWeight: 500,
            }}>
            Todos
          </button>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setFiltrocat(c.id)}
              style={{
                flexShrink: 0, padding: '5px 12px',
                borderRadius: 16,
                border: `0.5px solid ${filtrocat === c.id ? c.color + '80' : 'var(--border2)'}`,
                background: filtrocat === c.id ? c.color + '18' : 'var(--card)',
                color: filtrocat === c.id ? c.color : 'var(--text3)',
                fontSize: 11, cursor: 'pointer',
              }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div style={{
        margin: '0 16px 16px',
        padding: '12px 16px',
        background: 'var(--card)',
        borderRadius: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {filtered.length} transacciones
        </span>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
          {mxn(totalFiltrado)}
        </span>
      </div>

      {/* Lista agrupada por día */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
            <p style={{ fontSize: 14 }}>Sin gastos registrados</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Usa el botón de cámara para registrar</p>
          </div>
        ) : (
          Object.entries(grouped).map(([fecha, txs]) => (
            <div key={fecha}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 4px 6px' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{fecha}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                  {mxn(txs.reduce((s, t) => s + t.monto, 0))}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {txs.map(tx => (
                  <TransactionCard
                    key={tx.id}
                    tx={tx}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
