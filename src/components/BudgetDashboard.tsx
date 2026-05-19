import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Car,
  Castle,
  Coins,
  Download,
  Euro,
  Gift,
  Hotel,
  PiggyBank,
  Plane,
  Plus,
  Save,
  Sparkles,
  TrendingUp,
  Utensils,
  WalletCards
} from 'lucide-react';
import type { BudgetResponse } from '../api';
import { formatExchangeRate } from '../currency/format';
import { useCurrencyRate } from '../currency/useCurrencyRate';
import { dashboardAssets } from '../dashboardAssets';
import type { BudgetItem } from '../types';

const euroMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

type BudgetIcon = typeof Plane;

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
  const text = `${item.id} ${item.category} ${item.label}`.toLowerCase();
  if (/flight|airfare/.test(text)) return 'flights';
  if (/activity|activities|attraction|castle|cliff|zoo|wildlife|experience/.test(text)) return 'activities';
  if (/lodging|hotel|stay|aparthotel/.test(text)) return 'lodging';
  if (/car|rental|transport|suv|fuel/.test(text)) return 'transportation';
  if (/food|dining|restaurant|grocery|snack/.test(text)) return 'food';
  if (/buffer|souvenir|gift|surprise/.test(text)) return 'buffer';
  return 'fallback';
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
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function CategoryCard({
  item,
  draft,
  onDraft,
  onSave
}: {
  item: BudgetItem;
  draft: Partial<BudgetItem>;
  onDraft: (next: Partial<BudgetItem>) => void;
  onSave: () => void;
}) {
  const presentation = displayFor(item);
  const Icon = presentation.icon;
  const planned = draft.planned ?? item.planned;
  const actual = draft.actual ?? item.actual;
  const remaining = planned - actual;
  const progress = pct(actual, planned);

  return (
    <article className="budget-category-card" aria-label={`Budget category ${presentation.title}`}>
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
    </article>
  );
}

