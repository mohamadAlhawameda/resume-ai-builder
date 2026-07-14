import React from 'react';
import clsx from 'clsx';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  /** Suppress this column's label in the mobile card view — use for a
   * column that already reads as the card's title (e.g. a name/title cell
   * shown large at the top of the card). */
  hideLabelOnCard?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
  caption?: string;
}

/** Responsive data table: a real <table> at md+, stacked label/value cards
 * below md. The app previously had zero <table> elements — every list was a
 * hand-built card grid, which read fine but wasn't reusable and lost real
 * tabular semantics (column headers, row/cell association) for screen
 * readers on data that genuinely is tabular (saved jobs, versions, contacts). */
export default function Table<T>({ columns, rows, rowKey, onRowClick, emptyState, className, caption }: TableProps<T>) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className={className}>
      {/* md+: real table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm border-collapse">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="bg-muted/60">
              {columns.map((col) => (
                <th key={col.key} scope="col" className={clsx('px-4 py-3 text-start font-semibold text-muted-foreground', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={clsx('border-t border-border', onRowClick && 'cursor-pointer hover:bg-surface-hover transition')}
              >
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-4 py-3 align-middle text-foreground', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Below md: stacked cards, one per row */}
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={
              onRowClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }
                : undefined
            }
            className={clsx(
              'rounded-2xl border border-border bg-surface p-4 shadow-soft',
              onRowClick && 'cursor-pointer active:scale-[0.99] transition'
            )}
          >
            <dl className="space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  {!col.hideLabelOnCard && <dt className="text-xs font-medium text-muted-foreground shrink-0 pt-0.5">{col.header}</dt>}
                  <dd className={clsx('text-sm text-foreground text-end', col.hideLabelOnCard && 'w-full text-start')}>{col.render(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
