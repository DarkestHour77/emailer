import { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type Table,
} from '@tanstack/react-table';
import type { Contact } from '../types';

interface Props {
  contacts: Contact[];
  selectedIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
}

const columnHelper = createColumnHelper<Contact>();

function getPageIds(table: Table<Contact>): number[] {
  return table.getRowModel().rows.map((r) => r.original.id);
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function ContactTable({ contacts, selectedIds, onSelectionChange }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [jumpPage, setJumpPage] = useState('');

  const toggleOne = useCallback((id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }, [selectedIds, onSelectionChange]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => {
          const pageIds = getPageIds(table);
          const allPageChecked = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
          return (
            <input
              type="checkbox"
              checked={allPageChecked}
              title="Select all on this page"
              onChange={() => {
                const next = new Set(selectedIds);
                if (allPageChecked) {
                  pageIds.forEach((id) => next.delete(id));
                } else {
                  pageIds.forEach((id) => next.add(id));
                }
                onSelectionChange(next);
              }}
            />
          );
        },
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleOne(row.original.id)}
          />
        ),
        size: 40,
      }),
      columnHelper.accessor('username', {
        header: 'USERNAME',
        cell: (info) => <span className="font-medium text-gray-900">{info.getValue()}</span>,
      }),
      columnHelper.accessor('email', {
        header: 'EMAIL',
        cell: (info) => <span className="text-gray-500">{info.getValue()}</span>,
      }),
      columnHelper.accessor('subscribed', {
        header: 'SUBSCRIBED',
        cell: (info) => {
          const val = info.getValue();
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                val === 'Yes'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {val}
            </span>
          );
        },
      }),
      columnHelper.accessor('plan', {
        header: 'PLAN',
        cell: (info) => {
          const val = info.getValue();
          const color =
            val === 'Plus'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-gray-100 text-gray-700';
          return (
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
              {val}
            </span>
          );
        },
      }),
      columnHelper.accessor('pages_left', {
        header: 'PAGES LEFT',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('last_login', {
        header: 'LAST LOGIN',
        cell: (info) => <span className="text-gray-500">{info.getValue() || '\u2014'}</span>,
      }),
    ],
    [selectedIds, onSelectionChange, toggleOne]
  );

  const table = useReactTable({
    data: contacts,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  // Generate visible page numbers (show up to 7 pages with ellipsis)
  const pageNumbers = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [0];
    if (currentPage > 2) pages.push('ellipsis-start');
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(pageCount - 2, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < pageCount - 3) pages.push('ellipsis-end');
    pages.push(pageCount - 1);
    return pages;
  }, [pageCount, currentPage]);

  const handleJumpPage = () => {
    const num = parseInt(jumpPage, 10);
    if (num >= 1 && num <= pageCount) {
      table.setPageIndex(num - 1);
    }
    setJumpPage('');
  };

  return (
    <div>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b-2 border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' \u2191', desc: ' \u2193' }[header.column.getIsSorted() as string] ?? ''}
                    </div>
                    {header.column.getCanFilter() && header.id !== 'select' && (
                      <input
                        className="mt-1 w-full px-2 py-1 text-xs border rounded font-normal normal-case tracking-normal"
                        placeholder={`Filter...`}
                        value={(header.column.getFilterValue() as string) ?? ''}
                        onChange={(e) => header.column.setFilterValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  <p className="text-lg font-medium">No contacts found</p>
                  <p className="text-sm mt-1">Try a different search or adjust your filters</p>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b transition-colors ${
                    selectedIds.has(row.original.id)
                      ? 'bg-indigo-50'
                      : idx % 2 === 0
                        ? 'bg-white'
                        : 'bg-gray-50/60'
                  } hover:bg-gray-100`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between mt-4 gap-4">
        {/* Left: info + rows per page */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {filteredCount} of {contacts.length} contacts
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-gray-600">Rows per page:</label>
            <select
              id="pageSize"
              className="border rounded px-2 py-1 text-sm bg-white"
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: page numbers */}
        <div className="flex items-center gap-1">
          <button
            className="px-2 py-1 border rounded text-sm disabled:opacity-40 hover:bg-gray-100 disabled:hover:bg-white"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            &lsaquo;
          </button>
          {pageNumbers.map((p, i) =>
            typeof p === 'string' ? (
              <span key={p + i} className="px-2 py-1 text-sm text-gray-400">&hellip;</span>
            ) : (
              <button
                key={p}
                className={`px-3 py-1 rounded text-sm ${
                  p === currentPage
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'border hover:bg-gray-100'
                }`}
                onClick={() => table.setPageIndex(p)}
              >
                {p + 1}
              </button>
            )
          )}
          <button
            className="px-2 py-1 border rounded text-sm disabled:opacity-40 hover:bg-gray-100 disabled:hover:bg-white"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            &rsaquo;
          </button>
        </div>

        {/* Right: jump to page */}
        <div className="flex items-center gap-2">
          <label htmlFor="jumpPage" className="text-sm text-gray-600">Go to:</label>
          <input
            id="jumpPage"
            type="number"
            min={1}
            max={pageCount}
            className="w-16 border rounded px-2 py-1 text-sm"
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJumpPage()}
            placeholder="#"
          />
          <button
            className="px-2 py-1 border rounded text-sm hover:bg-gray-100"
            onClick={handleJumpPage}
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
}
