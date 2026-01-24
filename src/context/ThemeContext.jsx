import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './ThemeContextBase'
import { storage } from '../utils/storage'

const STORAGE_KEY = 'sea_theme_v1'

function getSystemPrefersDark() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

function resolveIsDark(mode) {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return getSystemPrefersDark()
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const stored = storage.get(STORAGE_KEY, null)
    if (stored?.mode === 'light' || stored?.mode === 'dark' || stored?.mode === 'system') {
      return stored.mode
    }
    return 'light'
  })

  const isDark = useMemo(() => resolveIsDark(mode), [mode])

  useEffect(() => {
    storage.set(STORAGE_KEY, { mode })
  }, [mode])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
  }, [isDark])

  useEffect(() => {
    if (mode !== 'system') return undefined

    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mql) return undefined

    const onChange = () => {
      const root = document.documentElement
      root.classList.toggle('dark', resolveIsDark('system'))
      root.style.colorScheme = resolveIsDark('system') ? 'dark' : 'light'
    }

    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [mode])

  const value = useMemo(
    () => ({
      mode,
      isDark,
      setMode,
      toggle: () => setMode((m) => (resolveIsDark(m) ? 'light' : 'dark')),
    }),
    [mode, isDark],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
