import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Car,
  Castle,
  CheckCircle2,
  Coins,
  Download,
  Euro,
  ExternalLink,
  Gift,
  Hotel,
  Loader2,
  PiggyBank,
  Plane,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  TrendingUp,
  Utensils,
  WalletCards,
  X
} from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';
import type { BudgetResponse } from '../api';
import { formatCacheAge, formatExchangeRate } from '../currency/format';
import { useCurrencyRate } from '../currency/useCurrencyRate';
import { dashboardAssets } from '../dashboardAssets';
import type { BudgetItem, DayPlan, ResearchAnswer, ResearchDraft, SourceLink, Trip } from '../types';
import {
  budgetCategoryKey,
  deriveBudgetIntelligence,
  type BudgetCategoryKey,
  type BudgetFilterState,
  type BudgetIntelligence,
  type CategoryMetric,
  type CityMetric,
  type ScenarioDelta,
  type TimelineMode,
  type TimelinePoint
} from '../lib/budgetIntelligence';

const euroMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

type BudgetIcon = typeof Plane;

interface BudgetDashboardProps {
  budget?: BudgetResponse;
  trip?: Trip;
  itinerary?: DayPlan[];
  sources?: SourceLink[];
  onSave: (items: Partial<BudgetItem>[]) => Promise<void>;
  onAsk: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>;
  onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
  onDismissDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
}

interface BudgetIntelligenceRequest {
  id: string;
  question: string;
  deep?: boolean;
}

interface CategoryPresentation {
  title: string;
  description: string;
  image: string;
  icon: BudgetIcon;
  insight: string;
  recommendation: string;
  tone: 'good' | 'watch' | 'alert';
}

const categoryPresentation: Record<string, CategoryPresentation> = {
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
    insight: 'SUVs booked early usually retain better automatic availability.',
    recommendation: 'Keep one refundable vehicle hold while rates settle.',
    tone: 'good'
  },
  food: {
    title: 'Food & Dining',
    description: 'Restaurants, groceries, snacks, and pub meals.',
    image: dashboardAssets.budgetDining,
    icon: Utensils,
    insight: 'You are under budget so far; enjoy local Irish cuisine.',
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

const cityTimeline = [
  { city: 'Dublin', planned: 2150, actual: 820 },
  { city: 'Kilkenny', planned: 1650, actual: 560 },
  { city: 'Cork', planned: 2050, actual: 760 },
  { city: 'Dingle', planned: 1780, actual: 640 },
  { city: 'Galway', planned: 2260, actual: 430 },
  { city: 'Return Dublin', planned: 1880, actual: 860 }
];

const citySpend = [
  { city: 'Dublin', amount: 3450, percent: 23 },
  { city: 'Cork', amount: 2980, percent: 20 },
  { city: 'Galway', amount: 2650, percent: 18 },
  { city: 'Dingle', amount: 2250, percent: 15 },
  { city: 'Kilkenny', amount: 1670, percent: 11 },
  { city: 'Return Dublin', amount: 1000, percent: 7 }
];

function budgetKey(item: BudgetItem) {
  return budgetCategoryKey(item);
}

function displayFor(item: BudgetItem) {
  return categoryPresentation[budgetKey(item)] || {
    ...fallbackCategory,
    title: item.category || fallbackCategory.title,
    description: item.label || fallbackCategory.description
  };
}

function pct(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(value / total * 100)));
}

function barHeight(value: number) {
  return `${Math.max(10, Math.min(100, value / 28))}%`;
}

function barHeightFromMax(value: number, max: number) {
  return `${Math.max(12, Math.min(100, value / Math.max(1, max) * 100))}%`;
}

function Sparkline() {
  return (
    <span className="budget-sparkline" aria-hidden="true">
      <i /><i /><i /><i /><i /><i />
    </span>
  );
}

function MetricCard({ icon, label, value, note, className = '' }: { icon: ReactNode; label: string; value: string; note: string; className?: string }) {
  return (
    <article className={`budget-metric-card ${className}`}>
      <span className="budget-metric-icon">{icon}</span>
      <div className="budget-metric-copy">
        <span className="budget-metric-label">{label}</span>
        <strong className="budget-metric-value">{value}</strong>
        <small className="budget-metric-note">{note}</small>
      </div>
    </article>
  );
}

