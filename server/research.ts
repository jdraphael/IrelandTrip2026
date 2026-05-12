import OpenAI from 'openai';
import type { ResearchAnswer, ResearchDraft, SourceLink, TripDatabase } from './db-types.js';
import { isBudgetDraftPayload, isItineraryDraftPayload, isTaskDraftPayload } from '../src/lib/drafts.js';
import { classifySource, summarizeSources } from '../src/lib/sources.js';

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

interface ModelDraft {
  kind?: string;
  title?: string;
  summary?: string;
  payload?: unknown;
  sourceUrls?: string[];
}

interface ModelResearchOutput {
  answer?: string;
  warnings?: string[];
  drafts?: ModelDraft[];
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

function stripJsonFence(text: string) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function parseModelOutput(outputText: string): { output: ModelResearchOutput; warnings: string[] } {
  try {
    const parsed = JSON.parse(stripJsonFence(outputText)) as ModelResearchOutput;
    if (!parsed || typeof parsed !== 'object') throw new Error('Model output was not an object.');
    return { output: parsed, warnings: [] };
  } catch {
    return {
      output: { answer: outputText, drafts: [] },
      warnings: ['The research agent could not parse structured draft JSON, so no saved-data draft was created.']
    };
  }
}

function sourceIdsForUrls(sourceUrls: string[] | undefined, sources: SourceLink[]) {
  if (!sourceUrls || sourceUrls.length === 0) return [];
  const byUrl = new Map(sources.map((source) => [source.url, source.id]));
  return sourceUrls.map((url) => byUrl.get(url)).filter(Boolean) as string[];
}

function payloadWithSourceIds(kind: string, payload: unknown, sourceIds: string[]) {
  if (sourceIds.length === 0 || !payload || typeof payload !== 'object') return payload;
  const clone = JSON.parse(JSON.stringify(payload));
  if (kind === 'itinerary' && clone.patch && typeof clone.patch === 'object') {
    clone.patch.sourceIds ||= sourceIds;
    if (Array.isArray(clone.patch.stops)) {
      clone.patch.stops = clone.patch.stops.map((stop: Record<string, unknown>) => ({ sourceIds, ...stop }));
    }
  }
  if (kind === 'budget' && clone.item && typeof clone.item === 'object') {
    clone.item.sourceIds ||= sourceIds;
  }
  if (kind === 'task' && clone.task && typeof clone.task === 'object') {
    clone.task.sourceIds ||= sourceIds;
  }
  return clone;
}

function createValidatedDrafts(modelDrafts: ModelDraft[] | undefined, sources: SourceLink[]) {
  const warnings: string[] = [];
  const drafts: ResearchDraft[] = [];
  const createdAt = new Date().toISOString();

  for (const [index, modelDraft] of (modelDrafts || []).entries()) {
    const kind = modelDraft.kind;
    if (kind !== 'itinerary' && kind !== 'budget' && kind !== 'task') {
      warnings.push(`Skipped unsupported draft type: ${kind || 'missing kind'}.`);
      continue;
    }

    const sourceIds = sourceIdsForUrls(modelDraft.sourceUrls, sources);
    const payload = payloadWithSourceIds(kind, modelDraft.payload, sourceIds);
    const valid =
      (kind === 'itinerary' && isItineraryDraftPayload(payload)) ||
      (kind === 'budget' && isBudgetDraftPayload(payload)) ||
      (kind === 'task' && isTaskDraftPayload(payload));

    if (!valid) {
      warnings.push(`Skipped invalid ${kind} draft: ${modelDraft.title || 'Untitled draft'}.`);
      continue;
    }

    drafts.push({
      id: `draft-${Date.now()}-${index}`,
      kind,
      title: modelDraft.title || `${kind[0].toUpperCase()}${kind.slice(1)} draft`,
      summary: modelDraft.summary,
      createdAt,
      status: 'draft',
      payload,
      sourceIds
    });
  }

  return { drafts, warnings };
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
    await db.saveResearchAnswers([fallback, ...(await db.getResearchAnswers())]);
    return fallback;
  }

  const client = new OpenAI({ apiKey });
  const trip = await db.getTrip();
  const itinerary = await db.getItinerary();
  const budget = await db.getBudget();
  const tasks = await db.getTasks();

