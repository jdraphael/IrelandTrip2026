export const dashboardAssets = {
  sidebarBackground: '/dashboard-assets/generated/sidebar-background.webp',
  heroBanner: '/dashboard-assets/generated/hero-banner.webp',
  planningHealth: '/dashboard-assets/generated/planning-health.webp',
  routeSnapshot: '/dashboard-assets/generated/route-snapshot.webp',
  driveWatch: '/dashboard-assets/generated/drive-watch.webp',
  sourceStatus: '/dashboard-assets/generated/source-status.webp',
  agentButton: '/dashboard-assets/generated/agent-button.png',
  familyProfile: '/dashboard-assets/generated/family-profile.webp',
  bottomMobileNav: '/dashboard-assets/generated/bottom-mobile-nav.png',
  mobileHero: '/dashboard-assets/generated/mobile-hero.webp',
  backgroundTexture: '/dashboard-assets/checklist/dashboard-background-texture.webp',
  checklist: '/dashboard-assets/generated/checklist-illustration.webp',
  budget: '/dashboard-assets/generated/budget-illustration.webp',
  researchAgent: '/dashboard-assets/generated/research-agent.webp',
  familyHub: '/dashboard-assets/generated/family-hub.webp',
  emptyState: '/dashboard-assets/generated/empty-state.webp',
  loginBackground: '/dashboard-assets/generated/login-background.webp',
  irelandMap: '/dashboard-assets/generated/ireland-map.webp',
  chatBackground: '/dashboard-assets/generated/chat-background.webp',
  researchHero: '/dashboard-assets/generated/research-hero-command-center.png',
  researchMap: '/dashboard-assets/generated/research-map-command-center.png',
  researchCardCastles: '/dashboard-assets/generated/research-card-castles.png',
  researchCardFamily: '/dashboard-assets/generated/research-card-family.png',
  researchCardScenic: '/dashboard-assets/generated/research-card-scenic.png',
  researchCardHiddenGems: '/dashboard-assets/generated/research-card-hidden-gems.png',
  researchCardWeather: '/dashboard-assets/generated/research-card-weather.png',
  researchSessionCastles: '/dashboard-assets/generated/research-session-castles.png',
  researchSessionScenic: '/dashboard-assets/generated/research-session-scenic.png',
  mapExpedition: '/dashboard-assets/generated/map-expedition-ireland.png',
  mapDublinBanner: '/dashboard-assets/generated/map-dublin-banner.png',
  mapKilkennyPreview: '/dashboard-assets/generated/map-kilkenny-preview.png',
  mapScenicCoast: '/dashboard-assets/generated/map-scenic-coast.png',
  mapFogCliffs: '/dashboard-assets/generated/map-fog-cliffs.png',
  mapPubMusic: '/dashboard-assets/generated/map-pub-music.png',
  mapFamilyHub: '/dashboard-assets/generated/map-family-hub.png',
  budgetHero: '/dashboard-assets/budget/budget-hero-cliffs.png',
  budgetFlights: '/dashboard-assets/budget/budget-flights-coast.png',
  budgetLodging: '/dashboard-assets/budget/budget-lodging-cottage.png',
  budgetCar: '/dashboard-assets/budget/budget-coastal-suv.png',
  budgetDining: '/dashboard-assets/budget/budget-irish-dining.png',
  budgetExperiences: '/dashboard-assets/budget/budget-cliffs-castles.png',
  budgetSouvenirs: '/dashboard-assets/budget/budget-artisan-market.png'
} as const;

export const itineraryThumbnailAssets = [
  '/dashboard-assets/generated/thumb-dublin.webp',
  '/dashboard-assets/generated/thumb-kilkenny.webp',
  '/dashboard-assets/generated/thumb-cork.webp',
  '/dashboard-assets/generated/thumb-dingle.webp',
  '/dashboard-assets/generated/thumb-galway.webp',
  '/dashboard-assets/generated/thumb-cliffs.webp',
  '/dashboard-assets/generated/thumb-sheepdog.webp',
  '/dashboard-assets/generated/thumb-killarney.webp'
] as const;

export const itineraryAssets = {
  hero: '/dashboard-assets/itinerary/journey-hero.png',
  mobileHero: '/dashboard-assets/checklist/mobile-hero-ireland.webp',
  map: '/dashboard-assets/generated/ireland-map.webp',
  banners: {
    flight: '/dashboard-assets/checklist/checklist-flight-booking.webp',
    dublin: '/dashboard-assets/generated/thumb-dublin.webp',
    kilkenny: '/dashboard-assets/generated/thumb-kilkenny.webp',
    cork: '/dashboard-assets/generated/thumb-cork.webp',
    dingle: '/dashboard-assets/generated/thumb-dingle.webp',
    galway: '/dashboard-assets/generated/thumb-galway.webp',
    cliffs: '/dashboard-assets/generated/thumb-cliffs.webp',
    sheepdog: '/dashboard-assets/generated/thumb-sheepdog.webp',
    killarney: '/dashboard-assets/generated/thumb-killarney.webp',
    castle: '/dashboard-assets/checklist/checklist-experiences.webp',
    home: '/dashboard-assets/generated/route-snapshot.webp'
  }
} as const;

export type DashboardAssetKey = keyof typeof dashboardAssets;
