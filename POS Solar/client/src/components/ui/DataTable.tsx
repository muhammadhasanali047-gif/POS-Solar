import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, PackageOpen } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface EmptyAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchField?: (item: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: EmptyAction;
  pageSize?: number;
  actions?: React.ReactNode;
}

export function DataTable<T extends { id?: string }>({
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchField,
  isLoading = false,
  emptyTitle,
  emptyMessage = 'No records found',
  emptyIcon,
  emptyAction,
  pageSize = 10,
  actions,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) => {
      if (searchField) {
        return searchField(item).toLowerCase().includes(term);
      }
      return Object.values(item as any).some((val) =>
        String(val || '').toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, searchField]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const res = valA > valB ? 1 : -1;
      return sortOrder === 'asc' ? res : -res;
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  // Auto-reset page if out of bounds or when dataset changes
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
      {/* Top Search & Actions Bar */}
      <div className="p-3 sm:p-3.5 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-gray-50/40 dark:bg-slate-900/40">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-solar-500 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-900 dark:text-gray-100 antialiased">
          <thead className="bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white uppercase text-[11px] font-bold tracking-wider sticky top-0 border-b border-gray-300 dark:border-slate-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 select-none ${col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700' : ''} ${col.className || ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-gray-400">
                        {sortKey === col.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-solar-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-solar-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-4 py-4">
                      <div
                        className="h-3.5 bg-gray-200 dark:bg-slate-800 rounded-md"
                        style={{ width: `${60 + ((idx + cIdx) % 4) * 12}%` }}
                      ></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  {searchTerm ? (
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                      <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-1" />
                      <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">No matching records found</p>
                      <p className="text-xs text-gray-400">
                        No results match "{searchTerm}". Check for typos or clear your search filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-xs text-solar-600 dark:text-solar-400 hover:underline font-semibold cursor-pointer"
                      >
                        Clear search
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-400 shadow-xs">
                        {emptyIcon || <PackageOpen className="w-7 h-7 text-gray-400 dark:text-gray-500" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          {emptyTitle || emptyMessage || 'No records found'}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          {emptyTitle ? emptyMessage : 'There are currently no items available in this section.'}
                        </p>
                      </div>
                      {emptyAction && (
                        <button
                          type="button"
                          onClick={emptyAction.onClick}
                          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-solar-600 hover:bg-solar-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          {emptyAction.icon}
                          <span>{emptyAction.label}</span>
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 dark:text-gray-100 ${col.className || ''}`}>
                      {col.render ? col.render(item) : (item as any)[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-2.5 sm:p-3 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/40 dark:bg-slate-900/40">
        <div>
          {isLoading ? (
            <span className="italic text-gray-400">Loading records...</span>
          ) : (
            <span>
              Showing {sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2.5 py-1 font-medium text-gray-800 dark:text-gray-200">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}