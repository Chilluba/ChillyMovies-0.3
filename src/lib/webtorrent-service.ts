// src/lib/webtorrent-service.ts

import { Buffer } from "buffer";
// Fallback type declaration so TypeScript doesn't complain if @types definitions are missing
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type WebTorrent from "webtorrent";

// Lightweight EventEmitter implementation to avoid Node.js 'events' dependency in the browser bundle
class SimpleEmitter {
  private listeners: Record<string, Array<(...args: any[]) => void>> = {};

  on(event: string, fn: (...args: any[]) => void) {
    this.listeners[event] ??= [];
    this.listeners[event].push(fn);
  }

  off(event: string, fn: (...args: any[]) => void) {
    this.listeners[event] = (this.listeners[event] ?? []).filter((l) => l !== fn);
  }

  emit(event: string, ...args: any[]) {
    (this.listeners[event] ?? []).forEach((fn) => fn(...args));
  }
}

// ---
// Polyfills for browser environment so that the webtorrent browser build works
// ---
if (typeof window !== "undefined") {
  // Buffer polyfill
  if (typeof (window as any).Buffer === "undefined") {
    (window as any).Buffer = Buffer;
  }
  // Minimal process polyfill expected by some node libs
  if (typeof (window as any).process === "undefined") {
    (window as any).process = { env: {} };
  }
  if (typeof (window as any).global === "undefined") {
    (window as any).global = window;
  }
}

// ---------------------------------------------------------------------------
// Types used across the UI. Keep in sync with the existing stubs so we do not
// have to touch a lot of files.
// ---------------------------------------------------------------------------
export type TorrentProgressStatus =
  | "idle"
  | "downloading"
  | "seeding"
  | "paused"
  | "error"
  | "connecting"
  | "done"
  | "metadata";

export interface TorrentProgress {
  torrentId: string; // torrent.infoHash
  progress: number; // 0 – 1
  downloadSpeed: number; // bytes / s
  uploadSpeed: number; // bytes / s
  peers: number;
  remainingTime?: number; // ms
  downloaded: number; // bytes
  length?: number; // bytes
  customName?: string;
  addedDate?: Date;
  itemId?: string | number;
  status: TorrentProgressStatus;
}

export interface HistoryItem {
  infoHash: string;
  magnetURI: string;
  name: string;
  itemId?: string | number;
  addedDate: string;
  completedDate?: string;
  status: "completed" | "failed" | "removed" | "active" | "error";
  size?: number;
  lastError?: string;
}

export interface Torrent extends WebTorrent.Torrent {
  // Additional metadata we attach so that UI can display the torrent nicely
  customName?: string;
  addedDate?: Date;
  itemId?: string | number;
}

// ---------------------------------------------------------------------------
// Actual service implementation
// ---------------------------------------------------------------------------
class WebTorrentService {
  private _client: WebTorrent.Instance | null = null;
  private emitter = new SimpleEmitter();
  private HISTORY_STORAGE_KEY = "chillymovies_download_history_v2";

  private async getClientInternal(): Promise<WebTorrent.Instance> {
    if (this._client) return this._client;

    // Dynamically import so that the browser build is only evaluated client-side.
    const WebTorrentModule = (await import("webtorrent")) as unknown as typeof import("webtorrent");
    this._client = new WebTorrentModule();

    // Re-emit progress events at an interval so the UI can update.
    this._client.on("torrent", (torrent) => {
      torrent.on("download", () => this.emitProgress(torrent));
      torrent.on("done", () => {
        this.persistToHistory(torrent, "completed");
        this.emitter.emit("done", torrent);
        this.emitProgress(torrent);
      });
      this.emitProgress(torrent);
      this.emitter.emit("added", torrent);
    });

    return this._client;
  }

  /* ---------------------------------------------------------
   * Public API
   * ------------------------------------------------------ */
  public async getClient() {
    return this.getClientInternal();
  }

  async addTorrent(magnetURI: string, customName?: string, itemId?: string | number): Promise<Torrent | null> {
    const client = await this.getClientInternal();

    // Avoid duplicates
    const existing = client.get(magnetURI);
    if (existing) return null;

    return new Promise((resolve, reject) => {
      client.add(magnetURI, (torrent: Torrent) => {
        torrent.customName = customName;
        torrent.itemId = itemId;
        torrent.addedDate = new Date();
        this.persistToHistory(torrent, "active");
        resolve(torrent);
      });
    });
  }

