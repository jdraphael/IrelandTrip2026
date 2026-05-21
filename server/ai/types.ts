import type { BookingTask, BudgetItem, DayPlan, FamilyMember, Lodging, SourceLink, Stop, Trip } from '../../src/types.js';

export type ContextIntent = 'lodging' | 'family' | 'itinerary' | 'transportation' | 'budget' | 'destination' | 'activity' | 'documents' | 'general';

export interface LodgingReservation extends Lodging {
  id: string;
  dayIds: string[];
  dates: string[];
  bases: string[];
  stopIds: string[];
}

export interface TransportSegment {
  id: string;
  dayId?: string;
  day?: number;
  title: string;
  route?: string;
  driveTime?: string;
  distanceMiles?: number;
  base?: string;
  stops: Array<Pick<Stop, 'id' | 'name' | 'kind'>>;
  notes?: string;
}

export interface DestinationContext {
  name: string;
  dayIds: string[];
  dateLabels: string[];
  lodgingNames: string[];
  activityNames: string[];
  coordinates: Array<{ name: string; latitude: number; longitude: number; kind: Stop['kind'] }>;
}

export interface ItineraryContextDay {
  id: string;
  day: number;
  title: string;
  dateLabel: string;
  base: string;
  route?: string;
  driveTime?: string;
  distanceMiles?: number;
  lodgingName?: string;
  lodgingType?: string;
  stopNames: string[];
  notes: string;
}

export interface TripResearchDocument {
  id: string;
  type: 'saved-research' | 'source' | 'itinerary-note' | 'destination-guide' | 'lodging-note' | 'uploaded-document' | 'task-note';
  title: string;
  text: string;
  score?: number;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface TripMemory {
  previousConcerns: string[];
  recommendations: string[];
  selectedOptions: string[];
  rejectedOptions: string[];
}

export interface AIContextUsage {
  tripId: string;
  badges: string[];
  activeWindow: string;
  intents: ContextIntent[];
  retrievedDocumentIds: string[];
  missingData: string[];
}

export interface AITripContext {
  trip: Trip;
  family: {
    travelers: FamilyMember[];
    adults: FamilyMember[];
    children: FamilyMember[];
    ages: number[];
    childAgesKnown: boolean;
    accessibilityNeeds?: string[];
  };
  itinerary: ItineraryContextDay[];
  lodging: LodgingReservation[];
  transportation: TransportSegment[];
  budget: {
    target: number;
    items: BudgetItem[];
    lodgingTotal: number;
    transportationTotal: number;
  };
  tasks: BookingTask[];
  preferences: {
    lodgingStyle: string;
    budgetLevel: string;
    activityPreferences: string[];
  };
  destinations: DestinationContext[];
  savedResearch: TripResearchDocument[];
  uploadedDocuments: TripResearchDocument[];
  sources: SourceLink[];
  memory: TripMemory;
  missingData: string[];
  tripSummary: string;
  contextUsage: AIContextUsage;
}
