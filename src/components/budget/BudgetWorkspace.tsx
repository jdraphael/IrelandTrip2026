import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CalendarDays, Coins, Euro, Loader2, PiggyBank, Sparkles, TrendingUp, WalletCards } from 'lucide-react';
import { useCurrencyRate } from '../../currency/useCurrencyRate';
import type { BudgetItem, ResearchAnswer, ResearchDraft } from '../../types';
import { deriveBudgetIntelligence, type ScenarioDelta } from '../../lib/budgetIntelligence';
import { BudgetActionDock } from './BudgetActionDock';
import { BudgetAIResultPanel } from './BudgetAIResultPanel';
import { BudgetCategoryCard } from './BudgetCategoryCard';
import {
  budgetAgentContext,
  budgetInteractionContext,
  categoryKey,
  displayFor,
  emptyBudgetFilters,
  euroMoney,
  mergeDraftStatus,
  pct,
  type BudgetSurfaceProps
} from './budgetShared';

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

function IntelligenceChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="budget-workspace-chip">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

export function BudgetWorkspace({
  budget,
  trip,
  itinerary = [],
  sources = [],
  onSave,
  onAsk,
  onApplyDraft,
  onDismissDraft,
  onOpenIntelligence
}: BudgetSurfaceProps & { onOpenIntelligence?: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, Partial<BudgetItem>>>({});
  const [activeInsight, setActiveInsight] = useState('Workspace ready. Edit a category or open the Intelligence Center for deeper analytics.');
  const [answers, setAnswers] = useState<ResearchAnswer[]>([]);
  const [activeAnswerId, setActiveAnswerId] = useState<string>();
  const [busyAction, setBusyAction] = useState<string>();
  const [agentError, setAgentError] = useState('');
  const [lastRequest, setLastRequest] = useState<{ id: string; question: string; deep?: boolean }>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filters = useMemo(() => emptyBudgetFilters(), []);
  const scenarioDeltas = useMemo<Record<string, ScenarioDelta>>(() => ({}), []);
  const { rate, retry: retryCurrency, isRefreshing, status: currencyStatus } = useCurrencyRate();

  const summary = budget?.summary;
  const items = budget?.items || [];
  const intelligence = useMemo(() => deriveBudgetIntelligence({ items, itinerary, trip, filters, scenarioDeltas }), [items, itinerary, trip, filters, scenarioDeltas]);
  const actualPercent = summary ? pct(summary.actual, summary.target) : 0;
  const remaining = summary ? summary.target - summary.actual : 0;
  const budgetHealth = actualPercent < 72 ? 'Comfortable' : actualPercent < 92 ? 'Watch closely' : 'Tight';
  const activeAnswer = answers.find((answer) => answer.id === activeAnswerId) || answers[0];

  if (!budget || !summary) return null;

  const runBudgetIntelligence = async (request: { id: string; question: string; deep?: boolean }) => {
    setLastRequest(request);
    setBusyAction(request.id);
    setAgentError('');
    setActiveInsight('Budget AI is reviewing the saved plan and current workspace context.');
    try {
      const answer = await onAsk(
        request.question,
        Boolean(request.deep),
        budgetAgentContext({
          surface: 'Budget Workspace.',
          budget,
          itinerary,
          trip,
          currencyRate: rate,
          interactionContext: budgetInteractionContext(filters, scenarioDeltas, intelligence)
        })
      );
      setAnswers((current) => [answer, ...current.filter((item) => item.id !== answer.id)]);
      setActiveAnswerId(answer.id);
      setDrawerOpen(true);
      setActiveInsight('Budget AI returned a reviewable recommendation. Apply drafts only when the change looks right.');
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Budget AI is temporarily unavailable.');
      setDrawerOpen(true);
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

  const saveCategory = async (item: BudgetItem) => {
    const draft = drafts[item.id];
    if (!draft) return;
    await onSave([draft]);
    setDrafts((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setActiveInsight(`${displayFor(item).title} updated. Summary totals will refresh from the saved budget response.`);
  };

  const savingsRequest = {
    id: 'savings',
    question: 'Find the highest-leverage flight, lodging, route, and timing savings opportunities for this Ireland family budget. If a budget line should change, return a reviewable budget draft using the existing item id.',
    deep: false
  };
  const priceRequest = {
    id: 'prices',
    question: 'Compare current price-watch priorities for flights, lodging, rental car, experiences, and dining. Focus on what should be checked first and what sources should be verified.',
    deep: true
  };

  return (
    <section className="budget-dashboard budget-workspace">
      <header className="budget-hero budget-workspace-hero">
        <div className="budget-hero-copy">
          <h1>Ireland Expedition Budget</h1>
          <p>Fast, focused controls for managing planned spend, actuals, and budget actions.</p>
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
        <span>remaining | {euroMoney.format(intelligence.forecast.perDay)} / day | {budgetHealth}</span>
      </div>

      <div className="budget-workspace-grid">
        <main className="budget-main-column">
          <section className="budget-section-heading">
            <h2><Sparkles size={18} /> Budget Categories</h2>
            <p>Edit categories directly. Deeper analysis now lives in the Intelligence Center.</p>
          </section>

          <div className="budget-category-stack">
            {items.map((item) => (
              <BudgetCategoryCard
                key={item.id}
                item={item}
                draft={drafts[item.id] || {}}
                onDraft={(next) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], ...next } }))}
                onSelect={() => setActiveInsight(`${displayFor(item).title}: ${displayFor(item).insight}`)}
                onSave={() => void saveCategory(item)}
                syncState={undefined}
              />
            ))}
          </div>
        </main>

        <aside className="budget-workspace-sidebar">
          <section className="budget-quick-intel">
            <div>
              <h2><Sparkles size={18} /> Quick Intelligence</h2>
              <button type="button" onClick={() => setDrawerOpen((current) => !current)}>{drawerOpen ? 'Collapse' : 'Expand'}</button>
            </div>
            <div className="budget-workspace-chip-grid">
              <IntelligenceChip icon={<CalendarDays size={17} />} label="Daily forecast" value={euroMoney.format(intelligence.forecast.perDay)} />
              <IntelligenceChip icon={<PiggyBank size={17} />} label="Flexible control" value={euroMoney.format(intelligence.categories.filter((category) => category.spendType === 'flexible').reduce((sum, category) => sum + category.planned, 0))} />
              <IntelligenceChip icon={<Euro size={17} />} label="Currency" value={rate ? 'Live EUR' : currencyStatus === 'loading' ? 'Loading' : 'Offline'} />
            </div>
            <p className="budget-active-insight" role="status"><Sparkles size={15} /> <span>{activeInsight}</span></p>
            <button className="budget-open-intelligence" type="button" onClick={onOpenIntelligence}>
              Open Intelligence Center
            </button>
            {drawerOpen && (
              <div className="budget-quick-drawer">
                <BudgetAIResultPanel
                  answer={activeAnswer}
                  error={agentError}
                  busy={Boolean(busyAction)}
                  sources={sources}
                  onRetry={lastRequest ? () => void runBudgetIntelligence(lastRequest) : undefined}
                  onApplyDraft={applyBudgetDraft}
                  onDismissDraft={dismissBudgetDraft}
                />
                <button type="button" onClick={() => void retryCurrency()} disabled={isRefreshing}>Refresh currency watch</button>
              </div>
            )}
          </section>
        </aside>
      </div>

      <BudgetActionDock
        busy={Boolean(busyAction)}
        onAddExpense={() => setActiveInsight('Add expense mode opened. Choose a category card, enter actual spend, then save changes.')}
        onComparePrices={() => void runBudgetIntelligence(priceRequest)}
        onUpdateBudget={() => setActiveInsight('Budget update mode opened. Edit planned or actual amounts directly inside each journey card.')}
        onAskSavings={() => void runBudgetIntelligence(savingsRequest)}
        onExport={() => setActiveInsight('Budget export prepared for family review.')}
      />
    </section>
  );
}
