'use client';

import React from 'react';
import type { PricingServiceType } from '@/shared/index';

export interface PricingItemView {
  id: string;
  serviceName: string;
  description: string;
  serviceType: PricingServiceType;
  monthlyCostCents: number;
  monthlyCostFormatted: string;
  isActive: boolean;
}

export interface PricingTableProps {
  items: PricingItemView[];
  totalFormatted: string;
  isClientView?: boolean;
}

export function PricingTable({ items, totalFormatted, isClientView = false }: PricingTableProps) {
  const displayItems = isClientView ? items.filter((i) => i.isActive) : items;

  return (
    <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-fg">Feature & Infrastructure Running Costs</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Transparent monthly operational breakdown (display-only, no billing or cards stored)
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-fg-muted uppercase-label block">Total Monthly Cost</span>
          <span className="text-lg font-bold font-mono text-emerald-400">{totalFormatted}</span>
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div className="text-center p-6 border border-dashed border-line rounded-well text-xs text-fg-subtle">
          This project has no recorded monthly running costs yet.
        </div>
      ) : (
        <div className="border border-line rounded-well overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-line">
            <thead className="bg-well text-fg-muted uppercase-label">
              <tr>
                <th className="p-3">Service / Feature</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                {!isClientView && <th className="p-3">Status</th>}
                <th className="p-3 text-right">Monthly Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {displayItems.map((item) => (
                <tr key={item.id} className="hover:bg-hover transition-colors">
                  <td className="p-3 font-medium text-fg">{item.serviceName}</td>
                  <td className="p-3 text-fg-muted capitalize">{item.serviceType}</td>
                  <td className="p-3 text-fg-subtle">{item.description || '—'}</td>
                  {!isClientView && (
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  )}
                  <td className="p-3 text-right font-mono font-medium text-fg">
                    {item.monthlyCostFormatted}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-well font-semibold border-t border-line">
              <tr>
                <td colSpan={isClientView ? 3 : 4} className="p-3 text-right uppercase-label text-fg-muted">
                  Total Monthly
                </td>
                <td className="p-3 text-right font-mono text-emerald-400 text-sm">
                  {totalFormatted}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
