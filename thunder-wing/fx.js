/* 雷霆之翼 Thunder Wing — 特效与音频
   特效：爆散粒子、冲击环、火花、浮字、屏震、顿帧。
   音频：WebAudio 程序化合成，无外部音频文件。 */
(function () {
  const TW = window.TW || (window.TW = {});

  /* ==================== 特效 ==================== */
  const MAX_PARTS = 700;
  const FX = {
    parts: [], texts: [],
    shake: 0, shakeDur: 0, hitstop: 0,
    reset() { this.parts.length = 0; this.texts.length = 0; this.shake = 0; this.shakeDur = 0; this.hitstop = 0; },

    add(p) { if (this.parts.length < MAX_PARTS) this.parts.push(p); },

    /* 小型爆散 */
    boom(x, y, scale, color) {
      scale = scale || 1;
      const n = Math.round(10 * scale);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = (1.2 + Math.random() * 3.2) * scale;
        this.add({ t: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 22 + Math.random() * 18, r: (1.4 + Math.random() * 2) * scale, c: color || '#ffd27a' });
      }
      this.ring(x, y, 6 * scale, color || '#ffe6a8', 18);
    },

    /* 大型爆炸（Boss / 轰炸机） */
    bigBoom(x, y, scale, color) {
      scale = scale || 2;
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, s = (1 + Math.random() * 4.5) * scale;
        this.add({ t: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 30 + Math.random() * 26, r: (2 + Math.random() * 3.4) * scale, c: i % 3 === 0 ? '#fff2c4' : (color || '#ff9a3c') });
      }
      this.ring(x, y, 10 * scale, '#fff0c0', 24);
      this.ring(x, y, 16 * scale, color || '#ff8a3c', 30);
    },

    ring(x, y, r, color, frames) {
      this.add({ t: 'ring', x, y, vx: 0, vy: 0, life: 0, max: frames || 18, r: r, c: color || '#ffffff' });
    },

    /* 命中火花 */
    hit(x, y, color) {
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 2.4;
        this.add({ t: 'line', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 10 + Math.random() * 8, r: 1.4, c: color || '#ffffff' });
      }
    },

    /* 擦弹火花 */
    graze(x, y) {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 1.5 + Math.random() * 2.5;
        this.add({ t: 'line', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 14, r: 1.6, c: '#9ff0ff' });
      }
    },

    text(x, y, str, color, size) {
      if (this.texts.length > 40) this.texts.shift();
      this.texts.push({ x, y, s: str, c: color || '#ffe9a8', life: 0, max: 44, size: size || 13 });
    },

    quake(mag, dur) { this.shake = Math.max(this.shake, mag); this.shakeDur = Math.max(this.shakeDur, dur || 10); },
    stop(frames) { this.hitstop = Math.max(this.hitstop, frames); },

    update() {
      const ps = this.parts;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life++;
        p.x += p.vx; p.y += p.vy;
        if (p.t === 'dot') { p.vx *= 0.94; p.vy *= 0.94; }
        else if (p.t === 'line') { p.vx *= 0.88; p.vy *= 0.88; }
        if (p.life >= p.max) ps.splice(i, 1);
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i]; t.life++; t.y -= 0.55;
        if (t.life >= t.max) this.texts.splice(i, 1);
      }
      if (this.shakeDur > 0) { this.shakeDur--; if (this.shakeDur === 0) this.shake = 0; else this.shake *= 0.9; }
    },

    draw(g) {
      const ps = this.parts;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i], k = 1 - p.life / p.max;
        g.globalAlpha = Math.max(0, k);
        if (p.t === 'ring') {
          g.strokeStyle = p.c; g.lineWidth = 2 * k + 0.4;
          g.beginPath(); g.arc(p.x, p.y, p.r + (1 - k) * p.r * 2.6, 0, Math.PI * 2); g.stroke();
        } else if (p.t === 'line') {
          g.strokeStyle = p.c; g.lineWidth = p.r;
          g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); g.stroke();
        } else {
          g.fillStyle = p.c;
          g.beginPath(); g.arc(p.x, p.y, p.r * (0.4 + k * 0.6), 0, Math.PI * 2); g.fill();
        }
      }
      g.globalAlpha = 1;
      for (let i = 0; i < this.texts.length; i++) {
        const t = this.texts[i], k = 1 - t.life / t.max;
        g.globalAlpha = Math.max(0, k);
        g.fillStyle = t.c; g.font = '600 ' + t.size + 'px "Segoe UI", system-ui, sans-serif';
        g.textAlign = 'center'; g.fillText(t.s, t.x, t.y);
      }
      g.globalAlpha = 1; g.textAlign = 'left';
    },
  };
  TW.FX = FX;

  /* ==================== 音频（WebAudio 合成） ==================== */
  const A = {
    ctx: null, master: null, noise: null, muted: false, ready: false,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.6;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.ready = true;
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; },

    tone(freq, dur, type, vol, slideTo) {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
    },
    burst(dur, vol, freq, q) {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const s = this.ctx.createBufferSource(); s.buffer = this.noise;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(freq || 1200, t);
      f.frequency.exponentialRampToValueAtTime(180, t + dur);
      f.Q.value = q || 1;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur);
    },

    shot(p) { const m = p || 1; this.tone(760 * m, 0.05, 'square', 0.045, 420 * m); },   // p: 连击越高音调越高
    laser() { this.tone(1250, 0.09, 'sawtooth', 0.05, 700); },
    missile() { this.tone(420, 0.08, 'triangle', 0.05, 260); },
    hit() { this.burst(0.05, 0.06, 2600, 2); },
    explode() { this.burst(0.28, 0.22, 1500, 1); this.tone(140, 0.22, 'sine', 0.1, 50); },
    bigExplode() { this.burst(0.7, 0.32, 900, 1); this.tone(90, 0.7, 'sine', 0.16, 35); },
    pickup() { this.tone(880, 0.07, 'square', 0.07, 1320); },
    powerup() { this.tone(660, 0.06, 'square', 0.07); setTimeout(() => this.tone(990, 0.09, 'square', 0.07), 60); },
    charge() { this.tone(300, 0.35, 'sawtooth', 0.06, 1200); },
    chargeFire() { this.tone(1500, 0.18, 'sawtooth', 0.09, 300); this.burst(0.18, 0.12, 2400, 1); },
    bomb() { this.burst(0.9, 0.34, 700, 1); this.tone(70, 0.9, 'sine', 0.18, 28); },
    graze(m) { this.tone(1800 * (m || 1), 0.035, 'sine', 0.035); },   // m: 贪分倍率越高越尖
    death() { this.burst(0.5, 0.28, 800, 1); this.tone(220, 0.6, 'sawtooth', 0.12, 40); },
    warn() { this.tone(520, 0.12, 'square', 0.08); setTimeout(() => this.tone(520, 0.12, 'square', 0.08), 160); },
    extend() { [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.13, 'square', 0.08), i * 90)); },
    /* v1.3.0：升级三选一的上行音阶；超载触发的更亮更有力 */
    levelup() { [784, 988, 1319].forEach((f, i) => setTimeout(() => this.tone(f, 0.1, 'square', 0.08), i * 70)); },
    overdrive() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'sawtooth', 0.09), i * 58)); },
    /* ---- v1.5.0 打击感分层 ---- */
    crit() { this.tone(150, 0.14, 'square', 0.11, 55); this.burst(0.12, 0.1, 900, 1); },
    bossRoar() { this.tone(72, 0.9, 'sawtooth', 0.15, 46); this.tone(108, 0.7, 'sawtooth', 0.09, 60); },
    pickOpen() { this.tone(520, 0.14, 'sine', 0.07, 260); },
    pickOk() { [660, 990].forEach((f, i) => setTimeout(() => this.tone(f, 0.08, 'square', 0.07), i * 60)); },
    heatUp(t) { this.tone(900 + t * 90, 0.09, 'square', 0.06); },
  };
  TW.Audio = A;
})();
