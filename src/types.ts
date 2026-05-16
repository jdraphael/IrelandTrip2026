export type SourceType = 'official' | 'government' | 'travel-guide' | 'unverified';
export type SourceStatus = 'ok' | 'unchecked' | 'unreachable' | 'warning';
export type BudgetStatus = 'researching' | 'watching' | 'quoted' | 'booked' | 'paid';
export type TaskStatus = 'open' | 'done' | 'blocked';
export type DraftKind = 'itinerary' | 'budget' | 'task' | 'note';

export interface Trip {
  id: string;
  title: string;
  month: string;
  year: number;
  travelers: number;
  adults: number;
  children: number;
  origin: string;
  destination: string;
  budgetTarget: number;
  routeSummary: string;
  priorities: string[];
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'parent' | 'child';
  avatarKey?: string;
  taskColor?: string;
}

export interface Stop {
  id: string;
  name: string;
  kind: 'airport' | 'lodging' | 'activity' | 'food' | 'drive-stop' | 'viewpoint';
  latitude: number;
  longitude: number;
  sourceIds?: string[];
  notes?: string;
  costEstimate?: number;
}

export interface Lodging {
  name: string;
  type: 'hotel' | 'aparthotel' | 'airbnb' | 'farm-stay' | 'airport-hotel';
  nightlyEstimate: number;
  sourceIds?: string[];
  notes?: string;
}

export interface PaymentTag {
  id: string;
  kind: 'card' | 'cash';
  label: string;
  network?: 'Visa' | 'Mastercard' | 'American Express' | 'Any';
  minCashEur?: number;
  maxCashEur?: number;
  note?: string;
}

export interface DayPlan {
  id: string;
  day: number;
  title: string;
  dateLabel: string;
  base: string;
  route?: string;
  driveTime?: string;
  distanceMiles?: number;
  lodging?: Lodging;
  stops: Stop[];
  notes: string;
  sourceIds?: string[];
  paymentTags?: PaymentTag[];
}

export interface BudgetItem {
  id: string;
  category: string;
  label: string;
  planned: number;
  actual: number;
  status: BudgetStatus;
  sourceIds?: string[];
  notes?: string;
}

export interface BudgetSummary {
  target: number;
  planned: number;
  actual: number;
  remainingPlanned: number;
  remainingActual: number;
  plannedPercent: number;
  actualPercent: number;
}

export interface BookingTask {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string;
  category: string;
  notes?: string;
  sourceIds?: string[];
  priority?: 'high' | 'medium' | 'low';
  displayCategory?: 'Flights & Travel' | 'Lodging & Stays' | 'Driving in Ireland' | 'Family Prep' | 'Experiences';
  description?: string;
  aiSuggestion?: string;
  imageKey?: string;
  actionLabel?: string;
  subtasksTotal?: number;
  subtasksDone?: number;
  assignedTo?: string[];
  familyImpact?: string;
}

export interface TaskSummary {
  total: number;
  done: number;
  open: number;
  blocked: number;
  nextTask?: BookingTask;
}

export interface SourceLink {
  id: string;
  title: string;
  url: string;
  sourceType: SourceType;
  checkedAt: string;
  status: SourceStatus;
  notes?: string;
}

export interface SourceSummary {
  total: number;
  officialCount: number;
  warningCount: number;
  warnings: string[];
}

export interface ItineraryPatchDraftPayload {
  mode?: 'patch';
  dayId: string;
  patch: Partial<DayPlan>;
}

export interface ItineraryReplaceDraftPayload {
  mode: 'replace';
  days: DayPlan[];
  removedDayIds?: string[];
  combinedDayIds?: string[];
}

export type ItineraryDraftPayload = ItineraryPatchDraftPayload | ItineraryReplaceDraftPayload;

export interface BudgetDraftPayload {
  item: BudgetItem;
}

export interface TaskDraftPayload {
  task: BookingTask;
}

export type ResearchDraftPayload = ItineraryDraftPayload | BudgetDraftPayload | TaskDraftPayload | Record<string, unknown>;

export interface ResearchDraft {
  id: string;
  kind: DraftKind;
  title: string;
  summary?: string;
  createdAt: string;
  status: 'draft' | 'applied' | 'dismissed';
  payload: ResearchDraftPayload;
  sourceIds?: string[];
}

export interface ResearchAnswer {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  sources: SourceLink[];
  drafts: ResearchDraft[];
  warnings: string[];
}
