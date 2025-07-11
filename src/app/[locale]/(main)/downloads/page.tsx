// src/app/[locale]/(main)/downloads/page.tsx
"use client";

import React, { useState, useEffect, use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    DownloadCloudIcon, PlayCircleIcon, PauseCircleIcon, XCircleIcon, 
    FolderOpenIcon, Trash2Icon, RefreshCwIcon, HistoryIcon, 
    ListChecksIcon, FileTextIcon, Loader2Icon, CheckCircle2Icon, 
    AlertTriangleIcon, InfoIcon, ServerIcon, WifiOffIcon, PowerOffIcon
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWebTorrent } from "@/contexts/WebTorrentContext";
import type { TorrentProgress, HistoryItem } from "@/lib/webtorrent-service";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";
import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary';
import ytdl from 'ytdl-core';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Removed stubbed types, using actual ones

interface DownloadsPageProps {
  params: { locale: Locale };
}

interface Aria2DownloadItem {
  gid: string;
  status: string;
  totalLength: string;
  completedLength: string;
  downloadSpeed: string;
  uploadSpeed: string;
  connections: string;
  files: { path: string }[];
  bittorrent?: { info?: { name?: string } };
  errorMessage?: string;
}

interface YoutubeDownload {
  url: string;
  title: string;
  thumbnail: string;
  status: 'pending' | 'downloading' | 'done' | 'error';
  progress: number;
  error?: string;
}

type YoutubeQuality = '360p' | '720p' | '1080p';

interface YoutubeHistoryItem extends YoutubeDownload {
  date: string;
}

const YOUTUBE_HISTORY_KEY = 'chillymovies-youtube-history';

