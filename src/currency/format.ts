import type { CurrencyCode, CurrencyRate } from './types';

const currencyFormatters = new Map<CurrencyCode, Intl.NumberFormat>();

function currencyFormatter(currency: CurrencyCode) {
  const existing = currencyFormatters.get(currency);
  if (existing) return existing;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  currencyFormatters.set(currency, formatter);
  return formatter;
}

export function formatCurrencyAmount(value: number, currency: CurrencyCode) {
  return currencyFormatter(currency).format(Number.isFinite(value) ? value : 0);
}

export function formatExchangeRate(rate: CurrencyRate) {
  return `1 ${rate.base} = ${rate.rate.toFixed(2)} ${rate.quote}`;
}

export function formatRelativeTime(value: string, now = new Date()) {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return 'unknown';
  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function formatCacheAge(value: string, now = new Date()) {
  return `Cached ${formatRelativeTime(value, now)}`;
}
