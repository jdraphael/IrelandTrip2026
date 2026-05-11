import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { buildSeedData, type SeedData } from './seed';
import type { BookingTask, BudgetItem, DayPlan, ResearchAnswer, ResearchDraft, SourceLink, Trip } from '../src/types';

export interface TripDatabase {
  getTrip(): Trip;
  saveTrip(trip: Trip): Trip;
  getItinerary(): DayPlan[];
  saveItinerary(itinerary: DayPlan[]): DayPlan[];
  getBudget(): BudgetItem[];
  saveBudget(budget: BudgetItem[]): BudgetItem[];
  getTasks(): BookingTask[];
  saveTasks(tasks: BookingTask[]): BookingTask[];
  getSources(): SourceLink[];
  saveSources(sources: SourceLink[]): SourceLink[];
  getDrafts(): ResearchDraft[];
  saveDrafts(drafts: ResearchDraft[]): ResearchDraft[];
  getResearchAnswers(): ResearchAnswer[];
  saveResearchAnswers(answers: ResearchAnswer[]): ResearchAnswer[];
  close(): void;
}

type StoreKey = keyof SeedData | 'drafts' | 'researchAnswers' | 'seedVersion';

class SqliteTripDatabase implements TripDatabase {
  private db: Database.Database;

  constructor(filename: string, seed = buildSeedData()) {
    this.db = new Database(filename);
    this.db.pragma('journal_mode = WAL');
    this.db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    this.seedIfNeeded(seed);
  }

  private seedIfNeeded(seed: SeedData) {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM kv').get() as { count: number };
    const version = this.db.prepare('SELECT value FROM kv WHERE key = ?').get('seedVersion') as { value: string } | undefined;
    if (count.count > 0 && version?.value === '"1"') return;
    this.set('trip', seed.trip);
    this.set('itinerary', seed.itinerary);
    this.set('budget', seed.budget);
    this.set('tasks', seed.tasks);
    this.set('sources', seed.sources);
    this.set('drafts', []);
    this.set('researchAnswers', []);
    this.set('seedVersion', '1');
  }

  private get<T>(key: StoreKey): T {
    const row = this.db.prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined;
    if (!row) throw new Error(`Missing database key: ${key}`);
    return JSON.parse(row.value) as T;
  }

  private set<T>(key: StoreKey, value: T): T {
    this.db
      .prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, JSON.stringify(value));
    return value;
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
  close() { this.db.close(); }
}

export function createDatabase(filename = path.resolve(process.cwd(), 'data', 'trip-agent.sqlite')): TripDatabase {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  return new SqliteTripDatabase(filename);
}

export function createTestDatabase(seed = buildSeedData()): TripDatabase {
  return new SqliteTripDatabase(':memory:', seed);
}