  const prompt = [
    `You are a strict, practical family trip research assistant for ${trip.title}.`,
    `Active trip: ${trip.month} ${trip.year}, ${trip.travelers} travelers, origin ${trip.origin}, destination ${trip.destination}, budget target $${trip.budgetTarget}.`,
    `Route: ${trip.routeSummary}.`,
    'Prioritize official attraction, airline, car rental, lodging, and government sources. Use broad travel sites only for color, never as the only source for prices, policies, or booking rules.',
    'Never claim a price, policy, opening time, or ticket requirement without a source. If current sources are unclear, say what must be verified.',
    'Return only valid JSON. Do not wrap it in Markdown. The JSON shape is {"answer":"plain language answer","warnings":["optional warning"],"drafts":[...]}.',
    'Only include drafts when the user explicitly asks to add, update, move, budget, or create a task. Otherwise return "drafts": [].',
    'Never remove saved records in drafts. V1 drafts may only add or update itinerary, budget, and task records.',
    'Itinerary draft shape: {"kind":"itinerary","title":"...","summary":"...","sourceUrls":["https://..."],"payload":{"dayId":"day-5","patch":{"notes":"...","stops":[{"id":"kebab-id","name":"...","kind":"activity","latitude":52.1,"longitude":-7.1}]}}}.',
    'Budget draft shape: {"kind":"budget","title":"...","summary":"...","sourceUrls":["https://..."],"payload":{"item":{"id":"kebab-id","category":"Transportation","label":"...","planned":100,"actual":0,"status":"researching","notes":"..."}}}.',
    'Task draft shape: {"kind":"task","title":"...","summary":"...","sourceUrls":["https://..."],"payload":{"task":{"id":"kebab-id","title":"...","status":"open","dueDate":"YYYY-MM-DD","category":"Documents","notes":"..."}}}.',
    'Use existing ids when updating existing days, budget items, tasks, or stops. Generate stable kebab-case ids for new budget items, tasks, or stops.',
    `Current itinerary JSON: ${JSON.stringify(itinerary.map((day) => ({ id: day.id, day: day.day, title: day.title, base: day.base, route: day.route, stops: day.stops.map((stop) => ({ id: stop.id, name: stop.name })) })))}.`,
    `Current budget JSON: ${JSON.stringify(budget.map((item) => ({ id: item.id, category: item.category, label: item.label, planned: item.planned, actual: item.actual, status: item.status })))}.`,
    `Current tasks JSON: ${JSON.stringify(tasks.map((task) => ({ id: task.id, title: task.title, status: task.status, dueDate: task.dueDate, category: task.category })))}.`,
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
  const parsed = parseModelOutput(response.output_text || '');
  const validated = createValidatedDrafts(parsed.output.drafts, sources);
  const warnings = [...sourceSummary.warnings, ...parsed.warnings, ...(parsed.output.warnings || []), ...validated.warnings];
  const answer: ResearchAnswer = {
    id: `answer-${Date.now()}`,
    question,
    answer: parsed.output.answer || response.output_text || 'The research agent did not return text. Try again with a more specific question.',
    createdAt: new Date().toISOString(),
    sources,
    drafts: validated.drafts,
    warnings
  };

  const existingSources = await db.getSources();
  await db.saveSources([...existingSources, ...sources.filter((source) => !existingSources.some((existing) => existing.url === source.url))]);
  if (validated.drafts.length > 0) {
    await db.saveDrafts([...validated.drafts, ...(await db.getDrafts())]);
  }
  await db.saveResearchAnswers([answer, ...(await db.getResearchAnswers())]);
  return answer;
}

export async function findDraftInDatabase(db: TripDatabase, draftId: string) {
  const drafts = await db.getDrafts();
  const draft = drafts.find((item) => item.id === draftId) || (await db.getResearchAnswers()).flatMap((answer) => answer.drafts).find((item) => item.id === draftId);
  return draft;
}

export async function markDraftAppliedInDatabase(db: TripDatabase, draftId: string) {
  const drafts = await db.getDrafts();
  const updatedDrafts: ResearchDraft[] = drafts.map((item) => (item.id === draftId ? { ...item, status: 'applied' } : item));
  await db.saveDrafts(updatedDrafts);

  const answers = await db.getResearchAnswers();
  const updatedAnswers: ResearchAnswer[] = answers.map((answer) => ({
    ...answer,
    drafts: answer.drafts.map((draft) => (draft.id === draftId ? { ...draft, status: 'applied' as const } : draft))
  }));
  await db.saveResearchAnswers(updatedAnswers);

  return updatedDrafts.find((draft) => draft.id === draftId) || updatedAnswers.flatMap((answer) => answer.drafts).find((draft) => draft.id === draftId);
}
