import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../server/app';
import { createTestDatabase } from '../server/db';

describe('trip agent API', () => {
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
});
