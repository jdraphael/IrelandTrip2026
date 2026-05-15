import { describe, expect, it } from 'vitest';
import { buildSeedData } from '../server/seed';

describe('Ireland trip seed data', () => {
  it('uses the latest transcript decisions as the active trip plan', () => {
    const seed = buildSeedData('D:/Justin/IrelandTrip2026/ChatGPT.txt');

    expect(seed.trip.title).toBe('Ireland Family Trip');
    expect(seed.trip.year).toBe(2027);
    expect(seed.trip.month).toBe('June');
    expect(seed.trip.travelers).toBe(5);
    expect(seed.trip.budgetTarget).toBe(15000);
    expect(seed.itinerary.map((day) => day.base)).toContain('Dingle');
    expect(seed.tasks.some((task) => task.title.includes('passports') && task.dueDate.startsWith('2026-10'))).toBe(true);
  });

  it('seeds the premium checklist dashboard with rich planning metadata', () => {
    const seed = buildSeedData('D:/Justin/IrelandTrip2026/ChatGPT.txt');
    const flights = seed.tasks.find((task) => task.id === 'task-book-flights');
    const categories = new Set(seed.tasks.map((task) => task.displayCategory));

    expect(seed.tasks).toHaveLength(24);
    expect(flights).toMatchObject({
      priority: 'high',
      displayCategory: 'Flights & Travel',
      imageKey: 'flights',
      subtasksTotal: 2,
      actionLabel: 'View Options'
    });
    expect(flights?.aiSuggestion).toContain('Tuesday departures');
    expect(categories).toEqual(new Set([
      'Flights & Travel',
      'Lodging & Stays',
      'Driving in Ireland',
      'Family Prep',
      'Experiences'
    ]));
  });
});
