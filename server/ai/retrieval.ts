import { calculateBudgetSummary } from '../../src/lib/budget.js';
import type { BookingTask, BudgetItem, DayPlan, FamilyMember, SourceLink, Stop, Trip } from '../../src/types.js';
import type { DestinationContext, ItineraryContextDay, LodgingReservation, TransportSegment, TripMemory, TripResearchDocument } from './types.js';
import { inferContextIntents, searchTripResearch as rankTripResearch } from './vectorSearch.js';

function compactDay(day: DayPlan): ItineraryContextDay {
  return {
    id: day.id,
    day: day.day,
    title: day.title,
    dateLabel: day.dateLabel,
    base: day.base,
    route: day.route,
    driveTime: day.driveTime,
    distanceMiles: day.distanceMiles,
    lodgingName: day.lodging?.name,
    lodgingType: day.lodging?.type,
    stopNames: day.stops.map((stop) => stop.name),
    notes: day.notes
  };
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function pushMapArray<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue) {
  const current = map.get(key) || [];
  current.push(value);
  map.set(key, current);
}

function sourceTitles(sourceIds: string[] | undefined, sources: SourceLink[]) {
  if (!sourceIds?.length) return [];
  const byId = new Map(sources.map((source) => [source.id, source]));
  return sourceIds.map((id) => byId.get(id)?.title).filter(Boolean) as string[];
}

export async function getFamilyProfiles(members: FamilyMember[]) {
  const adults = members.filter((member) => member.role === 'parent');
  const children = members.filter((member) => member.role === 'child');
  const ages = children.map((member) => member.age).filter((age): age is number => typeof age === 'number');
  return {
    travelers: members,
    adults,
    children,
    ages,
    childAgesKnown: children.length > 0 && ages.length === children.length
  };
}

export function getTripLodging(itinerary: DayPlan[]): LodgingReservation[] {
  const byName = new Map<string, LodgingReservation>();
  for (const day of itinerary) {
    if (day.lodging?.name) {
      const existing = byName.get(day.lodging.name);
      if (existing) {
        existing.dayIds.push(day.id);
        existing.dates.push(day.dateLabel);
        existing.bases.push(day.base);
      } else {
        byName.set(day.lodging.name, {
          ...day.lodging,
          id: day.lodging.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          dayIds: [day.id],
          dates: [day.dateLabel],
          bases: [day.base],
          stopIds: []
        });
      }
    }
    for (const stop of day.stops.filter((item) => item.kind === 'lodging')) {
      const existing = byName.get(stop.name);
      if (existing) {
        existing.stopIds.push(stop.id);
      } else {
        byName.set(stop.name, {
          id: stop.id,
          name: stop.name,
          type: 'hotel',
          nightlyEstimate: 0,
          sourceIds: stop.sourceIds,
          notes: stop.notes,
          dayIds: [day.id],
          dates: [day.dateLabel],
          bases: [day.base],
          stopIds: [stop.id]
        });
      }
    }
  }
  return [...byName.values()].map((stay) => ({
    ...stay,
    dayIds: unique(stay.dayIds),
    dates: unique(stay.dates),
    bases: unique(stay.bases),
    stopIds: unique(stay.stopIds)
  }));
}

export function getCurrentItinerary(itinerary: DayPlan[], question = '') {
  const questionLower = question.toLowerCase();
  const referencedDay = questionLower.match(/\bday\s*(\d{1,2})\b/)?.[1];
  if (referencedDay) {
    const dayNumber = Number(referencedDay);
    return itinerary.filter((day) => Math.abs(day.day - dayNumber) <= 1).map(compactDay);
  }

  const mentionedBases = unique(itinerary.map((day) => day.base)).filter((base) => questionLower.includes(base.toLowerCase()));
  if (mentionedBases.length > 0) {
    return itinerary.filter((day) => mentionedBases.includes(day.base)).map(compactDay);
  }

  const intents = inferContextIntents(question);
  if (intents.includes('lodging')) return itinerary.filter((day) => day.lodging || day.stops.some((stop) => stop.kind === 'lodging')).map(compactDay);
  if (intents.includes('transportation')) return itinerary.filter((day) => day.route || day.driveTime || day.stops.some((stop) => stop.kind === 'airport')).map(compactDay);
  return itinerary.map(compactDay);
}

