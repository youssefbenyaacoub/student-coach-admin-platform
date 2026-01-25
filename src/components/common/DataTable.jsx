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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            {title && <h3 className="font-heading font-semibold text-slate-800">{title}</h3>}
            <p className="text-sm text-slate-500 mt-1">{sorted.length} result{sorted.length !== 1 && 's'}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full md:w-64"
                />
             </div>
             {actions}
             <button onClick={doExport} className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors">
                <Download className="h-4 w-4" />
                Export
             </button>
          </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
           <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
              <tr>
                 {columns.map((c) => (
                    <th 
                        key={c.key} 
                    className={`px-6 py-3 transition-colors ${c.sortable === false ? '' : 'cursor-pointer hover:bg-slate-100'} ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                    onClick={() => {
                      if (c.sortable === false) return
                      onSort(c.key)
                    }}
                    >
                       <div className={`flex items-center gap-1 ${c.align === 'right' ? 'justify-end' : ''}`}>
                          {c.header}
                          <div className="flex flex-col">
                        {c.sortable === false ? null : (
                         <>
                          {sort?.key === c.key && sort.dir === 'asc' && <ChevronUp className="h-3 w-3" />}
                          {sort?.key === c.key && sort.dir === 'desc' && <ChevronDown className="h-3 w-3" />}
                         </>
                        )}
                          </div>
                       </div>
                    </th>
                 ))}
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
               {paged.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="p-8 text-center text-slate-500">
                      <EmptyState message="No results found" />
                    </td>
                  </tr>
               ) : (
                 paged.map((row, index) => (
                    <tr key={getRowId ? getRowId(row) : (row.id || index)} className="hover:bg-slate-50/50 transition-colors">
                       {columns.map((c) => (
                          <td key={c.key} className={`px-6 py-4 whitespace-nowrap text-slate-600 ${c.align === 'right' ? 'text-right' : ''}`}>
                             {c.cell ? c.cell(row) : c.accessor(row)}
                          </td>
                       ))}
                    </tr>
                 ))
               )}
           </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
         <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
               <select
                 className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-300"
                 value={pageSize}
                 onChange={(e) => {
                   setPageSize(Number(e.target.value))
                   setPage(1)
                 }}
               >
                 {[5, 10, 20, 50].map((n) => (
                   <option key={n} value={n}>{n} / page</option>
                 ))}
               </select>
               <div className="flex gap-1 ml-2">
                   <button 
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Previous
                   </button>
                   <button 
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Next
                   </button>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
