import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/app.js';
import { createPostgresDatabase } from '../server/postgresDb.js';
import type { TripDatabase } from '../server/tripDatabase.js';

class ConfigurationErrorDatabase implements TripDatabase {
  constructor(private message: string) {}

  private fail(): Promise<never> {
    return Promise.reject(new Error(this.message));
  }

  getTrip() { return this.fail(); }
  saveTrip() { return this.fail(); }
  getItinerary() { return this.fail(); }
  saveItinerary() { return this.fail(); }
  getBudget() { return this.fail(); }
  saveBudget() { return this.fail(); }
  getTasks() { return this.fail(); }
  saveTasks() { return this.fail(); }
  getSources() { return this.fail(); }
  saveSources() { return this.fail(); }
  getDrafts() { return this.fail(); }
  saveDrafts() { return this.fail(); }
  getResearchAnswers() { return this.fail(); }
  saveResearchAnswers() { return this.fail(); }
  close() {}
}

function getHostedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new ConfigurationErrorDatabase('DATABASE_URL is required for Vercel deployments. Add Neon Postgres to the project and expose DATABASE_URL.');
  }
  return createPostgresDatabase(databaseUrl);
}

const app = createApp({
  db: getHostedDatabase(),
  authRequired: true
});

function rewriteApiPath(request: VercelRequest) {
  const path = request.query.path;
  const rawPath = Array.isArray(path) ? path.join('/') : path;
  if (!rawPath) return;

  const url = new URL(request.url || '/api', 'https://irelandtrip.local');
  url.pathname = `/api/${rawPath}`;
  url.searchParams.delete('path');
  request.url = `${url.pathname}${url.search}`;
}

export default function handler(request: VercelRequest, response: VercelResponse) {
  rewriteApiPath(request);
  return app(request, response);
}
