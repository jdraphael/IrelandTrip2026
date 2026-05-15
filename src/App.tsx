import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Bell, Bot, CalendarDays, CheckCircle2, ChevronDown, ChevronsLeft, ChevronsRight, ExternalLink, Eye, EyeOff, FileCheck2, Home, Loader2, MapPinned, Menu, MessageCircle, MoreHorizontal, PiggyBank, RefreshCw, Route, Save, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import L from 'leaflet';
import { api, type BudgetResponse, type SourcesResponse, type TasksResponse } from './api';
import { CurrencyHeaderTile } from './components/CurrencyHeaderTile';
import type { BookingTask, BudgetItem, DayPlan, ResearchAnswer, ResearchDraft, SourceLink, Trip } from './types';

type Tab = 'dashboard' | 'itinerary' | 'research' | 'map' | 'budget' | 'tasks' | 'sources';

interface AppState {
  trip?: Trip;
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

function googleMapsUrl(day: DayPlan) {
  const locations = day.stops.map((stop) => `${stop.latitude},${stop.longitude}`);
  if (locations.length === 0) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/dir/${locations.map(encodeURIComponent).join('/')}`;
}

function isIrelandStop(stop: { latitude: number; longitude: number }) {
  return stop.latitude >= 51 && stop.latitude <= 56 && stop.longitude >= -11 && stop.longitude <= -5;
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
  if (key.includes('kilkenny')) return '/dashboard-assets/route-kilkenny.svg';
  if (key.includes('cork')) return '/dashboard-assets/route-cork.svg';
  if (key.includes('dingle') || key.includes('killarney')) return '/dashboard-assets/route-dingle.svg';
  if (key.includes('galway')) return '/dashboard-assets/route-galway.svg';
  return '/dashboard-assets/route-dublin.svg';
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

function MapPanel({ days, selectedDayId, onSelectDay }: { days: DayPlan[]; selectedDayId: string; onSelectDay: (id: string) => void }) {
  const day = days.find((item) => item.id === selectedDayId) || days[0];
  const [mapMode, setMapMode] = useState<'day' | 'all'>('day');
  const [wheelZoom, setWheelZoom] = useState(false);
  const allStops = useMemo(
    () => days.flatMap((item) => item.stops.filter(isIrelandStop).map((stop) => ({ ...stop, day: item.day, dayTitle: item.title, base: item.base }))),
    [days]
  );
  const visibleStops = mapMode === 'all' ? allStops : (day?.stops || []).map((stop) => ({ ...stop, day: day.day, dayTitle: day.title, base: day.base }));

  useEffect(() => {
    if (visibleStops.length === 0) return;
    const container = document.getElementById('trip-map');
    if (!container) return;
    container.innerHTML = '';

    const map = L.map(container, { scrollWheelZoom: wheelZoom });
    const bounds = L.latLngBounds(visibleStops.map((stop) => [stop.latitude, stop.longitude]));
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    visibleStops.forEach((stop, index) => {
      const marker = L.divIcon({
        className: `route-marker ${mapMode === 'all' ? 'all-marker' : ''}`,
        html: `<span>${index + 1}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      L.marker([stop.latitude, stop.longitude], { icon: marker }).addTo(map).bindPopup(`<strong>${stop.name}</strong><br>Day ${stop.day}: ${stop.dayTitle}`);
    });

    if (visibleStops.length > 1) {
      if (mapMode === 'day') {
        L.polyline(visibleStops.map((stop) => [stop.latitude, stop.longitude]), { color: '#0f766e', weight: 4, opacity: 0.75 }).addTo(map);
      }
      map.fitBounds(bounds.pad(0.25));
    } else {
      map.setView([visibleStops[0].latitude, visibleStops[0].longitude], 12);
    }

    return () => {
      map.remove();
    };
  }, [visibleStops, mapMode, wheelZoom]);

  if (!day) return <div className="empty">No itinerary days available yet.</div>;

  return (
    <section className="map-layout">
      <div className="map-sidebar">
        <div className="section-heading">
          <h2>Day-by-Day Route</h2>
          <p>Filter the map by travel day, or switch to all stops to see the full trip at once.</p>
        </div>
        <div className="segmented-control" aria-label="Map view mode">
          <button className={mapMode === 'day' ? 'selected' : ''} onClick={() => setMapMode('day')}>Day view</button>
          <button className={mapMode === 'all' ? 'selected' : ''} onClick={() => setMapMode('all')}>Show all stops</button>
        </div>
        <label className="map-toggle">
          <input type="checkbox" checked={wheelZoom} onChange={(event) => setWheelZoom(event.target.checked)} />
          Mouse wheel zoom
        </label>
        {mapMode === 'day' && (
          <select value={day.id} onChange={(event) => onSelectDay(event.target.value)}>
            {days.map((item) => (
              <option value={item.id} key={item.id}>Day {item.day}: {item.title}</option>
            ))}
          </select>
        )}
        <div className="route-detail">
          {mapMode === 'all' ? (
            <>
              <h3>All Trip Stops</h3>
              <p>{allStops.length} places across {days.length} itinerary days.</p>
              <div className="meta-grid">
                <span>{days.filter((item) => item.distanceMiles && item.distanceMiles >= 100).length} longer drive days</span>
                <span>{new Set(allStops.map((stop) => stop.base)).size} bases</span>
              </div>
            </>
          ) : (
            <>
              <h3>{day.title}</h3>
              <p>{day.route || day.base}</p>
              <div className="meta-grid">
                <span>{day.driveTime || 'Local day'}</span>
                <span>{day.distanceMiles ? `${day.distanceMiles} miles` : day.base}</span>
              </div>
            </>
          )}
          <ol className="stop-list">
            {visibleStops.map((stop) => (
              <li key={`${stop.day}-${stop.id}`}>
                <strong>{stop.name}</strong>
                <span>{mapMode === 'all' ? `Day ${stop.day}: ${stop.dayTitle}` : stop.notes || stop.kind}</span>
              </li>
            ))}
          </ol>
          {mapMode === 'day' && (
            <a className="button primary full" href={googleMapsUrl(day)} target="_blank" rel="noreferrer">
              <Route size={16} /> Open Directions
            </a>
          )}
        </div>
      </div>
      <div className="map-canvas" id="trip-map" />
    </section>
  );
}

