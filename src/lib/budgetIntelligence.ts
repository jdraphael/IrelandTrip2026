import type { BudgetItem, DayPlan, Trip } from '../types';

export type BudgetCategoryKey = 'flights' | 'lodging' | 'transportation' | 'food' | 'activities' | 'buffer' | 'fallback';
export type SpendType = 'fixed' | 'flexible';
export type TimelineMode = 'daily' | 'city' | 'category' | 'traveler' | 'route';
export type PlannedActualFilter = 'planned' | 'actual' | 'both';

export interface ScenarioDelta {
  plannedDelta?: number;
  actualDelta?: number;
  multiplier?: number;
}

export interface BudgetFilterState {
  selectedCategory?: BudgetCategoryKey;
  selectedCity?: string;
  dateRange: 'all' | 'early' | 'middle' | 'late';
  traveler: 'all' | string;
  plannedActual: PlannedActualFilter;
  spendType: 'all' | SpendType;
  timelineMode: TimelineMode;
  scrubberPercent: number;
}

export interface CategoryMetric {
  key: BudgetCategoryKey;
  id: string;
  title: string;
  item: BudgetItem;
  planned: number;
  actual: number;
  remaining: number;
  percent: number;
  cityImpact: string;
  recommendation: string;
  insight: string;
  spendType: SpendType;
  color: string;
}

export interface CityMetric {
  city: string;
  planned: number;
  actual: number;
  percent: number;
  days: DayPlan[];
  categories: Record<BudgetCategoryKey, number>;
  dailyAverage: number;
  scenicValue: number;
  familyScore: number;
  savings: string;
  insight: string;
  x: number;
  y: number;
}

export interface TimelinePoint {
  id: string;
  label: string;
  city?: string;
  dateLabel?: string;
  planned: number;
  actual: number;
  lodging: number;
  food: number;
  attractions: number;
  transportation: number;
  insight: string;
}

export interface ForecastMetric {
  id: string;
  label: string;
  value: number;
  confidence: number;
  insight: string;
  savings: string;
}

export interface BudgetInsight {
  id: string;
  title: string;
  message: string;
  tone: 'good' | 'watch' | 'alert';
}

export interface BudgetIntelligence {
  projectedItems: BudgetItem[];
  totalPlanned: number;
  totalActual: number;
  totalScenarioDelta: number;
  categories: CategoryMetric[];
  visibleCategories: CategoryMetric[];
  cities: CityMetric[];
  visibleCities: CityMetric[];
  timeline: Record<TimelineMode, TimelinePoint[]>;
  activeTimeline: TimelinePoint[];
  forecast: {
    perDay: number;
    perTravelerPerDay: number;
    perCityAverage: number;
    metrics: ForecastMetric[];
  };
  insights: BudgetInsight[];
  activeInsight: BudgetInsight;
}

export const categoryColors: Record<BudgetCategoryKey, string> = {
  flights: '#0b5d3b',
  lodging: '#2f7d67',
  transportation: '#2d73a3',
  food: '#d9b95b',
  activities: '#b56d48',
  buffer: '#7a6ca8',
  fallback: '#5f8b4c'
};

const categoryTitles: Record<BudgetCategoryKey, string> = {
  flights: 'Flights & Transportation',
  lodging: 'Lodging & Stays',
  transportation: 'Car Rental & Fuel',
  food: 'Food & Dining',
  activities: 'Experiences & Attractions',
  buffer: 'Souvenirs & Buffer',
  fallback: 'Adventure Investment'
};

const routePositions: Record<string, { x: number; y: number }> = {
  Dublin: { x: 72, y: 42 },
  Kilkenny: { x: 61, y: 58 },
  Cork: { x: 45, y: 76 },
  Dingle: { x: 29, y: 63 },
  Galway: { x: 38, y: 42 }
};

export function budgetCategoryKey(item: Pick<BudgetItem, 'id' | 'category' | 'label'>): BudgetCategoryKey {
  const text = `${item.id} ${item.category} ${item.label}`.toLowerCase();
  if (/flight|airfare/.test(text)) return 'flights';
  if (/activity|activities|attraction|castle|cliff|zoo|wildlife|experience/.test(text)) return 'activities';
  if (/lodging|hotel|stay|aparthotel/.test(text)) return 'lodging';
  if (/car|rental|transport|suv|fuel/.test(text)) return 'transportation';
  if (/food|dining|restaurant|grocery|snack/.test(text)) return 'food';
  if (/buffer|souvenir|gift|surprise/.test(text)) return 'buffer';
  return 'fallback';
}

