import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BudgetResponse } from '../src/api';
import { BudgetDashboard } from '../src/components/BudgetDashboard';
import type { DayPlan, ResearchAnswer, Trip } from '../src/types';

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

const interactiveBudget: BudgetResponse = {
  items: [
    { id: 'budget-flights', category: 'Flights', label: 'LEX to Dublin roundtrip for five', planned: 6000, actual: 0, status: 'watching' },
    { id: 'budget-lodging', category: 'Lodging', label: 'Hotels and farm stays', planned: 3200, actual: 0, status: 'researching' },
    { id: 'budget-car', category: 'Transportation', label: 'Automatic SUV and fuel', planned: 1500, actual: 0, status: 'researching' },
    { id: 'budget-food', category: 'Food', label: 'Restaurants and groceries', planned: 2000, actual: 0, status: 'researching' },
    { id: 'budget-activities', category: 'Activities', label: 'Castles and wildlife', planned: 1600, actual: 0, status: 'researching' },
    { id: 'budget-buffer', category: 'Buffer', label: 'Souvenirs', planned: 700, actual: 0, status: 'researching' }
  ],
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

const trip: Trip = {
  id: 'trip',
  title: 'Ireland Expedition',
  month: 'June',
  year: 2027,
  startDate: '2027-06-18',
  endDate: '2027-06-30',
  travelers: 5,
  adults: 2,
  children: 3,
  origin: 'LEX',
  destination: 'Dublin',
  budgetTarget: 15000,
  routeSummary: 'Dublin -> Kilkenny -> Cork -> Dingle -> Galway -> Dublin',
  priorities: ['family', 'scenic'],
  updatedAt: '2026-05-20T00:00:00Z'
};

const itinerary: DayPlan[] = [
  day('day-2', 2, 'Dublin', 'June 19, 2027', 'Arrive and settle into Dublin'),
  day('day-3', 3, 'Dublin', 'June 20, 2027', 'Dublin Zoo and Phoenix Park'),
  day('day-5', 5, 'Kilkenny', 'June 22, 2027', 'Drive to Kilkenny'),
  day('day-6', 6, 'Cork', 'June 23, 2027', 'Kilkenny to Cork'),
  day('day-8', 8, 'Dingle', 'June 25, 2027', 'Drive to Dingle'),
  day('day-10', 10, 'Galway', 'June 27, 2027', 'Dingle to Galway via Bunratty')
];

function day(id: string, number: number, base: string, dateLabel: string, title: string): DayPlan {
  return {
    id,
    day: number,
    title,
    dateLabel,
    base,
    lodging: { name: `${base} stay`, type: 'hotel', nightlyEstimate: 250 },
    stops: [{ id: `${id}-stop`, name: title, kind: 'activity', latitude: 53, longitude: -8 }],
    notes: `${base} route notes`
  };
}

function renderInteractiveBudget(overrides: Partial<React.ComponentProps<typeof BudgetDashboard>> = {}) {
  const askAnswer: ResearchAnswer = {
    id: 'answer',
    question: 'question',
    answer: 'Galway scenario reviewed.',
    createdAt: '2026-05-20T00:00:00Z',
    sources: [],
    warnings: [],
    drafts: []
  };
  const props = {
    budget: interactiveBudget,
    trip,
    itinerary,
    sources: [],
    onSave: vi.fn(),
    onAsk: vi.fn().mockResolvedValue(askAnswer),
    onApplyDraft: vi.fn(),
    onDismissDraft: vi.fn(),
    ...overrides
  };
  const view = render(<BudgetDashboard {...props} />);
  return { ...view, props };
}

describe('BudgetDashboard interactive intelligence center', () => {
  it('filters the dashboard when a donut category is selected', async () => {
    renderInteractiveBudget();

    const foodFilter = screen.getByRole('button', { name: /Filter Food & Dining/i });
    await userEvent.click(foodFilter);

    expect(foodFilter).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/Food & Dining intelligence active/i);
    expect(screen.getByLabelText(/Budget category Food & Dining/i)).toHaveClass('is-synced');
    expect(screen.getByLabelText(/Budget category Flights & Transportation/i)).toHaveClass('is-muted');
  });

  it('syncs city selection with route and itinerary previews', async () => {
    renderInteractiveBudget();

    await userEvent.click(screen.getByRole('button', { name: /Focus Galway/i }));

    expect(screen.getByText(/Galway intelligence panel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Budget route preview/i)).toHaveTextContent('Galway');
    expect(screen.getByLabelText(/Synced itinerary preview/i)).toHaveTextContent('Day 10');
  });

  it('keeps scenario slider edits temporary until explicit save', () => {
    const onSave = vi.fn();
    renderInteractiveBudget({ onSave });

    fireEvent.change(screen.getByLabelText(/Food & Dining scenario adjustment/i), { target: { value: '300' } });

    expect(screen.getByText(/Scenario projection/i)).toHaveTextContent('EUR 300');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('sends current filter and scenario state to Budget AI', async () => {
    const onAsk = vi.fn().mockResolvedValue({
      id: 'answer',
      question: 'question',
      answer: 'Budget AI context received.',
      createdAt: '2026-05-20T00:00:00Z',
      sources: [],
      warnings: [],
      drafts: []
    } satisfies ResearchAnswer);
    renderInteractiveBudget({ onAsk });

    await userEvent.click(screen.getByRole('button', { name: /Focus Galway/i }));
    fireEvent.change(screen.getByLabelText(/Food & Dining scenario adjustment/i), { target: { value: '300' } });
    await userEvent.click(screen.getByRole('button', { name: /See flight options/i }));

    await waitFor(() => expect(onAsk).toHaveBeenCalled());
    const context = onAsk.mock.calls[0][2] as string;
    expect(context).toContain('Selected budget city: Galway');
    expect(context).toContain('Scenario deltas JSON');
    expect(context).toContain('budget-food');
  });
});
