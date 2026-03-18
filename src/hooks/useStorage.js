import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'homesd_v1'

const defaultData = {
  user: null,
  transactions: [],
  budgetOverrides: {},
  settings: {
    notificationsEnabled: false,
    alertThreshold: 0.8,
  }
}

export function useStorage() {
  const [data, setDataState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? { ...defaultData, ...JSON.parse(stored) } : defaultData
    } catch { return defaultData }
  })

  const setData = useCallback((updater) => {
    setDataState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const addTransaction = useCallback((tx) => {
    const newTx = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...tx
    }
    setData(prev => ({ ...prev, transactions: [newTx, ...prev.transactions] }))
    return newTx
  }, [setData])

  const updateTransaction = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, ...updates } : t)
    }))
  }, [setData])

  const deleteTransaction = useCallback((id) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }))
  }, [setData])

  const setUser = useCallback((user) => {
    setData(prev => ({ ...prev, user }))
  }, [setData])

  const logout = useCallback(() => {
    setData(prev => ({ ...prev, user: null }))
  }, [setData])

  return {
    data,
    setData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setUser,
    logout,
    transactions: data.transactions,
    user: data.user,
    settings: data.settings,
  }
}

export function getQuincenaGastado(transactions, categoriaId, subcategoriaId, quincena, mes) {
  return transactions
    .filter(t => {
      const d = new Date(t.timestamp)
      const tMes = d.getMonth()
      const tQ = d.getDate() <= 15 ? 1 : 2
      const mesActual = new Date().getMonth()
      return t.categoriaId === categoriaId
        && (!subcategoriaId || t.subcategoriaId === subcategoriaId)
        && tMes === (mes ?? mesActual)
        && tQ === quincena
    })
    .reduce((sum, t) => sum + (t.monto || 0), 0)
}

export function getMesGastado(transactions, categoriaId, mes) {
  return transactions
    .filter(t => {
      const d = new Date(t.timestamp)
      const mesActual = new Date().getMonth()
      return t.categoriaId === categoriaId && d.getMonth() === (mes ?? mesActual)
    })
    .reduce((sum, t) => sum + (t.monto || 0), 0)
}
