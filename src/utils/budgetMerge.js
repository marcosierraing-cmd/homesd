/**
 * budgetMerge.js
 * Combina el presupuesto base (budget.js) con los overrides guardados en Drive.
 * Los overrides tienen prioridad sobre los valores base.
 *
 * Estructura de budgetOverrides en Drive:
 * {
 *   subcategories: {
 *     "prestamo_scotia": { q1: 15000, q2: 0, name: "..." }
 *   },
 *   newSubcategories: {
 *     "alimentacion": [
 *       { id: "nueva_sub", name: "Nueva", q1: 500, q2: 500, type: "variable", obs: "" }
 *     ]
 *   },
 *   newCategories: [
 *     { id: "nueva_cat", name: "...", icon: "🏷️", color: "#FF6B6B", subcategories: [] }
 *   ],
 *   hiddenSubcategories: ["tc_bbva", "tanda"],
 * }
 */

import { CATEGORIES } from '../data/budget.js'

export function mergeBudget(budgetOverrides = {}) {
  const {
    subcategories: subOverrides = {},
    newSubcategories = {},
    newCategories = [],
    hiddenSubcategories = [],
  } = budgetOverrides

  // Clonar categorías base y aplicar overrides
  const merged = CATEGORIES.map(cat => {
    const mergedSubs = cat.subcategories
      .filter(sub => !hiddenSubcategories.includes(sub.id))
      .map(sub => {
        const override = subOverrides[sub.id]
        return override ? { ...sub, ...override } : sub
      })

    // Agregar subcategorías nuevas a esta categoría
    const extras = (newSubcategories[cat.id] || [])
      .filter(sub => !hiddenSubcategories.includes(sub.id))

    return { ...cat, subcategories: [...mergedSubs, ...extras] }
  })

  // Agregar categorías completamente nuevas
  const extras = newCategories.filter(cat => !hiddenSubcategories.includes(cat.id))

  return [...merged, ...extras]
}

export function calcularTotalQMerged(quincena, budgetOverrides = {}) {
  const categories = mergeBudget(budgetOverrides)
  let total = 0
  categories.forEach(cat => {
    cat.subcategories.forEach(sub => {
      if (sub.type === 'liquidado' || sub.type === 'prepagado' || sub.type === 'pendiente') return
      total += quincena === 1 ? (sub.q1 || 0) : (sub.q2 || 0)
    })
  })
  return total
}
