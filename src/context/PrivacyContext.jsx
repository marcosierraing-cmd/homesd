import { createContext, useContext, useState } from 'react'
 
const PrivacyContext = createContext()
 
export function PrivacyProvider({ children }) {
  const [hidden, setHidden] = useState(true) // Inicia oculto
 
  const toggle = () => setHidden(h => !h)
 
  // Función para mostrar valor o máscara
  const mask = (value) => hidden ? '••••' : value
 
  return (
    <PrivacyContext.Provider value={{ hidden, toggle, mask }}>
      {children}
    </PrivacyContext.Provider>
  )
}
 
export function usePrivacy() {
  return useContext(PrivacyContext)
}
