import { motion } from 'framer-motion';
import { ArrowRight, Save, Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { BudgetItem } from '../../types';
import { displayFor, euroMoney, pct } from './budgetShared';

export function BudgetCategoryCard({
  item,
  draft,
  syncState,
  onDraft,
  onSelect,
  onSave
}: {
  item: BudgetItem;
  draft: Partial<BudgetItem>;
  syncState?: 'synced' | 'muted';
  onDraft: (next: Partial<BudgetItem>) => void;
  onSelect: () => void;
  onSave: () => void;
}) {
  const presentation = displayFor(item);
  const Icon = presentation.icon;
  const planned = draft.planned ?? item.planned;
  const actual = draft.actual ?? item.actual;
  const remaining = planned - actual;
  const progress = pct(actual, planned);

  return (
    <motion.article
      layout
      className={`budget-category-card ${syncState === 'synced' ? 'is-synced' : ''} ${syncState === 'muted' ? 'is-muted' : ''}`}
      aria-label={`Budget category ${presentation.title}`}
      onClick={onSelect}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
    >
      <div className="budget-category-image">
        <img src={presentation.image} alt="" loading="lazy" />
        <span><Icon size={22} /></span>
      </div>
      <div className="budget-category-body">
        <div className="budget-category-copy">
          <h3>{presentation.title}</h3>
          <p>{presentation.description}</p>
        </div>
        <div className="budget-card-numbers">
          <label>
            <span>Planned</span>
            <input
              aria-label="Planned amount"
              type="number"
              value={planned}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onDraft({ id: item.id, planned: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Actual</span>
            <input
              aria-label="Actual amount"
              type="number"
              value={actual}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onDraft({ id: item.id, actual: Number(event.target.value) })}
            />
          </label>
          <div>
            <span>Remaining</span>
            <strong>{euroMoney.format(remaining)}</strong>
          </div>
        </div>
        <div className="budget-progress-row">
          <span className="budget-progress-track"><i style={{ width: `${progress}%` } as CSSProperties} /></span>
          <strong>{progress}%</strong>
        </div>
        <div className={`budget-card-insight budget-card-insight-${presentation.tone}`}>
          <Sparkles size={14} />
          <span><strong>AI Insight:</strong> {presentation.insight}</span>
        </div>
        <div className="budget-card-actions">
          <span>{presentation.recommendation}</span>
          <button className="button secondary compact" type="button" onClick={(event) => { event.stopPropagation(); onSave(); }} aria-label={`Save ${presentation.title}`}>
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>
      <ArrowRight className="budget-card-arrow" size={18} aria-hidden="true" />
    </motion.article>
  );
}
