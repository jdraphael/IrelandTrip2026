import type { SourceLink } from '../src/types';
import { classifySource } from '../src/lib/sources';

export async function checkSource(url: string, title = url): Promise<SourceLink> {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const ok = response.ok || response.status === 405;
    return {
      id: `source-${Date.now()}`,
      title,
      url,
      sourceType: classifySource(url),
      checkedAt,
      status: ok ? 'ok' : 'warning',
      notes: ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      id: `source-${Date.now()}`,
      title,
      url,
      sourceType: classifySource(url),
      checkedAt,
      status: 'unreachable',
      notes: error instanceof Error ? error.message : 'Unable to reach source'
    };
  }
}
