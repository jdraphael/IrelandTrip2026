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
  backgroundTexture: '/dashboard-assets/generated/dashboard-texture.webp',
  checklist: '/dashboard-assets/generated/checklist-illustration.webp',
  budget: '/dashboard-assets/generated/budget-illustration.webp',
  researchAgent: '/dashboard-assets/generated/research-agent.webp',
  familyHub: '/dashboard-assets/generated/family-hub.webp',
  emptyState: '/dashboard-assets/generated/empty-state.webp',
  loginBackground: '/dashboard-assets/generated/login-background.webp',
  irelandMap: '/dashboard-assets/generated/ireland-map.webp',
  chatBackground: '/dashboard-assets/generated/chat-background.webp'
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

export type DashboardAssetKey = keyof typeof dashboardAssets;
