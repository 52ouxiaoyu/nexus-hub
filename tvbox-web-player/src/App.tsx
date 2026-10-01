import { useState, useEffect, useRef, useMemo } from 'react';
import { Settings2, Film, ChevronLeft, Play, Search, Network } from 'lucide-react';
import { HlsPlayer } from './HlsPlayer';

interface Site {
  key: string;
  name: string;
  type: number;
  api: string;
  live?: boolean;
}

interface LiveChannel {
  name: string;
  url: string;
  // Same-name channels from multiple sources get merged into one entry with backup URLs
  urls?: string[];
  group: string;
  logo: string;
}

interface Category {
  type_id: string;
  type_name: string;
}

interface Video {
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  vod_remarks: string;
}

interface VideoDetail extends Video {
  vod_play_from: string;
  vod_play_url: string;
}

// Global search result: carries the site it came from so detail can be loaded from the right source
interface SearchItem extends VideoDetail {
  site: Site;
}

// Watch history entry: full detail is kept so the exact episode and its stream can resume
interface WatchHistoryItem {
  site: Site;
  video: VideoDetail;
  playUrl: string;
  epLabel: string;
  time: number;
  timestamp: number;
}

// Favorite: a video bookmarked together with its source site so it can be replayed later.
// epCount/epDelta power the "updated N episodes" badge (追更提醒)
interface FavItem {
  site: Site;
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  vod_remarks: string;
  ts: number;
  epCount?: number;
  epDelta?: number;
}

const PROXY_URL = '/api/proxy?url=';
const LOCAL_PROXY = 'http://localhost:8080/api/proxy?url=';
const FALLBACK_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?url='
];

// Cache of the last proxy that actually worked, so we try it first next time
let workingProxy = localStorage.getItem('tvbox_working_proxy') || '';

const proxyName = (base: string) => {
  if (base === PROXY_URL) return '云端代理';
  if (base.includes('localhost')) return '本地代理';
  if (base.includes('allorigins')) return '兜底代理A';
  if (base.includes('corsproxy')) return '兜底代理B';
  return base.split('?')[0].slice(0, 40);
};

const fetchViaProxy = async (base: string, url: string, asText = false) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(base + encodeURIComponent(url), { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    return asText ? text : parseRelaxedJSON(text);
  } finally {
    clearTimeout(timer);
  }
};

// Helper to fetch with multi-level proxy chain:
// custom proxy -> last working proxy -> CF cloud proxy -> local proxy -> public fallbacks
const fetchWithProxy = async (url: string, asText = false) => {
  // Same-origin resources load directly, no proxy needed
  if (isSameOrigin(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    return asText ? text : parseRelaxedJSON(text);
  }
  const custom = localStorage.getItem('tvbox_custom_proxy') || '';
  const bases: string[] = [];
  [custom, workingProxy, PROXY_URL, LOCAL_PROXY, ...FALLBACK_PROXIES].forEach(b => {
    if (b && !bases.includes(b)) bases.push(b);
  });
  const errors: string[] = [];
  for (const base of bases) {
    try {
      const data = await fetchViaProxy(base, url, asText);
      if (workingProxy !== base) {
        workingProxy = base;
        localStorage.setItem('tvbox_working_proxy', base);
      }
      return data;
    } catch (e: any) {
      errors.push(proxyName(base) + '：' + (e?.name === 'AbortError' ? '超时' : (e?.message || '失败')));
    }
  }
  throw new Error(errors.join('；'));
};

// Preferred proxy for stream relaying (hls.js segments): custom > last working > cloud
const getPreferredProxy = () =>
  localStorage.getItem('tvbox_custom_proxy') || workingProxy || PROXY_URL;

const parseM3U = (text: string): LiveChannel[] => {
  const out: LiveChannel[] = [];
  let cur: { name: string; group: string; logo: string } | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF')) {
      const name = (line.split(',').pop() || '').trim();
      const group = /group-title="([^"]*)"/.exec(line)?.[1] || '未分组';
      const logo = /tvg-logo="([^"]*)"/.exec(line)?.[1] || '';
      cur = { name, group, logo };
    } else if (line && !line.startsWith('#')) {
      if (/^https?:\/\//i.test(line) && cur && cur.name) {
        out.push({ ...cur, url: line });
      }
      cur = null;
    }
  }
  return out;
};

// Merge same-name channels (m3u lists often carry several URLs per channel from
// different CDNs/ISPs) into one entry with ordered backup URLs
const mergeChannelSources = (channels: LiveChannel[]): LiveChannel[] => {
  const map = new Map<string, LiveChannel>();
  for (const c of channels) {
    const ex = map.get(c.group + '|' + c.name);
    if (ex) {
      if (!ex.urls!.includes(c.url)) ex.urls!.push(c.url);
    } else {
      map.set(c.group + '|' + c.name, { ...c, urls: [c.url] });
    }
  }
  return [...map.values()];
};

// Helper to parse relaxed JSON (TVBox configs often have // comments)
const parseRelaxedJSON = (text: string) => {
  const clean = text.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
  try {
    return JSON.parse(clean);
  } catch (e) {
    const noTrailing = clean.replace(/,\s*([\]}])/g, '$1');
    try {
      return JSON.parse(noTrailing);
    } catch(err2) {
      console.warn("Still failing to parse JSON. Attempting loose evaluation.");
      // Last resort fallback for completely malformed JSON from TVBox sources
      return new Function('return ' + noTrailing)();
    }
  }
};

