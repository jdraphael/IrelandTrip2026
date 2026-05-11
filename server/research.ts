import OpenAI from 'openai';
import type { ResearchAnswer, ResearchDraft, SourceLink, TripDatabase } from './db-types';
import { classifySource, summarizeSources } from '../src/lib/sources';

interface ResearchOptions {
  question: string;
  deep?: boolean;
  apiKey?: string;
  db: TripDatabase;
}

interface AnnotationLike {
  type?: string;
  url?: string;
  title?: string;
}

function extractAnnotations(response: unknown): AnnotationLike[] {
  const annotations: AnnotationLike[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.annotations)) {
      for (const annotation of record.annotations) {
        if (annotation && typeof annotation === 'object') {
          annotations.push(annotation as AnnotationLike);
        }
      }
    }
    for (const child of Object.values(record)) visit(child);
  };
  visit(response);
  return annotations;
}

function sourcesFromResponse(response: unknown): SourceLink[] {
  const seen = new Set<string>();
  return extractAnnotations(response)
    .filter((annotation) => typeof annotation.url === 'string')
    .map((annotation, index) => ({
      id: `research-source-${Date.now()}-${index}`,
      title: annotation.title || annotation.url || 'Research source',
      url: annotation.url || '',
      sourceType: classifySource(annotation.url || ''),
      checkedAt: new Date().toISOString(),
      status: 'ok' as const
    }))
    .filter((source) => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });
}

function missingKeyAnswer(question: string): ResearchAnswer {
  return {
    id: `answer-${Date.now()}`,
    question,
    answer: 'Live research is ready, but OPENAI_API_KEY is not configured yet. Add it to the local .env file, restart the app, and this agent will answer with sourced web results. Until then, the planner still works with the saved itinerary, budget, map, and checklist.',
    createdAt: new Date().toISOString(),
    sources: [],
    drafts: [],
    warnings: ['No OpenAI API key is configured.']
  };
}

export async function answerResearchQuestion({ question, deep = false, apiKey, db }: ResearchOptions): Promise<ResearchAnswer> {
  if (!apiKey) {
    const fallback = missingKeyAnswer(question);
    db.saveResearchAnswers([fallback, ...db.getResearchAnswers()]);
    return fallback;
  }

  const client = new OpenAI({ apiKey });
  const trip = db.getTrip();
  const itinerary = db.getItinerary();
  const budget = db.getBudget();
  const tasks = db.getTasks();

  const prompt = [
    `You are a strict, practical family trip research assistant for ${trip.title}.`,
    `Active trip: ${trip.month} ${trip.year}, ${trip.travelers} travelers, origin ${trip.origin}, destination ${trip.destination}, budget target $${trip.budgetTarget}.`,
    `Route: ${trip.routeSummary}.`,
    'Prioritize official attraction, airline, car rental, lodging, and government sources. Use broad travel sites only for color, never as the only source for prices, policies, or booking rules.',
    'Never claim a price, policy, opening time, or ticket requirement without a source. If current sources are unclear, say what must be verified.',
    'Do not directly change saved trip data. If a useful itinerary change is obvious, include it as prose only; the app will ask before saving.',
    `Current itinerary summary: ${itinerary.map((day) => `Day ${day.day}: ${day.title} (${day.base})`).join('; ')}.`,
    `Budget summary: ${budget.map((item) => `${item.category}: planned $${item.planned}`).join('; ')}.`,
    `Open tasks: ${tasks.filter((task) => task.status === 'open').map((task) => `${task.title} due ${task.dueDate}`).join('; ')}.`,
    `Question: ${question}`
  ].join('\n\n');

  const response = await client.responses.create({
    model: deep ? process.env.OPENAI_DEEP_MODEL || 'gpt-5.5' : process.env.OPENAI_MODEL || 'gpt-5.4-mini',
    input: prompt,
    tools: [{ type: 'web_search' }],
    tool_choice: 'auto'
  });

  const sources = sourcesFromResponse(response);
  const sourceSummary = summarizeSources(sources);
  const answer: ResearchAnswer = {
    id: `answer-${Date.now()}`,
    question,
    answer: response.output_text || 'The research agent did not return text. Try again with a more specific question.',
    createdAt: new Date().toISOString(),
    sources,
    drafts: [],
    warnings: sourceSummary.warnings
  };

  const existingSources = db.getSources();
  db.saveSources([...existingSources, ...sources.filter((source) => !existingSources.some((existing) => existing.url === source.url))]);
  db.saveResearchAnswers([answer, ...db.getResearchAnswers()]);
  return answer;
}

export function applyDraftToDatabase(db: TripDatabase, draftId: string) {
  const drafts = db.getDrafts();
  const draft = drafts.find((item) => item.id === draftId);
  if (!draft) return undefined;

  const updatedDrafts: ResearchDraft[] = drafts.map((item) => (item.id === draftId ? { ...item, status: 'applied' } : item));
  db.saveDrafts(updatedDrafts);
  return { ...draft, status: 'applied' as const };
}
