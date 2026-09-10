import { useState, useCallback, useEffect } from 'react'
import { getTheme, setTheme as saveTheme } from '../lib/storage'

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const saved = getTheme()
    setThemeState(saved)
    document.documentElement.dataset.theme = saved
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      saveTheme(next)
      document.documentElement.dataset.theme = next
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
