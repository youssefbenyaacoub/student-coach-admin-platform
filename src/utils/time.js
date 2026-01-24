export const sleep = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

export const formatDate = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  } catch {
    return String(iso)
  }
}

export const formatDateTime = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(iso)
  }
}
