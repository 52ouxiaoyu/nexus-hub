'use strict';
/* =========================================================================
 * 极速飞车 Turbo Rush 3D — v1.0.0
 * 街机式 3D 环形赛道竞速（参考马车 / 山脊赛车式手感）
 * 纯前端：three.js r128（本地）+ 原生 JS，无任何构建工具
 * 坐标系约定：heading=0 朝 +z；heading 增大 = 右转；
 *            left 向量 = (t.z, 0, -t.x)（命名沿用，实际为行进方向右侧）
 * ========================================================================= */

/* ---------------- 0. 工具 ---------------- */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function wrapAngle(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function fmtTime(sec) {
    if (!isFinite(sec) || sec <= 0) return '--:--.--';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60), cs = Math.floor((sec * 100) % 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
function disposeObj(root) {
    root.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
        }
    });
}

/* ---------------- 1. 常量 ---------------- */
const CFG = {
    ROAD_HALF: 7.0,          // 路面半宽
    CURB_W: 1.3,             // 红白路肩宽
    SAMPLES: 900,            // 赛道采样数
    LAPS: 3,
    VMAX: 46,                // m/s ≈ 165 km/h
    VMAX_NITRO: 58,
    ACCEL: 15,
    BRAKE: 30,
    REV_MAX: -9,
    LAT_GRIP: 19,            // 侧向抓地上限 m/s²
    NITRO_MAX: 100,
    AI_COLORS: [0x4361ee, 0xf4a261, 0x2a9d8f],
    PLAYER_COLOR: 0xe63946,
};
const DIFFS = [
    { name: '轻松', aiSkill: 0.86, rubber: 0.9 },
    { name: '势均力敌', aiSkill: 0.96, rubber: 1.0 },
    { name: '狂野', aiSkill: 1.05, rubber: 1.08 },
];

/* ---------------- 2. 音频（WebAudio 合成，无素材） ---------------- */
const AudioSys = {
    ctx: null, master: null, muted: false,
    engineOsc: null, engineSub: null, engineGain: null,
    windGain: null, skidGain: null,
    init() {
        if (this.ctx) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.5;
            this.master.connect(this.ctx.destination);
            // 引擎：锯齿主音 + 方波副音
            this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
            const engFilter = this.ctx.createBiquadFilter();
            engFilter.type = 'lowpass'; engFilter.frequency.value = 900;
            this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 60;
            this.engineSub = this.ctx.createOscillator(); this.engineSub.type = 'square'; this.engineSub.frequency.value = 30;
            const subG = this.ctx.createGain(); subG.gain.value = 0.4;
            this.engineOsc.connect(engFilter); this.engineSub.connect(subG); subG.connect(engFilter);
            engFilter.connect(this.engineGain); this.engineGain.connect(this.master);
            this.engineOsc.start(); this.engineSub.start();
            // 噪声源（风 + 打滑共用 buffer）
            const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
            const d = noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            this.noiseBuf = noiseBuf;
            const mkNoise = (filterType, freq, q) => {
                const src = this.ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
                const f = this.ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; if (q) f.Q.value = q;
                const g = this.ctx.createGain(); g.gain.value = 0;
                src.connect(f); f.connect(g); g.connect(this.master); src.start();
                return g;
            };
            this.windGain = mkNoise('lowpass', 500);
            this.skidGain = mkNoise('bandpass', 1600, 1.2);
        } catch (e) { console.warn('audio init failed', e); }
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    setEngine(speed, throttle, nitro) {
        if (!this.ctx || this.muted) return;
        const f = 55 + speed * 3.1 + (nitro ? 40 : 0);
        this.engineOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
        this.engineSub.frequency.setTargetAtTime(f * 0.5, this.ctx.currentTime, 0.05);
        this.engineGain.gain.setTargetAtTime(0.03 + throttle * 0.09 + (nitro ? 0.03 : 0), this.ctx.currentTime, 0.08);
        this.windGain.gain.setTargetAtTime(clamp(speed / CFG.VMAX, 0, 1) * 0.07, this.ctx.currentTime, 0.15);
    },
    setSkid(v) { if (this.ctx && !this.muted) this.skidGain.gain.setTargetAtTime(v * 0.06, this.ctx.currentTime, 0.08); },
    silence() {
        if (!this.ctx) return;
        this.engineGain && this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        this.windGain && this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        this.skidGain && this.skidGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    },
    beep(freq, dur, type, vol) {
        if (!this.ctx || this.muted) return;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(vol || 0.25, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (dur || 0.15));
        o.connect(g); g.connect(this.master);
        o.start(); o.stop(this.ctx.currentTime + (dur || 0.15) + 0.02);
    },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.beep(f, 0.35, 'triangle', 0.3), i * 160)); },
    toggleMute() {
        this.muted = !this.muted;
        if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
        return this.muted;
    },
};

/* ---------------- 3. 输入 ---------------- */
const Input = {
    keys: {}, touch: { left: false, right: false, gas: false, brake: false, nitro: false },
    init() {
        window.addEventListener('keydown', e => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Shift'].includes(e.key)) e.preventDefault();
            this.keys[e.key.toLowerCase()] = true;
            Game.onKey(e.key.toLowerCase());
        });
        window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            document.getElementById('touchUI').style.display = 'block';
            const bind = (id, prop) => {
                const el = document.getElementById(id);
                const on = ev => { ev.preventDefault(); this.touch[prop] = true; };
                const off = ev => { ev.preventDefault(); this.touch[prop] = false; };
                el.addEventListener('touchstart', on, { passive: false });
                el.addEventListener('touchend', off); el.addEventListener('touchcancel', off);
            };
            bind('t-left', 'left'); bind('t-right', 'right'); bind('t-gas', 'gas'); bind('t-brake', 'brake'); bind('t-nitro', 'nitro');
        }
    },
    get throttle() { return (this.keys['w'] || this.keys['arrowup'] || this.touch.gas) ? 1 : 0; },
    get brake() { return (this.keys['s'] || this.keys['arrowdown'] || this.touch.brake) ? 1 : 0; },
    /* 转向输入：+1 = 右转（heading 增大），-1 = 左转 */
    get steer() {
        let s = 0;
        if (this.keys['a'] || this.keys['arrowleft'] || this.touch.left) s -= 1;
        if (this.keys['d'] || this.keys['arrowright'] || this.touch.right) s += 1;
        return s;
    },
    get handbrake() { return !!this.keys[' ']; },
    get nitro() { return !!(this.keys['shift'] || this.touch.nitro); },
};

