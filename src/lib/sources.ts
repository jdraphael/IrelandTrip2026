import type { SourceLink, SourceSummary, SourceType } from '../types';

const officialDomains = [
  'dublinzoo.ie',
  'tcd.ie',
  'bookofkells.ie',
  'kilkennycastle.ie',
  'blarneycastle.ie',
  'fotawildlife.ie',
  'dinglesheepdogs.com',
  'cliffsofmoher.ie',
  'connemaranationalpark.ie',
  'theconnacht.ie',
  'staycity.com',
  'claytonhoteldublinairport.com',
  'enterprise.ie',
  'irishcarrentals.com',
  'dandooley.com'
];

const governmentDomains = ['dfa.ie', 'state.gov', 'citizensinformation.ie', 'ndls.ie', 'revenue.ie'];
const guideDomains = ['tripadvisor.', 'lonelyplanet.', 'ricksteves.', 'thepointsguy.', 'reddit.', 'blog'];

export function classifySource(url: string): SourceType {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'unverified';
  }

  if (governmentDomains.some((domain) => hostname.endsWith(domain))) return 'government';
  if (officialDomains.some((domain) => hostname.endsWith(domain))) return 'official';
  if (guideDomains.some((domain) => hostname.includes(domain))) return 'travel-guide';
  return 'unverified';
}

export function summarizeSources(sources: SourceLink[], now = new Date()): SourceSummary {
  const officialCount = sources.filter((source) => source.sourceType === 'official' || source.sourceType === 'government').length;
  const unofficial = sources.length - officialCount;
  const stale = sources.filter((source) => {
    const checked = new Date(source.checkedAt).getTime();
    if (Number.isNaN(checked)) return true;
    return now.getTime() - checked > 180 * 24 * 60 * 60 * 1000;
  }).length;
  const unreachable = sources.filter((source) => source.status === 'unreachable').length;

  const warnings: string[] = [];
  if (sources.length === 0) warnings.push('No sources are attached');
  if (unofficial > 0) warnings.push(`${unofficial} source${unofficial === 1 ? ' is' : 's are'} unofficial or broad travel web`);
  if (stale > 0) warnings.push(`${stale} source${stale === 1 ? ' has' : 's have'} not been checked in 180+ days`);
  if (unreachable > 0) warnings.push(`${unreachable} source${unreachable === 1 ? ' is' : 's are'} unreachable`);

  return {
    total: sources.length,
    officialCount,
    warningCount: warnings.length,
    warnings
  };
}
