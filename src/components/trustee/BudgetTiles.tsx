import { Stat } from '@/components/ui';
import { formatMoney } from '@/lib/utils';
import type { BudgetTile } from '@/lib/budget';

export function BudgetTiles({ tiles }: { tiles: BudgetTile[] }) {
  if (tiles.length === 0) return <p className="text-sm text-slate-500">No budget envelopes configured for this year.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tiles.map((tile) => (
        <div key={`${tile.year}-${tile.stream}`} className="space-y-3">
          <p className="text-sm font-medium">
            {tile.stream === 'OLD_TINITIAN_SUPPORT' ? 'Stream A — Old Trinitian Support' : 'Stream B — Sports Scholarships'} · {tile.year}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Budget" value={formatMoney(tile.budget, 'LKR')} />
            <Stat label="Committed" value={formatMoney(tile.committed, 'LKR')} />
            <Stat label="Paid" value={formatMoney(tile.paid, 'LKR')} />
            <Stat label="Available" value={formatMoney(tile.available, 'LKR')} />
          </div>
        </div>
      ))}
    </div>
  );
}
