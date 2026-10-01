import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  proxyAll?: boolean;
  proxyUrl?: string;
  initialTime?: number;
  onTimeUpdate?: (time: number) => void;
  // Live mode: called once on fatal stream error so the parent can switch to the next candidate
  onFatal?: () => void;
  // VOD mode: fired when the episode finishes (for auto-next-episode countdown)
  onEnded?: () => void;
  // Object URL of a converted VTT subtitle file (SRT is converted by the parent)
  subtitleBlob?: string;
  // Remembered intro length (seconds) for the current series; enables the skip-intro button
  skipIntro?: number;
  onRememberSkip?: (seconds: number) => void;
}

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

export const HlsPlayer: React.FC<HlsPlayerProps> = ({ src, proxyAll, proxyUrl, initialTime, onTimeUpdate, onFatal, onEnded, subtitleBlob, skipIntro, onRememberSkip }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [codecError, setCodecError] = useState('');
  const fatalHandled = useRef(false);
  const [speed, setSpeed] = useState(() => Number(localStorage.getItem('tvbox_speed')) || 1.0);
  const [nearStart, setNearStart] = useState(true);

  // Apply playback speed (persisted across sessions and episodes)
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
    localStorage.setItem('tvbox_speed', String(speed));
  }, [speed, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setCodecError('');
    fatalHandled.current = false;
    setNearStart(true);

    let hls: Hls | null = null;
    const isMp4 = src.toLowerCase().includes('.mp4');

    if (!isMp4 && Hls.isSupported()) {
      hls = new Hls({
        debug: false,
        enableWorker: true,
        // Relay every manifest/segment request through the proxy (live IPTV:
        // http streams break mixed-content rules and lack CORS headers)
        xhrSetup: (xhr, url) => {
          if (proxyAll) {
            const base = proxyUrl || '/proxy?url=';
            xhr.open('GET', base + encodeURIComponent(url), true);
          }
        }
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Detect video codecs the browser cannot decode (e.g. HEVC -> audio only, no picture)
        const codecs = (hls?.levels || [])
          .map(l => l.videoCodec || '')
          .filter(Boolean);
        const unsupported = codecs.find(c => {
          try {
            return !window.MediaSource || !MediaSource.isTypeSupported(`video/mp4;codecs="${c}"`);
          } catch { return false; }
        });
        if (unsupported) {
          setCodecError(
            `该播放源的视频编码（${unsupported.split('.')[0].toUpperCase()}）当前浏览器不支持解码，` +
            '所以只有声音没有画面。请更换其他播放源，或改用 Safari 浏览器观看。'
          );
        }
        if (initialTime && initialTime > 0) {
          video.currentTime = initialTime;
        }
        video.playbackRate = speed;
        video.play().catch(e => console.log('Auto-play prevented:', e));
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (onFatal) {
          // Live mode: let the parent advance to the next (URL x proxy) candidate
          if (!fatalHandled.current) {
            fatalHandled.current = true;
            onFatal();
          }
        } else {
          console.warn('HLS error, trying native playback...');
          video.src = src;
        }
      });
    } else {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        if (initialTime && initialTime > 0) {
          video.currentTime = initialTime;
        }
        video.playbackRate = speed;
        video.play().catch(e => console.log('Auto-play prevented:', e));
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, proxyAll, proxyUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onTimeUpdate) return;

    let lastTime = 0;
    const handleTimeUpdate = () => {
      setNearStart(video.currentTime < 180);
      // Throttle updates to every 5 seconds
      if (Math.abs(video.currentTime - lastTime) > 5) {
        lastTime = video.currentTime;
        onTimeUpdate(video.currentTime);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onTimeUpdate]);

  // Episode finished -> parent decides whether to auto-play the next one
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onEnded) return;
    const handler = () => onEnded();
    video.addEventListener('ended', handler);
    return () => video.removeEventListener('ended', handler);
  }, [onEnded]);

  // Keyboard shortcuts (ignored while typing in inputs):
  // Space=pause/play, <-/-> seek 10s, Up/Down volume, F fullscreen, M mute
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (v.paused) v.play().catch(() => {}); else v.pause();
          break;
        case 'ArrowLeft':
          v.currentTime = Math.max(0, v.currentTime - 10);
          break;
        case 'ArrowRight':
          if (v.duration) v.currentTime = Math.min(v.duration, v.currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          v.volume = Math.min(1, v.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          v.volume = Math.max(0, v.volume - 0.1);
          break;
        case 'KeyF':
          if (document.fullscreenElement) document.exitFullscreen();
          else wrapRef.current?.requestFullscreen?.();
          break;
        case 'KeyM':
          v.muted = !v.muted;
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // External subtitles: swap in a <track> pointing at the VTT blob
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    Array.from(video.querySelectorAll('track')).forEach(t => t.remove());
    if (!subtitleBlob) return;
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = '字幕';
    track.srclang = 'zh';
    track.default = true;
    track.src = subtitleBlob;
    video.appendChild(track);
    const timer = window.setTimeout(() => {
      const tt = video.textTracks[video.textTracks.length - 1];
      if (tt) tt.mode = 'showing';
    }, 150);
    return () => {
      window.clearTimeout(timer);
      track.remove();
    };
  }, [subtitleBlob, src]);

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch (e) {
      console.warn('Picture-in-Picture failed:', e);
    }
  };

  const doSkipIntro = () => {
    const v = videoRef.current;
    if (!v) return;
    if (skipIntro && skipIntro > 0) {
      v.currentTime = skipIntro;
      v.play().catch(() => {});
      return;
    }
    const input = prompt('这部片子的片头大约多少秒？设置后会被记住，下次一键跳过。', '90');
    const sec = Number(input);
    if (sec > 0 && sec < 600) {
      v.currentTime = sec;
      onRememberSkip?.(Math.round(sec));
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        controls
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          borderRadius: '8px'
        }}
      />
      {/* Floating control bar: playback speed + picture-in-picture */}
      <div style={{
        position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', alignItems: 'center',
        background: 'rgba(0,0,0,0.55)', borderRadius: '8px', padding: '4px 6px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '70%'
      }}>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginRight: '2px' }}>倍速</span>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            style={{
              border: 'none', cursor: 'pointer', borderRadius: '4px', padding: '2px 5px', fontSize: '11px', lineHeight: 1.4,
              background: Math.abs(speed - s) < 0.01 ? 'rgba(59,130,246,0.9)' : 'rgba(255,255,255,0.12)',
              color: '#fff'
            }}
          >
            {s}x
          </button>
        ))}
        <button
          onClick={togglePip}
          title="画中画（小窗播放）"
          style={{ border: 'none', cursor: 'pointer', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', lineHeight: 1.4, background: 'rgba(255,255,255,0.12)', color: '#fff' }}
        >画中画</button>
      </div>
      {/* Skip-intro button, only visible near the beginning of a long video */}
      {nearStart && skipIntro !== undefined && (
        <button
          onClick={doSkipIntro}
          title={skipIntro > 0 ? `跳过片头（已记住 ${skipIntro} 秒）` : '第一次使用会询问片头时长并记住'}
          style={{
            position: 'absolute', right: '8px', bottom: '64px', border: 'none', cursor: 'pointer',
            borderRadius: '6px', padding: '6px 12px', fontSize: '13px', background: 'rgba(0,0,0,0.65)', color: '#fff'
          }}
        >⏭ 跳过片头{skipIntro > 0 ? ` (${skipIntro}s)` : ''}</button>
      )}
      {codecError && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          padding: '10px 14px',
          background: 'rgba(0,0,0,0.75)',
          color: '#fca5a5',
          fontSize: '13px',
          lineHeight: 1.5,
          pointerEvents: 'none'
        }}>
          {codecError}
        </div>
      )}
    </div>
  );
};
