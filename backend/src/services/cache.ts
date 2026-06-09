import fs from 'node:fs/promises';
import path from 'node:path';
import cron from 'node-cron';
import { config } from '../config.js';
import type { CatalogSnapshot } from '../utils/types.js';
import { buildCatalog } from './catalog.js';

class CatalogCache {
  private snapshot: CatalogSnapshot | null = null;
  private refreshing = false;
  private lastError: string | null = null;

  getSnapshot(): CatalogSnapshot | null {
    return this.snapshot;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async loadFromDisk(): Promise<void> {
    try {
      const raw = await fs.readFile(config.catalogFile, 'utf-8');
      this.snapshot = JSON.parse(raw) as CatalogSnapshot;
      console.log(
        `Loaded catalog from disk: ${this.snapshot.satellites.length} satellites`,
      );
    } catch {
      console.log('No cached catalog on disk, will fetch fresh data');
    }
  }

  async saveToDisk(snapshot: CatalogSnapshot): Promise<void> {
    await fs.mkdir(config.dataDir, { recursive: true });
    await fs.writeFile(config.catalogFile, JSON.stringify(snapshot, null, 2));
  }

  async refresh(force = false): Promise<CatalogSnapshot> {
    if (this.refreshing && !force) {
      if (this.snapshot) return this.snapshot;
      throw new Error('Catalog refresh in progress and no stale data available');
    }

    this.refreshing = true;
    try {
      console.log('Refreshing satellite catalog...');
      const snapshot = await buildCatalog(config.celestrakGroups);
      this.snapshot = snapshot;
      this.lastError = null;
      await this.saveToDisk(snapshot);
      console.log(`Catalog refreshed: ${snapshot.satellites.length} satellites`);
      return snapshot;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error('Catalog refresh failed:', this.lastError);
      if (this.snapshot) {
        console.log('Serving stale catalog data');
        return this.snapshot;
      }
      throw error;
    } finally {
      this.refreshing = false;
    }
  }

  async ensureLoaded(): Promise<CatalogSnapshot> {
    if (this.snapshot) return this.snapshot;
    await this.loadFromDisk();
    if (this.snapshot) return this.snapshot;
    return this.refresh();
  }

  startScheduledRefresh(): void {
    cron.schedule(config.tleRefreshCron, () => {
      void this.refresh();
    });
    console.log(`TLE refresh scheduled: ${config.tleRefreshCron}`);
  }
}

export const catalogCache = new CatalogCache();
