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
});