export function getTransportationContext(itinerary: DayPlan[], tasks: BookingTask[]): TransportSegment[] {
  const daySegments = itinerary
    .filter((day) => day.route || day.driveTime || day.distanceMiles || day.stops.some((stop) => stop.kind === 'airport'))
    .map((day) => ({
      id: `transport-${day.id}`,
      dayId: day.id,
      day: day.day,
      title: day.title,
      route: day.route,
      driveTime: day.driveTime,
      distanceMiles: day.distanceMiles,
      base: day.base,
      stops: day.stops.filter((stop) => stop.kind === 'airport' || stop.kind === 'drive-stop' || stop.kind === 'lodging').map((stop) => ({ id: stop.id, name: stop.name, kind: stop.kind })),
      notes: day.notes
    }));
  const taskSegments = tasks
    .filter((task) => /flight|rental|drive|car|parking|route|map|toll/i.test(`${task.category} ${task.title} ${task.description || ''} ${task.notes || ''}`))
    .map((task) => ({
      id: `transport-task-${task.id}`,
      title: task.title,
      route: task.planningFields?.route,
      stops: [],
      notes: [task.description, task.notes, task.decisionSummary, task.detailedNotes].filter(Boolean).join(' ')
    }));
  return [...daySegments, ...taskSegments];
}

export function getDestinationNotes(itinerary: DayPlan[]): DestinationContext[] {
  const byBase = new Map<string, DayPlan[]>();
  for (const day of itinerary) pushMapArray(byBase, day.base, day);
  return [...byBase.entries()]
    .filter(([name]) => !/flight|travel home|in flight/i.test(name))
    .map(([name, days]) => ({
      name,
      dayIds: days.map((day) => day.id),
      dateLabels: unique(days.map((day) => day.dateLabel)),
      lodgingNames: unique(days.map((day) => day.lodging?.name).filter(Boolean) as string[]),
      activityNames: unique(days.flatMap((day) => day.stops.filter((stop) => stop.kind === 'activity' || stop.kind === 'viewpoint' || stop.kind === 'drive-stop').map((stop) => stop.name))),
      coordinates: days.flatMap((day) => day.stops.map((stop) => ({ name: stop.name, latitude: stop.latitude, longitude: stop.longitude, kind: stop.kind })))
    }));
}

function taskDocument(task: BookingTask): TripResearchDocument {
  const attachments = (task.attachments || []).map((attachment) => `${attachment.name}${attachment.note ? `: ${attachment.note}` : ''}`).join(' ');
  return {
    id: `task-${task.id}`,
    type: 'task-note',
    title: task.title,
    text: [task.description, task.notes, task.aiSuggestion, task.decisionSummary, task.detailedNotes, Object.values(task.planningFields || {}).join(' '), attachments].filter(Boolean).join(' '),
    metadata: { taskId: task.id, status: task.status, category: task.category }
  };
}