/* ---------------- 4. 纹理（Canvas 程序生成） ---------------- */
function makeRoadTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#3a3d44'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
        const v = 46 + Math.random() * 26;
        g.fillStyle = `rgba(${v},${v},${v + 3},${0.25 + Math.random() * 0.3})`;
        g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.fillStyle = '#e8e8e8'; g.fillRect(8, 0, 7, 256); g.fillRect(241, 0, 7, 256);
    g.fillStyle = '#ffd23f'; g.fillRect(124, 0, 8, 48); // 中央黄虚线（4m 划 / 18m 空）
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
}
function makeCurbTexture() {
    const c = document.createElement('canvas'); c.width = 32; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#d93025'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#f5f5f5'; g.fillRect(0, 32, 32, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}
function makeCheckerTexture() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32;
    const g = c.getContext('2d'); const n = 16, s = 128 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) {
        g.fillStyle = ((i + j) % 2) ? '#111' : '#f2f2f2';
        g.fillRect(i * s, j * 8, s, 8);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}
function makeBannerTexture() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#0d1b2a'); grad.addColorStop(0.5, '#1b4965'); grad.addColorStop(1, '#0d1b2a');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#00e5ff'; g.font = '900 64px Inter, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('🏁 FINISH', 256, 66);
    return new THREE.CanvasTexture(c);
}

/* ---------------- 5. 赛道与世界 ---------------- */
class World {
    constructor(scene, seed) {
        this.scene = scene; this.seed = seed; this.rng = mulberry32(seed);
        this.group = new THREE.Group();
        this.buildTrack();
        this.buildTerrain();
        this.buildScenery();
        scene.add(this.group);
    }

    /* 赛道：星形多边形控制点（半径是角度的单值函数 → 数学上保证不自交） */
    buildTrack() {
        const rng = this.rng;
        const N = 13 + Math.floor(rng() * 4);
        const wig1 = rng() * TAU, wig2 = rng() * TAU;
        const pts = [];
        for (let i = 0; i < N; i++) {
            const ang = (i / N) * TAU + (rng() - 0.5) * (TAU / N) * 0.42;
            const r = 150 + rng() * 110 + 26 * Math.sin(ang * 3 + wig1) + 16 * Math.sin(ang * 5 + wig2);
            const y = 1.2 + rng() * 5.5;
            pts.push(new THREE.Vector3(Math.cos(ang) * r * 1.16, y, Math.sin(ang) * r * 0.94));
        }
        this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
        this.length = this.curve.getLength();

        const S = CFG.SAMPLES;
        this.smp = [];
        for (let i = 0; i < S; i++) {
            const t = i / S;
            const p = this.curve.getPointAt(t);
            const tan = this.curve.getTangentAt(t);
            const tanH = new THREE.Vector3(tan.x, 0, tan.z).normalize();
            const left = new THREE.Vector3(tanH.z, 0, -tanH.x);
            this.smp.push({ p, t: tanH, left, y: p.y, s: (i / S) * this.length, curv: 0 });
        }
        // 曲率（rad/m）
        const step = this.length / S;
        for (let i = 0; i < S; i++) {
            const a = this.smp[(i - 8 + S) % S].t, b = this.smp[(i + 8) % S].t;
            this.smp[i].curv = Math.acos(clamp(a.dot(b), -1, 1)) / (16 * step);
        }
        // AI 限速：弯道向心限制 + 制动前瞻包络
        const vAllow = new Float32Array(S);
        for (let i = 0; i < S; i++) vAllow[i] = clamp(Math.sqrt(15 / Math.max(this.smp[i].curv, 1e-4)), 11, 62);
        const vLim = new Float32Array(S);
        for (let i = 0; i < S; i++) {
            let m = 62;
            for (let j = 0; j < 60; j += 3) {
                const k = (i + j) % S;
                m = Math.min(m, Math.sqrt(vAllow[k] * vAllow[k] + 2 * 13 * j * step));
            }
            vLim[i] = m;
        }
        this.aiV = vLim;

        this.buildRoadMesh();
        this.buildGantry();
    }

    smpAt(s) {
        const S = CFG.SAMPLES;
        let f = (s / this.length) % 1; if (f < 0) f += 1;
        const fi = f * S, i = Math.floor(fi) % S, j = (i + 1) % S, k = fi - Math.floor(fi);
        const A = this.smp[i], B = this.smp[j];
        return {
            p: A.p.clone().lerp(B.p, k), t: A.t.clone().lerp(B.t, k).normalize(),
            left: A.left.clone().lerp(B.left, k).normalize(), y: lerp(A.y, B.y, k),
            curv: lerp(A.curv, B.curv, k),
        };
    }
    nearestIdx(x, z, hint) {
        const S = CFG.SAMPLES; let best = 0, bd = Infinity;
        if (hint != null) {
            for (let d = -50; d <= 50; d++) {
                const i = (hint + d + S) % S;
                const dx = x - this.smp[i].p.x, dz = z - this.smp[i].p.z;
                const dd = dx * dx + dz * dz;
                if (dd < bd) { bd = dd; best = i; }
            }
            if (bd < 1600) return best; // 40m 内可信
        }
        bd = Infinity;
        for (let i = 0; i < S; i += 2) {
            const dx = x - this.smp[i].p.x, dz = z - this.smp[i].p.z;
            const dd = dx * dx + dz * dz;
            if (dd < bd) { bd = dd; best = i; }
        }
        return best;
    }

