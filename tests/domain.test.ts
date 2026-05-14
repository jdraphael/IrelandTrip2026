import { describe, expect, it } from 'vitest';
import { applyBudgetDraft, applyResearchDraft, applyTaskDraft } from '../src/lib/drafts';
import { calculateBudgetSummary } from '../src/lib/budget';
import { classifySource, summarizeSources } from '../src/lib/sources';
import { summarizeTasks } from '../src/lib/tasks';
import type { BudgetItem, BookingTask, DayPlan, ResearchDraft, SourceLink } from '../src/types';

describe('budget summary', () => {
  it('calculates planned, actual, and remaining amounts against the trip target', () => {
    const items: BudgetItem[] = [
      { id: 'flights', category: 'Flights', label: 'Family airfare', planned: 6000, actual: 5200, status: 'watching' },
      { id: 'lodging', category: 'Lodging', label: 'Family stays', planned: 3500, actual: 0, status: 'researching' },
      { id: 'car', category: 'Transportation', label: 'Rental car', planned: 1500, actual: 1625, status: 'quoted' }
    ];

    expect(calculateBudgetSummary(items, 15000)).toEqual({
      target: 15000,
      planned: 11000,
      actual: 6825,
      remainingPlanned: 4000,
      remainingActual: 8175,
      plannedPercent: 73,
      actualPercent: 46
    });
  });
});

describe('booking task summary', () => {
  it('counts tasks by status and returns the next dated open task', () => {
    const tasks: BookingTask[] = [
      { id: 'passports', title: 'Renew kids passports', status: 'open', dueDate: '2026-10-01', category: 'Documents' },
      { id: 'flights', title: 'Book flights', status: 'open', dueDate: '2026-09-15', category: 'Flights' },
      { id: 'alerts', title: 'Create fare alerts', status: 'done', dueDate: '2026-08-01', category: 'Flights' }
    ];

    expect(summarizeTasks(tasks)).toEqual({
      total: 3,
      done: 1,
      open: 2,
      blocked: 0,
      nextTask: tasks[1]
    });
  });
});

describe('source classification', () => {
  it('prefers official attraction and government domains, while flagging broad travel sources', () => {
    expect(classifySource('https://www.dublinzoo.ie/tickets/')).toBe('official');
    expect(classifySource('https://www.dfa.ie/passports/')).toBe('government');
    expect(classifySource('https://www.tripadvisor.com/Attraction_Review')).toBe('travel-guide');
    expect(classifySource('https://example.com/random-blog')).toBe('unverified');
  });

  it('summarizes missing, stale, unofficial, and unreachable source risks', () => {
    const sources: SourceLink[] = [
      { id: '1', title: 'Dublin Zoo', url: 'https://www.dublinzoo.ie/', sourceType: 'official', checkedAt: '2026-05-01', status: 'ok' },
      { id: '2', title: 'Forum tip', url: 'https://example.com/tip', sourceType: 'unverified', checkedAt: '2025-01-01', status: 'unreachable' }
    ];

    expect(summarizeSources(sources, new Date('2026-05-10T12:00:00Z'))).toEqual({
      total: 2,
      officialCount: 1,
      warningCount: 3,
      warnings: ['1 source is unofficial or broad travel web', '1 source has not been checked in 180+ days', '1 source is unreachable']
    });
  });
});