function Dashboard({ state, setTab }: { state: AppState; setTab: (tab: Tab) => void }) {
  const nextTask = state.tasks?.summary.nextTask;
  const firstLongDay = state.itinerary.find((day) => day.distanceMiles && day.distanceMiles >= 130);
  const plannedPercent = state.budget?.summary.plannedPercent || 0;
  const remainingPlanned = state.budget?.summary.remainingPlanned || 0;
  const budgetTarget = state.trip?.budgetTarget || 15000;
  const routeDays = state.itinerary.filter((day) => day.base !== 'In flight' && day.base !== 'Travel home').slice(0, 8);
  return (
    <div className="dashboard-grid">
      <section className="hero-panel dashboard-hero">
        <div className="hero-copy">
          <h1>Your Ireland adventure is waiting</h1>
          <p>{state.trip?.month} {state.trip?.year} · {state.trip?.travelers} travelers · {state.trip?.origin} to {state.trip?.destination}</p>
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
        <img src="/dashboard-assets/next-up.svg" alt="" aria-hidden="true" />
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
        <img src="/dashboard-assets/drive-watch.svg" alt="" aria-hidden="true" />
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
        <img src="/dashboard-assets/source-status.svg" alt="" aria-hidden="true" />
      </section>
    </div>
  );
}

function ItineraryView({
  days,
  sources,
  currentDayCount,
  onSave,
  onAsk,
  onApplyDraft
}: {
  days: DayPlan[];
  sources: SourceLink[];
  currentDayCount: number;
  onSave: (updates: Partial<DayPlan>[]) => Promise<void>;
  onAsk: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>;
  onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
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
          </div>
        </article>
      ))}
      <ItineraryAgentBubble
        days={days}
        sources={sources}
        currentDayCount={currentDayCount}
        onAsk={onAsk}
        onApplyDraft={onApplyDraft}
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
  if (draft.kind === 'task') return typeof task?.title === 'string' ? `Checklist · ${task.title}` : 'Checklist';
  return 'Draft';
}

