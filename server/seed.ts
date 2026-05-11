import fs from 'node:fs';
import path from 'node:path';
import type { BookingTask, BudgetItem, DayPlan, SourceLink, Trip } from '../src/types';

export interface SeedData {
  trip: Trip;
  itinerary: DayPlan[];
  budget: BudgetItem[];
  tasks: BookingTask[];
  sources: SourceLink[];
}

const checkedAt = '2026-05-10T00:00:00.000Z';

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

const itinerary: DayPlan[] = [
  {
    id: 'day-1',
    day: 1,
    title: 'Travel day to Dublin',
    dateLabel: 'Mid-June 2027',
    base: 'In flight',
    route: 'LEX -> connecting airport -> DUB',
    driveTime: 'No Ireland driving',
    stops: [stop('lex', 'Lexington Blue Grass Airport', 38.0365, -84.6059, 'airport')],
    notes: 'Book main cabin or equivalent so the family can choose seats together.'
  },
  {
    id: 'day-2',
    day: 2,
    title: 'Arrive and settle into Dublin',
    dateLabel: 'Mid-June 2027',
    base: 'Dublin',
    lodging: { name: 'Staycity Aparthotels Dublin Castle', type: 'aparthotel', nightlyEstimate: 275, sourceIds: ['src-staycity'], notes: 'Kitchenette and apartment setup for five.' },
    stops: [
      stop('dub-airport', 'Dublin Airport', 53.4264, -6.2499, 'airport'),
      stop('staycity-dublin', 'Staycity Aparthotels Dublin Castle', 53.3403, -6.2705, 'lodging', ['src-staycity'])
    ],
    notes: 'Keep arrival day light. No rental car until leaving Dublin.'
  },
  {
    id: 'day-3',
    day: 3,
    title: 'Dublin Zoo and Phoenix Park',
    dateLabel: 'Mid-June 2027',
    base: 'Dublin',
    driveTime: 'Taxi/transit day',
    lodging: { name: 'Staycity Aparthotels Dublin Castle', type: 'aparthotel', nightlyEstimate: 275, sourceIds: ['src-staycity'] },
    stops: [
      stop('dublin-zoo', 'Dublin Zoo', 53.3564, -6.3053, 'activity', ['src-dublin-zoo'], 'Animal-focused day for the girls.'),
      stop('phoenix-park', 'Phoenix Park', 53.3559, -6.3298, 'viewpoint')
    ],
    notes: 'Book zoo tickets ahead once 2027 ticket windows open.'
  },
  {
    id: 'day-4',
    day: 4,
    title: 'Book of Kells and Dublin shopping',
    dateLabel: 'Mid-June 2027',
    base: 'Dublin',
    lodging: { name: 'Staycity Aparthotels Dublin Castle', type: 'aparthotel', nightlyEstimate: 275, sourceIds: ['src-staycity'] },
    stops: [
      stop('book-kells', 'Book of Kells Experience', 53.3438, -6.2546, 'activity', ['src-book-kells']),
      stop('grafton-street', 'Grafton Street', 53.342, -6.2591, 'activity')
    ],
    notes: 'Time-slot tickets are likely worth booking before travel.'
  },
  {
    id: 'day-5',
    day: 5,
    title: 'Drive to Kilkenny',
    dateLabel: 'Mid-June 2027',
    base: 'Kilkenny',
    route: 'Dublin -> Kildare -> Kilkenny',
    driveTime: '1.5 hours direct',
    distanceMiles: 90,
    lodging: { name: 'Kilkenny family hotel or central inn', type: 'hotel', nightlyEstimate: 220, notes: 'One-night stop near Kilkenny Castle.' },
    stops: [
      stop('irish-national-stud', 'Irish National Stud and Gardens', 53.1524, -6.9103, 'drive-stop'),
      stop('kilkenny-castle', 'Kilkenny Castle', 52.6505, -7.2494, 'activity', ['src-kilkenny-castle'])
    ],
    notes: 'Pick up the rental car after Dublin sightseeing, then ease into left-side driving.'
  },
  {
    id: 'day-6',
    day: 6,
    title: 'Kilkenny to Cork with cave stop',
    dateLabel: 'Mid-June 2027',
    base: 'Cork',
    route: 'Kilkenny -> Mitchelstown -> Cork',
    driveTime: '2 hours direct, 4-5 hours with stops',
    distanceMiles: 100,
    lodging: { name: 'Farmhouse or family Airbnb outside Cork', type: 'airbnb', nightlyEstimate: 225, notes: 'Space, laundry, kitchen, and easier parking.' },
    stops: [
      stop('mitchelstown-cave', 'Mitchelstown Cave', 52.267, -8.087, 'drive-stop'),
      stop('cork-base', 'Cork family base', 51.8985, -8.4756, 'lodging')
    ],
    notes: 'Use this as the first longer driving day with a planned break.'
  },
  {
    id: 'day-7',
    day: 7,
    title: 'Blarney Castle and Gardens',
    dateLabel: 'Mid-June 2027',
    base: 'Cork',
    driveTime: 'Local drives under 30 minutes',
    lodging: { name: 'Farmhouse or family Airbnb outside Cork', type: 'airbnb', nightlyEstimate: 225 },
    stops: [stop('blarney-castle', 'Blarney Castle and Gardens', 51.9291, -8.5709, 'activity', ['src-blarney'])],
    notes: 'Book online to reduce summer queue stress.'
  },
  {
    id: 'day-8',
    day: 8,
    title: 'Fota Wildlife Park or Kinsale',
    dateLabel: 'Mid-June 2027',
    base: 'Cork',
    lodging: { name: 'Farmhouse or family Airbnb outside Cork', type: 'airbnb', nightlyEstimate: 225 },
    stops: [
      stop('fota', 'Fota Wildlife Park', 51.891, -8.3059, 'activity', ['src-fota'], 'High-priority animal stop.'),
      stop('kinsale', 'Kinsale', 51.7059, -8.5222, 'drive-stop')
    ],
    notes: 'Choose Fota as the anchor; Kinsale is the optional color-and-coast add-on.'
  },
  {
    id: 'day-9',
    day: 9,
    title: 'Drive to Dingle',
    dateLabel: 'Mid-June 2027',
    base: 'Dingle',
    route: 'Cork -> Kerry -> Dingle',
    driveTime: '3 hours direct, 5-6 hours with stops',
    distanceMiles: 100,
    lodging: { name: 'Farm stay or cottage near Dingle', type: 'farm-stay', nightlyEstimate: 225, notes: 'Best area for sheepdog and lamb experiences.' },
    stops: [
      stop('inch-beach', 'Inch Beach', 52.1437, -9.9826, 'drive-stop'),
      stop('dingle-town', 'Dingle', 52.1409, -10.264, 'lodging')
    ],
    notes: 'Keep the route scenic but avoid overloading the day.'
  },
  {
    id: 'day-10',
    day: 10,
    title: 'Dingle Sheepdogs and Slea Head',
    dateLabel: 'Mid-June 2027',
    base: 'Dingle',
    lodging: { name: 'Farm stay or cottage near Dingle', type: 'farm-stay', nightlyEstimate: 225 },
    stops: [
      stop('dingle-sheepdogs', 'Dingle Sheepdogs', 52.1359, -10.3362, 'activity', ['src-dingle-sheepdogs'], 'Key lamb/sheepdog experience.'),
      stop('slea-head', 'Slea Head Drive', 52.1047, -10.4546, 'viewpoint')
    ],
    notes: 'Cash and schedule details should be rechecked close to travel.'
  },
  {
    id: 'day-11',
    day: 11,
    title: 'Killarney option day',
    dateLabel: 'Mid-June 2027',
    base: 'Dingle',
    driveTime: 'Local scenic day',
    lodging: { name: 'Farm stay or cottage near Dingle', type: 'farm-stay', nightlyEstimate: 225 },
    stops: [
      stop('killarney-national-park', 'Killarney National Park', 52.0167, -9.506, 'viewpoint'),
      stop('gap-dunloe', 'Gap of Dunloe', 52.0236, -9.6338, 'activity')
    ],
    notes: 'Use as a flexible day depending on weather and energy.'
  },
  {
    id: 'day-12',
    day: 12,
    title: 'Dingle to Galway via Bunratty',
    dateLabel: 'Mid-June 2027',
    base: 'Galway',
    route: 'Dingle -> Bunratty -> Galway',
    driveTime: '4.5 hours direct, 6-7 hours with stops',
    distanceMiles: 150,
    lodging: { name: 'The Connacht Hotel', type: 'hotel', nightlyEstimate: 250, sourceIds: ['src-connacht'], notes: 'Family-friendly hotel with pool.' },
    stops: [
      stop('bunratty', 'Bunratty Castle and Folk Park', 52.6965, -8.8117, 'drive-stop'),
      stop('connacht-hotel', 'The Connacht Hotel', 53.2867, -9.0188, 'lodging', ['src-connacht'])
    ],
    notes: 'This is the longest relocation day; plan snacks and a real stop.'
  },
  {
    id: 'day-13',
    day: 13,
    title: 'Cliffs of Moher day trip',
    dateLabel: 'Mid-June 2027',
    base: 'Galway',
    lodging: { name: 'The Connacht Hotel', type: 'hotel', nightlyEstimate: 250, sourceIds: ['src-connacht'] },
    stops: [stop('cliffs-moher', 'Cliffs of Moher', 52.9715, -9.4309, 'viewpoint', ['src-cliffs'])],
    notes: 'Check weather before committing this day; visibility matters.'
  },
  {
    id: 'day-14',
    day: 14,
    title: 'Connemara and Galway',
    dateLabel: 'Mid-June 2027',
    base: 'Galway',
    lodging: { name: 'The Connacht Hotel', type: 'hotel', nightlyEstimate: 250, sourceIds: ['src-connacht'] },
    stops: [
      stop('connemara', 'Connemara National Park', 53.548, -9.9486, 'viewpoint'),
      stop('salthill', 'Salthill Promenade', 53.2592, -9.0741, 'activity')
    ],
    notes: 'Flexible outdoor day with Galway food and markets as the fallback.'
  },
  {
    id: 'day-15',
    day: 15,
    title: 'Return to Dublin Airport',
    dateLabel: 'Mid-June 2027',
    base: 'Dublin Airport',
    route: 'Galway -> Clonmacnoise -> Dublin Airport',
    driveTime: '2.5 hours direct, 4 hours with stop',
    distanceMiles: 130,
    lodging: { name: 'Clayton Hotel Dublin Airport', type: 'airport-hotel', nightlyEstimate: 230, sourceIds: ['src-clayton'] },
    stops: [
      stop('clonmacnoise', 'Clonmacnoise Monastic Site', 53.3276, -7.9846, 'drive-stop'),
      stop('clayton-airport', 'Clayton Hotel Dublin Airport', 53.4129, -6.2179, 'lodging', ['src-clayton'])
    ],
    notes: 'Return rental car and make the final morning easy.'
  },
  {
    id: 'day-16',
    day: 16,
    title: 'Fly home',
    dateLabel: 'Mid-June 2027',
    base: 'Travel home',
    route: 'DUB -> connecting airport -> LEX',
    driveTime: 'Airport shuttle only',
    stops: [stop('dub-departure', 'Dublin Airport', 53.4264, -6.2499, 'airport')],
    notes: 'Keep confirmations, passports, and receipts together the night before.'
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
  { id: 'task-passports', title: 'Renew kids passports', status: 'open', dueDate: '2026-10-01', category: 'Documents', notes: 'Transcript says passports expire August 2027 and family plans October renewal.', sourceIds: ['src-dfa-passports'] },
  { id: 'task-flight-alerts', title: 'Keep LEX to DUB fare alerts active', status: 'done', dueDate: '2026-08-01', category: 'Flights' },
  { id: 'task-book-flights', title: 'Book flights and seats together', status: 'open', dueDate: '2026-09-15', category: 'Flights', notes: 'Avoid basic economy; prefer Delta or American main cabin.' },
  { id: 'task-shortlist-lodging', title: 'Shortlist family lodging for each base', status: 'open', dueDate: '2026-11-15', category: 'Lodging' },
  { id: 'task-book-lodging', title: 'Book refundable lodging holds', status: 'open', dueDate: '2027-01-15', category: 'Lodging' },
  { id: 'task-rental-car', title: 'Compare automatic SUV/7-seater rentals with insurance', status: 'open', dueDate: '2027-02-15', category: 'Rental Car' },
  { id: 'task-book-tickets', title: 'Book high-demand attraction tickets', status: 'open', dueDate: '2027-04-15', category: 'Activities', notes: 'Dublin Zoo, Book of Kells, Blarney Castle, Fota, Cliffs if timed entry is recommended.' },
  { id: 'task-final-docs', title: 'Print confirmations and rental insurance details', status: 'open', dueDate: '2027-05-25', category: 'Final Prep' }
];

export function buildSeedData(transcriptPath = path.resolve(process.cwd(), 'ChatGPT.txt')): SeedData {
  const transcript = fs.existsSync(transcriptPath) ? fs.readFileSync(transcriptPath, 'utf8') : '';
  const latestTripMovedTo2027 = /make this trip happen in 2027|June of 2027|Ireland 2027/i.test(transcript);

  const trip: Trip = {
    id: 'ireland-family-trip',
    title: 'Ireland Family Trip',
    month: 'June',
    year: latestTripMovedTo2027 ? 2027 : 2027,
    travelers: 5,
    adults: 2,
    children: 3,
    origin: 'LEX',
    destination: 'DUB',
    budgetTarget: 15000,
    routeSummary: 'Dublin -> Kilkenny -> Cork -> Dingle/Killarney -> Galway -> Dublin Airport',
    priorities: ['Animals and lamb experiences', 'Castles', 'Cliffs of Moher', 'Shopping', 'Family-friendly lodging', 'Manageable drive days'],
    updatedAt: new Date().toISOString()
  };

  return { trip, itinerary, budget, tasks, sources };
}
