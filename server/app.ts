import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { z } from 'zod';
import { calculateBudgetSummary } from '../src/lib/budget.js';
import { summarizeTasks } from '../src/lib/tasks.js';
import { applyBudgetDraft, applyResearchDraft, applyTaskDraft } from '../src/lib/drafts.js';
import { summarizeSources } from '../src/lib/sources.js';
import { answerResearchQuestion, findDraftInDatabase, markDraftAppliedInDatabase } from './research.js';
import { checkSource } from './sourceCheck.js';
import type { TripDatabase } from './tripDatabase.js';

interface CreateAppOptions {
  db: TripDatabase;
  openAiApiKey?: string;
  familyPasscode?: string;
  sessionSecret?: string;
  authRequired?: boolean;
}

const patchTripSchema = z.record(z.string(), z.unknown());
const researchSchema = z.object({ question: z.string().min(3), deep: z.boolean().optional(), context: z.string().max(4000).optional() });
const sourceCheckSchema = z.object({ url: z.string().url(), title: z.string().optional() });
const loginSchema = z.object({ passcode: z.string().min(1) });

const sessionCookieName = 'ireland_trip_session';

function createSessionToken(secret: string) {
  return crypto.createHmac('sha256', secret).update('family-session').digest('hex');
}

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return index === -1 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function cookieOptions(maxAgeSeconds: number, secure: boolean) {
  const parts = [`Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=${maxAgeSeconds}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

const asyncRoute = (handler: express.RequestHandler): express.RequestHandler => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

export function createApp({
  db,
  openAiApiKey = process.env.OPENAI_API_KEY,
  familyPasscode = process.env.FAMILY_PASSCODE,
  sessionSecret = process.env.SESSION_SECRET || familyPasscode || 'local-development-session',
  authRequired = Boolean(familyPasscode)
}: CreateAppOptions) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  const secureCookies = process.env.VERCEL_ENV === 'production';
  const validSessionToken = createSessionToken(sessionSecret);
  const isAuthenticated = (request: express.Request) => {
    if (!authRequired) return true;
    const cookies = parseCookies(request.headers.cookie);
    return cookies[sessionCookieName] === validSessionToken;
  };

  app.get('/api/auth/session', (request, response) => {
    response.json({ authRequired, authenticated: isAuthenticated(request) });
  });

  app.post('/api/auth/login', (request, response) => {
    if (!authRequired) {
      response.json({ authenticated: true });
      return;
    }

    const input = loginSchema.parse(request.body);
    if (input.passcode !== familyPasscode) {
      response.status(401).json({ error: 'Invalid family passcode' });
      return;
    }

    response.setHeader('Set-Cookie', `${sessionCookieName}=${encodeURIComponent(validSessionToken)}; ${cookieOptions(60 * 60 * 24 * 30, secureCookies)}`);
    response.json({ authenticated: true });
  });

  app.post('/api/auth/logout', (_request, response) => {
    response.setHeader('Set-Cookie', `${sessionCookieName}=; ${cookieOptions(0, secureCookies)}`);
    response.json({ authenticated: false });
  });

  app.use('/api', (request, response, next) => {
    if (request.path.startsWith('/auth/')) {
      next();
      return;
    }
    if (!isAuthenticated(request)) {
      response.status(401).json({ error: 'Family passcode required' });
      return;
    }
    next();
  });

  app.get('/api/trip', asyncRoute(async (_request, response) => {
    response.json(await db.getTrip());
  }));

  app.patch('/api/trip', asyncRoute(async (request, response) => {
    const patch = patchTripSchema.parse(request.body);
    const trip = await db.saveTrip({ ...(await db.getTrip()), ...patch, updatedAt: new Date().toISOString() });
    response.json(trip);
  }));

  app.get('/api/itinerary', asyncRoute(async (_request, response) => {
    response.json(await db.getItinerary());
  }));

  app.post('/api/itinerary', asyncRoute(async (request, response) => {
    const itinerary = await db.saveItinerary(request.body);
    response.json(itinerary);
  }));

  app.patch('/api/itinerary', asyncRoute(async (request, response) => {
    const updates = Array.isArray(request.body) ? request.body : [];
    const current = await db.getItinerary();
    const itinerary = await db.saveItinerary(
      current.map((day) => ({ ...day, ...(updates.find((item) => item.id === day.id) || {}) }))
    );
    response.json(itinerary);
  }));

  app.get('/api/budget', asyncRoute(async (_request, response) => {
    const items = await db.getBudget();
    response.json({ items, summary: calculateBudgetSummary(items, (await db.getTrip()).budgetTarget) });
  }));

  app.post('/api/budget', asyncRoute(async (request, response) => {
    const items = await db.saveBudget(request.body);
    response.json({ items, summary: calculateBudgetSummary(items, (await db.getTrip()).budgetTarget) });
  }));

  app.patch('/api/budget', asyncRoute(async (request, response) => {
    const updates = Array.isArray(request.body) ? request.body : [request.body];
    const items = await db.saveBudget((await db.getBudget()).map((item) => ({ ...item, ...(updates.find((update) => update.id === item.id) || {}) })));
    response.json({ items, summary: calculateBudgetSummary(items, (await db.getTrip()).budgetTarget) });
  }));

  app.get('/api/tasks', asyncRoute(async (_request, response) => {
    const items = await db.getTasks();
    response.json({ items, summary: summarizeTasks(items) });
  }));

  app.post('/api/tasks', asyncRoute(async (request, response) => {
    const items = await db.saveTasks(request.body);
    response.json({ items, summary: summarizeTasks(items) });
  }));

  app.patch('/api/tasks', asyncRoute(async (request, response) => {
    const updates = Array.isArray(request.body) ? request.body : [request.body];
    const items = await db.saveTasks((await db.getTasks()).map((task) => ({ ...task, ...(updates.find((update) => update.id === task.id) || {}) })));
    response.json({ items, summary: summarizeTasks(items) });
  }));

  app.get('/api/sources', asyncRoute(async (_request, response) => {
    const sources = await db.getSources();
    response.json({ items: sources, summary: summarizeSources(sources) });
  }));

  app.post('/api/sources/check', async (request, response, next) => {
    try {
      const input = sourceCheckSchema.parse(request.body);
      const checked = await checkSource(input.url, input.title);
      await db.saveSources([checked, ...(await db.getSources()).filter((source) => source.url !== checked.url)]);
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
    db.getResearchAnswers().then((answers) => response.json(answers)).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      response.status(400).json({ error: message });
    });
  });

  app.post('/api/research/drafts/:id/apply', asyncRoute(async (request, response) => {
    const draftId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
    const draft = await findDraftInDatabase(db, draftId);
    if (!draft) {
      response.status(404).json({ error: 'Draft not found' });
      return;
    }

    if (draft.status !== 'draft') {
      response.json(draft);
      return;
    }

    if (draft.kind === 'itinerary') {
      await db.saveItinerary(applyResearchDraft(await db.getItinerary(), draft));
    } else if (draft.kind === 'budget') {
      await db.saveBudget(applyBudgetDraft(await db.getBudget(), draft));
    } else if (draft.kind === 'task') {
      await db.saveTasks(applyTaskDraft(await db.getTasks(), draft));
    } else {
      response.status(400).json({ error: 'Unsupported draft type' });
      return;
    }

    const applied = await markDraftAppliedInDatabase(db, draftId);
    response.json(applied);
  }));

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    response.status(400).json({ error: message });
  });

  return app;
}
