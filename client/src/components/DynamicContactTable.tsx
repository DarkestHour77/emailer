import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
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
  type ColumnDef,
} from '@tanstack/react-table';
import type { DynamicContact } from '../types';

interface Props {
  contacts: DynamicContact[];
  columns: string[];
  selectedIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
}

const columnHelper = createColumnHelper<DynamicContact>();

function getFilteredIds(table: Table<DynamicContact>): number[] {
  return table.getFilteredRowModel().rows.map((r) => r.original.id as number);
}

function ExpandableCell({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Reset expanded state when value changes so we can re-measure
    setExpanded(false);
  }, [value]);

  useEffect(() => {
    const el = measureRef.current;
    if (el && !expanded) {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  }, [value, expanded]);

  return (
    <span
      ref={measureRef}
      onClick={() => {
        if (isTruncated || expanded) setExpanded(!expanded);
      }}
      className={`text-gray-700 block ${expanded ? 'whitespace-normal break-words' : 'truncate'} ${isTruncated || expanded ? 'cursor-pointer hover:text-indigo-600' : ''}`}
    >
      {value}
    </span>
  );
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function DynamicContactTable({ contacts, columns: csvColumns, selectedIds, onSelectionChange }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [jumpPage, setJumpPage] = useState('');

  const toggleOne = useCallback((id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }, [selectedIds, onSelectionChange]);

  const columns = useMemo(() => {
    const cols: ColumnDef<DynamicContact, any>[] = [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => {
          const filteredIds = getFilteredIds(table);
          const allChecked = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
          return (
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => {
                if (allChecked) {
                  const next = new Set(selectedIds);
                  filteredIds.forEach((id) => next.delete(id));
                  onSelectionChange(next);
                } else {
                  const next = new Set(selectedIds);
                  filteredIds.forEach((id) => next.add(id));
                  onSelectionChange(next);
                }
              }}
            />
          );
        },
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id as number)}
            onChange={() => toggleOne(row.original.id as number)}
          />
        ),
        size: 40,
      }),
    ];

    for (const colName of csvColumns) {
      cols.push(
        columnHelper.accessor((row) => row[colName] ?? '', {
          id: colName,
          header: colName.toUpperCase(),
          cell: (info) => {
            const val = info.getValue();
            return <ExpandableCell value={val != null ? String(val) : '\u2014'} />;
          },
        })
      );
    }

    return cols;
  }, [csvColumns, selectedIds, onSelectionChange, toggleOne]);

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
        <table className="text-sm table-fixed" style={{ width: `${csvColumns.length * 220 + 40}px` }}>
          <colgroup>
            <col style={{ width: '40px' }} />
            {csvColumns.map((col) => (
              <col key={col} style={{ width: '220px' }} />
            ))}
          </colgroup>
          <thead className="bg-gray-100 border-b-2 border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer select-none"
                    onClick={header.id === 'select' ? () => {
                      const filteredIds = getFilteredIds(table);
                      const allChecked = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
                      const next = new Set(selectedIds);
                      if (allChecked) {
                        filteredIds.forEach((id) => next.delete(id));
                      } else {
                        filteredIds.forEach((id) => next.add(id));
                      }
                      onSelectionChange(next);
                    } : header.column.getToggleSortingHandler()}
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
                    selectedIds.has(row.original.id as number)
                      ? 'bg-indigo-50'
                      : idx % 2 === 0
                        ? 'bg-white'
                        : 'bg-gray-50/60'
                  } hover:bg-gray-100`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 overflow-hidden ${cell.column.id === 'select' ? 'cursor-pointer' : ''}`}
                      onClick={cell.column.id === 'select' ? () => toggleOne(row.original.id as number) : undefined}
                    >
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
