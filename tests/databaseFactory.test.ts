import { describe, expect, it, vi } from 'vitest';
import { createRuntimeDatabase } from '../server/databaseFactory';

vi.mock('../server/postgresDb', () => ({
  createPostgresDatabase: vi.fn((url: string) => ({ kind: 'postgres', url }))
}));

describe('runtime database factory', () => {
  it('returns a clear hosted configuration error when DATABASE_URL is missing on Vercel', () => {
    expect(() => createRuntimeDatabase({ isVercel: true, databaseUrl: '' })).toThrow(/DATABASE_URL/);
  });

  it('uses Postgres when DATABASE_URL is available on Vercel', () => {
    expect(createRuntimeDatabase({ isVercel: true, databaseUrl: 'postgres://example' })).toEqual({
      kind: 'postgres',
      url: 'postgres://example'
    });
  });
});
