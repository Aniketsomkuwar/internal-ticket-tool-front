'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

export interface ProjectAssetItem {
  id: string;
  type: string;
  title: string;
  fileUrl: string | null;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  featureBreakdown?: Array<{
    featureName: string;
    phase: string;
    description: string;
  }>;
  createdAt: string;
}

export interface AssetListProps {
  assets: ProjectAssetItem[];
}

export function AssetList({ assets }: AssetListProps) {
  const featureAsset = assets.find((a) => a.type === 'feature_breakdown' && a.featureBreakdown?.length);
  const otherAssets = assets.filter((a) => a !== featureAsset);

  return (
    <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-fg">Project Assets & Deliverables</h2>
        <p className="text-xs text-fg-muted mt-0.5">
          Design files, logos, PRDs and structured feature breakdown across roadmap phases
        </p>
      </div>

      {assets.length === 0 ? (
        <div className="text-center p-6 border border-dashed border-line rounded-well text-xs text-fg-subtle">
          No project assets uploaded yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Stored Documents & Files */}
          {otherAssets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {otherAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="p-3 rounded-well border border-line bg-well flex flex-col justify-between gap-2"
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-panel border border-line text-fg-muted inline-block mb-1">
                      {asset.type.replace('_', ' ')}
                    </span>
                    <h3 className="text-xs font-semibold text-fg">{asset.title}</h3>
                    {asset.fileName && (
                      <p className="text-[11px] font-mono text-fg-subtle mt-0.5">{asset.fileName}</p>
                    )}
                  </div>
                  {asset.fileUrl && (
                    <a
                      href={asset.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1 font-medium"
                    >
                      <span>View File</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Structured Feature Breakdown by Phase */}
          {featureAsset && featureAsset.featureBreakdown && (
            <div className="border border-line rounded-well p-4 bg-well flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-fg flex items-center justify-between">
                <span>{featureAsset.title}</span>
                <span className="text-[10px] text-fg-muted uppercase-label">Roadmap Phases</span>
              </h3>
              <div className="divide-y divide-line/60">
                {featureAsset.featureBreakdown.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium text-fg">{item.featureName}</span>
                      {item.description && (
                        <p className="text-xs text-fg-subtle mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-panel border border-line text-indigo-300 shrink-0">
                      {item.phase}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