export function buildTripResearchDocuments({
  trip,
  itinerary,
  tasks,
  sources,
  researchAnswers
}: {
  trip: Trip;
  itinerary: DayPlan[];
  tasks: BookingTask[];
  sources: SourceLink[];
  researchAnswers: Array<{ id: string; question: string; answer: string; createdAt: string }>;
}) {
  const itineraryDocs: TripResearchDocument[] = itinerary.flatMap((day) => {
    const docs: TripResearchDocument[] = [{
      id: `itinerary-note-${day.id}`,
      type: 'itinerary-note',
      title: `${day.title} (${day.dateLabel})`,
      text: [day.base, day.route, day.driveTime, day.lodging?.name, day.lodging?.notes, day.notes, day.stops.map((stop) => `${stop.name} ${stop.notes || ''}`).join(' ')].filter(Boolean).join(' '),
      metadata: { dayId: day.id, day: day.day, base: day.base }
    }];
    if (day.lodging) {
      docs.push({
        id: `lodging-note-${day.id}`,
        type: 'lodging-note',
        title: day.lodging.name,
        text: [day.base, day.dateLabel, day.lodging.type, day.lodging.notes, sourceTitles(day.lodging.sourceIds, sources).join(' ')].filter(Boolean).join(' '),
        metadata: { dayId: day.id, base: day.base, lodgingType: day.lodging.type }
      });
    }
    return docs;
  });

  const sourceDocs: TripResearchDocument[] = sources.map((source) => ({
    id: `source-${source.id}`,
    type: 'source',
    title: source.title,
    text: [source.title, source.url, source.sourceType, source.status, source.notes].filter(Boolean).join(' '),
    metadata: { sourceId: source.id, status: source.status, sourceType: source.sourceType }
  }));

  const savedResearchDocs: TripResearchDocument[] = researchAnswers.map((answer) => ({
    id: `research-${answer.id}`,
    type: 'saved-research',
    title: answer.question,
    text: answer.answer,
    metadata: { createdAt: answer.createdAt }
  }));

  const taskDocs = tasks.map(taskDocument);
  const destinationDocs = getDestinationNotes(itinerary).map((destination) => ({
    id: `destination-${destination.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'destination-guide' as const,
    title: destination.name,
    text: `${destination.name}: ${destination.activityNames.join(', ')}. Lodging: ${destination.lodgingNames.join(', ')}. Trip: ${trip.routeSummary}`,
    metadata: { dayCount: destination.dayIds.length }
  }));
  return [...itineraryDocs, ...sourceDocs, ...savedResearchDocs, ...taskDocs, ...destinationDocs];
}

export function searchTripResearch(question: string, documents: TripResearchDocument[]) {
  return rankTripResearch({ question, documents, limit: 10 });
}

export function getUploadedDocuments(tasks: BookingTask[], question: string) {
  const documents = tasks.flatMap((task) => (task.attachments || []).map((attachment) => ({
    id: `upload-${attachment.id}`,
    type: 'uploaded-document' as const,
    title: attachment.name,
    text: [task.title, attachment.name, attachment.contentType, attachment.note].filter(Boolean).join(' '),
    metadata: { taskId: task.id, url: attachment.url, size: attachment.size }
  })));
  return rankTripResearch({ question, documents, limit: 5 });
}

export function getTripMemory(researchAnswers: Array<{ answer: string; drafts?: Array<{ title: string; status: string; summary?: string }> }>): TripMemory {
  const recentText = researchAnswers.slice(0, 8).map((answer) => answer.answer).join('\n');
  const drafts = researchAnswers.flatMap((answer) => answer.drafts || []);
  return {
    previousConcerns: [...recentText.matchAll(/(?:concern|risk|watch|avoid)[^.\n]*/gi)].map((match) => match[0]).slice(0, 6),
    recommendations: [...recentText.matchAll(/(?:recommend|best|safest|prefer)[^.\n]*/gi)].map((match) => match[0]).slice(0, 6),
    selectedOptions: drafts.filter((draft) => draft.status === 'applied').map((draft) => draft.title),
    rejectedOptions: drafts.filter((draft) => draft.status === 'dismissed').map((draft) => draft.title)
  };
}

export function summarizeBudget(items: BudgetItem[], target: number) {
  const summary = calculateBudgetSummary(items, target);
  return {
    target,
    items,
    lodgingTotal: items.filter((item) => /lodging|hotel|stay|airbnb/i.test(`${item.category} ${item.label}`)).reduce((total, item) => total + item.planned, 0),
    transportationTotal: items.filter((item) => /flight|transport|car|rental/i.test(`${item.category} ${item.label}`)).reduce((total, item) => total + item.planned, 0),
    summary
  };
}
