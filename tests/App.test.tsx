import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';

const tripResponse = {
  id: 'ireland-family-trip',
  title: 'Ireland Family Trip',
  month: 'June',
  year: 2027,
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

describe('Ireland trip app', () => {
  it('renders the command center with seeded trip context', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
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
    expect(screen.getByText('June 2027')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Itinerary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Research Agent/i })).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /^Map$/i }));
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
    await userEvent.click(screen.getByRole('button', { name: /^Map$/i }));

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
});
