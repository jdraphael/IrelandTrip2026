import type { BookingTask, BudgetItem, DayPlan, ItineraryDraftPayload, ItineraryPatchDraftPayload, ItineraryReplaceDraftPayload, PaymentTag, ResearchDraft, Stop } from '../types';

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

function isValidPaymentTag(value: unknown): value is PaymentTag {
  if (!isRecord(value)) return false;
  const kind = String(value.kind);
  const network = typeof value.network === 'string' ? value.network : undefined;
  return (
    isNonEmptyString(value.id) &&
    (kind === 'card' || kind === 'cash') &&
    isNonEmptyString(value.label) &&
    (network === undefined || ['Visa', 'Mastercard', 'American Express', 'Any'].includes(network)) &&
    (value.minCashEur === undefined || isNumber(value.minCashEur)) &&
    (value.maxCashEur === undefined || isNumber(value.maxCashEur)) &&
    (value.note === undefined || typeof value.note === 'string')
  );
}

function isDayPlan(value: unknown): value is DayPlan {
  if (!isRecord(value)) return false;
  const stops = Array.isArray(value.stops) ? value.stops : [];
  const paymentTags = Array.isArray(value.paymentTags) ? value.paymentTags : [];
  return (
    isNonEmptyString(value.id) &&
    isNumber(value.day) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.dateLabel) &&
    isNonEmptyString(value.base) &&
    typeof value.notes === 'string' &&
    Array.isArray(value.stops) &&
    stops.every(isValidStop) &&
    (value.paymentTags === undefined || (Array.isArray(value.paymentTags) && paymentTags.every(isValidPaymentTag)))
  );
}

function isTravelDay(day: DayPlan) {
  return /travel|fly|flight|airport/i.test(`${day.title} ${day.base} ${day.route || ''}`);
}

export function isItineraryPatchDraftPayload(payload: unknown): payload is ItineraryPatchDraftPayload {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<ItineraryPatchDraftPayload>;
  const stops = Array.isArray(candidate.patch?.stops) ? candidate.patch.stops : [];
  const paymentTags = Array.isArray(candidate.patch?.paymentTags) ? candidate.patch.paymentTags : [];
  return (
    (candidate.mode === undefined || candidate.mode === 'patch') &&
    typeof candidate.dayId === 'string' &&
    !!candidate.patch &&
    typeof candidate.patch === 'object' &&
    stops.every(isValidStop) &&
    (candidate.patch.paymentTags === undefined || (Array.isArray(candidate.patch.paymentTags) && paymentTags.every(isValidPaymentTag)))
  );
}

export function assertValidReplacementDays(days: DayPlan[]) {
  if (!Array.isArray(days) || days.length === 0 || !days.every(isDayPlan)) {
    throw new Error('Invalid replacement itinerary days');
  }

  const ids = new Set<string>();
  for (const [index, day] of days.entries()) {
    if (ids.has(day.id)) throw new Error('Replacement itinerary days must have unique ids');
    ids.add(day.id);
    if (day.day !== index + 1) throw new Error('Replacement itinerary days must be sequential');
    if (isTravelDay(day) && day.stops.length === 0) throw new Error('Travel days must include at least one stop');
  }
}

export function isItineraryReplaceDraftPayload(payload: unknown): payload is ItineraryReplaceDraftPayload {
  if (!isRecord(payload) || payload.mode !== 'replace' || !Array.isArray(payload.days)) return false;
  try {
    assertValidReplacementDays(payload.days);
    return true;
  } catch {
    return false;
  }
}

export function isItineraryDraftPayload(payload: unknown): payload is ItineraryDraftPayload {
  return isItineraryPatchDraftPayload(payload) || isItineraryReplaceDraftPayload(payload);
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
  if (draft.kind !== 'itinerary') {
    throw new Error('Invalid itinerary draft payload');
  }
  if (isRecord(draft.payload) && draft.payload.mode === 'replace') {
    if (!Array.isArray(draft.payload.days)) throw new Error('Invalid replacement itinerary days');
    assertValidReplacementDays(draft.payload.days as DayPlan[]);
    return (draft.payload.days as DayPlan[]).map((day) => ({
      ...day,
      stops: [...day.stops],
      lodging: day.lodging ? { ...day.lodging } : undefined,
      paymentTags: day.paymentTags ? day.paymentTags.map((tag) => ({ ...tag })) : undefined
    }));
  }
  if (!isItineraryPatchDraftPayload(draft.payload)) {
    throw new Error('Invalid itinerary draft payload');
  }
  const payload = draft.payload;
  if (!itinerary.some((day) => day.id === payload.dayId)) {
    throw new Error('Draft target day was not found');
  }

  return itinerary.map((day) => {
    if (day.id !== payload.dayId) {
      return { ...day, stops: [...day.stops], paymentTags: day.paymentTags ? day.paymentTags.map((tag) => ({ ...tag })) : undefined };
    }
    const incomingStops = payload.patch.stops || [];
    const stops = incomingStops.reduce((current, stop) => upsertById(current, stop), [...day.stops]);
    const paymentTags = payload.patch.paymentTags
      ? payload.patch.paymentTags.map((tag) => ({ ...tag }))
      : day.paymentTags?.map((tag) => ({ ...tag }));
    const { stops: _ignoredStops, paymentTags: _ignoredPaymentTags, ...patch } = payload.patch;

    return {
      ...day,
      ...patch,
      stops,
      paymentTags
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
