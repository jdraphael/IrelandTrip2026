import type { ReactNode } from 'react';
import { Car, Castle, Gift, Hotel, PiggyBank, Plane, Utensils } from 'lucide-react';
import type { BudgetResponse } from '../../api';
import { formatExchangeRate } from '../../currency/format';
import type { CurrencyRate } from '../../currency/types';
import { dashboardAssets } from '../../dashboardAssets';
import type { BudgetItem, DayPlan, ResearchAnswer, ResearchDraft, SourceLink, Trip } from '../../types';
import {
  budgetCategoryKey,
  type BudgetCategoryKey,
  type BudgetFilterState,
  type BudgetIntelligence,
  type ScenarioDelta
} from '../../lib/budgetIntelligence';

export const euroMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export type BudgetCallbacks = {
  onSave: (items: Partial<BudgetItem>[]) => Promise<void>;
  onAsk: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>;
  onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
  onDismissDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
};

export type BudgetSurfaceProps = BudgetCallbacks & {
  budget?: BudgetResponse;
  trip?: Trip;
  itinerary?: DayPlan[];
  sources?: SourceLink[];
};

export type CategoryPresentation = {
  title: string;
  description: string;
  image: string;
  icon: typeof Plane;
  insight: string;
  recommendation: string;
  tone: 'good' | 'watch' | 'alert';
};

export const categoryPresentation: Record<string, CategoryPresentation> = {
  flights: {
    title: 'Flights & Transportation',
    description: 'Flights, airport transfers, and day-to-day transport.',
    image: dashboardAssets.budgetFlights,
    icon: Plane,
    insight: 'Flights are trending 8% below historical June averages.',
    recommendation: 'Booking within 45 days may reduce flexibility.',
    tone: 'good'
  },
  lodging: {
    title: 'Lodging & Stays',
    description: 'Hotels, aparthotels, farm stays, and airport hotel.',
    image: dashboardAssets.budgetLodging,
    icon: Hotel,
    insight: 'Galway has high demand during peak family travel weeks.',
    recommendation: 'Hold refundable stays before inventory tightens.',
    tone: 'watch'
  },
  transportation: {
    title: 'Car Rental & Fuel',
    description: 'Rental car, fuel, parking, tolls, and route flexibility.',
    image: dashboardAssets.budgetCar,
    icon: Car,
    insight: 'Automatic SUV supply is strongest before the final booking window.',
    recommendation: 'Keep one refundable vehicle hold while rates settle.',
    tone: 'good'
  },
  food: {
    title: 'Food & Dining',
    description: 'Restaurants, groceries, snacks, and pub meals.',
    image: dashboardAssets.budgetDining,
    icon: Utensils,
    insight: 'Dining is the easiest premium lever to flex by city.',
    recommendation: 'Reserve two memorable dinners and keep lunch flexible.',
    tone: 'good'
  },
  activities: {
    title: 'Experiences & Attractions',
    description: 'Castle tours, wildlife parks, cliffs, and family memories.',
    image: dashboardAssets.budgetExperiences,
    icon: Castle,
    insight: 'Book of Kells and Cliffs timing should be protected early.',
    recommendation: 'Prioritize high-memory experiences before add-ons.',
    tone: 'watch'
  },
  buffer: {
    title: 'Souvenirs & Buffer',
    description: 'Souvenirs, gifts, markets, and surprise opportunities.',
    image: dashboardAssets.budgetSouvenirs,
    icon: Gift,
    insight: 'The buffer gives room for artisan markets along the route.',
    recommendation: 'Keep this category flexible until Galway and Dingle.',
    tone: 'good'
  }
};

const fallbackCategory: CategoryPresentation = {
  title: 'Adventure Investment',
  description: 'Curated travel spend for the family route.',
  image: dashboardAssets.budgetHero,
  icon: PiggyBank,
  insight: 'This line item supports the larger Ireland travel experience.',
  recommendation: 'Review timing and flexibility before booking.',
  tone: 'good'
};

export function displayFor(item: BudgetItem) {
  const key = budgetCategoryKey(item);
  return categoryPresentation[key] || {
    ...fallbackCategory,
    title: item.category || fallbackCategory.title,
    description: item.label || fallbackCategory.description
  };
}

export function pct(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(value / total * 100)));
}

export function mergeDraftStatus(answers: ResearchAnswer[], draft: ResearchDraft, fallbackStatus: ResearchDraft['status']) {
  return answers.map((answer) => ({
    ...answer,
    drafts: answer.drafts.map((item) => (
      item.id === draft.id ? { ...item, status: draft.status || fallbackStatus } : item
    ))
  }));
}

export function budgetAgentContext({
  surface,
  budget,
  itinerary,
  trip,
  currencyRate,
  interactionContext
}: {
  surface: string;
  budget: BudgetResponse;
  itinerary: DayPlan[];
  trip?: Trip;
  currencyRate?: CurrencyRate;
  interactionContext?: string;
}) {
  const tripDetail = trip
    ? {
        title: trip.title,
        dates: `${trip.startDate || trip.month} to ${trip.endDate || trip.year}`,
        travelers: trip.travelers,
        origin: trip.origin,
        destination: trip.destination,
        budgetTarget: trip.budgetTarget,
        routeSummary: trip.routeSummary,
        priorities: trip.priorities
      }
    : undefined;
  const itineraryDirectory = itinerary.map((day) => ({
    id: day.id,
    day: day.day,
    title: day.title,
    base: day.base,
    route: day.route
  }));
  return [
    `Request surface: ${surface}.`,
    'Treat all saved budget amounts on this page as EUR.',
    'Saved-data edits must be returned as reviewable budget drafts, never direct mutations.',
    'Use existing budget ids when recommending updates. Only propose a new budget item when the user clearly needs a new line item.',
    tripDetail ? `Trip JSON: ${JSON.stringify(tripDetail)}.` : 'Trip JSON: unavailable.',
    `Budget summary JSON: ${JSON.stringify(budget.summary)}.`,
    `Budget items JSON: ${JSON.stringify(budget.items.map((item) => ({ id: item.id, category: item.category, label: item.label, planned: item.planned, actual: item.actual, status: item.status })))}.`,
    `Visible itinerary directory JSON: ${JSON.stringify(itineraryDirectory)}.`,
    currencyRate ? `Currency context: ${formatExchangeRate(currencyRate)}.` : 'Currency context: live USD to EUR rate unavailable.',
    interactionContext || 'Interactive budget filters: none selected.'
  ].join('\n');
}

export function budgetInteractionContext(filters: BudgetFilterState, scenarioDeltas: Record<string, ScenarioDelta>, intelligence: BudgetIntelligence) {
  return [
    `Selected budget category: ${filters.selectedCategory || 'none'}.`,
    `Selected budget city: ${filters.selectedCity || 'none'}.`,
    `Timeline mode: ${filters.timelineMode}.`,
    `Spend type filter: ${filters.spendType}.`,
    `Scenario deltas JSON: ${JSON.stringify(scenarioDeltas)}.`,
    `Projected planned total: ${intelligence.totalPlanned}.`,
    `Projected actual total: ${intelligence.totalActual}.`,
    `Active local insight: ${intelligence.activeInsight.message}.`
  ].join('\n');
}

export function emptyBudgetFilters(): BudgetFilterState {
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

export function categoryKey(item: BudgetItem): BudgetCategoryKey {
  return budgetCategoryKey(item);
}

export function BudgetPanel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`budget-panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
