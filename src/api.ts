import type { BookingTask, BudgetItem, BudgetSummary, DayPlan, ResearchAnswer, ResearchDraft, SourceLink, SourceSummary, TaskSummary, Trip } from './types';

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
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  session: () => request<SessionResponse>('/api/auth/session'),
  login: (passcode: string) => request<SessionResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ passcode }) }),
  logout: () => request<SessionResponse>('/api/auth/logout', { method: 'POST' }),
  trip: () => request<Trip>('/api/trip'),
  itinerary: () => request<DayPlan[]>('/api/itinerary'),
  saveItinerary: (days: Partial<DayPlan>[]) => request<DayPlan[]>('/api/itinerary', { method: 'PATCH', body: JSON.stringify(days) }),
  generateItineraryDraft: (dayId: string) => request<ResearchDraft>('/api/itinerary/generate', { method: 'POST', body: JSON.stringify({ dayId }) }),
  budget: () => request<BudgetResponse>('/api/budget'),
  saveBudget: (items: Partial<BudgetItem>[]) => request<BudgetResponse>('/api/budget', { method: 'PATCH', body: JSON.stringify(items) }),
  tasks: () => request<TasksResponse>('/api/tasks'),
  saveTasks: (items: Partial<BookingTask>[]) => request<TasksResponse>('/api/tasks', { method: 'PATCH', body: JSON.stringify(items) }),
  sources: () => request<SourcesResponse>('/api/sources'),
  checkSource: (url: string, title?: string) => request<SourceLink>('/api/sources/check', { method: 'POST', body: JSON.stringify({ url, title }) }),
  researchHistory: () => request<ResearchAnswer[]>('/api/research'),
  askResearch: (question: string, deep = false) => request<ResearchAnswer>('/api/research', { method: 'POST', body: JSON.stringify({ question, deep }) }),
  applyDraft: (id: string) => request<ResearchDraft>(`/api/research/drafts/${id}/apply`, { method: 'POST' })
};
