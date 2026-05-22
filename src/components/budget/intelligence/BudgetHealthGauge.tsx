import type { CSSProperties } from 'react';
import type { BudgetHealthScore } from '../../../lib/budgetIntelligence';

export function BudgetHealthGauge({ health }: { health: BudgetHealthScore }) {
  return (
    <div className="budget-health-gauge" style={{ '--health-score': health.score } as CSSProperties} aria-label={`Budget health ${health.score}`}>
      <span>{health.score}</span>
      <strong>{health.label}</strong>
      <small>{health.status}</small>
    </div>
  );
}
