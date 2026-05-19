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

  it('renders the luxury Budget dashboard and saves category card edits', async () => {
    const budgetResponse = {
      items: [
        { id: 'budget-flights', category: 'Flights', label: 'LEX to Dublin roundtrip for five', planned: 6000, actual: 4850, status: 'watching' },
        { id: 'budget-lodging', category: 'Lodging', label: 'Hotels, aparthotels, farm stay, airport hotel', planned: 3200, actual: 0, status: 'researching' },
        { id: 'budget-car', category: 'Transportation', label: 'Automatic SUV/7-seater with insurance', planned: 1500, actual: 0, status: 'researching' },
        { id: 'budget-food', category: 'Food', label: 'Restaurants, groceries, snacks', planned: 2000, actual: 350, status: 'researching' },
        { id: 'budget-activities', category: 'Activities', label: 'Zoo, castles, wildlife, cliffs, farm experiences', planned: 1600, actual: 0, status: 'researching' },
        { id: 'budget-buffer', category: 'Buffer', label: 'Souvenirs and surprises', planned: 700, actual: 150, status: 'researching' }
      ],
      summary: { target: 15000, planned: 15000, actual: 5350, remainingPlanned: 0, remainingActual: 9650, plannedPercent: 100, actualPercent: 36 }
    };
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith('https://api.frankfurter.dev/v2/rate/USD/EUR')) return Promise.resolve(Response.json({ date: '2026-05-14', base: 'USD', quote: 'EUR', rate: 0.85378 }));
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/family-members')) return Promise.resolve(Response.json(familyMembersResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([]));
      if (url.endsWith('/api/budget') && init?.method === 'PATCH') {
        return Promise.resolve(Response.json({
          ...budgetResponse,
          items: budgetResponse.items.map((item) => item.id === 'budget-lodging' ? { ...item, planned: 3450 } : item)
        }));
      }
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json(budgetResponse));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getByRole('button', { name: /^Budget$/i }));

    expect(await screen.findByRole('heading', { name: /Ireland Expedition Budget/i })).toBeInTheDocument();
    expect(screen.getAllByText('€15,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('€5,350')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Flights & Transportation/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /AI Budget Intelligence/i })).toBeInTheDocument();
    expect(screen.queryByText(/Target/i)).not.toBeInTheDocument();

    const lodgingCard = screen.getByLabelText(/Budget category Lodging & Stays/i);
    const plannedInput = within(lodgingCard).getByLabelText(/Planned amount/i);
    await userEvent.clear(plannedInput);
    await userEvent.type(plannedInput, '3450');
    await userEvent.click(within(lodgingCard).getByRole('button', { name: /Save Lodging & Stays/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/budget', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify([{ id: 'budget-lodging', planned: 3450 }])
    }));

    await userEvent.click(screen.getByRole('button', { name: /Ask AI About Savings/i }));
    expect(screen.getByText(/Savings analysis opened/i)).toBeInTheDocument();
  });

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

  it('opens a checklist agent bubble, shows reviewable recommendations, and can deny a draft', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith('https://api.frankfurter.dev/v2/rate/USD/EUR')) return Promise.resolve(Response.json({ date: '2026-05-14', base: 'USD', quote: 'EUR', rate: 0.85378 }));
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/family-members')) return Promise.resolve(Response.json(familyMembersResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Travel day', dateLabel: 'June 2027', base: 'In flight', stops: [], notes: 'Go' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json(richTasksResponse));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research') && init?.method === 'POST') {
        return Promise.resolve(Response.json({
          id: 'answer-checklist',
          question: 'Add a packing task for rain jackets.',
          answer: 'I prepared a checklist change for review.',
          createdAt: '2026-05-16T12:00:00Z',
          sources: [],
          warnings: [],
          drafts: [
            {
              id: 'draft-checklist',
              kind: 'task',
              title: 'Add rain jacket packing task',
              summary: 'Adds a family prep task for waterproof jackets.',
              createdAt: '2026-05-16T12:00:00Z',
              status: 'draft',
              payload: { task: { id: 'pack-rain-jackets', title: 'Pack waterproof jackets', status: 'open', dueDate: '2027-05-01', category: 'Packing' } }
            }
          ]
        }));
      }
      if (url.endsWith('/api/research/drafts/draft-checklist/dismiss')) {
        return Promise.resolve(Response.json({
          id: 'draft-checklist',
          kind: 'task',
          title: 'Add rain jacket packing task',
          summary: 'Adds a family prep task for waterproof jackets.',
          createdAt: '2026-05-16T12:00:00Z',
          status: 'dismissed',
          payload: { task: { id: 'pack-rain-jackets', title: 'Pack waterproof jackets', status: 'open', dueDate: '2027-05-01', category: 'Packing' } }
        }));
      }
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /Open checklist agent/i }));
    await userEvent.type(screen.getByLabelText(/Checklist agent prompt/i), 'Add a packing task for rain jackets.');
    await userEvent.click(screen.getByRole('button', { name: /Ask Checklist Agent/i }));

    expect(await screen.findByText('I prepared a checklist change for review.')).toBeInTheDocument();
    expect(screen.getByText('Add rain jacket packing task')).toBeInTheDocument();
    const researchCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/api/research') && (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse((researchCall?.[1] as RequestInit).body as string).context).toContain('Request surface: Checklist module persistent agent bubble');

    await userEvent.click(screen.getByRole('button', { name: /Dismiss Draft/i }));
    expect(fetchMock).toHaveBeenCalledWith('/api/research/drafts/draft-checklist/dismiss', expect.objectContaining({ method: 'POST' }));
  });

  it('uses the task modal agent to create OpenAI-backed itinerary and task field drafts', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith('https://api.frankfurter.dev/v2/rate/USD/EUR')) return Promise.resolve(Response.json({ date: '2026-05-14', base: 'USD', quote: 'EUR', rate: 0.85378 }));
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/family-members')) return Promise.resolve(Response.json(familyMembersResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Travel day', dateLabel: 'June 2027', base: 'In flight', stops: [], notes: 'Go' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json(richTasksResponse));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/tasks/task-book-flights/itinerary-draft') && init?.method === 'POST') {
        return Promise.resolve(Response.json({
          id: 'answer-task-draft',
          question: 'Create itinerary draft from checklist item: Book flights and seats together',
          answer: 'I filled the checklist fields and prepared itinerary notes for approval.',
          createdAt: '2026-05-16T12:00:00Z',
          sources: [],
          warnings: [],
          drafts: [
            {
              id: 'draft-task-fields',
              kind: 'task',
              title: 'Fill flight planning fields',
              summary: 'Adds the missing flight-planning details to the checklist item.',
              createdAt: '2026-05-16T12:00:00Z',
              status: 'draft',
              payload: { task: { id: 'task-book-flights', title: 'Book flights and seats together', status: 'open', dueDate: '2026-09-15', category: 'Flights', decisionSummary: 'Book a one-stop route with five adjacent seats.' } }
            },
            {
              id: 'draft-itinerary-flight',
              kind: 'itinerary',
              title: 'Add flight details to travel day',
              summary: 'Adds the selected flight plan to Day 1.',
              createdAt: '2026-05-16T12:00:00Z',
              status: 'draft',
              payload: { mode: 'patch', dayId: 'day-1', patch: { notes: 'Go. Flight plan: five adjacent seats.' } }
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
    await userEvent.click(screen.getAllByRole('button', { name: /^Checklist$/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /View Options/i }));
    await userEvent.click(await screen.findByRole('button', { name: /Create itinerary draft/i }));

    expect(await screen.findByText('I filled the checklist fields and prepared itinerary notes for approval.')).toBeInTheDocument();
    expect(screen.getByText('Fill flight planning fields')).toBeInTheDocument();
    expect(screen.getByText('Add flight details to travel day')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/tasks/task-book-flights/itinerary-draft', expect.objectContaining({ method: 'POST' }));
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
    const primaryNav = screen.getByLabelText('Primary navigation');
    expect(await within(primaryNav).findByText('1 USD = 0.85 EUR')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Budget/i }));
    expect(within(primaryNav).getByText('1 USD = 0.85 EUR')).toBeInTheDocument();
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
    expect(paymentGroup).toHaveTextContent('VISA');
    expect(screen.getByLabelText(/Mastercard: Backup card/i)).toBeInTheDocument();
    expect(paymentGroup).toHaveTextContent('EUR 60-120');
  });

  it('renders the cinematic itinerary hero, journey cards, route widgets, and derived drive insight', async () => {
    const itinerary = Array.from({ length: 13 }, (_value, index) => {
      const day = index + 1;
      const bases = ['In flight', 'Dublin', 'Dublin', 'Dublin', 'Kilkenny', 'Cork', 'Cork', 'Dingle', 'Dingle', 'Galway', 'Dublin', 'Dublin', 'Travel home'];
      const titles = ['Travel day to Dublin', 'Arrive Dublin', 'Dublin Zoo', 'Book of Kells', 'Drive to Kilkenny', 'Kilkenny to Cork', 'Blarney Castle', 'Drive to Dingle', 'Dingle Sheepdogs', 'Dingle to Galway', 'Galway to Dublin', 'Final Dublin day', 'Fly home'];
      return {
        id: `day-${day}`,
        day,
        title: titles[index],
        dateLabel: `June ${17 + day}, 2027`,
        base: bases[index],
        route: day === 10 ? 'Dingle -> Bunratty -> Galway' : undefined,
        driveTime: day === 10 ? '4.5 hours direct, 6-7 hours with stops' : day > 4 && day < 12 ? '2 hours direct' : undefined,
        distanceMiles: day === 10 ? 150 : day > 4 && day < 12 ? 90 : undefined,
        stops: [{ id: `stop-${day}`, name: `${bases[index]} stop`, kind: day === 1 || day === 13 ? 'airport' : 'activity', latitude: 53, longitude: -6 }],
        notes: `Notes for day ${day}.`
      };
    });
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/family-members')) return Promise.resolve(Response.json(familyMembersResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json(itinerary));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({
        items: [{ id: 'lodging', category: 'Lodging', label: 'Family stays', planned: 2450, actual: 0, status: 'watching' }],
        summary: { target: 7500, planned: 5510, actual: 0, remainingPlanned: 1990, remainingActual: 7500, plannedPercent: 73, actualPercent: 0 }
      }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: richTasksResponse.items, summary: { total: 12, done: 8, open: 4, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    }));

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Itinerary$/i })[0]);

    expect(await screen.findByRole('heading', { name: /Your Ireland Adventure/i })).toBeInTheDocument();
    expect(screen.getByText(/13 unforgettable days across Ireland/i)).toBeInTheDocument();
    expect(screen.getByText(/1,200\+ km/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Weather Along Route/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Drive Intelligence/i })).toBeInTheDocument();
    expect(screen.getByText(/Day 10 is your longest driving day/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /AI Travel Assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Budget Tracker/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Journey Progress/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Route Map/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Travel notes for day 1/i)).not.toBeInTheDocument();
  });

  it('expands itinerary travel notes and saves note changes through the itinerary API', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/family-members')) return Promise.resolve(Response.json(familyMembersResponse));
      if (url.endsWith('/api/itinerary') && init?.method === 'PATCH') {
        return Promise.resolve(Response.json([{ id: 'day-1', day: 1, title: 'Travel to Dublin', dateLabel: 'June 18, 2027', base: 'In flight', stops: [], notes: 'Updated family pacing note.' }]));
      }
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Travel to Dublin', dateLabel: 'June 18, 2027', base: 'In flight', stops: [], notes: 'Original travel note.' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Itinerary$/i })[0]);
    await userEvent.click(await screen.findByRole('button', { name: /Travel Notes/i }));
    const notes = await screen.findByLabelText(/Travel notes for day 1/i);
    await userEvent.clear(notes);
    await userEvent.type(notes, 'Updated family pacing note.');
    await userEvent.click(screen.getByRole('button', { name: /Save Notes/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/itinerary', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify([{ id: 'day-1', notes: 'Updated family pacing note.' }])
    }));
  });

  it('opens the itinerary agent with the right-rail AI suggestion prefilled', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/family-members')) return Promise.resolve(Response.json(familyMembersResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-8', day: 8, title: 'Drive to Dingle', dateLabel: 'June 25, 2027', base: 'Dingle', route: 'Cork -> Kerry -> Dingle', driveTime: '3 hours direct', distanceMiles: 100, stops: [], notes: 'Scenic drive.' }
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
    await userEvent.click(await screen.findByRole('button', { name: /Get Suggestions/i }));

    expect(await screen.findByLabelText(/Itinerary agent prompt/i)).toHaveValue('Suggest kid-friendly lunch stops between Cork and Dingle.');
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

  it('moves the travel conversion tool into the left navigation as a pop-out module', async () => {
    vi.stubGlobal('fetch', stubChecklistApp());

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    const primaryNav = screen.getByLabelText('Primary navigation');
    const conversionTool = await within(primaryNav).findByRole('button', { name: /Travel conversion tool/i });

    expect(screen.queryByRole('button', { name: /Open currency calculator/i })).not.toBeInTheDocument();
    await userEvent.click(conversionTool);

    const dialog = await screen.findByRole('dialog', { name: /USD to EUR/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Travel conversion/i)).toBeInTheDocument();
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

  it('renders the cinematic expedition map with stats, layers, and a stop preview', async () => {
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

    expect(screen.getByRole('heading', { name: /Ireland Expedition Route/i })).toBeInTheDocument();
    expect(screen.getByText(/12 unforgettable days across Ireland/i)).toBeInTheDocument();
    expect(screen.getByText(/5 travelers/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scenic Routes layer/i })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Castles layer/i }));
    expect(screen.getByRole('button', { name: /Castles layer/i })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Dublin Zoo stop preview/i }));
    expect(screen.getByText('Dublin Zoo')).toBeInTheDocument();
    expect(screen.getAllByText(/Family Friendly/i).length).toBeGreaterThan(0);
  });

  it('lets the map save offline routes and send research notes', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/auth/session')) return Promise.resolve(Response.json({ authRequired: false, authenticated: true }));
      if (url.endsWith('/api/trip')) return Promise.resolve(Response.json(tripResponse));
      if (url.endsWith('/api/itinerary')) return Promise.resolve(Response.json([
        { id: 'day-1', day: 1, title: 'Dublin Zoo', dateLabel: 'June 2027', base: 'Dublin', stops: [{ id: 'zoo', name: 'Dublin Zoo', kind: 'activity', latitude: 53, longitude: -6 }], notes: 'Animals' }
      ]));
      if (url.endsWith('/api/budget')) return Promise.resolve(Response.json({ items: [], summary: { target: 15000, planned: 0, actual: 0, remainingPlanned: 15000, remainingActual: 15000, plannedPercent: 0, actualPercent: 0 } }));
      if (url.endsWith('/api/tasks')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, done: 0, open: 0, blocked: 0 } }));
      if (url.endsWith('/api/sources')) return Promise.resolve(Response.json({ items: [], summary: { total: 0, officialCount: 0, warningCount: 0, warnings: [] } }));
      if (url.endsWith('/api/research') && init?.method === 'POST') return Promise.resolve(Response.json({ id: 'answer-1', question: 'Add research notes for Day 1: Dublin Zoo', answer: 'Research draft created.', createdAt: '2026-05-17T00:00:00Z', sources: [], drafts: [], warnings: [] }));
      if (url.endsWith('/api/research')) return Promise.resolve(Response.json([]));
      return Promise.reject(new Error(`Unhandled URL ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getAllByRole('button', { name: /^Map$/i })[0]);

    await userEvent.click(screen.getByRole('button', { name: /Save Offline Route/i }));
    expect(screen.getByRole('button', { name: /Offline Route Saved/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Add Research Notes/i }));
    expect(fetchMock).toHaveBeenCalledWith('/api/research', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('Add research notes for Day 1: Dublin Zoo')
    }));
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

  it('renders the Ireland Research Concierge command center shell', async () => {
    vi.stubGlobal('fetch', stubChecklistApp());

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getByRole('button', { name: /Research Agent/i }));

    expect(await screen.findByRole('heading', { name: /Ireland Research Concierge/i })).toBeInTheDocument();
    expect(screen.getByText(/^Ireland Concierge AI$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ask Ireland Concierge AI/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick Answers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Smart Planning/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deep Expedition Research/i })).toBeInTheDocument();
    expect(screen.getByText(/AI Travel Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Get Inspired/i)).toBeInTheDocument();
    expect(screen.getByText(/Research Inspiration Cards/i)).toBeInTheDocument();
  });

  it('sends quick and deep research modes through the existing research API contract', async () => {
    const baseFetchMock = stubChecklistApp();
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/research') && init?.method === 'POST') {
        const body = JSON.parse(init.body as string);
        return Promise.resolve(Response.json({
          id: `answer-${body.deep ? 'deep' : 'quick'}`,
          question: body.question,
          answer: 'I prepared sourced guidance for your Ireland trip.',
          createdAt: '2026-05-17T00:00:00Z',
          sources: [],
          warnings: [],
          drafts: []
        }));
      }
      return baseFetchMock(url, init);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('Ireland Family Trip');
    await userEvent.click(screen.getByRole('button', { name: /Research Agent/i }));

    const input = await screen.findByLabelText(/Ask Ireland Concierge AI/i);
    fireEvent.change(input, { target: { value: 'Which castles require advance tickets?' } });
    fireEvent.click(screen.getByRole('button', { name: /Ask AI/i }));

    expect(await screen.findAllByText('I prepared sourced guidance for your Ireland trip.')).not.toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /Deep Expedition Research/i }));
    fireEvent.change(input, { target: { value: 'Best scenic drive in Kerry?' } });
    fireEvent.click(screen.getByRole('button', { name: /Ask AI/i }));
    await screen.findByText('Best scenic drive in Kerry?');

    const researchCalls = fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith('/api/research') && (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse((researchCalls[0]?.[1] as RequestInit).body as string)).toMatchObject({
      question: 'Which castles require advance tickets?',
      deep: false
    });
    expect(JSON.parse((researchCalls[1]?.[1] as RequestInit).body as string)).toMatchObject({
      question: 'Best scenic drive in Kerry?',
      deep: true
    });
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
    await userEvent.type(screen.getByLabelText(/Ask Ireland Concierge AI/i), 'Please add Rock of Cashel to Day 5.');
    await userEvent.click(screen.getByRole('button', { name: /Ask AI/i }));

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
