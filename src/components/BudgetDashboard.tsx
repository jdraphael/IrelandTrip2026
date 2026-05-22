import type { BudgetResponse } from '../api';
import type { BudgetItem, DayPlan, ResearchAnswer, ResearchDraft, SourceLink, Trip } from '../types';
import { BudgetIntelligenceCenter } from './budget/BudgetIntelligenceCenter';
import { BudgetWorkspace } from './budget/BudgetWorkspace';

export interface BudgetDashboardProps {
  budget?: BudgetResponse;
  trip?: Trip;
  itinerary?: DayPlan[];
  sources?: SourceLink[];
  view?: 'workspace' | 'intelligence';
  onOpenWorkspace?: () => void;
  onOpenIntelligence?: () => void;
  onSave: (items: Partial<BudgetItem>[]) => Promise<void>;
  onAsk: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>;
  onApplyDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
  onDismissDraft: (draft: ResearchDraft) => Promise<ResearchDraft | void>;
}

export function BudgetDashboard({ view = 'workspace', ...props }: BudgetDashboardProps) {
  if (view === 'intelligence') {
    return <BudgetIntelligenceCenter {...props} />;
  }
  return <BudgetWorkspace {...props} />;
}