function DonutChart({ items, total }: { items: BudgetItem[]; total: number }) {
  const colors = ['#0b5d3b', '#2f7d67', '#2d73a3', '#d9b95b', '#b56d48', '#7a6ca8'];
  let cursor = 0;
  const gradient = items.map((item, index) => {
    const share = total > 0 ? item.planned / total * 100 : 0;
    const part = `${colors[index % colors.length]} ${cursor}% ${cursor + share}%`;
    cursor += share;
    return part;
  }).join(', ');

  return (
    <div className="budget-donut-panel">
      <div className="budget-analytics-donut" style={{ '--budget-donut': gradient } as CSSProperties}>
        <strong>{euroMoney.format(total)}</strong>
        <span>Total Plan</span>
      </div>
      <div className="budget-donut-legend">
        {items.map((item, index) => {
          const presentation = displayFor(item);
          return (
            <span key={item.id}>
              <i style={{ background: colors[index % colors.length] }} />
              {presentation.title}
              <strong>{pct(item.planned, total)}%</strong>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function IntelligenceCard({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: string }) {
  return (
    <article className="budget-ai-card">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
        {action && <button type="button">{action} <ArrowRight size={13} /></button>}
      </div>
    </article>
  );
}

export function BudgetDashboard({ budget, onSave }: { budget?: BudgetResponse; onSave: (items: Partial<BudgetItem>[]) => Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<string, Partial<BudgetItem>>>({});
  const [activeInsight, setActiveInsight] = useState('Route spending is balanced across the four longest destination stays.');
  const { rate } = useCurrencyRate();

  const summary = budget?.summary;
  const items = budget?.items || [];
  const actualPercent = summary ? pct(summary.actual, summary.target) : 0;
  const remaining = summary ? summary.target - summary.actual : 0;
  const budgetHealth = actualPercent < 72 ? 'Comfortable' : actualPercent < 92 ? 'Watch closely' : 'Tight';
  const dailyBudget = summary ? Math.round(summary.planned / 13) : 0;
  const perTraveler = Math.round(dailyBudget / 5);
  const cityAverage = Math.round((summary?.planned || 0) / Math.max(1, citySpend.length));

  const categories = useMemo(() => items.map((item) => ({ item, presentation: displayFor(item) })), [items]);

  if (!budget || !summary) return null;

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
          <MetricCard icon={<Coins size={22} />} label="Total Budget" value={euroMoney.format(summary.target)} note="100% of travel plan" />
          <MetricCard icon={<TrendingUp size={22} />} label="Planned Spend" value={euroMoney.format(summary.planned)} note={`${summary.plannedPercent}% of total budget`} />
          <MetricCard icon={<WalletCards size={22} />} label="Actual Spend" value={euroMoney.format(summary.actual)} note={`${actualPercent}% of total budget`} />
          <MetricCard icon={<PiggyBank size={22} />} label="Remaining" value={euroMoney.format(remaining)} note={`${pct(remaining, summary.target)}% of budget left`} />
          <article className="budget-metric-card budget-health-card">
            <div className="budget-health-ring" style={{ '--health': 100 - actualPercent } as CSSProperties}><span /></div>
            <div>
              <span>Budget Health</span>
              <strong>{budgetHealth}</strong>
              <small>You are on track for an amazing trip.</small>
            </div>
          </article>
        </div>
      </header>

      <div className="budget-mobile-summary" aria-label="Mobile budget summary">
        <strong>{euroMoney.format(remaining)}</strong>
        <span>remaining · {euroMoney.format(dailyBudget)} / day · {budgetHealth}</span>
      </div>

      <div className="budget-layout">
        <main className="budget-main-column">
          <section className="budget-section-heading">
            <h2><Sparkles size={18} /> Budget Categories</h2>
            <p>Click any category to manage expenses and keep the adventure investment intentional.</p>
          </section>

          <div className="budget-category-stack">
            {categories.map(({ item }) => (
              <CategoryCard
                key={item.id}
                item={item}
                draft={drafts[item.id] || {}}
                onDraft={(next) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], ...next } }))}
                onSave={() => void saveCategory(item)}
              />
            ))}
          </div>
        </main>

        <aside className="budget-analytics-column">
          <section className="budget-panel">
            <h2>Budget Breakdown</h2>
            <DonutChart items={items} total={summary.planned || summary.target} />
          </section>

          <section className="budget-panel">
            <div className="budget-panel-title-row">
              <h2>Trip Spending Timeline</h2>
              <span><i /> Planned <i /> Actual</span>
            </div>
            <div className="budget-timeline-chart" aria-label="Trip spending timeline">
              {cityTimeline.map((city) => (
                <div key={city.city}>
                  <span className="budget-bar budget-bar-planned" style={{ height: barHeight(city.planned) }} />
                  <span className="budget-bar budget-bar-actual" style={{ height: barHeight(city.actual) }} />
                  <small>{city.city}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="budget-panel budget-forecast-panel">
            <h2>Daily Budget Forecast</h2>
            <div>
              <strong>{euroMoney.format(dailyBudget)}</strong><span>Per Day</span><Sparkline />
            </div>
            <div>
              <strong>{euroMoney.format(perTraveler)}</strong><span>Per Traveler / Day</span><Sparkline />
            </div>
            <div>
              <strong>{euroMoney.format(cityAverage)}</strong><span>Per City avg.</span><Sparkline />
            </div>
          </section>

          <section className="budget-panel">
            <h2>Top Spending Cities</h2>
            <div className="budget-city-list">
              {citySpend.map((city) => (
                <div key={city.city}>
                  <span>{city.city}</span>
                  <i><b style={{ width: `${city.percent * 3}%` }} /></i>
                  <strong>{euroMoney.format(city.amount)}</strong>
                  <small>{city.percent}%</small>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <aside className="budget-ai-column">
          <section className="budget-ai-shell">
            <h2><Sparkles size={18} /> AI Budget Intelligence</h2>
            <IntelligenceCard icon={<Euro size={22} />} title="Currency Watch">
              {rate ? formatExchangeRate(rate) : '1 USD = 0.85 EUR'} Favorable trend for USD planning.
            </IntelligenceCard>
            <IntelligenceCard icon={<PiggyBank size={22} />} title="AI Savings Suggestion" action="See flight options">
              Flying Tuesday instead of Friday could save about €420.
            </IntelligenceCard>
            <IntelligenceCard icon={<AlertTriangle size={22} />} title="Budget Alert" action="Review options">
              Lodging in Galway may exceed budget during peak season.
            </IntelligenceCard>
            <IntelligenceCard icon={<CalendarDays size={22} />} title="Daily Spend Forecast" action="View daily breakdown">
              You are projected to spend {euroMoney.format(dailyBudget)} per day.
            </IntelligenceCard>
            <IntelligenceCard icon={<Castle size={22} />} title="Experience Prioritization" action="See top picks">
              Highest value: Cliffs of Moher and Ring of Kerry drive.
            </IntelligenceCard>
            <div className="budget-active-insight" role="status">
              <Sparkles size={15} />
              <span>{activeInsight}</span>
            </div>
            <button className="budget-optimize-button" type="button" onClick={() => setActiveInsight('Savings analysis opened. Flights, lodging, and route pacing are ready for review.')}>
              <Sparkles size={16} /> Optimize Budget with AI
            </button>
          </section>
        </aside>
      </div>

      <nav className="budget-action-dock" aria-label="Budget actions">
        <button type="button" onClick={() => setActiveInsight('Add expense mode opened. Choose a category card, enter actual spend, then save changes.')}><Plus size={16} /> Add Expense</button>
        <button type="button" onClick={() => setActiveInsight('Price comparison opened. Flight and lodging rates are the highest leverage checks this week.')}><Coins size={16} /> Compare Prices</button>
        <button type="button" onClick={() => setActiveInsight('Budget update mode opened. Edit planned or actual amounts directly inside each journey card.')}><Save size={16} /> Update Budget</button>
        <button type="button" onClick={() => setActiveInsight('Savings analysis opened. Flights, lodging, and route pacing are ready for review.')}><Sparkles size={16} /> Ask AI About Savings</button>
        <button type="button" onClick={() => setActiveInsight('Budget export prepared for family review.')}><Download size={16} /> Export Budget</button>
      </nav>
    </section>
  );
}
