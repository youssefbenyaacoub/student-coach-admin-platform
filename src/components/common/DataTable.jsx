import { ChevronDown, ChevronUp, Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import EmptyState from './EmptyState'
import { downloadTextFile, toCsv } from '../../utils/csv'

const normalize = (v) => String(v ?? '').toLowerCase()

export default function DataTable({
  title,
  rows,
  columns,
  getRowId,
  initialSort,
  searchPlaceholder = 'Search…',
  actions,
  exportFilename,
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState(initialSort ?? null)

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return rows

    return rows.filter((r) =>
      columns.some((c) => {
        if (c.searchable === false) return false
        const raw = c.accessor(r)
        return normalize(raw).includes(q)
      }),
    )
  }, [rows, columns, query])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return filtered
    const dir = sort.dir

    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = col.sortValue ? col.sortValue(a) : col.accessor(a)
      const bv = col.sortValue ? col.sortValue(b) : col.accessor(b)
      const as = normalize(av)
      const bs = normalize(bv)
      if (as < bs) return dir === 'asc' ? -1 : 1
      if (as > bs) return dir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [filtered, columns, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, safePage, pageSize])

  const onSort = (key) => {
    setPage(1)
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const doExport = () => {
    const safeName = exportFilename ?? `${title ?? 'export'}.csv`
    const csv = toCsv({
      columns: columns.map((c) => ({
        header: c.header,
        accessor: c.accessor,
      })),
      rows: sorted,
    })
    downloadTextFile({ filename: safeName, text: csv, mime: 'text/csv' })
  }

  return (
    <div className="surface overflow-hidden p-0">
      <div className="border-b border-border/50 bg-card/70 px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            {title ? (
              <div className="text-sm font-semibold text-card-foreground">{title}</div>
            ) : null}
            <div className="mt-1 text-sm text-muted-foreground">
              {sorted.length} result{sorted.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="input pl-9"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder={searchPlaceholder}
                aria-label="Search table"
              />
            </div>
            <div className="flex items-center gap-2">
              {exportFilename ? (
                <button type="button" className="btn-ghost" onClick={doExport}>
                  <Download className="h-4 w-4" /> Export
                </button>
              ) : null}
              {actions}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-card/30">
        {sorted.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No results" message="Try adjusting your filters or search." />
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                {columns.map((c) => {
                  const isSorted = sort?.key === c.key
                  const dir = sort?.dir
                  const sortable = c.sortable !== false
                  return (
                    <th key={c.key} className="px-3 py-3">
                      <button
                        type="button"
                        className={
                          sortable
                            ? 'inline-flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-accent hover:text-accent-foreground'
                            : 'cursor-default'
                        }
                        onClick={sortable ? () => onSort(c.key) : undefined}
                        aria-label={sortable ? `Sort by ${c.header}` : undefined}
                      >
                        {c.header}
                        {sortable ? (
                          <span className="inline-flex">
                            {isSorted && dir === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : isSorted && dir === 'desc' ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <span className="h-3.5 w-3.5" />
                            )}
                          </span>
                        ) : null}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr
                  key={getRowId ? getRowId(r) : r.id}
                  className="border-b border-border/30 last:border-b-0 hover:bg-muted/50"
                >
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 align-top">
                      {c.cell ? c.cell(r) : c.accessor(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {sorted.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border/50 bg-card/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Page {safePage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="input w-auto"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              aria-label="Rows per page"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
