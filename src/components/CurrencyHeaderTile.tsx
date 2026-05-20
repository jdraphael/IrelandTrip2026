import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Banknote, Minus, RefreshCw, Repeat2, X } from 'lucide-react';
import { formatCacheAge, formatCurrencyAmount, formatExchangeRate, formatRelativeTime } from '../currency/format';
import { useCurrencyRate } from '../currency/useCurrencyRate';
import type { CurrencyCode, CurrencyRate } from '../currency/types';

const currencyFlags: Record<CurrencyCode, string> = {
  USD: '🇺🇸',
  EUR: '🇮🇪'
};

function trend(rate?: CurrencyRate, previousRate?: CurrencyRate) {
  if (!rate || !previousRate) return { label: 'Rate steady', icon: Minus, tone: 'neutral' };
  if (rate.rate > previousRate.rate) return { label: 'Euro rate up', icon: ArrowUpRight, tone: 'up' };
  if (rate.rate < previousRate.rate) return { label: 'Euro rate down', icon: ArrowDownRight, tone: 'down' };
  return { label: 'Rate steady', icon: Minus, tone: 'neutral' };
}

function conversionValue(amount: number, direction: 'usd-eur' | 'eur-usd', rate: number) {
  if (!Number.isFinite(amount)) return 0;
  return direction === 'usd-eur' ? amount * rate : amount / rate;
}

