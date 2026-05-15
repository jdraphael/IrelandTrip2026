import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../server/db';

describe('sqlite trip database migrations', () => {
  it('upgrades version 1 checklist data to the premium checklist seed while preserving task status', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ireland-trip-db-'));
    const filename = path.join(dir, 'trip-agent.sqlite');
    const sqlite = new Database(filename);
    sqlite.exec('CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    sqlite
      .prepare('INSERT INTO kv (key, value) VALUES (?, ?)')
      .run('seedVersion', JSON.stringify('1'));
    sqlite
      .prepare('INSERT INTO kv (key, value) VALUES (?, ?)')
      .run('tasks', JSON.stringify([
        { id: 'task-book-flights', title: 'Book flights and seats together', status: 'done', dueDate: '2026-09-15', category: 'Flights' }
      ]));
    sqlite.close();

    const db = createDatabase(filename);
    const tasks = await db.getTasks();
    db.close();

    expect(tasks).toHaveLength(24);
    expect(tasks.find((task) => task.id === 'task-book-flights')).toMatchObject({
      status: 'done',
      displayCategory: 'Flights & Travel',
      priority: 'high'
    });
  });
});
