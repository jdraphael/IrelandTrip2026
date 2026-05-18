import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Banknote, Bell, Bot, CalendarDays, Car, Castle, CheckCircle2, ChevronDown, ChevronsLeft, ChevronsRight, Cloud, CloudRain, CreditCard, ExternalLink, Eye, EyeOff, FileCheck2, Home, Hotel, Loader2, MapPinned, Menu, MessageCircle, MoreHorizontal, Plane, PiggyBank, RefreshCw, Route, Save, Search, ShieldCheck, Smile, Sparkles, StickyNote, Sun, Users, X } from 'lucide-react';
import { api, type BudgetResponse, type SourcesResponse, type TasksResponse } from './api';
import { ChecklistDashboard } from './components/ChecklistDashboard';
import { CinematicMap } from './components/CinematicMap';
import { CurrencyHeaderTile } from './components/CurrencyHeaderTile';
import { TravelerMenu } from './components/TravelerMenu';
import { dashboardAssets, itineraryAssets, itineraryThumbnailAssets } from './dashboardAssets';
import { getTimeOfDayGreeting } from './lib/greeting';
import type { BookingTask, BudgetItem, DayPlan, FamilyMember, PaymentTag, ResearchAnswer, ResearchDraft, SourceLink, Trip } from './types';

type Tab = 'dashboard' | 'itinerary' | 'research' | 'map' | 'budget' | 'tasks' | 'sources';

interface AppState {
  trip?: Trip;
  familyMembers?: FamilyMember[];
  itinerary: DayPlan[];
  budget?: BudgetResponse;
  tasks?: TasksResponse;
  sources?: SourcesResponse;
  research: ResearchAnswer[];
}

const tabs: Array<{ id: Tab; label: string; icon: typeof CalendarDays }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'itinerary', label: 'Itinerary', icon: CalendarDays },
  { id: 'research', label: 'Research Agent', icon: Bot },
  { id: 'map', label: 'Map', icon: MapPinned },
  { id: 'budget', label: 'Budget', icon: PiggyBank },
  { id: 'tasks', label: 'Checklist', icon: FileCheck2 },
  { id: 'sources', label: 'Sources', icon: ShieldCheck }
];

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function parseTripDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatTripDateRange(trip?: Trip) {
  const start = parseTripDate(trip?.startDate);
  const end = parseTripDate(trip?.endDate);
  if (!start || !end) return `${trip?.month || 'June'} ${trip?.year || 2027}`;
  const month = start.toLocaleString('en-US', { month: 'short' });
  return `${month} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
}

const dashboardAssetStyle = {
  '--asset-sidebar': `url(${dashboardAssets.sidebarBackground})`,
  '--asset-hero': `url(${dashboardAssets.heroBanner})`,
  '--asset-planning': `url(${dashboardAssets.planningHealth})`,
  '--asset-route': `url(${dashboardAssets.routeSnapshot})`,
  '--asset-drive': `url(${dashboardAssets.driveWatch})`,
  '--asset-source': `url(${dashboardAssets.sourceStatus})`,
  '--asset-agent-button': `url(${dashboardAssets.agentButton})`,
  '--asset-family': `url(${dashboardAssets.familyProfile})`,
  '--asset-mobile-nav': `url(${dashboardAssets.bottomMobileNav})`,
  '--asset-mobile-hero': `url(${dashboardAssets.mobileHero})`,
  '--asset-texture': `url(${dashboardAssets.backgroundTexture})`,
  '--asset-checklist': `url(${dashboardAssets.checklist})`,
  '--asset-budget': `url(${dashboardAssets.budget})`,
  '--asset-research': `url(${dashboardAssets.researchAgent})`,
  '--asset-family-hub': `url(${dashboardAssets.familyHub})`,
  '--asset-empty': `url(${dashboardAssets.emptyState})`,
  '--asset-login': `url(${dashboardAssets.loginBackground})`,
  '--asset-map': `url(${dashboardAssets.irelandMap})`,
  '--asset-chat': `url(${dashboardAssets.chatBackground})`,
  '--asset-research-hero': `url(${dashboardAssets.researchHero})`,
  '--asset-research-map': `url(${dashboardAssets.researchMap})`,
  '--asset-map-expedition': `url(${dashboardAssets.mapExpedition})`
} as CSSProperties;

function googleMapsUrl(day: DayPlan) {
  const locations = day.stops.map((stop) => `${stop.latitude},${stop.longitude}`);
  if (locations.length === 0) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/dir/${locations.map(encodeURIComponent).join('/')}`;
}

function sourceLookup(items: SourceLink[] = []) {
  return new Map(items.map((source) => [source.id, source]));
}

function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'danger' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function BrandMark() {
  return (
    <span className="brand-mark">
      <img className="brand-icon" src="/icon-192.png" alt="Ireland Trip Agent icon" draggable="false" />
    </span>
  );
}

function NavigationItems({ activeTab, onSelect }: { activeTab: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <>
      {tabs.map((item) => {
        const Icon = item.icon;
        return (
          <button className={activeTab === item.id ? 'active' : ''} key={item.id} onClick={() => onSelect(item.id)} aria-label={item.label}>
            <Icon size={18} />
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </>
  );
}

function MobileBottomNav({ activeTab, onSelect, onMore }: { activeTab: Tab; onSelect: (tab: Tab) => void; onMore: () => void }) {
  const items: Array<{ id: Tab; label: string; icon: typeof CalendarDays }> = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'itinerary', label: 'Itinerary', icon: CalendarDays },
    { id: 'map', label: 'Map', icon: MapPinned },
    { id: 'tasks', label: 'Checklist', icon: FileCheck2 }
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile dashboard navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button type="button" className={activeTab === item.id ? 'active' : ''} key={item.id} onClick={() => onSelect(item.id)} aria-label={item.label}>
            <Icon size={19} />
            <span>{item.label}</span>
          </button>
        );
      })}
      <button type="button" onClick={onMore} aria-label="More">
        <MoreHorizontal size={20} />
        <span>More</span>
      </button>
    </nav>
  );
}

