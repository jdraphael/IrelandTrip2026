import { Suspense, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Bot, CalendarDays, Download, Home, Loader2, Map, Settings, Sparkles, Users } from 'lucide-react';
import type { ResearchAnswer, ResearchDraft } from '../../types';
import {
  buildTravelerSpendBreakdown,
  calculateBudgetHealth,
  computeCitySpend,
  deriveBudgetIntelligence,
  estimateSavings,
  generateForecast,
  type CitySpendProfile,
  type ScenarioDelta
} from '../../lib/budgetIntelligence';
import { BudgetAIResultPanel } from './BudgetAIResultPanel';
import {
  budgetAgentContext,
  budgetInteractionContext,
  emptyBudgetFilters,
  euroMoney,
  mergeDraftStatus,
  type BudgetSurfaceProps
} from './budgetShared';
import { useCurrencyRate } from '../../currency/useCurrencyRate';
import { AIInsightFeed } from './intelligence/AIInsightFeed';
import { CityIntelligenceCard, CityIntelligenceOverlay } from './intelligence/CityIntelligenceCard';
import { HeroAnalytics } from './intelligence/HeroAnalytics';
import { RouteSpendTimeline } from './intelligence/RouteSpendTimeline';
import { ScenarioSimulator } from './intelligence/ScenarioSimulator';
import { SpendForecastChart, SpendingOverviewChart } from './intelligence/SpendForecastChart';
import { TravelerSpendMatrix } from './intelligence/TravelerSpendMatrix';

