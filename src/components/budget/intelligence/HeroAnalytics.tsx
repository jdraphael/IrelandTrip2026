import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { BudgetResponse } from '../../../api';
import { dashboardAssets } from '../../../dashboardAssets';
import type { BudgetForecast, BudgetHealthScore, BudgetIntelligence, SavingsEstimate } from '../../../lib/budgetIntelligence';
import type { Trip } from '../../../types';
import { euroMoney } from '../budgetShared';
import { BudgetHealthGauge } from './BudgetHealthGauge';

export function HeroAnalytics({
  budget,
  trip,
  intelligence,
  health,
  savings,
  forecast
}: {
  budget: BudgetResponse;
  trip?: Trip;
  intelligence: BudgetIntelligence;
  health: BudgetHealthScore;
  savings: SavingsEstimate;
  forecast: BudgetForecast;
}) {
  const actualPercent = Math.round((intelligence.totalActual / Math.max(1, budget.summary.target)) * 100);
  return (
    <section className="budget-intel-hero" aria-label="Trip financial overview">
      <div className="budget-intel-hero-copy">
        <span>Trip Financial Overview</span>
        <h1>Your Ireland expedition is on track and performing well.</h1>
        <p>You're within budget with strong flexibility for experiences and upgrades.</p>
        <div className="budget-intel-hero-kpis">
          <BudgetHealthGauge health={health} />
          <article><span>Savings Opportunity</span><strong>{euroMoney.format(savings.amount)}</strong><small>Potential savings</small></article>
          <article><span>Forecast Confidence</span><strong>{forecast.confidence}%</strong><small>High confidence</small></article>
          <article><span>Projected Total Spend</span><strong>{euroMoney.format(forecast.projectedTotal)}</strong><small>of {euroMoney.format(budget.summary.target)} budget</small></article>
        </div>
      </div>
      <div className="budget-intel-map">
        <img src={dashboardAssets.mapExpedition || dashboardAssets.irelandMap} alt="" aria-hidden="true" />
        <svg viewBox="0 0 520 260" aria-hidden="true">
          <motion.path
            d="M370 84 C326 132 298 134 248 118 C206 105 178 132 148 158 C188 178 232 180 275 188 C310 194 338 174 376 146"
            fill="none"
            stroke="url(#routeGlow)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="8 12"
            initial={{ pathLength: 0, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2.4, ease: 'easeInOut' }}
          />
          <defs>
            <linearGradient id="routeGlow" x1="0" x2="1">
              <stop stopColor="#5ee0a0" />
              <stop offset="1" stopColor="#d9b95b" />
            </linearGradient>
          </defs>
        </svg>
        {intelligence.cities.slice(0, 5).map((city) => (
          <button key={city.city} type="button" style={{ left: `${city.x}%`, top: `${city.y}%` }}>
            {city.city}
          </button>
        ))}
      </div>
      <aside className="budget-intel-planned-card">
        <h2>Planned vs Actual</h2>
        <div className="budget-intel-legend"><span>Planned</span><span>Actual</span><span>Remaining</span></div>
        <div className="budget-intel-plan-values">
          <strong>{euroMoney.format(budget.summary.planned)}</strong>
          <strong>{euroMoney.format(budget.summary.actual)}</strong>
          <strong>{euroMoney.format(budget.summary.remainingActual)}</strong>
        </div>
        <meter min="0" max="100" value={actualPercent}>{actualPercent}%</meter>
        <p><Sparkles size={14} /> {trip?.travelers || 5} travelers tracking {forecast.perTravelerPerDay ? euroMoney.format(forecast.perTravelerPerDay) : 'EUR 0'} per traveler/day.</p>
      </aside>
    </section>
  );
}
