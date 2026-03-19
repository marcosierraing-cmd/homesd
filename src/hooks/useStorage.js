import { useState, useEffect, useCallback, useRef } from 'react';
import { readFromDrive, writeToDrive, getAccessToken } from '../services/driveService';

const LOCAL_CACHE_KEY = 'homesd_cache_v2';
const SYNC_INTERVAL_MS = 30_000;

const DEFAULT_DATA = {
  transactions: [],
  budgetOverrides: {},
  lastSync: '',
};

function loadCache() {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_DATA;
  } catch {
    return DEFAULT_DATA;
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function useStorage() {
  const [data, setData] = useState(loadCache);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const pendingRef = useRef(false);

  useEffect(() => {
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', dn);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', dn);
    };
  }, []);

  const fetchFromDrive = useCallback(async ({ silent = false } = {}) => {
    if (!online || !getAccessToken()) return;
    if (!silent) setSyncing(true);
    try {
      const driveData = await readFromDrive();
      setData(driveData);
      saveCache(driveData);
      setError(null);
    } catch (err) {
      if (err.message === 'TOKEN_EXPIRED') {
        setError('Sesión expirada — vuelve a iniciar sesión');
      } else {
        setError(err.message);
      }
    } finally {
      if (!silent) setSyncing(false);
    }
  }, [online]);

  const saveToDrive = useCallback(async (newData) => {
    setData(newData);
    saveCache(newData);

    if (!online || !getAccessToken()) {
      pendingRef.current = true;
      return;
    }

    setSyncing(true);
    try {
      const lastSync = await writeToDrive(newData);
      const updated = { ...newData, lastSync };
      setData(updated);
      saveCache(updated);
      pendingRef.current = false;
      setError(null);
    } catch (err) {
      setError(err.message);
      pendingRef.current = true;
    } finally {
      setSyncing(false);
    }
  }, [online]);

  useEffect(() => {
    if (online && pendingRef.current && getAccessToken()) {
      saveToDrive(data);
    }
  }, [online]); // eslint-disable-line

  useEffect(() => {
    fetchFromDrive();
  }, []); // eslint-disable-line

  useEffect(() => {
    const id = setInterval(() => fetchFromDrive({ silent: true }), SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchFromDrive]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchFromDrive({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchFromDrive]);

  const addTransaction = useCallback(async (transaction) => {
    const newTx = {
      ...transaction,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    await saveToDrive({
      ...data,
      transactions: [newTx, ...data.transactions],
    });
    return newTx;
  }, [data, saveToDrive]);

  const deleteTransaction = useCallback(async (id) => {
    await saveToDrive({
      ...data,
      transactions: data.transactions.filter(t => t.id !== id),
    });
  }, [data, saveToDrive]);

  const updateTransaction = useCallback(async (id, changes) => {
    await saveToDrive({
      ...data,
      transactions: data.transactions.map(t =>
        t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t
      ),
    });
  }, [data, saveToDrive]);

  const updateBudgetOverride = useCallback(async (category, amount) => {
    await saveToDrive({
      ...data,
      budgetOverrides: { ...data.budgetOverrides, [category]: amount },
    });
  }, [data, saveToDrive]);

  return {
    transactions: data.transactions ?? [],
    budgetOverrides: data.budgetOverrides ?? {},
    lastSync: data.lastSync ?? '',
    syncing,
    error,
    online,
    hasPendingChanges: pendingRef.current,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    updateBudgetOverride,
    refresh: fetchFromDrive,
  };
}
  const saveToDrive = useCallback(async (newData) => {
    setData(newData);
    saveCache(newData);

    if (!online || !getAccessToken()) {
      pendingRef.current = true;
      return;
    }

    setSyncing(true);
    try {
      const lastSync = await writeToDrive(newData);
      const updated = { ...newData, lastSync };
      setData(updated);
      saveCache(updated);
      pendingRef.current = false;
      setError(null);
    } catch (err) {
      console.warn('[useStorage] save:', err.message);
      setError(err.message);
      pendingRef.current = true;
    } finally {
      setSyncing(false);
    }
  }, [online]);

  useEffect(() => {
    if (online && pendingRef.current && getAccessToken()) {
      saveToDrive(data);
    }
  }, [online]); // eslint-disable-line

  useEffect(() => {
    fetchFromDrive();
  }, []); // eslint-disable-line

  useEffect(() => {
    const id = setInterval(() => fetchFromDrive({ silent: true }), SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchFromDrive]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchFromDrive({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchFromDrive]);

  const addTransaction = useCallback(async (transaction) => {
    const newTx = {
      ...transaction,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    await saveToDrive({
      ...data,
      transactions: [newTx, ...data.transactions],
    });
    return newTx;
  }, [data, saveToDrive]);

  const deleteTransaction = useCallback(async (id) => {
    await saveToDrive({
      ...data,
      transactions: data.transactions.filter(t => t.id !== id),
    });
  }, [data, saveToDrive]);

  const updateTransaction = useCallback(async (id, changes) => {
    await saveToDrive({
      ...data,
      transactions: data.transactions.map(t =>
        t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t
      ),
    });
  }, [data, saveToDrive]);

  const updateBudgetOverride = useCallback(async (category, amount) => {
    await saveToDrive({
      ...data,
      budgetOverrides: { ...data.budgetOverrides, [category]: amount },
    });
  }, [data, saveToDrive]);

  return {
    transactions: data.transactions ?? [],
    budgetOverrides: data.budgetOverrides ?? {},
    lastSync: data.lastSync ?? '',
    syncing,
    error,
    online,
    hasPendingChanges: pendingRef.current,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    updateBudgetOverride,
    refresh: fetchFromDrive,
  };
}