export function budgetCategoryTitle(key: BudgetCategoryKey) {
  return categoryTitles[key];
}

export function spendTypeForCategory(key: BudgetCategoryKey): SpendType {
  return key === 'food' || key === 'activities' || key === 'buffer' ? 'flexible' : 'fixed';
}

export function applyScenarioDeltas(items: BudgetItem[], deltas: Record<string, ScenarioDelta>): BudgetItem[] {
  return items.map((item) => {
    const delta = deltas[item.id];
    if (!delta) return { ...item };
    const plannedBase = delta.multiplier ? Math.round(item.planned * delta.multiplier) : item.planned;
    return {
      ...item,
      planned: Math.max(0, plannedBase + Math.round(delta.plannedDelta || 0)),
      actual: Math.max(0, item.actual + Math.round(delta.actualDelta || 0))
    };
  });
}

export function deriveBudgetIntelligence({
  items,
  itinerary,
  trip,
  filters,
  scenarioDeltas
}: {
  items: BudgetItem[];
  itinerary: DayPlan[];
  trip?: Trip;
  filters: BudgetFilterState;
  scenarioDeltas: Record<string, ScenarioDelta>;
}): BudgetIntelligence {
  const projectedItems = applyScenarioDeltas(items, scenarioDeltas);
  const totalPlanned = sum(projectedItems.map((item) => item.planned));
  const totalActual = sum(projectedItems.map((item) => item.actual));
  const totalScenarioDelta = projectedItems.reduce((acc, item) => {
    const original = items.find((saved) => saved.id === item.id);
    return acc + item.planned - (original?.planned || 0);
  }, 0);
  const routeDays = itinerary.filter((day) => !/flight|travel home/i.test(day.base));
  const cityGroups = groupCityDays(routeDays);

  const categories = projectedItems.map<CategoryMetric>((item) => {
    const key = budgetCategoryKey(item);
    const topCity = estimateTopCityForCategory(key, cityGroups);
    return {
      key,
      id: item.id,
      title: categoryTitles[key],
      item,
      planned: item.planned,
      actual: item.actual,
      remaining: item.planned - item.actual,
      percent: pct(item.planned, totalPlanned),
      cityImpact: topCity,
      recommendation: recommendationForCategory(key, topCity),
      insight: insightForCategory(key, topCity),
      spendType: spendTypeForCategory(key),
      color: categoryColors[key]
    };
  });

  const cities = deriveCityMetrics(cityGroups, categories, totalPlanned, totalActual);
  const visibleCategories = categories.filter((category) => (
    (!filters.selectedCategory || category.key === filters.selectedCategory) &&
    (filters.spendType === 'all' || category.spendType === filters.spendType)
  ));
  const visibleCities = cities.filter((city) => !filters.selectedCity || city.city === filters.selectedCity);
  const timeline = deriveTimelines(routeDays, cities, categories, trip?.travelers || 5);
  const insights = deriveInsights(categories, cities, filters, totalScenarioDelta);
  const activeInsight = activeInsightFor(filters, insights, categories, cities);

  const dayCount = Math.max(1, routeDays.length || itinerary.length || 13);
  const travelerCount = Math.max(1, trip?.travelers || 5);
  const perDay = Math.round(totalPlanned / dayCount);
  const perTravelerPerDay = Math.round(perDay / travelerCount);
  const perCityAverage = Math.round(totalPlanned / Math.max(1, cities.length));

  return {
    projectedItems,
    totalPlanned,
    totalActual,
    totalScenarioDelta,
    categories,
    visibleCategories,
    cities,
    visibleCities,
    timeline,
    activeTimeline: timeline[filters.timelineMode] || timeline.city,
    forecast: {
      perDay,
      perTravelerPerDay,
      perCityAverage,
      metrics: [
        {
          id: 'per-day',
          label: 'Per Day',
          value: perDay,
          confidence: 86,
          insight: 'Route pacing keeps the daily forecast steady across the longest stays.',
          savings: 'Keep lunches flexible on relocation days.'
        },
        {
          id: 'per-traveler',
          label: 'Per Traveler / Day',
          value: perTravelerPerDay,
          confidence: 82,
          insight: 'Family-size lodging absorbs the largest shared cost.',
          savings: 'Use apartment kitchens in Dublin and Cork for breakfast control.'
        },
        {
          id: 'per-city',
          label: 'Per City avg.',
          value: perCityAverage,
          confidence: 79,
          insight: 'Dingle and Galway deliver the highest memory value per euro.',
          savings: 'Move flexible souvenirs to Galway and Dingle after weather is clearer.'
        }
      ]
    },
    insights,
    activeInsight
  };
}

