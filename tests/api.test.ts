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
