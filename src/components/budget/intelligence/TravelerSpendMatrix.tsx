import type { TravelerSpendProfile } from '../../../lib/budgetIntelligence';
import { euroMoney } from '../budgetShared';

export function TravelerSpendMatrix({ travelers }: { travelers: TravelerSpendProfile[] }) {
  return (
    <div className="budget-intel-traveler-matrix">
      {travelers.map((traveler) => (
        <article key={traveler.id}>
          <span>{traveler.label}</span>
          <strong>{euroMoney.format(traveler.planned)}</strong>
          <small>{euroMoney.format(traveler.perDay)} / day</small>
        </article>
      ))}
    </div>
  );
}