function groupCityDays(days: DayPlan[]) {
  const groups = new Map<string, DayPlan[]>();
  days.forEach((day) => {
    const city = normalizeCity(day.base);
    groups.set(city, [...(groups.get(city) || []), day]);
  });
  return Array.from(groups.entries()).map(([city, cityDays]) => ({ city, days: cityDays }));
}

function deriveCityMetrics(
  cityGroups: Array<{ city: string; days: DayPlan[] }>,
  categories: CategoryMetric[],
  totalPlanned: number,
  totalActual: number
): CityMetric[] {
  const dayTotal = Math.max(1, sum(cityGroups.map((group) => group.days.length)));
  const distanceTotal = Math.max(1, sum(cityGroups.flatMap((group) => group.days.map((day) => day.distanceMiles || 0))));
  return cityGroups.map((group, index) => {
    const dayWeight = group.days.length / dayTotal;
    const distanceWeight = sum(group.days.map((day) => day.distanceMiles || 0)) / distanceTotal;
    const lodging = sum(group.days.map((day) => day.lodging?.nightlyEstimate || 0));
    const categoriesByKey = categories.reduce((acc, category) => {
      const amount = category.key === 'lodging'
        ? Math.max(lodging, category.planned * dayWeight)
        : category.key === 'transportation'
          ? category.planned * Math.max(distanceWeight, dayWeight * 0.45)
          : category.key === 'flights'
            ? category.planned * (index === 0 ? 0.62 : index === cityGroups.length - 1 ? 0.28 : 0.1 / Math.max(1, cityGroups.length - 2))
            : category.planned * dayWeight;
      acc[category.key] = Math.round(amount);
      return acc;
    }, {} as Record<BudgetCategoryKey, number>);
    const planned = sum(Object.values(categoriesByKey));
    const actual = Math.round(totalActual * (planned / Math.max(1, totalPlanned)));
    const scenicValue = scenicScore(group.city, group.days);
    const familyScore = familyScoreFor(group.days);
    const position = routePositions[group.city] || { x: 50 + index * 6, y: 50 };
    return {
      city: group.city,
      planned,
      actual,
      percent: pct(planned, totalPlanned),
      days: group.days,
      categories: categoriesByKey,
      dailyAverage: Math.round(planned / Math.max(1, group.days.length)),
      scenicValue,
      familyScore,
      savings: savingsForCity(group.city),
      insight: insightForCity(group.city, scenicValue),
      x: position.x,
      y: position.y
    };
  }).sort((a, b) => b.planned - a.planned);
}

function deriveTimelines(days: DayPlan[], cities: CityMetric[], categories: CategoryMetric[], travelers: number): Record<TimelineMode, TimelinePoint[]> {
  const cityByName = new Map(cities.map((city) => [city.city, city]));
  const daily = days.map((day) => {
    const city = cityByName.get(normalizeCity(day.base));
    const dailyPlanned = Math.round((city?.planned || 0) / Math.max(1, city?.days.length || 1));
    return {
      id: day.id,
      label: `Day ${day.day}`,
      city: normalizeCity(day.base),
      dateLabel: day.dateLabel,
      planned: dailyPlanned,
      actual: Math.round(dailyPlanned * 0.28),
      lodging: day.lodging?.nightlyEstimate || 0,
      food: Math.round((categoryAmount(categories, 'food') / Math.max(1, days.length))),
      attractions: day.stops.filter((stop) => stop.kind === 'activity').length * 80,
      transportation: Math.round((day.distanceMiles || 12) * 1.35),
      insight: `${normalizeCity(day.base)} has ${day.stops.length} planned route moments.`
    };
  });
  return {
    daily,
    city: cities.map((city) => ({
      id: city.city,
      label: city.city,
      city: city.city,
      planned: city.planned,
      actual: city.actual,
      lodging: city.categories.lodging || 0,
      food: city.categories.food || 0,
      attractions: city.categories.activities || 0,
      transportation: city.categories.transportation || 0,
      insight: city.insight
    })),
    category: categories.map((category) => ({
      id: category.id,
      label: category.title,
      planned: category.planned,
      actual: category.actual,
      lodging: category.key === 'lodging' ? category.planned : 0,
      food: category.key === 'food' ? category.planned : 0,
      attractions: category.key === 'activities' ? category.planned : 0,
      transportation: category.key === 'transportation' || category.key === 'flights' ? category.planned : 0,
      insight: category.insight
    })),
    traveler: Array.from({ length: Math.max(1, travelers) }, (_, index) => ({
      id: `traveler-${index + 1}`,
      label: `Traveler ${index + 1}`,
      planned: Math.round(sum(categories.map((category) => category.planned)) / Math.max(1, travelers)),
      actual: Math.round(sum(categories.map((category) => category.actual)) / Math.max(1, travelers)),
      lodging: Math.round(categoryAmount(categories, 'lodging') / Math.max(1, travelers)),
      food: Math.round(categoryAmount(categories, 'food') / Math.max(1, travelers)),
      attractions: Math.round(categoryAmount(categories, 'activities') / Math.max(1, travelers)),
      transportation: Math.round((categoryAmount(categories, 'flights') + categoryAmount(categories, 'transportation')) / Math.max(1, travelers)),
      insight: 'Shared family costs are distributed evenly for scenario planning.'
    })),
    route: cities.map((city, index) => ({
      id: `route-${index + 1}`,
      label: index === 0 ? `Start ${city.city}` : `${cities[index - 1].city} -> ${city.city}`,
      city: city.city,
      planned: city.planned,
      actual: city.actual,
      lodging: city.categories.lodging || 0,
      food: city.categories.food || 0,
      attractions: city.categories.activities || 0,
      transportation: city.categories.transportation || 0,
      insight: city.insight
    }))
  };
}

