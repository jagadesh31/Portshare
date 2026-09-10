import { useState, useCallback, useEffect } from 'react'
import { setTheme as saveTheme } from '../lib/storage'

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    // 1. Check localStorage first
    const saved = localStorage.getItem('portshare-theme') as 'light' | 'dark' | null
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved)
      document.documentElement.dataset.theme = saved
      return
    }

    // 2. Fall back to OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = prefersDark ? 'dark' : 'light'
    setThemeState(initial)
    document.documentElement.dataset.theme = initial
  }, [])

  // Listen for OS preference changes (only when no manual pref is saved)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('portshare-theme')
      if (!saved) {
        const next = e.matches ? 'dark' : 'light'
        setThemeState(next)
        document.documentElement.dataset.theme = next
      }
    }
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
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
