import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  CalendarDays,
  Car,
  Castle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Home,
  Hotel,
  MapPinned,
  Plane,
  ShieldCheck,
  Sparkles,
  Ticket,
  Upload,
  X,
  Users
} from 'lucide-react';
import { api, type TasksResponse } from '../api';
import { TravelerMenu, fallbackMembers } from './TravelerMenu';
import { getTimeOfDayGreeting } from '../lib/greeting';
import type { BookingTask, DayPlan, FamilyMember, Trip } from '../types';

type ChecklistCategory = NonNullable<BookingTask['displayCategory']>;
type ChecklistSort = 'priority' | 'dueDate' | 'status' | 'category' | 'assigned' | 'progress';

interface ChecklistDashboardProps {
  trip?: Trip;
  itinerary: DayPlan[];
  tasks?: TasksResponse;
  familyMembers?: FamilyMember[];
  onSave: (items: Partial<BookingTask>[]) => Promise<void>;
  onSaveFamilyMembers: (members: FamilyMember[]) => Promise<void>;
}

const categories: ChecklistCategory[] = ['Flights & Travel', 'Lodging & Stays', 'Driving in Ireland', 'Family Prep', 'Experiences'];

const categoryIcons: Record<ChecklistCategory, typeof Plane> = {
  'Flights & Travel': Plane,
  'Lodging & Stays': Hotel,
  'Driving in Ireland': Car,
  'Family Prep': Users,
  Experiences: Ticket
};

const imageByKey: Record<string, string> = {
  flights: '/dashboard-assets/checklist/checklist-flight-booking.webp',
  passports: '/dashboard-assets/checklist/checklist-passports.webp',
  'fare-alerts': '/dashboard-assets/checklist/checklist-fare-alerts.webp',
  lodging: '/dashboard-assets/checklist/checklist-lodging.webp',
  driving: '/dashboard-assets/checklist/checklist-driving.webp',
  packing: '/dashboard-assets/checklist/checklist-family-prep.webp',
  documents: '/dashboard-assets/checklist/checklist-family-prep.webp',
  experiences: '/dashboard-assets/checklist/checklist-experiences.webp'
};

const priorityRank = { high: 0, medium: 1, low: 2 };
const statusRank = { open: 0, blocked: 1, done: 2 };

const routeImages: Record<string, string> = {
  LEX: '/dashboard-assets/checklist/checklist-flight-booking.webp',
  Dublin: '/dashboard-assets/checklist/timeline-dublin.webp',
  Kilkenny: '/dashboard-assets/checklist/timeline-kilkenny.webp',
  Cork: '/dashboard-assets/checklist/timeline-cork.webp',
  Dingle: '/dashboard-assets/checklist/timeline-dingle.webp',
  Galway: '/dashboard-assets/checklist/timeline-galway.webp'
};

function derivedCategory(task: BookingTask): ChecklistCategory {
  if (task.displayCategory) return task.displayCategory;
  if (task.category === 'Flights') return 'Flights & Travel';
  if (task.category === 'Lodging') return 'Lodging & Stays';
  if (task.category === 'Rental Car' || task.category === 'Transportation') return 'Driving in Ireland';
  if (task.category === 'Activities' || task.category === 'Attractions') return 'Experiences';
  return 'Family Prep';
}

function normalizeTask(task: BookingTask): BookingTask & { displayCategory: ChecklistCategory; priority: 'high' | 'medium' | 'low' } {
  const displayCategory = derivedCategory(task);
  const isDone = task.status === 'done';
  return {
    ...task,
    displayCategory,
    priority: task.priority || (task.status === 'blocked' ? 'high' : 'medium'),
    description: task.description || task.notes || `Prepare this ${displayCategory.toLowerCase()} item for the family trip.`,
    aiSuggestion: task.aiSuggestion || 'The travel agent can help compare options and keep this moving.',
    imageKey: task.imageKey || (displayCategory === 'Flights & Travel' ? 'flights' : displayCategory === 'Lodging & Stays' ? 'lodging' : displayCategory === 'Driving in Ireland' ? 'driving' : displayCategory === 'Experiences' ? 'experiences' : 'documents'),
    actionLabel: task.actionLabel || (isDone ? 'View Details' : 'View Options'),
    subtasksDone: task.subtasksDone ?? (isDone ? 1 : 0),
    subtasksTotal: task.subtasksTotal ?? 1,
    familyImpact: task.familyImpact || (displayCategory === 'Flights & Travel' ? 'Affects all travelers' : task.category)
  };
}

function formatDueDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return `Due ${date}`;
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'][parsed.getMonth()];
  return `Due ${month} ${parsed.getDate()}, ${parsed.getFullYear()}`;
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatTripDateRange(trip?: Trip) {
  const start = parseDate(trip?.startDate);
  const end = parseDate(trip?.endDate);
  if (!start || !end) return `${trip?.month || 'June'} ${trip?.year || 2027}`;
  const startMonth = start.toLocaleString('en-US', { month: 'short' });
  const endMonth = end.toLocaleString('en-US', { month: 'short' });
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${startMonth} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`
    : `${startMonth} ${start.getDate()}-${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

function daysUntilTrip(startDate?: string) {
  const start = parseDate(startDate);
  if (!start) return undefined;
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.ceil((start.getTime() - todayLocal.getTime()) / 86_400_000));
}

const routePlan = [
  { base: 'LEX', title: 'Lexington departure', label: 'Departure', start: '2027-06-18', end: '2027-06-18' },
  { base: 'Dublin', title: 'Dublin', label: '3 Nights', start: '2027-06-19', end: '2027-06-21' },
  { base: 'Kilkenny', title: 'Kilkenny', label: '1 Night', start: '2027-06-22', end: '2027-06-22' },
  { base: 'Cork', title: 'Cork', label: '2 Nights', start: '2027-06-23', end: '2027-06-24' },
  { base: 'Dingle', title: 'Dingle', label: '2 Nights', start: '2027-06-25', end: '2027-06-26' },
  { base: 'Galway', title: 'Galway', label: '1 Night', start: '2027-06-27', end: '2027-06-27' },
  { base: 'Dublin', title: 'Dublin return', label: '2 Nights', start: '2027-06-28', end: '2027-06-29' }
];

function routeStops() {
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return routePlan.map((stop) => {
    const start = parseDate(stop.start)!;
    const end = parseDate(stop.end)!;
    const complete = todayLocal.getTime() > end.getTime();
    const active = todayLocal.getTime() >= start.getTime() && todayLocal.getTime() <= end.getTime();
    return { ...stop, complete, active, status: complete ? 'completed' : active ? 'in progress' : 'pending' };
  });
}

function ProgressBar({ value, tone = 'green' }: { value: number; tone?: 'green' | 'gold' | 'orange' }) {
  return (
    <span className="checklist-progress-track" aria-label={`${value}%`}>
      <motion.span
        className={`checklist-progress-fill ${tone}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </span>
  );
}

function ChecklistHero({ trip, items, familyMembers, onSaveFamilyMembers, onJumpToNext }: { trip?: Trip; items: ReturnType<typeof normalizeTask>[]; familyMembers?: FamilyMember[]; onSaveFamilyMembers: (members: FamilyMember[]) => Promise<void>; onJumpToNext: () => void }) {
  const done = items.filter((task) => task.status === 'done').length;
  const overall = percent(done, items.length);
  const openCount = items.filter((task) => task.status === 'open').length;
  const nextTask = items.find((task) => task.id === 'task-book-flights' && task.status !== 'done') || [...items].filter((task) => task.status === 'open').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const greeting = getTimeOfDayGreeting();
  const travelerCount = familyMembers?.length || trip?.travelers || 5;
  const tripDateRange = formatTripDateRange(trip);
  const countdown = daysUntilTrip(trip?.startDate);

  return (
    <section className="checklist-hero">
      <div className="checklist-hero-toolbar" aria-label="Trip controls">
        <button className="checklist-icon-button" type="button" aria-label="Notifications"><Bell size={17} /></button>
        <button className="checklist-control" type="button">{tripDateRange} <ChevronDown size={15} /></button>
        <TravelerMenu members={familyMembers} onSave={onSaveFamilyMembers} className="checklist-traveler-menu" />
        <button className="checklist-shamrock" type="button" aria-label="Ireland trip magic">♣</button>
      </div>
      <div className="checklist-hero-copy">
        <p className="checklist-greeting">{greeting}. <span aria-hidden="true">♣</span></p>
        <h1>Ireland Family Adventure</h1>
        <p className="checklist-hero-subtitle">Let’s get everything ready for an unforgettable trip together.</p>
        <div className="checklist-trip-meta">
          <span><CalendarDays size={16} /> {tripDateRange}</span>
          <span><Users size={16} /> {travelerCount} Travelers</span>
          <span><Plane size={16} /> {trip?.origin || 'LEX'} → {trip?.destination || 'DUB'}</span>
        </div>
        <div className="checklist-hero-progress">
          <div className="checklist-ring" style={{ '--progress': overall } as CSSProperties}>
            <strong>{overall}%</strong>
            <span>Overall Progress</span>
          </div>
          <div className="checklist-remaining">
            <strong>{openCount} tasks remaining</strong>
            <span>You’re making great progress!</span>
            <ProgressBar value={overall} />
            {nextTask && (
              <button className="checklist-next-task" type="button" onClick={onJumpToNext}>
                <Plane size={17} /> <span>Next up: {nextTask.title}</span> <span aria-hidden="true">›</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <motion.aside className="checklist-countdown" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
        <span>Countdown to Ireland</span>
        <strong>{countdown ?? '...'}</strong>
        <p>days to go! ♧</p>
        <span className="checklist-countdown-accessible">{countdown ?? 0} days to go</span>
      </motion.aside>
    </section>
  );
}

function RouteTimeline() {
  return (
    <section className="checklist-route" aria-label="Ireland route timeline">
      {routeStops().map((stop, index) => (
        <div className={`checklist-route-stop ${stop.complete ? 'complete' : ''} ${stop.active ? 'active' : ''}`} key={`${stop.base}-${index}`}>
          <span className="route-node" aria-label={`${stop.title} ${stop.status}`}>
            <img src={routeImages[stop.base] || routeImages.Dublin} alt="" aria-hidden="true" />
            {stop.complete && <CheckCircle2 size={17} />}
          </span>
          <strong>{stop.base}</strong>
          <small>{stop.label}</small>
        </div>
      ))}
    </section>
  );
}

function CategoryFilters({ active, counts, total, onSelect }: { active: 'All Items' | ChecklistCategory; counts: Map<ChecklistCategory, number>; total: number; onSelect: (value: 'All Items' | ChecklistCategory) => void }) {
  return (
    <div className="checklist-filters" aria-label="Checklist filters">
      <button className={active === 'All Items' ? 'active' : ''} type="button" onClick={() => onSelect('All Items')}>
        All Items <span>{total}</span>
      </button>
      {categories.map((category) => {
        const Icon = categoryIcons[category];
        return (
          <button className={active === category ? 'active' : ''} type="button" onClick={() => onSelect(category)} key={category}>
            <Icon size={15} /> {category} <span>{counts.get(category) || 0}</span>
          </button>
        );
      })}
    </div>
  );
}

function sortTasks(items: ReturnType<typeof normalizeTask>[], sort: ChecklistSort) {
  return [...items].sort((a, b) => {
    if (sort === 'dueDate') return a.dueDate.localeCompare(b.dueDate);
    if (sort === 'status') return statusRank[a.status] - statusRank[b.status] || a.dueDate.localeCompare(b.dueDate);
    if (sort === 'category') return a.displayCategory.localeCompare(b.displayCategory) || a.dueDate.localeCompare(b.dueDate);
    if (sort === 'assigned') return (a.assignedTo?.[0] || 'zzz').localeCompare(b.assignedTo?.[0] || 'zzz') || a.dueDate.localeCompare(b.dueDate);
    if (sort === 'progress') return percent(a.subtasksDone || 0, a.subtasksTotal || 1) - percent(b.subtasksDone || 0, b.subtasksTotal || 1);
    return priorityRank[a.priority] - priorityRank[b.priority] || a.dueDate.localeCompare(b.dueDate);
  });
}

function ChecklistTaskCard({ task, onSave, onOpen }: { task: ReturnType<typeof normalizeTask>; onSave: (items: Partial<BookingTask>[]) => Promise<void>; onOpen: (task: ReturnType<typeof normalizeTask>) => void }) {
  const Icon = categoryIcons[task.displayCategory];
  const isDone = task.status === 'done';
  const progress = `${task.subtasksDone || 0}/${task.subtasksTotal || 1}`;
  const image = imageByKey[task.imageKey || 'documents'] || imageByKey.documents;

  return (
    <motion.article
      className={`checklist-task-card ${isDone ? 'complete' : ''}`}
      layout
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.22 }}
    >
      <div className="checklist-task-image">
        <img src={image} alt="" aria-hidden="true" />
        <span><Icon size={20} /></span>
      </div>
      <div className="checklist-task-main">
        <span className={`checklist-priority ${task.priority}`}>{task.priority === 'high' ? 'High Priority' : task.priority === 'low' ? 'Low Priority' : 'Medium Priority'}</span>
        <h3>{task.title}</h3>
        <div className="checklist-card-meta">
          <span><CalendarDays size={14} /> {formatDueDate(task.dueDate)}</span>
          <span><Users size={14} /> {task.familyImpact}</span>
        </div>
      </div>
      <div className="checklist-task-detail">
        <p>{task.description}</p>
        <div className="checklist-ai-note">
          <strong><Sparkles size={13} /> AI Suggestion</strong>
          <span>{task.aiSuggestion}</span>
        </div>
      </div>
      <div className="checklist-task-actions">
        <button className={`checklist-card-check ${isDone ? 'checked' : ''}`} type="button" onClick={() => onSave([{ id: task.id, status: isDone ? 'open' : 'done' }])} aria-label={`Toggle ${task.title}`}>
          {isDone ? <CheckCircle2 size={30} /> : <span />}
        </button>
        <strong>{progress}</strong>
        {isDone ? (
          <span className="checklist-complete-label">Completed</span>
        ) : (
          <>
            <button className="checklist-card-action" type="button" onClick={() => onOpen(task)}>{task.actionLabel} <span aria-hidden="true">→</span></button>
            <button className="checklist-mark-complete" type="button" onClick={() => onSave([{ id: task.id, status: 'done' }])}>Mark Complete</button>
          </>
        )}
      </div>
    </motion.article>
  );
}

function fieldLabels(task: BookingTask) {
  const category = derivedCategory(task);
  if (category === 'Flights & Travel') return ['Preferred airlines', 'Seating priority', 'Timing window'];
  if (category === 'Lodging & Stays') return ['Preferred stay type', 'Room setup', 'Must-have amenities'];
  if (category === 'Driving in Ireland') return ['Rental target', 'Insurance question', 'Driving concern'];
  if (category === 'Experiences') return ['Booking window', 'Weather backup', 'Family priority'];
  return ['Document owner', 'Deadline detail', 'Family note'];
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function TaskDetailModal({ task, onClose, onSave }: { task: ReturnType<typeof normalizeTask>; onClose: () => void; onSave: (items: Partial<BookingTask>[]) => Promise<void> }) {
  const [draft, setDraft] = useState<Partial<BookingTask>>({
    id: task.id,
    decisionSummary: task.decisionSummary || '',
    detailedNotes: task.detailedNotes || task.notes || '',
    budgetEstimate: task.budgetEstimate,
    planningFields: { ...(task.planningFields || {}) },
    detailSubtasks: task.detailSubtasks || [],
    detailLinks: task.detailLinks || [],
    attachments: task.attachments || []
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const labels = fieldLabels(task);
  const planningFields = draft.planningFields || {};
  const attachments = draft.attachments || [];

  const save = async () => {
    setSaving(true);
    try {
      await onSave([draft]);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const attachment = await api.uploadTaskAttachment({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        dataBase64: await fileToBase64(file)
      });
      setDraft((current) => ({ ...current, attachments: [...(current.attachments || []), attachment] }));
    } finally {
      setUploading(false);
    }
  };

  const createDraft = async () => {
    const summary = draft.decisionSummary || draft.detailedNotes || `Use checklist details from ${task.title}.`;
    const created = await api.createTaskItineraryDraft(task.id, summary);
    setDraftMessage(`${created.title} created for review.`);
  };

  return (
    <div className="task-modal-backdrop" role="presentation">
      <section className="task-detail-modal" role="dialog" aria-modal="true" aria-label={task.title}>
        <header className="task-modal-head">
          <div>
            <span className={`checklist-priority ${task.priority}`}>{task.displayCategory}</span>
            <h2>{task.title}</h2>
          </div>
          <button className="checklist-icon-button" type="button" onClick={onClose} aria-label="Close task details"><X size={17} /></button>
        </header>
        <div className="task-modal-grid">
          <label>
            <span>Decision summary</span>
            <textarea value={draft.decisionSummary || ''} onChange={(event) => setDraft((current) => ({ ...current, decisionSummary: event.target.value }))} />
          </label>
          <label>
            <span>Detailed notes</span>
            <textarea value={draft.detailedNotes || ''} onChange={(event) => setDraft((current) => ({ ...current, detailedNotes: event.target.value }))} />
          </label>
          <label>
            <span>Budget estimate</span>
            <input type="number" value={draft.budgetEstimate ?? ''} onChange={(event) => setDraft((current) => ({ ...current, budgetEstimate: event.target.value === '' ? undefined : Number(event.target.value) }))} />
          </label>
          {labels.map((label) => (
            <label key={label}>
              <span>{label}</span>
              <input
                value={planningFields[label] || ''}
                onChange={(event) => setDraft((current) => ({ ...current, planningFields: { ...(current.planningFields || {}), [label]: event.target.value } }))}
              />
            </label>
          ))}
          {Object.entries(planningFields).filter(([key]) => !labels.includes(key)).map(([key, value]) => (
            <p className="task-existing-field" key={key}>{value}</p>
          ))}
        </div>
        <section className="task-modal-section">
          <h3>Granular checklist</h3>
          {(draft.detailSubtasks || []).map((subtask) => (
            <label className="task-subtask-row" key={subtask.id}>
              <input
                type="checkbox"
                checked={subtask.done}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  detailSubtasks: (current.detailSubtasks || []).map((item) => item.id === subtask.id ? { ...item, done: event.target.checked } : item)
                }))}
              />
              <span>{subtask.label}</span>
            </label>
          ))}
        </section>
        <section className="task-modal-section">
          <h3>Documents</h3>
          <label className="task-upload-button">
            <Upload size={16} />
            <span>{uploading ? 'Uploading...' : 'Upload document'}</span>
            <input type="file" onChange={(event) => void upload(event.target.files?.[0])} disabled={uploading} />
          </label>
          <div className="task-attachment-list">
            {attachments.map((attachment) => (
              <a href={attachment.url} target="_blank" rel="noreferrer" key={attachment.id}>
                <FileText size={16} />
                <span>{attachment.name}</span>
                <small>{attachment.note || `${Math.max(1, Math.round(attachment.size / 1024))} KB`}</small>
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
        </section>
        {draftMessage && <p className="task-draft-message">{draftMessage}</p>}
        <footer className="task-modal-actions">
          <button className="checklist-outline-button" type="button" onClick={createDraft}>Create itinerary draft</button>
          <button className="checklist-card-action" type="button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save details'}</button>
        </footer>
      </section>
    </div>
  );
}

function taskAssignedToMember(task: ReturnType<typeof normalizeTask>, member: FamilyMember) {
  const names = task.assignedTo || [];
  return names.some((name) => name.toLowerCase() === member.name.toLowerCase() || name.toLowerCase() === member.id.toLowerCase());
}

function RightWidgets({ items, familyMembers }: { items: ReturnType<typeof normalizeTask>[]; familyMembers?: FamilyMember[] }) {
  const categoryProgress = categories.map((category) => {
    const categoryItems = items.filter((task) => task.displayCategory === category);
    return {
      category,
      value: percent(categoryItems.filter((task) => task.status === 'done').length, categoryItems.length),
      tone: category === 'Family Prep' ? 'orange' : category === 'Driving in Ireland' ? 'gold' : 'green'
    } as const;
  });
  const members = familyMembers?.length ? familyMembers : fallbackMembers;
  const family = members.map((member, index) => {
    const assigned = items.filter((task) => taskAssignedToMember(task, member));
    const base = [75, 60, 40, 35, 50][index] || 30;
    return {
      name: index === 0 ? `${member.name} (You)` : member.name,
      value: assigned.length ? percent(assigned.filter((task) => task.status === 'done').length, assigned.length) : base,
      color: member.taskColor || '#0B5D3B'
    };
  });

  return (
    <aside className="checklist-widget-rail">
      <section className="checklist-widget">
        <h2><Castle size={19} /> Category Progress</h2>
        <div className="category-progress-list">
          {categoryProgress.map((item) => (
            <div className="category-progress-row" key={item.category}>
              <span>{item.category}</span>
              <ProgressBar value={item.value} tone={item.tone} />
              <strong>{item.value}%</strong>
            </div>
          ))}
        </div>
        <button className="widget-link" type="button">View all progress <span aria-hidden="true">→</span></button>
      </section>
      <section className="checklist-widget assistant-widget">
        <h2><Sparkles size={18} /> AI Travel Assistant</h2>
        <p>Rain expected in Galway during your stay. Add waterproof jackets to your packing list?</p>
        <button className="checklist-outline-button" type="button">View Packing List <span aria-hidden="true">→</span></button>
        <img src="/dashboard-assets/checklist/widget-ai-rain-jackets.webp" alt="" aria-hidden="true" />
      </section>
      <section className="checklist-widget">
        <h2><Users size={18} /> Family Progress</h2>
        <p className="widget-muted">See who’s on top of their tasks!</p>
        <div className="family-progress-list">
          {family.map((member, index) => (
            <div className="family-progress-row" key={member.name}>
              <span className="family-dot" style={{ background: member.color }}>{member.name.charAt(0)}</span>
              <span>{member.name}</span>
              <ProgressBar value={member.value} tone={member.value < 40 ? 'orange' : 'green'} />
              <strong>{member.value}%</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="checklist-footer-card">
        <img src="/dashboard-assets/checklist/widget-footer-castle.webp" alt="" aria-hidden="true" />
        <div>
          <h2>Planning made magical</h2>
          <p>Every check brings your family closer to adventure.</p>
        </div>
      </section>
    </aside>
  );
}

export function ChecklistDashboard({ trip, itinerary, tasks, familyMembers, onSave, onSaveFamilyMembers }: ChecklistDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<'All Items' | ChecklistCategory>('All Items');
  const [sort, setSort] = useState<ChecklistSort>('priority');
  const [selectedTask, setSelectedTask] = useState<ReturnType<typeof normalizeTask> | undefined>();
  const items = useMemo(() => (tasks?.items || []).map(normalizeTask), [tasks]);
  const counts = useMemo(() => {
    const next = new Map<ChecklistCategory, number>();
    categories.forEach((category) => next.set(category, items.filter((task) => task.displayCategory === category).length));
    return next;
  }, [items]);
  const filteredItems = sortTasks(activeFilter === 'All Items' ? items : items.filter((task) => task.displayCategory === activeFilter), sort);

  if (!tasks) return null;

  return (
    <motion.section className="checklist-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.32 }}>
      <ChecklistHero trip={trip} items={items} familyMembers={familyMembers} onSaveFamilyMembers={onSaveFamilyMembers} onJumpToNext={() => setActiveFilter('Flights & Travel')} />
      <RouteTimeline />
      <div className="checklist-content-grid">
        <section className="checklist-main-column">
          <div className="checklist-section-head">
            <div>
              <h2>Checklist <span aria-hidden="true">♣</span></h2>
              <p>Stay organized and check off each item as you go.</p>
            </div>
            <label className="checklist-sort">
              <span>Sort by:</span>
              <select aria-label="Sort checklist" value={sort} onChange={(event) => setSort(event.target.value as ChecklistSort)}>
                <option value="priority">Priority</option>
                <option value="dueDate">Due Date</option>
                <option value="status">Status</option>
                <option value="category">Category</option>
                <option value="assigned">Assigned Traveler</option>
                <option value="progress">Progress</option>
              </select>
              <ChevronDown size={15} />
            </label>
          </div>
          <CategoryFilters active={activeFilter} counts={counts} total={items.length} onSelect={setActiveFilter} />
          <div className="checklist-card-stack">
            {filteredItems.map((task) => (
              <ChecklistTaskCard task={task} onSave={onSave} onOpen={setSelectedTask} key={task.id} />
            ))}
          </div>
        </section>
        <RightWidgets items={items} familyMembers={familyMembers} />
      </div>
      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(undefined)} onSave={onSave} />}
    </motion.section>
  );
}