function deriveInsights(categories: CategoryMetric[], cities: CityMetric[], filters: BudgetFilterState, totalScenarioDelta: number): BudgetInsight[] {
  const scenicCity = [...cities].sort((a, b) => b.scenicValue - a.scenicValue)[0];
  const flexible = sum(categories.filter((category) => category.spendType === 'flexible').map((category) => category.planned));
  const selectedCategory = categories.find((category) => category.key === filters.selectedCategory);
  const selectedCity = cities.find((city) => city.city === filters.selectedCity);
  return [
    {
      id: 'scenic-value',
      title: 'Scenic value',
      message: `${scenicCity?.city || 'Dingle'} currently has the highest scenic value per euro spent.`,
      tone: 'good'
    },
    {
      id: 'flexible-spend',
      title: 'Flexible control',
      message: `EUR ${Math.round(flexible).toLocaleString('en-US')} remains in flexible dining, experience, and souvenir planning.`,
      tone: 'watch'
    },
    {
      id: 'scenario',
      title: 'Scenario projection',
      message: `Scenario projection is EUR ${Math.round(totalScenarioDelta).toLocaleString('en-US')} versus the saved plan.`,
      tone: totalScenarioDelta > 650 ? 'alert' : totalScenarioDelta > 0 ? 'watch' : 'good'
    },
    selectedCategory ? {
      id: 'selected-category',
      title: `${selectedCategory.title} intelligence`,
      message: `${selectedCategory.title} intelligence active. ${selectedCategory.recommendation}`,
      tone: selectedCategory.spendType === 'flexible' ? 'good' : 'watch'
    } : undefined,
    selectedCity ? {
      id: 'selected-city',
      title: `${selectedCity.city} intelligence panel`,
      message: `${selectedCity.city} intelligence panel active. ${selectedCity.insight}`,
      tone: 'good'
    } : undefined
  ].filter(Boolean) as BudgetInsight[];
}

function activeInsightFor(filters: BudgetFilterState, insights: BudgetInsight[], categories: CategoryMetric[], cities: CityMetric[]) {
  if (filters.selectedCategory) {
    const category = categories.find((item) => item.key === filters.selectedCategory);
    if (category) {
      return {
        id: 'active-category',
        title: `${category.title} intelligence`,
        message: `${category.title} intelligence active. ${category.insight}`,
        tone: category.spendType === 'flexible' ? 'good' : 'watch'
      } satisfies BudgetInsight;
    }
  }
  if (filters.selectedCity) {
    const city = cities.find((item) => item.city === filters.selectedCity);
    if (city) {
      return {
        id: 'active-city',
        title: `${city.city} intelligence panel`,
        message: `${city.city} intelligence panel active. ${city.insight}`,
        tone: 'good'
      } satisfies BudgetInsight;
    }
  }
  return insights[0] || {
    id: 'default',
    title: 'Route balance',
    message: 'Route spending is balanced across the four longest destination stays.',
    tone: 'good'
  };
}

