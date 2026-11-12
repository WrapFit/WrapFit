'use client';

import React from 'react';
import { AdminShell, DataTable, Panel, PanelTitle, AdminStat, type DataColumn, ADMIN_STAT_GROUP } from '@/components/workspace';
import { RequireAuth } from '@/features/auth';

interface SampleScreenProps<Row> {
  title: string;
  description: string;
  /** What the screen will show once the API exists. */
  /** Kept for callers; the header badge already marks the screen as sample data. */
  note?: string;
  stats: { label: string; value: string; hint?: string }[];
  tableTitle: string;
  columns: DataColumn<Row>[];
  rows: Row[];
  rowKey(row: Row): string;
  children?: React.ReactNode;
}

/** Admin screen without an API yet: example figures, clearly marked, in the layout of the wired screens. */
export function SampleScreen<Row>({ title, description, stats, tableTitle, columns, rows, rowKey, children }: SampleScreenProps<Row>) {
  return (
    <RequireAuth role="ADMIN">
      <AdminShell title={title} description={description}>
        <div className="flex flex-col gap-6">
          <section aria-label="Số liệu mẫu" className={`${ADMIN_STAT_GROUP} grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`}>
            {stats.map((stat) => (
              <AdminStat key={stat.label} {...stat} />
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
