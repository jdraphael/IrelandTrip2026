import type { BookingTask, BudgetItem, DayPlan, FamilyMember, ResearchAnswer, ResearchDraft, SourceLink, Trip } from '../src/types.js';

export interface TripDatabase {
  getTrip(): Promise<Trip>;
  saveTrip(trip: Trip): Promise<Trip>;
  getFamilyMembers(): Promise<FamilyMember[]>;
  saveFamilyMembers(members: FamilyMember[]): Promise<FamilyMember[]>;
  getItinerary(): Promise<DayPlan[]>;
  saveItinerary(itinerary: DayPlan[]): Promise<DayPlan[]>;
  getBudget(): Promise<BudgetItem[]>;
  saveBudget(budget: BudgetItem[]): Promise<BudgetItem[]>;
  getTasks(): Promise<BookingTask[]>;
  saveTasks(tasks: BookingTask[]): Promise<BookingTask[]>;
  getSources(): Promise<SourceLink[]>;
  saveSources(sources: SourceLink[]): Promise<SourceLink[]>;
  getDrafts(): Promise<ResearchDraft[]>;
  saveDrafts(drafts: ResearchDraft[]): Promise<ResearchDraft[]>;
  getResearchAnswers(): Promise<ResearchAnswer[]>;
  saveResearchAnswers(answers: ResearchAnswer[]): Promise<ResearchAnswer[]>;
  close(): void;
}
