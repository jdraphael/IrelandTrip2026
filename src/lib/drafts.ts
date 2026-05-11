import type { DayPlan, ResearchDraft } from '../types';

interface ItineraryDraftPayload {
  dayId: string;
  patch: Partial<DayPlan>;
}

function isItineraryDraftPayload(payload: unknown): payload is ItineraryDraftPayload {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<ItineraryDraftPayload>;
  return typeof candidate.dayId === 'string' && !!candidate.patch && typeof candidate.patch === 'object';
}

export function applyResearchDraft(itinerary: DayPlan[], draft: ResearchDraft): DayPlan[] {
  if (draft.kind !== 'itinerary' || !isItineraryDraftPayload(draft.payload)) {
    return itinerary.map((day) => ({ ...day, stops: [...day.stops] }));
  }
  const payload = draft.payload;

  return itinerary.map((day) => {
    if (day.id !== payload.dayId) {
      return { ...day, stops: [...day.stops] };
    }

    return {
      ...day,
      ...payload.patch,
      stops: payload.patch.stops ? [...payload.patch.stops] : [...day.stops]
    };
  });
}
