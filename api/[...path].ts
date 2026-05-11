import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/app';
import { createRuntimeDatabase } from '../server/databaseFactory';
import type { TripDatabase } from '../server/db';

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
  try {
    return createRuntimeDatabase({ isVercel: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Hosted database is not configured.';
    return new ConfigurationErrorDatabase(message);
  }
}

const app = createApp({
  db: getHostedDatabase(),
  authRequired: true
});

export default function handler(request: VercelRequest, response: VercelResponse) {
  return app(request, response);
}
