import { useState, useEffect } from 'react';
import { Settings2, Film, ChevronLeft, Play, Search, Network } from 'lucide-react';
import { HlsPlayer } from './HlsPlayer';

interface Site {
  key: string;
  name: string;
  type: number;
  api: string;
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
  vod_play_url: string;
}

interface PlaybackHistory {
  site: Site;
  video: VideoDetail;
  playUrl: string;
  time: number;
  timestamp: number;
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

const fetchViaProxy = async (base: string, url: string) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(base + encodeURIComponent(url), { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    return parseRelaxedJSON(text);
  } finally {
    clearTimeout(timer);
  }
};

// Helper to fetch with multi-level proxy chain:
// custom proxy -> last working proxy -> CF cloud proxy -> local proxy -> public fallbacks
const fetchWithProxy = async (url: string) => {
  const custom = localStorage.getItem('tvbox_custom_proxy') || '';
  const bases: string[] = [];
  [custom, workingProxy, PROXY_URL, LOCAL_PROXY, ...FALLBACK_PROXIES].forEach(b => {
    if (b && !bases.includes(b)) bases.push(b);
  });
  const errors: string[] = [];
  for (const base of bases) {
    try {
      const data = await fetchViaProxy(base, url);
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
  try {
    const url = new URL(api);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  } catch {
    const base = api.split('?')[0];
    const query = new URLSearchParams(params).toString();
    return `${base}?${query}`;
  }
};

function App() {
  const [savedConfigs, setSavedConfigs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tvbox_configs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return ['http://tv.nxog.top'];
    } catch { return ['http://tv.nxog.top']; }
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
  const [history, setHistory] = useState<PlaybackHistory | null>(() => {
    try {
      const saved = localStorage.getItem('tvbox_history');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const handleTimeUpdate = (time: number) => {
    if (activeSite && activeVideo && playingUrl) {
      const newHistory: PlaybackHistory = {
        site: activeSite,
        video: activeVideo,
        playUrl: playingUrl,
        time,
        timestamp: Date.now()
      };
      setHistory(newHistory);
      localStorage.setItem('tvbox_history', JSON.stringify(newHistory));
    }
  };

  const resumeHistory = () => {
    if (history) {
      setActiveSite(history.site);
      setActiveVideo(history.video);
      setPlayingUrl(history.playUrl);
    }
  };

  // Parse TVBox Config
  const loadConfig = async (urlToLoad: string = configUrl) => {
    if (!urlToLoad) return;
    setLoading(true);
    try {
      const data = await fetchWithProxy(urlToLoad);
      const type1Sites = data.sites.filter((s: Site) => s.type === 0 || s.type === 1);
      setSites(type1Sites);
      
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
    setActiveSite(site);
    setActiveVideo(null);
    setVideos([]);
    setLoading(true);
    try {
      const url = buildApiUrl(site.api, { ac: 'list' });
      const data = await fetchWithProxy(url);
      setCategories(data.class || []);
      setVideos(data.list || []);
      if (data.class && data.class.length > 0) {
        setActiveCategory(data.class[0].type_id);
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
    setActiveCategory(type_id);
    setSearchKeyword('');
    setLoading(true);
    try {
      const url = buildApiUrl(activeSite.api, { ac: 'detail', t: type_id, pg: '1' });
      const data = await fetchWithProxy(url);
      setVideos(data.list || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Search Video
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeSite || !searchKeyword.trim()) return;
    setActiveCategory('');
    setLoading(true);
    try {
      const url = buildApiUrl(activeSite.api, { ac: 'detail', wd: searchKeyword.trim() });
      const data = await fetchWithProxy(url);
      setVideos(data.list || []);
    } catch (err) {
      console.error(err);
      alert('搜索失败，可能是该线路不支持搜索或格式不兼容。');
    }
    setLoading(false);
  };

  // Load Video Detail
  const loadVideoDetail = async (vod_id: string) => {
    if (!activeSite) return;
    setLoading(true);
    try {
      const url = buildApiUrl(activeSite.api, { ac: 'detail', ids: vod_id });
      const data = await fetchWithProxy(url);
      if (data.list && data.list.length > 0) {
        setActiveVideo(data.list[0]);
        const urls = data.list[0].vod_play_url;
        if (urls) {
          const firstUrl = urls.split('#')[0].split('$')[1];
          if (firstUrl) setPlayingUrl(firstUrl);
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
        {history && (
          <button 
            className="btn" 
            style={{ marginRight: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
            onClick={resumeHistory}
            title="上次播放记录"
          >
            <Play size={16} /> 继续播放: {history.video.vod_name}
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
        </div>

        {/* Content Area */}
        <div className="glass-panel content-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {activeVideo ? (
            // Video Player View
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto' }}>
              <button className="btn" onClick={() => setActiveVideo(null)} style={{ alignSelf: 'flex-start', marginBottom: '16px' }}>
                <ChevronLeft size={16} /> 返回列表
              </button>
              
              <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
                {playingUrl ? (
                  <HlsPlayer 
                    src={playingUrl} 
                    initialTime={history?.playUrl === playingUrl ? history.time : 0}
                    onTimeUpdate={handleTimeUpdate}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    {loading ? '解析视频流中...' : '无可用播放地址'}
                  </div>
                )}
              </div>
              
              <h2>{activeVideo.vod_name}</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }} dangerouslySetInnerHTML={{ __html: activeVideo.vod_remarks || '暂无简介' }} />
              
              <div style={{ marginTop: '24px' }}>
                <h3>选集</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {(activeVideo.vod_play_url || '').split('$$$').map((source, sIdx) => {
                    const eps = source.split('#');
                    return eps.map((ep, eIdx) => {
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
                    });
                  })}
                </div>
              </div>
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
                    placeholder="在此线路中搜索视频..."
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn primary" disabled={loading || !searchKeyword.trim()}>
                    <Search size={16} /> 搜索
                  </button>
                </form>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
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
                {videos.map(video => (
                  <div 
                    key={video.vod_id} 
                    className="animate-fade-in"
                    onClick={() => loadVideoDetail(video.vod_id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                      <img 
                        src={video.vod_pic} 
                        alt={video.vod_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400?text=No+Image'; }}
                      />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', fontSize: '12px', color: '#fff' }}>
                        {video.vod_remarks}
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {video.vod_name}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    加载中...
                  </div>
                )}
                {!loading && videos.length === 0 && activeSite && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    暂无数据
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
