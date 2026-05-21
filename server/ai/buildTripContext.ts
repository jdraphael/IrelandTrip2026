import type { TripDatabase } from '../tripDatabase.js';
import type { AITripContext, ContextIntent } from './types.js';
import {
  buildTripResearchDocuments,
  getCurrentItinerary,
  getDestinationNotes,
  getFamilyProfiles,
  getTransportationContext,
  getTripLodging,
  getTripMemory,
  getUploadedDocuments,
  searchTripResearch,
  summarizeBudget
} from './retrieval.js';
import { inferContextIntents } from './vectorSearch.js';

interface BuildTripContextOptions {
  db: TripDatabase;
  question: string;
  interfaceContext?: string;
}

function budgetLevel(target: number) {
  if (target >= 18000) return 'premium-flexible';
  if (target >= 12000) return 'comfort-conscious';
  return 'value-focused';
}

function inferLodgingStyle(lodgingTypes: string[]) {
  if (lodgingTypes.some((type) => /aparthotel|airbnb|farm|cottage/i.test(type))) return 'family-space-first';
  if (lodgingTypes.some((type) => /hotel/i.test(type))) return 'hotel-with-family-room-validation';
  return 'not yet selected';
}

function missingData(context: Pick<AITripContext, 'family' | 'lodging' | 'transportation'>) {
  const missing: string[] = [];
  if (!context.family.childAgesKnown) missing.push('Some child ages are missing from the family profile.');
  if (context.lodging.length === 0) missing.push('No lodging selections are saved yet.');
  if (context.transportation.length === 0) missing.push('No transportation plan is saved yet.');
  return missing;
}

function usageBadges(intents: ContextIntent[], context: Pick<AITripContext, 'family' | 'itinerary' | 'lodging' | 'transportation' | 'budget' | 'savedResearch' | 'uploadedDocuments'>) {
  const badges = ['Using family profile data'];
  if (context.itinerary.length > 0 && context.lodging.length > 0) badges.push('Using itinerary + lodging context');
  if (context.transportation.length > 0 && intents.includes('transportation')) badges.push('Using transportation plan');
  if (context.budget.items.length > 0 && intents.includes('budget')) badges.push('Using budget data');
  if (context.savedResearch.length > 0) badges.push('Using saved research memory');
  if (context.uploadedDocuments.length > 0) badges.push('Using uploaded documents');
  return badges;
}

function activeWindow(itinerary: AITripContext['itinerary']) {
  if (itinerary.length === 0) return 'No itinerary days available';
  const first = itinerary[0];
  const last = itinerary[itinerary.length - 1];
  if (first.id === last.id) return `Day ${first.day}: ${first.title}`;
  return `Days ${first.day}-${last.day}: ${first.base} to ${last.base}`;
}

export async function buildTripContext({ db, question, interfaceContext = '' }: BuildTripContextOptions): Promise<AITripContext> {
  const [trip, familyMembers, fullItinerary, budgetItems, tasks, sources, researchAnswers] = await Promise.all([
    db.getTrip(),
    db.getFamilyMembers(),
    db.getItinerary(),
    db.getBudget(),
    db.getTasks(),
    db.getSources(),
    db.getResearchAnswers()
  ]);

  const intents = inferContextIntents(`${interfaceContext} ${question}`);
  const family = await getFamilyProfiles(familyMembers);
  const itinerary = getCurrentItinerary(fullItinerary, question);
  const lodging = getTripLodging(fullItinerary);
  const transportation = getTransportationContext(fullItinerary, tasks);
  const budget = summarizeBudget(budgetItems, trip.budgetTarget);
  const destinations = getDestinationNotes(fullItinerary);
  const allResearchDocuments = buildTripResearchDocuments({ trip, itinerary: fullItinerary, tasks, sources, researchAnswers });
  const retrievedResearch = searchTripResearch(question, allResearchDocuments);
  const uploadedDocuments = getUploadedDocuments(tasks, question);
  const contextDraft = { family, itinerary, lodging, transportation, budget, savedResearch: retrievedResearch, uploadedDocuments };
  const missing = missingData(contextDraft);

  const tripSummary = [
    `${trip.title}: ${trip.month} ${trip.year}, ${trip.travelers} travelers (${trip.adults} adults, ${trip.children} children), ${trip.origin} to ${trip.destination}.`,
    `Route: ${trip.routeSummary}.`,
    `Priorities: ${trip.priorities.join(', ')}.`
  ].join(' ');

  return {
    trip,
    family,
    itinerary,
    lodging,
    transportation,
    budget,
    tasks,
    preferences: {
      lodgingStyle: inferLodgingStyle(lodging.map((stay) => stay.type)),
      budgetLevel: budgetLevel(trip.budgetTarget),
      activityPreferences: trip.priorities
    },
    destinations,
    savedResearch: retrievedResearch,
    uploadedDocuments,
    sources,
    memory: getTripMemory(researchAnswers),
    missingData: missing,
    tripSummary,
    contextUsage: {
      tripId: trip.id,
      badges: usageBadges(intents, contextDraft),
      activeWindow: activeWindow(itinerary),
      intents,
      retrievedDocumentIds: [...retrievedResearch, ...uploadedDocuments].map((document) => document.id),
      missingData: missing
    }
  };
}
