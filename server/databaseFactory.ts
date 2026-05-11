import { createDatabase } from './db.js';
import { createPostgresDatabase } from './postgresDb.js';
import type { TripDatabase } from './tripDatabase.js';

interface RuntimeDatabaseOptions {
  isVercel?: boolean;
  databaseUrl?: string;
}

export function createRuntimeDatabase(options: RuntimeDatabaseOptions = {}): TripDatabase {
  const isVercel = options.isVercel ?? Boolean(process.env.VERCEL);
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;

  if (isVercel) {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for Vercel deployments. Add Neon Postgres to the project and expose DATABASE_URL.');
    }
    return createPostgresDatabase(databaseUrl);
  }

  return createDatabase();
}
