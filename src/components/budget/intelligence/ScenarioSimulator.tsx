import { Car, Hotel, Star, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import type { BudgetIntelligence, ScenarioDelta } from '../../../lib/budgetIntelligence';
import { euroMoney } from '../budgetShared';

export function ScenarioSimulator({
  intelligence,
  scenarioDeltas,
  onScenario
}: {
  intelligence: BudgetIntelligence;
  scenarioDeltas: Record<string, ScenarioDelta>;
  onScenario: (id: string, delta: ScenarioDelta) => void;
}) {
  const rows = [
    { key: 'lodging', label: 'Lodging Quality', icon: Hotel },
    { key: 'food', label: 'Food & Dining', icon: Utensils },
    { key: 'activities', label: 'Activities Level', icon: Star },
    { key: 'transportation', label: 'Transportation', icon: Car }
  ] as const;
  return (
    <div className="budget-intel-scenario">
      <div className="budget-intel-scenario-scale">
        <span>Conservative</span>
        <span>Current Plan</span>
        <span>Premium</span>
      </div>
      {rows.map((row) => {
        const category = intelligence.categories.find((item) => item.key === row.key);
        if (!category) return null;
        const Icon = row.icon;
        const value = scenarioDeltas[category.id]?.plannedDelta || 0;
        return (
          <label key={row.key}>
            <span><Icon size={16} /> {row.label}</span>
            <input
              aria-label={`${category.title} scenario adjustment`}
              type="range"
              min="-500"
              max="1500"
              step="50"
              value={value}
              onChange={(event) => onScenario(category.id, { plannedDelta: Number(event.target.value) })}
            />
            <strong>{value >= 0 ? '+' : ''}{euroMoney.format(value)}</strong>
          </label>
        );
      })}
      <div className="budget-intel-scenario-result">
        <span>Projected Total <strong>{euroMoney.format(intelligence.totalPlanned)}</strong></span>
        <motion.span key={intelligence.totalScenarioDelta}>vs Current Plan <strong>{intelligence.totalScenarioDelta >= 0 ? '+' : ''}{Math.round(intelligence.totalScenarioDelta).toLocaleString('en-US')}</strong></motion.span>
        <span>Budget Health <strong>{Math.max(0, 100 - Math.round(intelligence.totalPlanned / 15000 * 28))}%</strong></span>
      </div>
    </div>
  );
}