export default function DownloadsPage(props: DownloadsPageProps) {
  const { locale } = use(props.params);
  const { toast } = useToast();

  const { torrents: activeWebTorrents, pauseTorrent, resumeTorrent, removeTorrent, history: webTorrentHistory, clearHistory, removeFromHistory } = useWebTorrent();
  const [aria2Downloads, setAria2Downloads] = useState<Aria2DownloadItem[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  // const [isLoadingAria2, setIsLoadingAria2] = useState(false); // Stubbed
  const [dictionary, setDictionary] = useState<any>(null);

  // YouTube download state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeDownloads, setYoutubeDownloads] = useState<YoutubeDownload[]>([]);
  const [isYoutubeLoading, setIsYoutubeLoading] = useState(false);

  // Quality and audio-only state
  const [youtubeQuality, setYoutubeQuality] = useState<YoutubeQuality>('720p');
  const [youtubeAudioOnly, setYoutubeAudioOnly] = useState(false);
  // Persistent history
  const [youtubeHistory, setYoutubeHistory] = useState<YoutubeHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem(YOUTUBE_HISTORY_KEY) || '[]');
      } catch { return []; }
    }
    return [];
  });

  useEffect(() => {
    const fetchDict = async () => {
      if (locale) {
        const dict = await getDictionary(locale);
        setDictionary(dict.downloadsPage);
      }
    };
    fetchDict();
  }, [locale]);

  // Poll Aria2 status every 3 seconds
  useEffect(() => {
    let stopped = false;
    async function fetchAria2() {
      try {
        const res = await fetch('/api/aria2/status');
        if (!res.ok) throw new Error('Failed to fetch Aria2 status');
        const data = await res.json();
        // Merge all tasks
        const all = [...(data.active || []), ...(data.waiting || []), ...(data.stopped || [])];
        setAria2Downloads(all);
      } catch (e) {
        // Optionally show a toast
      }
    }
    fetchAria2();
    pollingRef.current = setInterval(fetchAria2, 3000);
    return () => {
      stopped = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);


  const getStatusInfo = (status: any, noPeersReason?: string) => {
    const statusKey = status?.toLowerCase().replace(/_/g, '') || 'unknown';
    const label = dictionary?.statusLabels?.[statusKey] || `Unknown (${status})`;
    
    switch (status) {
      case "downloading": case "active": 
        return { badge: <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">{label}</Badge>, icon: <Loader2Icon className="h-4 w-4 text-blue-400 animate-spin" /> };
      case "paused":
        return { badge: <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">{label}</Badge>, icon: <PauseCircleIcon className="h-4 w-4 text-yellow-400" /> };
      case "completed": case "done": case "seeding": case "complete": 
        return { badge: <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">{label}</Badge>, icon: <CheckCircle2Icon className="h-4 w-4 text-green-400" /> };
      case "failed": case "error":
        return { badge: <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">{label}</Badge>, icon: <AlertTriangleIcon className="h-4 w-4 text-red-400" /> };
      case "connecting": case "metadata": case "waiting": 
        return { badge: <Badge variant="outline" className="animate-pulse">{label}</Badge>, icon: <Loader2Icon className="h-4 w-4 text-muted-foreground animate-spin" /> };
      case "stalled":
        return { badge: <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30">{label}</Badge>, icon: <PowerOffIcon className="h-4 w-4 text-orange-400" /> };
      case "no_peers":
        return { badge: <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30" title={noPeersReason}>{label}</Badge>, icon: <WifiOffIcon className="h-4 w-4 text-gray-400" /> };
      case "removed":
        return { badge: <Badge variant="outline">{label}</Badge>, icon: <Trash2Icon className="h-4 w-4 text-muted-foreground" /> };
      default:
        return { badge: <Badge variant="outline">{label}</Badge>, icon: <InfoIcon className="h-4 w-4 text-muted-foreground" /> };
    }
  };

  // STUBBED HANDLERS
  const showStubToast = (action: string, itemName?: string) => {
    toast({
      title: `${action} (Stubbed)`,
      description: `${action} for "${itemName || 'item'}" pressed. Feature to be fully implemented.`,
    });
  };
  const handlePlayWebTorrent = (torrentIdOrMagnet: string) => showStubToast('Play WebTorrent', torrentIdOrMagnet);
  const handleRetryWebTorrentDownload = (item: HistoryItem) => {
     if (item.magnetURI) {
       // attempt add torrent again
       useWebTorrent().addTorrent(item.magnetURI, item.name, item.itemId).catch(()=>{});
     }
  };
  const handleRemoveWebTorrent = (torrentId: string) => {
     removeTorrent(torrentId).catch(()=>{});
  };
  const handlePauseWebTorrent = (torrentId: string) => {
     pauseTorrent(torrentId);
  };
  const handleResumeWebTorrent = (torrentId: string) => {
     resumeTorrent(torrentId);
  };
  // Aria2 controls
  const handlePauseAria2 = async (gid: string) => {
    await fetch('/api/aria2/pause', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gid }) });
  };
  const handleResumeAria2 = async (gid: string) => {
    await fetch('/api/aria2/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gid }) });
  };
  const handleRemoveAria2 = async (gid: string) => {
    await fetch('/api/aria2/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gid }) });
  };
  const handleOpenAria2File = (downloadUrl?: string) => showStubToast('Open Server File', downloadUrl || 'file');
  // clearHistory & removeFromHistory come from context
  const removeDownloadFromHistory = (infoHash: string) => {
    removeFromHistory(infoHash);
  };

  // Handle YouTube download
  const saveYoutubeHistory = (item: YoutubeDownload) => {
    const entry: YoutubeHistoryItem = { ...item, date: new Date().toISOString() };
    setYoutubeHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 50);
      localStorage.setItem(YOUTUBE_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleYoutubeDownload = async () => {
    if (!youtubeUrl) return;
    setIsYoutubeLoading(true);
    let info: any = null;
    try {
      // Fetch video info for title/thumbnail
      const infoRes = await fetch(`/api/youtube/video-info?url=${encodeURIComponent(youtubeUrl)}`);
      info = await infoRes.json();
      const title = info.title || youtubeUrl;
      const thumbnail = info.thumbnail || '';
      setYoutubeDownloads((prev) => [
        { url: youtubeUrl, title, thumbnail, status: 'downloading', progress: 0 },
        ...prev,
      ]);
      // Start download
      const res = await fetch('/api/youtube/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, quality: youtubeQuality, audioOnly: youtubeAudioOnly }),
      });
      if (res.ok) {
        setYoutubeDownloads((prev) => prev.map((d, i) => i === 0 ? { ...d, status: 'done', progress: 100 } : d));
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${title}.${youtubeAudioOnly ? 'mp3' : 'mp4'}`;
        a.click();
        saveYoutubeHistory({ url: youtubeUrl, title, thumbnail, status: 'done', progress: 100 });
      } else {
        const err = await res.json();
        setYoutubeDownloads((prev) => prev.map((d, i) => i === 0 ? { ...d, status: 'error', error: err.error || 'Download failed' } : d));
      }
    } catch (e: any) {
      setYoutubeDownloads((prev) => prev.map((d, i) => i === 0 ? { ...d, status: 'error', error: e.message || 'Error' } : d));
    } finally {
      setIsYoutubeLoading(false);
    }
  };
  const handleRemoveYoutubeDownload = (idx: number) => {
    setYoutubeDownloads((prev) => prev.filter((_, i) => i !== idx));
  };


  if (!dictionary || !locale) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{dictionary.mainTitle}</h1>
          <p className="text-muted-foreground mt-1">{dictionary.mainDescription}</p>
        </div>
        {/* Removed WebTorrent initializing badge as context is stubbed */}
      </div>

      <Tabs defaultValue="webtorrent_active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-x-1.5 rounded-lg p-1.5 bg-muted h-auto md:h-12 text-base">
          <TabsTrigger value="webtorrent_active" className="h-full py-2.5 px-2 md:px-3">{dictionary.tabs.webTorrents}</TabsTrigger>
          <TabsTrigger value="server_downloads" className="h-full py-2.5 px-2 md:px-3">{dictionary.tabs.serverDownloads}</TabsTrigger>
          <TabsTrigger value="youtube" className="h-full py-2.5 px-2 md:px-3">YouTube</TabsTrigger>
          <TabsTrigger value="history" className="h-full py-2.5 px-2 md:px-3 col-span-2 md:col-span-1">{dictionary.tabs.history}</TabsTrigger>
        </TabsList>

        <TabsContent value="webtorrent_active" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader><CardTitle>{dictionary.activeWebTorrents.title}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {activeWebTorrents.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {activeWebTorrents.map((download) => {
                    const { badge: statusBadge, icon: statusIcon } = getStatusInfo(download.status, download.noPeersReason);
                    return (
                      <div key={download.torrentId} className="p-4 md:p-6 hover:bg-muted/30">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-grow min-w-0">
                            <h3 className="font-semibold text-md md:text-lg truncate mb-1" title={download.customName || download.torrentId}>{download.customName || dictionary.fetchingName}</h3>
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">{statusIcon}{statusBadge}</span>
                              <span>{formatBytes(download.downloaded)} / {download.length ? formatBytes(download.length) : dictionary.na}</span>
                              {(download.status === 'downloading' || download.status === 'connecting' || download.status === 'metadata') && download.downloadSpeed > 0 && (
                                <><span className="hidden sm:inline">&bull;</span><span>{formatBytes(download.downloadSpeed)}/s</span></>
                              )}
                              {download.status === 'downloading' && download.remainingTime !== undefined && Number.isFinite(download.remainingTime) && download.remainingTime > 0 && (
                                <><span className="hidden sm:inline">&bull;</span><span>{dictionary.etaLabel}: {new Date(download.remainingTime).toISOString().substr(11, 8)}</span></>
                              )}
                              <span className="hidden sm:inline">&bull;</span><span>{dictionary.peersLabel}: {download.peers}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0 self-start sm:self-center">
                            {(download.status === 'downloading' || download.status === 'connecting' || download.status === 'metadata' || download.status === 'stalled' || download.status === 'no_peers') && (
                              <Button variant="ghost" size="icon" aria-label={dictionary.pauseLabel} onClick={() => handlePauseWebTorrent(download.torrentId)}><PauseCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {download.status === 'paused' && (
                              <Button variant="ghost" size="icon" aria-label={dictionary.resumeLabel} onClick={() => handleResumeWebTorrent(download.torrentId)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {(download.status === 'done' || download.status === 'seeding' || (download.status === 'downloading' && download.progress > 0.01)) && (
                              <Button variant="ghost" size="icon" aria-label={dictionary.playStreamLabel} onClick={() => handlePlayWebTorrent(download.torrentId)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" aria-label={dictionary.removeLabel} onClick={() => handleRemoveWebTorrent(download.torrentId)}><XCircleIcon className="h-5 w-5" /></Button>
                          </div>
                        </div>
                        <Progress value={download.progress * 100} className="mt-3 h-1.5 md:h-2" indicatorClassName={
                            download.status === 'paused' ? 'bg-yellow-500' : 
                            (download.status === 'error' || download.status === 'failed') ? 'bg-red-500' : 
                            (download.status === 'done' || download.status === 'seeding' ) ? 'bg-green-500' : 
                            (download.status === 'stalled' || download.status === 'no_peers') ? 'bg-orange-500' :
                            'bg-primary'} />
                        {download.status === 'no_peers' && download.noPeersReason && <p className="text-xs text-orange-400 mt-1">{download.noPeersReason}</p>}
                        {download.status === 'stalled' && <p className="text-xs text-orange-400 mt-1">{dictionary.downloadStalledMessage}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <DownloadCloudIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">{dictionary.activeWebTorrents.noActiveTitle}</h3>
                  <p className="text-muted-foreground mt-2">{dictionary.activeWebTorrents.noActiveDescriptionStub || "Add downloads from movie or TV series pages."}</p> 
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server_downloads" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader>
              <CardTitle>{dictionary.serverDownloads.title}</CardTitle>
              <CardDescription className="text-xs">{dictionary.serverDownloads.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {aria2Downloads.length === 0 && (
                <div className="text-center py-12 px-6">
                  <ServerIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">{dictionary.serverDownloads.noActiveTitle}</h3>
                  <p className="text-muted-foreground mt-1">{dictionary.serverDownloads.noActiveDescription}</p>
                </div>
              )}
              {aria2Downloads.length > 0 && (
                <div className="divide-y divide-border/30">
                  {aria2Downloads.map((download) => {
                    const { badge: statusBadge, icon: statusIcon } = getStatusInfo(download.status);
                    const name = download.bittorrent?.info?.name || download.files?.[0]?.path?.split('/').pop() || download.gid;
                    const total = Number(download.totalLength || 0);
                    const completed = Number(download.completedLength || 0);
                    const progress = total > 0 ? (completed / total) * 100 : 0;
                    return (
                      <div key={download.gid} className="p-4 md:p-6 hover:bg-muted/30">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-grow min-w-0">
                            <h3 className="font-semibold text-md md:text-lg truncate mb-1" title={name}>{name}</h3>
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">{statusIcon}{statusBadge}</span>
                              <span>{formatBytes(completed)} / {total ? formatBytes(total) : dictionary.na}</span>
                              {download.status === 'active' && Number(download.downloadSpeed) > 0 && <span>{formatBytes(Number(download.downloadSpeed))}/s</span>}
                              {download.status === 'active' && download.connections !== undefined && <><span className="hidden sm:inline">&bull;</span>{dictionary.peersLabel}: {download.connections}</>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0 self-start sm:self-center">
                            {download.status === 'active' && <Button variant="ghost" size="icon" title={dictionary.pauseLabel} onClick={() => handlePauseAria2(download.gid)}><PauseCircleIcon className="h-5 w-5" /></Button>}
                            {download.status === 'paused' && <Button variant="ghost" size="icon" title={dictionary.resumeLabel} onClick={() => handleResumeAria2(download.gid)}><PlayCircleIcon className="h-5 w-5" /></Button>}
                            {download.status === 'complete' && download.files?.[0]?.path && <Button variant="ghost" size="icon" title={dictionary.downloadFileLabel} onClick={() => handleOpenAria2File(download.files[0].path)}><FolderOpenIcon className="h-5 w-5" /></Button>}
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" title={dictionary.removeTaskLabel} onClick={() => handleRemoveAria2(download.gid)}><XCircleIcon className="h-5 w-5" /></Button>
                          </div>
                        </div>
                        <Progress value={progress} className="mt-3 h-1.5 md:h-2" indicatorClassName={download.status === 'paused' ? 'bg-yellow-500' : (download.status === 'error') ? 'bg-red-500' : (download.status === 'complete') ? 'bg-green-500' : 'bg-primary'}/>
                        {download.errorMessage && <p className="text-xs text-destructive mt-1">{download.errorMessage}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="youtube" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader>
              <CardTitle>YouTube Downloader</CardTitle>
              <CardDescription>Paste a YouTube URL to download as MP4 or MP3. Choose quality and format.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="YouTube URL"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  disabled={isYoutubeLoading}
                />
                <Select value={youtubeQuality} onValueChange={v => setYoutubeQuality(v as YoutubeQuality)}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="360p">MP4 360p</SelectItem>
                    <SelectItem value="720p">MP4 720p</SelectItem>
                    <SelectItem value="1080p">MP4 1080p</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={youtubeAudioOnly} onChange={e => setYoutubeAudioOnly(e.target.checked)} />
                  MP3
                </label>
                <Button onClick={handleYoutubeDownload} disabled={isYoutubeLoading || !youtubeUrl}>
                  {isYoutubeLoading ? <Loader2Icon className="animate-spin h-5 w-5" /> : 'Download'}
                </Button>
              </div>
              <div className="space-y-4">
                {youtubeDownloads.map((d, idx) => (
                  <div key={d.url + idx} className="flex items-center gap-4 p-3 border rounded">
                    {d.thumbnail && <img src={d.thumbnail} alt="thumbnail" className="w-16 h-10 object-cover rounded" />}
                    <div className="flex-1">
                      <div className="font-semibold truncate">{d.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{d.url}</div>
                      <Progress value={d.progress} className="mt-1 h-1.5" />
                      {d.status === 'error' && <div className="text-xs text-destructive mt-1">{d.error}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={d.status === 'done' ? 'default' : d.status === 'error' ? 'destructive' : 'secondary'}>{d.status}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveYoutubeDownload(idx)}><XCircleIcon className="h-5 w-5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <h4 className="font-semibold mb-2">Download History</h4>
                <div className="space-y-2">
                  {youtubeHistory.length === 0 && <div className="text-muted-foreground text-sm">No YouTube downloads yet.</div>}
                  {youtubeHistory.map((item, idx) => (
                    <div key={item.url + item.date + idx} className="flex items-center gap-4 p-2 border rounded">
                      {item.thumbnail && <img src={item.thumbnail} alt="thumbnail" className="w-12 h-8 object-cover rounded" />}
                      <div className="flex-1">
                        <div className="font-semibold truncate">{item.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.url}</div>
                        <div className="text-xs text-muted-foreground">{new Date(item.date).toLocaleString()}</div>
                      </div>
                      <Badge variant="default">done</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>{dictionary.history.title}</CardTitle>
                {webTorrentHistory.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm"><Trash2Icon className="mr-2 h-4 w-4"/> {dictionary.history.clearAllButton}</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>{dictionary.history.alertTitle}</AlertDialogTitle><AlertDialogDescription>{dictionary.history.alertDescription}</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{dictionary.history.alertCancel}</AlertDialogCancel>
                                <AlertDialogAction onClick={clearHistory}>{dictionary.history.alertConfirm}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardHeader>
            <CardContent className="p-0">
              {webTorrentHistory.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {webTorrentHistory.map(item => {
                    const { badge: statusBadge, icon: statusIcon } = getStatusInfo(item.status);
                    return (
                      <div key={item.infoHash} className={`p-4 md:p-6 hover:bg-muted/30 ${item.status === 'failed' || item.status === 'error' || item.status === 'stalled' ? 'opacity-70' : ''}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-grow min-w-0">
                            <h3 className="font-semibold text-md md:text-lg truncate mb-1" title={item.name}>{item.name}</h3>
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">{statusIcon}{statusBadge}</span>
                              <span>{dictionary.history.addedLabel}: {new Date(item.addedDate).toLocaleDateString()}</span>
                              {item.completedDate && <><span className="hidden sm:inline">&bull;</span><span>{dictionary.history.finishedLabel}: {new Date(item.completedDate).toLocaleDateString()}</span></>}
                              {item.size && <><span className="hidden sm:inline">&bull;</span><span>{dictionary.history.sizeLabel}: {formatBytes(item.size)}</span></>}
                            </div>
                            {item.lastError && <p className="text-xs text-destructive mt-1">{dictionary.history.errorLabel}: {item.lastError}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0 self-start sm:self-center">
                            {(item.status === 'completed') && item.magnetURI && ( 
                                <Button variant="ghost" size="icon" title={dictionary.history.streamAgainLabel} onClick={() => handlePlayWebTorrent(item.magnetURI)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {(item.status === 'failed' || item.status === 'error' || item.status === 'stalled') && item.magnetURI && (
                              <Button variant="ghost" size="icon" title={dictionary.history.retryLabel} onClick={() => handleRetryWebTorrentDownload(item)}><RefreshCwIcon className="h-5 w-5" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" title={dictionary.history.removeFromHistoryLabel} onClick={() => removeDownloadFromHistory(item.infoHash)}><Trash2Icon className="h-5 w-5" /></Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <HistoryIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">{dictionary.history.noHistoryTitle}</h3>
                  <p className="text-muted-foreground mt-1">{dictionary.history.noHistoryDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
