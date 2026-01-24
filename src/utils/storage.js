const safeJsonParse = (value, fallback) => {
  try {
    return value == null ? fallback : JSON.parse(value)
  } catch {
    return fallback
  }
}

export const storage = {
  get(key, fallback = null) {
    if (typeof window === 'undefined') return fallback
    try {
      const raw = window.localStorage.getItem(key)
      return safeJsonParse(raw, fallback)
    } catch {
      return fallback
    }
  },
  set(key, value) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  },
  remove(key) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}
