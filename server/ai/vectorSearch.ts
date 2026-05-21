import type OpenAI from 'openai';
import type { ContextIntent, TripResearchDocument } from './types.js';

const intentTerms: Record<ContextIntent, string[]> = {
  lodging: ['lodging', 'hotel', 'stay', 'stays', 'room', 'suite', 'aparthotel', 'airbnb', 'farm', 'cottage', 'parking', 'laundry', 'occupancy', 'bed'],
  family: ['family', 'kids', 'children', 'child', 'ages', 'teen', 'parent', 'traveler', 'accessibility'],
  itinerary: ['itinerary', 'day', 'schedule', 'route', 'stop', 'date', 'plan', 'pace'],
  transportation: ['drive', 'driving', 'car', 'rental', 'airport', 'flight', 'route', 'parking', 'toll', 'suv', 'automatic'],
  budget: ['budget', 'cost', 'price', 'spend', 'estimate', 'paid', 'planned', 'actual', 'cash'],
  destination: ['dublin', 'kilkenny', 'cork', 'dingle', 'galway', 'kerry', 'cliffs', 'ireland', 'destination'],
  activity: ['activity', 'ticket', 'castle', 'zoo', 'wildlife', 'sheepdog', 'shopping', 'experience', 'attraction'],
  documents: ['document', 'passport', 'confirmation', 'upload', 'attachment', 'insurance', 'pdf'],
  general: []
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

export function inferContextIntents(question: string): ContextIntent[] {
  const tokens = new Set(tokenize(question));
  const matches = Object.entries(intentTerms)
    .filter(([intent]) => intent !== 'general')
    .map(([intent, terms]) => ({
      intent: intent as ContextIntent,
      score: terms.reduce((total, term) => total + (tokens.has(term) ? 1 : 0), 0)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.intent);
  return matches.length > 0 ? matches : ['general'];
}

function hashToken(token: string) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function localEmbedding(text: string, dimensions = 64) {
  const vector = Array.from({ length: dimensions }, () => 0);
  for (const token of tokenize(text)) {
    vector[hashToken(token) % dimensions] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((total, value) => total + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

function cosine(left: number[], right: number[]) {
  return left.reduce((total, value, index) => total + value * (right[index] || 0), 0);
}

function lexicalScore(question: string, document: TripResearchDocument, intents: ContextIntent[]) {
  const queryTokens = new Set(tokenize(question));
  const documentTokens = new Set(tokenize(`${document.title} ${document.text}`));
  const overlap = [...queryTokens].reduce((total, token) => total + (documentTokens.has(token) ? 1 : 0), 0);
  const intentBoost = intents.reduce((total, intent) => {
    const terms = intentTerms[intent] || [];
    return total + terms.reduce((score, term) => score + (documentTokens.has(term) ? 0.25 : 0), 0);
  }, 0);
  return overlap + intentBoost;
}

export async function createOpenAIEmbedding(client: OpenAI, text: string, model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small') {
  const response = await client.embeddings.create({ model, input: text.slice(0, 8000) });
  return response.data[0]?.embedding || [];
}

export function searchTripResearch({
  question,
  documents,
  limit = 8
}: {
  question: string;
  documents: TripResearchDocument[];
  limit?: number;
}) {
  const intents = inferContextIntents(question);
  const queryEmbedding = localEmbedding(question);
  return documents
    .map((document) => {
      const semanticScore = cosine(queryEmbedding, localEmbedding(`${document.title} ${document.text}`));
      const score = lexicalScore(question, document, intents) + semanticScore;
      return { ...document, score };
    })
    .filter((document) => document.score > 0)
    .sort((left, right) => (right.score || 0) - (left.score || 0))
    .slice(0, limit);
}