function CategoryCard({
  item,
  draft,
  syncState,
  onDraft,
  onSelect,
  onSave
}: {
  item: BudgetItem;
  draft: Partial<BudgetItem>;
  syncState?: 'synced' | 'muted';
  onDraft: (next: Partial<BudgetItem>) => void;
  onSelect: () => void;
  onSave: () => void;
}) {
  const presentation = displayFor(item);
  const Icon = presentation.icon;
  const planned = draft.planned ?? item.planned;
  const actual = draft.actual ?? item.actual;
  const remaining = planned - actual;
  const progress = pct(actual, planned);

  return (
    <motion.article
      layout
      className={`budget-category-card ${syncState === 'synced' ? 'is-synced' : ''} ${syncState === 'muted' ? 'is-muted' : ''}`}
      aria-label={`Budget category ${presentation.title}`}
      onClick={onSelect}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
    >
      <div className="budget-category-image">
        <img src={presentation.image} alt="" loading="lazy" />
        <span><Icon size={22} /></span>
      </div>
      <div className="budget-category-body">
        <div className="budget-category-copy">
          <h3>{presentation.title}</h3>
          <p>{presentation.description}</p>
        </div>
        <div className="budget-card-numbers">
          <label>
            <span>Planned</span>
            <input
              aria-label="Planned amount"
              type="number"
              value={planned}
              onChange={(event) => onDraft({ id: item.id, planned: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Actual</span>
            <input
              aria-label="Actual amount"
              type="number"
              value={actual}
              onChange={(event) => onDraft({ id: item.id, actual: Number(event.target.value) })}
            />
          </label>
          <div>
            <span>Remaining</span>
            <strong>{euroMoney.format(remaining)}</strong>
          </div>
        </div>
        <div className="budget-progress-row">
          <span className="budget-progress-track"><i style={{ width: `${progress}%` }} /></span>
          <strong>{progress}%</strong>
        </div>
        <div className={`budget-card-insight budget-card-insight-${presentation.tone}`}>
          <Sparkles size={14} />
          <span><strong>AI Insight:</strong> {presentation.insight}</span>
        </div>
        <div className="budget-card-actions">
          <span>{presentation.recommendation}</span>
          <button className="button secondary compact" type="button" onClick={onSave} aria-label={`Save ${presentation.title}`}>
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>
      <ArrowRight className="budget-card-arrow" size={18} aria-hidden="true" />
    </motion.article>
  );
}

function InteractiveDonutChart({
  intelligence,
  selectedCategory,
  hoveredCategory,
  onHover,
  onSelect,
  onExpand
}: {
  intelligence: BudgetIntelligence;
  selectedCategory?: BudgetCategoryKey;
  hoveredCategory?: BudgetCategoryKey;
  onHover: (key?: BudgetCategoryKey) => void;
  onSelect: (category: CategoryMetric) => void;
  onExpand: (category: CategoryMetric) => void;
}) {
  const activeCategory = intelligence.categories.find((category) => category.key === (hoveredCategory || selectedCategory));
  return (
    <div className="budget-donut-panel budget-donut-panel-interactive">
      <div className="budget-analytics-donut budget-recharts-donut" onDoubleClick={() => activeCategory && onExpand(activeCategory)}>
        <PieChart width={156} height={156}>
          <Pie
            data={intelligence.categories}
            dataKey="planned"
            nameKey="title"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={2}
            isAnimationActive
          >
            {intelligence.categories.map((category) => {
              const active = category.key === (hoveredCategory || selectedCategory);
              const dimmed = Boolean(hoveredCategory || selectedCategory) && !active;
              return (
                <Cell
                  key={category.id}
                  fill={category.color}
                  opacity={dimmed ? 0.26 : 1}
                  stroke={active ? '#fff8d8' : 'rgba(255,255,255,0.54)'}
                  strokeWidth={active ? 4 : 1}
                  style={{ filter: active ? 'drop-shadow(0 0 12px rgba(94, 224, 160, .68))' : undefined, cursor: 'pointer' }}
                  onMouseEnter={() => onHover(category.key)}
                  onMouseLeave={() => onHover(undefined)}
                  onClick={() => onSelect(category)}
                  onDoubleClick={() => onExpand(category)}
                />
              );
            })}
          </Pie>
        </PieChart>
        <div className="budget-donut-center">
          <strong>{euroMoney.format(intelligence.totalPlanned)}</strong>
          <span>Total Plan</span>
        </div>
        <AnimatePresence>
          {activeCategory && (
            <motion.div
              className="budget-chart-tooltip"
              initial={{ opacity: 0, y: 8, scale: .98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: .98 }}
            >
              <strong>{activeCategory.title}</strong>
              <span>{euroMoney.format(activeCategory.planned)} planned</span>
              <span>{euroMoney.format(activeCategory.actual)} actual</span>
              <span>{euroMoney.format(activeCategory.remaining)} remaining</span>
              <span>{activeCategory.percent}% of total budget</span>
              <em>{activeCategory.cityImpact} impact: {activeCategory.recommendation}</em>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="budget-donut-legend budget-donut-legend-buttons">
        {intelligence.categories.map((category) => (
          <button
            type="button"
            key={category.id}
            aria-label={`Filter ${category.title}`}
            aria-pressed={selectedCategory === category.key}
            onMouseEnter={() => onHover(category.key)}
            onMouseLeave={() => onHover(undefined)}
            onClick={() => onSelect(category)}
            onDoubleClick={() => onExpand(category)}
          >
            <i style={{ background: category.color }} />
            <span>{category.title}</span>
            <strong>{category.percent}%</strong>
          </button>
        ))}
      </div>
      <button className="budget-expand-analysis" type="button" onClick={() => activeCategory && onExpand(activeCategory)} disabled={!activeCategory}>
        Expand Analysis
      </button>
    </div>
  );
}

function SpendingTimeline({
  filters,
  points,
  hoveredCity,
  onMode,
  onScrub,
  onHoverCity,
  onSelectCity
}: {
  filters: BudgetFilterState;
  points: TimelinePoint[];
  hoveredCity?: string;
  onMode: (mode: TimelineMode) => void;
  onScrub: (value: number) => void;
  onHoverCity: (city?: string) => void;
  onSelectCity: (city: string) => void;
}) {
  const max = Math.max(1, ...points.map((point) => point.planned));
  const scrubIndex = Math.min(points.length - 1, Math.max(0, Math.floor((filters.scrubberPercent / 100) * points.length)));
  const scrubPoint = points[scrubIndex];
  const modes: Array<{ id: TimelineMode; label: string }> = [
    { id: 'daily', label: 'Daily' },
    { id: 'city', label: 'City' },
    { id: 'category', label: 'Category' },
    { id: 'traveler', label: 'Traveler' },
    { id: 'route', label: 'Route Segment' }
  ];
  return (
    <div className="budget-timeline-system">
      <div className="budget-segmented-control" aria-label="Timeline modes">
        {modes.map((mode) => (
          <button key={mode.id} type="button" className={filters.timelineMode === mode.id ? 'active' : ''} onClick={() => onMode(mode.id)}>
            {mode.label}
          </button>
        ))}
      </div>
      <div className="budget-filter-strip" aria-label="Timeline filters">
        <span>{filters.plannedActual === 'both' ? 'Planned + actual' : filters.plannedActual}</span>
        <span>{filters.spendType === 'all' ? 'Fixed + flexible' : filters.spendType}</span>
        <span>{filters.dateRange === 'all' ? 'Full route' : filters.dateRange}</span>
      </div>
      <div className="budget-timeline-chart budget-timeline-chart-live" aria-label="Trip spending timeline">
        {points.map((point) => {
          const city = point.city || point.label;
          const active = hoveredCity === city || filters.selectedCity === city;
          return (
            <button
              type="button"
              key={point.id}
              className={active ? 'active' : ''}
              onMouseEnter={() => onHoverCity(city)}
              onMouseLeave={() => onHoverCity(undefined)}
              onClick={() => onSelectCity(city)}
              aria-label={`Explore ${point.label}`}
            >
              <span className="budget-bar budget-bar-planned" style={{ height: barHeightFromMax(point.planned, max) }} />
              <span className="budget-bar budget-bar-actual" style={{ height: barHeightFromMax(point.actual, max) }} />
              <small>{point.label}</small>
              <em>{euroMoney.format(point.planned)}</em>
            </button>
          );
        })}
      </div>
      <label className="budget-scrubber">
        <span>Journey replay</span>
        <input aria-label="Timeline spending scrubber" type="range" min="0" max="100" value={filters.scrubberPercent} onChange={(event) => onScrub(Number(event.target.value))} />
        <strong>{scrubPoint ? `${scrubPoint.label}: ${euroMoney.format(scrubPoint.planned)}` : 'Route start'}</strong>
      </label>
    </div>
  );
}

function ForecastSimulator({
  intelligence,
  scenarioDeltas,
  onScenario
}: {
  intelligence: BudgetIntelligence;
  scenarioDeltas: Record<string, ScenarioDelta>;
  onScenario: (id: string, delta: ScenarioDelta) => void;
}) {
  const food = intelligence.categories.find((category) => category.key === 'food');
  const lodging = intelligence.categories.find((category) => category.key === 'lodging');
  const flights = intelligence.categories.find((category) => category.key === 'flights');
  const activities = intelligence.categories.find((category) => category.key === 'activities');
  return (
    <div className="budget-forecast-system">
      <div className="budget-forecast-metrics">
        {intelligence.forecast.metrics.map((metric) => (
          <motion.div key={metric.id} whileHover={{ y: -2 }}>
            <strong>{euroMoney.format(metric.value)}</strong>
            <span>{metric.label}</span>
            <Sparkline />
            <small>{metric.confidence}% confidence</small>
            <em>{metric.savings}</em>
          </motion.div>
        ))}
      </div>
      <div className="budget-scenario-panel">
        <div className="budget-panel-title-row">
          <h3>Simulate Budget Scenarios</h3>
          <span className="budget-scenario-total">Scenario projection <strong>EUR {Math.round(intelligence.totalScenarioDelta).toLocaleString('en-US')}</strong></span>
        </div>
        <div className="budget-scenario-buttons">
          {flights && <button type="button" onClick={() => onScenario(flights.id, { multiplier: 1.15 })}>Flights +15%</button>}
          {lodging && <button type="button" onClick={() => onScenario(lodging.id, { plannedDelta: 600 })}>Upgrade lodging</button>}
          {activities && <button type="button" onClick={() => onScenario(activities.id, { plannedDelta: 220 })}>Add castle tour</button>}
        </div>
        <div className="budget-scenario-sliders">
          {intelligence.categories.filter((category) => category.key === 'food' || category.key === 'lodging' || category.key === 'activities').map((category) => (
            <label key={category.id}>
              <span>{category.title}</span>
              <input
                aria-label={`${category.title} scenario adjustment`}
                type="range"
                min="-500"
                max="1500"
                step="50"
                value={scenarioDeltas[category.id]?.plannedDelta || 0}
                onChange={(event) => onScenario(category.id, { plannedDelta: Number(event.target.value) })}
              />
              <strong>EUR {Math.round(scenarioDeltas[category.id]?.plannedDelta || 0).toLocaleString('en-US')}</strong>
            </label>
          ))}
          {food ? <p>{food.insight}</p> : null}
        </div>
      </div>
    </div>
  );
}

function TopCitiesIntelligence({
  intelligence,
  selectedCity,
  hoveredCity,
  onHoverCity,
  onSelectCity,
  onExpand
}: {
  intelligence: BudgetIntelligence;
  selectedCity?: string;
  hoveredCity?: string;
  onHoverCity: (city?: string) => void;
  onSelectCity: (city: string) => void;
  onExpand: (city: CityMetric) => void;
}) {
  const activeCity = intelligence.cities.find((city) => city.city === (hoveredCity || selectedCity)) || intelligence.cities[0];
  return (
    <div className="budget-city-intelligence-grid">
      <div className="budget-city-list budget-city-list-live">
        {intelligence.cities.map((city) => (
          <button
            type="button"
            key={city.city}
            className={selectedCity === city.city ? 'active' : ''}
            aria-label={`Focus ${city.city}`}
            onMouseEnter={() => onHoverCity(city.city)}
            onMouseLeave={() => onHoverCity(undefined)}
            onClick={() => onSelectCity(city.city)}
            onDoubleClick={() => onExpand(city)}
          >
            <span>{city.city}</span>
            <i><b style={{ width: `${Math.max(8, city.percent * 3)}%` }} /></i>
            <strong>{euroMoney.format(city.planned)}</strong>
            <small>{city.percent}%</small>
          </button>
        ))}
      </div>
      <div className="budget-route-preview" aria-label="Budget route preview">
        <img src={dashboardAssets.irelandMap} alt="" loading="lazy" />
        {intelligence.cities.map((city) => (
          <button
            type="button"
            key={city.city}
            className={city.city === activeCity?.city ? 'active' : ''}
            style={{ left: `${city.x}%`, top: `${city.y}%` }}
            aria-label={`Route city ${city.city}`}
            onClick={() => onSelectCity(city.city)}
          >
            <span>{city.city}</span>
          </button>
        ))}
      </div>
      {activeCity && (
        <motion.div className="budget-city-detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} key={activeCity.city}>
          <h3>{activeCity.city} intelligence panel</h3>
          <p>{activeCity.insight}</p>
          <div>
            <span>Lodging <strong>{euroMoney.format(activeCity.categories.lodging || 0)}</strong></span>
            <span>Food <strong>{euroMoney.format(activeCity.categories.food || 0)}</strong></span>
            <span>Attractions <strong>{euroMoney.format(activeCity.categories.activities || 0)}</strong></span>
          </div>
          <button type="button" onClick={() => onExpand(activeCity)}>Expand City Details</button>
        </motion.div>
      )}
      <div className="budget-itinerary-preview" aria-label="Synced itinerary preview">
        <h3>Synced itinerary preview</h3>
        {(activeCity?.days || []).slice(0, 3).map((day) => (
          <article key={day.id}>
            <strong>Day {day.day}</strong>
            <span>{day.title}</span>
            <small>{day.dateLabel}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function FinancialIntelligenceModal({
  intelligence,
  target,
  onClose
}: {
  intelligence: BudgetIntelligence;
  target?: { type: 'category' | 'city'; id: string };
  onClose: () => void;
}) {
  const category = target?.type === 'category' ? intelligence.categories.find((item) => item.key === target.id) : undefined;
  const city = target?.type === 'city' ? intelligence.cities.find((item) => item.city === target.id) : undefined;
  const title = category?.title || city?.city || 'Financial Intelligence';
  return (
    <AnimatePresence>
      {target && (
        <motion.div className="budget-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section className="budget-intelligence-modal" initial={{ y: 32, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 32, scale: .98 }} role="dialog" aria-modal="true" aria-label={`${title} financial intelligence`}>
            <button className="budget-modal-close" type="button" onClick={onClose} aria-label="Close financial intelligence"><X size={18} /></button>
            <header>
              <span><Sparkles size={16} /> Fullscreen Financial Intelligence</span>
              <h2>{title}</h2>
              <p>{category?.insight || city?.insight || intelligence.activeInsight.message}</p>
            </header>
            <div className="budget-modal-grid">
              <article>
                <h3>Trend Analysis</h3>
                <strong>{euroMoney.format(category?.planned || city?.planned || intelligence.totalPlanned)}</strong>
                <p>Historical comparison is tracking below peak summer volatility when refundable holds remain open.</p>
              </article>
              <article>
                <h3>Daily Average</h3>
                <strong>{euroMoney.format(city?.dailyAverage || intelligence.forecast.perDay)}</strong>
                <p>Confidence improves when lodging and major experiences are locked before the final price-watch window.</p>
              </article>
              <article>
                <h3>Spending Heatmap</h3>
                <div className="budget-heatmap" aria-label="Spending heatmap">
                  {intelligence.timeline.daily.slice(0, 12).map((day) => <span key={day.id} style={{ opacity: Math.max(.32, day.planned / Math.max(1, intelligence.forecast.perDay * 1.8)) }} />)}
                </div>
                <p>Relocation days carry the strongest transportation and snack variance.</p>
              </article>
              <article>
                <h3>Concierge Recommendation</h3>
                <p>{category?.recommendation || city?.savings || 'Keep premium memories protected while allowing dining and souvenir flexibility.'}</p>
              </article>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AnswerText({ text }: { text: string }) {
  return (
    <div className="budget-answer-text">
      {text.replace(/\*\*/g, '').split(/\n{2,}/).map((block, index) => (
        <p key={`${block.slice(0, 18)}-${index}`}>{block.replace(/^- /gm, '* ')}</p>
      ))}
    </div>
  );
}

function BudgetSourceChips({ sources }: { sources: SourceLink[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="budget-source-row">
      {sources.map((source) => (
        <a className="budget-source-chip" href={source.url} target="_blank" rel="noreferrer" key={source.id}>
          {source.title} <ExternalLink size={12} />
        </a>
      ))}
    </div>
  );
}

function budgetDraftTarget(draft: ResearchDraft) {
  const payload = draft.payload as Record<string, unknown>;
  const item = payload.item && typeof payload.item === 'object' ? payload.item as Record<string, unknown> : undefined;
  if (draft.kind === 'budget') return typeof item?.label === 'string' ? `Budget - ${item.label}` : 'Budget';
  return draft.kind;
}

function BudgetDraftReviewCard({
  draft,
  sources,
  onApply,
  onDismiss
}: {
  draft: ResearchDraft;
  sources: SourceLink[];
  onApply: (draft: ResearchDraft) => Promise<void>;
  onDismiss: (draft: ResearchDraft) => Promise<void>;
}) {
  const [applying, setApplying] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const sourceLookup = new Map(sources.map((source) => [source.id, source]));
  const draftSources = (draft.sourceIds || []).map((id) => sourceLookup.get(id)).filter(Boolean) as SourceLink[];
  const apply = async () => {
    setApplying(true);
    try {
      await onApply(draft);
    } finally {
      setApplying(false);
    }
  };
  const dismiss = async () => {
    setDismissing(true);
    try {
      await onDismiss(draft);
    } finally {
      setDismissing(false);
    }
  };

  return (
    <article className="budget-draft-card">
      <div className="budget-draft-head">
        <div>
          <span>{draft.kind} draft</span>
          <h3>{draft.title}</h3>
        </div>
        <strong>{draft.status}</strong>
      </div>
      <p className="budget-draft-target">{budgetDraftTarget(draft)}</p>
      <p>{draft.summary || budgetDraftTarget(draft)}</p>
      <BudgetSourceChips sources={draftSources} />
      {draft.status === 'draft' ? (
        <div className="budget-draft-actions">
          <button type="button" onClick={apply} disabled={applying || dismissing}>
            {applying ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />} Apply Budget Draft
          </button>
          <button type="button" onClick={dismiss} disabled={applying || dismissing}>
            {dismissing ? <Loader2 className="spin" size={14} /> : <X size={14} />} Dismiss Draft
          </button>
        </div>
      ) : draft.status === 'applied' ? (
        <p className="budget-draft-note"><CheckCircle2 size={14} /> Applied to the saved budget.</p>
      ) : (
        <p className="budget-draft-note"><X size={14} /> Dismissed without changing the saved budget.</p>
      )}
    </article>
  );
}

function IntelligenceCard({
  icon,
  title,
  children,
  action,
  onAction,
  disabled,
  busy
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: string;
  onAction?: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <article className="budget-ai-card">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
        {action && (
          <button type="button" onClick={onAction} disabled={disabled || busy}>
            {busy ? <Loader2 className="spin" size={13} /> : null}
            {action} {!busy && <ArrowRight size={13} />}
          </button>
        )}
      </div>
    </article>
  );
}

function mergeDraftStatus(answers: ResearchAnswer[], draft: ResearchDraft, fallbackStatus: ResearchDraft['status']) {
  return answers.map((answer) => ({
    ...answer,
    drafts: answer.drafts.map((item) => (
      item.id === draft.id ? { ...item, status: draft.status || fallbackStatus } : item
    ))
  }));
}

function budgetAgentContext(budget: BudgetResponse, itinerary: DayPlan[], trip?: Trip, currencySummary?: string, interactionContext?: string) {
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
    'Request surface: Budget AI Intelligence rail.',
    'Treat all saved budget amounts on this page as EUR.',
    'Saved-data edits must be returned as reviewable budget drafts, never direct mutations.',
    'Use existing budget ids when recommending updates. Only propose a new budget item when the user clearly needs a new line item.',
    tripDetail ? `Trip JSON: ${JSON.stringify(tripDetail)}.` : 'Trip JSON: unavailable.',
    `Budget summary JSON: ${JSON.stringify(budget.summary)}.`,
    `Budget items JSON: ${JSON.stringify(budget.items.map((item) => ({ id: item.id, category: item.category, label: item.label, planned: item.planned, actual: item.actual, status: item.status })))}.`,
    `Visible itinerary directory JSON: ${JSON.stringify(itineraryDirectory)}.`,
    currencySummary ? `Currency context: ${currencySummary}.` : 'Currency context: live USD to EUR rate unavailable.',
    interactionContext || 'Interactive budget filters: none selected.'
  ].join('\n');
}

function budgetInteractionContext(filters: BudgetFilterState, scenarioDeltas: Record<string, ScenarioDelta>, intelligence: BudgetIntelligence) {
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

export function BudgetDashboard({ budget, trip, itinerary = [], sources = [], onSave, onAsk, onApplyDraft, onDismissDraft }: BudgetDashboardProps) {
  const [drafts, setDrafts] = useState<Record<string, Partial<BudgetItem>>>({});
  const [activeInsight, setActiveInsight] = useState('Route spending is balanced across the four longest destination stays.');
  const [answers, setAnswers] = useState<ResearchAnswer[]>([]);
  const [activeAnswerId, setActiveAnswerId] = useState<string>();
  const [busyAction, setBusyAction] = useState<string>();
  const [agentError, setAgentError] = useState('');
  const [lastRequest, setLastRequest] = useState<BudgetIntelligenceRequest>();
  const [filters, setFilters] = useState<BudgetFilterState>({
    selectedCategory: undefined,
    selectedCity: undefined,
    dateRange: 'all',
    traveler: 'all',
    plannedActual: 'both',
    spendType: 'all',
    timelineMode: 'city',
    scrubberPercent: 0
  });
  const [scenarioDeltas, setScenarioDeltas] = useState<Record<string, ScenarioDelta>>({});
  const [hoveredCategory, setHoveredCategory] = useState<BudgetCategoryKey>();
  const [hoveredCity, setHoveredCity] = useState<string>();
  const [analysisTarget, setAnalysisTarget] = useState<{ type: 'category' | 'city'; id: string }>();
  const { status: currencyStatus, rate, previousRate, error: currencyError, isOffline, isRefreshing, retry: retryCurrency } = useCurrencyRate();

  const summary = budget?.summary;
  const items = budget?.items || [];
  const intelligence = useMemo(
    () => deriveBudgetIntelligence({ items, itinerary, trip, filters, scenarioDeltas }),
    [items, itinerary, trip, filters, scenarioDeltas]
  );
  const actualPercent = summary ? pct(summary.actual, summary.target) : 0;
  const remaining = summary ? summary.target - summary.actual : 0;
  const budgetHealth = actualPercent < 72 ? 'Comfortable' : actualPercent < 92 ? 'Watch closely' : 'Tight';
  const dailyBudget = summary ? intelligence.forecast.perDay : 0;
  const perTraveler = intelligence.forecast.perTravelerPerDay;
  const cityAverage = intelligence.forecast.perCityAverage;
  const currencySummary = rate ? formatExchangeRate(rate) : undefined;
  const currencyDetail = rate
    ? `${formatExchangeRate(rate)}${previousRate ? `, changed from ${previousRate.rate.toFixed(2)}` : ''}${isRefreshing ? ', refreshing' : ''}`
    : currencyStatus === 'loading'
      ? 'Loading live USD to EUR rate.'
      : currencyError || 'Currency rate unavailable.';

  const categories = useMemo(() => items.map((item) => ({ item, presentation: displayFor(item), key: budgetKey(item) })), [items]);
  const activeAnswer = answers.find((answer) => answer.id === activeAnswerId) || answers[0];

  if (!budget || !summary) return null;

  const runBudgetIntelligence = async (request: BudgetIntelligenceRequest) => {
    setLastRequest(request);
    setBusyAction(request.id);
    setAgentError('');
    setActiveInsight(`${request.question} Budget AI is checking the saved plan and route context.`);
    try {
      const answer = await onAsk(
        request.question,
        Boolean(request.deep),
        budgetAgentContext(budget, itinerary, trip, currencySummary, budgetInteractionContext(filters, scenarioDeltas, intelligence))
      );
      setAnswers((current) => [answer, ...current.filter((item) => item.id !== answer.id)]);
      setActiveAnswerId(answer.id);
      setActiveInsight('Budget AI returned a reviewable recommendation. Apply drafts only when the change looks right.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Budget AI is temporarily unavailable.';
      setAgentError(message);
      setActiveInsight('Budget AI could not complete that request. You can retry from the intelligence panel.');
    } finally {
      setBusyAction(undefined);
    }
  };

  const applyBudgetDraft = async (draft: ResearchDraft) => {
    const applied = await onApplyDraft(draft);
    const nextDraft = { ...draft, status: applied?.status || 'applied' as const };
    setAnswers((current) => mergeDraftStatus(current, nextDraft, 'applied'));
    setActiveInsight(`${draft.title} applied. The saved budget has been refreshed.`);
  };

  const dismissBudgetDraft = async (draft: ResearchDraft) => {
    const dismissed = await onDismissDraft(draft);
    const nextDraft = { ...draft, status: dismissed?.status || 'dismissed' as const };
    setAnswers((current) => mergeDraftStatus(current, nextDraft, 'dismissed'));
    setActiveInsight(`${draft.title} dismissed. The saved budget was not changed.`);
  };

  const intelligenceRequests = {
    savings: {
      id: 'savings',
      question: 'Find the highest-leverage flight, lodging, route, and timing savings opportunities for this Ireland family budget. If a budget line should change, return a reviewable budget draft using the existing item id.',
      deep: false
    },
    risk: {
      id: 'risk',
      question: 'Analyze budget risks for lodging, flights, experiences, dining, and remaining flexibility. Prioritize risks that could affect a family of five during peak Ireland travel.',
      deep: false
    },
    daily: {
      id: 'daily',
      question: `Review the daily spend forecast. Planned spend is ${euroMoney.format(summary.planned)}, actual spend is ${euroMoney.format(summary.actual)}, and the current forecast is ${euroMoney.format(dailyBudget)} per day for ${trip?.travelers || 5} travelers.`,
      deep: false
    },
    experiences: {
      id: 'experiences',
      question: 'Rank the highest-value Ireland experiences for this family budget, balancing scenic return, family memory value, tickets, drive time, and weather flexibility.',
      deep: false
    },
    optimize: {
      id: 'optimize',
      question: 'Optimize the full Ireland expedition budget. Identify savings, risks, tradeoffs, and any reviewable budget drafts that would improve the plan without reducing the premium family experience.',
      deep: true
    },
    prices: {
      id: 'prices',
      question: 'Compare current price-watch priorities for flights, lodging, rental car, experiences, and dining. Focus on what should be checked first and what sources should be verified.',
      deep: true
    }
  } satisfies Record<string, BudgetIntelligenceRequest>;

  const saveCategory = async (item: BudgetItem) => {
    const draft = drafts[item.id];
    if (!draft) return;
    await onSave([draft]);
    setDrafts((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setActiveInsight(`${displayFor(item).title} updated. The finance view is recalculating your remaining flexibility.`);
  };

  const selectCategory = (category: CategoryMetric) => {
    setFilters((current) => ({
      ...current,
      selectedCategory: current.selectedCategory === category.key ? undefined : category.key,
      spendType: category.spendType
    }));
    setActiveInsight(`${category.title} intelligence active. ${category.insight}`);
  };

  const selectCity = (city: string) => {
    if (!city || /^Traveler|budget-|route-/i.test(city)) return;
    setFilters((current) => ({ ...current, selectedCity: current.selectedCity === city ? undefined : city }));
    const cityMetric = intelligence.cities.find((item) => item.city === city);
    setActiveInsight(cityMetric ? `${cityMetric.city} spending focus active. ${cityMetric.insight}` : `${city} spending selected.`);
  };

  const updateScenario = (id: string, delta: ScenarioDelta) => {
    setScenarioDeltas((current) => ({ ...current, [id]: delta }));
    setActiveInsight('What-if forecast updated. Saved budget records are unchanged until you save a category or apply an AI draft.');
  };

  return (
    <section className="budget-dashboard">
      <header className="budget-hero">
        <div className="budget-hero-copy">
          <h1>Ireland Expedition Budget</h1>
          <p>Track your family's travel investment across every unforgettable experience.</p>
        </div>
        <div className="budget-hero-route" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <div className="budget-metric-grid">
          <MetricCard icon={<Coins size={22} />} label="Total Budget" value={euroMoney.format(summary.target)} note="Travel plan" />
          <MetricCard icon={<TrendingUp size={22} />} label="Planned Spend" value={euroMoney.format(intelligence.totalPlanned || summary.planned)} note={`${pct(intelligence.totalPlanned || summary.planned, summary.target)}% allocated`} />
          <MetricCard icon={<WalletCards size={22} />} label="Actual Spend" value={euroMoney.format(intelligence.totalActual || summary.actual)} note={`${actualPercent}% spent`} />
          <MetricCard icon={<PiggyBank size={22} />} label="Remaining" value={euroMoney.format(remaining)} note={`${pct(remaining, summary.target)}% left`} />
          <article className="budget-metric-card budget-health-card">
            <div className="budget-health-ring" style={{ '--health': 100 - actualPercent } as CSSProperties} aria-hidden="true"><span /></div>
            <div className="budget-metric-copy">
              <span className="budget-metric-label">Budget Health</span>
              <strong className="budget-metric-value">{budgetHealth}</strong>
              <small className="budget-metric-note">On track</small>
            </div>
          </article>
        </div>
      </header>

      <div className="budget-mobile-summary" aria-label="Mobile budget summary">
        <strong>{euroMoney.format(remaining)}</strong>
        <span>remaining | {euroMoney.format(dailyBudget)} / day | {budgetHealth}</span>
      </div>

      <div className="budget-layout">
        <main className="budget-main-column">
          <section className="budget-section-heading">
            <h2><Sparkles size={18} /> Budget Categories</h2>
            <p>Click any category to manage expenses and keep the adventure investment intentional.</p>
          </section>

          <div className="budget-category-stack">
            {categories.map(({ item, key }) => (
              <CategoryCard
                key={item.id}
                item={item}
                draft={drafts[item.id] || {}}
                syncState={filters.selectedCategory ? (filters.selectedCategory === key ? 'synced' : 'muted') : undefined}
                onDraft={(next) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], ...next } }))}
                onSelect={() => {
                  const metric = intelligence.categories.find((category) => category.id === item.id);
                  if (metric) selectCategory(metric);
                }}
                onSave={() => void saveCategory(item)}
              />
            ))}
          </div>
        </main>

        <aside className="budget-analytics-column">
          <section className="budget-panel">
            <h2>Budget Breakdown</h2>
            <InteractiveDonutChart
              intelligence={intelligence}
              selectedCategory={filters.selectedCategory}
              hoveredCategory={hoveredCategory}
              onHover={setHoveredCategory}
              onSelect={selectCategory}
              onExpand={(category) => setAnalysisTarget({ type: 'category', id: category.key })}
            />
          </section>

          <section className="budget-panel">
            <div className="budget-panel-title-row">
              <h2>Trip Spending Timeline</h2>
              <span><i /> Planned <i /> Actual</span>
            </div>
            <SpendingTimeline
              filters={filters}
              points={intelligence.activeTimeline}
              hoveredCity={hoveredCity}
              onMode={(timelineMode) => setFilters((current) => ({ ...current, timelineMode }))}
              onScrub={(scrubberPercent) => setFilters((current) => ({ ...current, scrubberPercent }))}
              onHoverCity={setHoveredCity}
              onSelectCity={selectCity}
            />
          </section>

          <section className="budget-panel budget-forecast-panel">
            <h2>Daily Budget Forecast</h2>
            <ForecastSimulator intelligence={intelligence} scenarioDeltas={scenarioDeltas} onScenario={updateScenario} />
          </section>

          <section className="budget-panel">
            <h2>Top Spending Cities</h2>
            <TopCitiesIntelligence
              intelligence={intelligence}
              selectedCity={filters.selectedCity}
              hoveredCity={hoveredCity}
              onHoverCity={setHoveredCity}
              onSelectCity={selectCity}
              onExpand={(city) => setAnalysisTarget({ type: 'city', id: city.city })}
            />
          </section>
        </aside>

        <aside className="budget-ai-column">
          <section className="budget-ai-shell">
            <h2><Sparkles size={18} /> AI Budget Intelligence</h2>
            <IntelligenceCard
              icon={<Euro size={22} />}
              title="Currency Watch"
              action={currencyStatus === 'error' ? 'Retry rate' : undefined}
              onAction={() => void retryCurrency()}
              busy={isRefreshing}
            >
              {currencyDetail} {rate?.fetchedAt ? formatCacheAge(rate.fetchedAt) : ''} {isOffline ? 'Offline mode using cached rate.' : 'Live exchange watch for USD planning.'}
            </IntelligenceCard>
            <IntelligenceCard
              icon={<PiggyBank size={22} />}
              title="AI Savings Suggestion"
              action="See flight options"
              onAction={() => void runBudgetIntelligence(intelligenceRequests.savings)}
              busy={busyAction === intelligenceRequests.savings.id}
              disabled={Boolean(busyAction)}
            >
              Flying Tuesday instead of Friday could save about EUR 420.
            </IntelligenceCard>
            <IntelligenceCard
              icon={<AlertTriangle size={22} />}
              title="Budget Alert"
              action="Review options"
              onAction={() => void runBudgetIntelligence(intelligenceRequests.risk)}
              busy={busyAction === intelligenceRequests.risk.id}
              disabled={Boolean(busyAction)}
            >
              Lodging in Galway may exceed budget during peak season.
            </IntelligenceCard>
            <IntelligenceCard
              icon={<CalendarDays size={22} />}
              title="Daily Spend Forecast"
              action="View daily breakdown"
              onAction={() => void runBudgetIntelligence(intelligenceRequests.daily)}
              busy={busyAction === intelligenceRequests.daily.id}
              disabled={Boolean(busyAction)}
            >
              You are projected to spend {euroMoney.format(dailyBudget)} per day.
            </IntelligenceCard>
            <IntelligenceCard
              icon={<Castle size={22} />}
              title="Experience Prioritization"
              action="See top picks"
              onAction={() => void runBudgetIntelligence(intelligenceRequests.experiences)}
              busy={busyAction === intelligenceRequests.experiences.id}
              disabled={Boolean(busyAction)}
            >
              Highest value: Cliffs of Moher and Ring of Kerry drive.
            </IntelligenceCard>
            {(activeAnswer || agentError || busyAction) && (
              <section className="budget-ai-result" aria-label="Budget AI result">
                <div className="budget-ai-result-head">
                  <span><Sparkles size={14} /> Active intelligence</span>
                  {busyAction && <strong><Loader2 className="spin" size={14} /> Researching</strong>}
                </div>
                {agentError && (
                  <div className="budget-ai-error" role="alert">
                    <AlertTriangle size={15} />
                    <span>{agentError}</span>
                    {lastRequest && (
                      <button type="button" onClick={() => void runBudgetIntelligence(lastRequest)} disabled={Boolean(busyAction)}>
                        <RefreshCcw size={13} /> Retry Budget AI
                      </button>
                    )}
                  </div>
                )}
                {activeAnswer && !agentError && (
                  <>
                    <AnswerText text={activeAnswer.answer} />
                    {activeAnswer.warnings.map((warning) => (
                      <p className="budget-ai-warning" key={warning}><AlertTriangle size={14} /> {warning}</p>
                    ))}
                    <BudgetSourceChips sources={activeAnswer.sources} />
                    {activeAnswer.drafts.map((draft) => (
                      <BudgetDraftReviewCard
                        key={draft.id}
                        draft={draft}
                        sources={[...sources, ...activeAnswer.sources]}
                        onApply={applyBudgetDraft}
                        onDismiss={dismissBudgetDraft}
                      />
                    ))}
                  </>
                )}
              </section>
            )}
            <div className="budget-active-insight" role="status">
              <Sparkles size={15} />
              <span>{activeInsight}</span>
            </div>
            <button
              className="budget-optimize-button"
              type="button"
              onClick={() => void runBudgetIntelligence(intelligenceRequests.optimize)}
              disabled={Boolean(busyAction)}
            >
              {busyAction === intelligenceRequests.optimize.id ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />} Optimize Budget with AI
            </button>
          </section>
        </aside>
      </div>

      <FinancialIntelligenceModal intelligence={intelligence} target={analysisTarget} onClose={() => setAnalysisTarget(undefined)} />

      <nav className="budget-action-dock" aria-label="Budget actions">
        <button type="button" onClick={() => setActiveInsight('Add expense mode opened. Choose a category card, enter actual spend, then save changes.')}><Plus size={16} /> Add Expense</button>
        <button type="button" onClick={() => void runBudgetIntelligence(intelligenceRequests.prices)} disabled={Boolean(busyAction)}><Coins size={16} /> Compare Prices</button>
        <button type="button" onClick={() => setActiveInsight('Budget update mode opened. Edit planned or actual amounts directly inside each journey card.')}><Save size={16} /> Update Budget</button>
        <button type="button" onClick={() => void runBudgetIntelligence(intelligenceRequests.savings)} disabled={Boolean(busyAction)}><Sparkles size={16} /> Ask AI About Savings</button>
        <button type="button" onClick={() => setActiveInsight('Budget export prepared for family review.')}><Download size={16} /> Export Budget</button>
      </nav>
    </section>
  );
}
