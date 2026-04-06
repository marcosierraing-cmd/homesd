import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles/app.css'
import { useStorage } from './hooks/useStorage.js'
import { PrivacyProvider } from './context/PrivacyContext.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import DashboardScreen from './screens/DashboardScreen.jsx'
import CaptureScreen from './screens/CaptureScreen.jsx'
import TransactionsScreen from './screens/TransactionsScreen.jsx'
import ConciliationScreen from './screens/ConciliationScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'
import BudgetEditorScreen from './screens/BudgetEditorScreen.jsx'
import BottomNav from './components/BottomNav.jsx'

function getStoredUser() {
  try {
    const auth = localStorage.getItem('homesd_auth')
    const user = localStorage.getItem('homesd_user')
    return auth === '1' && user ? JSON.parse(user) : null
  } catch { return null }
}

export default function App() {
  const [user, setUser] = useState(getStoredUser)
  const {
    transactions, logros,
    addTransaction, deleteTransaction, updateTransaction,
    budgetOverrides, updateBudgetOverride,
    addLogro, deleteLogro,
    budgets, subcategories,
    selectedMonth, setSelectedMonth,
    saveBudget, copyBudgetFromPrevMonth,
    saveSubcategoryName, copySubcategoriesFromPrevMonth,
    syncing, error, online, refresh,
  } = useStorage()

  const logout = () => {
    localStorage.removeItem('homesd_auth')
    localStorage.removeItem('homesd_user')
    setUser(null)
  }

  if (!user) return <LoginScreen onLogin={setUser} />

  return (
    <PrivacyProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/capture" replace />} />
          <Route path="/dashboard" element={
            <DashboardScreen
              transactions={transactions}
              user={user}
              budgetOverrides={budgetOverrides}
              budgets={budgets}
              subcategories={subcategories}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              logros={logros}
              addLogro={addLogro}
              deleteLogro={deleteLogro}
              syncing={syncing}
              online={online}
            />
          } />
          <Route path="/capture" element={
            <CaptureScreen onAdd={addTransaction} user={user} />
          } />
          <Route path="/transactions" element={
            <TransactionsScreen transactions={transactions} onDelete={deleteTransaction} />
          } />
          <Route path="/conciliation" element={
            <ConciliationScreen transactions={transactions} onAdd={addTransaction} />
          } />
          <Route path="/settings" element={
            <SettingsScreen
              user={user} onLogout={logout}
              budgetOverrides={budgetOverrides}
              onUpdateBudgetOverride={updateBudgetOverride}
              syncing={syncing} error={error} online={online}
            />
          } />
          <Route path="/budget-editor" element={
            <BudgetEditorScreen
              budgets={budgets}
              subcategories={subcategories}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              saveBudget={saveBudget}
              copyBudgetFromPrevMonth={copyBudgetFromPrevMonth}
              saveSubcategoryName={saveSubcategoryName}
              copySubcategoriesFromPrevMonth={copySubcategoriesFromPrevMonth}
            />
          } />
        </Routes>
        <BottomNav syncing={syncing} />
      </BrowserRouter>
    </PrivacyProvider>
  )
}
