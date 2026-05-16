import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TasksResponse } from '../src/api';
import App from '../src/App';

const tripResponse = {
  id: 'ireland-family-trip',
  title: 'Ireland Family Trip',
  month: 'June',
  year: 2027,
  startDate: '2027-06-18',
  endDate: '2027-06-30',
  travelers: 5,
  adults: 2,
  children: 3,
  origin: 'LEX',
  destination: 'DUB',
  budgetTarget: 15000,
  routeSummary: 'Dublin -> Kilkenny -> Cork -> Dingle/Killarney -> Galway -> Dublin Airport',
  priorities: ['Animals', 'Castles'],
  updatedAt: '2026-05-10T00:00:00Z'
};

const familyMembersResponse = [
  { id: 'justin', name: 'Justin', role: 'parent' as const, avatarKey: 'dad', taskColor: '#0B5D3B', age: 40 },
  { id: 'krissy', name: 'Krissy', role: 'parent' as const, avatarKey: 'mom', taskColor: '#5F8B4C', age: 39 },
  { id: 'lyla', name: 'Lyla', role: 'child' as const, avatarKey: 'lyla', taskColor: '#D9B95B', age: 11 },
  { id: 'grace', name: 'Grace', role: 'child' as const, avatarKey: 'grace', taskColor: '#C86B25', age: 9 },
  { id: 'everly', name: 'Everly', role: 'child' as const, avatarKey: 'everly', taskColor: '#2F7D67', age: 6 }
];

