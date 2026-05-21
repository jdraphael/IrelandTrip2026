import type { AITripContext } from './types.js';

interface AssembleResearchPromptOptions {
  question: string;
  tripContext: AITripContext;
  interfaceContext?: string;
}

const draftInstructions = [
  'Return only valid JSON. Do not wrap it in Markdown. The JSON shape is {"answer":"plain language answer","warnings":["optional warning"],"drafts":[...]}.',
  'Only include drafts when the user explicitly asks to add, update, remove, move, budget, or create a task. Otherwise return "drafts": [].',
  'Never remove saved budget records in drafts. Only create a checklist task removal draft when the user explicitly asks to remove or delete an existing checklist item. Itinerary replacement drafts may replace the full day list only when the user explicitly asks to shorten, lengthen, renumber, or remove itinerary days.',
  'For small itinerary edits, use itinerary patch draft shape: {"kind":"itinerary","title":"...","summary":"...","sourceUrls":["https://..."],"payload":{"mode":"patch","dayId":"day-5","patch":{"notes":"...","stops":[{"id":"kebab-id","name":"...","kind":"activity","latitude":52.1,"longitude":-7.1}],"paymentTags":[{"id":"visa","kind":"card","label":"Visa","network":"Visa","note":"Primary card"},{"id":"mastercard","kind":"card","label":"Mastercard","network":"Mastercard","note":"Backup card"},{"id":"cash","kind":"cash","label":"EUR 60-120","minCashEur":60,"maxCashEur":120,"note":"Parking, tips, and smaller vendors"}]}}}.',
  'For shortening, lengthening, renumbering, or removing itinerary days, use itinerary replacement draft shape: {"kind":"itinerary","title":"...","summary":"...","sourceUrls":["https://..."],"payload":{"mode":"replace","days":[complete DayPlan objects with ids day-1..day-N and sequential day numbers],"removedDayIds":["day-4"],"combinedDayIds":["day-3","day-4"]}}.',
  'A replacement itinerary must include complete DayPlan objects: id, day, title, dateLabel, base, optional route/driveTime/distanceMiles/lodging, stops array, notes, paymentTags, optional sourceIds. Travel days must include an airport stop.',
  'For itinerary drafts that change destinations, add destinations, add/remove days, or replace the itinerary, include refreshed paymentTags for each affected day. Payment tags must prefer Visa and Mastercard text labels, use daily EUR ranges rather than exact cash amounts, and recommend cash for parking, small vendors, markets, rural stops, tips, taxis, and backup situations.',
  'When the request comes from the itinerary bubble and asks to add a comment or note to a day, create an itinerary patch draft for that day. Preserve the existing notes and append or merge the new comment unless the user explicitly asks to replace the notes.',
  'Budget draft shape: {"kind":"budget","title":"...","summary":"...","sourceUrls":["https://..."],"payload":{"item":{"id":"kebab-id","category":"Transportation","label":"...","planned":100,"actual":0,"status":"researching","notes":"..."}}}.',
  'Task add/update draft shape: {"kind":"task","title":"...","summary":"...","sourceUrls":["https://..."],"payload":{"task":{"id":"kebab-id","title":"...","status":"open","dueDate":"YYYY-MM-DD","category":"Documents","notes":"..."}}}.',
  'Task removal draft shape: {"kind":"task","title":"...","summary":"...","payload":{"mode":"remove","taskId":"existing-task-id"}}. Only use this shape for explicit checklist deletion requests.',
  'Use existing ids when updating existing days, budget items, tasks, or stops. Generate stable kebab-case ids for new budget items, tasks, or stops.'
];

function lines(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None saved.';
}

function familyBlock(context: AITripContext) {
  const adultNames = context.family.adults.map((member) => member.name).join(', ') || `${context.trip.adults} adults`;
  const childNames = context.family.children.map((member) => `${member.name}${typeof member.age === 'number' ? ` (${member.age})` : ''}`).join(', ') || `${context.trip.children} children`;
  return [
    'Current family',
    `- ${context.trip.adults} adults: ${adultNames}`,
    `- ${context.trip.children} children: ${childNames}`,
    `- Children ages: ${context.family.ages.length > 0 ? context.family.ages.join(', ') : 'not fully entered'}`,
    `- Total travelers: ${context.trip.travelers}`
  ].join('\n');
}

function lodgingBlock(context: AITripContext) {
  return [
    'Known lodging',
    lines(context.lodging.map((stay) => `${stay.name} (${stay.type}) in ${stay.bases.join('/')} for ${stay.dates.join(', ')}${stay.notes ? `; notes: ${stay.notes}` : ''}`))
  ].join('\n');
}

