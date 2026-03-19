import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles/app.css'
import { useStorage } from './hooks/useStorage.js'
import { clearAccessToken } from './services/driveService.js'
import { PrivacyProvider } from './context/PrivacyContext.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import DashboardScreen from './screens/DashboardScreen.jsx'
import CaptureScreen from './screens/CaptureScreen.jsx'
import TransactionsScreen from './screens/TransactionsScreen.jsx'
import ConciliationScreen from './screens/ConciliationScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'
import BudgetEditorScreen from './screens/BudgetEditorScreen.jsx'
import BottomNav from './components/BottomNav.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const {
    transactions,
    addTransaction,
    deleteTransaction,
    budgetOverrides,
    updateBudgetOverride,
    refresh,
  } = useStorage()

  const logout = () => { clearAccessToken(); setUser(null) }
  const handleLogin = (userData) => { setUser(userData); setTimeout(() => refresh(), 500) }

  // Actualiza una clave específica dentro de budgetOverrides
  const handleUpdateBudgetOverride = async (key, value) => {
    await updateBudgetOverride(key, value)
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />

  return (
    <PrivacyProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/capture" replace />} />
          <Route path="/dashboard" element={<DashboardScreen transactions={transactions} user={user} budgetOverrides={budgetOverrides} />} />
          <Route path="/capture" element={<CaptureScreen onAdd={addTransaction} user={user} />} />
          <Route path="/transactions" element={<TransactionsScreen transactions={transactions} onDelete={deleteTransaction} />} />
         <Route path="/conciliation" element={<ConciliationScreen transactions={transactions} onAdd={addTransaction} />} />
          <Route path="/settings" element={<SettingsScreen user={user} onLogout={logout} budgetOverrides={budgetOverrides} onUpdateBudgetOverride={handleUpdateBudgetOverride} />} />
          <Route path="/budget-editor" element={<BudgetEditorScreen budgetOverrides={budgetOverrides} onUpdateBudgetOverride={handleUpdateBudgetOverride} />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </PrivacyProvider>
  )
}