describe('Ireland trip app', () => {
  const richTasksResponse: TasksResponse = {
    items: [
      {
        id: 'task-book-flights',
        title: 'Book flights and seats together',
        status: 'open',
        dueDate: '2026-09-15',
        category: 'Flights',
        displayCategory: 'Flights & Travel',
        priority: 'high',
        description: 'Avoid basic economy. Prefer Delta or Aer Lingus main cabin.',
        aiSuggestion: 'Tuesday departures currently average 12% cheaper.',
        imageKey: 'flights',
        actionLabel: 'View Options',
        subtasksDone: 0,
        subtasksTotal: 2,
        assignedTo: ['Justin', 'Krissy'],
        decisionSummary: 'Target a one-stop route with all five seats together.',
        detailedNotes: 'Avoid basic economy and confirm the seat map before payment.',
        budgetEstimate: 6200,
        planningFields: {
          preferredAirlines: 'Delta or Aer Lingus',
          seatingPriority: 'Five adjacent seats'
        },
        detailSubtasks: [
          { id: 'route-compare', label: 'Compare one-stop routes from LEX', done: false },
          { id: 'seat-map', label: 'Check seat map before payment', done: false }
        ],
        attachments: [{
          id: 'fare-sheet',
          name: 'fare-watch.pdf',
          url: 'https://example.com/fare-watch.pdf',
          contentType: 'application/pdf',
          size: 48123,
          uploadedAt: '2026-05-16T13:00:00.000Z',
          note: 'Initial fare comparison'
        }]
      },
      {
        id: 'task-passports',
        title: 'Renew kids passports',
        status: 'done',
        dueDate: '2026-10-01',
        category: 'Documents',
        displayCategory: 'Family Prep',
        priority: 'medium',
        description: 'Passports expire August 2027. Allow enough time for renewal processing.',
        aiSuggestion: 'Apply by June to avoid summer delays.',
        imageKey: 'passports',
        actionLabel: 'Open Documents',
        subtasksDone: 1,
        subtasksTotal: 1
      },
      {
        id: 'task-book-lodging',
        title: 'Book refundable lodging holds',
        status: 'open',
        dueDate: '2027-01-15',
        category: 'Lodging',
        displayCategory: 'Lodging & Stays',
        priority: 'medium',
        description: 'Hold family-friendly stays near each route base.',
        aiSuggestion: 'Refundable aparthotels protect the route while prices settle.',
        imageKey: 'lodging',
        actionLabel: 'View Stays',
        subtasksDone: 2,
        subtasksTotal: 5
      }
    ],
    summary: { total: 3, done: 1, open: 2, blocked: 0 }
  };

  function stubChecklistApp(tasksResponse: TasksResponse = richTasksResponse) {
    return vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith('https://api.frankfurter.dev/v2/rate/USD/EUR')) return Promise.resolve(Response.json({ date: '2026-05-14', base: 'USD', quote: 'EUR', rate: 0.85378 }));
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/family-members') && init?.method === 'PATCH') return Promise.resolve(Response.json(JSON.parse(init.body as string)));
      if (url.endsWith('/api/family-members')) return Promise.resolve(Response.json(familyMembersResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Travel day', dateLabel: 'June 2027', base: 'In flight', stops: [{ id: 'dub', name: 'Dublin Airport', kind: 'airport', latitude: 53, longitude: -6 }], notes: 'Go' },
        { id: 'day-2', day: 2, title: 'Dublin', dateLabel: 'June 2027', base: 'Dublin', stops: [], notes: 'Dublin' },
        { id: 'day-5', day: 5, title: 'Drive to Kilkenny', dateLabel: 'June 2027', base: 'Kilkenny', stops: [], notes: 'Kilkenny' },
        { id: 'day-6', day: 6, title: 'Kilkenny to Cork', dateLabel: 'June 2027', base: 'Cork', stops: [], notes: 'Cork' },
        { id: 'day-9', day: 9, title: 'Drive to Dingle', dateLabel: 'June 2027', base: 'Dingle', stops: [], notes: 'Dingle' },
        { id: 'day-12', day: 12, title: 'Dingle to Galway', dateLabel: 'June 2027', base: 'Galway', stops: [], notes: 'Galway' },
        { id: 'day-15', day: 15, title: 'Return to Dublin Airport', dateLabel: 'June 2027', base: 'Dublin Airport', stops: [], notes: 'Dublin' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks') && init?.method === 'PATCH') {
        return Promise.resolve(Response.json({
          ...tasksResponse,
          items: tasksResponse.items.map((task) => task.id === 'task-book-flights' ? { ...task, status: 'done', subtasksDone: task.subtasksTotal || 1 } : task),
          summary: { total: tasksResponse.items.length, done: 2, open: Math.max(0, tasksResponse.items.length - 2), blocked: 0 }
        }));
      }
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json(tasksResponse));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    });
  }

  it('renders the cinematic checklist dashboard with hero, route timeline, filters, cards, and widgets', async () => {
    vi.stubGlobal('fetch', stubChecklistApp());

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);

    expect(screen.getByRole('heading', { name: /Ireland Family Adventure/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Jun 18-30, 2027/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/LEX/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Kilkenny/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Checklist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Flights & Travel/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Book flights and seats together/i })).toBeInTheDocument();
    expect(screen.getByText(/Tuesday departures currently average 12% cheaper/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Category Progress/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /AI Travel Assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Family Progress/i })).toBeInTheDocument();
    expect(screen.getByText(/Justin \(You\)/i)).toBeInTheDocument();
  });

  it('edits checklist travelers through the family members API', async () => {
    const fetchMock = stubChecklistApp();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);
    const travelerTrigger = screen.getAllByText(/5 Travelers/i).find((element) => element.closest('summary'));
    expect(travelerTrigger).toBeTruthy();
    fireEvent.click(travelerTrigger!.closest('summary')!);
    const justinInput = await screen.findByLabelText(/Traveler name for Justin/i);
    await userEvent.clear(justinInput);
    await userEvent.type(justinInput, 'Justin Raphael');
    const justinAge = screen.getByLabelText(/Traveler age for Justin/i);
    await userEvent.clear(justinAge);
    await userEvent.type(justinAge, '41');
    await userEvent.click(screen.getByRole('button', { name: /Save travelers/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/family-members', expect.objectContaining({
      method: 'PATCH',
      body: expect.stringContaining('"age":41')
    }));
  });

  it('filters checklist cards by category', async () => {
    vi.stubGlobal('fetch', stubChecklistApp());

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /Lodging & Stays/i }));

    expect(screen.getByRole('heading', { name: /Book refundable lodging holds/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Book flights and seats together/i })).not.toBeInTheDocument();
  });

  it('marks a checklist card complete through the task API', async () => {
    const fetchMock = stubChecklistApp();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: /Mark Complete/i })[0]);

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify([{ id: 'task-book-flights', status: 'done' }])
    }));
    expect(await screen.findAllByText(/Completed/i)).not.toHaveLength(0);
  });

  it('sorts checklist cards with the sort dropdown', async () => {
    vi.stubGlobal('fetch', stubChecklistApp({
      items: [
        { id: 'later-high', title: 'Later high priority task', status: 'open', dueDate: '2027-05-01', category: 'Flights', priority: 'high', displayCategory: 'Flights & Travel', subtasksDone: 0, subtasksTotal: 1 },
        { id: 'earlier-medium', title: 'Earlier medium task', status: 'open', dueDate: '2026-08-01', category: 'Documents', priority: 'medium', displayCategory: 'Family Prep', subtasksDone: 0, subtasksTotal: 1 }
      ],
      summary: { total: 2, done: 0, open: 2, blocked: 0 }
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);

    expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('Later high priority task');
    await userEvent.selectOptions(screen.getByLabelText(/Sort checklist/i), 'dueDate');
    expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('Earlier medium task');
  });

  it('opens a rich checklist detail modal from a task action button', async () => {
    vi.stubGlobal('fetch', stubChecklistApp());

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /View Options/i }));

    const dialog = await screen.findByRole('dialog', { name: /Book flights and seats together/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Target a one-stop route/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Delta or Aer Lingus/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /fare-watch.pdf/i })).toHaveAttribute('href', 'https://example.com/fare-watch.pdf');
  });

  it('saves checklist detail modal edits through the task API', async () => {
    const fetchMock = stubChecklistApp();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /View Options/i }));
    const summary = await screen.findByLabelText(/Decision summary/i);
    await userEvent.clear(summary);
    await userEvent.type(summary, 'Book Delta if five adjacent seats are available.');
    await userEvent.click(screen.getByRole('button', { name: /Save details/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      method: 'PATCH',
      body: expect.stringContaining('Book Delta if five adjacent seats are available')
    }));
  });

  it('labels route progress bubbles as pending before travel starts', async () => {
    vi.stubGlobal('fetch', stubChecklistApp());

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);

    expect(await screen.findByLabelText(/Lexington departure pending/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Lexington departure completed/i)).not.toBeInTheDocument();
  });

  it('renders legacy checklist tasks with derived visual metadata', async () => {
    vi.stubGlobal('fetch', stubChecklistApp({
      items: [
        { id: 'legacy-flight', title: 'Book flights', status: 'open', dueDate: '2026-09-15', category: 'Flights' },
        { id: 'legacy-car', title: 'Reserve rental car', status: 'open', dueDate: '2027-02-15', category: 'Rental Car' }
      ],
      summary: { total: 2, done: 0, open: 2, blocked: 0 }
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);

    expect(screen.getByRole('heading', { name: /Book flights/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Driving in Ireland/i })).toBeInTheDocument();
    expect(screen.getByText(/Due Sept 15, 2026/i)).toBeInTheDocument();
  });

  it('renders the command center with seeded trip context', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.startsWith('https://api.frankfurter.dev/v2/rate/USD/EUR')) return Promise.resolve(Response.json({ date: '2026-05-14', base: 'USD', quote: 'EUR', rate: 0.85378 }));
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Travel day', dateLabel: 'June 2027', base: 'In flight', stops: [{ id: 'dub', name: 'Dublin Airport', kind: 'airport', latitude: 53, longitude: -6 }], notes: 'Go' },
        { id: 'day-2', day: 2, title: 'Dublin Zoo', dateLabel: 'June 2027', base: 'Dublin', stops: [{ id: 'zoo', name: 'Dublin Zoo', kind: 'activity', latitude: 53, longitude: -6 }], notes: 'Animals' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: ['No sources are attached'] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    }));

    render(<App />);

    expect(await screen.findByText('Ireland Family Trip')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Your Ireland adventure is waiting/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Next Up/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Route Snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Drive Watch/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Source Status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask the Agent/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Checklist/i })).toBeInTheDocument();
    expect(screen.getByText('Jun 18-30, 2027')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Itinerary$/i })[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Research Agent/i })).toBeInTheDocument();
    expect(await screen.findByText('1 USD = 0.85 EUR')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Budget/i }));
    expect(screen.getByText('1 USD = 0.85 EUR')).toBeInTheDocument();
  });

  it('renders payment guidance chips at the bottom of itinerary day cards', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/family-members')) return Promise.resolve(Response.json(familyMembersResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        {
          id: 'day-5',
          day: 5,
          title: 'Drive to Kilkenny',
          dateLabel: 'June 2027',
          base: 'Kilkenny',
          stops: [{ id: 'kilkenny-castle', name: 'Kilkenny Castle', kind: 'activity', latitude: 53, longitude: -6 }],
          notes: 'Drive south.',
          paymentTags: [
            { id: 'visa', kind: 'card', label: 'Visa', network: 'Visa', note: 'Primary card for hotels and tickets' },
            { id: 'mastercard', kind: 'card', label: 'Mastercard', network: 'Mastercard', note: 'Backup card' },
            { id: 'cash', kind: 'cash', label: 'EUR 60-120', minCashEur: 60, maxCashEur: 120, note: 'Parking, tips, and smaller vendors' }
          ]
        }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Itinerary$/i })[0]);

    const paymentGroup = await screen.findByLabelText(/Recommended payment methods for day 5/i);
    expect(paymentGroup).toHaveTextContent('Visa');
    expect(paymentGroup).toHaveTextContent('Mastercard');
    expect(paymentGroup).toHaveTextContent('EUR 60-120');
  });

  it('uses the provided icon asset for the app brand instead of the IE text mark', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');

    expect(screen.getByRole('img', { name: /Ireland Trip Agent icon/i })).toHaveAttribute('src', '/icon-192.png');
    expect(screen.queryByText('IE')).not.toBeInTheDocument();
  });

  it('collapses and expands the desktop navigation while keeping icon-only navigation available', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    const shell = screen.getByTestId('app-shell');

    expect(shell).not.toHaveClass('nav-collapsed');
    await userEvent.click(screen.getByRole('button', { name: /Collapse navigation/i }));

    expect(shell).toHaveClass('nav-collapsed');
    expect(screen.getAllByRole('button', { name: /^Itinerary$/i })[0]).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Expand navigation/i }));
    expect(shell).not.toHaveClass('nav-collapsed');
  });

  it('collapses and expands the browser workspace view', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');

    await userEvent.click(screen.getByRole('button', { name: /Collapse browser view/i }));
    expect(screen.queryAllByText('Planning Health')).toHaveLength(0);
    expect(screen.getByText(/Browser view is collapsed/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Expand browser view/i }));
    expect(screen.getAllByText('Planning Health')[0]).toBeInTheDocument();
  });

  it('provides a mobile navigation menu that expands and collapses', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    const mobileNav = screen.getByLabelText('Mobile navigation');

    expect(mobileNav).toHaveAttribute('aria-hidden', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Open navigation menu/i }));

    expect(mobileNav).toHaveAttribute('aria-hidden', 'false');
    await userEvent.click(screen.getByRole('button', { name: /Close navigation menu/i }));
    expect(mobileNav).toHaveAttribute('aria-hidden', 'true');
  });

  it('lets the map switch from day view to all itinerary stops', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Travel day', dateLabel: 'June 2027', base: 'In flight', stops: [{ id: 'dub', name: 'Dublin Airport', kind: 'airport', latitude: 53, longitude: -6 }], notes: 'Go' },
        { id: 'day-2', day: 2, title: 'Dublin Zoo', dateLabel: 'June 2027', base: 'Dublin', stops: [{ id: 'zoo', name: 'Dublin Zoo', kind: 'activity', latitude: 53, longitude: -6 }], notes: 'Animals' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Map$/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /Show all stops/i }));

    expect(screen.getByRole('heading', { name: /All Trip Stops/i })).toBeInTheDocument();
    expect(screen.getByText(/2 places across 2 itinerary days/i)).toBeInTheDocument();
    expect(screen.getByText('Dublin Zoo')).toBeInTheDocument();
  });

  it('offers a mouse-wheel zoom toggle on the map', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Dublin Zoo', dateLabel: 'June 2027', base: 'Dublin', stops: [{ id: 'zoo', name: 'Dublin Zoo', kind: 'activity', latitude: 53, longitude: -6 }], notes: 'Animals' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Map$/i })[0]);

    const toggle = screen.getByRole('checkbox', { name: /Mouse wheel zoom/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  it('shows the family passcode login before loading hosted trip data', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: true, authenticated: false }));
      return Promise.reject(new Error(`Unexpected trip data request before login: ${url}`));
    }));

    render(<App />);

    expect(await screen.findByRole('heading', { name: /Ireland Trip Agent/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Family passcode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unlock Planner/i })).toBeDisabled();
  });

  it('renders research draft review cards and refreshes after applying a draft', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-5', day: 5, title: 'Kilkenny to Cork', dateLabel: 'June 2027', base: 'Cork', stops: [], notes: 'Drive south.' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research') && init?.method === 'POST') {
        return Promise.resolve(Response.json({
          id: 'answer-1',
          question: 'Please add Rock of Cashel to Day 5.',
          answer: 'I prepared a draft change for review.',
          createdAt: '2026-05-11T00:00:00Z',
          sources: [],
          warnings: [],
          drafts: [
            {
              id: 'draft-1',
              kind: 'itinerary',
              title: 'Add Rock of Cashel to Day 5',
              summary: 'Adds Rock of Cashel as a Day 5 stop.',
              createdAt: '2026-05-11T00:00:00Z',
              status: 'draft',
              payload: { dayId: 'day-5', patch: { notes: 'Add Rock of Cashel.' } }
            }
          ]
        }));
      }
      if (url.endsWith('/api/research/drafts/draft-1/apply')) {
        return Promise.resolve(Response.json({
          id: 'draft-1',
          kind: 'itinerary',
          title: 'Add Rock of Cashel to Day 5',
          summary: 'Adds Rock of Cashel as a Day 5 stop.',
          createdAt: '2026-05-11T00:00:00Z',
          status: 'applied',
          payload: { dayId: 'day-5', patch: { notes: 'Add Rock of Cashel.' } }
        }));
      }
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getByRole('button', { name: /Research Agent/i }));
    await userEvent.type(screen.getByPlaceholderText(/Ask about tickets/i), 'Please add Rock of Cashel to Day 5.');
    await userEvent.click(screen.getByRole('button', { name: /Ask with Sources/i }));

    expect(await screen.findByText('Add Rock of Cashel to Day 5')).toBeInTheDocument();
    expect(screen.getByText('Adds Rock of Cashel as a Day 5 stop.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Apply Draft/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/research/drafts/draft-1/apply', expect.objectContaining({ method: 'POST' }));
  });

  it('warns when a draft will replace the full itinerary', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Travel to Dublin', dateLabel: 'June 2027', base: 'In flight', stops: [{ id: 'lex', name: 'LEX', kind: 'airport', latitude: 38, longitude: -84 }], notes: 'Travel' },
        { id: 'day-2', day: 2, title: 'Arrive Dublin', dateLabel: 'June 2027', base: 'Dublin', stops: [{ id: 'dub', name: 'Dublin Airport', kind: 'airport', latitude: 53, longitude: -6 }], notes: 'Arrive' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([
        {
          id: 'answer-12',
          question: 'Change my itinerary to 12 days.',
          answer: 'I prepared a replacement itinerary.',
          createdAt: '2026-05-11T00:00:00Z',
          sources: [],
          warnings: [],
          drafts: [
            {
              id: 'draft-12',
              kind: 'itinerary',
              title: 'Compress trip to 12 days',
              summary: 'Replaces the current itinerary with a 12-day version.',
              createdAt: '2026-05-11T00:00:00Z',
              status: 'draft',
              payload: { mode: 'replace', days: Array.from({ length: 12 }, (_value, index) => ({ id: `day-${index + 1}`, day: index + 1, title: `Day ${index + 1}`, dateLabel: 'June 2027', base: 'Ireland', stops: [], notes: '' })) }
            }
          ]
        }
      ]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getByRole('button', { name: /Research Agent/i }));

    expect(await screen.findByText('Compress trip to 12 days')).toBeInTheDocument();
    expect(screen.getByText(/Full itinerary replacement/i)).toBeInTheDocument();
    expect(screen.getByText(/2 days -> 12 days/i)).toBeInTheDocument();
    expect(screen.getByText(/will replace all itinerary days/i)).toBeInTheDocument();
  });

  it('opens an itinerary agent bubble and sends day context with the prompt', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Travel to Dublin', dateLabel: 'June 2027', base: 'In flight', stops: [{ id: 'lex', name: 'LEX', kind: 'airport', latitude: 38, longitude: -84 }], notes: 'Travel' },
        { id: 'day-3', day: 3, title: 'Dublin highlights', dateLabel: 'June 2027', base: 'Dublin', stops: [{ id: 'zoo', name: 'Dublin Zoo', kind: 'activity', latitude: 53, longitude: -6 }], notes: 'Zoo and city day' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research') && init?.method === 'POST') {
        return Promise.resolve(Response.json({
          id: 'answer-bubble',
          question: 'Add a comment that this is a lighter day.',
          answer: 'I prepared a Day 3 note draft.',
          createdAt: '2026-05-11T00:00:00Z',
          sources: [],
          warnings: [],
          drafts: [
            {
              id: 'draft-bubble',
              kind: 'itinerary',
              title: 'Add Day 3 pacing comment',
              summary: 'Adds a lighter-day comment to Day 3 notes.',
              createdAt: '2026-05-11T00:00:00Z',
              status: 'draft',
              payload: { mode: 'patch', dayId: 'day-3', patch: { notes: 'Zoo and city day. Keep this as a lighter pacing day.' } }
            }
          ]
        }));
      }
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Itinerary$/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /Open itinerary agent/i }));
    await userEvent.selectOptions(screen.getByLabelText(/Agent focus/i), 'day-3');
    await userEvent.type(screen.getByLabelText(/Itinerary agent prompt/i), 'Add a comment that this is a lighter day.');
    await userEvent.click(screen.getByRole('button', { name: /Ask Itinerary Agent/i }));

    expect(await screen.findByText('I prepared a Day 3 note draft.')).toBeInTheDocument();
    expect(screen.getByText('Add Day 3 pacing comment')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/research', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"context"')
    }));
    const researchCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/api/research') && (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse((researchCall?.[1] as RequestInit).body as string).context).toContain('Selected itinerary day: Day 3');
  });

  it('keeps full-itinerary agent context within the API limit', async () => {
    const longItinerary = Array.from({ length: 16 }, (_value, index) => ({
      id: `day-${index + 1}`,
      day: index + 1,
      title: `Ireland day ${index + 1}`,
      dateLabel: 'June 2027',
      base: index === 0 ? 'In flight' : 'Ireland',
      route: `Route details for day ${index + 1}`,
      stops: [
        { id: `stop-${index + 1}-a`, name: `Morning stop ${index + 1}`, kind: 'activity', latitude: 53, longitude: -6 },
        { id: `stop-${index + 1}-b`, name: `Afternoon stop ${index + 1}`, kind: 'activity', latitude: 53, longitude: -6 }
      ],
      notes: `Detailed planning notes for day ${index + 1}. Keep the family pacing realistic, include flexible time, and preserve these notes when adding comments.`
    }));
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json(longItinerary));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research') && init?.method === 'POST') {
        return Promise.resolve(Response.json({
          id: 'answer-long-context',
          question: 'Add a comment to day 1.',
          answer: 'I prepared a draft.',
          createdAt: '2026-05-11T00:00:00Z',
          sources: [],
          warnings: [],
          drafts: []
        }));
      }
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Itinerary$/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /Open itinerary agent/i }));
    await userEvent.type(screen.getByLabelText(/Itinerary agent prompt/i), 'Add a comment to day 1.');
    await userEvent.click(screen.getByRole('button', { name: /Ask Itinerary Agent/i }));

    const researchCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/api/research') && (init as RequestInit | undefined)?.method === 'POST');
    const context = JSON.parse((researchCall?.[1] as RequestInit).body as string).context as string;
    expect(context.length).toBeLessThanOrEqual(4000);
  });

  it('shows an itinerary agent error when the research request fails', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Travel to Dublin', dateLabel: 'June 2027', base: 'In flight', stops: [{ id: 'lex', name: 'LEX', kind: 'airport', latitude: 38, longitude: -84 }], notes: 'Travel' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research') && init?.method === 'POST') {
        return Promise.resolve(Response.json({ error: 'Context is too large' }, { status: 400 }));
      }
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Itinerary$/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /Open itinerary agent/i }));
    await userEvent.type(screen.getByLabelText(/Itinerary agent prompt/i), 'Add a comment to day 1.');
    await userEvent.click(screen.getByRole('button', { name: /Ask Itinerary Agent/i }));

    expect(await screen.findByText(/Context is too large/i)).toBeInTheDocument();
  });
});
