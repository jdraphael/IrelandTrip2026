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
  FileText,
  Home,
  Hotel,
  MapPinned,
  Plane,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users
} from 'lucide-react';
import type { TasksResponse } from '../api';
import type { BookingTask, DayPlan, Trip } from '../types';

type ChecklistCategory = NonNullable<BookingTask['displayCategory']>;

interface ChecklistDashboardProps {
  trip?: Trip;
  itinerary: DayPlan[];
  tasks?: TasksResponse;
  onSave: (items: Partial<BookingTask>[]) => Promise<void>;
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
  flights: '/dashboard-assets/checklist/thumb-flights.svg',
  passports: '/dashboard-assets/checklist/thumb-passports.svg',
  'fare-alerts': '/dashboard-assets/checklist/thumb-fare-alerts.svg',
  lodging: '/dashboard-assets/checklist/thumb-lodging.svg',
  driving: '/dashboard-assets/checklist/thumb-driving.svg',
  packing: '/dashboard-assets/checklist/thumb-packing.svg',
  documents: '/dashboard-assets/checklist/thumb-documents.svg',
  experiences: '/dashboard-assets/checklist/thumb-experiences.svg'
};

const routeImages: Record<string, string> = {
  LEX: '/dashboard-assets/checklist/thumb-flights.svg',
  Dublin: '/dashboard-assets/route-dublin.svg',
  Kilkenny: '/dashboard-assets/route-kilkenny.svg',
  Cork: '/dashboard-assets/route-cork.svg',
  Dingle: '/dashboard-assets/route-dingle.svg',
  Galway: '/dashboard-assets/route-galway.svg'
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

function routeStops(itinerary: DayPlan[]) {
  const bases = itinerary
    .map((day) => day.base === 'Dublin Airport' ? 'Dublin' : day.base)
    .filter((base) => !['In flight', 'Travel home'].includes(base));
  const unique = bases.filter((base, index) => bases.indexOf(base) === index);
  const ordered = ['Dublin', 'Kilkenny', 'Cork', 'Dingle', 'Galway', 'Dublin'];
  return ['LEX', ...(unique.length >= 4 ? ordered : ordered)].map((base, index) => ({
    base,
    label: index === 0 ? 'Departure' : index === 1 ? '2-3 Nights' : base === 'Kilkenny' || base === 'Galway' ? '1 Night' : '2 Nights',
    completed: index > 0 && index < 3
  }));
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

function ChecklistHero({ trip, items, onJumpToNext }: { trip?: Trip; items: ReturnType<typeof normalizeTask>[]; onJumpToNext: () => void }) {
  const done = items.filter((task) => task.status === 'done').length;
  const overall = percent(done, items.length);
  const openCount = items.filter((task) => task.status === 'open').length;
  const nextTask = items.find((task) => task.id === 'task-book-flights' && task.status !== 'done') || [...items].filter((task) => task.status === 'open').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  return (
    <section className="checklist-hero">
      <div className="checklist-hero-toolbar" aria-label="Trip controls">
        <button className="checklist-icon-button" type="button" aria-label="Notifications"><Bell size={17} /></button>
        <button className="checklist-control" type="button">June 2027 <ChevronDown size={15} /></button>
        <button className="checklist-control" type="button"><Users size={16} /> {trip?.travelers || 5} Travelers <ChevronDown size={15} /></button>
        <button className="checklist-shamrock" type="button" aria-label="Ireland trip magic">♣</button>
      </div>
      <div className="checklist-hero-copy">
        <p className="checklist-greeting">Good morning, Thomas! <span aria-hidden="true">♣</span></p>
        <h1>Ireland Family Adventure</h1>
        <p className="checklist-hero-subtitle">Let’s get everything ready for an unforgettable trip together.</p>
        <div className="checklist-trip-meta">
          <span><CalendarDays size={16} /> {trip?.month || 'June'} {trip?.year || 2027}</span>
          <span><Users size={16} /> {trip?.travelers || 5} Travelers</span>
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
        <strong>392</strong>
        <p>days to go! ♧</p>
        <span className="checklist-countdown-accessible">392 days to go</span>
      </motion.aside>
    </section>
  );
}

function RouteTimeline({ itinerary }: { itinerary: DayPlan[] }) {
  return (
    <section className="checklist-route" aria-label="Ireland route timeline">
      {routeStops(itinerary).map((stop, index) => (
        <div className={`checklist-route-stop ${stop.completed ? 'complete' : ''}`} key={`${stop.base}-${index}`}>
          <span className="route-node">
            <img src={routeImages[stop.base] || routeImages.Dublin} alt="" aria-hidden="true" />
            {stop.completed && <CheckCircle2 size={17} />}
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

function ChecklistTaskCard({ task, onSave }: { task: ReturnType<typeof normalizeTask>; onSave: (items: Partial<BookingTask>[]) => Promise<void> }) {
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
            <button className="checklist-card-action" type="button">{task.actionLabel} <span aria-hidden="true">→</span></button>
            <button className="checklist-mark-complete" type="button" onClick={() => onSave([{ id: task.id, status: 'done' }])}>Mark Complete</button>
          </>
        )}
      </div>
    </motion.article>
  );
}

function RightWidgets({ items }: { items: ReturnType<typeof normalizeTask>[] }) {
  const categoryProgress = categories.map((category) => {
    const categoryItems = items.filter((task) => task.displayCategory === category);
    return {
      category,
      value: percent(categoryItems.filter((task) => task.status === 'done').length, categoryItems.length),
      tone: category === 'Family Prep' ? 'orange' : category === 'Driving in Ireland' ? 'gold' : 'green'
    } as const;
  });
  const family = [
    { name: 'Thomas (You)', value: 75 },
    { name: 'Laura', value: 60 },
    { name: 'Emma', value: 40 },
    { name: 'Sophia', value: 35 },
    { name: 'Olivia', value: 50 }
  ];

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
        <img src="/dashboard-assets/checklist/assistant-rain.svg" alt="" aria-hidden="true" />
      </section>
      <section className="checklist-widget">
        <h2><Users size={18} /> Family Progress</h2>
        <p className="widget-muted">See who’s on top of their tasks!</p>
        <div className="family-progress-list">
          {family.map((member, index) => (
            <div className="family-progress-row" key={member.name}>
              <span className="family-dot">{member.name.charAt(0)}</span>
              <span>{member.name}</span>
              <ProgressBar value={member.value} tone={member.value < 40 ? 'orange' : 'green'} />
              <strong>{member.value}%</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="checklist-footer-card">
        <img src="/dashboard-assets/checklist/castle-footer.svg" alt="" aria-hidden="true" />
        <div>
          <h2>Planning made magical</h2>
          <p>Every check brings your family closer to adventure.</p>
        </div>
      </section>
    </aside>
  );
}

export function ChecklistDashboard({ trip, itinerary, tasks, onSave }: ChecklistDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<'All Items' | ChecklistCategory>('All Items');
  const items = useMemo(() => (tasks?.items || []).map(normalizeTask), [tasks]);
  const counts = useMemo(() => {
    const next = new Map<ChecklistCategory, number>();
    categories.forEach((category) => next.set(category, items.filter((task) => task.displayCategory === category).length));
    return next;
  }, [items]);
  const filteredItems = activeFilter === 'All Items' ? items : items.filter((task) => task.displayCategory === activeFilter);

  if (!tasks) return null;

  return (
    <motion.section className="checklist-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.32 }}>
      <ChecklistHero trip={trip} items={items} onJumpToNext={() => setActiveFilter('Flights & Travel')} />
      <RouteTimeline itinerary={itinerary} />
      <div className="checklist-content-grid">
        <section className="checklist-main-column">
          <div className="checklist-section-head">
            <div>
              <h2>Checklist <span aria-hidden="true">♣</span></h2>
              <p>Stay organized and check off each item as you go.</p>
            </div>
            <button className="checklist-sort" type="button">Sort by: Priority <ChevronDown size={15} /></button>
          </div>
          <CategoryFilters active={activeFilter} counts={counts} total={items.length} onSelect={setActiveFilter} />
          <div className="checklist-card-stack">
            {filteredItems.map((task) => (
              <ChecklistTaskCard task={task} onSave={onSave} key={task.id} />
            ))}
          </div>
        </section>
        <RightWidgets items={items} />
      </div>
    </motion.section>
  );
}
