'use client';

import { Info } from 'lucide-react';
import React from 'react';
import { AdminShell, DataTable, Panel, PanelTitle, SampleBadge, StatTile, type DataColumn } from '@/components/workspace';
import { RequireAuth } from '@/features/auth';

interface SampleScreenProps<Row> {
  title: string;
  description: string;
  /** What the screen will show once the API exists. */
  note: string;
  stats: { label: string; value: string; hint?: string }[];
  tableTitle: string;
  columns: DataColumn<Row>[];
  rows: Row[];
  rowKey(row: Row): string;
  children?: React.ReactNode;
}

/** Admin screen without an API yet: example figures, clearly marked, in the layout of the wired screens. */
export function SampleScreen<Row>({ title, description, note, stats, tableTitle, columns, rows, rowKey, children }: SampleScreenProps<Row>) {
  return (
    <RequireAuth role="ADMIN">
      <AdminShell title={title} description={description} actions={<SampleBadge />}>
        <div className="flex flex-col gap-6">
          <p className="flex items-start gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-sm leading-[1.6] text-amber-900">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {note}
          </p>
          <section aria-label="Số liệu mẫu" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((stat) => (
              <StatTile key={stat.label} {...stat} />
            ))}
          </section>
          <Panel aria-labelledby="sample-table">
            <PanelTitle id="sample-table">{tableTitle}</PanelTitle>
            <DataTable<Row> label={tableTitle} rows={rows} rowKey={rowKey} columns={columns} />
          </Panel>
          {children}
        </div>
      </AdminShell>
    </RequireAuth>
  );
}
