import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../server/app';
import { createTestDatabase } from '../server/db';

const openAiMock = vi.hoisted(() => ({
  responsesCreate: vi.fn()
}));

vi.mock('openai', () => ({
  default: vi.fn(function OpenAI() {
    return {
      responses: {
        create: openAiMock.responsesCreate
      }
    };
  })
}));

describe('trip agent API', () => {
  beforeEach(() => {
    openAiMock.responsesCreate.mockReset();
  });

  const day = (dayNumber: number) => ({
    id: `day-${dayNumber}`,
    day: dayNumber,
    title: dayNumber === 1 ? 'Travel to Dublin' : dayNumber === 12 ? 'Fly home' : `Day ${dayNumber}`,
    dateLabel: 'June 2027',
    base: dayNumber === 1 ? 'In flight' : dayNumber === 12 ? 'Travel home' : 'Ireland',
    stops: [{ id: `stop-${dayNumber}`, name: `Stop ${dayNumber}`, kind: dayNumber === 1 || dayNumber === 12 ? 'airport' : 'activity', latitude: 53, longitude: -6 }],
    notes: `Notes ${dayNumber}`
  });

  it('returns seeded trip, itinerary, budget, and task data', async () => {
    const db = createTestDatabase();
    const app = createApp({ db });

    const trip = await request(app).get('/api/trip').expect(200);
    const itinerary = await request(app).get('/api/itinerary').expect(200);
    const budget = await request(app).get('/api/budget').expect(200);
    const tasks = await request(app).get('/api/tasks').expect(200);

    expect(trip.body.year).toBe(2027);
    expect(itinerary.body.length).toBeGreaterThan(10);
    expect(budget.body.summary.target).toBe(15000);
    expect(tasks.body.summary.open).toBeGreaterThan(0);
  });

  it('returns a clear research configuration message when no OpenAI key is configured', async () => {
    const db = createTestDatabase();
    const app = createApp({ db, openAiApiKey: '' });

    const response = await request(app)
      .post('/api/research')
      .send({ question: 'Which Dublin Zoo tickets should we buy?' })
      .expect(200);

    expect(response.body.answer).toContain('OPENAI_API_KEY');
    expect(response.body.sources).toEqual([]);
    expect(response.body.drafts).toEqual([]);
  });

  it('creates and applies an itinerary draft from mocked research output', async () => {
    openAiMock.responsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        answer: 'I found the official Rock of Cashel page and prepared a reviewed itinerary change.',
        warnings: [],
        drafts: [
          {
            kind: 'itinerary',
            title: 'Add Rock of Cashel to Day 5',
            summary: 'Adds Rock of Cashel as a stop on Day 5.',
            sourceUrls: ['https://heritageireland.ie/places-to-visit/rock-of-cashel/'],
            payload: {
              dayId: 'day-5',
              patch: {
                notes: 'Drive south with a Rock of Cashel stop.',
                stops: [
                  { id: 'rock-of-cashel', name: 'Rock of Cashel', kind: 'activity', latitude: 52.5201, longitude: -7.8905 }
                ]
              }
            }
          }
        ]
      }),
      output: [
        {
          content: [
            {
              annotations: [
                { url: 'https://heritageireland.ie/places-to-visit/rock-of-cashel/', title: 'Rock of Cashel' }
              ]
            }
          ]
        }
      ]
    });
    const db = createTestDatabase();
    const app = createApp({ db, openAiApiKey: 'test-key' });

    const research = await request(app)
      .post('/api/research')
      .send({ question: 'Please add Rock of Cashel to Day 5.' })
      .expect(200);

    expect(research.body.drafts).toHaveLength(1);
    expect(research.body.drafts[0]).toMatchObject({ kind: 'itinerary', title: 'Add Rock of Cashel to Day 5', status: 'draft' });

    await request(app).post(`/api/research/drafts/${research.body.drafts[0].id}/apply`).expect(200);
    const itinerary = await request(app).get('/api/itinerary').expect(200);
    const day5 = itinerary.body.find((day: { id: string }) => day.id === 'day-5');

    expect(day5.stops.some((stop: { id: string }) => stop.id === 'rock-of-cashel')).toBe(true);
  });

  it('creates and applies budget and checklist drafts from mocked research output', async () => {
    openAiMock.responsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        answer: 'I prepared a budget estimate and a booking checklist task.',
        warnings: [],
        drafts: [
          {
            kind: 'budget',
            title: 'Update rental car estimate',
            summary: 'Raises the rental car planned estimate.',
            payload: {
              item: { id: 'rental-car', category: 'Transportation', label: 'Rental car', planned: 1850, actual: 0, status: 'quoted' }
            }
          },
          {
            kind: 'task',
            title: 'Add rental car task',
            summary: 'Adds a task to reserve the rental car.',
            payload: {
              task: { id: 'reserve-rental-car', title: 'Reserve automatic rental car', status: 'open', dueDate: '2026-10-01', category: 'Transportation' }
            }
          }
        ]
      }),
      output: []
    });
    const db = createTestDatabase();
    const app = createApp({ db, openAiApiKey: 'test-key' });

    const research = await request(app)
      .post('/api/research')
      .send({ question: 'Update the rental car budget and add a checklist task.' })
      .expect(200);

    for (const draft of research.body.drafts) {
      await request(app).post(`/api/research/drafts/${draft.id}/apply`).expect(200);
    }
    const budget = await request(app).get('/api/budget').expect(200);
    const tasks = await request(app).get('/api/tasks').expect(200);

    expect(budget.body.items.find((item: { id: string }) => item.id === 'rental-car')).toMatchObject({ planned: 1850, status: 'quoted' });
    expect(tasks.body.items.some((task: { id: string }) => task.id === 'reserve-rental-car')).toBe(true);
  });

  it('keeps a malformed research JSON answer but drops drafts with a warning', async () => {
    openAiMock.responsesCreate.mockResolvedValue({ output_text: 'This is not JSON.', output: [] });
    const db = createTestDatabase();
    const app = createApp({ db, openAiApiKey: 'test-key' });

    const response = await request(app)
      .post('/api/research')
      .send({ question: 'Please update Day 5.' })
      .expect(200);

    expect(response.body.answer).toBe('This is not JSON.');
    expect(response.body.drafts).toEqual([]);
    expect(response.body.warnings.some((warning: string) => warning.includes('structured draft'))).toBe(true);
  });

  it('creates and applies a full replacement itinerary draft from structured output', async () => {
    openAiMock.responsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        answer: 'I prepared a 12-day replacement itinerary for review.',
        warnings: [],
        drafts: [
          {
            kind: 'itinerary',
            title: 'Compress trip to 12 days',
            summary: 'Replaces the current 16-day itinerary with 12 days.',
            payload: {
              mode: 'replace',
              days: Array.from({ length: 12 }, (_value, index) => day(index + 1)),
              removedDayIds: ['day-4', 'day-8', 'day-13', 'day-14']
            }
          }
        ]
      }),
      output: []
    });
    const db = createTestDatabase();
    const app = createApp({ db, openAiApiKey: 'test-key' });

    const research = await request(app)
      .post('/api/research')
      .send({ question: 'Change my itinerary from 16 days down to 12 days. Day 1 is travel and the last day is travel.' })
      .expect(200);

    expect(openAiMock.responsesCreate).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.objectContaining({
        format: expect.objectContaining({ type: 'json_schema' })
      })
    }));
    expect(research.body.drafts[0]).toMatchObject({ kind: 'itinerary', title: 'Compress trip to 12 days', status: 'draft' });
    expect(research.body.drafts[0].payload.days).toHaveLength(12);

    await request(app).post(`/api/research/drafts/${research.body.drafts[0].id}/apply`).expect(200);
    const itinerary = await request(app).get('/api/itinerary').expect(200);

    expect(itinerary.body).toHaveLength(12);
    expect(itinerary.body[0].title).toBe('Travel to Dublin');
    expect(itinerary.body[11].title).toBe('Fly home');
  });

  it('extracts a JSON draft object when model output includes leading prose', async () => {
    openAiMock.responsesCreate.mockResolvedValue({
      output_text: `Here is the draft:\n${JSON.stringify({
        answer: 'I prepared a 12-day replacement itinerary.',
        warnings: [],
        drafts: [
          {
            kind: 'itinerary',
            title: 'Compress trip to 12 days',
            summary: 'Replaces the itinerary.',
            payload: { mode: 'replace', days: Array.from({ length: 12 }, (_value, index) => day(index + 1)) }
          }
        ]
      })}`,
      output: []
    });
    const db = createTestDatabase();
    const app = createApp({ db, openAiApiKey: 'test-key' });

    const response = await request(app)
      .post('/api/research')
      .send({ question: 'Please shorten this to 12 days.' })
      .expect(200);

    expect(response.body.drafts).toHaveLength(1);
    expect(response.body.warnings.some((warning: string) => warning.includes('structured draft'))).toBe(false);
  });

  it('requires family passcode auth when auth is enabled', async () => {
    const db = createTestDatabase();
    const app = createApp({ db, familyPasscode: 'ireland-2027', sessionSecret: 'test-secret' });

    await request(app).get('/api/trip').expect(401);

    await request(app)
      .post('/api/auth/login')
      .send({ passcode: 'wrong-passcode' })
      .expect(401);

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ passcode: 'ireland-2027' })
      .expect(200);

    const session = await agent.get('/api/auth/session').expect(200);
    expect(session.body.authenticated).toBe(true);

    const trip = await agent.get('/api/trip').expect(200);
    expect(trip.body.title).toBe('Ireland Family Trip');
  });

  it('can log out an authenticated family session', async () => {
    const db = createTestDatabase();
    const app = createApp({ db, familyPasscode: 'ireland-2027', sessionSecret: 'test-secret' });
    const agent = request.agent(app);

    await agent.post('/api/auth/login').send({ passcode: 'ireland-2027' }).expect(200);
    await agent.post('/api/auth/logout').expect(200);
    const session = await agent.get('/api/auth/session').expect(200);

    expect(session.body.authenticated).toBe(false);
    await agent.get('/api/trip').expect(401);
  });
});
