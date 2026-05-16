import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../server/app';
import { createTestDatabase } from '../server/db';

const openAiMock = vi.hoisted(() => ({
  responsesCreate: vi.fn()
}));
const blobMock = vi.hoisted(() => ({
  put: vi.fn()
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

vi.mock('@vercel/blob', () => ({
  put: blobMock.put
}));

describe('trip agent API', () => {
  beforeEach(() => {
    openAiMock.responsesCreate.mockReset();
    blobMock.put.mockReset();
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
    const familyMembers = await request(app).get('/api/family-members').expect(200);

    expect(trip.body.year).toBe(2027);
    expect(trip.body).toMatchObject({ startDate: '2027-06-18', endDate: '2027-06-30' });
    expect(familyMembers.body.map((member: { name: string }) => member.name)).toEqual(['Justin', 'Krissy', 'Lyla', 'Grace', 'Everly']);
    expect(itinerary.body.length).toBeGreaterThan(10);
    expect(budget.body.summary.target).toBe(15000);
    expect(tasks.body.summary.open).toBeGreaterThan(0);
  });

  it('saves editable family travelers', async () => {
    const db = createTestDatabase();
    const app = createApp({ db });

    await request(app)
      .patch('/api/family-members')
      .send([
        { id: 'justin', name: 'Justin Raphael', role: 'parent', avatarKey: 'dad', taskColor: '#0B5D3B' },
        { id: 'krissy', name: 'Krissy', role: 'parent', avatarKey: 'mom', taskColor: '#5F8B4C', age: 39 }
      ])
      .expect(200);

    const familyMembers = await request(app).get('/api/family-members').expect(200);
    expect(familyMembers.body).toHaveLength(2);
    expect(familyMembers.body[0]).toMatchObject({ id: 'justin', name: 'Justin Raphael', role: 'parent' });
    expect(familyMembers.body[1]).toMatchObject({ id: 'krissy', age: 39 });
  });

  it('saves rich checklist task detail fields', async () => {
    const db = createTestDatabase();
    const app = createApp({ db });

    await request(app)
      .patch('/api/tasks')
      .send([{
        id: 'task-book-flights',
        decisionSummary: 'Target Delta or Aer Lingus main cabin with all five seats together.',
        detailedNotes: 'Check seat maps before payment and avoid basic economy.',
        budgetEstimate: 6200,
        planningFields: {
          preferredAirlines: 'Delta, Aer Lingus',
          seatingPriority: 'All five seats together',
          timingWindow: 'Depart June 18, return June 30'
        },
        detailSubtasks: [
          { id: 'compare-routes', label: 'Compare one-stop routes from LEX', done: true },
          { id: 'verify-seats', label: 'Verify seat map before checkout', done: false }
        ],
        detailLinks: [{ id: 'delta', label: 'Delta search', url: 'https://www.delta.com/' }],
        attachments: [{
          id: 'fare-sheet',
          name: 'fare-watch.pdf',
          url: 'https://blob.vercel-storage.com/fare-watch.pdf',
          contentType: 'application/pdf',
          size: 48123,
          uploadedAt: '2026-05-16T13:00:00.000Z',
          note: 'Initial fare comparison'
        }]
      }])
      .expect(200);

    const tasks = await request(app).get('/api/tasks').expect(200);
    expect(tasks.body.items.find((task: { id: string }) => task.id === 'task-book-flights')).toMatchObject({
      decisionSummary: 'Target Delta or Aer Lingus main cabin with all five seats together.',
      budgetEstimate: 6200,
      planningFields: { seatingPriority: 'All five seats together' },
      attachments: [{ name: 'fare-watch.pdf', note: 'Initial fare comparison' }]
    });
  });

  it('uploads checklist documents to Blob and returns task attachment metadata', async () => {
    blobMock.put.mockResolvedValue({ url: 'https://blob.vercel-storage.com/checklist/fare-watch.pdf' });
    const db = createTestDatabase();
    const app = createApp({ db });

    const response = await request(app)
      .post('/api/uploads')
      .send({
        fileName: 'fare-watch.pdf',
        contentType: 'application/pdf',
        dataBase64: Buffer.from('pdf bytes').toString('base64'),
        note: 'Fare comparison'
      })
      .expect(200);

    expect(blobMock.put).toHaveBeenCalledWith(
      expect.stringMatching(/^checklist-documents\/.+-fare-watch\.pdf$/),
      expect.any(Buffer),
      expect.objectContaining({ access: 'public', contentType: 'application/pdf' })
    );
    expect(response.body).toMatchObject({
      name: 'fare-watch.pdf',
      url: 'https://blob.vercel-storage.com/checklist/fare-watch.pdf',
      contentType: 'application/pdf',
      size: 9,
      note: 'Fare comparison'
    });
  });

  it('creates a reviewable itinerary draft from task details', async () => {
    const db = createTestDatabase();
    openAiMock.responsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        answer: 'I filled the checklist planning fields and prepared an itinerary note for review.',
        warnings: [],
        drafts: [
          {
            kind: 'task',
            title: 'Fill flight checklist details',
            summary: 'Adds the missing planning fields from the flight notes.',
            payload: {
              task: {
                id: 'task-book-flights',
                title: 'Book flights and seats together',
                status: 'open',
                dueDate: '2026-09-15',
                category: 'Flights',
                decisionSummary: 'Target a one-stop itinerary with all five seats together.',
                detailedNotes: 'Confirm fare class, seat map, and baggage rules before purchase.',
                planningFields: {
                  'Preferred airlines': 'Delta or Aer Lingus',
                  'Seating priority': 'Five adjacent main-cabin seats',
                  'Timing window': 'Depart June 18 and return June 30'
                }
              }
            }
          },
          {
            kind: 'itinerary',
            title: 'Add flight details to travel days',
            summary: 'Adds flight planning notes to the itinerary once approved.',
            payload: {
              mode: 'patch',
              dayId: 'day-1',
              patch: {
                notes: 'Travel day. Flight plan: one-stop itinerary with all five seats together.'
              }
            }
          }
        ]
      })
    });
    const app = createApp({ db, openAiApiKey: 'test-key' });

    const response = await request(app)
      .post('/api/tasks/task-book-flights/itinerary-draft')
      .send({ summary: 'Add confirmed flight booking notes to Day 1 and the return day.' })
      .expect(200);

    expect(response.body).toMatchObject({
      answer: 'I filled the checklist planning fields and prepared an itinerary note for review.',
      drafts: [
        {
          kind: 'task',
          title: 'Fill flight checklist details',
          status: 'draft',
          payload: {
            task: expect.objectContaining({
              id: 'task-book-flights',
              decisionSummary: 'Target a one-stop itinerary with all five seats together.'
            })
          }
        },
        {
          kind: 'itinerary',
          title: 'Add flight details to travel days',
          status: 'draft',
          payload: {
            mode: 'patch',
            dayId: 'day-1'
          }
        }
      ]
    });
    expect(openAiMock.responsesCreate).toHaveBeenCalled();

    const research = await request(app).get('/api/research').expect(200);
    expect(research.body[0].drafts).toHaveLength(2);
  });

  it('dismisses a draft without applying its checklist mutation', async () => {
    const db = createTestDatabase();
    const app = createApp({ db, openAiApiKey: 'test-key' });

    openAiMock.responsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        answer: 'I prepared a removal for review.',
        warnings: [],
        drafts: [
          {
            kind: 'task',
            title: 'Remove flight task',
            summary: 'Removes the flight task from the checklist.',
            payload: { mode: 'remove', taskId: 'task-book-flights' }
          }
        ]
      })
    });

    const research = await request(app)
      .post('/api/research')
      .send({ question: 'Remove the flight task.' })
      .expect(200);

    const dismissed = await request(app)
      .post(`/api/research/drafts/${research.body.drafts[0].id}/dismiss`)
      .expect(200);

    expect(dismissed.body).toMatchObject({ status: 'dismissed', title: 'Remove flight task' });
    const tasks = await request(app).get('/api/tasks').expect(200);
    expect(tasks.body.items.some((task: { id: string }) => task.id === 'task-book-flights')).toBe(true);
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

  it('instructs the research agent to refresh itinerary payment tags', async () => {
    openAiMock.responsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        answer: 'I prepared a payment-aware itinerary update.',
        warnings: [],
        drafts: []
      }),
      output: []
    });
    const db = createTestDatabase();
    const app = createApp({ db, openAiApiKey: 'test-key' });

    await request(app)
      .post('/api/research')
      .send({ question: 'Add a rural farm stop to Day 10.' })
      .expect(200);

    const prompt = openAiMock.responsesCreate.mock.calls[0][0].input as string;
    expect(prompt).toContain('paymentTags');
    expect(prompt).toContain('daily EUR ranges');
    expect(prompt).toContain('Visa');
    expect(prompt).toContain('Mastercard');
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
