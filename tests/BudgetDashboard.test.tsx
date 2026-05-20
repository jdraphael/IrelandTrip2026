import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BudgetResponse } from '../src/api';
import { BudgetDashboard } from '../src/components/BudgetDashboard';

const budget: BudgetResponse = {
  items: [],
  summary: {
    target: 15000,
    planned: 15000,
    actual: 0,
    remainingPlanned: 0,
    remainingActual: 15000,
    plannedPercent: 100,
    actualPercent: 0
  }
};

describe('BudgetDashboard metric row', () => {
  it('renders the compact fintech metric card structure', () => {
    const { container } = render(
      <BudgetDashboard
        budget={budget}
        itinerary={[]}
        sources={[]}
        onSave={vi.fn()}
        onAsk={vi.fn()}
        onApplyDraft={vi.fn()}
        onDismissDraft={vi.fn()}
      />
    );

    const cards = container.querySelectorAll('.budget-metric-card');
    expect(cards).toHaveLength(5);
    expect(container.querySelectorAll('.budget-metric-copy')).toHaveLength(5);
    expect(container.querySelectorAll('.budget-metric-label')).toHaveLength(5);
    expect(container.querySelectorAll('.budget-metric-value')).toHaveLength(5);
    expect(container.querySelectorAll('.budget-metric-note')).toHaveLength(5);
    expect(container.querySelector('.budget-health-card .budget-health-ring')).toBeInTheDocument();
    expect(container.querySelector('.budget-health-card .budget-metric-value')).toHaveTextContent('Comfortable');
  });
});
