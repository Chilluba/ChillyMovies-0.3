// src/contexts/WebTorrentContext.tsx
// This context is stubbed out as active WebTorrent functionality is removed for the UI template.
// You can re-implement this context if you add client-side WebTorrent features later.

import * as React from "react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import webTorrentService from "@/lib/webtorrent-service";
import type { Torrent, TorrentProgress } from "@/lib/webtorrent-service";

interface WebTorrentContextType {
  torrents: TorrentProgress[];
  addTorrent: (magnetURI: string, itemName?: string, itemId?: string | number) => Promise<Torrent | null>;
  removeTorrent: (infoHashOrMagnetURI: string) => Promise<void>;
  pauseTorrent: (infoHashOrMagnetURI: string) => void;
  resumeTorrent: (infoHashOrMagnetURI: string) => void;
  isClientReady: boolean;
  history: import("@/lib/webtorrent-service").HistoryItem[];
  clearHistory?: () => void;
  removeFromHistory?: (infoHash: string) => void;
}

const WebTorrentContext = createContext<WebTorrentContextType | undefined>(undefined);

export const useWebTorrent = () => {
  const ctx = useContext(WebTorrentContext);
  if (!ctx) throw new Error("useWebTorrent must be used within a WebTorrentProvider");
  return ctx;
};

export const WebTorrentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isClientReady, setIsClientReady] = useState(false);
  const [torrents, setTorrents] = useState<TorrentProgress[]>([]);
  const [history, setHistory] = useState<import("@/lib/webtorrent-service").HistoryItem[]>([]);

  // Initialise client once mounted (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    webTorrentService.getClient().then(() => setIsClientReady(true));

    // Subscribe to progress events so UI stays up-to-date
    const offProgress = webTorrentService.onTorrentProgress((prog) => {
      setTorrents((prev: TorrentProgress[]) => {
        const idx = prev.findIndex((p: TorrentProgress) => p.torrentId === prog.torrentId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = prog;
          return copy;
        }
        return [...prev, prog];
      });
    });

    useEffect(() => {
      setHistory(webTorrentService.getDownloadHistory());
      const offHist = webTorrentService.onHistoryUpdated(() => {
        setHistory(webTorrentService.getDownloadHistory());
      });
      return () => offHist();
    }, []);

    return () => {
      offProgress();
    };
  }, []);

  const value: WebTorrentContextType = {
    torrents,
    addTorrent: webTorrentService.addTorrent.bind(webTorrentService),
    removeTorrent: webTorrentService.removeTorrent.bind(webTorrentService),
    pauseTorrent: webTorrentService.pauseTorrent.bind(webTorrentService),
    resumeTorrent: webTorrentService.resumeTorrent.bind(webTorrentService),
    isClientReady,
    history,
    clearHistory: webTorrentService.clearHistory.bind(webTorrentService),
    removeFromHistory: webTorrentService.removeFromHistory.bind(webTorrentService),
  };

  return <WebTorrentContext.Provider value={value}>{children}</WebTorrentContext.Provider>;
};
