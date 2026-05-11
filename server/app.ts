import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { calculateBudgetSummary } from '../src/lib/budget';
import { summarizeTasks } from '../src/lib/tasks';
import { applyResearchDraft } from '../src/lib/drafts';
import { summarizeSources } from '../src/lib/sources';
import { answerResearchQuestion, applyDraftToDatabase } from './research';
import { checkSource } from './sourceCheck';
import type { TripDatabase } from './db';

interface CreateAppOptions {
  db: TripDatabase;
  openAiApiKey?: string;
}

const patchTripSchema = z.record(z.string(), z.unknown());
const researchSchema = z.object({ question: z.string().min(3), deep: z.boolean().optional() });
const sourceCheckSchema = z.object({ url: z.string().url(), title: z.string().optional() });

export function createApp({ db, openAiApiKey = process.env.OPENAI_API_KEY }: CreateAppOptions) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/trip', (_request, response) => {
    response.json(db.getTrip());
  });

  app.patch('/api/trip', (request, response) => {
    const patch = patchTripSchema.parse(request.body);
    const trip = db.saveTrip({ ...db.getTrip(), ...patch, updatedAt: new Date().toISOString() });
    response.json(trip);
  });

  app.get('/api/itinerary', (_request, response) => {
    response.json(db.getItinerary());
  });

  app.post('/api/itinerary', (request, response) => {
    const itinerary = db.saveItinerary(request.body);
    response.json(itinerary);
  });

  app.patch('/api/itinerary', (request, response) => {
    const updates = Array.isArray(request.body) ? request.body : [];
    const current = db.getItinerary();
    const itinerary = db.saveItinerary(
      current.map((day) => ({ ...day, ...(updates.find((item) => item.id === day.id) || {}) }))
    );
    response.json(itinerary);
  });

  app.post('/api/itinerary/generate', (request, response) => {
    const dayId = typeof request.body?.dayId === 'string' ? request.body.dayId : 'day-3';
    const draft = {
      id: `draft-${Date.now()}`,
      kind: 'itinerary' as const,
      title: 'Generated itinerary adjustment',
      createdAt: new Date().toISOString(),
      status: 'draft' as const,
      payload: {
        dayId,
        patch: {
          notes: 'Draft generated from the planning assistant. Review sources before applying.'
        }
      }
    };
    db.saveDrafts([draft, ...db.getDrafts()]);
    response.json(draft);
  });

  app.get('/api/budget', (_request, response) => {
    const items = db.getBudget();
    response.json({ items, summary: calculateBudgetSummary(items, db.getTrip().budgetTarget) });
  });

  app.post('/api/budget', (request, response) => {
    const items = db.saveBudget(request.body);
    response.json({ items, summary: calculateBudgetSummary(items, db.getTrip().budgetTarget) });
  });

  app.patch('/api/budget', (request, response) => {
    const updates = Array.isArray(request.body) ? request.body : [request.body];
    const items = db.saveBudget(db.getBudget().map((item) => ({ ...item, ...(updates.find((update) => update.id === item.id) || {}) })));
    response.json({ items, summary: calculateBudgetSummary(items, db.getTrip().budgetTarget) });
  });

  app.get('/api/tasks', (_request, response) => {
    const items = db.getTasks();
    response.json({ items, summary: summarizeTasks(items) });
  });

  app.post('/api/tasks', (request, response) => {
    const items = db.saveTasks(request.body);
    response.json({ items, summary: summarizeTasks(items) });
  });

  app.patch('/api/tasks', (request, response) => {
    const updates = Array.isArray(request.body) ? request.body : [request.body];
    const items = db.saveTasks(db.getTasks().map((task) => ({ ...task, ...(updates.find((update) => update.id === task.id) || {}) })));
    response.json({ items, summary: summarizeTasks(items) });
  });

  app.get('/api/sources', (_request, response) => {
    const sources = db.getSources();
    response.json({ items: sources, summary: summarizeSources(sources) });
  });

  app.post('/api/sources/check', async (request, response, next) => {
    try {
      const input = sourceCheckSchema.parse(request.body);
      const checked = await checkSource(input.url, input.title);
      db.saveSources([checked, ...db.getSources().filter((source) => source.url !== checked.url)]);
      response.json(checked);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/research', async (request, response, next) => {
    try {
      const input = researchSchema.parse(request.body);
      response.json(await answerResearchQuestion({ ...input, apiKey: openAiApiKey, db }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/research', (_request, response) => {
    response.json(db.getResearchAnswers());
  });

  app.post('/api/research/drafts/:id/apply', (request, response) => {
    const applied = applyDraftToDatabase(db, request.params.id);
    if (!applied) {
      response.status(404).json({ error: 'Draft not found' });
      return;
    }

    if (applied.kind === 'itinerary') {
      db.saveItinerary(applyResearchDraft(db.getItinerary(), applied));
    }
    response.json(applied);
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    response.status(400).json({ error: message });
  });

  return app;
}