export function CurrencyHeaderTile({ variant = 'tile' }: { variant?: 'tile' | 'nav' }) {
  const { status, rate, previousRate, error, isOffline, isRefreshing, retry } = useCurrencyRate();
  const [modalOpen, setModalOpen] = useState(false);
  const [direction, setDirection] = useState<'usd-eur' | 'eur-usd'>('usd-eur');
  const [amount, setAmount] = useState('1');
  const amountId = useId();
  const currentTrend = trend(rate, previousRate);
  const TrendIcon = currentTrend.icon;
  const sourceAmount = Number.parseFloat(amount);
  const sourceCurrency: CurrencyCode = direction === 'usd-eur' ? 'USD' : 'EUR';
  const targetCurrency: CurrencyCode = direction === 'usd-eur' ? 'EUR' : 'USD';
  const targetAmount = rate ? conversionValue(sourceAmount, direction, rate.rate) : 0;
  const statusText = useMemo(() => {
    if (!rate) return 'Rate unavailable';
    if (isOffline) return `${formatCacheAge(rate.fetchedAt)} · Offline`;
    if (error) return `${formatCacheAge(rate.fetchedAt)} · Rate unavailable`;
    return `Updated ${formatRelativeTime(rate.fetchedAt)}`;
  }, [error, isOffline, rate]);

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

  const tileContent = rate ? (
    <>
      <span className="currency-flags" aria-hidden="true">
        <span>{currencyFlags[rate.base]}</span>
        <span className="currency-code">{rate.base}</span>
        <ArrowRight size={13} />
        <span>{currencyFlags[rate.quote]}</span>
        <span className="currency-code">{rate.quote}</span>
      </span>
      <strong>{formatExchangeRate(rate)}</strong>
      <span className="currency-status-line">
        <span>{statusText}</span>
        <span className={`currency-trend currency-trend-${currentTrend.tone}`} aria-label={currentTrend.label}>
          <TrendIcon size={13} />
        </span>
        {isRefreshing && <RefreshCw className="currency-refreshing" size={13} aria-label="Refreshing currency rate" />}
      </span>
    </>
  ) : (
    <>
      <span className="currency-flags" aria-hidden="true">
        <span>🇺🇸</span>
        <span className="currency-code">USD</span>
        <ArrowRight size={13} />
        <span>🇮🇪</span>
        <span className="currency-code">EUR</span>
      </span>
      <strong>{status === 'loading' ? 'Loading rate' : 'Rate unavailable'}</strong>
      <span className="currency-status-line">{status === 'loading' ? 'Checking live rate...' : error || 'Try again'}</span>
    </>
  );

  const trigger = variant === 'nav' ? (
    <button
      className={`currency-nav-button ${status === 'loading' && !rate ? 'currency-nav-button-loading' : ''}`}
      type="button"
      aria-label="Travel conversion tool"
      aria-haspopup="dialog"
      aria-expanded={modalOpen}
      title="Travel conversion tool"
      data-tooltip="Travel conversion tool"
      onClick={() => {
        setModalOpen(true);
      }}
    >
      <Banknote size={18} />
      <span className="nav-label currency-nav-copy">
        <span>Travel Conversion</span>
        <small>{rate ? formatExchangeRate(rate) : status === 'loading' ? 'Loading rate' : 'Rate unavailable'}</small>
      </span>
      {isRefreshing && <RefreshCw className="currency-refreshing" size={13} aria-label="Refreshing currency rate" />}
    </button>
  ) : (
    <div className={`currency-header-control ${status === 'error' && !rate ? 'currency-header-control-error' : ''}`}>
      <button
        className={`currency-tile ${status === 'loading' && !rate ? 'currency-tile-loading' : ''}`}
        type="button"
        aria-label={rate ? 'Open currency calculator' : status === 'loading' ? 'Loading currency rate' : 'Currency rate unavailable'}
        onClick={() => {
          if (rate) setModalOpen(true);
        }}
      >
        {tileContent}
      </button>
      {status === 'error' && !rate && (
        <button className="currency-retry" type="button" aria-label="Retry currency rate" onClick={() => void retry()}>
          <RefreshCw size={15} />
        </button>
      )}
    </div>
  );

  return (
    <>
      {trigger}

      {modalOpen && (rate || variant === 'nav') && (
        <div className={`currency-modal-backdrop ${variant === 'nav' ? 'currency-module-backdrop' : ''}`} role="presentation" onMouseDown={() => setModalOpen(false)}>
          <section
            className={`currency-modal ${variant === 'nav' ? 'currency-module' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="currency-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="currency-modal-head">
              <div>
                <span className="currency-modal-kicker">Travel conversion</span>
                <h2 id="currency-modal-title">{rate ? `${sourceCurrency} to ${targetCurrency}` : 'Travel conversion'}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close currency calculator" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {rate ? (
              <>
                <div className="currency-calculator">
                  <label htmlFor={amountId}>Amount to convert</label>
                  <div className="currency-input-row">
                    <span>{currencyFlags[sourceCurrency]} {sourceCurrency}</span>
                    <input
                      id={amountId}
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>
                  <button
                    className="button secondary compact"
                    type="button"
                    aria-label="Swap conversion direction"
                    onClick={() => setDirection((current) => current === 'usd-eur' ? 'eur-usd' : 'usd-eur')}
                  >
                    <Repeat2 size={15} /> Swap
                  </button>
                </div>

                <div className="currency-result" aria-live="polite">
                  <span>{currencyFlags[targetCurrency]} {targetCurrency}</span>
                  <strong>{formatCurrencyAmount(targetAmount, targetCurrency)}</strong>
                </div>

                <div className="currency-modal-meta">
                  <span>{formatExchangeRate(rate)}</span>
                  <span>Provider date {rate.providerDate}</span>
                  <span>{statusText}</span>
                </div>
              </>
            ) : (
              <div className="currency-module-empty" aria-live="polite">
                <strong>{status === 'loading' ? 'Loading live rate' : 'Rate unavailable'}</strong>
                <p>{status === 'loading' ? 'Checking the latest USD to EUR rate...' : error || 'Refresh the rate and try again.'}</p>
              </div>
            )}

            <button className="button ghost full" type="button" onClick={() => void retry()}>
              <RefreshCw size={15} /> Refresh rate
            </button>
          </section>
        </div>
      )}
    </>
  );
}
