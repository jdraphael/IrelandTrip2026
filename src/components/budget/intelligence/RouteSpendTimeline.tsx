import type { BudgetIntelligence } from '../../../lib/budgetIntelligence';
import { euroMoney } from '../budgetShared';

export function RouteSpendTimeline({ intelligence }: { intelligence: BudgetIntelligence }) {
  const max = Math.max(1, ...intelligence.timeline.daily.map((point) => point.planned));
  return (
    <div className="budget-intel-route-timeline" aria-label="Route spend timeline">
      {intelligence.timeline.daily.map((point) => (
        <button type="button" key={point.id} aria-label={`${point.label} ${point.city || ''}`}>
          <span>{point.label}</span>
          <i style={{ height: `${Math.max(16, point.planned / max * 100)}%` }} />
          <strong>{euroMoney.format(point.planned)}</strong>
          <small>{point.city}</small>
        </button>
      ))}
    </div>
  );
}
