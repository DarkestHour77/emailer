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

function getFilteredIds(table: Table<Contact>): number[] {
  return table.getFilteredRowModel().rows.map((r) => r.original.id);
}

export default function ContactTable({ contacts, selectedIds, onSelectionChange }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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
          const filteredIds = getFilteredIds(table);
          const allChecked = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
          return (
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => {
                if (allChecked) {
                  // Unselect only the filtered ones
                  const next = new Set(selectedIds);
                  filteredIds.forEach((id) => next.delete(id));
                  onSelectionChange(next);
                } else {
                  // Select all filtered ones (keep existing selections too)
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
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleOne(row.original.id)}
          />
        ),
        size: 40,
      }),
      columnHelper.accessor('username', {
        header: 'Username',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('subscribed', {
        header: 'Subscribed',
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
        header: 'Plan',
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
        header: 'Pages Left',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('last_login', {
        header: 'Last Login',
        cell: (info) => info.getValue() || '—',
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

  return (
    <div>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                    </div>
                    {header.column.getCanFilter() && header.id !== 'select' && (
                      <input
                        className="mt-1 w-full px-2 py-1 text-xs border rounded"
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
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b hover:bg-gray-50 ${
                  selectedIds.has(row.original.id) ? 'bg-indigo-50' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-600">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          {' | '}{filteredCount} of {contacts.length} contacts
        </span>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