    /* 环带网格：从 inner 到 outer 的闭合条带（v 沿赛道展开） */
    buildStrip(inner, outer, tex, vScale) {
        const S = CFG.SAMPLES;
        const pos = [], uv = [], idx = [];
        for (let i = 0; i <= S; i++) {
            const a = this.smp[i % S];
            const vi = pos.length / 3;
            pos.push(
                a.p.x + a.left.x * outer, a.y + 0.09, a.p.z + a.left.z * outer,
                a.p.x + a.left.x * inner, a.y + 0.09, a.p.z + a.left.z * inner,
            );
            const v = a.s * vScale;
            uv.push(0, v, 1, v);
            if (i > 0) {
                const b = vi - 2;
                idx.push(b, vi, b + 1, b + 1, vi, vi + 1); // 朝上绕序
            }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx); g.computeVertexNormals();
        return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex }));
    }

    buildRoadMesh() {
        const hw = CFG.ROAD_HALF, cw = CFG.CURB_W;
        const roadTex = makeRoadTexture(), curbTex = makeCurbTexture();
        this.group.add(this.buildStrip(hw + cw, hw, curbTex, 0.5));     // 左路肩
        this.group.add(this.buildStrip(hw, -hw, roadTex, 1 / 22));      // 路面
        this.group.add(this.buildStrip(-hw, -hw - cw, curbTex, 0.5));   // 右路肩

        // 起跑线（棋盘格）
        const chk = makeCheckerTexture(); chk.repeat.set(2, 1);
        const slG = new THREE.PlaneGeometry(hw * 2, 3);
        slG.rotateX(-Math.PI / 2);
        const sl = new THREE.Mesh(slG, new THREE.MeshBasicMaterial({ map: chk }));
        const sm = this.smpAt(1.5), t0 = this.smp[0].t;
        sl.rotation.y = Math.atan2(t0.x, t0.z);
        sl.position.set(sm.p.x, sm.y + 0.11, sm.p.z);
        this.group.add(sl);
    }

    buildGantry() {
        const s0 = this.smp[0];
        const pillarG = new THREE.BoxGeometry(0.8, 7.5, 0.8);
        const pillarM = new THREE.MeshLambertMaterial({ color: 0x9aa5b1 });
        const span = CFG.ROAD_HALF + CFG.CURB_W + 1.2;
        for (const side of [1, -1]) {
            const p = new THREE.Mesh(pillarG, pillarM);
            p.position.set(s0.p.x + s0.left.x * span * side, s0.y + 3.75, s0.p.z + s0.left.z * span * side);
            this.group.add(p);
        }
        const banner = new THREE.Mesh(
            new THREE.BoxGeometry(span * 2 + 0.8, 2.2, 0.3),
            new THREE.MeshLambertMaterial({ map: makeBannerTexture() })
        );
        banner.position.set(s0.p.x, s0.y + 6.4, s0.p.z);
        banner.rotation.y = Math.atan2(s0.t.x, s0.t.z);
        this.group.add(banner);
        // 起点两侧看台
        const standM = new THREE.MeshLambertMaterial({ color: 0x39506c });
        for (const side of [1, -1]) {
            const st = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 26), standM);
            st.position.set(s0.p.x + s0.left.x * (CFG.ROAD_HALF + 6) * side, s0.y + 1, s0.p.z + s0.left.z * (CFG.ROAD_HALF + 6) * side);
            st.rotation.y = Math.atan2(s0.t.x, s0.t.z);
            this.group.add(st);
        }
    }

    terrainH(x, z) {
        const r = Math.hypot(x, z);
        const fade = 1 - smoothstep(300, 350, r);
        return fade * (2.4 * Math.sin(x * 0.011 + 1.7) + 2.0 * Math.sin(z * 0.013 + 4.2) + 1.5 * Math.sin((x + z) * 0.008 + 2.0) + 1.0 * Math.sin(x * 0.027 - z * 0.021));
    }
    groundY(x, z, hint) {
        const i = this.nearestIdx(x, z, hint);
        const a = this.smp[i];
        const d = Math.hypot(x - a.p.x, z - a.p.z);
        if (d < 13) return a.y;
        if (d < 45) return lerp(a.y, this.terrainH(x, z), smoothstep(13, 45, d));
        return this.terrainH(x, z);
    }
    lateralOffset(x, z, i) {
        const a = this.smp[i];
        return (x - a.p.x) * a.left.x + (z - a.p.z) * a.left.z;
    }

    buildTerrain() {
        const SIZE = 720, N = 100, half = SIZE / 2;
        const pos = [], col = [], idx = [];
        const cA = new THREE.Color(0x4e7a2e), cB = new THREE.Color(0x6f9a44), cDirt = new THREE.Color(0x8a7248);
        const c = new THREE.Color();
        for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
            const x = -half + (i / N) * SIZE, z = -half + (j / N) * SIZE;
            let bd = Infinity, bi = 0;
            for (let k = 0; k < CFG.SAMPLES; k += 2) {
                const dx = x - this.smp[k].p.x, dz = z - this.smp[k].p.z;
                const dd = dx * dx + dz * dz;
                if (dd < bd) { bd = dd; bi = k; }
            }
            const d = Math.sqrt(bd), tr = this.smp[bi];
            let y;
            if (d < 13) y = tr.y;
            else if (d < 45) y = lerp(tr.y, this.terrainH(x, z), smoothstep(13, 45, d));
            else y = this.terrainH(x, z);
            pos.push(x, y - 0.06, z);
            const h = clamp((y + 1) / 8, 0, 1);
            c.copy(cA).lerp(cB, h);
            const edge = CFG.ROAD_HALF + CFG.CURB_W;
            if (d < edge + 2.2) c.lerp(cDirt, 0.75);
            else if (d < edge + 6) c.lerp(cDirt, 0.35 * (1 - (d - edge - 2.2) / 3.8));
            c.offsetHSL(0, 0, (this.rng() - 0.5) * 0.018);
            col.push(c.r, c.g, c.b);
        }
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
            const a = j * (N + 1) + i;
            idx.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setIndex(idx); g.computeVertexNormals();
        this.group.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
        // 外围大地面
        const outer = new THREE.Mesh(
            new THREE.CircleGeometry(1500, 48),
            new THREE.MeshLambertMaterial({ color: 0x527f33 })
        );
        outer.rotation.x = -Math.PI / 2; outer.position.y = -0.12;
        this.group.add(outer);
    }

    buildScenery() {
        const rng = this.rng;
        const tmp = new THREE.Object3D();
        // 树（树冠 + 树干 InstancedMesh）
        const trees = [];
        let guard = 0;
        while (trees.length < 170 && guard++ < 4000) {
            const ang = rng() * TAU, r = 60 + rng() * 290;
            const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
            const i = this.nearestIdx(x, z, null);
            const d = Math.hypot(x - this.smp[i].p.x, z - this.smp[i].p.z);
            if (d < CFG.ROAD_HALF + 9 || d > 240) continue;
            trees.push({ x, z, y: this.groundY(x, z, i), s: 0.7 + rng() * 0.9 });
        }
        const crown = new THREE.InstancedMesh(
            new THREE.ConeGeometry(2.1, 5.4, 7),
            new THREE.MeshLambertMaterial({ color: 0x2e6b22 }), trees.length);
        const trunk = new THREE.InstancedMesh(
            new THREE.CylinderGeometry(0.32, 0.42, 2.2, 5),
            new THREE.MeshLambertMaterial({ color: 0x6b4a2c }), trees.length);
        trees.forEach((t, i) => {
            tmp.rotation.set(0, rng() * TAU, 0);
            tmp.scale.setScalar(t.s);
            tmp.position.set(t.x, t.y + 4.6 * t.s, t.z); tmp.updateMatrix();
            crown.setMatrixAt(i, tmp.matrix);
            tmp.position.set(t.x, t.y + 1.1 * t.s, t.z); tmp.updateMatrix();
            trunk.setMatrixAt(i, tmp.matrix);
        });
        this.group.add(crown, trunk);

        // 岩石
        const rocks = [];
        guard = 0;
        while (rocks.length < 60 && guard++ < 3000) {
            const ang = rng() * TAU, r = 50 + rng() * 300;
            const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
            const i = this.nearestIdx(x, z, null);
            const d = Math.hypot(x - this.smp[i].p.x, z - this.smp[i].p.z);
            if (d < CFG.ROAD_HALF + 7 || d > 260) continue;
            rocks.push({ x, z, y: this.groundY(x, z, i), s: 0.5 + rng() * 1.4 });
        }
        const rock = new THREE.InstancedMesh(
            new THREE.DodecahedronGeometry(1.1, 0),
            new THREE.MeshLambertMaterial({ color: 0x8d8d93 }), rocks.length);
        rocks.forEach((t, i) => {
            tmp.position.set(t.x, t.y + 0.4 * t.s, t.z);
            tmp.scale.set(t.s, t.s * 0.7, t.s);
            tmp.rotation.set(rng(), rng() * TAU, rng()); tmp.updateMatrix();
            rock.setMatrixAt(i, tmp.matrix);
        });
        this.group.add(rock);

        // 远山
        const mts = [];
        for (let i = 0; i < 16; i++) {
            const ang = (i / 16) * TAU + rng() * 0.3;
            const r = 560 + rng() * 140;
            mts.push({ x: Math.cos(ang) * r, z: Math.sin(ang) * r, w: 90 + rng() * 120, h: 70 + rng() * 130 });
        }
        const mt = new THREE.InstancedMesh(
            new THREE.ConeGeometry(1, 1, 6),
            new THREE.MeshLambertMaterial({ color: 0x5f7d9c }), mts.length);
        mts.forEach((t, i) => {
            tmp.position.set(t.x, t.h / 2 - 6, t.z);
            tmp.scale.set(t.w, t.h, t.w);
            tmp.rotation.set(0, rng() * TAU, 0); tmp.updateMatrix();
            mt.setMatrixAt(i, tmp.matrix);
        });
        this.group.add(mt);

        // 云
        const nCloud = 30;
        this.clouds = new THREE.InstancedMesh(
            new THREE.SphereGeometry(1, 8, 6),
            new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x8899aa, emissiveIntensity: 0.25, fog: false, transparent: true, opacity: 0.92 }),
            nCloud);
        this.cloudData = [];
        for (let i = 0; i < nCloud; i++) {
            this.cloudData.push({ x: rng() * 1200 - 600, y: 95 + rng() * 60, z: rng() * 1200 - 600, s: 12 + rng() * 22, sp: 1.2 + rng() * 2 });
        }
        this.group.add(this.clouds);
        this.updateClouds(0);
    }

    updateClouds(dt) {
        const tmp = new THREE.Object3D();
        this.cloudData.forEach((c, i) => {
            c.x += c.sp * dt;
            if (c.x > 700) c.x = -700;
            tmp.position.set(c.x, c.y, c.z);
            tmp.scale.set(c.s * 1.6, c.s * 0.55, c.s); tmp.updateMatrix();
            this.clouds.setMatrixAt(i, tmp.matrix);
        });
        this.clouds.instanceMatrix.needsUpdate = true;
    }

    dispose() {
        disposeObj(this.group);
        this.scene.remove(this.group);
    }
}

