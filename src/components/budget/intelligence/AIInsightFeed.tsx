import { Sparkles } from 'lucide-react';
import type { SavingsEstimate } from '../../../lib/budgetIntelligence';

export function AIInsightFeed({ savings, onAsk }: { savings: SavingsEstimate; onAsk: () => void }) {
  return (
    <div className="budget-intel-ai-feed">
      {savings.recommendations.map((recommendation) => (
        <article key={recommendation.id}>
          <span><Sparkles size={15} /></span>
          <div>
            <p>{recommendation.message}</p>
            <small>{recommendation.source}</small>
          </div>
          <strong>{recommendation.confidence}</strong>
        </article>
      ))}
      <button type="button" onClick={onAsk}>View all insights</button>
    </div>
  );
}