function ProgressBar({ value, tone = 'green' }: { value: number; tone?: 'green' | 'blue' }) {
  return (
    <div className="progress" aria-label={`${value}%`}>
      <span className={`progress-fill ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function routeThumb(base: string) {
  const key = base.toLowerCase();
  if (key.includes('kilkenny')) return itineraryThumbnailAssets[1];
  if (key.includes('cork')) return itineraryThumbnailAssets[2];
  if (key.includes('dingle')) return itineraryThumbnailAssets[3];
  if (key.includes('galway')) return itineraryThumbnailAssets[4];
  if (key.includes('killarney')) return itineraryThumbnailAssets[7];
  return itineraryThumbnailAssets[0];
}

function itineraryThumb(day: DayPlan) {
  const key = [day.base, day.title, day.route, ...day.stops.map((stop) => stop.name)].join(' ').toLowerCase();
  if (key.includes('sheepdog') || key.includes('sheep farm')) return itineraryThumbnailAssets[6];
  if (key.includes('cliffs of moher') || key.includes('moher')) return itineraryThumbnailAssets[5];
  if (key.includes('killarney')) return itineraryThumbnailAssets[7];
  if (key.includes('galway')) return itineraryThumbnailAssets[4];
  if (key.includes('dingle')) return itineraryThumbnailAssets[3];
  if (key.includes('cork')) return itineraryThumbnailAssets[2];
  if (key.includes('kilkenny')) return itineraryThumbnailAssets[1];
  return itineraryThumbnailAssets[0];
}

function AnswerText({ text }: { text: string }) {
  const cleaned = text.replace(/\*\*/g, '');
  return (
    <div className="answer-text">
      {cleaned.split(/\n{2,}/).map((block, index) => (
        <p key={`${block.slice(0, 18)}-${index}`}>{block.replace(/^- /gm, '• ')}</p>
      ))}
    </div>
  );
}

function SourceChips({ ids, sources }: { ids?: string[]; sources: SourceLink[] }) {
  const lookup = sourceLookup(sources);
  const selected = (ids || []).map((id) => lookup.get(id)).filter(Boolean) as SourceLink[];
  if (selected.length === 0) return null;
  return (
    <div className="source-row">
      {selected.map((source) => (
        <a className="source-chip" href={source.url} target="_blank" rel="noreferrer" key={source.id}>
          {source.title} <ExternalLink size={13} />
        </a>
      ))}
    </div>
  );
}

function fallbackPaymentTags(day: DayPlan): PaymentTag[] {
  const text = `${day.title} ${day.base} ${day.route || ''} ${day.notes}`.toLowerCase();
  const longOrRural = Boolean(day.distanceMiles && day.distanceMiles >= 120) || /dingle|farm|sheepdog|slea|rural|scenic|parking|market|small|drive/.test(text);
  const minCashEur = longOrRural ? 80 : /kilkenny|cork|galway|kerry|cliffs|connemara|kinsale|blarney|fota/.test(text) ? 60 : 30;
  const maxCashEur = longOrRural ? 150 : minCashEur === 60 ? 120 : 80;
  return [
    { id: 'visa', kind: 'card', label: 'Visa', network: 'Visa', note: 'Recommended primary card' },
    { id: 'mastercard', kind: 'card', label: 'Mastercard', network: 'Mastercard', note: 'Recommended backup card' },
    { id: 'cash', kind: 'cash', label: `EUR ${minCashEur}-${maxCashEur}`, minCashEur, maxCashEur, note: 'Recommended daily cash range' }
  ];
}

function paymentTagLabel(tag: PaymentTag) {
  if (tag.kind === 'cash' && tag.minCashEur !== undefined && tag.maxCashEur !== undefined) {
    return `EUR ${tag.minCashEur}-${tag.maxCashEur}`;
  }
  return tag.label;
}

function PaymentTags({ day }: { day: DayPlan }) {
  const tags = day.paymentTags && day.paymentTags.length > 0 ? day.paymentTags : fallbackPaymentTags(day);
  return (
    <div className="payment-tags" aria-label={`Recommended payment methods for day ${day.day}`}>
      {tags.map((tag) => (
        <span className={`payment-chip payment-chip-${tag.kind}`} title={tag.note} aria-label={tag.note ? `${paymentTagLabel(tag)}: ${tag.note}` : paymentTagLabel(tag)} key={tag.id}>
          {tag.kind === 'cash' ? <Banknote size={15} /> : <CreditCard size={15} />}
          {tag.network === 'Visa' || tag.label.toLowerCase() === 'visa' ? (
            <span className="visa-wordmark" aria-hidden="true">VISA</span>
          ) : tag.network === 'Mastercard' || tag.label.toLowerCase() === 'mastercard' ? (
            <span className="mastercard-mark" aria-hidden="true"><span /><span /></span>
          ) : (
            paymentTagLabel(tag)
          )}
        </span>
      ))}
    </div>
  );
}

function Dashboard({ state, setTab }: { state: AppState; setTab: (tab: Tab) => void }) {
  const nextTask = state.tasks?.summary.nextTask;
  const firstLongDay = state.itinerary.find((day) => day.distanceMiles && day.distanceMiles >= 130);
  const plannedPercent = state.budget?.summary.plannedPercent || 0;
  const remainingPlanned = state.budget?.summary.remainingPlanned || 0;
  const budgetTarget = state.trip?.budgetTarget || 15000;
  const routeDays = state.itinerary.filter((day) => day.base !== 'In flight' && day.base !== 'Travel home').slice(0, 8);
  const tripDateRange = formatTripDateRange(state.trip);
  return (
    <div className="dashboard-grid">
      <section className="hero-panel dashboard-hero">
        <div className="hero-copy">
          <h1>Your Ireland adventure is waiting</h1>
          <p>{tripDateRange} · {state.trip?.travelers} travelers · {state.trip?.origin} to {state.trip?.destination}</p>
          <button className="button primary agent-button" onClick={() => setTab('research')}><Bot size={17} /> Ask the Agent</button>
        </div>
        <section className="panel planning-card hero-planning-card" aria-label="Planning Health">
          <div className="dashboard-card-title">
            <ShieldCheck size={19} />
            <h2>Planning Health</h2>
          </div>
          <div className="planning-metrics">
            <div className="progress-ring" style={{ '--progress': plannedPercent } as CSSProperties}>
              <strong>{Math.round(plannedPercent)}%</strong>
              <span>On Track</span>
            </div>
            <div>
              <span className="metric-label">Budget planned</span>
              <strong>{money.format(state.budget?.summary.planned || 0)}</strong>
              <StatusPill tone={remainingPlanned >= 0 ? 'good' : 'danger'}>
                {remainingPlanned >= 0 ? 'Within target' : 'Over target'}
              </StatusPill>
            </div>
          </div>
          <ProgressBar value={plannedPercent} />
          <button className="dashboard-link" type="button" onClick={() => setTab('budget')}>
            <span>{money.format(remainingPlanned)} remaining against {money.format(budgetTarget)}</span>
            <span aria-hidden="true">›</span>
          </button>
        </section>
      </section>
      <section className="panel planning-card mobile-planning-card">
        <div className="dashboard-card-title">
          <ShieldCheck size={19} />
          <h2>Planning Health</h2>
        </div>
        <div className="planning-metrics">
          <div className="progress-ring" style={{ '--progress': plannedPercent } as CSSProperties}>
            <strong>{Math.round(plannedPercent)}%</strong>
            <span>On Track</span>
          </div>
          <div>
            <span className="metric-label">Budget planned</span>
            <strong>{money.format(state.budget?.summary.planned || 0)}</strong>
            <StatusPill tone={remainingPlanned >= 0 ? 'good' : 'danger'}>
              {remainingPlanned >= 0 ? 'Within target' : 'Over target'}
            </StatusPill>
          </div>
        </div>
        <ProgressBar value={plannedPercent} />
        <button className="dashboard-link" type="button" onClick={() => setTab('budget')}>
          <span>{money.format(remainingPlanned)} remaining against {money.format(budgetTarget)}</span>
          <span aria-hidden="true">›</span>
        </button>
      </section>
      <section className="panel next-card illustrated-card">
        <div className="dashboard-card-title">
          <CalendarDays size={19} />
          <h2>Next Up</h2>
        </div>
        {nextTask ? (
          <>
            <h3>{nextTask.title}</h3>
            <p>{nextTask.category} · due {nextTask.dueDate}</p>
            <button className="button secondary checklist-button" onClick={() => setTab('tasks')}>Open Checklist</button>
          </>
        ) : (
          <>
            <p className="muted">No open tasks.</p>
            <button className="button secondary checklist-button" onClick={() => setTab('tasks')}>Open Checklist</button>
          </>
        )}
        <img src={dashboardAssets.checklist} alt="" aria-hidden="true" />
      </section>
      <section className="panel route-card wide">
        <div className="dashboard-card-title">
          <MapPinned size={21} />
          <h2>Route Snapshot</h2>
        </div>
        <p>{state.trip?.routeSummary}</p>
        <div className="timeline-strip route-strip">
          {routeDays.map((day) => (
            <button key={day.id} onClick={() => setTab('map')}>
              <span>Day {day.day}</span>
              <strong>{day.base}</strong>
              <img src={routeThumb(day.base)} alt="" aria-hidden="true" />
            </button>
          ))}
        </div>
        <button className="dashboard-link view-itinerary-link" type="button" onClick={() => setTab('itinerary')}>
          <span>View full itinerary</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
      <section className="panel drive-card illustrated-card">
        <div className="dashboard-card-title">
          <Route size={20} />
          <h2>Drive Watch</h2>
        </div>
        {firstLongDay ? (
          <p><strong>Longest driving day: Day {firstLongDay.day}</strong><br />{firstLongDay.title}<br /><span>Est. {firstLongDay.driveTime || '2h 15m'} <span /> {firstLongDay.distanceMiles || 180} km</span></p>
        ) : <p className="muted">No long drive days marked.</p>}
        <button className="dashboard-link" type="button" onClick={() => setTab('map')}>
          <span>View driving details</span>
          <span aria-hidden="true">→</span>
        </button>
        <img src={dashboardAssets.driveWatch} alt="" aria-hidden="true" />
      </section>
      <section className="panel source-card illustrated-card">
        <div className="dashboard-card-title">
          <ShieldCheck size={20} />
          <h2>Source Status</h2>
        </div>
        <p>{state.sources?.summary.officialCount || 0} official/government sources saved.</p>
        {(state.sources?.summary.warnings || []).slice(0, 1).map((warning) => <p className="warning" key={warning}>{warning}</p>)}
        <button className="dashboard-link" type="button" onClick={() => setTab('sources')}>
          <span>View all sources</span>
          <span aria-hidden="true">→</span>
        </button>
        <img src={dashboardAssets.sourceStatus} alt="" aria-hidden="true" />
      </section>
    </div>
  );
}

function LegacyItineraryView({
  days,
  sources,
  currentDayCount,
  onSave,
  onAsk,
  onApplyDraft,
  onDismissDraft
}: {
  days: DayPlan[];
  sources: SourceLink[];
  currentDayCount: number;
  onSave: (updates: Partial<DayPlan>[]) => Promise<void>;
  onAsk: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>;
  onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
  onDismissDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
}) {
  const [editing, setEditing] = useState<Record<string, string>>({});

  return (
    <section className="stack">
      <div className="section-heading">
        <h2>Editable Itinerary</h2>
        <p>Save notes directly here. Ask the Research Agent to prepare sourced itinerary changes for review.</p>
      </div>
      {days.map((day) => (
        <article className="day-card" key={day.id}>
          <div className="day-number">Day {day.day}</div>
          <div className="day-body">
            <img className="day-thumb" src={itineraryThumb(day)} alt="" aria-hidden="true" />
            <div className="day-title-row">
              <div>
                <h3>{day.title}</h3>
                <p>{day.base} · {day.driveTime || 'Local day'}{day.distanceMiles ? ` · ${day.distanceMiles} miles` : ''}</p>
              </div>
              <a className="button ghost" href={googleMapsUrl(day)} target="_blank" rel="noreferrer"><Route size={15} /> Directions</a>
            </div>
            {day.lodging && <p className="lodging">{day.lodging.name} · {money.format(day.lodging.nightlyEstimate)}/night</p>}
            <div className="stop-grid">
              {day.stops.map((stop) => <span key={stop.id}>{stop.name}</span>)}
            </div>
            <textarea
              value={editing[day.id] ?? day.notes}
              onChange={(event) => setEditing((current) => ({ ...current, [day.id]: event.target.value }))}
              aria-label={`Notes for day ${day.day}`}
            />
            <div className="row-actions">
              <button className="button secondary" onClick={() => onSave([{ id: day.id, notes: editing[day.id] ?? day.notes }])}><Save size={15} /> Save Notes</button>
            </div>
            <SourceChips ids={day.sourceIds || day.lodging?.sourceIds || day.stops.flatMap((stop) => stop.sourceIds || [])} sources={sources} />
            <PaymentTags day={day} />
          </div>
        </article>
      ))}
      <ItineraryAgentBubble
        days={days}
        sources={sources}
        currentDayCount={currentDayCount}
        onAsk={onAsk}
        onApplyDraft={onApplyDraft}
        onDismissDraft={onDismissDraft}
      />
    </section>
  );
}

type AgentCommand = { prompt: string; focusDayId?: string; nonce: number };

const routeChapters = [
  { key: 'lex', title: 'LEX', label: 'Departure', image: itineraryAssets.banners.flight },
  { key: 'dublin', title: 'Dublin', label: 'First stay', image: itineraryAssets.banners.dublin },
  { key: 'kilkenny', title: 'Kilkenny', label: 'Castle day', image: itineraryAssets.banners.kilkenny },
  { key: 'cork', title: 'Cork', label: 'Countryside', image: itineraryAssets.banners.cork },
  { key: 'dingle', title: 'Dingle', label: 'Coast', image: itineraryAssets.banners.dingle },
  { key: 'galway', title: 'Galway', label: 'West coast', image: itineraryAssets.banners.galway },
  { key: 'dublin-return', title: 'Dublin', label: 'Return', image: itineraryAssets.banners.castle },
  { key: 'home', title: 'LEX', label: 'Home', image: itineraryAssets.banners.flight }
] as const;

const weatherOutlook = [
  { city: 'Dublin', temp: '62F', note: 'Clouds', Icon: Cloud },
  { city: 'Kilkenny', temp: '64F', note: 'Bright', Icon: Sun },
  { city: 'Cork', temp: '58F', note: 'Clouds', Icon: Cloud },
  { city: 'Dingle', temp: '57F', note: 'Rain likely', Icon: CloudRain },
  { city: 'Galway', temp: '55F', note: 'Showers', Icon: CloudRain }
];

function daysUntilTrip(startDate?: string) {
  const start = parseTripDate(startDate);
  if (!start) return undefined;
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.ceil((start.getTime() - todayLocal.getTime()) / 86_400_000));
}

function itineraryBanner(day: DayPlan) {
  const key = `${day.title} ${day.base} ${day.route || ''} ${day.notes}`.toLowerCase();
  if (key.includes('fly home') || key.includes('travel home')) return itineraryAssets.banners.home;
  if (key.includes('flight') || key.includes('in flight') || key.includes('airport')) return itineraryAssets.banners.flight;
  if (key.includes('sheepdog') || key.includes('slea')) return itineraryAssets.banners.sheepdog;
  if (key.includes('cliff')) return itineraryAssets.banners.cliffs;
  if (key.includes('killarney') || key.includes('kerry')) return itineraryAssets.banners.killarney;
  if (key.includes('dingle')) return itineraryAssets.banners.dingle;
  if (key.includes('galway') || key.includes('bunratty')) return itineraryAssets.banners.galway;
  if (key.includes('cork') || key.includes('blarney') || key.includes('fota') || key.includes('kinsale')) return itineraryAssets.banners.cork;
  if (key.includes('kilkenny')) return itineraryAssets.banners.kilkenny;
  if (key.includes('castle') || key.includes('kells')) return itineraryAssets.banners.castle;
  return itineraryAssets.banners.dublin;
}

function activeRouteKey(day?: DayPlan) {
  if (!day) return 'lex';
  const key = `${day.title} ${day.base} ${day.route || ''}`.toLowerCase();
  if (key.includes('travel home') || key.includes('fly home')) return 'home';
  if (key.includes('in flight') || key.includes('lex')) return 'lex';
  if (key.includes('galway')) return 'galway';
  if (key.includes('dingle')) return 'dingle';
  if (key.includes('cork')) return 'cork';
  if (key.includes('kilkenny')) return 'kilkenny';
  if (key.includes('dublin')) return day.day > 10 ? 'dublin-return' : 'dublin';
  return 'dublin';
}

function dayChips(day: DayPlan) {
  const text = `${day.title} ${day.base} ${day.route || ''} ${day.notes}`.toLowerCase();
  const chips = new Set<string>();
  if (day.base === 'In flight' || day.base === 'Travel home' || text.includes('airport')) chips.add('Travel Day');
  if (day.distanceMiles && day.distanceMiles >= 120) chips.add('Long Drive');
  if (day.distanceMiles && day.distanceMiles > 0 && day.distanceMiles < 120) chips.add('Road Trip');
  if (/dingle|slea|inch beach|galway|coast|cliff|kinsale/.test(text)) chips.add('Coastal Views');
  if (/zoo|wildlife|sheepdog|farm|animal|fota/.test(text)) chips.add('Wildlife');
  if (/castle|kells|clonmacnoise|bunratty/.test(text)) chips.add('Castle Day');
  if (/dingle|galway|rain|weather/.test(text)) chips.add('Rain Possible');
  if (chips.size < 3) chips.add(day.distanceMiles ? 'Scenic' : 'Easy Pace');
  return [...chips].slice(0, 4);
}

function smartNotes(day: DayPlan) {
  if (day.base === 'In flight') return ['Arrive rested and hydrated', 'Keep passports and documents handy', 'Use carry-on essentials'];
  if (day.base === 'Travel home') return ['Pack confirmations the night before', 'Keep receipts and passports together', 'Leave extra time for Dublin Airport'];
  const notes = ['Keep the day flexible for family energy', 'Check opening hours before booking'];
  if (day.distanceMiles) notes.unshift(day.distanceMiles >= 120 ? 'Plan one real scenic break' : 'Ease into left-side driving');
  if (day.lodging) notes.push('Confirm parking and check-in details');
  if (day.stops.some((stop) => stop.kind === 'activity')) notes.push('Pre-book timed entries where helpful');
  return notes.slice(0, 4);
}

function aiTip(day: DayPlan) {
  if (day.base === 'In flight') return 'Consider an overnight flight strategy so the first Dublin day stays light.';
  if (day.distanceMiles && day.distanceMiles >= 130) return 'This is a long relocation day. Add a lunch stop and one low-pressure scenic break.';
  if (/dingle|sheepdog/i.test(`${day.title} ${day.notes}`)) return 'Keep cash ready for rural stops and recheck sheepdog times close to travel.';
  if (/dublin/i.test(day.base)) return 'Use Dublin days for transit-friendly plans before the rental car begins.';
  if (/cork|kilkenny/i.test(day.base)) return 'Keep castle and garden plans weather-flexible, with one indoor backup.';
  return 'Ask the itinerary agent for kid-friendly lunch options near this route.';
}

function weatherForDay(day: DayPlan) {
  const key = `${day.base} ${day.title}`.toLowerCase();
  if (key.includes('galway')) return { label: 'Showers', temp: '55F', Icon: CloudRain };
  if (key.includes('dingle')) return { label: 'Rain likely', temp: '57F', Icon: CloudRain };
  if (key.includes('cork')) return { label: 'Cloudy', temp: '58F', Icon: Cloud };
  if (key.includes('kilkenny')) return { label: 'Bright', temp: '64F', Icon: Sun };
  return { label: 'Cloudy', temp: '62F', Icon: Cloud };
}

function costRange(day: DayPlan) {
  const cash = (day.paymentTags || fallbackPaymentTags(day)).find((tag) => tag.kind === 'cash');
  if (cash?.minCashEur !== undefined && cash.maxCashEur !== undefined) return `EUR ${cash.minCashEur}-${cash.maxCashEur}`;
  return day.distanceMiles ? 'EUR 60-120' : 'EUR 30-80';
}

function familyMood(day: DayPlan) {
  if (day.distanceMiles && day.distanceMiles >= 130) return 'Adventure';
  if (day.base === 'In flight' || day.base === 'Travel home') return 'Focused';
  if (day.distanceMiles) return 'Scenic';
  return 'Relaxed';
}

function completedTaskCount(tasks?: TasksResponse) {
  return tasks?.summary.done ?? tasks?.items.filter((task) => task.status === 'done').length ?? 0;
}

function ItineraryHero({ trip, days, travelerCount }: { trip?: Trip; days: DayPlan[]; travelerCount: number }) {
  const countdown = daysUntilTrip(trip?.startDate);
  const derivedKm = Math.round(days.reduce((sum, day) => sum + (day.distanceMiles || 0), 0) * 1.609);
  const roadTripKm = Math.max(1200, Math.ceil(derivedKm / 100) * 100);
  const cityCount = Math.max(6, new Set(days.map((day) => day.base).filter((base) => !/flight|travel home/i.test(base))).size);
  return (
    <section className="itinerary-hero">
      <div className="itinerary-hero-copy">
        <p className="itinerary-greeting">Good afternoon, Raphael family</p>
        <h1>Your Ireland Adventure</h1>
        <p>{days.length} unforgettable days across Ireland with the Raphael family.</p>
      </div>
      <div className="itinerary-route-path" aria-label="Trip route">
        {routeChapters.map((stop) => (
          <span className="journey-stop" key={stop.key}>
            <span className="journey-stop-node"><img src={stop.image} alt="" aria-hidden="true" /></span>
            <strong>{stop.title}</strong>
            <small>{stop.label}</small>
          </span>
        ))}
      </div>
      <div className="itinerary-metrics" aria-label="Trip metrics">
        <div><CalendarDays size={24} /><strong>{days.length}</strong><span>Days</span></div>
        <div><Users size={24} /><strong>{travelerCount}</strong><span>Travelers</span></div>
        <div><Car size={24} /><strong>{roadTripKm.toLocaleString()}+ km</strong><span>Road Trip</span></div>
        <div><Hotel size={24} /><strong>{cityCount}</strong><span>Cities</span></div>
        <div><Sparkles size={24} /><strong>{countdown ?? '...'}</strong><span>Days to go</span></div>
      </div>
    </section>
  );
}

function ItineraryRouteTimeline({ activeKey }: { activeKey: string }) {
  return (
    <section className="itinerary-sticky-route" aria-label="Sticky route timeline">
      {routeChapters.map((stop) => (
        <span className={`mini-route-stop ${activeKey === stop.key ? 'active' : ''}`} key={stop.key}>
          <span><img src={stop.image} alt="" aria-hidden="true" /></span>
          <strong>{stop.title}</strong>
        </span>
      ))}
    </section>
  );
}

function JourneyMiniMap({ activeKey }: { activeKey: string }) {
  return (
    <section className="journey-map-card" aria-label="Sticky mini Ireland route map">
      <div className="journey-map-art">
        <img src={itineraryAssets.map} alt="" aria-hidden="true" />
        {routeChapters.slice(1, 7).map((stop, index) => (
          <span className={`map-pulse map-pulse-${index + 1} ${activeKey === stop.key ? 'active' : ''}`} key={stop.key} />
        ))}
      </div>
      <h2>Route Map</h2>
      <p>Dublin to Kilkenny, Cork, Dingle, Galway, and back east for the flight home.</p>
    </section>
  );
}

function ItineraryChapterCard({
  day,
  sources,
  isActive,
  isNotesOpen,
  noteValue,
  setRef,
  onToggleNotes,
  onNoteChange,
  onSave
}: {
  day: DayPlan;
  sources: SourceLink[];
  isActive: boolean;
  isNotesOpen: boolean;
  noteValue: string;
  setRef: (node: HTMLElement | null) => void;
  onToggleNotes: () => void;
  onNoteChange: (value: string) => void;
  onSave: () => Promise<void>;
}) {
  const weather = weatherForDay(day);
  return (
    <article className={`itinerary-day-card ${isActive ? 'active' : ''}`} ref={setRef} data-day-id={day.id}>
      <aside className="itinerary-day-rail">
        <span>Day</span>
        <strong>{day.day}</strong>
        <i aria-hidden="true" />
      </aside>
      <div className="itinerary-day-image">
        <img src={itineraryBanner(day)} alt="" aria-hidden="true" />
      </div>
      <div className="itinerary-day-main">
        <div className="itinerary-day-title-row">
          <div>
            <span className="itinerary-date">{day.dateLabel}</span>
            <h3>{day.title}</h3>
            <p>{day.route || `${day.base} - ${day.driveTime || 'Local day'}`}</p>
          </div>
          <a className="itinerary-directions" href={googleMapsUrl(day)} target="_blank" rel="noreferrer">
            <Route size={16} /> Directions
          </a>
        </div>
        <div className="itinerary-chip-row">
          {dayChips(day).map((chip) => <span key={chip}>{chip}</span>)}
        </div>
        <div className="itinerary-stops">
          {day.stops.slice(0, 5).map((stop) => <span key={stop.id}>{stop.name}</span>)}
        </div>
        {day.lodging && <p className="itinerary-lodging"><Hotel size={16} /> {day.lodging.name} - {money.format(day.lodging.nightlyEstimate)}/night</p>}
        <div className="itinerary-note-shell">
          <button type="button" onClick={onToggleNotes} aria-expanded={isNotesOpen} aria-controls={`notes-${day.id}`}>
            <StickyNote size={16} /> Travel Notes <ChevronDown size={15} />
          </button>
          {isNotesOpen && (
            <div className="itinerary-note-editor" id={`notes-${day.id}`}>
              <textarea
                value={noteValue}
                onChange={(event) => onNoteChange(event.target.value)}
                aria-label={`Travel notes for day ${day.day}`}
              />
              <button className="itinerary-save-note" type="button" onClick={() => void onSave()}><Save size={15} /> Save Notes</button>
            </div>
          )}
        </div>
        <div className="itinerary-source-payments">
          <SourceChips ids={day.sourceIds || day.lodging?.sourceIds || day.stops.flatMap((stop) => stop.sourceIds || [])} sources={sources} />
          <PaymentTags day={day} />
        </div>
      </div>
      <aside className="itinerary-day-side">
        <div className="smart-note-panel">
          <h4>Smart Notes</h4>
          {smartNotes(day).map((note) => <span key={note}><CheckCircle2 size={14} /> {note}</span>)}
        </div>
        <div className="ai-tip-panel">
          <strong><Sparkles size={14} /> AI Tip</strong>
          <p>{aiTip(day)}</p>
        </div>
      </aside>
      <footer className="itinerary-day-stats">
        <div><Car size={24} /><span>Driving</span><strong>{day.driveTime || 'No Ireland driving today'}</strong></div>
        <div><Banknote size={24} /><span>Est. Cost</span><strong>{costRange(day)}</strong></div>
        <div><weather.Icon size={24} /><span>Weather</span><strong>{weather.label} {weather.temp}</strong></div>
        <div><Smile size={24} /><span>Family Mood</span><strong>{familyMood(day)}</strong></div>
      </footer>
    </article>
  );
}

function ItineraryWidgetRail({
  days,
  budget,
  tasks,
  activeDay,
  activeKey,
  onAskAgent
}: {
  days: DayPlan[];
  budget?: BudgetResponse;
  tasks?: TasksResponse;
  activeDay?: DayPlan;
  activeKey: string;
  onAskAgent: (prompt: string, focusDayId?: string) => void;
}) {
  const longestDay = [...days].sort((a, b) => (b.distanceMiles || 0) - (a.distanceMiles || 0))[0];
  const totalTasks = tasks?.summary.total || tasks?.items.length || 0;
  const doneTasks = completedTaskCount(tasks);
  const readiness = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 68;
  const planned = budget?.summary.planned || 0;
  const target = budget?.summary.target || 1;
  const budgetPercent = Math.min(100, Math.round((planned / target) * 100));
  return (
    <aside className="itinerary-widget-rail">
      <section className="itinerary-widget">
        <h2><Cloud size={17} /> Weather Along Route</h2>
        {weatherOutlook.map(({ city, temp, note, Icon }) => (
          <div className="weather-row" key={city}>
            <span>{city}</span><Icon size={15} /><strong>{temp}</strong><small>{note}</small>
          </div>
        ))}
      </section>
      <section className="itinerary-widget">
        <h2><Car size={17} /> Drive Intelligence</h2>
        <p>Day {longestDay?.day || 1} is your longest driving day{longestDay?.driveTime ? ` (${longestDay.driveTime})` : ''}. Plan a scenic break.</p>
        <button type="button" onClick={() => onAskAgent(`Suggest kid-friendly lunch stops and scenic breaks for Day ${longestDay?.day || activeDay?.day || 1}.`, longestDay?.id || activeDay?.id)}>
          View driving insights
        </button>
      </section>
      <section className="itinerary-widget">
        <h2><Sparkles size={17} /> AI Travel Assistant</h2>
        <p>Would you like me to suggest kid-friendly lunch stops between Cork and Dingle?</p>
        <button type="button" onClick={() => onAskAgent('Suggest kid-friendly lunch stops between Cork and Dingle.', activeDay?.id)}>
          Get Suggestions
        </button>
      </section>
      <section className="itinerary-widget budget-mini">
        <h2><PiggyBank size={17} /> Budget Tracker</h2>
        <div className="budget-donut" style={{ '--budget': budgetPercent } as CSSProperties}><span>{budgetPercent}%</span></div>
        <p><strong>{money.format(planned)}</strong> of {money.format(target)} planned</p>
      </section>
      <section className="itinerary-widget progress-mini">
        <h2><CheckCircle2 size={17} /> Journey Progress</h2>
        <div className="mini-progress-ring" style={{ '--progress': readiness } as CSSProperties}><strong>{readiness}%</strong><span>Ready</span></div>
        <p>{doneTasks} of {totalTasks || 12} checklist items complete.</p>
      </section>
      <JourneyMiniMap activeKey={activeKey} />
    </aside>
  );
}

function ItineraryView({
  trip,
  days,
  budget,
  tasks,
  familyMembers,
  sources,
  currentDayCount,
  onSave,
  onAsk,
  onApplyDraft,
  onDismissDraft
}: {
  trip?: Trip;
  days: DayPlan[];
  budget?: BudgetResponse;
  tasks?: TasksResponse;
  familyMembers?: FamilyMember[];
  sources: SourceLink[];
  currentDayCount: number;
  onSave: (updates: Partial<DayPlan>[]) => Promise<void>;
  onAsk: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>;
  onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
  onDismissDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
}) {
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [activeDayId, setActiveDayId] = useState(days[0]?.id || '');
  const [agentCommand, setAgentCommand] = useState<AgentCommand | undefined>();
  const dayRefs = useRef(new Map<string, HTMLElement>());
  const travelerCount = familyMembers?.length || trip?.travelers || 5;
  const activeDay = days.find((day) => day.id === activeDayId) || days[0];
  const activeKey = activeRouteKey(activeDay);

  useEffect(() => {
    if (!days.some((day) => day.id === activeDayId)) setActiveDayId(days[0]?.id || '');
  }, [activeDayId, days]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const dayId = visible?.target.getAttribute('data-day-id');
      if (dayId) setActiveDayId(dayId);
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0.2, 0.45, 0.7] });
    dayRefs.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [days]);

  const registerDay = (id: string) => (node: HTMLElement | null) => {
    if (node) dayRefs.current.set(id, node);
    else dayRefs.current.delete(id);
  };

  const askAgent = (prompt: string, focusDayId?: string) => {
    setAgentCommand({ prompt, focusDayId, nonce: Date.now() });
  };

  return (
    <section className="itinerary-dashboard">
      <div className="mobile-journey-bar">Currently exploring {activeDay?.base || 'Ireland'}</div>
      <ItineraryHero trip={trip} days={days} travelerCount={travelerCount} />
      <ItineraryRouteTimeline activeKey={activeKey} />
      <div className="itinerary-content-grid">
        <main className="itinerary-main-column">
          <div className="itinerary-section-head">
            <h2>Itinerary</h2>
            <p>Adventure chapters for every saved day, with notes tucked into each card.</p>
          </div>
          <div className="itinerary-card-stack">
            {days.map((day) => (
              <ItineraryChapterCard
                day={day}
                sources={sources}
                isActive={day.id === activeDay?.id}
                isNotesOpen={Boolean(openNotes[day.id])}
                noteValue={editing[day.id] ?? day.notes}
                setRef={registerDay(day.id)}
                onToggleNotes={() => setOpenNotes((current) => ({ ...current, [day.id]: !current[day.id] }))}
                onNoteChange={(value) => setEditing((current) => ({ ...current, [day.id]: value }))}
                onSave={() => onSave([{ id: day.id, notes: editing[day.id] ?? day.notes }])}
                key={day.id}
              />
            ))}
          </div>
        </main>
        <ItineraryWidgetRail days={days} budget={budget} tasks={tasks} activeDay={activeDay} activeKey={activeKey} onAskAgent={askAgent} />
      </div>
      <ItineraryAgentBubble
        days={days}
        sources={sources}
        currentDayCount={currentDayCount}
        command={agentCommand}
        onAsk={onAsk}
        onApplyDraft={onApplyDraft}
        onDismissDraft={onDismissDraft}
      />
    </section>
  );
}

function draftTarget(draft: ResearchDraft) {
  const payload = draft.payload as Record<string, unknown>;
  const item = payload.item && typeof payload.item === 'object' ? payload.item as Record<string, unknown> : undefined;
  const task = payload.task && typeof payload.task === 'object' ? payload.task as Record<string, unknown> : undefined;
  if (draft.kind === 'itinerary' && payload.mode === 'replace') return 'Full itinerary replacement';
  if (draft.kind === 'itinerary') return typeof payload.dayId === 'string' ? `Itinerary · ${payload.dayId}` : 'Itinerary';
  if (draft.kind === 'budget') return typeof item?.label === 'string' ? `Budget · ${item.label}` : 'Budget';
  if (draft.kind === 'task' && payload.mode === 'remove') return typeof payload.taskId === 'string' ? `Checklist removal · ${payload.taskId}` : 'Checklist removal';
  if (draft.kind === 'task') return typeof task?.title === 'string' ? `Checklist · ${task.title}` : 'Checklist';
  return 'Draft';
}

function replacementDayCount(draft: ResearchDraft) {
  const payload = draft.payload as Record<string, unknown>;
  return payload.mode === 'replace' && Array.isArray(payload.days) ? payload.days.length : undefined;
}

function DraftReviewCard({ draft, sources, currentDayCount, onApply, onDismiss }: { draft: ResearchDraft; sources: SourceLink[]; currentDayCount: number; onApply: (draft: ResearchDraft) => Promise<ResearchDraft | void>; onDismiss: (draft: ResearchDraft) => Promise<ResearchDraft | void> }) {
  const [applying, setApplying] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const proposedDayCount = replacementDayCount(draft);
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
    <div className="draft-card">
      <div className="draft-card-head">
        <div>
          <span className="kicker">{draft.kind} draft</span>
          <h4>{draft.title}</h4>
        </div>
        <StatusPill tone={draft.status === 'applied' ? 'good' : draft.status === 'dismissed' ? 'neutral' : 'warn'}>{draft.status}</StatusPill>
      </div>
      <p className="draft-target">{draftTarget(draft)}</p>
      {proposedDayCount !== undefined && (
        <div className="replace-warning">
          <strong>{currentDayCount} days -&gt; {proposedDayCount} days</strong>
          <span>This will replace all itinerary days.</span>
        </div>
      )}
      <p className="muted">{draft.summary || draftTarget(draft)}</p>
      <SourceChips ids={draft.sourceIds} sources={sources} />
      {draft.status === 'draft' ? (
        <div className="draft-card-actions">
          <button className="button secondary" onClick={apply} disabled={applying || dismissing}>
            {applying ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />} Apply Draft
          </button>
          <button className="button ghost compact" onClick={dismiss} disabled={applying || dismissing}>
            {dismissing ? <Loader2 className="spin" size={15} /> : <X size={15} />} Dismiss Draft
          </button>
        </div>
      ) : draft.status === 'dismissed' ? (
        <p className="applied-note"><X size={15} /> Dismissed without changing saved planner data.</p>
      ) : (
        <p className="applied-note"><CheckCircle2 size={15} /> Applied to the saved planner.</p>
      )}
    </div>
  );
}

function itineraryAgentContext(days: DayPlan[], selectedDayId: string) {
  const selectedDay = days.find((day) => day.id === selectedDayId);
  const dayDirectory = days.map((day) => ({
    id: day.id,
    day: day.day,
    title: day.title,
    base: day.base,
    route: day.route
  }));
  const selectedDayDetail = selectedDay
    ? {
        id: selectedDay.id,
        day: selectedDay.day,
        title: selectedDay.title,
        base: selectedDay.base,
        route: selectedDay.route,
        notes: selectedDay.notes,
        stops: selectedDay.stops.map((stop) => ({ id: stop.id, name: stop.name, kind: stop.kind })),
        paymentTags: selectedDay.paymentTags || fallbackPaymentTags(selectedDay)
      }
    : undefined;

  return [
    'Request surface: Itinerary module persistent agent bubble.',
    selectedDay
      ? `Selected itinerary day: Day ${selectedDay.day} (${selectedDay.id}) - ${selectedDay.title}. If the user says "this day", target ${selectedDay.id}.`
      : 'Selected itinerary day: Whole itinerary. If the user mentions a day number, target that day.',
    'The user may ask questions or ask for itinerary edits. Saved-data edits must be returned as reviewable itinerary drafts, never direct mutations.',
    'If the user asks to add a comment, reminder, pacing note, or family note to a day, create an itinerary patch draft that updates that day notes while preserving useful existing notes.',
    'If a draft changes destinations, adds or removes days, or rewrites itinerary days, include refreshed paymentTags with Visa, Mastercard, and a daily EUR cash range for each affected day.',
    selectedDayDetail
      ? `Selected day details: ${JSON.stringify(selectedDayDetail)}`
      : 'No single day is selected. Use explicit day numbers in the prompt to choose a day.',
    `Visible itinerary day directory: ${JSON.stringify(dayDirectory)}`
  ].join('\n');
}

function ItineraryAgentBubble({
  days,
  sources,
  currentDayCount,
  command,
  onAsk,
  onApplyDraft,
  onDismissDraft
}: {
  days: DayPlan[];
  sources: SourceLink[];
  currentDayCount: number;
  command?: AgentCommand;
  onAsk: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>;
  onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
  onDismissDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
}) {
  const [open, setOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState('all');
  const [prompt, setPrompt] = useState('');
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<ResearchAnswer[]>([]);
  const [agentError, setAgentError] = useState('');

  useEffect(() => {
    if (selectedDayId !== 'all' && !days.some((day) => day.id === selectedDayId)) {
      setSelectedDayId('all');
    }
  }, [days, selectedDayId]);

  useEffect(() => {
    if (!command) return;
    setOpen(true);
    setPrompt(command.prompt);
    if (command.focusDayId && days.some((day) => day.id === command.focusDayId)) {
      setSelectedDayId(command.focusDayId);
    }
  }, [command, days]);

  const submit = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setAgentError('');
    try {
      const answer = await onAsk(prompt.trim(), deep, itineraryAgentContext(days, selectedDayId));
      setAnswers((current) => [answer, ...current].slice(0, 4));
      setPrompt('');
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Unable to reach the itinerary agent.');
    } finally {
      setBusy(false);
    }
  };

  const applyBubbleDraft = async (draft: ResearchDraft) => {
    const applied = await onApplyDraft(draft);
    setAnswers((current) => current.map((answer) => ({
      ...answer,
      drafts: answer.drafts.map((item) => (item.id === draft.id ? { ...item, status: applied?.status || 'applied' } : item))
    })));
    return applied;
  };

  const dismissBubbleDraft = async (draft: ResearchDraft) => {
    const dismissed = await onDismissDraft(draft);
    setAnswers((current) => current.map((answer) => ({
      ...answer,
      drafts: answer.drafts.map((item) => (item.id === draft.id ? { ...item, status: dismissed?.status || 'dismissed' } : item))
    })));
    return dismissed;
  };

  return (
    <div className={`itinerary-agent ${open ? 'open' : ''}`}>
      {!open && (
        <button className="agent-fab" onClick={() => setOpen(true)} aria-label="Open itinerary agent">
          <MessageCircle size={22} />
          <span>Agent</span>
        </button>
      )}
      {open && (
        <section className="agent-dock" aria-label="Itinerary agent">
          <div className="agent-dock-head">
            <div>
              <span className="kicker">Itinerary copilot</span>
              <h3>Ask or draft changes</h3>
            </div>
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close itinerary agent">
              <X size={18} />
            </button>
          </div>
          <label className="agent-field">
            <span>Agent focus</span>
            <select value={selectedDayId} onChange={(event) => setSelectedDayId(event.target.value)} aria-label="Agent focus">
              <option value="all">Whole itinerary</option>
              {days.map((day) => (
                <option value={day.id} key={day.id}>Day {day.day}: {day.title}</option>
              ))}
            </select>
          </label>
          <label className="agent-field">
            <span>Itinerary agent prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask a question, add a comment to this day, or draft a sourced itinerary change..."
              aria-label="Itinerary agent prompt"
            />
          </label>
          <label className="checkbox compact-check"><input type="checkbox" checked={deep} onChange={(event) => setDeep(event.target.checked)} /> Deeper research</label>
          <button className="button primary full" onClick={submit} disabled={busy || !prompt.trim()}>
            {busy ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />} Ask Itinerary Agent
          </button>
          {agentError && <p className="warning">{agentError}</p>}
          <div className="agent-thread">
            {answers.length === 0 && <p className="muted">Try: "Add a comment to Day 8 to keep this day flexible for weather."</p>}
            {answers.map((answer) => (
              <article className="agent-thread-card" key={answer.id}>
                <h4>{answer.question}</h4>
                <AnswerText text={answer.answer} />
                {answer.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
                {answer.drafts.map((draft) => (
                  <DraftReviewCard draft={draft} sources={[...sources, ...answer.sources]} currentDayCount={currentDayCount} onApply={applyBubbleDraft} onDismiss={dismissBubbleDraft} key={draft.id} />
                ))}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type ResearchMode = 'quick' | 'smart' | 'deep';

const researchModes: Array<{ id: ResearchMode; label: string; description: string; icon: typeof Search }> = [
  { id: 'quick', label: 'Quick Answers', description: 'Fast sourced guidance for focused trip questions.', icon: Sparkles },
  { id: 'smart', label: 'Smart Planning', description: 'Balanced AI planning for routes, timing, and family fit.', icon: Route },
  { id: 'deep', label: 'Deep Expedition Research', description: 'Deeper source review for consequential decisions.', icon: Search }
];

const promptSuggestions = [
  'Which castles require advance tickets?',
  'Best kid-friendly stops between Cork and Dingle?',
  'Where should we stay in Galway with kids?',
  'What is the best scenic drive in Kerry?'
];

const inspirationCards = [
  {
    title: 'Castles & History',
    text: "Discover Ireland's most magical castles.",
    image: dashboardAssets.researchCardCastles,
    icon: Castle,
    prompt: 'Best castles for kids near Galway'
  },
  {
    title: 'Family Experiences',
    text: 'Sheepdogs, wildlife parks, and family adventures.',
    image: dashboardAssets.researchCardFamily,
    icon: Users,
    prompt: 'Best family experiences with animals in Ireland'
  },
  {
    title: 'Scenic Drives',
    text: 'Breathtaking routes and coastal wonders.',
    image: dashboardAssets.researchCardScenic,
    icon: Route,
    prompt: 'What is the most scenic drive in Kerry?'
  },
  {
    title: 'Hidden Gems',
    text: 'AI-curated locations most tourists miss.',
    image: dashboardAssets.researchCardHiddenGems,
    icon: Sparkles,
    prompt: 'Find hidden gems near Dingle for families'
  },
  {
    title: 'Weather & Packing',
    text: 'Know what to bring for every region.',
    image: dashboardAssets.researchCardWeather,
    icon: CloudRain,
    prompt: 'What should we pack for western Ireland rain?'
  }
];

const intelligenceWidgets = [
  { title: 'Weather Intelligence', body: 'Rain likely in Galway during your stay.', action: 'View full forecast', icon: CloudRain },
  { title: 'Route Intelligence', body: 'Day 9 exceeds ideal driving duration for younger travelers.', action: 'View driving analysis', icon: Car },
  { title: 'Attraction Alerts', body: 'Book of Kells tickets can sell quickly for your dates.', action: 'Check availability', icon: Bell },
  { title: 'AI Packing Suggestion', body: 'Bring waterproof jackets for western Ireland.', action: 'View packing list', icon: ShieldCheck }
];

function researchModeContext(mode: ResearchMode) {
  const selected = researchModes.find((item) => item.id === mode) || researchModes[0];
  return [
    'Request surface: Ireland Concierge AI research command center.',
    `Research mode: ${selected.label}.`,
    selected.description,
    'Save behavior: propose itinerary, budget, or checklist drafts only when the user asks for changes; never mutate saved trip data automatically.'
  ].join('\n');
}

function ResearchSessionCard({
  answer,
  index,
  currentDayCount,
  onApplyDraft,
  onDismissDraft
}: {
  answer: ResearchAnswer;
  index: number;
  currentDayCount: number;
  onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
  onDismissDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
}) {
  const [favorite, setFavorite] = useState(false);
  const sessionImage = index % 2 === 0 ? dashboardAssets.researchSessionCastles : dashboardAssets.researchSessionScenic;
  const sources = answer.sources || [];
  const warnings = answer.warnings || [];
  const drafts = answer.drafts || [];
  const answerText = answer.answer || 'Ireland Concierge AI is preparing this research session.';
  const sourceCount = sources.length;

  return (
    <details className="research-session-card" open={index === 0}>
      <summary>
        <img src={sessionImage} alt="" aria-hidden="true" />
        <div className="research-session-main">
          <span className="research-session-tag"><Castle size={14} /> AI research session</span>
          <h3>{answer.question}</h3>
          <p>{answerText.split('\n')[0]}</p>
          <div className="research-session-pills">
            <span><MapPinned size={14} /> Ireland route context</span>
            <span><Smile size={14} /> Family friendly</span>
            <span><ShieldCheck size={14} /> {sourceCount || 'Official-first'} sources</span>
          </div>
        </div>
        <div className="research-session-actions" aria-label="Session actions">
          <button type="button" onClick={(event) => { event.preventDefault(); setFavorite((current) => !current); }}>
            <Save size={15} /> {favorite ? 'Saved' : 'Save to Itinerary'}
          </button>
          <button type="button" onClick={(event) => { event.preventDefault(); setFavorite((current) => !current); }}>
            <Sparkles size={15} /> {favorite ? 'Favorited' : 'Add to Favorites'}
          </button>
          <span><ChevronDown size={18} /></span>
        </div>
      </summary>
      <div className="research-session-expanded">
        <div>
          <h4>AI Summary</h4>
          <AnswerText text={answerText} />
          {warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
        </div>
        <div className="session-map-preview">
          <img src={dashboardAssets.researchMap} alt="" aria-hidden="true" />
          <button type="button">View Map</button>
        </div>
        <div>
          <h4>Sources ({sourceCount})</h4>
          <div className="source-row">
            {sources.length === 0 && <span className="source-chip">Source review pending</span>}
            {sources.map((source) => (
              <a className="source-chip" key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={13} /></a>
            ))}
          </div>
          <h4>Save Research Directly Into Adventure</h4>
          <div className="research-save-grid">
            <button type="button"><Save size={15} /> Save to Itinerary</button>
            <button type="button"><FileCheck2 size={15} /> Add to Checklist</button>
            <button type="button"><MoreHorizontal size={15} /> Compare Options</button>
          </div>
        </div>
      </div>
      {drafts.map((draft) => (
        <DraftReviewCard draft={draft} sources={sources} currentDayCount={currentDayCount} onApply={onApplyDraft} onDismiss={onDismissDraft} key={draft.id} />
      ))}
    </details>
  );
}

function ResearchConcierge({ history, currentDayCount, onAsk, onApplyDraft, onDismissDraft }: { history: ResearchAnswer[]; currentDayCount: number; onAsk: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>; onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>; onDismissDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void> }) {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<ResearchMode>('smart');
  const [busy, setBusy] = useState(false);
  const [agentError, setAgentError] = useState('');

  const submit = async () => {
    if (!question.trim()) return;
    setBusy(true);
    setAgentError('');
    try {
      await onAsk(question.trim(), mode === 'deep', researchModeContext(mode));
      setQuestion('');
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Unable to reach Ireland Concierge AI.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="research-concierge">
      <div className="research-command-grid">
        <div className="research-main">
          <section className="research-hero">
            <div className="research-hero-copy">
              <span className="concierge-brand"><Bot size={16} /> Ireland Concierge AI</span>
              <h2>Ireland Research Concierge</h2>
              <p>Discover smarter routes, hidden gems, family-friendly stops, and trusted recommendations powered by AI.</p>
            </div>
            <form className="research-prompt-panel" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
              <div className="research-prompt-orb"><Sparkles size={24} /></div>
              <label className="sr-only" htmlFor="research-concierge-input">Ask Ireland Concierge AI</label>
              <input
                id="research-concierge-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask anything about your Ireland trip..."
                autoComplete="off"
              />
              <button type="submit" disabled={busy || !question.trim()} aria-label="Ask AI">
                {busy ? <Loader2 className="spin" size={20} /> : <Sparkles size={20} />}
                <span>Ask AI</span>
              </button>
              <div className="research-prompt-chips" aria-label="Suggested research prompts">
                {promptSuggestions.map((prompt) => (
                  <button type="button" key={prompt} onClick={() => setQuestion(prompt)}>{prompt}</button>
                ))}
              </div>
            </form>
            <div className="research-mode-bar" role="group" aria-label="AI Research Modes">
              <span>AI Research Mode</span>
              {researchModes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    className={mode === item.id ? 'active' : ''}
                    onClick={() => setMode(item.id)}
                    key={item.id}
                  >
                    <Icon size={16} /> {item.label}
                  </button>
                );
              })}
            </div>
            {agentError && <p className="warning">{agentError}</p>}
            <aside className="research-map-panel" aria-label="AI visualization panel">
              <div className="research-map-head">
                <span><MapPinned size={15} /> Your Ireland Route</span>
                <button type="button" aria-label="Expand route map"><MoreHorizontal size={16} /></button>
              </div>
              <img src={dashboardAssets.researchMap} alt="" aria-hidden="true" />
              <div className="research-map-nodes" aria-hidden="true">
                <span>Dublin</span>
                <span>Kilkenny</span>
                <span>Cork</span>
                <span>Dingle</span>
                <span>Galway</span>
              </div>
              <button className="research-map-cta" type="button">Explore Map <ExternalLink size={14} /></button>
            </aside>
          </section>

          <section className="research-inspiration" aria-labelledby="research-inspiration-title">
            <div className="research-section-title">
              <div>
                <h3 id="research-inspiration-title">Get Inspired</h3>
                <p>Research Inspiration Cards curated to spark your next adventure</p>
              </div>
              <button type="button" aria-label="Next inspiration card"><ChevronDown size={18} /></button>
            </div>
            <div className="research-card-rail">
              {inspirationCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button className="research-inspiration-card" type="button" key={card.title} onClick={() => setQuestion(card.prompt)}>
                    <img src={card.image} alt="" aria-hidden="true" />
                    <span><Icon size={18} /></span>
                    <strong>{card.title}</strong>
                    <small>{card.text}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="research-sessions" aria-labelledby="research-sessions-title">
            <div className="research-section-title">
              <div>
                <h3 id="research-sessions-title">Your Research Sessions</h3>
                <p>Saved questions and AI-powered discoveries</p>
              </div>
              <div className="research-session-tools">
                <button type="button"><Search size={15} /> All Topics</button>
                <label>
                  <span className="sr-only">Search your research</span>
                  <input placeholder="Search your research..." />
                </label>
              </div>
            </div>
            {history.length === 0 && (
              <div className="research-idle">
                <div>
                  <span><Sparkles size={18} /> Expedition Intelligence</span>
                  <h3>Ask the concierge to scan routes, tickets, weather, and family pacing.</h3>
                  <p>Try a prompt above or choose an inspiration card to begin building sourced research sessions for your adventure.</p>
                </div>
                <img src={dashboardAssets.researchMap} alt="" aria-hidden="true" />
              </div>
            )}
            {history.map((answer, index) => (
              <ResearchSessionCard
                answer={answer}
                index={index}
                currentDayCount={currentDayCount}
                onApplyDraft={onApplyDraft}
                onDismissDraft={onDismissDraft}
                key={answer.id}
              />
            ))}
          </section>
        </div>
        <aside className="research-intelligence" aria-label="AI Travel Intelligence">
          <h3>AI Travel Intelligence</h3>
          {intelligenceWidgets.map((widget) => {
            const Icon = widget.icon;
            return (
              <article className="research-widget" key={widget.title}>
                <Icon size={24} />
                <div>
                  <h4>{widget.title}</h4>
                  <p>{widget.body}</p>
                  <button type="button">{widget.action} <ExternalLink size={13} /></button>
                </div>
              </article>
            );
          })}
          <article className="research-widget scenic-score">
            <Route size={24} />
            <div>
              <h4>Scenic Score</h4>
              {[
                ['Scenic', '9.4/10'],
                ['Relaxed', '8.6/10'],
                ['Family Friendly', '9.2/10'],
                ['Adventure', '8.8/10']
              ].map(([label, value]) => (
                <div className="score-row" key={label}>
                  <span>{label}</span>
                  <meter min="0" max="10" value={Number(value.split('/')[0])}>{value}</meter>
                  <strong>{value}</strong>
                </div>
              ))}
              <button type="button">How scores work <ExternalLink size={13} /></button>
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}

function BudgetView({ budget, onSave }: { budget?: BudgetResponse; onSave: (items: Partial<BudgetItem>[]) => Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<string, Partial<BudgetItem>>>({});
  if (!budget) return null;

  return (
    <section className="stack">
      <div className="budget-summary">
        <div><span>Target</span><strong>{money.format(budget.summary.target)}</strong></div>
        <div><span>Planned</span><strong>{money.format(budget.summary.planned)}</strong></div>
        <div><span>Actual</span><strong>{money.format(budget.summary.actual)}</strong></div>
        <div><span>Remaining</span><strong>{money.format(budget.summary.remainingPlanned)}</strong></div>
      </div>
      {budget.items.map((item) => {
        const draft = drafts[item.id] || {};
        return (
          <article className="edit-row" key={item.id}>
            <div>
              <h3>{item.label}</h3>
              <p>{item.category} · {item.status}</p>
            </div>
            <label>Planned<input type="number" value={draft.planned ?? item.planned} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, id: item.id, planned: Number(event.target.value) } }))} /></label>
            <label>Actual<input type="number" value={draft.actual ?? item.actual} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, id: item.id, actual: Number(event.target.value) } }))} /></label>
            <button className="button secondary" onClick={() => onSave([{ id: item.id, ...draft }])}><Save size={15} /> Save</button>
          </article>
        );
      })}
    </section>
  );
}

function TasksView({ tasks, onSave }: { tasks?: TasksResponse; onSave: (items: Partial<BookingTask>[]) => Promise<void> }) {
  if (!tasks) return null;
  return (
    <section className="stack">
      <div className="section-heading">
        <h2>Booking Checklist</h2>
        <p>{tasks.summary.done} of {tasks.summary.total} done. Next open item is shown on the dashboard.</p>
      </div>
      {tasks.items.map((task) => (
        <article className="task-row" key={task.id}>
          <button className={`check ${task.status === 'done' ? 'checked' : ''}`} onClick={() => onSave([{ id: task.id, status: task.status === 'done' ? 'open' : 'done' }])} aria-label={`Toggle ${task.title}`}>
            <CheckCircle2 size={20} />
          </button>
          <div>
            <h3>{task.title}</h3>
            <p>{task.category} · due {task.dueDate}</p>
            {task.notes && <p className="muted">{task.notes}</p>}
          </div>
          <StatusPill tone={task.status === 'done' ? 'good' : task.status === 'blocked' ? 'danger' : 'warn'}>{task.status}</StatusPill>
        </article>
      ))}
    </section>
  );
}

function SourcesView({ sources, onCheck }: { sources?: SourcesResponse; onCheck: (url: string, title?: string) => Promise<void> }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  if (!sources) return null;

  return (
    <section className="stack">
      <div className="source-checker">
        <div>
          <h2>Verified Links</h2>
          <p>Official-first source list with status checks. Recheck important pages before booking.</p>
        </div>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional title" />
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://official-site.ie" />
        <button className="button primary" onClick={() => onCheck(url, title)} disabled={!url}><RefreshCw size={15} /> Check</button>
      </div>
      {sources.summary.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
      <div className="source-table">
        {sources.items.map((source) => (
          <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
            <span>{source.title}</span>
            <StatusPill tone={source.status === 'ok' ? 'good' : source.status === 'unreachable' ? 'danger' : 'warn'}>{source.sourceType} · {source.status}</StatusPill>
            <small>Checked {new Date(source.checkedAt).toLocaleDateString()}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selectedDayId, setSelectedDayId] = useState('day-3');
  const [state, setState] = useState<AppState>({ itinerary: [], research: [] });
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [browserCollapsed, setBrowserCollapsed] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const greeting = getTimeOfDayGreeting();

  const refresh = async () => {
    const [trip, familyMembers, itinerary, budget, tasks, sources, research] = await Promise.all([
      api.trip(),
      api.familyMembers().catch(() => []),
      api.itinerary(),
      api.budget(),
      api.tasks(),
      api.sources(),
      api.researchHistory()
    ]);
    setState({ trip, familyMembers, itinerary, budget, tasks, sources, research });
    setSelectedDayId((current) => itinerary.some((day) => day.id === current) ? current : itinerary[0]?.id || '');
  };

  useEffect(() => {
    api.session()
      .then(async (session) => {
        setAuthRequired(session.authRequired);
        setAuthenticated(session.authenticated);
        if (session.authenticated) {
          await refresh();
        }
      })
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to load session'))
      .finally(() => setLoading(false));
  }, []);

  const login = async () => {
    setError('');
    try {
      const session = await api.login(passcode);
      setAuthenticated(session.authenticated);
      if (session.authenticated) {
        await refresh();
      }
    } catch {
      setError('That passcode did not work. Check the family passcode and try again.');
    }
  };

  const logout = async () => {
    await api.logout();
    setAuthenticated(false);
    setState({ itinerary: [], research: [] });
  };

  const activeSources = useMemo(() => state.sources?.items || [], [state.sources]);

  const selectTab = (nextTab: Tab) => {
    setTab(nextTab);
    setBrowserCollapsed(false);
    setMobileNavOpen(false);
  };

  const saveItinerary = async (updates: Partial<DayPlan>[]) => {
    const itinerary = await api.saveItinerary(updates);
    setState((current) => ({ ...current, itinerary }));
  };

  const saveBudget = async (items: Partial<BudgetItem>[]) => {
    const budget = await api.saveBudget(items);
    setState((current) => ({ ...current, budget }));
  };

  const saveTasks = async (items: Partial<BookingTask>[]) => {
    const tasks = await api.saveTasks(items);
    setState((current) => ({ ...current, tasks }));
  };

  const saveFamilyMembers = async (members: FamilyMember[]) => {
    const familyMembers = await api.saveFamilyMembers(members);
    setState((current) => ({
      ...current,
      familyMembers,
      trip: current.trip ? { ...current.trip, travelers: familyMembers.length } : current.trip
    }));
  };

  const askResearch = async (question: string, deep: boolean, context?: string) => {
    const answer = await api.askResearch(question, deep, context);
    const sources = await api.sources();
    setState((current) => ({ ...current, sources, research: [answer, ...current.research] }));
    return answer;
  };

  const applyDraft = async (draft: ResearchDraft) => {
    try {
      const applied = await api.applyDraft(draft.id);
      await refresh();
      setError(`${draft.title} applied.`);
      return applied;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to apply draft.');
      return undefined;
    }
  };

  const dismissDraft = async (draft: ResearchDraft) => {
    try {
      const dismissed = await api.dismissDraft(draft.id);
      await refresh();
      setError(`${draft.title} dismissed.`);
      return dismissed;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to dismiss draft.');
      return undefined;
    }
  };

  const checkSource = async (sourceUrl: string, sourceTitle?: string) => {
    await api.checkSource(sourceUrl, sourceTitle);
    const sources = await api.sources();
    setState((current) => ({ ...current, sources }));
  };

  if (loading) {
    return <main className="loading"><Loader2 className="spin" /> Loading Ireland Trip Agent...</main>;
  }

  if (authRequired && !authenticated) {
    return (
      <main className="login-screen" style={dashboardAssetStyle}>
        <img className="login-reference-image login-reference-image-desktop" src="/login-hero-reference.png" alt="" aria-hidden="true" draggable="false" />
        <img className="login-reference-image login-reference-image-mobile" src="/login-hero-mobile-reference.png" alt="" aria-hidden="true" draggable="false" />
        <section className="login-passcode-panel" aria-labelledby="login-title">
          <h1 id="login-title" className="sr-only">Ireland Trip Agent</h1>
          <p className="sr-only">Enter the family passcode to open the planner.</p>
          <div className="login-passcode-row">
            <label className="login-passcode-field">
              <span>Family passcode</span>
              <input
                type="password"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void login();
                }}
                placeholder="Enter passcode"
                aria-label="Family passcode"
              />
            </label>
            <button className="button login-unlock-button" onClick={login} disabled={!passcode.trim()}>
              <ShieldCheck size={17} /> Unlock Planner
            </button>
          </div>
          {error && <p className="login-warning" role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${tab === 'dashboard' ? 'dashboard-shell' : ''} ${tab === 'itinerary' ? 'itinerary-shell' : ''} ${tab === 'research' ? 'research-shell' : ''} ${tab === 'map' ? 'map-shell' : ''} ${tab === 'tasks' ? 'checklist-shell' : ''} ${navCollapsed ? 'nav-collapsed' : ''} ${browserCollapsed ? 'browser-collapsed-shell' : ''}`} data-testid="app-shell" style={dashboardAssetStyle}>
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand">
            <BrandMark />
            <div className="brand-copy">
              <strong>Ireland Family Trip</strong>
              <span>Family planning tool</span>
            </div>
          </div>
          <div>
            <button className="icon-button nav-collapse-button" onClick={() => setNavCollapsed((current) => !current)} aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'} title={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
              {navCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
            <button className="icon-button mobile-menu-button" onClick={() => setMobileNavOpen((current) => !current)} aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileNavOpen} title={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}>
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <NavigationItems activeTab={tab} onSelect={selectTab} />
          <CurrencyHeaderTile variant="nav" />
        </nav>
        <div className={`mobile-nav-drawer ${mobileNavOpen ? 'open' : ''}`} aria-label="Mobile navigation" aria-hidden={mobileNavOpen ? 'false' : 'true'}>
          <NavigationItems activeTab={tab} onSelect={selectTab} />
          <CurrencyHeaderTile variant="nav" />
        </div>
        <div className="sidebar-family-card">
          <div className="family-avatar-stack" aria-hidden="true">
            <span>J</span>
            <span>K</span>
            <span>3</span>
          </div>
          <div>
            <strong>The Raphael Family</strong>
            <span>Family Pass: 7D43K2</span>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="sidebar-help-card">
          <img src={dashboardAssets.researchAgent} alt="" aria-hidden="true" />
          <strong>Need local help?</strong>
          <span>Your Ireland Agent is just a message away.</span>
          <button className="button ghost compact" type="button" onClick={() => setTab('research')}>
            Message Agent <MessageCircle size={14} />
          </button>
        </div>
      </aside>
      <section className="workspace">
        {tab !== 'tasks' && tab !== 'map' && <header className="topbar">
          <div>
            {tab === 'dashboard' ? (
              <p className="dashboard-greeting">{greeting}! <span aria-hidden="true">👋</span></p>
            ) : (
              <>
                <p className="dashboard-greeting compact">{greeting}</p>
                <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
              </>
            )}
          </div>
          <div className="topbar-meta">
            <button className="icon-button topbar-bell" type="button" aria-label="Notifications"><Bell size={16} /></button>
            <button className="button ghost compact" onClick={() => setBrowserCollapsed((current) => !current)} aria-label={browserCollapsed ? 'Expand browser view' : 'Collapse browser view'}>
              {browserCollapsed ? <Eye size={15} /> : <EyeOff size={15} />}
              {browserCollapsed ? 'Expand View' : 'Collapse View'}
            </button>
            <StatusPill tone="good">{formatTripDateRange(state.trip)}</StatusPill>
            <TravelerMenu members={state.familyMembers} onSave={saveFamilyMembers} compact />
            {authRequired && <button className="button ghost compact" onClick={logout}>Log out</button>}
          </div>
        </header>}
        {error && <button className="notice" onClick={() => setError('')}>{error}</button>}
        {browserCollapsed ? (
          <section className="browser-collapsed" aria-live="polite">
            <h2>Browser view is collapsed</h2>
            <p className="muted">Expand the view to return to the {tabs.find((item) => item.id === tab)?.label} workspace.</p>
            <button className="button secondary" onClick={() => setBrowserCollapsed(false)} aria-label="Restore browser view">
              <Eye size={16} /> Restore Browser View
            </button>
          </section>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard state={state} setTab={selectTab} />}
            {tab === 'itinerary' && <ItineraryView trip={state.trip} days={state.itinerary} budget={state.budget} tasks={state.tasks} familyMembers={state.familyMembers} sources={activeSources} currentDayCount={state.itinerary.length} onSave={saveItinerary} onAsk={askResearch} onApplyDraft={applyDraft} onDismissDraft={dismissDraft} />}
            {tab === 'research' && <ResearchConcierge history={state.research} currentDayCount={state.itinerary.length} onAsk={askResearch} onApplyDraft={applyDraft} onDismissDraft={dismissDraft} />}
            {tab === 'map' && <CinematicMap days={state.itinerary} selectedDayId={selectedDayId} trip={state.trip} onSelectDay={setSelectedDayId} onAskResearch={askResearch} />}
            {tab === 'budget' && <BudgetView budget={state.budget} onSave={saveBudget} />}
            {tab === 'tasks' && <ChecklistDashboard trip={state.trip} itinerary={state.itinerary} tasks={state.tasks} familyMembers={state.familyMembers} sources={activeSources} currentDayCount={state.itinerary.length} onSave={saveTasks} onSaveFamilyMembers={saveFamilyMembers} onAsk={askResearch} onApplyDraft={applyDraft} onDismissDraft={dismissDraft} />}
            {tab === 'sources' && <SourcesView sources={state.sources} onCheck={checkSource} />}
          </>
        )}
      </section>
      <MobileBottomNav activeTab={tab} onSelect={selectTab} onMore={() => setMobileNavOpen((current) => !current)} />
    </main>
  );
}
