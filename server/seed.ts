import fs from 'node:fs';
import path from 'node:path';
import type { BookingTask, BudgetItem, DayPlan, FamilyMember, SourceLink, Trip } from '../src/types';

export interface SeedData {
  trip: Trip;
  familyMembers: FamilyMember[];
  itinerary: DayPlan[];
  budget: BudgetItem[];
  tasks: BookingTask[];
  sources: SourceLink[];
}

const checkedAt = '2026-05-10T00:00:00.000Z';

export const familyMembers: FamilyMember[] = [
  { id: 'justin', name: 'Justin', role: 'parent', avatarKey: 'dad', taskColor: '#0B5D3B' },
  { id: 'krissy', name: 'Krissy', role: 'parent', avatarKey: 'mom', taskColor: '#5F8B4C' },
  { id: 'lyla', name: 'Lyla', role: 'child', avatarKey: 'lyla', taskColor: '#D9B95B' },
  { id: 'grace', name: 'Grace', role: 'child', avatarKey: 'grace', taskColor: '#C86B25' },
  { id: 'everly', name: 'Everly', role: 'child', avatarKey: 'everly', taskColor: '#2F7D67' }
];

const sources: SourceLink[] = [
  { id: 'src-dublin-zoo', title: 'Dublin Zoo', url: 'https://www.dublinzoo.ie/', sourceType: 'official', checkedAt, status: 'unchecked' },
  { id: 'src-book-kells', title: 'Book of Kells Experience', url: 'https://www.bookofkells.ie/', sourceType: 'official', checkedAt, status: 'unchecked' },
  { id: 'src-kilkenny-castle', title: 'Kilkenny Castle', url: 'https://kilkennycastle.ie/', sourceType: 'official', checkedAt, status: 'unchecked' },
  { id: 'src-blarney', title: 'Blarney Castle', url: 'https://blarneycastle.ie/', sourceType: 'official', checkedAt, status: 'unchecked' },
  { id: 'src-fota', title: 'Fota Wildlife Park', url: 'https://www.fotawildlife.ie/', sourceType: 'official', checkedAt, status: 'unchecked' },
  { id: 'src-dingle-sheepdogs', title: 'Dingle Sheepdogs', url: 'https://dinglesheepdogs.com/', sourceType: 'official', checkedAt, status: 'unchecked' },
  { id: 'src-cliffs', title: 'Cliffs of Moher', url: 'https://www.cliffsofmoher.ie/', sourceType: 'official', checkedAt, status: 'unchecked' },
  { id: 'src-dfa-passports', title: 'Ireland passport guidance', url: 'https://www.dfa.ie/passports/', sourceType: 'government', checkedAt, status: 'unchecked' },
  { id: 'src-staycity', title: 'Staycity Aparthotels Dublin Castle', url: 'https://www.staycity.com/dublin/dublin-castle', sourceType: 'official', checkedAt, status: 'unchecked' },
  { id: 'src-connacht', title: 'The Connacht Hotel', url: 'https://www.theconnacht.ie/', sourceType: 'official', checkedAt, status: 'unchecked' },
  { id: 'src-clayton', title: 'Clayton Hotel Dublin Airport', url: 'https://www.claytonhoteldublinairport.com/', sourceType: 'official', checkedAt, status: 'unchecked' },
  { id: 'src-enterprise', title: 'Enterprise Ireland Car Rental', url: 'https://www.enterprise.ie/', sourceType: 'official', checkedAt, status: 'unchecked' }
];

const stop = (
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  kind: DayPlan['stops'][number]['kind'] = 'activity',
  sourceIds: string[] = [],
  notes = ''
) => ({ id, name, latitude, longitude, kind, sourceIds, notes });

const paymentTags = (minCashEur: number, maxCashEur: number, note: string): DayPlan['paymentTags'] => [
  { id: 'visa', kind: 'card', label: 'Visa', network: 'Visa', note: 'Recommended primary card' },
  { id: 'mastercard', kind: 'card', label: 'Mastercard', network: 'Mastercard', note: 'Recommended backup card' },
  { id: 'cash', kind: 'cash', label: `EUR ${minCashEur}-${maxCashEur}`, minCashEur, maxCashEur, note }
];

