import type { BookingTask, BudgetItem, BudgetSummary, DayPlan, FamilyMember, ResearchAnswer, ResearchDraft, SourceLink, SourceSummary, TaskAttachment, TaskSummary, Trip } from './types';

export interface BudgetResponse {
  items: BudgetItem[];
  summary: BudgetSummary;
}

export interface TasksResponse {
  items: BookingTask[];
  summary: TaskSummary;
}

export interface SourcesResponse {
  items: SourceLink[];
  summary: SourceSummary;
}

export interface SessionResponse {
  authRequired: boolean;
  authenticated: boolean;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    credentials: 'same-origin',
    ...init
  });
  if (!response.ok) {
    const text = await response.text();
    try {
      const body = JSON.parse(text) as { error?: unknown };
      if (typeof body.error === 'string') throw new Error(body.error);
    } catch (error) {
      if (error instanceof Error && error.name !== 'SyntaxError') throw error;
    }
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  session: () => request<SessionResponse>('/api/auth/session'),
  login: (passcode: string) => request<SessionResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ passcode }) }),
  logout: () => request<SessionResponse>('/api/auth/logout', { method: 'POST' }),
  trip: () => request<Trip>('/api/trip'),
  familyMembers: () => request<FamilyMember[]>('/api/family-members'),
  saveFamilyMembers: (members: FamilyMember[]) => request<FamilyMember[]>('/api/family-members', { method: 'PATCH', body: JSON.stringify(members) }),
  itinerary: () => request<DayPlan[]>('/api/itinerary'),
  saveItinerary: (days: Partial<DayPlan>[]) => request<DayPlan[]>('/api/itinerary', { method: 'PATCH', body: JSON.stringify(days) }),
  budget: () => request<BudgetResponse>('/api/budget'),
  saveBudget: (items: Partial<BudgetItem>[]) => request<BudgetResponse>('/api/budget', { method: 'PATCH', body: JSON.stringify(items) }),
  tasks: () => request<TasksResponse>('/api/tasks'),
  saveTasks: (items: Partial<BookingTask>[]) => request<TasksResponse>('/api/tasks', { method: 'PATCH', body: JSON.stringify(items) }),
  createTaskItineraryDraft: (id: string, summary: string) => request<ResearchDraft>(`/api/tasks/${id}/itinerary-draft`, { method: 'POST', body: JSON.stringify({ summary }) }),
  uploadTaskAttachment: (payload: { fileName: string; contentType: string; dataBase64: string; note?: string }) => request<TaskAttachment>('/api/uploads', { method: 'POST', body: JSON.stringify(payload) }),
  sources: () => request<SourcesResponse>('/api/sources'),
  checkSource: (url: string, title?: string) => request<SourceLink>('/api/sources/check', { method: 'POST', body: JSON.stringify({ url, title }) }),
  researchHistory: () => request<ResearchAnswer[]>('/api/research'),
  askResearch: (question: string, deep = false, context?: string) => request<ResearchAnswer>('/api/research', { method: 'POST', body: JSON.stringify({ question, deep, context }) }),
  applyDraft: (id: string) => request<ResearchDraft>(`/api/research/drafts/${id}/apply`, { method: 'POST' })
};
