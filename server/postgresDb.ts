import { neon } from '@neondatabase/serverless';
import { buildSeedData, type SeedData } from './seed.js';
import type { BookingTask, BudgetItem, DayPlan, ResearchAnswer, ResearchDraft, SourceLink, Trip } from '../src/types.js';
import type { TripDatabase } from './tripDatabase.js';

type StoreKey = keyof SeedData | 'drafts' | 'researchAnswers' | 'seedVersion';

export class PostgresTripDatabase implements TripDatabase {
  private sql: ReturnType<typeof neon>;
  private seed: SeedData;
  private initialized?: Promise<void>;

  constructor(databaseUrl: string, seed = buildSeedData()) {
    this.sql = neon(databaseUrl);
    this.seed = seed;
  }

  private async ensureInitialized() {
    this.initialized ||= this.initialize();
    await this.initialized;
  }

  private async initialize() {
    await this.sql`CREATE TABLE IF NOT EXISTS trip_agent_kv (key TEXT PRIMARY KEY, value JSONB NOT NULL)`;
    const rows = (await this.sql`SELECT value FROM trip_agent_kv WHERE key = 'seedVersion'`) as Array<{ value: string }>;
    if (rows[0]?.value === '1') return;
    await this.setWithoutInit('trip', this.seed.trip);
    await this.setWithoutInit('itinerary', this.seed.itinerary);
    await this.setWithoutInit('budget', this.seed.budget);
    await this.setWithoutInit('tasks', this.seed.tasks);
    await this.setWithoutInit('sources', this.seed.sources);
    await this.setWithoutInit('drafts', []);
    await this.setWithoutInit('researchAnswers', []);
    await this.setWithoutInit('seedVersion', '1');
  }

  private async get<T>(key: StoreKey): Promise<T> {
    await this.ensureInitialized();
    const rows = (await this.sql`SELECT value FROM trip_agent_kv WHERE key = ${key}`) as Array<{ value: T }>;
    if (!rows[0]) throw new Error(`Missing database key: ${key}`);
    return rows[0].value as T;
  }

  private async setWithoutInit<T>(key: StoreKey, value: T): Promise<T> {
    await this.sql`
      INSERT INTO trip_agent_kv (key, value)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value
    `;
    return value;
  }

  private async set<T>(key: StoreKey, value: T): Promise<T> {
    await this.ensureInitialized();
    return this.setWithoutInit(key, value);
  }

  getTrip() { return this.get<Trip>('trip'); }
  saveTrip(trip: Trip) { return this.set('trip', trip); }
  getItinerary() { return this.get<DayPlan[]>('itinerary'); }
  saveItinerary(itinerary: DayPlan[]) { return this.set('itinerary', itinerary); }
  getBudget() { return this.get<BudgetItem[]>('budget'); }
  saveBudget(budget: BudgetItem[]) { return this.set('budget', budget); }
  getTasks() { return this.get<BookingTask[]>('tasks'); }
  saveTasks(tasks: BookingTask[]) { return this.set('tasks', tasks); }
  getSources() { return this.get<SourceLink[]>('sources'); }
  saveSources(sources: SourceLink[]) { return this.set('sources', sources); }
  getDrafts() { return this.get<ResearchDraft[]>('drafts'); }
  saveDrafts(drafts: ResearchDraft[]) { return this.set('drafts', drafts); }
  getResearchAnswers() { return this.get<ResearchAnswer[]>('researchAnswers'); }
  saveResearchAnswers(answers: ResearchAnswer[]) { return this.set('researchAnswers', answers); }
  close() {}
}

export function createPostgresDatabase(databaseUrl: string): TripDatabase {
  return new PostgresTripDatabase(databaseUrl);
}
