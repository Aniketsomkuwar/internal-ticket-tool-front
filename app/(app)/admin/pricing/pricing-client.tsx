'use client';

import React, { useState } from 'react';
import { PricingTable } from '../../../../components/pricing-table';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Alert } from '../../../../components/ui/alert';
import { PRICING_SERVICE_TYPES, type PricingServiceType } from '../../../../shared';

export interface AdminPricingClientProps {
  projects: Array<{ id: string; name: string }>;
  initialPricingMap: Record<string, any>;
}

export function AdminPricingClient({ projects, initialPricingMap }: AdminPricingClientProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [pricingMap, setPricingMap] = useState<Record<string, any>>(initialPricingMap);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Item form state
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [serviceType, setServiceType] = useState<PricingServiceType>('hosting');
  const [costDollars, setCostDollars] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentPricing = pricingMap[selectedProjectId] ?? { items: [], totalMonthlyCostFormatted: '$0.00' };

  const handleAddPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !serviceName || !costDollars) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const cents = Math.round(parseFloat(costDollars) * 100);
    if (isNaN(cents) || cents < 0) {
      setErrorMsg('Please enter a valid dollar amount');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          serviceName,
          description,
          serviceType,
          monthlyCostCents: cents,
          isActive: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add pricing item');
      }

      // Re-fetch project pricing
      const refreshedRes = await fetch(`/api/projects/${selectedProjectId}/pricing`);
      if (refreshedRes.ok) {
        const refreshedData = await refreshedRes.json();
        setPricingMap((prev) => ({ ...prev, [selectedProjectId]: refreshedData }));
      }

      setShowAddModal(false);
      setServiceName('');
      setDescription('');
      setCostDollars('');
      setSuccessMsg(`Added pricing record for ${serviceName}.`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {errorMsg && <Alert tone="error" title="Error">{errorMsg}</Alert>}
      {successMsg && <Alert tone="success" title="Success">{successMsg}</Alert>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-fg">Feature Pricing & Operational Costs</h1>
          <p className="text-xs text-fg-muted mt-1">
            Display-only transparent cost calculator for infrastructure and feature services
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} className="text-xs">
          + Add Cost Item
        </Button>
      </div>

      {/* Project Selector */}
      <div className="p-4 rounded-surface border border-line bg-panel flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase-label font-bold">Selected Project:</span>
          <Select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs h-8 min-w-[200px]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="text-xs text-fg-subtle">
          Pricing is display-only. Billing/checkout routes do not exist.
        </div>
      </div>

      {/* Pricing Table */}
      <PricingTable
        items={currentPricing.items}
        totalFormatted={currentPricing.totalMonthlyCostFormatted}
        isClientView={false}
      />

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-surface p-6 max-w-md w-full flex flex-col gap-4">
            <h2 className="text-base font-semibold text-fg">Add Feature Pricing Record</h2>
            <form onSubmit={handleAddPricing} className="flex flex-col gap-3">
              <div>
                <label className="text-xs uppercase-label font-bold block mb-1">Service / Feature Name</label>
                <Input
                  placeholder="e.g. AWS Production Hosting, SendGrid Email"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase-label font-bold block mb-1">Category</label>
                  <Select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as PricingServiceType)}
                    className="text-xs"
                  >
                    {PRICING_SERVICE_TYPES.map((t) => (
                      <option key={t} value={t}>{t.toUpperCase()}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs uppercase-label font-bold block mb-1">Monthly Cost (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="40.00"
                    value={costDollars}
                    onChange={(e) => setCostDollars(e.target.value)}
                    required
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase-label font-bold block mb-1">Description</label>
                <Input
                  placeholder="e.g. 2x EC2 t4g.medium instances + RDS Postgres"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Add Pricing Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
