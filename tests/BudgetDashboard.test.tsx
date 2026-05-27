import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BudgetResponse } from '../src/api';
import { BudgetIntelligenceCenter } from '../src/components/budget/BudgetIntelligenceCenter';
import { BudgetWorkspace } from '../src/components/budget/BudgetWorkspace';
import type { DayPlan, ResearchAnswer, Trip } from '../src/types';

const budget: BudgetResponse = {
  items: [
    { id: 'budget-flights', category: 'Flights', label: 'LEX to Dublin roundtrip for five', planned: 6000, actual: 1200, status: 'watching' },
    { id: 'budget-lodging', category: 'Lodging', label: 'Hotels and farm stays', planned: 3200, actual: 800, status: 'researching' },
    { id: 'budget-car', category: 'Transportation', label: 'Automatic SUV and fuel', planned: 1500, actual: 200, status: 'researching' },
    { id: 'budget-food', category: 'Food', label: 'Restaurants and groceries', planned: 2000, actual: 300, status: 'researching' },
    { id: 'budget-activities', category: 'Activities', label: 'Castles and wildlife', planned: 1600, actual: 100, status: 'researching' },
    { id: 'budget-buffer', category: 'Buffer', label: 'Souvenirs', planned: 700, actual: 0, status: 'researching' }
  ],
  summary: {
    target: 15000,
    planned: 15000,
    actual: 2600,
    remainingPlanned: 0,
    remainingActual: 12400,
    plannedPercent: 100,
    actualPercent: 17
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

function props(overrides: Partial<React.ComponentProps<typeof BudgetWorkspace>> = {}) {
  const askAnswer: ResearchAnswer = {
    id: 'answer',
    question: 'question',
    answer: 'Budget AI context received.',
    createdAt: '2026-05-20T00:00:00Z',
    sources: [],
    warnings: [],
    drafts: []
  };
  return {
    budget,
    trip,
    itinerary,
    sources: [],
    onSave: vi.fn(),
    onAsk: vi.fn().mockResolvedValue(askAnswer),
    onApplyDraft: vi.fn(),
    onDismissDraft: vi.fn(),
    onOpenIntelligence: vi.fn(),
    ...overrides
  };
}

describe('BudgetWorkspace', () => {
  it('renders the operational workspace without the large dashboard panels', () => {
    const view = render(<BudgetWorkspace {...props()} />);

    expect(screen.getByRole('heading', { name: /Ireland Expedition Budget/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Budget Categories/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Budget category Flights & Transportation/i)).toBeInTheDocument();
    expect(view.container.querySelectorAll('.budget-metric-card')).toHaveLength(5);
    expect(screen.getByRole('button', { name: /Open Intelligence Center/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Budget Breakdown/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Trip Spending Timeline/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Daily Budget Forecast/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Top Spending Cities/i })).not.toBeInTheDocument();
  });

  it('saves category edits and keeps scenario intelligence off the workspace', async () => {
    const onSave = vi.fn();
    render(<BudgetWorkspace {...props({ onSave })} />);

    const lodgingCard = screen.getByLabelText(/Budget category Lodging & Stays/i);
    const plannedInput = within(lodgingCard).getByLabelText(/Planned amount/i);
    await userEvent.clear(plannedInput);
    await userEvent.type(plannedInput, '3450');
    await userEvent.click(within(lodgingCard).getByRole('button', { name: /Save Lodging & Stays/i }));

    expect(onSave).toHaveBeenCalledWith([{ id: 'budget-lodging', planned: 3450 }]);
    expect(screen.queryByLabelText(/Food & Dining scenario adjustment/i)).not.toBeInTheDocument();
  });
});

describe('BudgetIntelligenceCenter', () => {
  it('renders the immersive intelligence dashboard panels', () => {
    render(<BudgetIntelligenceCenter {...props()} />);

    expect(screen.getByRole('heading', { name: /Budget Intelligence Center/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Spending Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Daily Spend Forecast/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Spend by City/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /AI Financial Insights/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Scenario Simulator/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Route Spend Timeline/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile intelligence sections/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Budget intelligence navigation/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Settings$/i })).not.toBeInTheDocument();
  });

  it('keeps scenario changes temporary until explicit save', () => {
    const onSave = vi.fn();
    render(<BudgetIntelligenceCenter {...props({ onSave })} />);

    fireEvent.change(screen.getByLabelText(/Food & Dining scenario adjustment/i), { target: { value: '300' } });

    expect(screen.getByText(/vs Current Plan/i)).toHaveTextContent('+300');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('expands city intelligence cards into overlays', async () => {
    render(<BudgetIntelligenceCenter {...props()} />);

    await userEvent.click(screen.getByRole('button', { name: /Expand Galway intelligence/i }));

    const dialog = await screen.findByRole('dialog', { name: /Galway intelligence details/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/lodging pressure/i)).toBeInTheDocument();
  });

  it('sends selected scenario context to Budget AI', async () => {
    const onAsk = vi.fn().mockResolvedValue({
      id: 'answer',
      question: 'question',
      answer: 'Scenario context received.',
      createdAt: '2026-05-20T00:00:00Z',
      sources: [],
      warnings: [],
      drafts: []
    } satisfies ResearchAnswer);
    render(<BudgetIntelligenceCenter {...props({ onAsk })} />);

    fireEvent.change(screen.getByLabelText(/Food & Dining scenario adjustment/i), { target: { value: '300' } });
    await userEvent.click(screen.getByRole('button', { name: /Ask AI/i }));

    await waitFor(() => expect(onAsk).toHaveBeenCalled());
    expect(onAsk.mock.calls[0][2]).toContain('Request surface: Budget Intelligence Center.');
    expect(onAsk.mock.calls[0][2]).toContain('Scenario deltas JSON');
    expect(onAsk.mock.calls[0][2]).toContain('budget-food');
  });
});
