import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  initialTime?: number;
  onTimeUpdate?: (time: number) => void;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({ src, initialTime, onTimeUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [codecError, setCodecError] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setCodecError('');

    let hls: Hls | null = null;
    const isMp4 = src.toLowerCase().includes('.mp4');

    if (!isMp4 && Hls.isSupported()) {
      hls = new Hls({
        debug: false,
        enableWorker: true
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
        video.play().catch(e => console.log('Auto-play prevented:', e));
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
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
        video.play().catch(e => console.log('Auto-play prevented:', e));
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onTimeUpdate) return;
    
    let lastTime = 0;
    const handleTimeUpdate = () => {
      // Throttle updates to every 5 seconds
      if (Math.abs(video.currentTime - lastTime) > 5) {
        lastTime = video.currentTime;
        onTimeUpdate(video.currentTime);
      }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onTimeUpdate]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
