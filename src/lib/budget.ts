import type { BudgetItem, BudgetSummary } from '../types';

const percent = (value: number, target: number) => {
  if (target <= 0) return 0;
  return Math.min(999, Math.round((value / target) * 100));
};

export function calculateBudgetSummary(items: BudgetItem[], target: number): BudgetSummary {
  const planned = items.reduce((sum, item) => sum + item.planned, 0);
  const actual = items.reduce((sum, item) => sum + item.actual, 0);

  return {
    target,
    planned,
    actual,
    remainingPlanned: target - planned,
    remainingActual: target - actual,
    plannedPercent: percent(planned, target),
    actualPercent: percent(actual, target)
  };
}