/* ---------------- 6. 车辆模型（低多边形，程序生成） ---------------- */
function buildCarMesh(color) {
    const g = new THREE.Group();
    const bodyM = new THREE.MeshLambertMaterial({ color });
    const darkM = new THREE.MeshLambertMaterial({ color: 0x14161a });
    const glassM = new THREE.MeshLambertMaterial({ color: 0x0f2338 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 4.4), bodyM);
    chassis.position.y = 0.55; g.add(chassis);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 1.1), bodyM);
    nose.position.set(0, 0.46, 2.45); g.add(nose);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.5, 1.9), glassM);
    cabin.position.set(0, 1.02, -0.28); g.add(cabin);
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.55), darkM);
    spoiler.position.set(0, 1.12, -2.05); g.add(spoiler);
    for (const sx of [-0.72, 0.72]) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.3), darkM);
        sp.position.set(sx, 0.92, -2.05); g.add(sp);
    }
    const hlM = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xfff2b0, emissiveIntensity: 0.7 });
    for (const sx of [-0.55, 0.55]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.1), hlM);
        hl.position.set(sx, 0.52, 2.98); g.add(hl);
    }
    const tlM = new THREE.MeshLambertMaterial({ color: 0xff2b2b, emissive: 0xff2b2b, emissiveIntensity: 0.8 });
    for (const sx of [-0.68, 0.68]) {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.1), tlM);
        tl.position.set(sx, 0.62, -2.22); g.add(tl);
    }
    // 车轮
    const wheelG = new THREE.CylinderGeometry(0.44, 0.44, 0.34, 12);
    wheelG.rotateZ(Math.PI / 2);
    const hubM = new THREE.MeshLambertMaterial({ color: 0xb9c0c9 });
    const wheels = [];
    for (const [wx, wz] of [[-1.02, 1.45], [1.02, 1.45], [-1.02, -1.5], [1.02, -1.5]]) {
        const w = new THREE.Mesh(wheelG, darkM);
        w.position.set(wx, 0.44, wz);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 8), hubM);
        hub.rotation.z = Math.PI / 2;
        w.add(hub);
        g.add(w); wheels.push(w);
    }
    // 假阴影
    const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(2.5, 18),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; shadow.scale.set(0.85, 1.35, 1);
    g.add(shadow);
    return { group: g, wheels, frontWheels: [wheels[0], wheels[1]] };
}

