import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CURRENCY_PAIR,
  fetchLatestCurrencyRate,
  readCachedCurrencyRate,
  writeCachedCurrencyRate
} from './service';
import type { CurrencyLoadState, CurrencyPair, CurrencyRate } from './types';

export const CURRENCY_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

function getOnlineStatus() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function initialCurrencyState(): CurrencyLoadState {
  const cachedRate = readCachedCurrencyRate();
  return {
    status: cachedRate ? 'success' : 'loading',
    rate: cachedRate,
    cachedRate,
    isOffline: !getOnlineStatus(),
    isRefreshing: false
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load currency rate.';
}

export function useCurrencyRate(pair: CurrencyPair = DEFAULT_CURRENCY_PAIR) {
  const stablePair = useMemo(() => pair, [pair.base, pair.quote]);
  const [state, setState] = useState<CurrencyLoadState>(initialCurrencyState);
  const requestId = useRef(0);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const cachedRate = readCachedCurrencyRate();

    if (!getOnlineStatus()) {
      if (!mounted.current) return;
      setState({
        status: cachedRate ? 'success' : 'error',
        rate: cachedRate,
        cachedRate,
        error: cachedRate ? undefined : 'Offline',
        isOffline: true,
        isRefreshing: false
      });
      return;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setState((current) => ({
      ...current,
      status: current.rate ? 'success' : 'loading',
      cachedRate,
      error: undefined,
      isOffline: false,
      isRefreshing: Boolean(current.rate)
    }));

    try {
      const nextRate = await fetchLatestCurrencyRate(stablePair);
      if (!mounted.current || requestId.current !== currentRequest) return;

      const previousRate: CurrencyRate | undefined = cachedRate && cachedRate.rate !== nextRate.rate ? cachedRate : undefined;
      writeCachedCurrencyRate(nextRate);
      setState({
        status: 'success',
        rate: nextRate,
        previousRate,
        cachedRate: nextRate,
        isOffline: false,
        isRefreshing: false
      });
    } catch (error) {
      if (!mounted.current || requestId.current !== currentRequest || error instanceof DOMException && error.name === 'AbortError') return;
      const fallbackRate = readCachedCurrencyRate();
      setState({
        status: fallbackRate ? 'success' : 'error',
        rate: fallbackRate,
        cachedRate: fallbackRate,
        error: errorMessage(error),
        isOffline: !getOnlineStatus(),
        isRefreshing: false
      });
    }
  }, [stablePair]);

  useEffect(() => {
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void load();
    }, CURRENCY_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [load]);

  useEffect(() => {
    const handleOffline = () => {
      const cachedRate = readCachedCurrencyRate();
      setState((current) => ({
        ...current,
        status: cachedRate || current.rate ? 'success' : 'error',
        rate: cachedRate || current.rate,
        cachedRate: cachedRate || current.cachedRate,
        error: cachedRate || current.rate ? current.error : 'Offline',
        isOffline: true,
        isRefreshing: false
      }));
    };
    const handleOnline = () => {
      void load();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [load]);

  return {
    ...state,
    retry: load
  };
}
