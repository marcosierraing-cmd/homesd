import { createContext, useContext, useState } from 'react'

const PrivacyContext = createContext()

export function PrivacyProvider({ children }) {
  const [hidden, setHidden] = useState(true)
  const toggle = () => setHidden(h => !h)
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
