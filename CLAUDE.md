# HOMESD

## Stack
- React + Vite (PWA) + Supabase + Vercel
- URL: https://homesd.vercel.app
- Auth: VITE_APP_PASSWORD + selector Marco/Nayeli

## Supabase
- Tablas: homesd_transactions, homesd_logros, homesd_budgets, homesd_subcategories
- RLS desactivado, Realtime activo en homesd_transactions
- Fecha siempre: new Date(y, m-1, d, 12, 0, 0).toISOString()
- Empty strings → null antes de upsert en columnas numéricas

## API serverless (Vercel)
- api/analyze.js → extrae datos de ticket con IA, valida x-api-token ✅
- api/import.js → importa CSV/XML de estados de cuenta, FALTA x-api-token ❌
- api/conciliate.js → conciliación bancaria con IA

## Cuentas soportadas
Scotiabank débito, Nu Bank crédito, BBVA *2447 débito, TC Scotia, TC BBVA, Efectivo

## Principios
- Supabase única fuente de verdad
- Sin fallback hardcodeado en keys
- Siempre lógica antes de código

## Pendientes
- api/import.js → agregar validación x-api-token
- Extractor HTML independiente de PDFs (BBVA, Scotiabank, Nu) → CSV/XML