const cityPaymentTags = () => paymentTags(30, 80, 'Recommended daily cash range for transit, tips, and backup.');
const ruralPaymentTags = () => paymentTags(60, 120, 'Recommended daily cash range for parking, small vendors, and backup.');
const dinglePaymentTags = () => paymentTags(80, 150, 'Recommended daily cash range for rural stops, farm experiences, parking, and backup.');

const itinerary: DayPlan[] = [
  {
    id: 'day-1',
    day: 1,
    title: 'Travel day to Dublin',
    dateLabel: 'June 18, 2027',
    base: 'In flight',
    route: 'LEX -> connecting airport -> DUB',
    driveTime: 'No Ireland driving',
    stops: [stop('lex', 'Lexington Blue Grass Airport', 38.0365, -84.6059, 'airport')],
    notes: 'Book main cabin or equivalent so the family can choose seats together.',
    paymentTags: cityPaymentTags()
  },
  {
    id: 'day-2',
    day: 2,
    title: 'Arrive and settle into Dublin',
    dateLabel: 'June 19, 2027',
    base: 'Dublin',
    lodging: { name: 'Staycity Aparthotels Dublin Castle', type: 'aparthotel', nightlyEstimate: 275, sourceIds: ['src-staycity'], notes: 'Kitchenette and apartment setup for five.' },
    stops: [
      stop('dub-airport', 'Dublin Airport', 53.4264, -6.2499, 'airport'),
      stop('staycity-dublin', 'Staycity Aparthotels Dublin Castle', 53.3403, -6.2705, 'lodging', ['src-staycity'])
    ],
    notes: 'Keep arrival day light. No rental car until leaving Dublin.',
    paymentTags: cityPaymentTags()
  },
  {
    id: 'day-3',
    day: 3,
    title: 'Dublin Zoo and Phoenix Park',
    dateLabel: 'June 20, 2027',
    base: 'Dublin',
    driveTime: 'Taxi/transit day',
    lodging: { name: 'Staycity Aparthotels Dublin Castle', type: 'aparthotel', nightlyEstimate: 275, sourceIds: ['src-staycity'] },
    stops: [
      stop('dublin-zoo', 'Dublin Zoo', 53.3564, -6.3053, 'activity', ['src-dublin-zoo'], 'Animal-focused day for the girls.'),
      stop('phoenix-park', 'Phoenix Park', 53.3559, -6.3298, 'viewpoint')
    ],
    notes: 'Book zoo tickets ahead once 2027 ticket windows open.',
    paymentTags: cityPaymentTags()
  },
  {
    id: 'day-4',
    day: 4,
    title: 'Book of Kells and Dublin shopping',
    dateLabel: 'June 21, 2027',
    base: 'Dublin',
    lodging: { name: 'Staycity Aparthotels Dublin Castle', type: 'aparthotel', nightlyEstimate: 275, sourceIds: ['src-staycity'] },
    stops: [
      stop('book-kells', 'Book of Kells Experience', 53.3438, -6.2546, 'activity', ['src-book-kells']),
      stop('grafton-street', 'Grafton Street', 53.342, -6.2591, 'activity')
    ],
    notes: 'Time-slot tickets are likely worth booking before travel.',
    paymentTags: cityPaymentTags()
  },
  {
    id: 'day-5',
    day: 5,
    title: 'Drive to Kilkenny',
    dateLabel: 'June 22, 2027',
    base: 'Kilkenny',
    route: 'Dublin -> Kildare -> Kilkenny',
    driveTime: '1.5 hours direct',
    distanceMiles: 90,
    lodging: { name: 'Kilkenny family hotel or central inn', type: 'hotel', nightlyEstimate: 220, notes: 'One-night stop near Kilkenny Castle.' },
    stops: [
      stop('irish-national-stud', 'Irish National Stud and Gardens', 53.1524, -6.9103, 'drive-stop'),
      stop('kilkenny-castle', 'Kilkenny Castle', 52.6505, -7.2494, 'activity', ['src-kilkenny-castle'])
    ],
    notes: 'Pick up the rental car after Dublin sightseeing, then ease into left-side driving.',
    paymentTags: ruralPaymentTags()
  },
  {
    id: 'day-6',
    day: 6,
    title: 'Kilkenny to Cork with cave stop',
    dateLabel: 'June 23, 2027',
    base: 'Cork',
    route: 'Kilkenny -> Mitchelstown -> Cork',
    driveTime: '2 hours direct, 4-5 hours with stops',
    distanceMiles: 100,
    lodging: { name: 'Farmhouse or family Airbnb outside Cork', type: 'airbnb', nightlyEstimate: 225, notes: 'Space, laundry, kitchen, and easier parking.' },
    stops: [
      stop('mitchelstown-cave', 'Mitchelstown Cave', 52.267, -8.087, 'drive-stop'),
      stop('cork-base', 'Cork family base', 51.8985, -8.4756, 'lodging')
    ],
    notes: 'Use this as the first longer driving day with a planned break.',
    paymentTags: ruralPaymentTags()
  },
  {
    id: 'day-7',
    day: 7,
    title: 'Blarney Castle, Fota, or Kinsale',
    dateLabel: 'June 24, 2027',
    base: 'Cork',
    driveTime: 'Local drives under 30 minutes',
    lodging: { name: 'Farmhouse or family Airbnb outside Cork', type: 'airbnb', nightlyEstimate: 225 },
    stops: [
      stop('blarney-castle', 'Blarney Castle and Gardens', 51.9291, -8.5709, 'activity', ['src-blarney']),
      stop('fota', 'Fota Wildlife Park', 51.891, -8.3059, 'activity', ['src-fota'], 'High-priority animal stop.'),
      stop('kinsale', 'Kinsale', 51.7059, -8.5222, 'drive-stop')
    ],
    notes: 'Use Blarney as the anchor; choose Fota or Kinsale based on weather and energy.',
    paymentTags: ruralPaymentTags()
  },
  {
    id: 'day-8',
    day: 8,
    title: 'Drive to Dingle',
    dateLabel: 'June 25, 2027',
    base: 'Dingle',
    route: 'Cork -> Kerry -> Dingle',
    driveTime: '3 hours direct, 5-6 hours with stops',
    distanceMiles: 100,
    lodging: { name: 'Farm stay or cottage near Dingle', type: 'farm-stay', nightlyEstimate: 225, notes: 'Best area for sheepdog and lamb experiences.' },
    stops: [
      stop('inch-beach', 'Inch Beach', 52.1437, -9.9826, 'drive-stop'),
      stop('dingle-town', 'Dingle', 52.1409, -10.264, 'lodging')
    ],
    notes: 'Keep the route scenic but avoid overloading the day.',
    paymentTags: dinglePaymentTags()
  },
  {
    id: 'day-9',
    day: 9,
    title: 'Dingle Sheepdogs and Slea Head',
    dateLabel: 'June 26, 2027',
    base: 'Dingle',
    lodging: { name: 'Farm stay or cottage near Dingle', type: 'farm-stay', nightlyEstimate: 225 },
    stops: [
      stop('dingle-sheepdogs', 'Dingle Sheepdogs', 52.1359, -10.3362, 'activity', ['src-dingle-sheepdogs'], 'Key lamb/sheepdog experience.'),
      stop('slea-head', 'Slea Head Drive', 52.1047, -10.4546, 'viewpoint')
    ],
    notes: 'Cash and schedule details should be rechecked close to travel.',
    paymentTags: dinglePaymentTags()
  },
  {
    id: 'day-10',
    day: 10,
    title: 'Dingle to Galway via Bunratty',
    dateLabel: 'June 27, 2027',
    base: 'Galway',
    route: 'Dingle -> Bunratty -> Galway',
    driveTime: '4.5 hours direct, 6-7 hours with stops',
    distanceMiles: 150,
    lodging: { name: 'The Connacht Hotel', type: 'hotel', nightlyEstimate: 250, sourceIds: ['src-connacht'], notes: 'Family-friendly hotel with pool.' },
    stops: [
      stop('bunratty', 'Bunratty Castle and Folk Park', 52.6965, -8.8117, 'drive-stop'),
      stop('connacht-hotel', 'The Connacht Hotel', 53.2867, -9.0188, 'lodging', ['src-connacht'])
    ],
    notes: 'This is the longest relocation day; plan snacks and a real stop.',
    paymentTags: dinglePaymentTags()
  },
  {
    id: 'day-11',
    day: 11,
    title: 'Galway to Dublin with Clonmacnoise',
    dateLabel: 'June 28, 2027',
    base: 'Dublin',
    route: 'Galway -> Clonmacnoise -> Dublin',
    driveTime: '2.5 hours direct, 4 hours with stop',
    distanceMiles: 130,
    lodging: { name: 'Dublin family hotel or aparthotel', type: 'aparthotel', nightlyEstimate: 275, sourceIds: ['src-staycity'] },
    stops: [
      stop('clonmacnoise', 'Clonmacnoise Monastic Site', 53.3276, -7.9846, 'drive-stop'),
      stop('dublin-return-base', 'Dublin return base', 53.3498, -6.2603, 'lodging', ['src-staycity'])
    ],
    notes: 'Return toward Dublin with one meaningful stop, then settle in for two final nights.',
    paymentTags: ruralPaymentTags()
  },
  {
    id: 'day-12',
    day: 12,
    title: 'Final Dublin day',
    dateLabel: 'June 29, 2027',
    base: 'Dublin',
    driveTime: 'Taxi/transit day',
    lodging: { name: 'Dublin family hotel or aparthotel', type: 'aparthotel', nightlyEstimate: 275, sourceIds: ['src-staycity'] },
    stops: [
      stop('final-dublin-shopping', 'Dublin shopping and flexible sightseeing', 53.342, -6.2591, 'activity'),
      stop('pack-for-home', 'Pack documents and confirmations', 53.3498, -6.2603, 'lodging')
    ],
    notes: 'Keep this flexible for shopping, missed Dublin stops, and packing before the flight home.',
    paymentTags: cityPaymentTags()
  },
  {
    id: 'day-13',
    day: 13,
    title: 'Fly home',
    dateLabel: 'June 30, 2027',
    base: 'Travel home',
    route: 'DUB -> connecting airport -> LEX',
    driveTime: 'Airport shuttle only',
    stops: [stop('dub-departure', 'Dublin Airport', 53.4264, -6.2499, 'airport')],
    notes: 'Keep confirmations, passports, and receipts together the night before.',
    paymentTags: cityPaymentTags()
  }
];

