import { describe, expect, it } from 'vitest';
import { dashboardAssets, itineraryThumbnailAssets } from '../src/dashboardAssets';

describe('dashboard asset registry', () => {
  it('exposes generated dashboard assets from the public asset folder', () => {
    expect(dashboardAssets.heroBanner).toBe('/dashboard-assets/generated/hero-banner.webp');
    expect(dashboardAssets.sidebarBackground).toBe('/dashboard-assets/generated/sidebar-background.webp');
    expect(dashboardAssets.agentButton).toBe('/dashboard-assets/generated/agent-button.png');
    expect(dashboardAssets.bottomMobileNav).toBe('/dashboard-assets/generated/bottom-mobile-nav.png');
    expect(dashboardAssets.loginBackground).toBe('/dashboard-assets/generated/login-background.webp');
    expect(dashboardAssets.mapExpedition).toBe('/dashboard-assets/generated/map-expedition-ireland.png');
    expect(dashboardAssets.mapDublinBanner).toBe('/dashboard-assets/generated/map-dublin-banner.png');
    expect(dashboardAssets.mapKilkennyPreview).toBe('/dashboard-assets/generated/map-kilkenny-preview.png');
    expect(dashboardAssets.mapScenicCoast).toBe('/dashboard-assets/generated/map-scenic-coast.png');
    expect(dashboardAssets.mapFogCliffs).toBe('/dashboard-assets/generated/map-fog-cliffs.png');
    expect(dashboardAssets.mapPubMusic).toBe('/dashboard-assets/generated/map-pub-music.png');
    expect(dashboardAssets.budgetHero).toBe('/dashboard-assets/budget/budget-hero-cliffs.png');
    expect(dashboardAssets.budgetFlights).toBe('/dashboard-assets/budget/budget-flights-coast.png');
    expect(dashboardAssets.budgetLodging).toBe('/dashboard-assets/budget/budget-lodging-cottage.png');
    expect(dashboardAssets.budgetCar).toBe('/dashboard-assets/budget/budget-coastal-suv.png');
    expect(dashboardAssets.budgetDining).toBe('/dashboard-assets/budget/budget-irish-dining.png');
    expect(dashboardAssets.budgetExperiences).toBe('/dashboard-assets/budget/budget-cliffs-castles.png');
    expect(dashboardAssets.budgetSouvenirs).toBe('/dashboard-assets/budget/budget-artisan-market.png');
  });

  it('provides all itinerary thumbnail assets in route order', () => {
    expect(itineraryThumbnailAssets).toEqual([
      '/dashboard-assets/generated/thumb-dublin.webp',
      '/dashboard-assets/generated/thumb-kilkenny.webp',
      '/dashboard-assets/generated/thumb-cork.webp',
      '/dashboard-assets/generated/thumb-dingle.webp',
      '/dashboard-assets/generated/thumb-galway.webp',
      '/dashboard-assets/generated/thumb-cliffs.webp',
      '/dashboard-assets/generated/thumb-sheepdog.webp',
      '/dashboard-assets/generated/thumb-killarney.webp'
    ]);
  });
});
