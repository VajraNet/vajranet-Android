// IndexedDB Utility for Offline Map Tiles & Asset Caching in VajraNet

const DB_NAME = 'VajraNetOfflineMapDB';
const DB_VERSION = 1;
const TILE_STORE = 'tiles';
const PACK_STORE = 'packs';
const ASSET_STORE = 'assets';

/**
 * Open or initialize IndexedDB
 */
export function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(TILE_STORE)) {
        db.createObjectStore(TILE_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(PACK_STORE)) {
        db.createObjectStore(PACK_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        db.createObjectStore(ASSET_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Convert lat/lon/zoom to tile X, Y coordinates
 */
export function latLngToTileTileXY(lat, lng, zoom) {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z: zoom };
}

/**
 * Tile Key helper
 */
export function getTileKey(z, x, y) {
  return `${z}/${x}/${y}`;
}

/**
 * Store a single tile blob in IndexedDB
 */
export async function saveTileToDB(z, x, y, dataUrl) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(TILE_STORE, 'readwrite');
    const store = tx.objectStore(TILE_STORE);
    store.put({
      key: getTileKey(z, x, y),
      z,
      x,
      y,
      dataUrl,
      timestamp: Date.now(),
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save tile to DB:', err);
    return false;
  }
}

/**
 * Get a cached tile from IndexedDB
 */
export async function getTileFromDB(z, x, y) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(TILE_STORE, 'readonly');
    const store = tx.objectStore(TILE_STORE);
    const request = store.get(getTileKey(z, x, y));
    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result && request.result.dataUrl) {
          resolve(request.result.dataUrl);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Save offline metadata assets (shelters, hospitals, emergency contacts)
 */
export async function saveOfflineAssetData(key, data) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(ASSET_STORE, 'readwrite');
    const store = tx.objectStore(ASSET_STORE);
    store.put({
      key,
      data,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Failed to save asset data:', err);
  }
}

/**
 * Fetch offline metadata assets
 */
export async function getOfflineAssetData(key) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(ASSET_STORE, 'readonly');
    const store = tx.objectStore(ASSET_STORE);
    const req = store.get(key);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Pre-packaged regional tile download definitions
 */
export const PRESET_MAP_PACKS = [
  {
    id: 'metro-core',
    name: 'Metro City Core Pack',
    description: 'High-res tiles covering city center, main hospitals & shelters (Zoom 12-15)',
    bounds: { minLat: 12.90, maxLat: 13.05, minLng: 77.52, maxLng: 77.68 },
    minZoom: 12,
    maxZoom: 15,
    estimatedMB: '14.5 MB',
  },
  {
    id: 'district-wide',
    name: 'Greater District Zone Pack',
    description: 'Medium-res coverage of full district relief corridors (Zoom 10-14)',
    bounds: { minLat: 12.75, maxLat: 13.20, minLng: 77.35, maxLng: 77.85 },
    minZoom: 10,
    maxZoom: 14,
    estimatedMB: '38.2 MB',
  },
  {
    id: 'state-highways',
    name: 'Emergency Highway Corridors Pack',
    description: 'Macro overview of evacuation routes & state relief hubs (Zoom 8-12)',
    bounds: { minLat: 11.50, maxLat: 14.50, minLng: 75.50, maxLng: 79.50 },
    minZoom: 8,
    maxZoom: 12,
    estimatedMB: '26.8 MB',
  },
];

/**
 * Calculate list of tiles inside a bounding box across zoom levels
 */
export function getTileListForBounds(bounds, minZoom, maxZoom) {
  const tiles = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const nwTile = latLngToTileTileXY(bounds.maxLat, bounds.minLng, z);
    const seTile = latLngToTileTileXY(bounds.minLat, bounds.maxLng, z);

    const minX = Math.min(nwTile.x, seTile.x);
    const maxX = Math.max(nwTile.x, seTile.x);
    const minY = Math.min(nwTile.y, seTile.y);
    const maxY = Math.max(nwTile.y, seTile.y);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ z, x, y });
      }
    }
  }
  return tiles;
}

/**
 * Download tile image and return base64 DataURL
 */
async function fetchTileAsDataUrl(z, x, y, signal) {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Download a region pack with progress callback and cancel controller
 */
export async function downloadTilePack(packId, bounds, minZoom, maxZoom, onProgress, abortSignal) {
  const tileList = getTileListForBounds(bounds, minZoom, maxZoom);
  const total = tileList.length;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let totalBytes = 0;

  const db = await openOfflineDB();

  const CONCURRENCY = 4;
  let index = 0;

  const worker = async () => {
    while (index < tileList.length) {
      if (abortSignal && abortSignal.aborted) break;
      const current = tileList[index++];
      const { z, x, y } = current;

      const existing = await getTileFromDB(z, x, y);
      if (existing) {
        skipped++;
        downloaded++;
      } else {
        const dataUrl = await fetchTileAsDataUrl(z, x, y, abortSignal);
        if (dataUrl) {
          await saveTileToDB(z, x, y, dataUrl);
          downloaded++;
          totalBytes += Math.round(dataUrl.length * 0.75);
        } else {
          failed++;
        }
      }

      if (onProgress) {
        onProgress({
          total,
          downloaded,
          skipped,
          failed,
          percent: Math.min(100, Math.round((downloaded / total) * 100)),
          mb: (totalBytes / (1024 * 1024)).toFixed(2),
        });
      }
    }
  };

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const tx = db.transaction(PACK_STORE, 'readwrite');
  const store = tx.objectStore(PACK_STORE);
  store.put({
    id: packId,
    downloadedAt: Date.now(),
    tileCount: downloaded,
    bounds,
    minZoom,
    maxZoom,
    sizeMB: (totalBytes / (1024 * 1024)).toFixed(2),
  });

  return { total, downloaded, failed, sizeMB: (totalBytes / (1024 * 1024)).toFixed(2) };
}

/**
 * Get storage statistics
 */
export async function getStorageStats() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction([TILE_STORE, PACK_STORE], 'readonly');
    const tileStore = tx.objectStore(TILE_STORE);
    const packStore = tx.objectStore(PACK_STORE);

    const tileCountReq = tileStore.count();
    const packsReq = packStore.getAll();

    return new Promise((resolve) => {
      tx.oncomplete = () => {
        const tilesCount = tileCountReq.result || 0;
        const packs = packsReq.result || [];
        const estMB = ((tilesCount * 15) / 1024).toFixed(1);
        resolve({ tilesCount, packs, estMB });
      };
      tx.onerror = () => resolve({ tilesCount: 0, packs: [], estMB: '0.0' });
    });
  } catch (err) {
    return { tilesCount: 0, packs: [], estMB: '0.0' };
  }
}

/**
 * Clear all offline map tiles and stored packs
 */
export async function clearOfflineMapData() {
  const db = await openOfflineDB();
  const tx = db.transaction([TILE_STORE, PACK_STORE], 'readwrite');
  tx.objectStore(TILE_STORE).clear();
  tx.objectStore(PACK_STORE).clear();
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}
