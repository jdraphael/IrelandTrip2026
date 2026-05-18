import { useMemo, useState } from 'react';
import {
  Binoculars,
  CalendarDays,
  Car,
  Castle,
  ChevronRight,
  CloudFog,
  CloudRain,
  Compass,
  Download,
  Heart,
  Hotel,
  MapPinned,
  Mountain,
  Music,
  Navigation,
  Plane,
  Plus,
  Route,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Utensils,
  Users
} from 'lucide-react';
import { dashboardAssets, itineraryThumbnailAssets } from '../dashboardAssets';
import type { DayPlan, ResearchAnswer, Stop, Trip } from '../types';

interface RoutedStop extends Stop {
  day: number;
  dayId: string;
  dayTitle: string;
  base: string;
}

type LayerId = 'scenic' | 'castles' | 'kids' | 'rain' | 'food' | 'wildlife' | 'viewpoints' | 'rest' | 'emergency';

interface CinematicMapProps {
  days: DayPlan[];
  selectedDayId: string;
  trip?: Trip;
  onSelectDay: (id: string) => void;
  onAskResearch: (question: string, deep: boolean, context?: string) => Promise<ResearchAnswer>;
}

const routeStops = [
  { key: 'lex', title: 'LEX', label: 'Depart', x: 30, y: 17, Icon: Plane },
  { key: 'dublin', title: 'Dublin', label: 'City start', x: 70, y: 41, image: itineraryThumbnailAssets[0] },
  { key: 'kilkenny', title: 'Kilkenny', label: 'Castle city', x: 60, y: 55, image: itineraryThumbnailAssets[1] },
  { key: 'cork', title: 'Cork', label: 'Countryside', x: 45, y: 73, image: itineraryThumbnailAssets[2] },
  { key: 'dingle', title: 'Dingle', label: 'Coast', x: 31, y: 61, image: itineraryThumbnailAssets[3] },
  { key: 'galway', title: 'Galway', label: 'West coast', x: 38, y: 42, image: itineraryThumbnailAssets[4] },
  { key: 'dublin-return', title: 'Dublin', label: 'Return', x: 71, y: 41, image: itineraryThumbnailAssets[0] }
] as const;

const discoveryLayers: Array<{ id: LayerId; label: string; Icon: typeof Mountain }> = [
  { id: 'scenic', label: 'Scenic Routes', Icon: Mountain },
  { id: 'castles', label: 'Castles', Icon: Castle },
  { id: 'kids', label: 'Kid-Friendly', Icon: Users },
  { id: 'rain', label: 'Weather', Icon: CloudRain },
  { id: 'food', label: 'Food & Drink', Icon: Utensils },
  { id: 'wildlife', label: 'Wildlife', Icon: Binoculars },
  { id: 'viewpoints', label: 'Viewpoints', Icon: Compass },
  { id: 'rest', label: 'Rest Stops', Icon: Hotel },
  { id: 'emergency', label: 'Emergency', Icon: ShieldAlert }
];

