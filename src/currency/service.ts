import type { CurrencyCode, CurrencyPair, CurrencyRate } from './types';

export const CURRENCY_CACHE_KEY = 'ireland-trip.currency-rate.v1';
export const DEFAULT_CURRENCY_PAIR: CurrencyPair = { base: 'USD', quote: 'EUR' };

interface FrankfurterRateResponse {
  date?: unknown;
  base?: unknown;
  quote?: unknown;
  rate?: unknown;
}

interface FetchLatestOptions {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === 'USD' || value === 'EUR';
}

function isCurrencyRate(value: unknown): value is CurrencyRate {
  const rate = value as Partial<CurrencyRate>;
  return (
    isCurrencyCode(rate.base) &&
    isCurrencyCode(rate.quote) &&
    typeof rate.rate === 'number' &&
    Number.isFinite(rate.rate) &&
    typeof rate.providerDate === 'string' &&
    typeof rate.fetchedAt === 'string' &&
    rate.source === 'Frankfurter'
  );
}

function normalizeApiBaseUrl(value?: string) {
  return (value || import.meta.env.VITE_CURRENCY_API_BASE_URL || 'https://api.frankfurter.dev').replace(/\/+$/, '');
}

export function mapFrankfurterRate(data: FrankfurterRateResponse, fetchedAt = new Date().toISOString()): CurrencyRate {
  if (
    typeof data.date !== 'string' ||
    !isCurrencyCode(data.base) ||
    !isCurrencyCode(data.quote) ||
    typeof data.rate !== 'number' ||
    !Number.isFinite(data.rate)
  ) {
    throw new Error('Unexpected currency response');
  }

  return {
    base: data.base,
    quote: data.quote,
    rate: data.rate,
    providerDate: data.date,
    fetchedAt,
    source: 'Frankfurter'
  };
}

async function readErrorMessage(response: Response) {
  try {
    const body = await response.json() as { message?: unknown; error?: unknown };
    if (typeof body.message === 'string') return body.message;
    if (typeof body.error === 'string') return body.error;
  } catch {
    return undefined;
  }
  return undefined;
}

export async function fetchLatestCurrencyRate(pair: CurrencyPair = DEFAULT_CURRENCY_PAIR, options: FetchLatestOptions = {}) {
  const fetcher = options.fetchImpl || fetch;
  const baseUrl = normalizeApiBaseUrl(options.apiBaseUrl);
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 10000);
  const abortFromParent = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromParent, { once: true });

  let response: Response;
  try {
    response = await fetcher(`${baseUrl}/v2/rate/${pair.base}/${pair.quote}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
  } catch (error) {
    if (timedOut) throw new Error('Currency request timed out');
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', abortFromParent);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response) || `Currency request failed: ${response.status}`);
  }

  return mapFrankfurterRate(await response.json() as FrankfurterRateResponse, options.now?.() || new Date().toISOString());
}

export function readCachedCurrencyRate(): CurrencyRate | undefined {
  try {
    const raw = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    return isCurrencyRate(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function writeCachedCurrencyRate(rate: CurrencyRate) {
  localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify(rate));
}

export function clearCachedCurrencyRate() {
  localStorage.removeItem(CURRENCY_CACHE_KEY);
}
