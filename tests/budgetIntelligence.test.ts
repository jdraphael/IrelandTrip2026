import { describe, expect, it } from 'vitest';
import type { BudgetItem, DayPlan, Trip } from '../src/types';
import {
  applyScenarioDeltas,
  deriveBudgetIntelligence,
  type BudgetFilterState,
  type ScenarioDelta
} from '../src/lib/budgetIntelligence';

const budgetItems: BudgetItem[] = [
  { id: 'budget-flights', category: 'Flights', label: 'LEX to Dublin flights', planned: 6000, actual: 1200, status: 'watching' },
  { id: 'budget-lodging', category: 'Lodging', label: 'Family hotels', planned: 3200, actual: 800, status: 'researching' },
  { id: 'budget-car', category: 'Transportation', label: 'Automatic SUV', planned: 1500, actual: 200, status: 'researching' },
  { id: 'budget-food', category: 'Food', label: 'Restaurants and groceries', planned: 2000, actual: 300, status: 'researching' },
  { id: 'budget-activities', category: 'Activities', label: 'Castles and wildlife', planned: 1600, actual: 100, status: 'researching' },
  { id: 'budget-buffer', category: 'Buffer', label: 'Souvenirs', planned: 700, actual: 0, status: 'researching' }
];

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

const itinerary = [
  day('day-2', 2, 'Dublin', 'June 19, 2027', 275, 'Arrive in Dublin'),
  day('day-3', 3, 'Dublin', 'June 20, 2027', 275, 'Dublin Zoo'),
  day('day-5', 5, 'Kilkenny', 'June 22, 2027', 220, 'Kilkenny Castle'),
  day('day-6', 6, 'Cork', 'June 23, 2027', 225, 'Blarney and Fota'),
  day('day-8', 8, 'Dingle', 'June 25, 2027', 225, 'Slea Head Drive'),
  day('day-10', 10, 'Galway', 'June 27, 2027', 250, 'Bunratty and Galway')
];

function day(id: string, number: number, base: string, dateLabel: string, nightlyEstimate: number, title: string): DayPlan {
  return {
    id,
    day: number,
    title,
    dateLabel,
    base,
    lodging: { name: `${base} stay`, type: 'hotel', nightlyEstimate },
    stops: [{ id: `${id}-stop`, name: title, kind: 'activity', latitude: 53, longitude: -8 }],
    notes: `${base} family route day`
  };
}

describe('budget intelligence derivation', () => {
  it('maps categories, fixed-flexible grouping, city totals, and traveler forecasts', () => {
    const intelligence = deriveBudgetIntelligence({
      items: budgetItems,
      itinerary,
      trip,
      filters: emptyFilters(),
      scenarioDeltas: {}
    });

    expect(intelligence.categories.map((item) => item.key)).toEqual([
      'flights',
      'lodging',
      'transportation',
      'food',
      'activities',
      'buffer'
    ]);
    expect(intelligence.categories.find((item) => item.key === 'flights')?.spendType).toBe('fixed');
    expect(intelligence.categories.find((item) => item.key === 'food')?.spendType).toBe('flexible');
    expect(intelligence.cities.map((city) => city.city)).toContain('Galway');
    expect(intelligence.forecast.perTravelerPerDay).toBe(Math.round(intelligence.forecast.perDay / 5));
    expect(intelligence.timeline.city.length).toBeGreaterThan(0);
    expect(intelligence.insights.some((insight) => insight.message.includes('scenic value'))).toBe(true);
  });

  it('applies temporary scenario deltas without mutating saved budget items', () => {
    const deltas: Record<string, ScenarioDelta> = {
      'budget-food': { plannedDelta: 350 },
      'budget-flights': { multiplier: 1.15 }
    };

    const projected = applyScenarioDeltas(budgetItems, deltas);

    expect(projected.find((item) => item.id === 'budget-food')?.planned).toBe(2350);
    expect(projected.find((item) => item.id === 'budget-flights')?.planned).toBe(6900);
    expect(budgetItems.find((item) => item.id === 'budget-food')?.planned).toBe(2000);
    expect(budgetItems.find((item) => item.id === 'budget-flights')?.planned).toBe(6000);
  });

  it('filters category and city intelligence together', () => {
    const intelligence = deriveBudgetIntelligence({
      items: budgetItems,
      itinerary,
      trip,
      filters: { ...emptyFilters(), selectedCategory: 'food', selectedCity: 'Galway', spendType: 'flexible' },
      scenarioDeltas: {}
    });

    expect(intelligence.visibleCategories.map((item) => item.key)).toEqual(['food']);
    expect(intelligence.visibleCities.map((city) => city.city)).toEqual(['Galway']);
    expect(intelligence.activeInsight.message).toContain('Food & Dining');
  });
});

function emptyFilters(): BudgetFilterState {
  return {
    selectedCategory: undefined,
    selectedCity: undefined,
    dateRange: 'all',
    traveler: 'all',
    plannedActual: 'both',
    spendType: 'all',
    timelineMode: 'city',
    scrubberPercent: 0
  };
}