function estimateTopCityForCategory(key: BudgetCategoryKey, cityGroups: Array<{ city: string; days: DayPlan[] }>) {
  if (key === 'flights') return 'Dublin';
  if (key === 'activities') return cityGroups.find((group) => /Dingle|Galway|Cork/i.test(group.city))?.city || 'Galway';
  if (key === 'food') return cityGroups.find((group) => /Galway|Dingle/i.test(group.city))?.city || 'Galway';
  return [...cityGroups].sort((a, b) => b.days.length - a.days.length)[0]?.city || 'Dublin';
}

function recommendationForCategory(key: BudgetCategoryKey, city: string) {
  const recommendations: Record<BudgetCategoryKey, string> = {
    flights: 'Tuesday fare checks are still the cleanest savings lever.',
    lodging: `${city} lodging should stay refundable until inventory stabilizes.`,
    transportation: 'Keep automatic SUV pricing under watch before rural driving begins.',
    food: `${city} dining can flex without reducing the premium family experience.`,
    activities: `Protect timed experiences around ${city} before adding extras.`,
    buffer: 'Hold souvenir flexibility until the west coast portion of the route.',
    fallback: 'Review this line item against the route before locking it.'
  };
  return recommendations[key];
}

function insightForCategory(key: BudgetCategoryKey, city: string) {
  const insights: Record<BudgetCategoryKey, string> = {
    flights: 'Flights are trending below historical June averages when midweek options stay open.',
    lodging: `${city} has the largest lodging sensitivity during peak family travel weeks.`,
    transportation: 'Rental timing influences the rural route more than city days.',
    food: `${city} is the strongest dining exploration pocket in the current forecast.`,
    activities: `${city} has the best high-memory experience density for this route.`,
    buffer: 'Buffer spend is best saved for artisan markets and weather-driven pivots.',
    fallback: 'This budget line supports the larger Ireland travel experience.'
  };
  return insights[key];
}

function savingsForCity(city: string) {
  if (/Galway/i.test(city)) return 'Use weather-flexible indoor attraction holds before committing.';
  if (/Dingle/i.test(city)) return 'Keep sheepdog and Slea Head timing flexible until forecast is clearer.';
  if (/Cork/i.test(city)) return 'Choose Blarney or Fota based on energy instead of booking both early.';
  if (/Dublin/i.test(city)) return 'Use aparthotel breakfasts to protect daily dining spend.';
  return 'Keep one flexible meal and one flexible attraction window.';
}

function insightForCity(city: string, scenicValue: number) {
  if (/Dingle/i.test(city)) return `Dingle pairs a ${scenicValue}/10 scenic score with strong family memory value.`;
  if (/Galway/i.test(city)) return `Galway is weather-sensitive but offers a ${scenicValue}/10 scenic return.`;
  if (/Dublin/i.test(city)) return 'Dublin concentrates arrival, final-day, and flight-related flexibility.';
  return `${city} balances route pacing, lodging, and family-friendly stops.`;
}

function scenicScore(city: string, days: DayPlan[]) {
  const text = `${city} ${days.map((day) => `${day.title} ${day.route || ''} ${day.notes}`).join(' ')}`.toLowerCase();
  if (/dingle|slea|kerry|coast/.test(text)) return 96;
  if (/galway|cliffs|bunratty/.test(text)) return 91;
  if (/cork|blarney|fota|kinsale/.test(text)) return 84;
  if (/kilkenny|castle/.test(text)) return 79;
  return 72;
}

function familyScoreFor(days: DayPlan[]) {
  const text = days.flatMap((day) => day.stops.map((stop) => `${stop.name} ${stop.kind} ${stop.notes || ''}`)).join(' ').toLowerCase();
  let score = 78;
  if (/zoo|wildlife|sheepdog|park/.test(text)) score += 12;
  if (/drive-stop|lodging/.test(text)) score += 4;
  return Math.min(98, score);
}

function categoryAmount(categories: CategoryMetric[], key: BudgetCategoryKey) {
  return categories.find((category) => category.key === key)?.planned || 0;
}

function normalizeCity(base: string) {
  if (/return dublin|dublin/i.test(base)) return 'Dublin';
  if (/kilkenny/i.test(base)) return 'Kilkenny';
  if (/cork/i.test(base)) return 'Cork';
  if (/dingle/i.test(base)) return 'Dingle';
  if (/galway/i.test(base)) return 'Galway';
  return base || 'Route';
}

function pct(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(value / total * 100)));
}

function sum(values: number[]) {
  return values.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
}
