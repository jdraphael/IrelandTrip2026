import { describe, expect, it } from 'vitest';
import { applyResearchDraft } from '../src/lib/drafts';
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
});
