import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { buildSeedData, type SeedData } from './seed.js';
import type { BookingTask, BudgetItem, DayPlan, FamilyMember, ResearchAnswer, ResearchDraft, SourceLink, Trip } from '../src/types.js';
import type { TripDatabase } from './tripDatabase.js';

type StoreKey = keyof SeedData | 'drafts' | 'researchAnswers' | 'seedVersion';
const seedVersion = '5';

function mergeSeedTasks(seedTasks: BookingTask[], currentTasks: BookingTask[] = [], preserveStatus = true) {
  const currentById = new Map(currentTasks.map((task) => [task.id, task]));
  const seedIds = new Set(seedTasks.map((task) => task.id));
  const upgraded = seedTasks.map((task) => {
    const current = currentById.get(task.id);
    return current && preserveStatus ? { ...task, status: current.status, subtasksDone: current.subtasksDone ?? task.subtasksDone } : task;
  });
  const custom = currentTasks.filter((task) => !seedIds.has(task.id));
  return [...upgraded, ...custom];
}

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
    const currentVersion = version ? JSON.parse(version.value) as string : undefined;
    if (count.count > 0 && currentVersion === seedVersion) return;
    if (count.count > 0) {
      const currentTasks = this.db.prepare('SELECT value FROM kv WHERE key = ?').get('tasks') as { value: string } | undefined;
      this.set('tasks', mergeSeedTasks(seed.tasks, currentTasks ? JSON.parse(currentTasks.value) as BookingTask[] : [], Boolean(currentVersion)));
      const currentFamilyMembers = this.db.prepare('SELECT value FROM kv WHERE key = ?').get('familyMembers') as { value: string } | undefined;
      this.set('familyMembers', currentFamilyMembers ? JSON.parse(currentFamilyMembers.value) as FamilyMember[] : seed.familyMembers);
      this.set('seedVersion', seedVersion);
      return;
    }
    this.set('trip', seed.trip);
    this.set('familyMembers', seed.familyMembers);
    this.set('itinerary', seed.itinerary);
    this.set('budget', seed.budget);
    this.set('tasks', seed.tasks);
    this.set('sources', seed.sources);
    this.set('drafts', []);
    this.set('researchAnswers', []);
    this.set('seedVersion', seedVersion);
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

  async getTrip() { return this.get<Trip>('trip'); }
  async saveTrip(trip: Trip) { return this.set('trip', trip); }
  async getFamilyMembers() { return this.get<FamilyMember[]>('familyMembers'); }
  async saveFamilyMembers(members: FamilyMember[]) { return this.set('familyMembers', members); }
  async getItinerary() { return this.get<DayPlan[]>('itinerary'); }
  async saveItinerary(itinerary: DayPlan[]) { return this.set('itinerary', itinerary); }
  async getBudget() { return this.get<BudgetItem[]>('budget'); }
  async saveBudget(budget: BudgetItem[]) { return this.set('budget', budget); }
  async getTasks() { return this.get<BookingTask[]>('tasks'); }
  async saveTasks(tasks: BookingTask[]) { return this.set('tasks', tasks); }
  async getSources() { return this.get<SourceLink[]>('sources'); }
  async saveSources(sources: SourceLink[]) { return this.set('sources', sources); }
  async getDrafts() { return this.get<ResearchDraft[]>('drafts'); }
  async saveDrafts(drafts: ResearchDraft[]) { return this.set('drafts', drafts); }
  async getResearchAnswers() { return this.get<ResearchAnswer[]>('researchAnswers'); }
  async saveResearchAnswers(answers: ResearchAnswer[]) { return this.set('researchAnswers', answers); }
  close() { this.db.close(); }
}

export function createDatabase(filename = path.resolve(process.cwd(), 'data', 'trip-agent.sqlite')): TripDatabase {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  return new SqliteTripDatabase(filename);
}

export function createTestDatabase(seed = buildSeedData()): TripDatabase {
  return new SqliteTripDatabase(':memory:', seed);
}
