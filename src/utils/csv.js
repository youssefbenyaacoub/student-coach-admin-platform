const escape = (value) => {
  const str = value == null ? '' : String(value)
  const escaped = str.replaceAll('"', '""')
  return `"${escaped}"`
}

export const toCsv = ({ columns, rows }) => {
  const header = columns.map((c) => escape(c.header)).join(',')
  const lines = rows.map((r) => columns.map((c) => escape(c.accessor(r))).join(','))
  return [header, ...lines].join('\n')
}

export const downloadTextFile = ({ filename, text, mime = 'text/plain' }) => {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