const buildApiUrl = (api: string, params: Record<string, string>) => {
  // Wrapped proxy APIs ("/proxy?url=<target>"): params belong to the inner target URL
  const m = /^([^?]*\?url=)(.*)$/.exec(api);
  if (m) {
    try {
      const inner = new URL(decodeURIComponent(m[2]));
      Object.entries(params).forEach(([k, v]) => inner.searchParams.set(k, v));
      return new URL(m[1] + encodeURIComponent(inner.toString()), window.location.origin).toString();
    } catch { /* fall through to plain handling */ }
  }
  const url = new URL(api, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
};

// Same-origin requests (e.g. bundled config / /proxy based sites) need no CORS proxy
const isSameOrigin = (url: string) => {
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch { return false; }
};

// Poster with skeleton placeholder + multi-hop retry chain (direct -> CF proxy A -> CF
// proxy B) + periodic background refresh: failed posters retry the whole chain after a
// delay (up to 3 rounds), so they pop in automatically once the network recovers.
const PosterImg: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [cycle, setCycle] = useState(0); // retry round
  const [idx, setIdx] = useState(0);     // hop within the chain
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<number | null>(null);

  const chain = useMemo(() => src ? [
    src,
    '/proxy?url=' + encodeURIComponent(src),
    '/api/proxy?url=' + encodeURIComponent(src)
  ] : [], [src]);

  useEffect(() => {
    setCycle(0);
    setIdx(0);
    setLoaded(false);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [src]);

  const exhausted = chain.length === 0 || cycle >= 3;
  const currentSrc = exhausted ? '' : chain[idx];

  const handleError = () => {
    if (idx + 1 < chain.length) {
      setIdx(idx + 1);
    } else if (cycle < 2) {
      // Whole chain failed: back off, then retry from the top (network may recover)
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setCycle(c => c + 1);
        setIdx(0);
      }, 6000 + cycle * 6000);
    }
    // Final failure: keep showing the skeleton (never a broken image)
  };

  const skeleton = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(148,163,184,0.18), rgba(148,163,184,0.05))', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.3, padding: '8px', textAlign: 'center' }}>
      <Film size={20} />
      <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-all' }}>{alt}</span>
    </div>
  );

  if (!src) return skeleton;

  return (
    <>
      {!loaded && skeleton}
      {currentSrc && (
        <img
          key={currentSrc}
          src={currentSrc}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', background: 'var(--glass-border)' }}
        />
      )}
    </>
  );
};