describe('research drafts', () => {
  const day = (dayNumber: number): DayPlan => ({
    id: `day-${dayNumber}`,
    day: dayNumber,
    title: dayNumber === 1 ? 'Travel to Dublin' : dayNumber === 12 ? 'Fly home' : `Day ${dayNumber}`,
    base: dayNumber === 1 ? 'In flight' : dayNumber === 12 ? 'Travel home' : 'Ireland',
    dateLabel: 'June 2027',
    stops: [{ id: `stop-${dayNumber}`, name: `Stop ${dayNumber}`, kind: dayNumber === 1 || dayNumber === 12 ? 'airport' : 'activity', latitude: 53, longitude: -6 }],
    notes: `Notes ${dayNumber}`
  });

  it('applies an approved itinerary draft without mutating the original itinerary', () => {
    const original: DayPlan[] = [
      { id: 'day-1', day: 1, title: 'Arrive in Dublin', base: 'Dublin', dateLabel: 'June 2027', stops: [], notes: 'Rest day' }
    ];
    const draft: ResearchDraft = {
      id: 'draft-1',
      kind: 'itinerary',
      title: 'Add Dublin Zoo',
      createdAt: '2026-05-10T12:00:00Z',
      status: 'draft',
      payload: {
        dayId: 'day-1',
        patch: {
          notes: 'Rest day, then Dublin Zoo if everyone has energy',
          stops: [{ id: 'dublin-zoo', name: 'Dublin Zoo', kind: 'activity', latitude: 53.3564, longitude: -6.3053 }]
        }
      }
    };

    const updated = applyResearchDraft(original, draft);

    expect(original[0].stops).toHaveLength(0);
    expect(updated[0].notes).toContain('Dublin Zoo');
    expect(updated[0].stops[0].name).toBe('Dublin Zoo');
  });

  it('adds and updates itinerary stops without removing existing stops', () => {
    const original: DayPlan[] = [
      {
        id: 'day-5',
        day: 5,
        title: 'Kilkenny to Cork',
        base: 'Cork',
        dateLabel: 'June 2027',
        stops: [{ id: 'kilkenny-castle', name: 'Kilkenny Castle', kind: 'activity', latitude: 52.6505, longitude: -7.2492 }],
        notes: 'Drive south.'
      }
    ];
    const draft: ResearchDraft = {
      id: 'draft-rock',
      kind: 'itinerary',
      title: 'Add Rock of Cashel',
      createdAt: '2026-05-10T12:00:00Z',
      status: 'draft',
      payload: {
        dayId: 'day-5',
        patch: {
          notes: 'Drive south with a Rock of Cashel stop.',
          stops: [{ id: 'rock-of-cashel', name: 'Rock of Cashel', kind: 'activity', latitude: 52.5201, longitude: -7.8905 }]
        }
      }
    };

    const updated = applyResearchDraft(original, draft);

    expect(updated[0].stops.map((stop) => stop.id)).toEqual(['kilkenny-castle', 'rock-of-cashel']);
    expect(updated[0].notes).toContain('Rock of Cashel');
  });

  it('applies itinerary payment tags from a day patch draft', () => {
    const original: DayPlan[] = [
      {
        id: 'day-5',
        day: 5,
        title: 'Drive to Kilkenny',
        base: 'Kilkenny',
        dateLabel: 'June 2027',
        stops: [{ id: 'kilkenny-castle', name: 'Kilkenny Castle', kind: 'activity', latitude: 52.6505, longitude: -7.2492 }],
        notes: 'Drive south.',
        paymentTags: [
          { id: 'visa', kind: 'card', label: 'Visa', network: 'Visa', note: 'Primary card' },
          { id: 'cash', kind: 'cash', label: 'EUR 30-80', minCashEur: 30, maxCashEur: 80, note: 'City backup cash' }
        ]
      }
    ];
    const draft: ResearchDraft = {
      id: 'draft-payment-tags',
      kind: 'itinerary',
      title: 'Refresh Kilkenny payment guidance',
      createdAt: '2026-05-10T12:00:00Z',
      status: 'draft',
      payload: {
        dayId: 'day-5',
        patch: {
          paymentTags: [
            { id: 'visa', kind: 'card', label: 'Visa', network: 'Visa', note: 'Primary card for hotels and tickets' },
            { id: 'mastercard', kind: 'card', label: 'Mastercard', network: 'Mastercard', note: 'Backup card' },
            { id: 'cash', kind: 'cash', label: 'EUR 60-120', minCashEur: 60, maxCashEur: 120, note: 'Parking, tips, and smaller vendors' }
          ]
        }
      }
    };

    const updated = applyResearchDraft(original, draft);

    expect(updated[0].paymentTags).toEqual([
      { id: 'visa', kind: 'card', label: 'Visa', network: 'Visa', note: 'Primary card for hotels and tickets' },
      { id: 'mastercard', kind: 'card', label: 'Mastercard', network: 'Mastercard', note: 'Backup card' },
      { id: 'cash', kind: 'cash', label: 'EUR 60-120', minCashEur: 60, maxCashEur: 120, note: 'Parking, tips, and smaller vendors' }
    ]);
    expect(original[0].paymentTags?.map((tag) => tag.label)).toEqual(['Visa', 'EUR 30-80']);
  });

  it('applies budget add and update drafts by id', () => {
    const original: BudgetItem[] = [
      { id: 'rental-car', category: 'Transportation', label: 'Rental car', planned: 1500, actual: 0, status: 'watching' }
    ];
    const updateDraft: ResearchDraft = {
      id: 'draft-car',
      kind: 'budget',
      title: 'Update rental car estimate',
      createdAt: '2026-05-10T12:00:00Z',
      status: 'draft',
      payload: {
        item: { id: 'rental-car', category: 'Transportation', label: 'Rental car', planned: 1850, actual: 0, status: 'quoted', notes: 'Includes automatic transmission.' }
      }
    };
    const addDraft: ResearchDraft = {
      id: 'draft-tickets',
      kind: 'budget',
      title: 'Add castle tickets',
      createdAt: '2026-05-10T12:00:00Z',
      status: 'draft',
      payload: {
        item: { id: 'rock-of-cashel-tickets', category: 'Attractions', label: 'Rock of Cashel tickets', planned: 80, actual: 0, status: 'researching' }
      }
    };

    expect(applyBudgetDraft(original, updateDraft)[0]).toMatchObject({ planned: 1850, status: 'quoted' });
    expect(applyBudgetDraft(original, addDraft)).toHaveLength(2);
  });

  it('applies checklist task add and update drafts by id', () => {
    const original: BookingTask[] = [
      { id: 'passports', title: 'Check passport expiration dates', status: 'open', dueDate: '2026-08-01', category: 'Documents' }
    ];
    const updateDraft: ResearchDraft = {
      id: 'draft-passports',
      kind: 'task',
      title: 'Update passport task',
      createdAt: '2026-05-10T12:00:00Z',
      status: 'draft',
      payload: {
        task: { id: 'passports', title: 'Renew kids passports if needed', status: 'open', dueDate: '2026-07-15', category: 'Documents', notes: 'Leave time before booking flights.' }
      }
    };
    const addDraft: ResearchDraft = {
      id: 'draft-car-task',
      kind: 'task',
      title: 'Add car booking task',
      createdAt: '2026-05-10T12:00:00Z',
      status: 'draft',
      payload: {
        task: { id: 'reserve-rental-car', title: 'Reserve automatic rental car', status: 'open', dueDate: '2026-10-01', category: 'Transportation' }
      }
    };

    expect(applyTaskDraft(original, updateDraft)[0]).toMatchObject({ title: 'Renew kids passports if needed', dueDate: '2026-07-15' });
    expect(applyTaskDraft(original, addDraft).map((task) => task.id)).toEqual(['passports', 'reserve-rental-car']);
  });

  it('rejects invalid or missing draft targets without partial changes', () => {
    const itinerary: DayPlan[] = [
      { id: 'day-1', day: 1, title: 'Arrive', base: 'Dublin', dateLabel: 'June 2027', stops: [], notes: '' }
    ];
    const missingDayDraft: ResearchDraft = {
      id: 'draft-missing',
      kind: 'itinerary',
      title: 'Missing day',
      createdAt: '2026-05-10T12:00:00Z',
      status: 'draft',
      payload: { dayId: 'day-99', patch: { notes: 'Nope' } }
    };
    const badBudgetDraft: ResearchDraft = {
      id: 'draft-bad-budget',
      kind: 'budget',
      title: 'Bad budget',
      createdAt: '2026-05-10T12:00:00Z',
      status: 'draft',
      payload: { item: { id: 'bad' } }
    };

    expect(() => applyResearchDraft(itinerary, missingDayDraft)).toThrow('Draft target day was not found');
    expect(() => applyBudgetDraft([], badBudgetDraft)).toThrow('Invalid budget draft payload');
  });

  it('replaces a 16-day itinerary with a valid 12-day replacement draft', () => {
    const original = Array.from({ length: 16 }, (_value, index) => day(index + 1));
    const draft: ResearchDraft = {
      id: 'draft-replace-12',
      kind: 'itinerary',
      title: 'Compress trip to 12 days',
      summary: 'Replaces the current itinerary with a shorter 12-day version.',
      createdAt: '2026-05-11T00:00:00Z',
      status: 'draft',
      payload: {
        mode: 'replace',
        days: Array.from({ length: 12 }, (_value, index) => day(index + 1)),
        removedDayIds: ['day-4', 'day-8', 'day-13', 'day-14']
      }
    };

    const updated = applyResearchDraft(original, draft);

    expect(updated).toHaveLength(12);
    expect(updated.map((item) => item.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(updated[0].title).toBe('Travel to Dublin');
    expect(updated[11].title).toBe('Fly home');
    expect(original).toHaveLength(16);
  });

  it('preserves payment tags on valid replacement itinerary drafts', () => {
    const original = Array.from({ length: 16 }, (_value, index) => day(index + 1));
    const replacementDays = Array.from({ length: 12 }, (_value, index) => ({
      ...day(index + 1),
      paymentTags: [
        { id: 'visa', kind: 'card' as const, label: 'Visa', network: 'Visa' as const, note: 'Primary card' },
        { id: 'mastercard', kind: 'card' as const, label: 'Mastercard', network: 'Mastercard' as const, note: 'Backup card' },
        { id: 'cash', kind: 'cash' as const, label: 'EUR 60-120', minCashEur: 60, maxCashEur: 120, note: 'Daily cash range' }
      ]
    }));
    const draft: ResearchDraft = {
      id: 'draft-replace-with-payments',
      kind: 'itinerary',
      title: 'Compress trip with payment guidance',
      createdAt: '2026-05-11T00:00:00Z',
      status: 'draft',
      payload: {
        mode: 'replace',
        days: replacementDays,
        removedDayIds: ['day-4', 'day-8', 'day-13', 'day-14']
      }
    };

    const updated = applyResearchDraft(original, draft);

    expect(updated).toHaveLength(12);
    expect(updated[4].paymentTags?.map((tag) => tag.label)).toEqual(['Visa', 'Mastercard', 'EUR 60-120']);
  });

  it('rejects invalid replacement drafts without partial changes', () => {
    const original = Array.from({ length: 16 }, (_value, index) => day(index + 1));
    const draft: ResearchDraft = {
      id: 'draft-bad-replace',
      kind: 'itinerary',
      title: 'Bad replacement',
      createdAt: '2026-05-11T00:00:00Z',
      status: 'draft',
      payload: {
        mode: 'replace',
        days: [day(1), { ...day(3), id: 'day-3' }]
      }
    };

    expect(() => applyResearchDraft(original, draft)).toThrow('Replacement itinerary days must be sequential');
    expect(original).toHaveLength(16);
  });
});
