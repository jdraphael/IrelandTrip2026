import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('home screen app metadata', () => {
  it('advertises a manifest and Apple touch icon for saved phone shortcuts', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');

    expect(html).toContain('rel="manifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('theme-color');
  });

  it('ships installable app icons for browser tabs and iPhone home screen', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'public', 'site.webmanifest'), 'utf8')) as {
      display?: string;
      icons?: Array<{ src: string; sizes: string; purpose?: string }>;
    };

    expect(manifest.display).toBe('standalone');
    expect(manifest.icons?.some((icon) => icon.sizes === '180x180')).toBe(true);
    expect(manifest.icons?.some((icon) => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons?.some((icon) => icon.sizes === '512x512' && icon.purpose?.includes('maskable'))).toBe(true);
    expect(existsSync(join(root, 'public', 'apple-touch-icon.png'))).toBe(true);
    expect(existsSync(join(root, 'public', 'icon-192.png'))).toBe(true);
    expect(existsSync(join(root, 'public', 'icon-512.png'))).toBe(true);
  });
});
