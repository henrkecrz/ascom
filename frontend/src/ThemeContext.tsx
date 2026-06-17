import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { darkTheme, lightTheme, Theme, ThemeName } from './theme'

interface ThemeContextValue {
  theme: Theme
  themeName: ThemeName
  toggleTheme: () => void
  setThemeName: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  themeName: 'dark',
  toggleTheme: () => {},
  setThemeName: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('ascom-theme')
    return saved === 'light' ? 'light' : 'dark'
  })

  const theme = themeName === 'dark' ? darkTheme : lightTheme

  const toggleTheme = useCallback(() => {
    setThemeNameState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('ascom-theme', next)
      return next
    })
  }, [])

  const setThemeName = useCallback((name: ThemeName) => {
    localStorage.setItem('ascom-theme', name)
    setThemeNameState(name)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeName)
  }, [themeName])

  return (
    <ThemeContext.Provider value={{ theme, themeName, toggleTheme, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