function replacementDayCount(draft: ResearchDraft) {
  const payload = draft.payload as Record<string, unknown>;
  return payload.mode === 'replace' && Array.isArray(payload.days) ? payload.days.length : undefined;
}

function DraftReviewCard({ draft, sources, currentDayCount, onApply }: { draft: ResearchDraft; sources: SourceLink[]; currentDayCount: number; onApply: (draft: ResearchDraft) => Promise<ResearchDraft | void> }) {
  const [applying, setApplying] = useState(false);
  const proposedDayCount = replacementDayCount(draft);
  const apply = async () => {
    setApplying(true);
    try {
      await onApply(draft);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="draft-card">
      <div className="draft-card-head">
        <div>
          <span className="kicker">{draft.kind} draft</span>
          <h4>{draft.title}</h4>
        </div>
        <StatusPill tone={draft.status === 'applied' ? 'good' : 'warn'}>{draft.status}</StatusPill>
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
        <button className="button secondary" onClick={apply} disabled={applying}>
          {applying ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />} Apply Draft
        </button>
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
        stops: selectedDay.stops.map((stop) => ({ id: stop.id, name: stop.name, kind: stop.kind }))
      }
    : undefined;

  return [
    'Request surface: Itinerary module persistent agent bubble.',
    selectedDay
      ? `Selected itinerary day: Day ${selectedDay.day} (${selectedDay.id}) - ${selectedDay.title}. If the user says "this day", target ${selectedDay.id}.`
      : 'Selected itinerary day: Whole itinerary. If the user mentions a day number, target that day.',
    'The user may ask questions or ask for itinerary edits. Saved-data edits must be returned as reviewable itinerary drafts, never direct mutations.',
    'If the user asks to add a comment, reminder, pacing note, or family note to a day, create an itinerary patch draft that updates that day notes while preserving useful existing notes.',
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
  onAsk,
  onApplyDraft
}: {
  days: DayPlan[];
  sources: SourceLink[];
  currentDayCount: number;
  onAsk: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>;
  onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
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
                  <DraftReviewCard draft={draft} sources={[...sources, ...answer.sources]} currentDayCount={currentDayCount} onApply={applyBubbleDraft} key={draft.id} />
                ))}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ResearchView({ history, currentDayCount, onAsk, onApplyDraft }: { history: ResearchAnswer[]; currentDayCount: number; onAsk: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>; onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void> }) {
  const [question, setQuestion] = useState('');
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!question.trim()) return;
    setBusy(true);
    try {
      await onAsk(question, deep);
      setQuestion('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="research-layout">
      <div className="agent-box">
        <h2>Research Agent</h2>
        <p>Ask planning questions. Answers use an official-first source policy and never change saved trip data automatically.</p>
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about tickets, drive timing, family seating, rental insurance, lodging, or kid-friendly alternatives..." />
        <label className="checkbox"><input type="checkbox" checked={deep} onChange={(event) => setDeep(event.target.checked)} /> Use deeper research</label>
        <button className="button primary full" onClick={submit} disabled={busy || !question.trim()}>
          {busy ? <Loader2 className="spin" size={17} /> : <Search size={17} />} Ask with Sources
        </button>
      </div>
      <div className="answer-stack">
        {history.length === 0 && <div className="empty">No research yet. Try asking which attractions need advance tickets.</div>}
        {history.map((answer) => (
          <article className="answer-card" key={answer.id}>
            <h3>{answer.question}</h3>
            <AnswerText text={answer.answer} />
            {answer.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
            <div className="source-row">
              {answer.sources.map((source) => (
                <a className="source-chip" key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={13} /></a>
              ))}
            </div>
            {answer.drafts.map((draft) => (
              <DraftReviewCard draft={draft} sources={answer.sources} currentDayCount={currentDayCount} onApply={onApplyDraft} key={draft.id} />
            ))}
          </article>
        ))}
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

  const refresh = async () => {
    const [trip, itinerary, budget, tasks, sources, research] = await Promise.all([
      api.trip(),
      api.itinerary(),
      api.budget(),
      api.tasks(),
      api.sources(),
      api.researchHistory()
    ]);
    setState({ trip, itinerary, budget, tasks, sources, research });
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
      <main className="login-screen">
        <section className="login-card">
          <BrandMark />
          <h1>Ireland Trip Agent</h1>
          <p>Enter the family passcode to open the planner.</p>
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void login();
            }}
            placeholder="Family passcode"
            aria-label="Family passcode"
          />
          {error && <p className="warning">{error}</p>}
          <button className="button primary full" onClick={login} disabled={!passcode.trim()}>
            <ShieldCheck size={17} /> Unlock Planner
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${tab === 'dashboard' ? 'dashboard-shell' : ''} ${navCollapsed ? 'nav-collapsed' : ''} ${browserCollapsed ? 'browser-collapsed-shell' : ''}`} data-testid="app-shell">
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
        </nav>
        <div className={`mobile-nav-drawer ${mobileNavOpen ? 'open' : ''}`} aria-label="Mobile navigation" aria-hidden={mobileNavOpen ? 'false' : 'true'}>
          <NavigationItems activeTab={tab} onSelect={selectTab} />
        </div>
        <div className="sidebar-family-card">
          <div className="family-avatar-stack" aria-hidden="true">
            <span>J</span>
            <span>T</span>
            <span>3</span>
          </div>
          <div>
            <strong>The Johnson Family</strong>
            <span>Family Pass: 7D43K2</span>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="sidebar-help-card">
          <img src="/dashboard-assets/route-dingle.svg" alt="" aria-hidden="true" />
          <strong>Need local help?</strong>
          <span>Your Ireland Agent is just a message away.</span>
          <button className="button ghost compact" type="button" onClick={() => setTab('research')}>
            Message Agent <MessageCircle size={14} />
          </button>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            {tab === 'dashboard' ? (
              <p className="dashboard-greeting">Good morning, Thomas! <span aria-hidden="true">👋</span></p>
            ) : (
              <>
                <span className="kicker">Local-first planner</span>
                <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
              </>
            )}
          </div>
          <div className="topbar-meta">
            <button className="icon-button topbar-bell" type="button" aria-label="Notifications"><Bell size={16} /></button>
            <CurrencyHeaderTile />
            <button className="button ghost compact" onClick={() => setBrowserCollapsed((current) => !current)} aria-label={browserCollapsed ? 'Expand browser view' : 'Collapse browser view'}>
              {browserCollapsed ? <Eye size={15} /> : <EyeOff size={15} />}
              {browserCollapsed ? 'Expand View' : 'Collapse View'}
            </button>
            <StatusPill tone="good">June 2027</StatusPill>
            <StatusPill>{state.trip?.travelers || 5} travelers</StatusPill>
            {authRequired && <button className="button ghost compact" onClick={logout}>Log out</button>}
          </div>
        </header>
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
            {tab === 'itinerary' && <ItineraryView days={state.itinerary} sources={activeSources} currentDayCount={state.itinerary.length} onSave={saveItinerary} onAsk={askResearch} onApplyDraft={applyDraft} />}
            {tab === 'research' && <ResearchView history={state.research} currentDayCount={state.itinerary.length} onAsk={askResearch} onApplyDraft={applyDraft} />}
            {tab === 'map' && <MapPanel days={state.itinerary} selectedDayId={selectedDayId} onSelectDay={setSelectedDayId} />}
            {tab === 'budget' && <BudgetView budget={state.budget} onSave={saveBudget} />}
            {tab === 'tasks' && <TasksView tasks={state.tasks} onSave={saveTasks} />}
            {tab === 'sources' && <SourcesView sources={state.sources} onCheck={checkSource} />}
          </>
        )}
      </section>
      <MobileBottomNav activeTab={tab} onSelect={selectTab} onMore={() => setMobileNavOpen((current) => !current)} />
    </main>
  );
}