function Panel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <motion.section className={`budget-intel-panel ${className}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <h2>{title}</h2>
      {children}
    </motion.section>
  );
}

export function BudgetIntelligenceCenter({
  budget,
  trip,
  itinerary = [],
  sources = [],
  onSave: _onSave,
  onAsk,
  onApplyDraft,
  onDismissDraft,
  onOpenWorkspace
}: BudgetSurfaceProps & { onOpenWorkspace?: () => void }) {
  const [filters, setFilters] = useState(() => emptyBudgetFilters());
  const [scenarioDeltas, setScenarioDeltas] = useState<Record<string, ScenarioDelta>>({});
  const [expandedCity, setExpandedCity] = useState<CitySpendProfile>();
  const [answers, setAnswers] = useState<ResearchAnswer[]>([]);
  const [activeAnswerId, setActiveAnswerId] = useState<string>();
  const [busyAction, setBusyAction] = useState<string>();
  const [agentError, setAgentError] = useState('');
  const [lastRequest, setLastRequest] = useState<{ id: string; question: string; deep?: boolean }>();
  const { rate } = useCurrencyRate();

  const summary = budget?.summary;
  const items = budget?.items || [];
  const intelligence = useMemo(() => deriveBudgetIntelligence({ items, itinerary, trip, filters, scenarioDeltas }), [items, itinerary, trip, filters, scenarioDeltas]);
  const health = useMemo(() => summary ? calculateBudgetHealth(summary, intelligence) : undefined, [summary, intelligence]);
  const forecast = useMemo(() => generateForecast(items, itinerary, trip, scenarioDeltas), [items, itinerary, trip, scenarioDeltas]);
  const cities = useMemo(() => computeCitySpend(items, itinerary, trip, scenarioDeltas), [items, itinerary, trip, scenarioDeltas]);
  const savings = useMemo(() => estimateSavings(intelligence.categories, intelligence.cities, trip), [intelligence.categories, intelligence.cities, trip]);
  const travelers = useMemo(() => buildTravelerSpendBreakdown(items, itinerary, trip), [items, itinerary, trip]);
  const activeAnswer = answers.find((answer) => answer.id === activeAnswerId) || answers[0];

  if (!budget || !summary || !health) return null;

  const runBudgetIntelligence = async (request: { id: string; question: string; deep?: boolean }) => {
    setLastRequest(request);
    setBusyAction(request.id);
    setAgentError('');
    try {
      const answer = await onAsk(
        request.question,
        Boolean(request.deep),
        budgetAgentContext({
          surface: 'Budget Intelligence Center.',
          budget,
          itinerary,
          trip,
          currencyRate: rate,
          interactionContext: budgetInteractionContext(filters, scenarioDeltas, intelligence)
        })
      );
      setAnswers((current) => [answer, ...current.filter((item) => item.id !== answer.id)]);
      setActiveAnswerId(answer.id);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Budget AI is temporarily unavailable.');
    } finally {
      setBusyAction(undefined);
    }
  };

  const applyBudgetDraft = async (draft: ResearchDraft) => {
    const applied = await onApplyDraft(draft);
    const nextDraft = { ...draft, status: applied?.status || 'applied' as const };
    setAnswers((current) => mergeDraftStatus(current, nextDraft, 'applied'));
  };

  const dismissBudgetDraft = async (draft: ResearchDraft) => {
    const dismissed = await onDismissDraft(draft);
    const nextDraft = { ...draft, status: dismissed?.status || 'dismissed' as const };
    setAnswers((current) => mergeDraftStatus(current, nextDraft, 'dismissed'));
  };

  const updateScenario = (id: string, delta: ScenarioDelta) => {
    setScenarioDeltas((current) => ({ ...current, [id]: delta }));
  };

  const optimizeRequest = {
    id: 'optimize',
    question: 'Optimize the full Ireland expedition budget. Identify savings, risks, tradeoffs, anomalies, and contextual recommendations with source attribution.',
    deep: true
  };

  return (
    <section className="budget-intelligence-center">
      <aside className="budget-intel-sidebar" aria-label="Budget intelligence navigation">
        <div className="budget-intel-brand">
          <span>☘</span>
          <div>
            <strong>Ireland Expedition 2026</strong>
            <small>Budget Intelligence Center</small>
          </div>
        </div>
        <nav>
          <button type="button"><Home size={17} /> Overview</button>
          <button type="button"><CalendarDays size={17} /> Itinerary</button>
          <button type="button"><Map size={17} /> Map</button>
          <button type="button" className="active"><Sparkles size={17} /> Intelligence</button>
          <button type="button"><Bot size={17} /> AI Assistant</button>
          <button type="button"><Settings size={17} /> Settings</button>
        </nav>
        <div className="budget-intel-sidebar-photo">
          <strong>Slainte to adventure.</strong>
        </div>
      </aside>

      <main className="budget-intel-main">
        <header className="budget-intel-topbar">
          <h1>Budget Intelligence Center</h1>
          <div>
            <button type="button" onClick={() => void runBudgetIntelligence(optimizeRequest)} disabled={Boolean(busyAction)}>
              {busyAction ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />} AI Assistant
            </button>
            <button type="button"><CalendarDays size={15} /> Jun 18-Jun 30, 2027</button>
            <button type="button"><Users size={15} /> {trip?.travelers || 5} Travelers</button>
            <button type="button"><Download size={15} /> Export</button>
          </div>
        </header>

        <Suspense fallback={<div className="budget-intel-skeleton">Loading hero analytics...</div>}>
          <HeroAnalytics budget={budget} trip={trip} intelligence={intelligence} health={health} savings={savings} forecast={forecast} />
        </Suspense>

        <div className="budget-intel-mobile-strip" aria-label="Mobile intelligence sections">
          {['Overview', 'Forecast', 'Cities', 'AI Insights', 'Scenarios', 'Timeline'].map((label) => <button type="button" key={label}>{label}</button>)}
        </div>

        <div className="budget-intel-grid">
          <Panel title="Spending Overview">
            <SpendingOverviewChart intelligence={intelligence} />
          </Panel>

          <Panel title="Daily Spend Forecast" className="wide">
            <SpendForecastChart intelligence={intelligence} />
          </Panel>

          <Panel title="Spend by City">
            <div className="budget-intel-city-list">
              {cities.slice(0, 6).map((city) => (
                <button
                  type="button"
                  key={city.city}
                  onClick={() => setFilters((current) => ({ ...current, selectedCity: current.selectedCity === city.city ? undefined : city.city }))}
                >
                  <span>{city.city}</span>
                  <i><b style={{ width: `${Math.max(8, city.percent * 2.5)}%` }} /></i>
                  <strong>{euroMoney.format(city.planned)}</strong>
                  <small>{city.percent}%</small>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="AI Financial Insights">
            <AIInsightFeed savings={savings} onAsk={() => void runBudgetIntelligence(optimizeRequest)} />
            <BudgetAIResultPanel
              answer={activeAnswer}
              error={agentError}
              busy={Boolean(busyAction)}
              sources={sources}
              onRetry={lastRequest ? () => void runBudgetIntelligence(lastRequest) : undefined}
              onApplyDraft={applyBudgetDraft}
              onDismissDraft={dismissBudgetDraft}
            />
          </Panel>

          <Panel title="Scenario Simulator" className="wide">
            <ScenarioSimulator intelligence={intelligence} scenarioDeltas={scenarioDeltas} onScenario={updateScenario} />
          </Panel>

          <Panel title="Top Spending Days">
            <div className="budget-intel-top-days">
              {intelligence.timeline.daily.slice(0, 4).map((point) => (
                <article key={point.id}>
                  <span>{point.label}</span>
                  <small>{point.city}</small>
                  <strong>{euroMoney.format(point.planned)}</strong>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="City Intelligence Panels" className="wide">
            <div className="budget-intel-city-cards">
              {cities.slice(0, 5).map((city) => <CityIntelligenceCard city={city} onExpand={setExpandedCity} key={city.city} />)}
            </div>
          </Panel>

          <Panel title="Traveler Spend Matrix">
            <TravelerSpendMatrix travelers={travelers} />
          </Panel>

          <Panel title="Route Spend Timeline" className="wide">
            <RouteSpendTimeline intelligence={intelligence} />
          </Panel>
        </div>

        <footer className="budget-intel-footer">
          <span>Need help optimizing your budget? Ask AI about savings opportunities.</span>
          <button type="button" onClick={() => void runBudgetIntelligence(optimizeRequest)} disabled={Boolean(busyAction)}>Ask AI</button>
          <button type="button" onClick={onOpenWorkspace}>Back to Workspace</button>
        </footer>
      </main>

      <CityIntelligenceOverlay city={expandedCity} onClose={() => setExpandedCity(undefined)} />
    </section>
  );
}