function googleMapsUrl(day: DayPlan) {
  const locations = day.stops.map((stop) => `${stop.latitude},${stop.longitude}`);
  if (locations.length === 0) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/dir/${locations.map(encodeURIComponent).join('/')}`;
}

function isIrelandStop(stop: { latitude: number; longitude: number }) {
  return stop.latitude >= 51 && stop.latitude <= 56 && stop.longitude >= -11 && stop.longitude <= -5;
}

function dayImage(day?: DayPlan) {
  if (!day) return dashboardAssets.mapDublinBanner;
  const key = `${day.base} ${day.title} ${day.route || ''} ${day.stops.map((stop) => stop.name).join(' ')}`.toLowerCase();
  if (key.includes('kilkenny') || key.includes('castle')) return dashboardAssets.mapKilkennyPreview;
  if (key.includes('dingle') || key.includes('kerry') || key.includes('slea') || key.includes('coast')) return dashboardAssets.mapScenicCoast;
  if (key.includes('galway') || key.includes('cliffs') || key.includes('moher')) return dashboardAssets.mapFogCliffs;
  return dashboardAssets.mapDublinBanner;
}

function routeThumb(base: string) {
  const key = base.toLowerCase();
  if (key.includes('kilkenny')) return itineraryThumbnailAssets[1];
  if (key.includes('cork')) return itineraryThumbnailAssets[2];
  if (key.includes('dingle')) return itineraryThumbnailAssets[3];
  if (key.includes('galway')) return itineraryThumbnailAssets[4];
  return itineraryThumbnailAssets[0];
}

function smartChips(day?: DayPlan) {
  const text = `${day?.title || ''} ${day?.base || ''} ${day?.route || ''} ${day?.notes || ''}`.toLowerCase();
  const chips = ['Scenic', 'Family Friendly'];
  chips.push(text.includes('drive') || text.includes('coast') || text.includes('dingle') ? 'Epic Drive' : 'Easy Walking');
  chips.push(text.includes('galway') || text.includes('cliffs') || text.includes('dingle') ? 'Rain Possible' : 'Transit Friendly');
  return chips;
}

function daySummary(day?: DayPlan) {
  if (!day) return 'A cinematic family route day across Ireland.';
  if (/zoo|phoenix/i.test(day.title)) return 'Relaxed family-focused exploration day in Dublin.';
  if (/dingle|slea|kerry/i.test(`${day.title} ${day.route || ''}`)) return 'Scenic west coast route with flexible family pacing.';
  if (/galway|cliffs|moher/i.test(`${day.title} ${day.route || ''}`)) return 'Weather-aware western Ireland discovery day.';
  if (/kilkenny|castle/i.test(day.title)) return 'Historic castle-country chapter with a gentle driving rhythm.';
  return day.notes || 'Curated Ireland route chapter with family-friendly pacing.';
}

function stopPosition(stop: RoutedStop, index: number) {
  const routeMatch = routeStops.find((item) => stop.base.toLowerCase().includes(item.key.replace('-return', '')) || stop.name.toLowerCase().includes(item.title.toLowerCase()));
  if (routeMatch) {
    const angle = index * 2.399963229728653;
    const radius = 5.8 + (index % 4) * 1.8;
    return {
      x: Math.min(80, Math.max(22, routeMatch.x + Math.cos(angle) * radius)),
      y: Math.min(78, Math.max(20, routeMatch.y + Math.sin(angle) * radius * 0.74))
    };
  }
  const normalizedLon = Math.min(1, Math.max(0, (stop.longitude + 11) / 6));
  const normalizedLat = Math.min(1, Math.max(0, (56 - stop.latitude) / 5));
  return { x: 25 + normalizedLon * 52, y: 25 + normalizedLat * 55 };
}

function familyRating(stop?: RoutedStop) {
  const text = `${stop?.name || ''} ${stop?.kind || ''} ${stop?.dayTitle || ''}`.toLowerCase();
  if (text.includes('zoo') || text.includes('wildlife') || text.includes('sheepdog')) return 'Excellent';
  if (text.includes('drive') || text.includes('castle') || text.includes('park')) return 'Strong';
  return 'Family Friendly';
}

export function CinematicMap({ days, selectedDayId, trip, onSelectDay, onAskResearch }: CinematicMapProps) {
  const selectedDay = days.find((item) => item.id === selectedDayId) || days.find((item) => item.base !== 'In flight' && item.base !== 'Travel home') || days[0];
  const allStops = useMemo(
    () => days.flatMap((item) => item.stops.filter(isIrelandStop).map((stop) => ({ ...stop, day: item.day, dayId: item.id, dayTitle: item.title, base: item.base }))),
    [days]
  );
  const [previewStop, setPreviewStop] = useState<RoutedStop | undefined>(() => allStops.find((stop) => /kilkenny/i.test(stop.name)) || allStops[0]);
  const [activeLayers, setActiveLayers] = useState<LayerId[]>(['scenic', 'kids', 'food', 'viewpoints']);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [asking, setAsking] = useState(false);

  if (!selectedDay) return <section className="map-empty">No itinerary days available yet.</section>;

  const cityCount = Math.max(6, new Set(days.map((day) => day.base).filter((base) => !/flight|travel home/i.test(base))).size);
  const longestDay = days.reduce<DayPlan | undefined>((current, item) => (item.distanceMiles || 0) > (current?.distanceMiles || 0) ? item : current, undefined);
  const visibleStops = allStops.slice(0, 18);

  const toggleLayer = (id: LayerId) => {
    setActiveLayers((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const askForResearchNotes = async () => {
    setAsking(true);
    try {
      await onAskResearch(`Add research notes for Day ${selectedDay.day}: ${selectedDay.title}`, true, `Map page selected day: ${JSON.stringify({ id: selectedDay.id, base: selectedDay.base, route: selectedDay.route, stops: selectedDay.stops.map((stop) => stop.name) })}`);
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="cinematic-map" aria-label="Ireland Expedition Route">
      <div className="map-hero-canvas" aria-hidden="true">
        <img src={dashboardAssets.mapExpedition} alt="" />
        <span className="map-fog map-fog-one" />
        <span className="map-fog map-fog-two" />
        <span className="expedition-path path-one" />
        <span className="expedition-path path-two" />
      </div>

      <header className="map-journey-header glass-panel">
        <div className="journey-title">
          <h1>Ireland Expedition Route</h1>
          <p>12 unforgettable days across Ireland.</p>
        </div>
        <div className="journey-route" aria-label="Primary Ireland route">
          {routeStops.map((stop) => {
            const Icon = 'Icon' in stop ? stop.Icon : undefined;
            return (
              <button className={`journey-node ${selectedDay.base.toLowerCase().includes(stop.title.toLowerCase()) ? 'active' : ''}`} type="button" key={stop.key} onClick={() => {
                const next = days.find((day) => day.base.toLowerCase().includes(stop.title.toLowerCase()));
                if (next) onSelectDay(next.id);
              }}>
                <span className="journey-node-orb">
                  {Icon ? <Icon size={18} /> : <img src={'image' in stop ? stop.image : itineraryThumbnailAssets[0]} alt="" />}
                </span>
                <strong>{stop.title}</strong>
                <small>{stop.label}</small>
              </button>
            );
          })}
        </div>
      </header>

      <aside className="map-stats glass-panel" aria-label="Trip stats">
        <div><Route size={17} /><strong>1,200+ km</strong><span>Total Distance</span></div>
        <div><MapPinned size={17} /><strong>{cityCount}</strong><span>Cities</span></div>
        <div><Users size={17} /><strong>{trip?.travelers || 5}</strong><span>Travelers</span><span className="sr-only">{trip?.travelers || 5} travelers</span></div>
        <div><CalendarDays size={17} /><strong>12</strong><span>Days</span></div>
        <div className="scenic-meter"><span>Scenic Score</span><strong>9.6</strong><small>/10</small></div>
      </aside>

      <aside className="map-day-card glass-panel">
        <div className="day-card-kicker">
          <span>Day {selectedDay.day}</span>
          <button type="button" aria-label="Save day favorite"><Heart size={18} /></button>
        </div>
        <h2>{selectedDay.title}</h2>
        <p className="map-base">{selectedDay.base}, Ireland</p>
        <img className="day-card-banner" src={dayImage(selectedDay)} alt="" />
        <h3>AI Summary</h3>
        <p>{daySummary(selectedDay)}</p>
        <h3>Highlights</h3>
        <div className="map-chip-row">
          {smartChips(selectedDay).map((chip) => <span key={chip}>{chip}</span>)}
        </div>
        <h3>Route Intelligence</h3>
        <ul className="route-intel-list">
          <li>Transit friendly when staying in Dublin</li>
          <li>{selectedDay.driveTime || 'No rental car needed'}</li>
          <li>{selectedDay.distanceMiles ? `${selectedDay.distanceMiles} miles with planned breaks` : '12 min taxi between stops'}</li>
        </ul>
        <div className="map-action-stack">
          <a className="map-primary-action" href={googleMapsUrl(selectedDay)} target="_blank" rel="noreferrer">
            <Navigation size={16} /> Start Navigation
          </a>
          <button type="button" onClick={() => setOfflineSaved(true)} aria-label={offlineSaved ? 'Offline Route Saved' : 'Save Offline Route'}>
            <Download size={15} /> {offlineSaved ? 'Offline Route Saved' : 'Save Offline Route'}
          </button>
          <button type="button" onClick={askForResearchNotes} disabled={asking} aria-label="Add Research Notes">
            <Sparkles size={15} /> {asking ? 'Adding Research Notes' : 'Add Research Notes'}
          </button>
        </div>
      </aside>

      <div className="map-tool-stack glass-panel" aria-label="Map tools">
        <button type="button" aria-label="Search map"><Search size={19} /></button>
        <button type="button" aria-label="Customize layers"><MapPinned size={19} /></button>
        <button type="button" aria-label="Compass view"><Compass size={19} /></button>
      </div>

      <div className="map-route-nodes">
        {routeStops.slice(1, 6).map((stop) => (
          <button
            type="button"
            className="route-place-label"
            style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
            key={stop.key}
            onClick={() => {
              const next = days.find((day) => day.base.toLowerCase().includes(stop.title.toLowerCase()));
              if (next) onSelectDay(next.id);
            }}
          >
            <span>{stop.title}</span>
          </button>
        ))}
        {visibleStops.map((stop, index) => {
          const position = stopPosition(stop, index);
          return (
            <button
              type="button"
              className="map-stop-pin"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              aria-label={`${stop.name} stop preview`}
              key={`${stop.dayId}-${stop.id}`}
              onClick={() => setPreviewStop(stop)}
            >
              <img src={routeThumb(stop.base)} alt="" />
              <span>{index + 1}</span>
            </button>
          );
        })}
      </div>

      {previewStop && (
        <aside className="stop-preview-card glass-panel" aria-label={`${previewStop.name} stop details`}>
          <button className="stop-preview-close" type="button" aria-label="Close stop preview" onClick={() => setPreviewStop(undefined)}>x</button>
          <img src={dayImage(days.find((day) => day.id === previewStop.dayId))} alt="" />
          <h2>{previewStop.name}</h2>
          <p>{previewStop.kind === 'activity' ? 'Signature experience' : previewStop.kind === 'viewpoint' ? 'Scenic viewpoint' : 'Route stop'}</p>
          <div className="preview-meta">
            <span><CloudFog size={15} /> 16 deg C Cloudy</span>
            <span><Route size={15} /> ~2h 15m from previous stop</span>
            <span><Users size={15} /> {familyRating(previewStop)}</span>
          </div>
          <div className="preview-stars" aria-label="Family Friendly rating">
            <span>Family Friendly</span>
            <strong>5 / 5</strong>
          </div>
          <button type="button" onClick={() => onSelectDay(previewStop.dayId)}>Explore {previewStop.name} <ChevronRight size={15} /></button>
        </aside>
      )}

      <aside className="map-widget-rail" aria-label="AI map intelligence">
        <article className="map-widget glass-panel">
          <div><Mountain size={17} /><strong>Scenic Score</strong><ChevronRight size={16} /></div>
          <p>Ring of Kerry Drive</p>
          <strong>9.8 / 10 Scenic</strong>
          <img src={dashboardAssets.mapScenicCoast} alt="" />
        </article>
        <article className="map-widget glass-panel">
          <div><Car size={17} /><strong>Driving Insight</strong><Sparkles size={15} /></div>
          <p>Day {longestDay?.day || 9} exceeds ideal drive duration for younger travelers.</p>
          <button type="button" onClick={() => longestDay && onSelectDay(longestDay.id)}>View details <ChevronRight size={14} /></button>
        </article>
        <article className="map-widget glass-panel">
          <div><CloudRain size={17} /><strong>Weather Overlay</strong><ChevronRight size={16} /></div>
          <p>Fog likely near Cliffs of Moher tomorrow morning.</p>
          <img src={dashboardAssets.mapFogCliffs} alt="" />
          <button type="button">View forecast <ChevronRight size={14} /></button>
        </article>
        <article className="map-widget glass-panel">
          <div><Music size={17} /><strong>Local Discovery</strong><Sparkles size={15} /></div>
          <p>Traditional Irish music session nearby tonight in Dingle.</p>
          <img src={dashboardAssets.mapPubMusic} alt="" />
          <button type="button">View recommendations <ChevronRight size={14} /></button>
        </article>
        <article className="map-widget glass-panel">
          <div><Sparkles size={17} /><strong>AI Recommendation</strong><Plus size={15} /></div>
          <p>Would you like scenic lunch stops added between Cork and Dingle?</p>
          <button type="button" onClick={() => onAskResearch('Suggest scenic lunch stops between Cork and Dingle.', true, 'Map AI recommendation widget')}>Add Lunch Stops <Plus size={14} /></button>
        </article>
      </aside>

      <footer className="map-bottom-dock glass-panel">
        <div className="day-selector-head">
          <strong><CalendarDays size={15} /> Day-by-Day</strong>
          <span>View your full itinerary</span>
        </div>
        <div className="map-day-timeline" aria-label="Map day selector">
          {days.map((day) => (
            <button className={day.id === selectedDay.id ? 'active' : ''} type="button" onClick={() => onSelectDay(day.id)} key={day.id}>
              <img src={routeThumb(day.base)} alt="" />
              <span>{day.day}</span>
              <strong>{day.base.replace('In flight', 'Travel').replace('Travel home', 'Depart')}</strong>
            </button>
          ))}
        </div>
        <div className="map-layer-bar" aria-label="Discovery layers">
          {discoveryLayers.map(({ id, label, Icon }) => (
            <button
              type="button"
              className={activeLayers.includes(id) ? 'active' : ''}
              aria-label={`${label} layer`}
              aria-pressed={activeLayers.includes(id)}
              onClick={() => toggleLayer(id)}
              key={id}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </footer>

      <button className="map-ai-fab" type="button" onClick={() => onAskResearch('Explore the Ireland route with AI and recommend hidden gems for the selected day.', true, 'Mobile map floating AI action')}>
        <Sparkles size={18} /> Explore with AI
      </button>
    </section>
  );
}
