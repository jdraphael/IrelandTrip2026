import { describe, expect, it } from 'vitest';
import { buildSeedData } from '../server/seed';
import { createTestDatabase } from '../server/db';
import { buildTripContext } from '../server/ai/buildTripContext';
import { assembleResearchPrompt } from '../server/ai/promptAssembler';

describe('AI trip context assembly', () => {
  it('builds a structured trip context with family ages, lodging, transport, destinations, budget, and memory', async () => {
    const seed = buildSeedData();
    seed.familyMembers = seed.familyMembers.map((member) => {
      if (member.id === 'lyla') return { ...member, age: 12 };
      if (member.id === 'grace') return { ...member, age: 10 };
      if (member.id === 'everly') return { ...member, age: 9 };
      return member;
    });
    const db = createTestDatabase(seed);
    await db.saveResearchAnswers([
      {
        id: 'answer-previous-lodging',
        question: 'Which stays are best for Galway?',
        answer: 'The Connacht Hotel is useful because the pool and family room setup fit the trip.',
        createdAt: '2026-05-20T12:00:00.000Z',
        sources: [],
        drafts: [],
        warnings: []
      }
    ]);

    const context = await buildTripContext({
      db,
      question: 'Are our lodging plans realistic for a family of five?'
    });

    expect(context.family.ages).toEqual([12, 10, 9]);
    expect(context.family.travelers).toHaveLength(5);
    expect(context.lodging.map((stay) => stay.name)).toContain('Staycity Aparthotels Dublin Castle');
    expect(context.transportation.some((segment) => segment.route?.includes('Dublin -> Kildare'))).toBe(true);
    expect(context.destinations.map((destination) => destination.name)).toEqual(expect.arrayContaining(['Dublin', 'Kilkenny', 'Cork', 'Dingle', 'Galway']));
    expect(context.budget.items.some((item) => item.id === 'budget-lodging')).toBe(true);
    expect(context.savedResearch.some((item) => item.text.includes('The Connacht Hotel'))).toBe(true);
    expect(context.contextUsage.badges).toEqual(expect.arrayContaining(['Using family profile data', 'Using itinerary + lodging context']));
  });

  it('assembles a prompt that prevents missing-context answers for lodging questions', async () => {
    const seed = buildSeedData();
    seed.familyMembers = seed.familyMembers.map((member) => {
      if (member.id === 'lyla') return { ...member, age: 12 };
      if (member.id === 'grace') return { ...member, age: 10 };
      if (member.id === 'everly') return { ...member, age: 9 };
      return member;
    });
    const db = createTestDatabase(seed);
    const tripContext = await buildTripContext({
      db,
      question: 'Do the Dublin and Galway hotels fit our kids?'
    });

    const prompt = assembleResearchPrompt({
      question: 'Do the Dublin and Galway hotels fit our kids?',
      tripContext,
      interfaceContext: 'Request surface: Research concierge.'
    });

    expect(prompt).toContain('Active trip ID: ireland-family-trip');
    expect(prompt).toContain('Children ages: 12, 10, 9');
    expect(prompt).toContain('Staycity Aparthotels Dublin Castle');
    expect(prompt).toContain('The Connacht Hotel');
    expect(prompt).toContain('Never say you do not have access to family profiles');
    expect(prompt).not.toContain('Current itinerary JSON');
  });
});