/* ---------------- 7. 玩家 ---------------- */
class Player {
    constructor(world, s0, lane) {
        this.world = world;
        const sm = world.smpAt(s0);
        this.pos = sm.p.clone().addScaledVector(sm.left, lane);
        this.pos.y = sm.y;
        this.heading = Math.atan2(sm.t.x, sm.t.z);
        this.velAngle = this.heading;
        this.speed = 0;
        this.nitro = CFG.NITRO_MAX;
        this.idx = 0;
        this.lastS = s0;
        this.autopilot = null;
        this.drifting = false;
        this.nitroOn = false;
        this.slide = 0;
        this.steerA = 0;
        const built = buildCarMesh(CFG.PLAYER_COLOR);
        this.mesh = built.group; this.wheels = built.wheels; this.frontWheels = built.frontWheels;
        this.wheelSpin = 0;
        this.update(0.016, false);
    }
    forward() { return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)); }

    update(dt, controlsLive) {
        const w = this.world;
        const auto = this.autopilot;
        const throttle = auto ? auto.throttle : (controlsLive ? Input.throttle : 0);
        const brake = auto ? auto.brake : (controlsLive ? Input.brake : 0);
        const steerIn = auto ? auto.steer : (controlsLive ? Input.steer : 0);
        const hb = !auto && controlsLive && Input.handbrake;
        const nitroOn = !auto && controlsLive && Input.nitro && this.nitro > 1 && this.speed > 4;

        // 赛道定位
        this.idx = w.nearestIdx(this.pos.x, this.pos.z, this.idx);
        const near = w.smp[this.idx];
        const lat = w.lateralOffset(this.pos.x, this.pos.z, this.idx);
        const onRoad = Math.abs(lat) <= CFG.ROAD_HALF + CFG.CURB_W;

        // 纵向动力学
        const vmaxEff = (nitroOn ? CFG.VMAX_NITRO : CFG.VMAX) * (onRoad ? 1 : 0.36);
        let a = 0;
        if (throttle > 0) a += CFG.ACCEL * 1.35 * Math.max(0, 1 - this.speed / vmaxEff) * throttle * (nitroOn ? 1.6 : 1);
        if (brake > 0) {
            if (this.speed > 0.5) a -= CFG.BRAKE * brake;
            else a += 8 * brake * (1 - clamp(-this.speed / -CFG.REV_MAX, 0, 1));
        }
        const sgn = Math.abs(this.speed) > 0.15 ? Math.sign(this.speed) : 0;
        a -= this.speed * (onRoad ? 0.012 : 0.14);
        a -= 0.35 * sgn;
        if (!onRoad) a -= 3.4 * sgn;
        if (hb) a -= 6 * sgn;
        this.speed += a * dt;
        if (this.speed > vmaxEff) this.speed = Math.max(vmaxEff, this.speed - 16 * dt); // 出赛道软限速
        if (this.speed < CFG.REV_MAX) this.speed = CFG.REV_MAX;
        if (Math.abs(this.speed) < 0.06 && throttle === 0 && brake === 0) this.speed = 0;

        // 转向：方向盘角随速度衰减 + 侧向抓地封顶
        const steerMax = 0.62 / (1 + Math.abs(this.speed) * 0.055);
        this.steerA = lerp(this.steerA, steerIn * steerMax, 1 - Math.exp(-10 * dt));
        let yawRate = (this.speed / 2.6) * Math.tan(this.steerA);
        const latCap = (hb ? CFG.LAT_GRIP * 0.55 : CFG.LAT_GRIP) / Math.max(Math.abs(this.speed), 3);
        yawRate = clamp(yawRate, -latCap, latCap);
        this.heading = wrapAngle(this.heading + yawRate * dt);

        // 漂移：速度方向滞后于车头
        const gripRate = hb ? 2.0 : 7.0;
        this.velAngle = wrapAngle(this.velAngle + wrapAngle(this.heading - this.velAngle) * clamp(gripRate * dt, 0, 1));
        this.slide = Math.abs(wrapAngle(this.heading - this.velAngle));
        if (this.slide > 0.12 && Math.abs(this.speed) > 8) this.speed -= this.slide * this.speed * 0.55 * dt;

        // 位移
        this.pos.x += Math.sin(this.velAngle) * this.speed * dt;
        this.pos.z += Math.cos(this.velAngle) * this.speed * dt;

        // 氮气
        if (nitroOn) this.nitro = Math.max(0, this.nitro - 26 * dt);
        else this.nitro = Math.min(CFG.NITRO_MAX, this.nitro + (onRoad ? 5.5 : 2.5) * dt);
        this.nitroOn = nitroOn;

        // 高度与姿态（贴地 + 俯仰/侧倾）
        const y = w.groundY(this.pos.x, this.pos.z, this.idx) + 0.02;
        this.pos.y = lerp(this.pos.y, y, clamp(12 * dt, 0, 1));
        const f = this.forward(), lf = new THREE.Vector3(f.z, 0, -f.x);
        const yF = w.groundY(this.pos.x + f.x * 2.1, this.pos.z + f.z * 2.1, this.idx);
        const yB = w.groundY(this.pos.x - f.x * 2.1, this.pos.z - f.z * 2.1, this.idx);
        const yL = w.groundY(this.pos.x + lf.x * 1.1, this.pos.z + lf.z * 1.1, this.idx);
        const yR = w.groundY(this.pos.x - lf.x * 1.1, this.pos.z - lf.z * 1.1, this.idx);
        this.mesh.position.copy(this.pos);
        this.mesh.rotation.order = 'YXZ';
        this.mesh.rotation.y = this.heading;
        this.mesh.rotation.x = lerp(this.mesh.rotation.x, Math.atan2(yB - yF, 4.2), clamp(8 * dt, 0, 1));
        this.mesh.rotation.z = lerp(this.mesh.rotation.z, Math.atan2(yL - yR, 2.2), clamp(8 * dt, 0, 1));

        // 车轮
        this.wheelSpin += this.speed * dt / 0.44;
        for (const wl of this.wheels) wl.rotation.x = this.wheelSpin;
        for (const wl of this.frontWheels) wl.rotation.y = -this.steerA * 0.9;

        // 圈进度（净里程，倒车会回退 → 无法作弊）
        const s = near.s;
        let ds = s - this.lastS;
        if (ds > w.length / 2) ds -= w.length;
        if (ds < -w.length / 2) ds += w.length;
        this.lastS = s;
        this.accum = (this.accum || 0) + ds;

        this.drifting = (hb && Math.abs(this.speed) > 9) || (this.slide > 0.3 && Math.abs(this.speed) > 11);
        return { lat, onRoad, drifting: this.drifting };
    }
}

/* ---------------- 8. AI 车手 ---------------- */
class AICar {
    constructor(world, s, lane, color, skill) {
        this.world = world;
        this.s = s; this.startS = s; this.lane = lane; this.laneT = lane;
        this.v = 0; this.skill = skill;
        this.laneTimer = 2 + Math.random() * 3;
        this.finished = false;
        const built = buildCarMesh(color);
        this.mesh = built.group; this.wheels = built.wheels;
        this.wheelSpin = 0;
        this.pos = new THREE.Vector3();
        this.update(0, false, 0);
    }
    accumDist() { return this.s - this.startS; } // 净行驶里程（与玩家 accum 同基准）
    update(dt, racing, playerAccum) {
        const w = this.world;
        if (racing) {
            const f = (this.s / w.length) % 1;
            const i = Math.floor(f * CFG.SAMPLES) % CFG.SAMPLES;
            let target = w.aiV[i] * this.skill;
            // 橡皮筋
            const gap = playerAccum - this.accumDist();
            if (gap > 55) target *= 1 + 0.14 * DIFFS[Game.diff].rubber;
            else if (gap < -55) target *= 1 - 0.12 * DIFFS[Game.diff].rubber;
            // 车道漂移 + 弯道贴内
            this.laneTimer -= dt;
            if (this.laneTimer <= 0) {
                this.laneTimer = 2.5 + Math.random() * 4;
                this.laneT = clamp(this.laneT + (Math.random() - 0.5) * 4, -CFG.ROAD_HALF + 2.2, CFG.ROAD_HALF - 2.2);
            }
            const t1 = w.smp[i].t, t2 = w.smp[(i + 4) % CFG.SAMPLES].t;
            const turnSign = Math.sign(t1.x * t2.z - t1.z * t2.x); // >0 = 右弯
            const curv = w.smp[i].curv;
            const wantLane = clamp(
                this.laneT + (curv > 0.015 ? -turnSign * clamp(curv * 60, 0, 3) : 0),
                -CFG.ROAD_HALF + 2, CFG.ROAD_HALF - 2);
            this.lane = lerp(this.lane, wantLane, clamp(0.8 * dt, 0, 1));
            // 加减速
            if (this.v < target) this.v = Math.min(target, this.v + 11 * dt);
            else this.v = Math.max(target, this.v - 17 * dt);
            this.s += this.v * dt;
            if (!this.finished && this.accumDist() >= w.length * (CFG.LAPS + 1) - 0) this.finished = true;
        }
        // 位姿
        const sm = w.smpAt(this.s);
        this.pos.copy(sm.p).addScaledVector(sm.left, this.lane);
        this.pos.y = sm.y;
        this.mesh.position.copy(this.pos);
        this.mesh.rotation.y = Math.atan2(sm.t.x, sm.t.z);
        this.wheelSpin += this.v * dt / 0.44;
        for (const wl of this.wheels) wl.rotation.x = this.wheelSpin;
    }
}

