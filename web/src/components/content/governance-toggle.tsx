'use client';

import { useState } from 'react';

type BoardRow = { role: string; note: string };
type BoardKey = 'state' | 'district';

const TABS: { key: BoardKey; label: string }[] = [
  { key: 'state', label: 'SIDHKOFED' },
  { key: 'district', label: 'District Union' },
];

export function GovernanceToggle({
  stateBoard,
  districtBoard,
}: {
  stateBoard: BoardRow[];
  districtBoard: BoardRow[];
}) {
  const [active, setActive] = useState<BoardKey>('state');
  const rows = active === 'state' ? stateBoard : districtBoard;

  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border border-border bg-surface p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            aria-pressed={active === tab.key}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              active === tab.key
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {rows.map((item) => (
          <div
            key={item.role}
            className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3"
          >
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{item.role}</p>
              <p className="text-xs text-muted-foreground">{item.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