  getTorrent(infoHashOrMagnetURI: string): Torrent | undefined {
    if (!this._client) return undefined;
    return this._client.get(infoHashOrMagnetURI) as Torrent | undefined;
  }

  async removeTorrent(infoHashOrMagnetURI: string): Promise<void> {
    const client = await this.getClientInternal();
    const torrent = client.get(infoHashOrMagnetURI);
    if (!torrent) return;
    return new Promise((res) => {
      client.remove(torrent, () => {
        this.persistToHistory(torrent as Torrent, "removed");
        this.emitter.emit("removed", torrent.infoHash);
        res();
      });
    });
  }

  pauseTorrent(infoHashOrMagnetURI: string) {
    const torrent: any = this.getTorrent(infoHashOrMagnetURI) as any;
    torrent?.pause?.();
  }

  resumeTorrent(infoHashOrMagnetURI: string) {
    const torrent: any = this.getTorrent(infoHashOrMagnetURI) as any;
    torrent?.resume?.();
  }

  getAllTorrentsProgress(): TorrentProgress[] {
    if (!this._client) return [];
    return this._client.torrents.map((t) => this.buildProgress(t as Torrent));
  }

  /* ---------------------------------------------------------
   * Event helpers
   * ------------------------------------------------------ */
  private emitProgress(torrent: Torrent) {
    const prog = this.buildProgress(torrent);
    this.emitter.emit("progress", prog);
  }

  private buildProgress(torrent: any): TorrentProgress {
    return {
      torrentId: torrent.infoHash,
      progress: torrent.progress,
      downloadSpeed: torrent.downloadSpeed,
      uploadSpeed: torrent.uploadSpeed,
      peers: torrent.numPeers,
      remainingTime: torrent.timeRemaining,
      downloaded: torrent.downloaded,
      length: torrent.length,
      customName: torrent.customName,
      addedDate: torrent.addedDate,
      itemId: torrent.itemId,
      status: torrent.done ? "done" : torrent.paused ? "paused" : torrent.progress > 0 ? "downloading" : "metadata",
    };
  }

  /* ---------------------------------------------------------
   * History helpers (stored in localStorage)
   * ------------------------------------------------------ */
  private loadHistory(): HistoryItem[] {
    if (typeof localStorage === "undefined") return [];
    const s = localStorage.getItem(this.HISTORY_STORAGE_KEY);
    if (!s) return [];
    try {
      return JSON.parse(s);
    } catch {
      return [];
    }
  }

  private saveHistory(history: HistoryItem[]) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(history));
  }

  private persistToHistory(torrent: any, status: HistoryItem["status"]) {
    if (typeof localStorage === "undefined") return;
    const history = this.loadHistory();
    const existingIndex = history.findIndex((h) => h.infoHash === torrent.infoHash);
    const entry: HistoryItem = {
      infoHash: torrent.infoHash,
      magnetURI: torrent.magnetURI,
      name: torrent.name || torrent.customName || torrent.infoHash,
      itemId: torrent.itemId,
      addedDate: torrent.addedDate?.toISOString() || new Date().toISOString(),
      completedDate: status === "completed" ? new Date().toISOString() : undefined,
      status,
      size: torrent.length,
    };
    if (existingIndex >= 0) {
      history[existingIndex] = { ...history[existingIndex], ...entry };
    } else {
      history.push(entry);
    }
    this.saveHistory(history);
    this.emitter.emit("historyUpdated");
  }

  /* ---------------------------------------------------------
   * Listener registration helpers
   * ------------------------------------------------------ */
  onTorrentProgress(listener: (progress: TorrentProgress) => void) {
    this.emitter.on("progress", listener);
    return () => this.emitter.off("progress", listener);
  }

  onTorrentAdded(listener: (torrent: Torrent) => void) {
    this.emitter.on("added", listener);
    return () => this.emitter.off("added", listener);
  }

  onTorrentRemoved(listener: (infoHash: string) => void) {
    this.emitter.on("removed", listener);
    return () => this.emitter.off("removed", listener);
  }

  onTorrentDone(listener: (torrent: any) => void) {
    this.emitter.on("done", listener);
    return () => this.emitter.off("done", listener);
  }

  onHistoryUpdated(listener: () => void) {
    this.emitter.on("historyUpdated", listener);
    return () => this.emitter.off("historyUpdated", listener);
  }
}

const webTorrentService = new WebTorrentService();
export default webTorrentService;
