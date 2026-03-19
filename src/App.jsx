import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles/app.css'
import { useStorage } from './hooks/useStorage.js'
import { clearAccessToken } from './services/driveService.js'
import LoginScreen from './screens/LoginScreen.jsx'
import DashboardScreen from './screens/DashboardScreen.jsx'
import CaptureScreen from './screens/CaptureScreen.jsx'
import TransactionsScreen from './screens/TransactionsScreen.jsx'
import ConciliationScreen from './screens/ConciliationScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'
import BottomNav from './components/BottomNav.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    budgetOverrides,
    updateBudgetOverride,
  } = useStorage()

  const logout = () => {
    clearAccessToken()
    setUser(null)
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <DashboardScreen transactions={transactions} user={user} />
        } />
        <Route path="/capture" element={
          <CaptureScreen onAdd={addTransaction} user={user} />
        } />
        <Route path="/transactions" element={
          <TransactionsScreen transactions={transactions} onDelete={deleteTransaction} />
        } />
        <Route path="/conciliation" element={
          <ConciliationScreen transactions={transactions} />
        } />
        <Route path="/settings" element={
          <SettingsScreen
            user={user}
            onLogout={logout}
            budgetOverrides={budgetOverrides}
            onUpdateBudgetOverride={updateBudgetOverride}
          />
        } />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
