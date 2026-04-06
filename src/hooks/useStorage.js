import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://dhdsmapiukaouyidyjzu.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zPfFFQZy7qQouL3E5l3Pwg__Ysn5TUE'
);

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function useStorage() {
  const [transactions, setTransactions] = useState([]);
  const [logros, setLogros] = useState([]);
  const [budgetOverrides, setBudgetOverrides] = useState({});
  const [budgets, setBudgets] = useState({});
  const [subcategories, setSubcategories] = useState({}); // { subcategory_id: name }
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', dn);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn); };
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('homesd_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const mapped = (data || []).map(t => ({
        ...t,
        categoriaId: t.categoria_id,
        subcategoriaId: t.subcategoria_id,
        cuentaId: t.cuenta_id,
        usuarioId: t.usuario_id,
        modoCaptura: t.modo_captura,
        createdAt: t.created_at,
      }));
      setTransactions(mapped);
    } catch (err) { setError(err.message); }
  }, []);

  const fetchLogros = useCallback(async () => {
    try {
      const mesActual = new Date().getMonth();
      const anioActual = new Date().getFullYear();
      const { data } = await supabase
        .from('homesd_logros').select('*')
        .eq('mes', mesActual).eq('anio', anioActual).eq('activo', true);
      setLogros(data || []);
    } catch {}
  }, []);

  const fetchBudgets = useCallback(async (yearMonth) => {
    try {
      const { data } = await supabase.from('homesd_budgets').select('*').eq('year_month', yearMonth);
      const map = {};
      (data || []).forEach(row => { map[row.category_id] = { q1: row.q1_budget || 0, q2: row.q2_budget || 0 }; });
      setBudgets(map);
    } catch { setBudgets({}); }
  }, []);

  const fetchSubcategories = useCallback(async (yearMonth) => {
    try {
      const { data } = await supabase.from('homesd_subcategories').select('*').eq('year_month', yearMonth);
      const map = {};
      (data || []).forEach(row => { map[row.subcategory_id] = row.name; });
      setSubcategories(map);
    } catch { setSubcategories({}); }
  }, []);

  const saveBudget = useCallback(async (yearMonth, categoryId, q1, q2) => {
    try {
      await supabase.from('homesd_budgets').upsert(
        { year_month: yearMonth, category_id: categoryId, q1_budget: q1, q2_budget: q2 },
        { onConflict: 'year_month,category_id' }
      );
      setBudgets(prev => ({ ...prev, [categoryId]: { q1, q2 } }));
    } catch (err) { setError(err.message); }
  }, []);

  const saveSubcategoryName = useCallback(async (yearMonth, subcategoryId, categoryId, name) => {
    try {
      await supabase.from('homesd_subcategories').upsert(
        { subcategory_id: subcategoryId, category_id: categoryId, name, year_month: yearMonth },
        { onConflict: 'subcategory_id,year_month' }
      );
      setSubcategories(prev => ({ ...prev, [subcategoryId]: name }));
    } catch (err) { setError(err.message); }
  }, []);

  const copyBudgetFromPrevMonth = useCallback(async (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    try {
      const { data } = await supabase.from('homesd_budgets').select('*').eq('year_month', prev);
      if (!data?.length) return false;
      await supabase.from('homesd_budgets').upsert(
        data.map(r => ({ year_month: yearMonth, category_id: r.category_id, q1_budget: r.q1_budget, q2_budget: r.q2_budget })),
        { onConflict: 'year_month,category_id' }
      );
      await fetchBudgets(yearMonth);
      return true;
    } catch { return false; }
  }, [fetchBudgets]);

  const copySubcategoriesFromPrevMonth = useCallback(async (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    try {
      const { data } = await supabase.from('homesd_subcategories').select('*').eq('year_month', prev);
      if (!data?.length) return false;
      await supabase.from('homesd_subcategories').upsert(
        data.map(r => ({ subcategory_id: r.subcategory_id, category_id: r.category_id, name: r.name, year_month: yearMonth })),
        { onConflict: 'subcategory_id,year_month' }
      );
      await fetchSubcategories(yearMonth);
      return true;
    } catch { return false; }
  }, [fetchSubcategories]);

  useEffect(() => { fetchTransactions(); fetchLogros(); }, [fetchTransactions, fetchLogros]);
  useEffect(() => { fetchBudgets(selectedMonth); fetchSubcategories(selectedMonth); }, [selectedMonth, fetchBudgets, fetchSubcategories]);

  useEffect(() => {
    const channel = supabase.channel('homesd_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homesd_transactions' }, () => fetchTransactions())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchTransactions]);

  const addTransaction = useCallback(async (transaction) => {
    const isArray = Array.isArray(transaction);
    const items = isArray ? transaction : [transaction];
    const rows = items.map(t => ({
      id: t.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: t.timestamp || new Date().toISOString(),
      monto: parseFloat(t.monto) || 0,
      tipo: t.tipo || 'gasto',
      descripcion: t.descripcion || '',
      categoria_id: t.categoriaId || t.categoria_id || '',
      subcategoria_id: t.subcategoriaId || t.subcategoria_id || '',
      cuenta_id: t.cuentaId || t.cuenta_id || '',
      usuario_id: t.usuarioId || t.usuario_id || 'marco',
      nota: t.nota || '',
      modo_captura: t.modoCaptura || t.modo_captura || 'manual',
    }));
    setSyncing(true);
    try {
      const { data, error } = await supabase.from('homesd_transactions').insert(rows).select();
      if (error) throw error;
      await fetchTransactions();
      return isArray ? data : data[0];
    } catch (err) { setError(err.message); }
    finally { setSyncing(false); }
  }, [fetchTransactions]);

  const deleteTransaction = useCallback(async (id) => {
    setSyncing(true);
    try {
      await supabase.from('homesd_transactions').delete().eq('id', id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) { setError(err.message); }
    finally { setSyncing(false); }
  }, []);

  const updateTransaction = useCallback(async (id, changes) => {
    setSyncing(true);
    try {
      await supabase.from('homesd_transactions').update({
        ...changes,
        categoria_id: changes.categoriaId || changes.categoria_id,
        subcategoria_id: changes.subcategoriaId || changes.subcategoria_id,
        cuenta_id: changes.cuentaId || changes.cuenta_id,
        usuario_id: changes.usuarioId || changes.usuario_id,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      await fetchTransactions();
    } catch (err) { setError(err.message); }
    finally { setSyncing(false); }
  }, [fetchTransactions]);

  const updateBudgetOverride = useCallback(async (key, value) => {
    setBudgetOverrides(prev => ({ ...prev, [key]: value }));
  }, []);

  const addLogro = useCallback(async (texto) => {
    const mes = new Date().getMonth();
    const anio = new Date().getFullYear();
    const { data } = await supabase.from('homesd_logros').insert({ texto, mes, anio }).select().single();
    if (data) setLogros(prev => [...prev, data]);
  }, []);

  const deleteLogro = useCallback(async (id) => {
    await supabase.from('homesd_logros').update({ activo: false }).eq('id', id);
    setLogros(prev => prev.filter(l => l.id !== id));
  }, []);

  return {
    transactions, logros, budgetOverrides,
    budgets, subcategories,
    selectedMonth, setSelectedMonth,
    saveBudget, copyBudgetFromPrevMonth,
    saveSubcategoryName, copySubcategoriesFromPrevMonth,
    syncing, error, online,
    hasPendingChanges: false,
    lastSync: new Date().toISOString(),
    addTransaction, deleteTransaction, updateTransaction,
    updateBudgetOverride, addLogro, deleteLogro,
    refresh: fetchTransactions,
  };
}

export function getQuincenaGastado(transactions, catId = null, subId = null, quincena, mes, anio) {
  return transactions
    .filter(t => {
      if (t.tipo === 'ingreso') return false;
      const fecha = new Date(t.timestamp || t.createdAt || t.created_at);
      const tQ = fecha.getDate() <= 15 ? 1 : 2;
      const matchAnio = anio ? fecha.getFullYear() === anio : true;
      return matchAnio && fecha.getMonth() === mes && tQ === quincena
        && (!catId || t.categoriaId === catId || t.categoria_id === catId)
        && (!subId || t.subcategoriaId === subId || t.subcategoria_id === subId);
    })
    .reduce((sum, t) => sum + (Number(t.monto) || 0), 0);
}

export function getMesGastado(transactions, catId = null, mes, anio) {
  return transactions
    .filter(t => {
      if (t.tipo === 'ingreso') return false;
      const fecha = new Date(t.timestamp || t.createdAt || t.created_at);
      const matchAnio = anio ? fecha.getFullYear() === anio : true;
      return matchAnio && fecha.getMonth() === mes
        && (!catId || t.categoriaId === catId || t.categoria_id === catId);
    })
    .reduce((sum, t) => sum + (Number(t.monto) || 0), 0);
}