/* ---------------- 9. 打滑痕迹 ---------------- */
class SkidMarks {
    constructor(scene) {
        const MAX = 160;
        this.scene = scene;
        this.max = MAX; this.cursor = 0; this.lastDrop = 0;
        const g = new THREE.PlaneGeometry(0.34, 1.1);
        g.rotateX(-Math.PI / 2);
        const m = new THREE.MeshBasicMaterial({ color: 0x101012, transparent: true, opacity: 0.34, depthWrite: false });
        this.mesh = new THREE.InstancedMesh(g, m, MAX);
        this.mesh.frustumCulled = false;
        const hide = new THREE.Matrix4().makeScale(0, 0, 0);
        for (let i = 0; i < MAX; i++) this.mesh.setMatrixAt(i, hide);
        scene.add(this.mesh);
    }
    drop(x, y, z, heading) {
        const m = new THREE.Matrix4().makeRotationY(heading);
        m.setPosition(x, y + 0.06, z);
        this.mesh.setMatrixAt(this.cursor, m);
        this.cursor = (this.cursor + 1) % this.max;
        this.mesh.instanceMatrix.needsUpdate = true;
    }
    clear() {
        const hide = new THREE.Matrix4().makeScale(0, 0, 0);
        for (let i = 0; i < this.max; i++) this.mesh.setMatrixAt(i, hide);
        this.mesh.instanceMatrix.needsUpdate = true;
    }
    dispose() {
        this.scene.remove(this.mesh);
        disposeObj(this.mesh);
    }
}

