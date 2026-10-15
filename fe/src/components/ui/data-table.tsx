"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import React, { useId, useMemo, useState } from "react";
import { cn } from "@/utils/helpers";
import { Input } from "./field";

export interface DataColumn<Row> {
  key: string;
  label: string;
  align?: "left" | "right";
  render(row: Row): React.ReactNode;
  /** Makes the column sortable by this value. */
  sortValue?: (row: Row) => string | number | Date | null | undefined;
  /** In the phone card layout: the card title (one column). */
  primary?: boolean;
  /** Not shown in the phone card layout. */
  hideOnMobile?: boolean;
}

export interface DataTableProps<Row> {
  columns: DataColumn<Row>[];
  rows: Row[];
  rowKey(row: Row): string;
  /** Names the table for screen readers. */
  label: string;
  /**
   * Below md: `cards` turns each row into a card (title + label/value pairs), `scroll` keeps the table and scrolls
   * sideways. Cards suit lists people scan on a phone (orders, accounts).
   */
  mobile?: "cards" | "scroll";
  initialSort?: { key: string; direction: "asc" | "desc" };
  /** Shown instead of the rows when there are none. */
  empty?: React.ReactNode;
  /** Row padding: comfortable 12 px, compact 8 px (admin lists). */
  density?: "comfortable" | "compact";
  /** A filter box above the table: rows whose `text` contains the query (accents and case ignored) stay. */
  search?: { label: string; placeholder?: string; text(row: Row): string };
  className?: string;
}

/** Lower case without Vietnamese accents, so "hop qua" finds "Hộp quà". */
const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

const compare = (a: unknown, b: unknown) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "vi", { numeric: true, sensitivity: "base" });
};

/** Table with hairline rows, sortable headers (aria-sort) and a card layout on phones. */
export function DataTable<Row>({ columns, rows, rowKey, label, mobile = "scroll", initialSort, empty, density = "comfortable", search, className }: DataTableProps<Row>) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [query, setQuery] = useState("");
  const countId = useId();

  const filtered = useMemo(() => {
    const needle = fold(query.trim());
    if (!search || !needle) return rows;
    return rows.filter((row) => fold(search.text(row)).includes(needle));
  }, [rows, search, query]);

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return filtered;
    const factor = sort!.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => factor * compare(column.sortValue!(a), column.sortValue!(b)));
  }, [filtered, columns, sort]);

  const toggleSort = (key: string) =>
    setSort((current) => (current?.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }));

  if (rows.length === 0 && empty) return <>{empty}</>;

  const cell = density === "compact" ? "py-2" : "py-3";
  const primary = columns.find((c) => c.primary) ?? columns[0];

  return (
    <div className={className}>
      {search && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-full sm:max-w-xs">
            <Input
              type="search"
              inputSize="sm"
              aria-label={search.label}
              aria-describedby={countId}
              placeholder={search.placeholder ?? search.label}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              leadingIcon={<Search />}
            />
          </div>
          <p id={countId} role="status" className="text-caption text-fg-muted">
            {query.trim() ? `${sorted.length} / ${rows.length} dòng khớp` : `${rows.length} dòng`}
          </p>
        </div>
      )}
      {sorted.length === 0 && (
        <p className="rounded-panel border border-dashed border-line px-4 py-8 text-center text-body-sm text-fg-muted">Không có dòng nào khớp “{query.trim()}”.</p>
      )}
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          "relative overflow-x-auto rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
          mobile === "cards" && "hidden md:block",
          sorted.length === 0 && "hidden md:hidden",
        )}
      >
        <table aria-label={label} className="w-full min-w-[640px] text-left text-body-sm">
          <thead>
            <tr className="border-b border-line text-fg-muted">
              {columns.map((column) => {
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort!.direction === "asc" ? "ascending" : "descending") : column.sortValue ? "none" : undefined}
                    className={cn("px-3 py-2.5 font-medium first:pl-0 last:pr-0", column.align === "right" && "text-right")}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md outline-none transition-colors hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/40",
                          active && "text-fg",
                          column.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {column.label}
                        {active ? (
                          sort!.direction === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-surface-sunken/50">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-3 text-fg first:pl-0 last:pr-0", cell, column.align === "right" && "text-right")}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mobile === "cards" && (
        <ul aria-label={label} className="flex flex-col gap-3 md:hidden">
          {sorted.map((row) => (
            <li key={rowKey(row)} className="rounded-panel border border-line bg-surface-raised p-4">
              <div className="mb-2 text-body-sm font-semibold text-fg">{primary.render(row)}</div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-body-sm">
                {columns
                  .filter((column) => column !== primary && !column.hideOnMobile)
                  .map((column) => (
                    <React.Fragment key={column.key}>
                      <dt className="text-fg-muted">{column.label}</dt>
                      <dd className="min-w-0 text-right text-fg">{column.render(row)}</dd>
                    </React.Fragment>
                  ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
