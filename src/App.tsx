import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, CalendarDays, CheckCircle2, ExternalLink, FileCheck2, Landmark, Loader2, MapPinned, PiggyBank, RefreshCw, Route, Save, Search, ShieldCheck } from 'lucide-react';
import L from 'leaflet';
import { api, type BudgetResponse, type SourcesResponse, type TasksResponse } from './api';
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
  { id: 'dashboard', label: 'Dashboard', icon: Landmark },
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

function ProgressBar({ value, tone = 'green' }: { value: number; tone?: 'green' | 'blue' }) {
  return (
    <div className="progress" aria-label={`${value}%`}>
      <span className={`progress-fill ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
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
  return (
    <div className="dashboard-grid">
      <section className="hero-panel">
        <div>
          <h1>{state.trip?.title || 'Ireland Family Trip'}</h1>
          <p>{state.trip?.month} {state.trip?.year} · {state.trip?.travelers} travelers · {state.trip?.origin} to {state.trip?.destination}</p>
        </div>
        <button className="button primary" onClick={() => setTab('research')}><Bot size={18} /> Ask the Agent</button>
      </section>
      <section className="panel">
        <h2>Planning Health</h2>
        <div className="metric-row">
          <div>
            <span className="metric-label">Budget planned</span>
            <strong>{money.format(state.budget?.summary.planned || 0)}</strong>
          </div>
          <StatusPill tone={(state.budget?.summary.remainingPlanned || 0) >= 0 ? 'good' : 'danger'}>
            {(state.budget?.summary.remainingPlanned || 0) >= 0 ? 'Within target' : 'Over target'}
          </StatusPill>
        </div>
        <ProgressBar value={state.budget?.summary.plannedPercent || 0} />
        <p className="muted">{money.format(state.budget?.summary.remainingPlanned || 0)} remaining against {money.format(state.trip?.budgetTarget || 15000)}.</p>
      </section>
      <section className="panel">
        <h2>Next Decision</h2>
        {nextTask ? (
          <>
            <h3>{nextTask.title}</h3>
            <p>{nextTask.category} · due {nextTask.dueDate}</p>
            <button className="button secondary" onClick={() => setTab('tasks')}><CheckCircle2 size={16} /> Open Checklist</button>
          </>
        ) : <p className="muted">No open tasks.</p>}
      </section>
      <section className="panel wide">
        <h2>Route Snapshot</h2>
        <p>{state.trip?.routeSummary}</p>
        <div className="timeline-strip">
          {state.itinerary.filter((day) => day.base !== 'In flight' && day.base !== 'Travel home').slice(0, 8).map((day) => (
            <button key={day.id} onClick={() => setTab('map')}>{day.base}<span>Day {day.day}</span></button>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Drive Watch</h2>
        {firstLongDay ? <p><strong>Longest current day:</strong> Day {firstLongDay.day}, {firstLongDay.title}. Plan breaks every 90 minutes.</p> : <p className="muted">No long drive days marked.</p>}
      </section>
      <section className="panel">
        <h2>Source Status</h2>
        <p>{state.sources?.summary.officialCount || 0} official/government sources saved.</p>
        {(state.sources?.summary.warnings || []).slice(0, 2).map((warning) => <p className="warning" key={warning}>{warning}</p>)}
      </section>
    </div>
  );
}

function ItineraryView({ days, sources, onSave }: { days: DayPlan[]; sources: SourceLink[]; onSave: (updates: Partial<DayPlan>[]) => Promise<void> }) {
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
    </section>
  );
}

function draftTarget(draft: ResearchDraft) {
  const payload = draft.payload as Record<string, unknown>;
  const item = payload.item && typeof payload.item === 'object' ? payload.item as Record<string, unknown> : undefined;
  const task = payload.task && typeof payload.task === 'object' ? payload.task as Record<string, unknown> : undefined;
  if (draft.kind === 'itinerary') return typeof payload.dayId === 'string' ? `Itinerary · ${payload.dayId}` : 'Itinerary';
  if (draft.kind === 'budget') return typeof item?.label === 'string' ? `Budget · ${item.label}` : 'Budget';
  if (draft.kind === 'task') return typeof task?.title === 'string' ? `Checklist · ${task.title}` : 'Checklist';
  return 'Draft';
}

function DraftReviewCard({ draft, sources, onApply }: { draft: ResearchDraft; sources: SourceLink[]; onApply: (draft: ResearchDraft) => Promise<void> }) {
  const [applying, setApplying] = useState(false);
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

function ResearchView({ history, onAsk, onApplyDraft }: { history: ResearchAnswer[]; onAsk: (question: string, deep: boolean) => Promise<void>; onApplyDraft: (draft: ResearchDraft) => Promise<void> }) {
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
              <DraftReviewCard draft={draft} sources={answer.sources} onApply={onApplyDraft} key={draft.id} />
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

  const askResearch = async (question: string, deep: boolean) => {
    const answer = await api.askResearch(question, deep);
    const sources = await api.sources();
    setState((current) => ({ ...current, sources, research: [answer, ...current.research] }));
  };

  const applyDraft = async (draft: ResearchDraft) => {
    try {
      await api.applyDraft(draft.id);
      await refresh();
      setError(`${draft.title} applied.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to apply draft.');
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
          <div className="brand-mark">IE</div>
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
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">IE</div>
          <div>
            <strong>Ireland Agent</strong>
            <span>Family planning tool</span>
          </div>
        </div>
        <nav>
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => setTab(item.id)}>
                <Icon size={18} /> {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="kicker">Local-first planner</span>
            <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
          </div>
          <div className="topbar-meta">
            <StatusPill tone="good">June 2027</StatusPill>
            <StatusPill>{state.trip?.travelers || 5} travelers</StatusPill>
            {authRequired && <button className="button ghost compact" onClick={logout}>Log out</button>}
          </div>
        </header>
        {error && <button className="notice" onClick={() => setError('')}>{error}</button>}
        {tab === 'dashboard' && <Dashboard state={state} setTab={setTab} />}
        {tab === 'itinerary' && <ItineraryView days={state.itinerary} sources={activeSources} onSave={saveItinerary} />}
        {tab === 'research' && <ResearchView history={state.research} onAsk={askResearch} onApplyDraft={applyDraft} />}
        {tab === 'map' && <MapPanel days={state.itinerary} selectedDayId={selectedDayId} onSelectDay={setSelectedDayId} />}
        {tab === 'budget' && <BudgetView budget={state.budget} onSave={saveBudget} />}
        {tab === 'tasks' && <TasksView tasks={state.tasks} onSave={saveTasks} />}
        {tab === 'sources' && <SourcesView sources={state.sources} onCheck={checkSource} />}
      </section>
    </main>
  );
}