function itineraryBlock(context: AITripContext) {
  return [
    'Current itinerary window',
    lines(context.itinerary.map((day) => `Day ${day.day} ${day.dateLabel}: ${day.title}; base ${day.base}; lodging ${day.lodgingName || 'not selected'}; route ${day.route || 'local/no drive'}; stops ${day.stopNames.join(', ')}; notes ${day.notes}`))
  ].join('\n');
}

function transportationBlock(context: AITripContext) {
  return [
    'Transportation plan',
    lines(context.transportation.slice(0, 10).map((segment) => `${segment.day ? `Day ${segment.day}: ` : ''}${segment.title}${segment.route ? `; route ${segment.route}` : ''}${segment.driveTime ? `; drive ${segment.driveTime}` : ''}${segment.distanceMiles ? `; ${segment.distanceMiles} miles` : ''}${segment.notes ? `; notes ${segment.notes}` : ''}`))
  ].join('\n');
}

function budgetBlock(context: AITripContext) {
  return [
    'Budget context',
    `- Trip target: $${context.budget.target}`,
    `- Lodging planned: $${context.budget.lodgingTotal}`,
    `- Transportation planned: $${context.budget.transportationTotal}`,
    ...context.budget.items.map((item) => `- ${item.category}: ${item.label}, planned $${item.planned}, actual $${item.actual}, status ${item.status}${item.notes ? `, notes ${item.notes}` : ''}`)
  ].join('\n');
}

function destinationBlock(context: AITripContext) {
  return [
    'Destination context',
    lines(context.destinations.map((destination) => `${destination.name}: days ${destination.dayIds.join(', ')}, lodging ${destination.lodgingNames.join(', ') || 'not selected'}, activities ${destination.activityNames.slice(0, 8).join(', ')}`))
  ].join('\n');
}

function memoryBlock(context: AITripContext) {
  return [
    'Trip memory and retrieved research',
    lines([
      ...context.memory.previousConcerns.map((item) => `Previous concern: ${item}`),
      ...context.memory.recommendations.map((item) => `Earlier recommendation: ${item}`),
      ...context.memory.selectedOptions.map((item) => `Selected option: ${item}`),
      ...context.memory.rejectedOptions.map((item) => `Rejected option: ${item}`),
      ...context.savedResearch.map((document) => `${document.type}: ${document.title} - ${document.text.slice(0, 420)}`),
      ...context.uploadedDocuments.map((document) => `Uploaded document: ${document.title} - ${document.text}`)
    ])
  ].join('\n');
}

export function assembleResearchPrompt({ question, tripContext, interfaceContext }: AssembleResearchPromptOptions) {
  const missing = tripContext.missingData.length > 0
    ? `Missing data rules:\n${lines(tripContext.missingData)}\nIf the user asks about missing data, name exactly what is missing and offer the next action. Do not hallucinate reservations or confirmations.`
    : 'Missing data rules:\n- No critical trip context is missing for this request.';

  return [
    'You are an Ireland family travel planning assistant with full access to the application trip data supplied below.',
    'Answer naturally as a deeply integrated travel intelligence assistant. Do not mention prompt injection, RAG, context builders, retrieval, embeddings, JSON internals, or implementation details.',
    'Never say you do not have access to family profiles, traveler ages, itinerary stops, lodging selections, transportation plans, budgets, saved research, or preferences when those details are present below.',
    'Be practical and authoritative: identify family-of-five fit issues, legal occupancy risks, driving friction, weather-sensitive choices, source uncertainty, booking timing, and tradeoffs.',
    'Prioritize official attraction, airline, car rental, lodging, and government sources. Use broad travel sites only for color, never as the only source for prices, policies, or booking rules.',
    'Never claim a current price, policy, opening time, or ticket requirement without a source. If sources are unclear, say what must be verified.',
    `Active trip ID: ${tripContext.trip.id}`,
    `Trip summary: ${tripContext.tripSummary}`,
    familyBlock(tripContext),
    lodgingBlock(tripContext),
    itineraryBlock(tripContext),
    transportationBlock(tripContext),
    destinationBlock(tripContext),
    budgetBlock(tripContext),
    `Preferences\n- Lodging style: ${tripContext.preferences.lodgingStyle}\n- Budget level: ${tripContext.preferences.budgetLevel}\n- Activity preferences: ${tripContext.preferences.activityPreferences.join(', ')}`,
    memoryBlock(tripContext),
    missing,
    `Context usage badges: ${tripContext.contextUsage.badges.join(', ')}`,
    interfaceContext ? `Interface context: ${interfaceContext}` : 'Interface context: General research agent.',
    ...draftInstructions,
    `Question: ${question}`
  ].join('\n\n');
}
