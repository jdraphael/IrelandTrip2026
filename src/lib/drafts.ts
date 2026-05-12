import type { BookingTask, BudgetItem, DayPlan, ItineraryDraftPayload, ResearchDraft, Stop } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidStop(value: unknown): value is Stop {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.kind) &&
    isNumber(value.latitude) &&
    isNumber(value.longitude)
  );
}

export function isItineraryDraftPayload(payload: unknown): payload is ItineraryDraftPayload {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<ItineraryDraftPayload>;
  const stops = Array.isArray(candidate.patch?.stops) ? candidate.patch.stops : [];
  return typeof candidate.dayId === 'string' && !!candidate.patch && typeof candidate.patch === 'object' && stops.every(isValidStop);
}

function isBudgetItem(value: unknown): value is BudgetItem {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.category) &&
    isNonEmptyString(value.label) &&
    isNumber(value.planned) &&
    isNumber(value.actual) &&
    ['researching', 'watching', 'quoted', 'booked', 'paid'].includes(String(value.status))
  );
}

function isBookingTask(value: unknown): value is BookingTask {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.category) &&
    isNonEmptyString(value.dueDate) &&
    ['open', 'done', 'blocked'].includes(String(value.status))
  );
}

export function isBudgetDraftPayload(payload: unknown): payload is { item: BudgetItem } {
  return isRecord(payload) && isBudgetItem(payload.item);
}

export function isTaskDraftPayload(payload: unknown): payload is { task: BookingTask } {
  return isRecord(payload) && isBookingTask(payload.task);
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  let found = false;
  const updated = items.map((current) => {
    if (current.id !== item.id) return current;
    found = true;
    return { ...current, ...item };
  });
  return found ? updated : [...updated, item];
}

export function applyResearchDraft(itinerary: DayPlan[], draft: ResearchDraft): DayPlan[] {
  if (draft.kind !== 'itinerary' || !isItineraryDraftPayload(draft.payload)) {
    throw new Error('Invalid itinerary draft payload');
  }
  const payload = draft.payload;
  if (!itinerary.some((day) => day.id === payload.dayId)) {
    throw new Error('Draft target day was not found');
  }

  return itinerary.map((day) => {
    if (day.id !== payload.dayId) {
      return { ...day, stops: [...day.stops] };
    }
    const incomingStops = payload.patch.stops || [];
    const stops = incomingStops.reduce((current, stop) => upsertById(current, stop), [...day.stops]);
    const { stops: _ignoredStops, ...patch } = payload.patch;

    return {
      ...day,
      ...patch,
      stops
    };
  });
}

export function applyBudgetDraft(items: BudgetItem[], draft: ResearchDraft): BudgetItem[] {
  if (draft.kind !== 'budget' || !isBudgetDraftPayload(draft.payload)) {
    throw new Error('Invalid budget draft payload');
  }
  return upsertById(items, draft.payload.item);
}

export function applyTaskDraft(tasks: BookingTask[], draft: ResearchDraft): BookingTask[] {
  if (draft.kind !== 'task' || !isTaskDraftPayload(draft.payload)) {
    throw new Error('Invalid task draft payload');
  }
  return upsertById(tasks, draft.payload.task);
}
