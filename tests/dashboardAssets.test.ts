import { describe, expect, it } from 'vitest';
import { dashboardAssets, itineraryThumbnailAssets } from '../src/dashboardAssets';

describe('dashboard asset registry', () => {
  it('exposes generated dashboard assets from the public asset folder', () => {
    expect(dashboardAssets.heroBanner).toBe('/dashboard-assets/generated/hero-banner.webp');
    expect(dashboardAssets.sidebarBackground).toBe('/dashboard-assets/generated/sidebar-background.webp');
    expect(dashboardAssets.agentButton).toBe('/dashboard-assets/generated/agent-button.png');
    expect(dashboardAssets.bottomMobileNav).toBe('/dashboard-assets/generated/bottom-mobile-nav.png');
    expect(dashboardAssets.loginBackground).toBe('/dashboard-assets/generated/login-background.webp');
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
