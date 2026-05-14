export type CurrencyCode = 'USD' | 'EUR';

export interface CurrencyPair {
  base: CurrencyCode;
  quote: CurrencyCode;
}

export interface CurrencyRate {
  base: CurrencyCode;
  quote: CurrencyCode;
  rate: number;
  providerDate: string;
  fetchedAt: string;
  source: 'Frankfurter';
}

export interface CurrencyRateSnapshot {
  current?: CurrencyRate;
  previous?: CurrencyRate;
  cached?: CurrencyRate;
}

export type CurrencyLoadStatus = 'loading' | 'success' | 'error';

export interface CurrencyLoadState {
  status: CurrencyLoadStatus;
  rate?: CurrencyRate;
  previousRate?: CurrencyRate;
  cachedRate?: CurrencyRate;
  error?: string;
  isOffline: boolean;
  isRefreshing: boolean;
}
