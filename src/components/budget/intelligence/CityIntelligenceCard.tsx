import { MapPin } from 'lucide-react';
import type { CitySpendProfile } from '../../../lib/budgetIntelligence';
import { euroMoney } from '../budgetShared';

export function CityIntelligenceCard({ city, onExpand }: { city: CitySpendProfile; onExpand: (city: CitySpendProfile) => void }) {
  return (
    <article className="budget-intel-city-card">
      <div>
        <span><MapPin size={14} /> {city.city}</span>
        <strong>{euroMoney.format(city.planned)}</strong>
      </div>
      <meter min="0" max="100" value={city.lodgingPressure}>{city.lodgingPressure}</meter>
      <dl>
        <div><dt>Lodging pressure</dt><dd>{city.lodgingPressure}%</dd></div>
        <div><dt>Dining forecast</dt><dd>{euroMoney.format(city.diningForecast)}</dd></div>
        <div><dt>Tourist demand</dt><dd>{city.touristDemand}%</dd></div>
      </dl>
      <button type="button" onClick={() => onExpand(city)} aria-label={`Expand ${city.city} intelligence`}>
        Expand City Details
      </button>
    </article>
  );
}

export function CityIntelligenceOverlay({ city, onClose }: { city?: CitySpendProfile; onClose: () => void }) {
  if (!city) return null;
  return (
    <div className="budget-city-overlay" role="presentation">
      <section role="dialog" aria-modal="true" aria-label={`${city.city} intelligence details`}>
        <button type="button" onClick={onClose} aria-label="Close city intelligence">Close</button>
        <h2>{city.city} intelligence details</h2>
        <p>{city.insight}</p>
        <dl>
          <div><dt>lodging pressure</dt><dd>{city.lodgingPressure}%</dd></div>
          <div><dt>dining forecast</dt><dd>{euroMoney.format(city.diningForecast)}</dd></div>
          <div><dt>parking costs</dt><dd>{euroMoney.format(city.parkingCosts)}</dd></div>
          <div><dt>activity density</dt><dd>{city.activityDensity}%</dd></div>
          <div><dt>weather impact</dt><dd>{city.weatherImpact}%</dd></div>
          <div><dt>tourist demand</dt><dd>{city.touristDemand}%</dd></div>
        </dl>
      </section>
    </div>
  );
}
