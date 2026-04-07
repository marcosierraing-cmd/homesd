export const BUDGET_VERSION = "2026-03"
export const INGRESO_QUINCENAL = 47765
export const INGRESO_MENSUAL = 95530

export const CUENTAS = [
  { id: "scotiabank", name: "Scotiabank", color: "#E24B4A", icon: "S" },
  { id: "nu", name: "Nu Bank", color: "#7F77DD", icon: "N" },
  { id: "bbva", name: "BBVA *2447", color: "#004999", icon: "B" },
  { id: "efectivo", name: "Efectivo", color: "#888780", icon: "E" },
  { id: "tc_scotia", name: "TC Scotia", color: "#E24B4A", icon: "💳S" },
  { id: "tc_bbva", name: "TC BBVA", color: "#004999", icon: "💳B" },
]

export const USUARIOS = [
  { id: "marco", name: "Marco", initials: "MA", color: "#DFCA8F" },
  { id: "nayeli", name: "Nayeli", initials: "NI", color: "#5DCAA5" },
]

export const CATEGORIES = [
  {
    id: "deuda", name: "Deuda", color: "#E24B4A", icon: "💳",
    subcategories: [
      { id: "prestamo_scotia", name: "Préstamo Scotiabank", day: 3, q1: 14650, q2: 0, type: "fijo", obs: "Débito auto día 3" },
      { id: "tc_scotia_min", name: "TC Scotia *6201 mínimo", day: 5, q1: 2474, q2: 0, type: "fijo", obs: "Límite día 5, corte día 17" },
      { id: "tc_scotia_abono", name: "TC Scotia *6201 abono", day: 28, q1: 0, q2: 5743, type: "fijo", obs: "Abono extra — acelera liquidación" },
      { id: "peugeot", name: "Peugeot 3008 STM", day: 5, q1: 16045, q2: 0, type: "fijo", obs: "CONFIRMADO día 5 · 29 rentas" },
      { id: "tracker", name: "GM Tracker", day: 11, q1: 11034, q2: 0, type: "fijo", obs: "CONFIRMADO día 11 · 27 rentas · próximo 11-abr" },
      { id: "tc_bbva", name: "TC BBVA *2251", day: 0, q1: 0, q2: 0, type: "liquidado", obs: "LIQUIDADA marzo 2026 ✓ — $4,950/mes menos" },
    ]
  },
  {
    id: "educacion", name: "Educación", color: "#378ADD", icon: "📚",
    subcategories: [
      { id: "imex", name: "Colegiaturas IMEX (Emi + André)", day: 10, q1: 17028, q2: 0, type: "fijo", obs: "Cargo TC Scotia · pago día 5 mes sig." },
    ]
  },
  {
    id: "servicios", name: "Servicios", color: "#7F77DD", icon: "📡",
    subcategories: [
      { id: "att", name: "AT&T — 2 líneas plan", day: 10, q1: 2726, q2: 0, type: "fijo", obs: "Confirmado $2,726/mes" },
      { id: "telmex", name: "Telmex internet", day: 12, q1: 1265, q2: 0, type: "fijo", obs: "Pago mensual fijo" },
      { id: "suscripciones", name: "Suscripciones (Claude+PS+MS)", day: 5, q1: 1200, q2: 0, type: "fijo", obs: "Todas caen días 2-7" },
      { id: "telcel", name: "Telcel prepago 2 líneas", day: 21, q1: 0, q2: 600, type: "fijo", obs: "$300 × 2 · Q2" },
    ]
  },
  {
    id: "vivienda", name: "Vivienda", color: "#1D9E75", icon: "🏠",
    subcategories: [
      { id: "renta", name: "Renta mensual", day: 1, q1: 0, q2: 0, type: "prepagado", obs: "PREPAGADA abr-may-jun ✓ · Retoma $22,000 Q1 julio" },
    ]
  },
  {
    id: "hogar", name: "Hogar", color: "#EF9F27", icon: "🧹",
    subcategories: [
      { id: "luis_q1", name: "Luis Arturo — sem 1+2", day: 0, q1: 3600, q2: 0, type: "fijo", obs: "$1,800 × 2 martes · Q1" },
      { id: "luis_q2", name: "Luis Arturo — sem 3+4", day: 0, q1: 0, q2: 3600, type: "fijo", obs: "$1,800 × 2 martes · Q2" },
    ]
  },
  {
    id: "alimentacion", name: "Alimentación", color: "#D85A30", icon: "🛒",
    subcategories: [
      { id: "coyotl", name: "Coyotl — carnicería", day: 0, q1: 1500, q2: 1500, type: "variable", obs: "SPEI diario Banamex · ~$3,000/mes real" },
      { id: "oscar", name: "Oscar Cano — fruta/verdura", day: 0, q1: 1150, q2: 1150, type: "variable", obs: "SPEI diario BBVA · ~$2,292/mes real" },
      { id: "super", name: "Supermercado", day: 0, q1: 1000, q2: 1000, type: "variable", obs: "Costco / La Comer / Frescura · techo $2,000/mes" },
      { id: "comidas_nayeli", name: "Comidas Nayeli trabajo", day: 0, q1: 1200, q2: 1200, type: "variable", obs: "Pendiente confirmar promedio real" },
    ]
  },
  {
    id: "restaurantes", name: "Restaurantes", color: "#BA7517", icon: "🍽️",
    subcategories: [
      { id: "rest_q1", name: "Salidas familiares Q1", day: 0, q1: 750, q2: 0, type: "variable", obs: "Techo $1,500/mes total — respetar" },
      { id: "rest_q2", name: "Salidas familiares Q2", day: 0, q1: 0, q2: 750, type: "variable", obs: "Segunda mitad del mes" },
    ]
  },
  {
    id: "transporte", name: "Transporte", color: "#888780", icon: "⛽",
    subcategories: [
      { id: "gas_blanca_q1", name: "Gasolina 3008 Blanca Q1", day: 0, q1: 600, q2: 0, type: "variable", obs: "Techo $1,200/mes · primera mitad" },
      { id: "gas_blanca_q2", name: "Gasolina 3008 Blanca Q2", day: 0, q1: 0, q2: 600, type: "variable", obs: "Segunda mitad" },
      { id: "gas_roja_q1", name: "Gasolina Tracker Roja Q1", day: 0, q1: 400, q2: 0, type: "variable", obs: "Techo $800/mes · primera mitad" },
      { id: "gas_roja_q2", name: "Gasolina Tracker Roja Q2", day: 0, q1: 0, q2: 400, type: "variable", obs: "Segunda mitad" },
    ]
  },
  {
    id: "salud", name: "Salud", color: "#5DCAA5", icon: "🏥",
    subcategories: [
      { id: "indira", name: "Consulta Indira ($2,150)", day: 0, q1: 2150, q2: 0, type: "fijo", obs: "Pendiente confirmar si es mensual o quincenal" },
    ]
  },
  {
    id: "social", name: "Social", color: "#AFA9EC", icon: "👥",
    subcategories: [
      { id: "tanda", name: "Tanda", day: 0, q1: 0, q2: 0, type: "pendiente", obs: "Pendiente confirmar monto y día" },
    ]
  },
  {
    id: "hijos", name: "Hijos", color: "#B5D4F4", icon: "👦",
    subcategories: [
      { id: "emi_q1", name: "Quincena Emiliano 1ª", day: 3, q1: 1000, q2: 0, type: "fijo", obs: "Alimentos · Q1" },
      { id: "andre_q1", name: "Quincena André 1ª", day: 3, q1: 800, q2: 0, type: "fijo", obs: "Alimentos · Q1" },
      { id: "emi_q2", name: "Quincena Emiliano 2ª", day: 17, q1: 0, q2: 1000, type: "fijo", obs: "Alimentos · Q2" },
      { id: "andre_q2", name: "Quincena André 2ª", day: 17, q1: 0, q2: 800, type: "fijo", obs: "Alimentos · Q2" },
    ]
  },
  {
    id: "imprevistos", name: "Imprevistos", color: "#5F5E5A", icon: "🔧",
    subcategories: [
      { id: "misc_q1", name: "Misceláneos Q1", day: 0, q1: 500, q2: 0, type: "variable", obs: "Techo $1,000/mes total" },
      { id: "misc_q2", name: "Misceláneos Q2", day: 0, q1: 0, q2: 500, type: "variable", obs: "Segunda mitad" },
    ]
  },
]

