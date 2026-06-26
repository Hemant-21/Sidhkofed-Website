'use client';

/**
 * Responsive media grid. Renders memoized {@link MediaCard} cells with lazy image loading. The
 * data is server-paginated (the page owns the query), so each page renders a bounded set — this
 * keeps the DOM light without a windowing dependency, while lazy `loading="lazy"` images defer
 * off-screen network/decode work (performance).
 */

import { MediaCard } from './media-card';
import type { MediaAsset } from '../types';

export interface MediaGridProps {
  assets: MediaAsset[];
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onOpen: (asset: MediaAsset) => void;
}

export function MediaGrid({ assets, selectable, selectedIds = [], onToggleSelect, onOpen }: MediaGridProps) {
  const selected = new Set(selectedIds);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <li key={asset.id}>
          <MediaCard
            asset={asset}
            selectable={selectable}
            selected={selected.has(asset.id)}
            onToggleSelect={onToggleSelect}
            onOpen={onOpen}
          />
        </li>
      ))}
    </ul>
  );
}
