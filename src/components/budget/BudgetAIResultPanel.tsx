import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Sparkles, X } from 'lucide-react';
import type { ResearchAnswer, ResearchDraft, SourceLink } from '../../types';

function AnswerText({ text }: { text: string }) {
  return (
    <div className="budget-answer-text">
      {text.replace(/\*\*/g, '').split(/\n{2,}/).map((block, index) => (
        <p key={`${block.slice(0, 18)}-${index}`}>{block.replace(/^- /gm, '* ')}</p>
      ))}
    </div>
  );
}

function BudgetSourceChips({ sources }: { sources: SourceLink[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="budget-source-row">
      {sources.map((source) => (
        <a className="budget-source-chip" href={source.url} target="_blank" rel="noreferrer" key={source.id}>
          {source.title} <ExternalLink size={12} />
        </a>
      ))}
    </div>
  );
}

function budgetDraftTarget(draft: ResearchDraft) {
  const payload = draft.payload as Record<string, unknown>;
  const item = payload.item && typeof payload.item === 'object' ? payload.item as Record<string, unknown> : undefined;
  if (draft.kind === 'budget') return typeof item?.label === 'string' ? `Budget - ${item.label}` : 'Budget';
  return draft.kind;
}

function BudgetDraftReviewCard({
  draft,
  sources,
  onApply,
  onDismiss
}: {
  draft: ResearchDraft;
  sources: SourceLink[];
  onApply: (draft: ResearchDraft) => Promise<void>;
  onDismiss: (draft: ResearchDraft) => Promise<void>;
}) {
  const [applying, setApplying] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const sourceLookup = new Map(sources.map((source) => [source.id, source]));
  const draftSources = (draft.sourceIds || []).map((id) => sourceLookup.get(id)).filter(Boolean) as SourceLink[];

  const apply = async () => {
    setApplying(true);
    try {
      await onApply(draft);
    } finally {
      setApplying(false);
    }
  };

  const dismiss = async () => {
    setDismissing(true);
    try {
      await onDismiss(draft);
    } finally {
      setDismissing(false);
    }
  };

  return (
    <article className="budget-draft-card">
      <div className="budget-draft-head">
        <div>
          <span>{draft.kind} draft</span>
          <h3>{draft.title}</h3>
        </div>
        <strong>{draft.status}</strong>
      </div>
      <p className="budget-draft-target">{budgetDraftTarget(draft)}</p>
      <p>{draft.summary || budgetDraftTarget(draft)}</p>
      <BudgetSourceChips sources={draftSources} />
      {draft.status === 'draft' ? (
        <div className="budget-draft-actions">
          <button type="button" onClick={apply} disabled={applying || dismissing}>
            {applying ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />} Apply Budget Draft
          </button>
          <button type="button" onClick={dismiss} disabled={applying || dismissing}>
            {dismissing ? <Loader2 className="spin" size={14} /> : <X size={14} />} Dismiss Draft
          </button>
        </div>
      ) : draft.status === 'applied' ? (
        <p className="budget-draft-note"><CheckCircle2 size={14} /> Applied to the saved budget.</p>
      ) : (
        <p className="budget-draft-note"><X size={14} /> Dismissed without changing the saved budget.</p>
      )}
    </article>
  );
}

export function BudgetAIResultPanel({
  answer,
  error,
  busy,
  sources,
  onRetry,
  onApplyDraft,
  onDismissDraft
}: {
  answer?: ResearchAnswer;
  error?: string;
  busy?: boolean;
  sources: SourceLink[];
  onRetry?: () => void;
  onApplyDraft: (draft: ResearchDraft) => Promise<void>;
  onDismissDraft: (draft: ResearchDraft) => Promise<void>;
}) {
  if (!answer && !error && !busy) return null;
  return (
    <section className="budget-ai-result" aria-label="Budget AI result">
      <div className="budget-ai-result-head">
        <span><Sparkles size={14} /> Active intelligence</span>
        {busy && <strong><Loader2 className="spin" size={14} /> Researching</strong>}
      </div>
      {error && (
        <div className="budget-ai-error" role="alert">
          <AlertTriangle size={15} />
          <span>{error}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} disabled={busy}>
              Retry Budget AI
            </button>
          )}
        </div>
      )}
      {answer && !error && (
        <>
          <AnswerText text={answer.answer} />
          {answer.warnings.map((warning) => (
            <p className="budget-ai-warning" key={warning}><AlertTriangle size={14} /> {warning}</p>
          ))}
          <BudgetSourceChips sources={answer.sources} />
          {answer.drafts.map((draft) => (
            <BudgetDraftReviewCard
              key={draft.id}
              draft={draft}
              sources={[...sources, ...answer.sources]}
              onApply={onApplyDraft}
              onDismiss={onDismissDraft}
            />
          ))}
        </>
      )}
    </section>
  );
}