export const REGLAS_AUTOASIGNACION = [
  { patron: /coyotl/i, categoria: "alimentacion", subcategoria: "coyotl" },
  { patron: /oscar.cano|grupo.mic/i, categoria: "alimentacion", subcategoria: "oscar" },
  { patron: /la.comer|costco|walmart|ciudad.market|frescura|canastos|barrio.cascata/i, categoria: "alimentacion", subcategoria: "super" },
  { patron: /luis.arturo.mendoza/i, categoria: "hogar", subcategoria: "luis_q1" },
  { patron: /dominica|brasa.regia|sal.rosa|umaku|taqueria|restaurant|rest./i, categoria: "restaurantes", subcategoria: "rest_q1" },
  { patron: /gasol|gas.sinergia|est.ser.san.luis|costco.gas/i, categoria: "transporte", subcategoria: "gas_blanca_q1" },
  { patron: /att|at&t/i, categoria: "servicios", subcategoria: "att" },
  { patron: /telmex/i, categoria: "servicios", subcategoria: "telmex" },
  { patron: /telcel|recarga/i, categoria: "servicios", subcategoria: "telcel" },
  { patron: /claude|playstation|microsoft|roku|amazon|stripe/i, categoria: "servicios", subcategoria: "suscripciones" },
  { patron: /gm.financial|840005229660868/i, categoria: "deuda", subcategoria: "tracker" },
  { patron: /stm.financial|peugeot/i, categoria: "deuda", subcategoria: "peugeot" },
  { patron: /emiliano.sierra/i, categoria: "hijos", subcategoria: "emi_q1" },
  { patron: /andr[eé].sierra/i, categoria: "hijos", subcategoria: "andre_q1" },
  { patron: /scotiabank.*prestamo|prestamo.*scotiabank/i, categoria: "deuda", subcategoria: "prestamo_scotia" },
  { patron: /farmacia|farmacias/i, categoria: "imprevistos", subcategoria: "misc_q1" },
  { patron: /kigo|parkimovi|parco|estacionamiento/i, categoria: "transporte", subcategoria: "gas_blanca_q1" },
]

export function getQuincenaActual() {
  return new Date().getDate() <= 15 ? 1 : 2
}

export function getMesActual() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return meses[new Date().getMonth()]
}

export function calcularTotalQ(quincena) {
  let total = 0
  CATEGORIES.forEach(cat => {
    cat.subcategories.forEach(sub => {
      if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return
      total += quincena === 1 ? sub.q1 : sub.q2
    })
  })
  return total
}

export function autoAsignar(descripcion) {
  if (!descripcion) return null
  for (const regla of REGLAS_AUTOASIGNACION) {
    if (regla.patron.test(descripcion)) {
      return { categoria: regla.categoria, subcategoria: regla.subcategoria }
    }
  }
  return null
}