const budget: BudgetItem[] = [
  { id: 'budget-flights', category: 'Flights', label: 'LEX to Dublin roundtrip for five', planned: 6000, actual: 0, status: 'watching', notes: 'Target meaningful savings with points or midweek departures.' },
  { id: 'budget-lodging', category: 'Lodging', label: 'Hotels, aparthotels, farm stay, airport hotel', planned: 3200, actual: 0, status: 'researching' },
  { id: 'budget-car', category: 'Transportation', label: 'Automatic SUV/7-seater with insurance', planned: 1500, actual: 0, status: 'researching', sourceIds: ['src-enterprise'] },
  { id: 'budget-food', category: 'Food', label: 'Restaurants, groceries, snacks', planned: 2000, actual: 0, status: 'researching' },
  { id: 'budget-activities', category: 'Activities', label: 'Zoo, castles, wildlife, cliffs, farm experiences', planned: 1600, actual: 0, status: 'researching' },
  { id: 'budget-buffer', category: 'Buffer', label: 'Souvenirs and surprises', planned: 700, actual: 0, status: 'researching' }
];

const tasks: BookingTask[] = [
  {
    id: 'task-book-flights',
    title: 'Book flights and seats together',
    status: 'open',
    dueDate: '2026-09-15',
    category: 'Flights',
    displayCategory: 'Flights & Travel',
    priority: 'high',
    description: 'Avoid basic economy. Prefer Delta or Aer Lingus main cabin for comfort and seating together.',
    notes: 'Avoid basic economy; prefer Delta or Aer Lingus main cabin.',
    aiSuggestion: 'Tuesday departures currently average 12% cheaper.',
    imageKey: 'flights',
    actionLabel: 'View Options',
    subtasksDone: 0,
    subtasksTotal: 2,
    assignedTo: ['Justin', 'Krissy'],
    familyImpact: 'Affects all travelers',
    decisionSummary: 'Book main cabin or equivalent with all five seats assigned together.',
    detailedNotes: 'Compare LEX to DUB one-stop routes, avoid basic economy, and verify the seat map before payment.',
    budgetEstimate: 6200,
    planningFields: {
      preferredAirlines: 'Delta or Aer Lingus',
      seatingPriority: 'Five seats together',
      timingWindow: 'Outbound June 18, return June 30'
    },
    detailSubtasks: [
      { id: 'compare-routes', label: 'Compare one-stop LEX to DUB routes', done: false },
      { id: 'verify-seat-map', label: 'Verify seats together before checkout', done: false }
    ],
    detailLinks: [
      { id: 'delta', label: 'Delta flight search', url: 'https://www.delta.com/' },
      { id: 'aer-lingus', label: 'Aer Lingus flight search', url: 'https://www.aerlingus.com/' }
    ]
  },
  {
    id: 'task-passports',
    title: 'Renew kids passports',
    status: 'done',
    dueDate: '2026-10-01',
    category: 'Documents',
    displayCategory: 'Family Prep',
    priority: 'medium',
    description: 'Passports expire August 2027. Allow enough time for renewal processing.',
    notes: 'Transcript says passports expire August 2027 and family plans October renewal.',
    aiSuggestion: 'Apply by June to avoid summer delays.',
    imageKey: 'passports',
    actionLabel: 'Open Documents',
    subtasksDone: 1,
    subtasksTotal: 1,
    assignedTo: ['Justin'],
    familyImpact: 'Documents'
  },
  {
    id: 'task-flight-alerts',
    title: 'Keep LEX to DUB fare alerts active',
    status: 'done',
    dueDate: '2026-08-01',
    category: 'Flights',
    displayCategory: 'Flights & Travel',
    priority: 'medium',
    description: 'Monitor prices and be ready to book when fares drop.',
    aiSuggestion: 'Fares typically drop 60-90 days before departure.',
    imageKey: 'fare-alerts',
    actionLabel: 'View Alerts',
    subtasksDone: 1,
    subtasksTotal: 2,
    assignedTo: ['Justin']
  },
  {
    id: 'task-check-airline-points',
    title: 'Check airline points and companion savings',
    status: 'done',
    dueDate: '2026-08-15',
    category: 'Flights',
    displayCategory: 'Flights & Travel',
    priority: 'low',
    description: 'Review transferable points, airline credits, and family seating fees before buying.',
    aiSuggestion: 'Compare cash fares against points before locking the route.',
    imageKey: 'flights',
    actionLabel: 'Review Points',
    subtasksDone: 2,
    subtasksTotal: 2
  },
  {
    id: 'task-confirm-passenger-names',
    title: 'Confirm legal names for tickets',
    status: 'done',
    dueDate: '2026-09-01',
    category: 'Flights',
    displayCategory: 'Flights & Travel',
    priority: 'medium',
    description: 'Match ticket names exactly to passports before purchase.',
    aiSuggestion: 'Store names in one shared document to avoid booking-day mistakes.',
    imageKey: 'passports',
    actionLabel: 'Review Names',
    subtasksDone: 1,
    subtasksTotal: 1
  },
  {
    id: 'task-shortlist-lodging',
    title: 'Shortlist family lodging for each base',
    status: 'open',
    dueDate: '2026-11-15',
    category: 'Lodging',
    displayCategory: 'Lodging & Stays',
    priority: 'high',
    description: 'Find family-friendly stays in Dublin, Kilkenny, Cork, Dingle, Galway, and Dublin Airport.',
    aiSuggestion: 'Prioritize laundry, parking, and walkable food options.',
    imageKey: 'lodging',
    actionLabel: 'View Stays',
    subtasksDone: 2,
    subtasksTotal: 6,
    assignedTo: ['Krissy']
  },
  {
    id: 'task-book-lodging',
    title: 'Book refundable lodging holds',
    status: 'open',
    dueDate: '2027-01-15',
    category: 'Lodging',
    displayCategory: 'Lodging & Stays',
    priority: 'high',
    description: 'Hold cancellable rooms and homes so the route stays protected while airfare finalizes.',
    aiSuggestion: 'Refundable aparthotels protect the route while prices settle.',
    imageKey: 'lodging',
    actionLabel: 'Book Holds',
    subtasksDone: 2,
    subtasksTotal: 5
  },
  {
    id: 'task-check-lodging-parking',
    title: 'Confirm parking and laundry at stays',
    status: 'done',
    dueDate: '2027-02-01',
    category: 'Lodging',
    displayCategory: 'Lodging & Stays',
    priority: 'medium',
    description: 'Avoid tight city parking surprises and plan laundry before Dingle/Galway.',
    aiSuggestion: 'Parking notes matter most after Dublin when the rental car starts.',
    imageKey: 'lodging',
    actionLabel: 'Check Details',
    subtasksDone: 3,
    subtasksTotal: 3
  },
  {
    id: 'task-message-hosts',
    title: 'Message hosts about late arrival timing',
    status: 'done',
    dueDate: '2027-03-01',
    category: 'Lodging',
    displayCategory: 'Lodging & Stays',
    priority: 'low',
    description: 'Confirm check-in windows and family setup for longer relocation days.',
    aiSuggestion: 'Ask for crib/extra blanket details in the same message.',
    imageKey: 'lodging',
    actionLabel: 'Draft Messages',
    subtasksDone: 2,
    subtasksTotal: 2
  },
  {
    id: 'task-rental-car',
    title: 'Compare automatic SUV rentals with insurance',
    status: 'open',
    dueDate: '2027-02-15',
    category: 'Rental Car',
    displayCategory: 'Driving in Ireland',
    priority: 'high',
    description: 'Compare automatic SUV/7-seater rentals, child luggage capacity, and insurance coverage.',
    aiSuggestion: 'Automatic transmission availability narrows quickly for summer.',
    imageKey: 'driving',
    actionLabel: 'Compare Cars',
    subtasksDone: 1,
    subtasksTotal: 3,
    sourceIds: ['src-enterprise']
  },
  {
    id: 'task-left-side-driving',
    title: 'Review left-side driving plan',
    status: 'done',
    dueDate: '2027-03-15',
    category: 'Rental Car',
    displayCategory: 'Driving in Ireland',
    priority: 'medium',
    description: 'Plan the first easy driving day from Dublin to Kilkenny.',
    aiSuggestion: 'Avoid city-center pickup if a quieter pickup point is available.',
    imageKey: 'driving',
    actionLabel: 'Review Route',
    subtasksDone: 1,
    subtasksTotal: 1
  },
  {
    id: 'task-download-offline-maps',
    title: 'Download offline maps and routes',
    status: 'open',
    dueDate: '2027-05-15',
    category: 'Rental Car',
    displayCategory: 'Driving in Ireland',
    priority: 'medium',
    description: 'Save offline maps for the Ring of Kerry, Dingle, Galway, and airport return.',
    aiSuggestion: 'Cell service can be spotty on scenic coastal roads.',
    imageKey: 'driving',
    actionLabel: 'Open Map',
    subtasksDone: 0,
    subtasksTotal: 2
  },
  {
    id: 'task-toll-parking-plan',
    title: 'Prepare toll and parking payment plan',
    status: 'blocked',
    dueDate: '2027-05-20',
    category: 'Rental Car',
    displayCategory: 'Driving in Ireland',
    priority: 'low',
    description: 'Confirm cards, coins, and parking apps needed for relocation days.',
    aiSuggestion: 'Keep one backup card outside the main wallet.',
    imageKey: 'driving',
    actionLabel: 'Review Fees',
    subtasksDone: 0,
    subtasksTotal: 2
  },
  {
    id: 'task-packing-list',
    title: 'Build rainy-day packing list',
    status: 'open',
    dueDate: '2027-04-30',
    category: 'Final Prep',
    displayCategory: 'Family Prep',
    priority: 'medium',
    description: 'Add waterproof jackets, flexible layers, and comfortable walking shoes for everyone.',
    aiSuggestion: 'Rain expected in Galway during your stay. Add waterproof jackets.',
    imageKey: 'packing',
    actionLabel: 'View Packing List',
    subtasksDone: 2,
    subtasksTotal: 5
  },
  {
    id: 'task-final-docs',
    title: 'Print confirmations and insurance details',
    status: 'open',
    dueDate: '2027-05-25',
    category: 'Final Prep',
    displayCategory: 'Family Prep',
    priority: 'high',
    description: 'Keep confirmations, passports, prescriptions, and rental insurance details together.',
    aiSuggestion: 'Create one offline folder and one printed packet.',
    imageKey: 'documents',
    actionLabel: 'Open Folder',
    subtasksDone: 1,
    subtasksTotal: 4
  },
  {
    id: 'task-kids-flight-kit',
    title: 'Prepare kids flight comfort kits',
    status: 'done',
    dueDate: '2027-05-01',
    category: 'Final Prep',
    displayCategory: 'Family Prep',
    priority: 'low',
    description: 'Pack headphones, snacks, chargers, small activities, and sleep layers.',
    aiSuggestion: 'Separate each kit by seat so boarding stays calm.',
    imageKey: 'packing',
    actionLabel: 'Pack Kits',
    subtasksDone: 3,
    subtasksTotal: 3
  },
  {
    id: 'task-phone-plan',
    title: 'Choose phone and roaming plan',
    status: 'done',
    dueDate: '2027-04-15',
    category: 'Final Prep',
    displayCategory: 'Family Prep',
    priority: 'medium',
    description: 'Decide whether to use international roaming, eSIM, or local data.',
    aiSuggestion: 'Install eSIMs before departure while everyone has reliable Wi-Fi.',
    imageKey: 'fare-alerts',
    actionLabel: 'Compare Plans',
    subtasksDone: 2,
    subtasksTotal: 2
  },
  {
    id: 'task-book-tickets',
    title: 'Book high-demand attraction tickets',
    status: 'open',
    dueDate: '2027-04-15',
    category: 'Activities',
    displayCategory: 'Experiences',
    priority: 'high',
    description: 'Book Dublin Zoo, Book of Kells, Blarney Castle, Fota, and Cliffs windows as needed.',
    notes: 'Dublin Zoo, Book of Kells, Blarney Castle, Fota, Cliffs if timed entry is recommended.',
    aiSuggestion: 'Book morning slots for busy days so afternoons can stay flexible.',
    imageKey: 'experiences',
    actionLabel: 'View Tickets',
    subtasksDone: 2,
    subtasksTotal: 6
  },
  {
    id: 'task-dingle-sheepdogs',
    title: 'Confirm Dingle Sheepdogs schedule',
    status: 'open',
    dueDate: '2027-04-01',
    category: 'Activities',
    displayCategory: 'Experiences',
    priority: 'medium',
    description: 'Recheck show timing, cash needs, and booking requirements near travel.',
    aiSuggestion: 'This is a key animal experience for the girls.',
    imageKey: 'experiences',
    actionLabel: 'Check Schedule',
    subtasksDone: 0,
    subtasksTotal: 2,
    sourceIds: ['src-dingle-sheepdogs']
  },
  {
    id: 'task-cliffs-weather-plan',
    title: 'Create Cliffs of Moher weather backup',
    status: 'open',
    dueDate: '2027-05-01',
    category: 'Activities',
    displayCategory: 'Experiences',
    priority: 'medium',
    description: 'Pick the best weather window and define a Galway fallback plan.',
    aiSuggestion: 'Visibility matters more than the exact day.',
    imageKey: 'experiences',
    actionLabel: 'View Forecast',
    subtasksDone: 1,
    subtasksTotal: 3,
    sourceIds: ['src-cliffs']
  },
  {
    id: 'task-food-shortlist',
    title: 'Save family-friendly food stops',
    status: 'open',
    dueDate: '2027-05-05',
    category: 'Activities',
    displayCategory: 'Experiences',
    priority: 'low',
    description: 'Create a short list of reliable meals near each base.',
    aiSuggestion: 'Pin one low-effort dinner near every lodging stop.',
    imageKey: 'experiences',
    actionLabel: 'View Pins',
    subtasksDone: 5,
    subtasksTotal: 5
  },
  {
    id: 'task-shopping-wishlist',
    title: 'Make Dublin and Galway shopping wishlist',
    status: 'open',
    dueDate: '2027-05-10',
    category: 'Activities',
    displayCategory: 'Experiences',
    priority: 'low',
    description: 'Save shops and souvenir ideas without overloading sightseeing days.',
    aiSuggestion: 'Use arrival and Galway evenings for flexible shopping time.',
    imageKey: 'experiences',
    actionLabel: 'View Wishlist',
    subtasksDone: 2,
    subtasksTotal: 2
  },
  {
    id: 'task-family-budget-review',
    title: 'Review family budget before booking push',
    status: 'blocked',
    dueDate: '2026-12-01',
    category: 'Documents',
    displayCategory: 'Family Prep',
    priority: 'medium',
    description: 'Recheck flights, stays, car, food, activities, and buffer against the $15,000 target.',
    aiSuggestion: 'Keep a dedicated buffer for weather-driven changes.',
    imageKey: 'documents',
    actionLabel: 'Open Budget',
    subtasksDone: 1,
    subtasksTotal: 3
  },
  {
    id: 'task-share-family-hub',
    title: 'Share Family Hub with everyone',
    status: 'done',
    dueDate: '2026-07-01',
    category: 'Documents',
    displayCategory: 'Family Prep',
    priority: 'low',
    description: 'Make sure everyone can access the shared itinerary, docs, and packing notes.',
    aiSuggestion: 'Pin the Family Hub link before major bookings begin.',
    imageKey: 'documents',
    actionLabel: 'View Family Hub',
    subtasksDone: 1,
    subtasksTotal: 1
  }
];

export function buildSeedData(transcriptPath = path.resolve(process.cwd(), 'ChatGPT.txt')): SeedData {
  const transcript = fs.existsSync(transcriptPath) ? fs.readFileSync(transcriptPath, 'utf8') : '';
  const latestTripMovedTo2027 = /make this trip happen in 2027|June of 2027|Ireland 2027/i.test(transcript);

  const trip: Trip = {
    id: 'ireland-family-trip',
    title: 'Ireland Family Trip',
    month: 'June',
    year: latestTripMovedTo2027 ? 2027 : 2027,
    startDate: '2027-06-18',
    endDate: '2027-06-30',
    travelers: 5,
    adults: 2,
    children: 3,
    origin: 'LEX',
    destination: 'DUB',
    budgetTarget: 15000,
    routeSummary: 'LEX departure -> Dublin -> Kilkenny -> Cork -> Dingle -> Galway -> Dublin -> LEX return',
    priorities: ['Animals and lamb experiences', 'Castles', 'Cliffs of Moher', 'Shopping', 'Family-friendly lodging', 'Manageable drive days'],
    updatedAt: new Date().toISOString()
  };

  return { trip, familyMembers, itinerary, budget, tasks, sources };
}