function App() {
  const [savedConfigs, setSavedConfigs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tvbox_configs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return ['./config.json'];
    } catch { return ['./config.json']; }
  });
  const [configUrl, setConfigUrl] = useState<string>(() => {
    return localStorage.getItem('tvbox_last_config') || savedConfigs[0] || '';
  });
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSite, setActiveSite] = useState<Site | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoDetail | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  // Watch history: one entry per series (multiple series never overwrite each other)
  const [histories, setHistories] = useState<WatchHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('tvbox_watch_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      // Migrate the legacy single-record format
      const legacy = localStorage.getItem('tvbox_history');
      if (legacy) {
        const h = JSON.parse(legacy);
        if (h && h.site) return [{ site: h.site, video: h.video, playUrl: h.playUrl, epLabel: '', time: h.time || 0, timestamp: h.timestamp || Date.now() }];
      }
      return [];
    } catch { return []; }
  });
  const [liveChannels, setLiveChannels] = useState<LiveChannel[]>([]);
  // Live playback candidates: (stream URL x proxy base) pairs, auto-failover in order
  const [liveCands, setLiveCands] = useState<{ url: string; proxy: string }[]>([]);
  const [liveIdx, setLiveIdx] = useState(0);
  const [liveFailMsg, setLiveFailMsg] = useState('');
  // Favorites (persisted per browser)
  const [favorites, setFavorites] = useState<FavItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('tvbox_favorites') || '[]'); } catch { return []; }
  });
  const [showFavorites, setShowFavorites] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // null = normal browse mode; array = global search mode (results aggregated from all sites)
  const [searchResults, setSearchResults] = useState<SearchItem[] | null>(null);
  const [searchProgress, setSearchProgress] = useState({ done: 0, total: 0 });
  // Auto-play next episode (binger mode), with a cancellable countdown
  const [autoNext, setAutoNext] = useState(() => localStorage.getItem('tvbox_auto_next') !== '0');
  const [nextCountdown, setNextCountdown] = useState<{ title: string; url: string; seconds: number } | null>(null);
  // External subtitle (VTT blob) and its display name
  const [subtitleBlob, setSubtitleBlob] = useState('');
  const [subtitleName, setSubtitleName] = useState('');
  // Version counter to re-render when remembered skip-intro values change
  const [skipTick, setSkipTick] = useState(0);

  // Which episode is currently playing: index/total inside its source group + the next episode
  const getEpisodeContext = (video: VideoDetail | null, url: string) => {
    if (!video || !url) return null;
    for (const g of (video.vod_play_url || '').split('$$$')) {
      const eps = g.split('#').filter(ep => ep.includes('$'));
      const idx = eps.findIndex(ep => ep.split('$')[1] === url);
      if (idx >= 0) {
        return {
          idx,
          total: eps.length,
          next: idx + 1 < eps.length ? eps[idx + 1].split('$') : null
        };
      }
    }
    return null;
  };
  const epCtx = getEpisodeContext(activeVideo, playingUrl);
  const nextEp = epCtx && epCtx.next ? { title: epCtx.next[0] || `第${epCtx.idx + 2}集`, url: epCtx.next[1] } : null;

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}分${sec}秒` : `${sec}秒`;
  };

  // Auto-advance into the next episode starts it fresh (resume suppressed once)
  const suppressResumeRef = useRef('');

  // Auto-next countdown tick; fires the switch at zero
  useEffect(() => {
    if (!nextCountdown) return;
    if (nextCountdown.seconds <= 0) {
      suppressResumeRef.current = nextCountdown.url;
      setPlayingUrl(nextCountdown.url);
      setNextCountdown(null);
      return;
    }
    const t = window.setTimeout(() => setNextCountdown(c => (c ? { ...c, seconds: c.seconds - 1 } : null)), 1000);
    return () => window.clearTimeout(t);
  }, [nextCountdown]);

  // Any source/episode change cancels a pending countdown
  useEffect(() => { setNextCountdown(null); }, [playingUrl]);

  const handleEnded = () => {
    if (!autoNext || !nextEp || activeSite?.live) return;
    setNextCountdown({ title: nextEp.title, url: nextEp.url, seconds: 5 });
  };

  // Resume position for the current playing URL (0 when auto-advancing into a fresh episode)
  const resumeTime = useMemo(() => {
    if (playingUrl && suppressResumeRef.current === playingUrl) return 0;
    if (!activeSite || !playingUrl) return 0;
    const h = histories.find(x => x.site.key === activeSite.key && x.playUrl === playingUrl);
    return h && h.time > 10 ? h.time : 0;
  }, [histories, activeSite, playingUrl]);

  const handleTimeUpdate = (time: number) => {
    if (!activeSite || !activeVideo || !playingUrl || activeSite.live) return;
    const key = activeSite.key + '|' + String(activeVideo.vod_id);
    const ctx = getEpisodeContext(activeVideo, playingUrl);
    const epLabel = ctx ? `${activeVideo.vod_name} 第${ctx.idx + 1}/${ctx.total}集` : activeVideo.vod_name;
    const item: WatchHistoryItem = { site: activeSite, video: activeVideo, playUrl: playingUrl, epLabel, time, timestamp: Date.now() };
    setHistories(prev => {
      const next = [item, ...prev.filter(h => h.site.key + '|' + String(h.video.vod_id) !== key)].slice(0, 30);
      localStorage.setItem('tvbox_watch_history', JSON.stringify(next));
      return next;
    });
  };

  const removeHistory = (h: WatchHistoryItem) => {
    setHistories(prev => {
      const next = prev.filter(x => x.site.key + '|' + String(x.video.vod_id) !== h.site.key + '|' + String(h.video.vod_id));
      localStorage.setItem('tvbox_watch_history', JSON.stringify(next));
      return next;
    });
  };

  const clearHistories = () => {
    setHistories([]);
    localStorage.removeItem('tvbox_watch_history');
  };

  const openHistoryItem = (h: WatchHistoryItem) => {
    setActiveSite(h.site);
    setActiveVideo(h.video);
    setPlayingUrl(h.playUrl);
  };

  // Remembered skip-intro seconds for the current series
  const readSkipIntros = () => {
    try { return JSON.parse(localStorage.getItem('tvbox_skip_intros') || '{}') as Record<string, number>; } catch { return {}; }
  };
  const skipKey = activeSite && activeVideo ? activeSite.key + '|' + activeVideo.vod_name : '';
  const rememberedSkip = useMemo(() => {
    void skipTick; // re-read when a new intro length is remembered
    return skipKey ? (readSkipIntros()[skipKey] || 0) : 0;
  }, [skipTick, skipKey, activeVideo]);
  const rememberSkipIntro = (sec: number) => {
    const m = readSkipIntros();
    m[skipKey] = sec;
    localStorage.setItem('tvbox_skip_intros', JSON.stringify(m));
    setSkipTick(x => x + 1);
  };

  // External subtitle: read SRT/VTT, convert SRT -> VTT, hand the blob to the player
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const handleSubtitleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    let text = await file.text();
    if (/\.srt$/i.test(file.name) || /\d{2}:\d{2}:\d{2},\d{3}/.test(text)) {
      text = 'WEBVTT\n\n' + text.replace(/\r/g, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    }
    if (subtitleBlob) URL.revokeObjectURL(subtitleBlob);
    const blob = new Blob([text], { type: 'text/vtt' });
    setSubtitleBlob(URL.createObjectURL(blob));
    setSubtitleName(file.name);
    e.target.value = '';
  };

  // Parse TVBox Config
  const loadConfig = async (urlToLoad: string = configUrl) => {
    if (!urlToLoad) return;
    setLoading(true);
    try {
      const data = await fetchWithProxy(urlToLoad);
      const type1Sites: Site[] = data.sites.filter((s: Site) => s.type === 0 || s.type === 1);
      // Convert TVBox lives config into pseudo live sites (m3u playlists)
      const liveSites: Site[] = (data.lives || [])
        .filter((l: any) => l && (l.url || (Array.isArray(l.groups) && l.groups.length)))
        .map((l: any, i: number) => ({
          key: 'live_' + i,
          name: '📺 ' + (l.name || '电视直播'),
          type: 99,
          api: l.url || '',
          live: true
        }));
      setSites([...type1Sites, ...liveSites]);
      
      // Save config to history if successful
      if (!savedConfigs.includes(urlToLoad)) {
        const newConfigs = [...savedConfigs, urlToLoad];
        setSavedConfigs(newConfigs);
        localStorage.setItem('tvbox_configs', JSON.stringify(newConfigs));
      }
      localStorage.setItem('tvbox_last_config', urlToLoad);
      setConfigUrl(urlToLoad);
    } catch (e: any) {
      const detail = e?.message || '';
      alert(
        '加载配置失败。\n\n' +
        (detail ? '已依次尝试 → ' + detail + '\n\n' : '') +
        '常见原因：\n' +
        '① 该线路屏蔽了海外 IP（云端代理部署在 CF 海外节点上）\n' +
        '② 本地代理未启动：双击桌面"启动TVBox播放器.command"后重试\n' +
        '③ 接口地址已失效，可更换其他线路（如：饭太硬/王二小）\n\n' +
        '也可以点击顶部"代理"按钮配置自定义代理地址。'
      );
    }
    setLoading(false);
  };

  // Auto load config on mount
  useEffect(() => {
    if (configUrl) {
      loadConfig(configUrl);
    }
  }, []);

  const deleteConfig = () => {
    const newConfigs = savedConfigs.filter(c => c !== configUrl);
    setSavedConfigs(newConfigs);
    localStorage.setItem('tvbox_configs', JSON.stringify(newConfigs));
    if (newConfigs.length > 0) {
      const nextUrl = newConfigs[0];
      setConfigUrl(nextUrl);
      loadConfig(nextUrl);
    } else {
      setConfigUrl('');
      setSites([]);
      localStorage.removeItem('tvbox_last_config');
    }
  };

  // Load Categories for Site
  const loadSite = async (site: Site) => {
    exitSearch();
    setShowFavorites(false);
    setShowHistory(false);
    setActiveSite(site);
    setActiveVideo(null);
    setVideos([]);
    setLiveChannels([]);
    setLoading(true);
    try {
      if (site.live) {
        // Live site: parse m3u playlist, merge same-name backup sources, group by category
        const text = await fetchWithProxy(site.api, true);
        const channels = mergeChannelSources(parseM3U(text));
        setLiveChannels(channels);
        const groups = [...new Set(channels.map(c => c.group))];
        setCategories(groups.map(g => ({ type_id: g, type_name: `${g} (${channels.filter(c => c.group === g).length})` })));
        const first = groups[0] || '';
        setActiveCategory(first);
        setVideos(channels
          .map((c, i) => ({ ...c, idx: i }))
          .filter(c => c.group === first)
          .map(c => ({ vod_id: String(c.idx), vod_name: c.name, vod_pic: c.logo, vod_remarks: c.group })));
      } else {
        const url = buildApiUrl(site.api, { ac: 'list' });
        const data = await fetchWithProxy(url);
        setCategories(data.class || []);
        setVideos(data.list || []);
        if (data.class && data.class.length > 0) {
          setActiveCategory(data.class[0].type_id);
        }
      }
    } catch (e) {
      console.error(e);
      alert('加载资源库失败');
    }
    setLoading(false);
  };

  // Load Videos for Category
  const loadCategory = async (type_id: string) => {
    if (!activeSite) return;
    exitSearch();
    setShowFavorites(false);
    setShowHistory(false);
    setActiveCategory(type_id);
    setSearchKeyword('');
    setLoading(true);
    try {
      if (activeSite.live) {
        setVideos(liveChannels
          .map((c, i) => ({ ...c, idx: i }))
          .filter(c => c.group === type_id)
          .map(c => ({ vod_id: String(c.idx), vod_name: c.name, vod_pic: c.logo, vod_remarks: c.group })));
      } else {
        const url = buildApiUrl(activeSite.api, { ac: 'detail', t: type_id, pg: '1' });
        const data = await fetchWithProxy(url);
        setVideos(data.list || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Global aggregated search across ALL VOD sites (parallel, progressive results).
  // Playability filter: macCMS ac=detail&wd= returns vod_play_url directly, so we can
  // drop results without a real m3u8/mp4 stream at zero extra cost.
  const isPlayableItem = (v: any) =>
    !!(v.vod_play_url && /\.(m3u8|mp4)/i.test(v.vod_play_url));

  const exitSearch = () => {
    setSearchResults(null);
    setSearchProgress({ done: 0, total: 0 });
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const kw = searchKeyword.trim();
    if (!kw) return;
    // Live site active: filter channels locally instead of global VOD search
    if (activeSite?.live) {
      const k = kw.toLowerCase();
      exitSearch();
      setShowFavorites(false);
      setShowHistory(false);
      setVideos(liveChannels
        .map((c, i) => ({ ...c, idx: i }))
        .filter(c => c.name.toLowerCase().includes(k))
        .map(c => ({ vod_id: String(c.idx), vod_name: c.name, vod_pic: c.logo, vod_remarks: c.group })));
      return;
    }
    const vodSites = sites.filter(s => !s.live);
    if (vodSites.length === 0) return;
    setActiveCategory('');
    setActiveVideo(null);
    setShowFavorites(false);
    setShowHistory(false);
    setSearchResults([]);
    setSearchProgress({ done: 0, total: vodSites.length });
    const seen = new Set<string>();
    vodSites.forEach(site => {
      (async () => {
        try {
          const url = buildApiUrl(site.api, { ac: 'detail', wd: kw });
          const data = await fetchWithProxy(url);
          const items: SearchItem[] = (data.list || [])
            .filter((v: any) => isPlayableItem(v))
            .filter((v: any) => {
              // Dedupe same-title results across sites (keep the fastest responding source)
              const name = String(v.vod_name || '').trim();
              if (!name || seen.has(name)) return false;
              seen.add(name);
              return true;
            })
            .map((v: any) => ({ ...v, site }));
          if (searchKeyword.trim() === kw) {
            setSearchResults(prev => [...(prev || []), ...items]);
          }
        } catch (err) {
          console.warn('线路搜索失败:', site.name, err);
        } finally {
          if (searchKeyword.trim() === kw) {
            setSearchProgress(p => ({ ...p, done: p.done + 1 }));
          }
        }
      })();
    });
  };

  // Load Video Detail (siteOverride: search results come from their own site)
  const loadVideoDetail = async (vod_id: string, siteOverride?: Site) => {
    const site = siteOverride || activeSite;
    if (!site) return;
    setActiveSite(site);
    setLoading(true);
    try {
      if (site.live) {
        // Live channel: build candidate chain (each backup URL x each proxy base),
        // hls.js will auto-failover through them on fatal errors
        const ch = liveChannels[Number(vod_id)];
        if (ch) {
          const urls = ch.urls && ch.urls.length ? ch.urls : [ch.url];
          const proxies = [getPreferredProxy(), PROXY_URL, LOCAL_PROXY]
            .filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i);
          const cands: { url: string; proxy: string }[] = [];
          for (const u of urls) {
            for (const p of proxies) cands.push({ url: u, proxy: p });
          }
          setLiveCands(cands);
          liveIdxRef.current = 0;
          setLiveIdx(0);
          setLiveFailMsg('');
          setActiveVideo({
            vod_id,
            vod_name: ch.name,
            vod_pic: ch.logo,
            vod_remarks: ch.group,
            vod_play_from: '直播流',
            vod_play_url: `直播$${ch.url}`
          });
          setPlayingUrl(ch.url);
        } else {
          alert('频道不存在，请刷新直播列表。');
        }
        setLoading(false);
        return;
      }
      const url = buildApiUrl(site.api, { ac: 'detail', ids: vod_id });
      const data = await fetchWithProxy(url);
      if (data.list && data.list.length > 0) {
        const detail: VideoDetail = data.list[0];
        if (!isPlayableItem(detail)) {
          alert('该影片在此线路没有可直接播放的视频流，试试搜索结果里的其他来源。');
          setLoading(false);
          return;
        }
        setActiveVideo(detail);
        const urls = detail.vod_play_url;
        if (urls) {
          // Prefer a directly playable stream (m3u8/mp4); share-page URLs cannot play in browser
          let fallback = '';
          let playable = '';
          for (const group of urls.split('$$$')) {
            const firstEpUrl = group.split('#')[0].split('$')[1] || '';
            if (firstEpUrl && !fallback) fallback = firstEpUrl;
            if (/\.(m3u8|mp4)/i.test(firstEpUrl)) { playable = firstEpUrl; break; }
          }
          const pick = playable || fallback;
          if (pick) setPlayingUrl(pick);
        }
      } else {
        alert('该视频没有可用的播放数据，可能是线路格式(XML)不兼容。');
      }
    } catch (e) {
      console.error(e);
      alert('获取视频详情失败，此线路可能不兼容网页版(如 XML 格式)。');
    }
    setLoading(false);
  };

  // Live failover: advance to the next (URL x proxy) candidate on fatal stream error
  const liveCandsRef = useRef(liveCands);
  liveCandsRef.current = liveCands;
  const liveIdxRef = useRef(0);
  const tryNextLiveCandidate = () => {
    const next = liveIdxRef.current + 1;
    if (next < liveCandsRef.current.length) {
      liveIdxRef.current = next;
      setLiveIdx(next);
    } else {
      setLiveFailMsg('该频道的所有备源与代理组合均无法播放，请尝试其他频道。');
    }
  };

  // Favorites helpers
  const favKey = (siteKey: string, vodId: string) => siteKey + '|' + vodId;
  const isFavorited = !!(activeSite && activeVideo &&
    favorites.some(f => favKey(f.site.key, String(f.vod_id)) === favKey(activeSite.key, String(activeVideo.vod_id))));

  const toggleFavorite = () => {
    if (!activeSite || !activeVideo) return;
    const key = favKey(activeSite.key, String(activeVideo.vod_id));
    const next = favorites.filter(f => favKey(f.site.key, String(f.vod_id)) !== key);
    if (next.length === favorites.length) {
      next.unshift({
        site: activeSite,
        vod_id: activeVideo.vod_id,
        vod_name: activeVideo.vod_name,
        vod_pic: activeVideo.vod_pic,
        vod_remarks: activeVideo.vod_remarks || '',
        ts: Date.now(),
        epCount: epCtx?.total || 0,
        epDelta: 0
      });
    }
    setFavorites(next);
    localStorage.setItem('tvbox_favorites', JSON.stringify(next));
  };

  const removeFavorite = (f: FavItem) => {
    const next = favorites.filter(x => favKey(x.site.key, String(x.vod_id)) !== favKey(f.site.key, String(f.vod_id)));
    setFavorites(next);
    localStorage.setItem('tvbox_favorites', JSON.stringify(next));
  };

  // 追更检查：打开收藏页时并行刷新每部收藏的集数，发现新增集数就打上徽标
  const refreshFavoriteEpCounts = async () => {
    const targets = favorites.filter(f => !f.site.live).slice(0, 15);
    if (targets.length === 0) return;
    const counts = new Map<string, number>();
    await Promise.allSettled(targets.map(async f => {
      try {
        const url = buildApiUrl(f.site.api, { ac: 'detail', ids: String(f.vod_id) });
        const data = await fetchWithProxy(url);
        const d = data.list && data.list[0];
        if (!d) return;
        let count = 0;
        for (const g of (d.vod_play_url || '').split('$$$')) {
          const eps = g.split('#').filter((ep: string) => ep.includes('$'));
          if (eps.length) {
            count = eps.length;
            break;
          }
        }
        if (count) counts.set(favKey(f.site.key, String(f.vod_id)), count);
      } catch { /* 单线失败不影响其他 */ }
    }));
    if (counts.size === 0) return;
    const next = favorites.map(f => {
      const c = counts.get(favKey(f.site.key, String(f.vod_id)));
      if (!c) return f;
      const delta = f.epCount ? Math.max(0, c - f.epCount) : 0;
      return { ...f, epCount: c, epDelta: delta };
    });
    setFavorites(next);
    localStorage.setItem('tvbox_favorites', JSON.stringify(next));
  };

  const openFavorites = () => {
    exitSearch();
    setActiveVideo(null);
    setShowFavorites(true);
    setShowHistory(false);
    refreshFavoriteEpCounts();
  };

  const openHistories = () => {
    exitSearch();
    setActiveVideo(null);
    setShowFavorites(false);
    setShowHistory(true);
  };

  // 一键换源：并行搜其他线路的同名资源，选一条后自动对齐到当前集数
  const switchSource = async () => {
    if (!activeVideo || activeSite?.live) return;
    const title = activeVideo.vod_name.trim();
    const epIdx = epCtx?.idx ?? 0;
    setLoading(true);
    const found: SearchItem[] = [];
    const seenSites = new Set<string>();
    await Promise.allSettled(sites.filter(s => !s.live && s.key !== activeSite?.key).map(async site => {
      try {
        const url = buildApiUrl(site.api, { ac: 'detail', wd: title });
        const data = await fetchWithProxy(url);
        for (const v of (data.list || [])) {
          if (String(v.vod_name).trim() === title && isPlayableItem(v) && !seenSites.has(site.key)) {
            seenSites.add(site.key);
            found.push({ ...v, site });
            break;
          }
        }
      } catch { /* skip */ }
    }));
    setLoading(false);
    if (found.length === 0) {
      alert('其他线路没有找到同名可播放资源。');
      return;
    }
    const listing = found.map((f, i) => {
      const firstGroup = (f.vod_play_url || '').split('$$$')[0] || '';
      const eps = firstGroup.split('#').filter((ep: string) => ep.includes('$'));
      return `${i + 1}. ${f.site.name}（${eps.length}集）`;
    }).join('\n');
    const pick = prompt(`以下线路有「${title}」，输入编号换源（当前第 ${epIdx + 1} 集会自动对齐）：\n${listing}`);
    if (!pick) return;
    const target = found[Number(pick) - 1];
    if (!target) { alert('编号无效'); return; }
    let pickUrl = '';
    for (const g of (target.vod_play_url || '').split('$$$')) {
      const eps = g.split('#').filter((ep: string) => ep.includes('$'));
      if (eps.length && /\.(m3u8|mp4)/i.test(eps[0].split('$')[1] || '')) {
        const ep = eps[Math.min(epIdx, eps.length - 1)];
        pickUrl = ep.split('$')[1] || '';
        break;
      }
    }
    if (!pickUrl) { alert('该线路解析播放地址失败，试试换一条。'); return; }
    suppressResumeRef.current = '';
    setActiveSite(target.site);
    setActiveVideo(target);
    setPlayingUrl(pickUrl);
  };

  // 数据导出/导入（收藏 + 观看历史 + 片头记忆），用于跨浏览器/设备手动迁移
  const exportData = () => {
    const payload = { version: 1, exportedAt: Date.now(), favorites, histories, skipIntros: readSkipIntros() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tvbox-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importDataFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      let favCount = 0, histCount = 0;
      if (Array.isArray(data.favorites)) {
        const merged = new Map<string, FavItem>();
        [...favorites, ...data.favorites].forEach((f: FavItem) => {
          const k = favKey(f.site.key, String(f.vod_id));
          const ex = merged.get(k);
          if (!ex || (f.ts || 0) >= (ex.ts || 0)) merged.set(k, f);
        });
        const next = [...merged.values()];
        setFavorites(next);
        localStorage.setItem('tvbox_favorites', JSON.stringify(next));
        favCount = next.length;
      }
      if (Array.isArray(data.histories)) {
        const merged = new Map<string, WatchHistoryItem>();
        [...histories, ...data.histories].forEach((h: WatchHistoryItem) => {
          const k = h.site.key + '|' + String(h.video.vod_id);
          const ex = merged.get(k);
          if (!ex || (h.timestamp || 0) >= (ex.timestamp || 0)) merged.set(k, h);
        });
        const next = [...merged.values()]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 30);
        setHistories(next);
        localStorage.setItem('tvbox_watch_history', JSON.stringify(next));
        histCount = next.length;
      }
      if (data.skipIntros && typeof data.skipIntros === 'object') {
        const merged = { ...readSkipIntros(), ...data.skipIntros };
        localStorage.setItem('tvbox_skip_intros', JSON.stringify(merged));
      }
      alert(`导入完成：收藏 ${favCount} 条，观看历史 ${histCount} 条。`);
    } catch {
      alert('导入失败：文件不是有效的备份 JSON。');
    }
    e.target.value = '';
  };

  // Cast current video to a DLNA renderer (e.g. Xiaomi TV) via the local helper server.
  // Browsers cannot do SSDP/UPnP themselves; localhost:8080 does discovery + push.
  const fetchWithTimeout = async (url: string, opts: RequestInit = {}, ms = 6000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...opts, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  };

  const castToDevice = async () => {
    if (!playingUrl || !activeVideo) { alert('当前没有正在播放的视频。'); return; }
    const base = 'http://localhost:8080';
    try {
      const res = await fetchWithTimeout(base + '/api/dlna/devices', {}, 8000);
      const devices = await res.json();
      if (!Array.isArray(devices) || devices.length === 0) {
        alert('未发现局域网内的投屏设备。请检查：\n① 电视与电脑连接同一个路由器网络\n② 电视已开机，且"投屏/DLNA/多屏互动"功能可用\n③ 本地服务已启动并保持运行');
        return;
      }
      let device = devices[0];
      if (devices.length > 1) {
        const pick = prompt('发现以下投屏设备，请输入编号：\n' + devices.map((d: any, i: number) => `${i + 1}. ${d.name}`).join('\n'), '1');
        if (!pick) return;
        device = devices[Number(pick) - 1];
        if (!device) { alert('编号无效'); return; }
      }
      await fetchWithTimeout(base + '/api/dlna/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controlURL: device.controlURL, url: playingUrl, title: activeVideo.vod_name })
      }, 10000);
      alert(`已推送「${activeVideo.vod_name}」到「${device.name}」，请在电视上确认播放。`);
    } catch {
      alert('投屏功能需要本地服务支持：\n请先双击桌面「启动TVBox播放器.command」启动本地服务（保持运行），再点投屏。');
    }
  };

  // Copy helper with fallback (clipboard API needs secure context / permission)
  const copyText = (text: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => alert('已复制到剪贴板'),
        () => { prompt('请手动复制：', text); }
      );
    } else {
      prompt('请手动复制：', text);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Header */}
      <header className="glass-panel layout-header" style={{ margin: '16px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div className="header-top" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Film size={24} color="var(--accent)" />
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>TVBox Web Player</h1>
        </div>
        
        <div style={{ flex: 1 }} className="spacer" />
        
        <div className="header-controls">
        {histories.length > 0 && (
          <button
            className="btn"
            style={{ marginRight: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
            onClick={() => openHistoryItem(histories[0])}
            title="继续上次播放（含集数和进度）"
          >
            <Play size={16} /> 继续：{histories[0].epLabel || histories[0].video.vod_name}
          </button>
        )}
        
        <select 
          className="input" 
          style={{ maxWidth: '400px', flex: 1 }}
          value={configUrl}
          onChange={(e) => {
            if (e.target.value === 'ADD_NEW') {
              const newUrl = prompt('请输入新的 TVBox 接口地址:');
              if (newUrl) {
                setConfigUrl(newUrl);
                loadConfig(newUrl);
              }
            } else {
              setConfigUrl(e.target.value);
              loadConfig(e.target.value);
            }
          }}
        >
          {savedConfigs.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="ADD_NEW">+ 添加新配置...</option>
        </select>
        
        <div className="header-buttons">
          <button className="btn primary" onClick={() => loadConfig(configUrl)} disabled={loading}>
            <Settings2 size={16} /> 刷新
          </button>
          <button
            className="btn"
            title="配置自定义代理（留空恢复自动）"
            onClick={() => {
              const cur = localStorage.getItem('tvbox_custom_proxy') || '';
              const input = prompt(
                '自定义代理地址（留空恢复默认自动）：\n例如：http://localhost:8080/api/proxy?url=\n\n说明：本地代理走家庭宽带国内 IP，不会被线路屏蔽，最稳定；云端代理在 CF 海外节点，部分线路会拒绝。',
                cur
              );
              if (input !== null) {
                if (input.trim()) {
                  localStorage.setItem('tvbox_custom_proxy', input.trim());
                } else {
                  localStorage.removeItem('tvbox_custom_proxy');
                }
                localStorage.removeItem('tvbox_working_proxy');
                workingProxy = '';
                loadConfig(configUrl);
              }
            }}
          >
            <Network size={16} /> 代理
          </button>
          <button className="btn" onClick={deleteConfig} disabled={!configUrl || savedConfigs.length === 0}>
            删除
          </button>
        </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="layout-main" style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '0 16px 16px 16px', gap: '16px' }}>
        
        {/* Sidebar - Sites */}
        <div className="glass-panel sidebar-sites" style={{ width: '250px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', fontWeight: 600 }}>
            可用线路 (Type 1)
          </div>
          <div style={{ padding: '8px 8px 0 8px', borderBottom: '1px solid var(--glass-border)' }}>
            <div
              onClick={openFavorites}
              style={{
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '4px',
                background: showFavorites ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: showFavorites ? 'var(--accent)' : 'inherit',
                transition: 'all 0.2s'
              }}
            >
              ⭐ 我的收藏{favorites.length > 0 ? ` (${favorites.length})` : ''}
            </div>
            <div
              onClick={openHistories}
              style={{
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '8px',
                background: showHistory ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: showHistory ? 'var(--accent)' : 'inherit',
                transition: 'all 0.2s'
              }}
            >
              🕘 继续观看{histories.length > 0 ? ` (${histories.length})` : ''}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {sites.map(site => (
              <div 
                key={site.key}
                onClick={() => loadSite(site)}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  background: activeSite?.key === site.key ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: activeSite?.key === site.key ? 'var(--accent)' : 'inherit',
                  transition: 'all 0.2s'
                }}
              >
                {site.name}
              </div>
            ))}
            {sites.length === 0 && !loading && (
              <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                请先载入配置
              </div>
            )}
          </div>
          <div style={{ padding: '8px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '6px' }}>
            <button className="btn" style={{ flex: 1, fontSize: '12px' }} onClick={exportData} title="导出收藏、观看历史、片头记忆为 JSON 文件">
              ⬇ 导出
            </button>
            <button className="btn" style={{ flex: 1, fontSize: '12px' }} onClick={() => document.getElementById('tvbox-import-input')?.click()} title="从备份 JSON 导入（合并到现有数据）">
              ⬆ 导入
            </button>
            <input id="tvbox-import-input" type="file" accept=".json" style={{ display: 'none' }} onChange={importDataFile} />
          </div>
        </div>

        {/* Content Area */}
        <div className="glass-panel content-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {activeVideo ? (
            // Video Player View
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => setActiveVideo(null)}>
                  <ChevronLeft size={16} /> 返回列表
                </button>
                <button className="btn" onClick={castToDevice} title="通过本地服务投屏到局域网 DLNA 电视（小米等）">
                  📺 投屏到电视
                </button>
                <button className="btn" onClick={toggleFavorite} title="收藏后可在左侧「我的收藏」快速找到">
                  {isFavorited ? '★ 已收藏' : '☆ 收藏'}
                </button>
                {!activeSite?.live && (
                  <button className="btn" onClick={switchSource} title="并行搜索其他线路的同名资源，自动对齐当前集数">
                    🔄 换源
                  </button>
                )}
                {!activeSite?.live && nextEp && (
                  <button className="btn primary" onClick={() => { suppressResumeRef.current = ''; setPlayingUrl(nextEp.url); }} title="直接播放下一集">
                    ▶ 下一集：{nextEp.title}
                  </button>
                )}
                {!activeSite?.live && (
                  <button
                    className="btn"
                    onClick={() => { const v = !autoNext; setAutoNext(v); localStorage.setItem('tvbox_auto_next', v ? '1' : '0'); }}
                    title="播放结束后自动连播下一集（5 秒倒计时，可取消）"
                  >
                    连播：{autoNext ? '开' : '关'}
                  </button>
                )}
                {!activeSite?.live && (
                  <>
                    <button className="btn" onClick={() => subtitleInputRef.current?.click()} title="加载本地 SRT/VTT 字幕文件">
                      🔤 字幕{subtitleName ? ' ✓' : ''}
                    </button>
                    {subtitleName && (
                      <button className="btn" onClick={() => { setSubtitleBlob(''); setSubtitleName(''); }} title="移除已加载的字幕">
                        ✕字幕
                      </button>
                    )}
                    <input ref={subtitleInputRef} type="file" accept=".srt,.vtt" style={{ display: 'none' }} onChange={handleSubtitleFile} />
                  </>
                )}
              </div>

              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
                {playingUrl ? (
                  <HlsPlayer
                    src={activeSite?.live ? (liveCands[liveIdx]?.url || '') : playingUrl}
                    proxyAll={!!activeSite?.live}
                    proxyUrl={activeSite?.live ? (liveCands[liveIdx]?.proxy || PROXY_URL) : getPreferredProxy()}
                    onFatal={activeSite?.live ? tryNextLiveCandidate : undefined}
                    initialTime={resumeTime}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    subtitleBlob={activeSite?.live ? '' : subtitleBlob}
                    skipIntro={activeSite?.live ? undefined : rememberedSkip}
                    onRememberSkip={rememberSkipIntro}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    {loading ? '解析视频流中...' : '无可用播放地址'}
                  </div>
                )}
                {nextCountdown && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 6, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#fff' }}>
                    <div style={{ fontSize: '22px', fontWeight: 600 }}>{nextCountdown.seconds} 秒后自动连播</div>
                    <div style={{ fontSize: '14px', opacity: 0.85 }}>下一集：{nextCountdown.title}</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn primary" onClick={() => { suppressResumeRef.current = nextCountdown.url; setPlayingUrl(nextCountdown.url); setNextCountdown(null); }}>立即播放</button>
                      <button className="btn" onClick={() => setNextCountdown(null)}>取消连播</button>
                    </div>
                  </div>
                )}
              </div>

              {activeSite?.live && liveCands.length > 0 && (
                <div style={{ color: liveFailMsg ? '#fca5a5' : 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
                  {liveFailMsg || `正在通过备源 ${liveIdx + 1}/${liveCands.length} 播放（失败自动切换）`}
                </div>
              )}

              {playingUrl && (() => {
                const debugUrl = activeSite?.live ? (liveCands[liveIdx]?.url || playingUrl) : playingUrl;
                const cloudUrl = window.location.origin + '/proxy?url=' + encodeURIComponent(debugUrl);
                return (
                  <details style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <summary style={{ cursor: 'pointer', userSelect: 'none' }}>🔧 调试信息（流地址 / 播放方式）</summary>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: 1.5 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'inherit' }}>视频流原始地址{activeSite?.live ? '（当前备源）' : ''}：</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <code style={{ wordBreak: 'break-all', flex: 1, minWidth: '200px' }}>{debugUrl}</code>
                          <a className="btn" href={debugUrl} target="_blank" rel="noreferrer">新标签打开</a>
                          <button className="btn" onClick={() => copyText(debugUrl)}>复制</button>
                        </div>
                        <div style={{ marginTop: '4px', opacity: 0.8 }}>↑ 新标签能看到 m3u8 文本 = 资源正常、问题在播放器；403/超时 = 资源或网络问题</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'inherit' }}>实际播放方式：</div>
                        <div>{activeSite?.live
                          ? `经代理转发：${liveCands[liveIdx]?.proxy || ''}（备源 ${liveIdx + 1}/${liveCands.length}，清单和分段都走此代理）`
                          : '浏览器直连播放（未经代理，需资源允许跨域）'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'inherit' }}>经云端代理的地址（对比测试）：</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <code style={{ wordBreak: 'break-all', flex: 1, minWidth: '200px' }}>{cloudUrl}</code>
                          <a className="btn" href={cloudUrl} target="_blank" rel="noreferrer">新标签打开</a>
                          <button className="btn" onClick={() => copyText(cloudUrl)}>复制</button>
                        </div>
                        <div style={{ marginTop: '4px', opacity: 0.8 }}>↑ 走 CF 海外节点转发；直连失败但它能打开 = 源屏蔽了当前网络</div>
                      </div>
                    </div>
                  </details>
                );
              })()}

              <h2>{activeVideo.vod_name}</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }} dangerouslySetInnerHTML={{ __html: activeVideo.vod_remarks || '暂无简介' }} />
              
              {!activeSite?.live && (
              <div style={{ marginTop: '24px' }}>
                <h3>选集</h3>
                {(activeVideo.vod_play_url || '').split('$$$').map((source, sIdx) => {
                  const eps = source.split('#').filter(ep => ep.includes('$'));
                  if (eps.length === 0) return null;
                  const fromNames = (activeVideo.vod_play_from || '').split('$$$');
                  const srcName = fromNames[sIdx]?.trim() || `线路${sIdx + 1}`;
                  return (
                    <div key={sIdx} style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        播放源 {sIdx + 1}：{srcName}（{eps.length}集）
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {eps.map((ep, eIdx) => {
                          const [title, url] = ep.split('$');
                          if (!url) return null;
                          return (
                            <button
                              key={`${sIdx}-${eIdx}`}
                              className={`btn ${playingUrl === url ? 'primary' : ''}`}
                              onClick={() => setPlayingUrl(url)}
                            >
                              {title || `第${eIdx+1}集`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          ) : (
            // Video List View
            <>
              {/* Search Bar */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="input"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="搜索全部线路（输入关键词，聚合所有资源）..."
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn primary" disabled={loading || !searchKeyword.trim()}>
                    <Search size={16} /> 全局搜索
                  </button>
                </form>
              </div>

              {/* Categories (hidden during global search) */}
              {categories.length > 0 && searchResults === null && (
                <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  {categories.map(cat => (
                    <button 
                      key={cat.type_id}
                      className={`btn ${activeCategory === cat.type_id ? 'primary' : ''}`}
                      onClick={() => loadCategory(cat.type_id)}
                      style={{ borderRadius: '20px' }}
                    >
                      {cat.type_name}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Grid */}
              <div className="video-grid" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', alignContent: 'start' }}>
                {(() => {
                  const isSearch = searchResults !== null;
                  const isFav = showFavorites && !isSearch;
                  const isHist = showHistory && !isSearch && !isFav;
                  const items: (Video & { site?: Site })[] = isSearch
                    ? searchResults!
                    : isFav
                      ? favorites
                      : isHist
                        ? histories.map((h, i) => ({
                            ...h.video,
                            site: h.site,
                            vod_remarks: `${h.epLabel || h.video.vod_name} · 已看 ${fmtTime(h.time)}`,
                            _hi: i
                          }))
                        : videos;
                  const showLoading = loading && !isSearch && !isFav && !isHist;
                  const showEmpty = !loading && items.length === 0 && (isSearch || isFav || isHist || !!activeSite);
                  return (
                    <>
                      {isSearch && (
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            🔍 全局搜索「{searchKeyword.trim()}」：{items.length} 个可播放结果
                            {searchProgress.done < searchProgress.total && `（已搜索 ${searchProgress.done}/${searchProgress.total} 条线路...）`}
                          </span>
                          <button className="btn" onClick={exitSearch}>退出搜索</button>
                        </div>
                      )}
                      {isFav && (
                        <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '14px' }}>
                          ⭐ 我的收藏：{items.length} 部（收藏记录保存在本浏览器；点击卡片回放；打开本页时自动检查各线路集数更新）
                        </div>
                      )}
                      {isHist && (
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                          <span>🕘 继续观看：{items.length} 部（点击卡片从上次进度继续）</span>
                          <button className="btn" onClick={clearHistories}>清空历史</button>
                        </div>
                      )}
                      {items.map(video => (
                        <div
                          key={(video.site?.key || '') + video.vod_id}
                          className="animate-fade-in"
                          onClick={() => {
                            if (isHist) {
                              const h = histories[(video as any)._hi];
                              if (h) openHistoryItem(h);
                            } else {
                              video.site ? loadVideoDetail(video.vod_id, video.site) : loadVideoDetail(video.vod_id);
                            }
                          }}
                          style={{ cursor: 'pointer', position: 'relative' }}
                        >
                          <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                            <PosterImg src={video.vod_pic} alt={video.vod_name} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', fontSize: '12px', color: '#fff' }}>
                              {video.vod_remarks}
                            </div>
                            {video.site && (
                              <div style={{ position: 'absolute', top: 0, right: 0, padding: '3px 8px', background: 'rgba(59,130,246,0.9)', fontSize: '11px', color: '#fff', borderBottomLeftRadius: '8px' }}>
                                {video.site.name}
                              </div>
                            )}
                            {isFav && !!(video as FavItem).epDelta && (
                              <div style={{ position: 'absolute', top: 0, left: 0, padding: '3px 8px', background: 'rgba(34,197,94,0.92)', fontSize: '11px', color: '#fff', borderBottomRightRadius: '8px' }}>
                                更新 {(video as FavItem).epDelta} 集
                              </div>
                            )}
                            {(isFav || isHist) && (
                              <button
                                title={isFav ? '取消收藏' : '删除这条历史'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isFav) removeFavorite(video as FavItem);
                                  else {
                                    const h = histories[(video as any)._hi];
                                    if (h) removeHistory(h);
                                  }
                                }}
                                style={{ position: 'absolute', top: 0, left: 0, width: '26px', height: '26px', border: 'none', borderRadius: '0 0 8px 0', background: 'rgba(0,0,0,0.55)', color: '#fca5a5', fontSize: '14px', cursor: 'pointer', lineHeight: 1 }}
                              >✕</button>
                            )}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {video.vod_name}
                          </div>
                        </div>
                      ))}
                      {showLoading && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          加载中...
                        </div>
                      )}
                      {showEmpty && (isSearch ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          {searchProgress.done < searchProgress.total
                            ? `正在搜索 ${searchProgress.done}/${searchProgress.total} 条线路...`
                            : '没有找到可播放的结果（无播放流的来源已自动过滤）'}
                        </div>
                      ) : isFav ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          还没有收藏。打开任意影片，点「☆ 收藏」即可保存到这里。
                        </div>
                      ) : isHist ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          还没有观看记录。看过的剧会自动出现在这里，带集数和进度。
                        </div>
                      ) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          暂无数据
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
