import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrencyHeaderTile } from '../src/components/CurrencyHeaderTile';
import {
  formatCacheAge,
  formatCurrencyAmount,
  formatExchangeRate,
  formatRelativeTime
} from '../src/currency/format';
import {
  clearCachedCurrencyRate,
  fetchLatestCurrencyRate,
  mapFrankfurterRate,
  readCachedCurrencyRate,
  writeCachedCurrencyRate
} from '../src/currency/service';
import type { CurrencyRate } from '../src/currency/types';

const rate: CurrencyRate = {
  base: 'USD',
  quote: 'EUR',
  rate: 0.85378,
  providerDate: '2026-05-14',
  fetchedAt: '2026-05-14T12:00:00.000Z',
  source: 'Frankfurter'
};

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value
  });
}

describe('currency formatters', () => {
  it('formats traveler-facing currency values and exchange rates', () => {
    expect(formatCurrencyAmount(12.345, 'EUR')).toBe('€12.35');
    expect(formatCurrencyAmount(12.345, 'USD')).toBe('$12.35');
    expect(formatExchangeRate(rate)).toBe('1 USD = 0.85 EUR');
  });

  it('formats relative update and cache ages', () => {
    const now = new Date('2026-05-14T12:10:00.000Z');

    expect(formatRelativeTime('2026-05-14T12:09:45.000Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-05-14T12:05:00.000Z', now)).toBe('5 min ago');
    expect(formatCacheAge('2026-05-14T11:00:00.000Z', now)).toBe('Cached 1 hr ago');
  });
});

describe('currency service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('maps Frankfurter rate responses into the app model', () => {
    expect(mapFrankfurterRate({
      date: '2026-05-14',
      base: 'USD',
      quote: 'EUR',
      rate: 0.85378
    }, '2026-05-14T12:00:00.000Z')).toEqual(rate);
  });

  it('fetches USD/EUR from Frankfurter v2 by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      date: '2026-05-14',
      base: 'USD',
      quote: 'EUR',
      rate: 0.85378
    }));

    await expect(fetchLatestCurrencyRate({ base: 'USD', quote: 'EUR' }, {
      fetchImpl: fetchMock,
      now: () => '2026-05-14T12:00:00.000Z'
    })).resolves.toEqual(rate);

    expect(fetchMock).toHaveBeenCalledWith('https://api.frankfurter.dev/v2/rate/USD/EUR', expect.objectContaining({
      headers: expect.objectContaining({ Accept: 'application/json' })
    }));
  });

  it('rejects malformed and failed rate responses', async () => {
    await expect(fetchLatestCurrencyRate({ base: 'USD', quote: 'EUR' }, {
      fetchImpl: vi.fn().mockResolvedValue(Response.json({ rate: 'bad' }))
    })).rejects.toThrow('Unexpected currency response');

    await expect(fetchLatestCurrencyRate({ base: 'USD', quote: 'EUR' }, {
      fetchImpl: vi.fn().mockResolvedValue(Response.json({ message: 'Could not find currency ABC' }, { status: 400 }))
    })).rejects.toThrow('Could not find currency ABC');
  });

  it('times out stalled rate requests', async () => {
    vi.useFakeTimers();
    const request = fetchLatestCurrencyRate({ base: 'USD', quote: 'EUR' }, {
      fetchImpl: vi.fn((_url, init) => new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      })) as typeof fetch,
      timeoutMs: 1000
    });

    const expectation = expect(request).rejects.toThrow('Currency request timed out');
    await vi.advanceTimersByTimeAsync(1000);
    await expectation;
    vi.useRealTimers();
  });

  it('reads and ignores cached rate values safely', () => {
    writeCachedCurrencyRate(rate);
    expect(readCachedCurrencyRate()).toEqual(rate);

    localStorage.setItem('ireland-trip.currency-rate.v1', '{broken');
    expect(readCachedCurrencyRate()).toBeUndefined();

    clearCachedCurrencyRate();
    expect(readCachedCurrencyRate()).toBeUndefined();
  });
});

describe('CurrencyHeaderTile', () => {
  beforeEach(() => {
    localStorage.clear();
    setOnline(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    setOnline(true);
  });

  it('shows loading and then the live USD to EUR rate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      date: '2026-05-14',
      base: 'USD',
      quote: 'EUR',
      rate: 0.85378
    })));

    render(<CurrencyHeaderTile />);

    expect(screen.getByLabelText(/Loading currency rate/i)).toBeInTheDocument();
    expect(await screen.findByText('1 USD = 0.85 EUR')).toBeInTheDocument();
    expect(screen.getByText(/Updated just now/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open currency calculator/i })).toBeInTheDocument();
  });

  it('opens the calculator from the navigation tool variant', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      date: '2026-05-14',
      base: 'USD',
      quote: 'EUR',
      rate: 0.85378
    })));

    render(<CurrencyHeaderTile variant="nav" />);
    await screen.findByText('1 USD = 0.85 EUR');
    await userEvent.click(screen.getByRole('button', { name: /Travel conversion tool/i }));

    expect(screen.getByRole('dialog', { name: /USD to EUR/i })).toBeInTheDocument();
  });

  it('opens the navigation module even before a live rate is available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));

    render(<CurrencyHeaderTile variant="nav" />);
    await userEvent.click(screen.getByRole('button', { name: /Travel conversion tool/i }));

    const dialog = screen.getByRole('dialog', { name: /Travel conversion/i });
    expect(dialog).toBeInTheDocument();
    expect(await within(dialog).findByText(/Rate unavailable/i)).toBeInTheDocument();
  });

  it('refreshes the live rate every 15 minutes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00.000Z'));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ date: '2026-05-14', base: 'USD', quote: 'EUR', rate: 0.85378 }))
      .mockResolvedValueOnce(Response.json({ date: '2026-05-14', base: 'USD', quote: 'EUR', rate: 0.86 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<CurrencyHeaderTile />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('1 USD = 0.85 EUR')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('1 USD = 0.86 EUR')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows an error state and retries successfully', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce(Response.json({ date: '2026-05-14', base: 'USD', quote: 'EUR', rate: 0.85378 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<CurrencyHeaderTile />);

    expect(await screen.findByText(/Rate unavailable/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Retry currency rate/i }));

    expect(await screen.findByText('1 USD = 0.85 EUR')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('leaves loading state when the live rate request stalls', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => {
      const signal = init?.signal;
      if (signal) signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));

    render(<CurrencyHeaderTile />);
    expect(screen.getByLabelText(/Loading currency rate/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(screen.getByText(/Rate unavailable/i)).toBeInTheDocument();
  });

  it('falls back to cached rates while offline', async () => {
    writeCachedCurrencyRate(rate);
    setOnline(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));

    render(<CurrencyHeaderTile />);

    expect(await screen.findByText('1 USD = 0.85 EUR')).toBeInTheDocument();
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Cached/i)).toBeInTheDocument();
  });

  it('opens a calculator modal and swaps conversion direction', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      date: '2026-05-14',
      base: 'USD',
      quote: 'EUR',
      rate: 0.85378
    })));

    render(<CurrencyHeaderTile />);
    await userEvent.click(await screen.findByRole('button', { name: /Open currency calculator/i }));

    const input = screen.getByLabelText(/Amount to convert/i);
    await userEvent.clear(input);
    await userEvent.type(input, '100');

    expect(screen.getByText('€85.38')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Swap conversion direction/i }));

    await waitFor(() => expect(screen.getByText('$117.13')).toBeInTheDocument());
    expect(screen.getByText(/EUR to USD/i)).toBeInTheDocument();
  });
});