/* ---------------- 10. 游戏主控 ---------------- */
const Game = {
    state: 'LOADING', // LOADING MENU COUNTDOWN RACING PAUSED FINISHED
    diff: 1,
    seed: 0,
    lastT: 0, raceTime: 0, cdTime: 0,
    lapTimes: [], lapMark: 0, crossings: 0,
    wrongTimer: 0, playerStartS: 0,

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87b7e8);
        this.scene.fog = new THREE.Fog(0x9cc4ea, 170, 560);
        this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
        this.renderer.setSize(innerWidth, innerHeight);

        this.scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x557744, 0.85));
        const sun = new THREE.DirectionalLight(0xfff3d6, 0.95);
        sun.position.set(180, 300, 120);
        this.scene.add(sun);

        this.els = {
            hud: document.getElementById('hud'), menu: document.getElementById('menu'),
            results: document.getElementById('results'), pause: document.getElementById('pause'),
            loading: document.getElementById('loading'), countdown: document.getElementById('countdown'),
            wrong: document.getElementById('wrongway'), speedVal: document.getElementById('speedVal'),
            posVal: document.getElementById('posVal'), lapVal: document.getElementById('lapVal'),
            timeVal: document.getElementById('timeVal'), bestVal: document.getElementById('bestVal'),
            nitroFill: document.getElementById('nitroFill'), trackTag: document.getElementById('trackTag'),
            minimap: document.getElementById('minimap'), speedlines: document.getElementById('speedlines'),
            menuBest: document.getElementById('menuBest'), resultTitle: document.getElementById('resultTitle'),
            resultTable: document.getElementById('resultTable'), gearVal: document.getElementById('gearVal'),
        };
        this.mmCtx = this.els.minimap.getContext('2d');

        Input.init();
        this.bindUI();
        window.addEventListener('resize', () => {
            this.camera.aspect = innerWidth / innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(innerWidth, innerHeight);
        });

        this.seed = (Math.random() * 1e9) | 0;
        this.buildRace(this.seed);
        this.state = 'MENU';
        this.updateMenuBest();
        this.els.loading.classList.add('hidden');
        this.els.menu.classList.remove('hidden');
        requestAnimationFrame(t => this.loop(t));
    },

    bindUI() {
        document.querySelectorAll('.diff-btn').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('sel'));
                b.classList.add('sel');
                this.diff = +b.dataset.diff;
            };
        });
        document.getElementById('btn-start').onclick = () => { AudioSys.init(); AudioSys.resume(); this.startRace(); };
        document.getElementById('btn-again-new').onclick = () => {
            this.seed = (Math.random() * 1e9) | 0;
            this.buildRace(this.seed);
            this.startRace();
        };
        document.getElementById('btn-again-same').onclick = () => { this.buildRace(this.seed); this.startRace(); };
        document.getElementById('btn-menu').onclick = () => this.backToMenu();
        document.getElementById('btn-resume').onclick = () => this.togglePause(false);
        document.getElementById('btn-restart').onclick = () => { this.togglePause(false); this.buildRace(this.seed); this.startRace(); };
        document.getElementById('btn-quit').onclick = () => this.backToMenu();
        document.getElementById('muteBtn').onclick = () => {
            AudioSys.init();
            document.getElementById('muteBtn').textContent = AudioSys.toggleMute() ? '🔇' : '🔊';
        };
    },

    onKey(k) {
        if (k === 'escape') {
            if (this.state === 'RACING' || this.state === 'COUNTDOWN') this.togglePause(true);
            else if (this.state === 'PAUSED') this.togglePause(false);
        }
        if (k === 'm') document.getElementById('muteBtn').click();
        if (k === 'r' && this.state === 'RACING') this.resetPlayer();
    },

    buildRace(seed) {
        if (this.world) { this.world.dispose(); this.skids.dispose(); }
        if (this.playerGroup) { this.scene.remove(this.playerGroup); disposeObj(this.playerGroup); }
        if (this.aiGroups) this.aiGroups.forEach(g => { this.scene.remove(g); disposeObj(g); });

        this.world = new World(this.scene, seed);
        this.skids = new SkidMarks(this.scene);

        const L = this.world.length;
        this.playerStartS = L - 22;
        this.player = new Player(this.world, this.playerStartS, 2.6);
        this.playerGroup = this.player.mesh;
        this.scene.add(this.playerGroup);
        this.ais = []; this.aiGroups = [];
        const lanes = [-3.2, 3.2, -3.2];
        const skills = [1.0, 0.955, 0.91];
        for (let i = 0; i < 3; i++) {
            const ai = new AICar(this.world, L - 7 - i * 7.5, lanes[i], CFG.AI_COLORS[i], skills[i] * DIFFS[this.diff].aiSkill);
            this.ais.push(ai); this.aiGroups.push(ai.mesh); this.scene.add(ai.mesh);
        }
        this.placeCameraBehind();
        this.buildMinimapPath();
        this.els.trackTag.textContent = `赛道 #${seed} · ${Math.round(L)}m`;
    },

    startRace() {
        this.els.menu.classList.add('hidden');
        this.els.results.classList.add('hidden');
        this.els.hud.classList.remove('hidden');
        this.raceTime = 0; this.lapTimes = []; this.crossings = 0; this.lapMark = 0;
        this.wrongTimer = 0;
        this.cdTime = 3.6; this.cdShown = null;
        this.state = 'COUNTDOWN';
        this.skids.clear();
        this.els.bestVal.textContent = `最佳圈 ${fmtTime(this.bestLap())}`;
        AudioSys.silence();
    },

    backToMenu() {
        this.state = 'MENU';
        this.els.hud.classList.add('hidden');
        this.els.results.classList.add('hidden');
        this.els.pause.classList.add('hidden');
        this.els.countdown.classList.add('hidden');
        this.els.wrong.classList.add('hidden');
        this.els.menu.classList.remove('hidden');
        AudioSys.silence();
        this.updateMenuBest();
    },

    togglePause(on) {
        if (on && this.state !== 'PAUSED') {
            this.stateBefore = this.state; this.state = 'PAUSED';
            this.els.pause.classList.remove('hidden');
            AudioSys.silence();
        } else if (!on && this.state === 'PAUSED') {
            this.state = this.stateBefore || 'RACING';
            this.els.pause.classList.add('hidden');
        }
    },

    resetPlayer() {
        const w = this.world, p = this.player;
        const i = w.nearestIdx(p.pos.x, p.pos.z, p.idx);
        const sm = w.smp[i];
        p.pos.copy(sm.p); p.pos.y = sm.y;
        p.heading = p.velAngle = Math.atan2(sm.t.x, sm.t.z);
        p.speed = Math.max(6, p.speed * 0.2);
        AudioSys.beep(320, 0.12, 'sine', 0.15);
    },

    placeCameraBehind() {
        const p = this.player, f = p.forward();
        this.camera.position.set(p.pos.x - f.x * 9, p.pos.y + 3.8, p.pos.z - f.z * 9);
        this.camera.lookAt(p.pos.x + f.x * 8, p.pos.y + 1.4, p.pos.z + f.z * 8);
    },

    /* ---- 名次 / 计圈 / 结算 ---- */
    playerTotal() { return this.player.accum + this.playerStartS; } // 等价于当前弧长坐标（单调递增）
    ,
    rank() {
        let r = 1;
        for (const ai of this.ais) if (ai.accumDist() + ai.startS > this.playerTotal()) r++;
        return r;
    },
    checkLap() {
        const L = this.world.length;
        const next = 22 + this.crossings * L;
        if (this.player.accum < next) return;
        this.crossings++;
        if (this.crossings === 1) {
            this.lapMark = this.raceTime; // 冲过起跑线，第 1 圈正式开始
        } else {
            this.lapTimes.push(this.raceTime - this.lapMark);
            this.lapMark = this.raceTime;
            if (this.lapTimes.length >= CFG.LAPS) { this.finishRace(); return; }
            AudioSys.beep(880, 0.18, 'triangle', 0.22);
            const lap = this.lapTimes[this.lapTimes.length - 1];
            const best = this.bestLap();
            if (!best || lap < best) {
                localStorage.setItem('turbo3d_bestLap', String(lap));
                this.els.bestVal.textContent = `最佳圈 ${fmtTime(lap)} ★新纪录`;
            }
        }
    },
    bestLap() { const v = parseFloat(localStorage.getItem('turbo3d_bestLap')); return isFinite(v) ? v : null; },
    bestTotal() { const v = parseFloat(localStorage.getItem('turbo3d_bestTotal')); return isFinite(v) ? v : null; },
    updateMenuBest() {
        this.els.menuBest.innerHTML =
            `历史最佳圈速：<b>${fmtTime(this.bestLap())}</b> ｜ 最佳总成绩：<b>${fmtTime(this.bestTotal())}</b>`;
    },
    finishRace() {
        this.state = 'FINISHED';
        const rank = this.rank(), total = this.raceTime;
        AudioSys.fanfare();
        let newRec = false;
        const bt = this.bestTotal();
        if (!bt || total < bt) { localStorage.setItem('turbo3d_bestTotal', String(total)); newRec = true; }
        this.updateMenuBest();
        const bestLapThis = Math.min(...this.lapTimes);
        const medal = ['🏆', '🥈', '🥉', '🎖'][rank - 1] || '';
        this.els.resultTitle.textContent = `${medal} 第 ${rank} 名`;
        this.els.resultTitle.className = 'result-title ' + (rank === 1 ? 'gold' : 'blue');
        let rows = `<div class="row"><span>总成绩 Total</span><b>${fmtTime(total)}${newRec ? ' <span class="new-record">★新纪录</span>' : ''}</b></div>`;
        this.lapTimes.forEach((t, i) => {
            rows += `<div class="row"><span>第 ${i + 1} 圈 Lap ${i + 1}</span><b>${fmtTime(t)}${Math.abs(t - bestLapThis) < 1e-9 ? ' 🔥' : ''}</b></div>`;
        });
        rows += `<div class="row"><span>历史最佳圈 Best Lap</span><b>${fmtTime(this.bestLap())}</b></div>`;
        rows += `<div class="row"><span>赛道 Track</span><b>#${this.seed} · ${Math.round(this.world.length)}m</b></div>`;
        this.els.resultTable.innerHTML = rows;
        this.player.autopilot = { throttle: 0.5, brake: 0, steer: 0 }; // 结束后自动巡航
        setTimeout(() => { if (this.state === 'FINISHED') this.els.results.classList.remove('hidden'); }, 1400);
    },

    /* ---- 小地图 ---- */
    buildMinimapPath() {
        const pts = this.world.smp.map(s => [s.p.x, s.p.z]);
        let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
        for (const [x, z] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
        const W = 300, pad = 26;
        const sc = Math.min((W - pad * 2) / (maxX - minX), (W - pad * 2) / (maxZ - minZ));
        const ox = pad + (W - pad * 2 - (maxX - minX) * sc) / 2, oz = pad + (W - pad * 2 - (maxZ - minZ) * sc) / 2;
        this.mm = {
            pts: pts.map(([x, z]) => [ox + (x - minX) * sc, oz + (z - minZ) * sc]),
            map: (x, z) => [ox + (x - minX) * sc, oz + (z - minZ) * sc],
        };
    },
    drawMinimap() {
        const g = this.mmCtx, W = 300;
        g.clearRect(0, 0, W, W);
        g.lineJoin = 'round';
        for (const [stroke, width] of [['rgba(255,255,255,0.85)', 9], ['#1c2733', 5]]) {
            g.strokeStyle = stroke; g.lineWidth = width;
            g.beginPath();
            this.mm.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
            g.closePath(); g.stroke();
        }
        const [sx, sy] = this.mm.pts[0];
        g.fillStyle = '#ffd166'; g.fillRect(sx - 4, sy - 4, 8, 8);
        const aiColors = ['#4361ee', '#f4a261', '#2a9d8f'];
        this.ais.forEach((ai, i) => {
            const [x, y] = this.mm.map(ai.pos.x, ai.pos.z);
            g.fillStyle = aiColors[i];
            g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
        });
        const [px, py] = this.mm.map(this.player.pos.x, this.player.pos.z);
        g.fillStyle = '#ff5a5f';
        g.beginPath(); g.arc(px, py, 6.5, 0, TAU); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    },

    /* ---- 主循环 ---- */
    loop(t) {
        requestAnimationFrame(tt => this.loop(tt));
        const dt = Math.min((t - this.lastT) / 1000 || 0.016, 0.05);
        this.lastT = t;
        if (this.state === 'LOADING') return;
        if (this.state !== 'PAUSED') this.frame(dt);
        this.renderer.render(this.scene, this.camera);
    },

    frame(dt) {
        const p = this.player, w = this.world;

        // 倒计时
        if (this.state === 'COUNTDOWN') {
            this.cdTime -= dt;
            const n = Math.ceil(this.cdTime - 0.6);
            const label = n > 0 ? String(n) : 'GO!';
            if (this.cdShown !== label) {
                this.cdShown = label;
                this.els.countdown.classList.remove('hidden');
                this.els.countdown.innerHTML = `<div>${label}</div>`;
                AudioSys.beep(n > 0 ? 440 : 880, n > 0 ? 0.18 : 0.4, 'square', n > 0 ? 0.18 : 0.24);
            }
            if (this.cdTime <= 0) { this.els.countdown.classList.add('hidden'); this.state = 'RACING'; }
        }
        const racing = this.state === 'RACING';
        const controlsLive = racing || (this.state === 'COUNTDOWN' && this.cdTime <= 0.6);

        // 结束后自动巡航
        if (this.state === 'FINISHED' && p.autopilot) {
            const near = w.smp[w.nearestIdx(p.pos.x, p.pos.z, p.idx)];
            const err = wrapAngle(Math.atan2(near.t.x, near.t.z) - p.heading);
            p.autopilot.steer = clamp(-err * 1.6, -1, 1); // 上一行约定：steer+1=右转=heading增大
            p.autopilot.throttle = p.speed < 17 ? 1 : 0;
        }

        // 玩家
        const info = p.update(dt, controlsLive);

        // 与 AI 软碰撞
        if (this.state !== 'MENU') {
            for (const ai of this.ais) {
                const dx = p.pos.x - ai.pos.x, dz = p.pos.z - ai.pos.z;
                const d = Math.hypot(dx, dz);
                if (d < 2.9 && d > 0.01) {
                    const push = (2.9 - d) * 0.55;
                    p.pos.x += dx / d * push; p.pos.z += dz / d * push;
                    p.speed *= 0.94;
                    ai.v *= 0.97;
                    ai.laneT = clamp(ai.laneT + (Math.random() < 0.5 ? -2 : 2), -CFG.ROAD_HALF + 2.2, CFG.ROAD_HALF - 2.2);
                }
            }
        }

        // AI
        for (const ai of this.ais) ai.update(dt, racing || this.state === 'FINISHED', p.accum);

        // 计圈 / 计时 / 逆行
        if (racing) {
            this.raceTime += dt;
            this.checkLap();
            const near = w.smp[p.idx];
            const vdot = Math.sin(p.velAngle) * near.t.x + Math.cos(p.velAngle) * near.t.z;
            if (vdot < -0.4 && p.speed > 4) this.wrongTimer += dt; else this.wrongTimer = 0;
            this.els.wrong.classList.toggle('hidden', this.wrongTimer < 1.2);
        }

        // 打滑痕迹
        if (info.drifting && racing) {
            const now = performance.now();
            if (now - this.skids.lastDrop > 36) {
                this.skids.lastDrop = now;
                const f = p.forward(), lf = new THREE.Vector3(f.z, 0, -f.x);
                const gy = w.groundY(p.pos.x, p.pos.z, p.idx);
                this.skids.drop(p.pos.x - f.x * 1.5 + lf.x * 1.0, gy, p.pos.z - f.z * 1.5 + lf.z * 1.0, p.heading);
                this.skids.drop(p.pos.x - f.x * 1.5 - lf.x * 1.0, gy, p.pos.z - f.z * 1.5 - lf.z * 1.0, p.heading);
            }
        }

        // 相机
        const f = p.forward();
        const dist = 8.2 + clamp(Math.abs(p.speed) * 0.055, 0, 2.6);
        const shake = info.onRoad ? 0 : Math.min(Math.abs(p.speed) * 0.012, 0.5);
        const k = 1 - Math.exp(-5.5 * dt);
        this.camera.position.x = lerp(this.camera.position.x, p.pos.x - f.x * dist + (Math.random() - 0.5) * shake, k);
        this.camera.position.y = lerp(this.camera.position.y, p.pos.y + 3.4 + (Math.random() - 0.5) * shake * 0.5, k);
        this.camera.position.z = lerp(this.camera.position.z, p.pos.z - f.z * dist + (Math.random() - 0.5) * shake, k);
        this.camera.lookAt(p.pos.x + f.x * 7, p.pos.y + 1.5, p.pos.z + f.z * 7);
        const fovT = 60 + clamp(Math.abs(p.speed) / CFG.VMAX_NITRO, 0, 1.1) * 16 + (p.nitroOn ? 6 : 0);
        this.camera.fov = lerp(this.camera.fov, fovT, clamp(2.5 * dt, 0, 1));
        this.camera.updateProjectionMatrix();

        w.updateClouds(dt);

        // HUD
        if (this.state !== 'MENU') {
            const kmh = Math.abs(p.speed) * 3.6;
            this.els.speedVal.innerHTML = `${Math.round(kmh)}<small> km/h</small>`;
            const gear = p.speed < -0.5 ? 'R' : (p.speed < 0.5 ? 'N' : String(Math.min(6, 1 + Math.floor(p.speed / 8.5))));
            this.els.gearVal.textContent = 'GEAR ' + gear + (p.nitroOn ? '  🔥BOOST' : '');
            this.els.nitroFill.style.width = `${p.nitro}%`;
            this.els.posVal.innerHTML = `${this.rank()}<small>/4</small>`;
            const lapNo = Math.min(CFG.LAPS, this.crossings === 0 ? 1 : this.crossings);
            this.els.lapVal.textContent = `第 ${lapNo}/${CFG.LAPS} 圈 · LAP`;
            this.els.timeVal.textContent = fmtTime(this.raceTime);
            this.els.speedlines.style.opacity = p.nitroOn ? 0.85 : 0;
            this.drawMinimap();
        }

        // 音频
        if (this.state === 'RACING' || this.state === 'COUNTDOWN') {
            AudioSys.setEngine(Math.abs(p.speed), controlsLive ? Input.throttle : 0, p.nitroOn);
            AudioSys.setSkid(info.drifting ? 1 : 0);
        } else if (this.state === 'FINISHED') {
            AudioSys.setEngine(Math.abs(p.speed), 0.3, false);
            AudioSys.setSkid(0);
        }
    },
};

window.addEventListener('DOMContentLoaded', () => {
    Game.init();
    window.__game = Game; // 调试 / 测试句柄
});
