/* ============================================================
 * 3D 台球 · 八球 (8-Ball Pool)  v1.0.0
 * 物理在 2D 平面 (x, z) 上模拟，Three.js 负责 3D 呈现
 * ============================================================ */
'use strict';
(function () {

// ---------------- 配置 ----------------
const CFG = {
    W: 2.54, H: 1.27,            // 台面内沿（米）
    R: 0.028575,                  // 球半径
    cornerGap: 0.115,             // 角袋处库边留空（WPA 角袋 mouth 4.5"-4.625" ≈ 11.5cm）
    sideGap: 0.063,               // 中袋处库边留空（WPA 中袋 mouth 5"-5.125" ≈ 12.7cm，2×sideGap）
    cornerCapture: 0.108,         // 角袋捕获半径
    sideCapture: 0.088,           // 中袋捕获半径
    friction: 0.62,               // 滚动摩擦减速度 m/s^2
    stopV: 0.035,                 // 停球阈值
    ballRest: 0.95,               // 球-球恢复系数
    cushRest: 0.72,               // 库边恢复系数
    minPower: 1.2, maxPower: 8.0, // 出杆速度范围
    dt: 1 / 240,                  // 物理步长
    chargeTime: 1.35,             // 蓄力到满时长
};

const BALL_COLORS = {
    1: '#f5b70a', 2: '#0f4db0', 3: '#d31820', 4: '#5b2a8e', 5: '#e8700f',
    6: '#12703c', 7: '#7a2318', 8: '#1b1b1b',
    9: '#f5b70a', 10: '#0f4db0', 11: '#d31820', 12: '#5b2a8e', 13: '#e8700f',
    14: '#12703c', 15: '#7a2318',
};

const POCKETS = [];
(function () {
    const L = CFG.W / 2, T = CFG.H / 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
        POCKETS.push({ x: sx * (L + 0.015), z: sz * (T + 0.015), r: CFG.cornerCapture, corner: true });
    for (const sz of [-1, 1])
        POCKETS.push({ x: 0, z: sz * (T + 0.012), r: CFG.sideCapture, corner: false });
})();

// ---------------- 全局状态 ----------------
let balls = [];          // 所有球（0 = 母球）
let state = 'menu';      // menu | aim | charge | shooting | ballinhand | over
let players = [];
let current = 0;
let vsAI = true, aiLevel = 1;
let openTable = true, isBreak = true;
let shot = null;         // 本杆事件记录
let aimDir = { x: 1, z: 0 };
let power = 0, chargeStart = 0;
let spin = { x: 0, y: 0 };
let shotDirStore = { x: 1, z: 0 };
let camMode = 0;         // 0 三维 1 俯视 2 母球后
let viewToggleTime = 0;

function cueBall() { return balls[0]; }
function $(id) { return document.getElementById(id); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ---------------- 音效（WebAudio 合成，无素材） ----------------
const SFX = (() => {
    let ctx = null;
    function ensure() {
        if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
        if (ctx && ctx.state === 'suspended') ctx.resume();
        return ctx;
    }
    function env(g, t0, peak, dur) {
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }
    function tone(freq, freq2, dur, vol, type) {
        const c = ensure(); if (!c) return;
        const t0 = c.currentTime;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type || 'triangle';
        o.frequency.setValueAtTime(freq, t0);
        o.frequency.exponentialRampToValueAtTime(Math.max(freq2, 30), t0 + dur);
        env(g, t0, vol, dur);
        o.connect(g).connect(c.destination);
        o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function noise(dur, vol, lowpass) {
        const c = ensure(); if (!c) return;
        const t0 = c.currentTime;
        const len = Math.max(1, Math.floor(c.sampleRate * dur));
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = c.createBufferSource(); src.buffer = buf;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass;
        const g = c.createGain(); env(g, t0, vol, dur);
        src.connect(f).connect(g).connect(c.destination);
        src.start(t0);
    }
    return {
        unlock() { ensure(); },
        ballHit(v) { const vol = clamp(v / 5, 0.04, 0.85); noise(0.045, vol, 9000); tone(2400, 900, 0.03, vol * 0.5); },
        cushion(v) { const vol = clamp(v / 6, 0.03, 0.5); tone(190, 110, 0.09, vol, 'sine'); noise(0.05, vol * 0.5, 1200); },
        pocket() { noise(0.16, 0.35, 2500); tone(420, 90, 0.22, 0.28, 'sine'); },
        cueHit(v) { const vol = clamp(v / 8, 0.05, 0.7); noise(0.05, vol, 6000); tone(1500, 500, 0.04, vol * 0.6); },
    };
})();

// ---------------- Three.js 场景 ----------------
let renderer, scene, camera, raycaster, pointerNDC;
let cueGroup, cueMesh, guideGroup;
let ghostCue;            // 自由球放置虚影
let camPos = null, camLook = null;

function initThree() {
    const holder = $('canvas-holder');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    holder.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d12);
    scene.fog = new THREE.Fog(0x0a0d12, 6, 14);

    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 40);
    camPos = new THREE.Vector3(0, 1.62, 2.12);
    camLook = new THREE.Vector3(0, -0.05, 0);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(1.6, 3.4, 1.2);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -2; dir.shadow.camera.right = 2;
    dir.shadow.camera.top = 2; dir.shadow.camera.bottom = -2;
    dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 10;
    dir.shadow.bias = -0.0004;
    scene.add(dir);

    const warm = new THREE.PointLight(0xffe9c4, 0.35, 8);
    warm.position.set(0, 2.3, 0);
    scene.add(warm);

    // 地面（衬托）
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(7, 48),
        new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.72;
    floor.receiveShadow = true;
    scene.add(floor);

    raycaster = new THREE.Raycaster();
    pointerNDC = new THREE.Vector2();

    buildTable();
    buildGuide();
    buildCue();

    ghostCue = new THREE.Mesh(
        new THREE.SphereGeometry(CFG.R, 24, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })
    );
    ghostCue.visible = false;
    scene.add(ghostCue);

    window.addEventListener('resize', onResize);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---------------- 台球桌 ----------------
function buildTable() {
    const W = CFG.W, H = CFG.H, L = W / 2, T = H / 2;

    // 台呢（带噪点 + 开球线 + 置球点）
    const feltCanvas = document.createElement('canvas');
    feltCanvas.width = 1024; feltCanvas.height = 512;
    const g = feltCanvas.getContext('2d');
    g.fillStyle = '#2a6e46'; g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 9000; i++) {
        g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
        g.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
    }
    const px = x => 512 + x / L * 512;   // x∈[-L,L] → [0,1024]
    const pz = z => 256 + z / T * 256;
    g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(px(-W / 4), 0); g.lineTo(px(-W / 4), 512); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath(); g.arc(px(W / 4), pz(0), 5, 0, 7); g.fill();
    const feltTex = new THREE.CanvasTexture(feltCanvas);
    if (THREE.sRGBEncoding !== undefined) feltTex.encoding = THREE.sRGBEncoding;

    const felt = new THREE.Mesh(
        new THREE.BoxGeometry(W, 0.02, H),
        new THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.95 })
    );
    felt.position.y = -0.01;
    felt.receiveShadow = true;
    scene.add(felt);

    // 库边
    const cushMat = new THREE.MeshStandardMaterial({ color: 0x1f5b39, roughness: 0.9 });
    const ch = 0.045, ct = 0.055;
    function cushBox(x1, x2, z1, z2) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x2 - x1), ch, Math.abs(z2 - z1)), cushMat);
        m.position.set((x1 + x2) / 2, ch / 2, (z1 + z2) / 2);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
    }
    // 长边（z = ±T）：留角袋与中袋口，cushion 主体顶面边缘刚好在桌面边缘 z = sz*T
    for (const sz of [-1, 1]) {
        cushBox(-L + CFG.cornerGap, -CFG.sideGap, sz * T, sz * T);
        cushBox(CFG.sideGap, L - CFG.cornerGap, sz * T, sz * T);
    }
    // 短边（x = ±L）：留角袋口，cushion 主体顶面边缘刚好在桌面边缘 x = sx*L
    for (const sx of [-1, 1]) {
        cushBox(sx * (L - ct), sx * L, -T + CFG.cornerGap, T - CFG.cornerGap);
    }

    // 袋口斜面端帽（WPA 标准）：角袋 cushion 端面外夹角 142° → 每边向桌外张 26°，
    // 中袋外夹角 103° → 每边向桌内收 38.5°。
    // 几何：cushion 端面顶端相对底端水平偏移 = tan(26°/38.5°) × ch
    // 视觉增强：把 dx/sIn 整体放大 1.6×，让斜面张开效果在远景也更明显
    // （实际 dx≈0.035m, sIn≈0.060m；仍小于 ct=0.055/railW=0.13，不破坏 pocket capture）
    const deg = Math.PI / 180;
    const cornerTilt = 26 * deg;
    const sideTilt = 38.5 * deg;
    const tiltScale = 1.6;
    const dx = Math.tan(cornerTilt) * ch * tiltScale;
    const sIn = Math.tan(sideTilt) * ch * tiltScale;

    function slopeQuad(p1, p2, p3, p4) {
        const g = new THREE.BufferGeometry();
        const v = new Float32Array([
            p1[0], p1[1], p1[2],
            p2[0], p2[1], p2[2],
            p3[0], p3[1], p3[2],
            p4[0], p4[1], p4[2],
        ]);
        g.setAttribute('position', new THREE.BufferAttribute(v, 3));
        // 双面渲染：6 个索引（正反 2 套三角形）
        g.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]);
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, cushMat);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
    }

    // 角袋：4 个角各加 2 块斜板（短边 cushion 端面 + 长边 cushion 端面）
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        // 端面 A：短边 cushion（x = sx*L），端面朝桌外（sx 方向）倾斜 19°
        const Ax = sx * L;
        slopeQuad(
            [Ax,           0, sz * T - CFG.cornerGap],   // 内底（z 远离袋口）
            [Ax,           0, sz * T],                   // 外底（z 靠近袋口）
            [Ax + sx * dx, ch, sz * T],                  // 外顶（向外偏）
            [Ax + sx * dx, ch, sz * T - CFG.cornerGap]   // 内顶
        );
        // 端面 B：长边 cushion（z = sz*T），端面朝桌外（sz 方向）倾斜 19°
        const Bz = sz * T;
        slopeQuad(
            [sx * L - CFG.cornerGap, 0, Bz],              // 内底（x 远离袋口）
            [sx * L,                0, Bz],              // 外底（x 靠近袋口）
            [sx * L,                ch, Bz + sz * dx],   // 外顶（向外偏）
            [sx * L - CFG.cornerGap, ch, Bz + sz * dx]   // 内顶
        );
    }

    // 中袋：2 个长边中点各加 2 块斜板（两侧 cushion 端面向袋口中央倾斜 38.5°）
    for (const sz of [-1, 1]) {
        const Bz = sz * T;
        // 左斜板（x = -sideGap 末端，顶端比底端更靠 +x = 袋口中央）
        slopeQuad(
            [-CFG.sideGap + sIn, ch, Bz - CFG.sideGap],   // 左顶
            [-CFG.sideGap + sIn, ch, Bz + CFG.sideGap],   // 右顶
            [-CFG.sideGap,         0, Bz + CFG.sideGap],  // 右底
            [-CFG.sideGap,         0, Bz - CFG.sideGap]   // 左底
        );
        // 右斜板（x = +sideGap 末端，顶端比底端更靠 -x = 袋口中央）
        slopeQuad(
            [CFG.sideGap - sIn, ch, Bz - CFG.sideGap],    // 右顶
            [CFG.sideGap - sIn, ch, Bz + CFG.sideGap],    // 左顶
            [CFG.sideGap,         0, Bz + CFG.sideGap],   // 左底
            [CFG.sideGap,         0, Bz - CFG.sideGap]    // 右底
        );
    }

    // 木边
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4127, roughness: 0.55, metalness: 0.05 });
    const railW = 0.13, railH = 0.078, outerW = W + 2 * ct + 2 * railW, outerH = H + 2 * ct + 2 * railW;
    function woodBox(w, d, x, z) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, railH, d), woodMat);
        m.position.set(x, railH / 2, z);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
    }
    woodBox(outerW, railW, 0, -(H / 2 + ct + railW / 2));
    woodBox(outerW, railW, 0, (H / 2 + ct + railW / 2));
    woodBox(railW, outerH, -(W / 2 + ct + railW / 2), 0);
    woodBox(railW, outerH, (W / 2 + ct + railW / 2), 0);

    // 袋口"凹陷"视觉：圆盘半径贴合 mouth（WPA 11.5cm/12.7cm），圆心略向外沉一点，
    // 视觉上像口袋内壁往桌外微凹。
    const pocketTex = makePocketTexture();
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.75, metalness: 0.0 });
    for (const p of POCKETS) {
        const r = p.corner ? 0.052 : 0.052;
        const poc = new THREE.Mesh(
            new THREE.CircleGeometry(r, 32),
            new THREE.MeshBasicMaterial({ map: pocketTex })
        );
        poc.rotation.x = -Math.PI / 2;
        poc.position.set(p.x * 0.978, 0.0018, p.z * 0.978);
        scene.add(poc);
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(r * 0.96, p.corner ? 0.0040 : 0.0035, 8, 28),
            rimMat
        );
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(p.x * 0.985, 0.003, p.z * 0.985);
        scene.add(rim);
    }

    // 库边镶嵌圆点（钻石点）
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xf3ead3 });
    function dot(x, z) {
        const d = new THREE.Mesh(new THREE.CircleGeometry(0.009, 12), dotMat);
        d.rotation.x = -Math.PI / 2;
        d.position.set(x, railH + 0.001, z);
        scene.add(d);
    }
    const Lh = W / 2 + ct + railW / 2, Th = H / 2 + ct + railW / 2;
    for (let k = 1; k <= 7; k += 2) {
        const x = -W / 2 + k * (W / 8);
        dot(x, Th); dot(x, -Th);
    }
    for (let k = 1; k <= 3; k += 2) {
        const z = -H / 2 + k * (H / 4);
        dot(Lh, z); dot(-Lh, z);
    }

    // 桌腿（四角下方，远景氛围）
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 0.7 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.68, 12), legMat);
        leg.position.set(sx * (W / 2 - 0.08), -0.38, sz * (H / 2 - 0.08));
        scene.add(leg);
    }
}

// ---------------- 球 ----------------
function ballType(num) {
    if (num === 0) return 'cue';
    if (num === 8) return 'eight';
    return num < 8 ? 'solid' : 'stripe';
}

function makeBallTexture(num) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    const type = ballType(num);
    const col = BALL_COLORS[num];
    if (type === 'stripe') {
        g.fillStyle = '#f4f0e4'; g.fillRect(0, 0, 256, 128);
        g.fillStyle = col; g.fillRect(0, 128 * 0.28, 256, 128 * 0.44);
    } else {
        g.fillStyle = type === 'cue' ? '#f8f4e9' : col;
        g.fillRect(0, 0, 256, 128);
    }
    if (num > 0) {
        for (const cx of [64, 192]) {
            g.fillStyle = '#f4f0e4';
            g.beginPath(); g.arc(cx, 64, 18, 0, 7); g.fill();
            g.fillStyle = '#141414';
            g.font = 'bold 21px Arial';
            g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(String(num), cx, 66);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    return tex;
}

// 袋口径向渐变：中心黑 → 深绿 → 草地绿（平滑凹陷感），加细微噪点配台呢
function makePocketTexture() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    grad.addColorStop(0.00, '#020403');
    grad.addColorStop(0.28, '#0a1f14');
    grad.addColorStop(0.55, '#163a26');
    grad.addColorStop(0.82, '#256645');
    grad.addColorStop(1.00, '#2a6e46');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 1400; i++) {
        g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
        g.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    return tex;
}

function createBall(num, x, z) {
    const mat = new THREE.MeshStandardMaterial({
        map: makeBallTexture(num),
        roughness: 0.12, metalness: 0.04,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(CFG.R, 32, 24), mat);
    mesh.castShadow = true;
    mesh.position.set(x, CFG.R, z);
    scene.add(mesh);
    return {
        num, type: ballType(num), x, z, vx: 0, vz: 0,
        potted: false, fall: -1, pocket: null,
        vertSpin: 0, sideSpin: 0, mesh,
        px: x, pz: z,
    };
}

function rackBalls() {
    // 清理旧球
    for (const b of balls) scene.remove(b.mesh);
    balls = [];

    balls.push(createBall(0, -CFG.W / 4, 0));   // 母球在开球点

    const R = CFG.R, dx = R * 2 * 0.872, dz = R * 2 + 0.0004;
    const footX = CFG.W / 4;
    const slots = [];
    for (let row = 0; row < 5; row++) {
        for (let j = 0; j <= row; j++) {
            slots.push({ row, j, x: footX + row * dx, z: (j - row / 2) * dz });
        }
    }
    const solids = [1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
    const stripes = [9, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - 0.5);

    const special = {
        '2,1': 8,        // 黑 8 在第三排中间
        '4,0': solids.pop(),   // 后排角落：全色
        '4,4': stripes.pop(),  // 后排另一角：花色
    };
    let si = 0, ti = 0;
    for (const s of slots) {
        const key = s.row + ',' + s.j;
        let num;
        if (special[key] !== undefined) num = special[key];
        else if (si < solids.length) num = solids[si++];
        else num = stripes[ti++];
        balls.push(createBall(num, s.x, s.z));
    }
}

// ---------------- 瞄准辅助线 ----------------
function buildGuide() {
    guideGroup = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
    const matObj = new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9 });
    const matDef = new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.5 });

    function makeLine(m) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        const l = new THREE.Line(geo, m);
        guideGroup.add(l);
        return l;
    }
    guideGroup.userData.aimLine = makeLine(mat);
    guideGroup.userData.objLine = makeLine(matObj);
    guideGroup.userData.defLine = makeLine(matDef);

    // 母球虚影圈
    const pts = [];
    for (let i = 0; i <= 32; i++) {
        const a = i / 32 * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * CFG.R, 0, Math.sin(a) * CFG.R));
    }
    const ghostGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const ghost = new THREE.LineLoop(ghostGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    guideGroup.add(ghost);
    guideGroup.userData.ghost = ghost;

    guideGroup.visible = false;
    scene.add(guideGroup);
}

function setLine(line, x1, z1, x2, z2, y) {
    const p = line.geometry.attributes.position;
    p.setXYZ(0, x1, y, z1);
    p.setXYZ(1, x2, y, z2);
    p.needsUpdate = true;
}

function updateGuide() {
    const ud = guideGroup.userData;
    if ((state !== 'aim' && state !== 'charge') || cueBall().potted) {
        guideGroup.visible = false;
        return;
    }
    guideGroup.visible = true;
    const cue = cueBall();
    const d = aimDir;
    const y = CFG.R;

    // 最近的球命中
    let tBall = Infinity, hitBall = null;
    for (const b of balls) {
        if (b === cue || b.potted) continue;
        const ex = b.x - cue.x, ez = b.z - cue.z;
        const proj = ex * d.x + ez * d.z;
        if (proj <= 0) continue;
        const perp2 = ex * ex + ez * ez - proj * proj;
        const rr = (2 * CFG.R) * (2 * CFG.R);
        if (perp2 > rr) continue;
        const t = proj - Math.sqrt(rr - perp2);
        if (t > 0 && t < tBall) { tBall = t; hitBall = b; }
    }

    // 最近的库边（袋口处视为通行）
    let tWall = Infinity;
    const L = CFG.W / 2 - CFG.R, T = CFG.H / 2 - CFG.R;
    function tryWall(t, hitX, hitZ) {
        if (t > 0.001 && t < tWall) {
            const ax = Math.abs(hitX), az = Math.abs(hitZ);
            const nearCornerX = ax > CFG.W / 2 - CFG.cornerGap;
            const nearSideX = ax < CFG.sideGap;
            const nearCornerZ = az > CFG.H / 2 - CFG.cornerGap;
            // 判断该命中点是否在袋口区
            let gap = false;
            if (Math.abs(hitZ) > T - 1e-6) gap = nearCornerX || nearSideX;      // 长边墙
            if (Math.abs(hitX) > L - 1e-6) gap = gap || nearCornerZ;           // 短边墙
            if (!gap) tWall = t;
        }
    }
    if (d.x > 1e-9) tryWall((L - cue.x) / d.x, L, cue.z + (L - cue.x) / d.x * d.z);
    if (d.x < -1e-9) tryWall((-L - cue.x) / d.x, -L, cue.z + (-L - cue.x) / d.x * d.z);
    if (d.z > 1e-9) tryWall((T - cue.z) / d.z, cue.x + (T - cue.z) / d.z * d.x, T);
    if (d.z < -1e-9) tryWall((-T - cue.z) / d.z, cue.x + (-T - cue.z) / d.z * d.x, -T);
    if (!isFinite(tWall)) tWall = 3;

    if (hitBall && tBall < tWall) {
        const gx = cue.x + d.x * tBall, gz = cue.z + d.z * tBall;
        setLine(ud.aimLine, cue.x + d.x * CFG.R, cue.z + d.z * CFG.R, gx, gz, y);
        ud.ghost.position.set(gx, y, gz);
        ud.ghost.visible = true;
        // 目标球预测方向
        let nx = hitBall.x - gx, nz = hitBall.z - gz;
        const nl = Math.hypot(nx, nz) || 1;
        nx /= nl; nz /= nl;
        setLine(ud.objLine, hitBall.x, hitBall.z, hitBall.x + nx * 0.3, hitBall.z + nz * 0.3, y);
        ud.objLine.visible = true;
        // 母球分离方向（切线）
        const dot = d.x * nx + d.z * nz;
        let tx = d.x - dot * nx, tz = d.z - dot * nz;
        const tl = Math.hypot(tx, tz);
        if (tl > 0.15) {
            tx /= tl; tz /= tl;
            setLine(ud.defLine, gx, gz, gx + tx * 0.16, gz + tz * 0.16, y);
            ud.defLine.visible = true;
        } else ud.defLine.visible = false;
    } else {
        const wx = cue.x + d.x * tWall, wz = cue.z + d.z * tWall;
        setLine(ud.aimLine, cue.x + d.x * CFG.R, cue.z + d.z * CFG.R, wx, wz, y);
        ud.ghost.visible = false;
        ud.objLine.visible = false;
        ud.defLine.visible = false;
    }
}

// ---------------- 球杆 ----------------
function buildCue() {
    cueGroup = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0xb5885a, roughness: 0.35 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x3d6bd6, roughness: 0.5 });
    const buttMat = new THREE.MeshStandardMaterial({ color: 0x2b2018, roughness: 0.4 });

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.012, 1.1, 14), wood);
    const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.0145, 0.38, 14), buttMat);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0065, 0.02, 10), tipMat);

    for (const m of [shaft, butt, tip]) {
        m.rotation.z = -Math.PI / 2;   // 轴向 → x
        m.castShadow = true;
    }
    shaft.position.x = -0.58;
    butt.position.x = -1.33;
    tip.position.x = -0.02;
    cueGroup.add(shaft, butt, tip);
    cueGroup.visible = false;
    scene.add(cueGroup);

    cueMesh = { group: cueGroup, pull: 0 };
}

function updateCueVisual(now) {
    const show = (state === 'aim' || state === 'charge') && !cueBall().potted;
    cueGroup.visible = show;
    if (!show) return;
    const cue = cueBall();
    const d = aimDir;
    let pull = 0.04 + 0.26 * power;
    if (strikeAnim > 0) pull *= strikeAnim;
    cueGroup.position.set(cue.x - d.x * (CFG.R + pull), CFG.R + 0.012, cue.z - d.z * (CFG.R + pull));
    cueGroup.rotation.y = -Math.atan2(d.z, d.x);
    cueGroup.rotation.z = 0.055; // 尾部微抬
}

let strikeAnim = 1;

// ---------------- 物理 ----------------
function activeBalls() { return balls.filter(b => !b.potted); }

function physStep(dt) {
    const W = CFG.W, H = CFG.H, R = CFG.R;
    let anyMoving = false;

    for (const b of balls) {
        if (b.potted) continue;
        let sp = Math.hypot(b.vx, b.vz);
        if (sp > 0) {
            const ns = sp - CFG.friction * dt;
            if (ns <= CFG.stopV) { b.vx = 0; b.vz = 0; }
            else { const k = ns / sp; b.vx *= k; b.vz *= k; sp = ns; }
            b.x += b.vx * dt;
            b.z += b.vz * dt;
            if (b.vx !== 0 || b.vz !== 0) anyMoving = true;
        }
        b.vertSpin *= Math.max(0, 1 - 0.4 * dt);
        b.sideSpin *= Math.max(0, 1 - 0.5 * dt);
    }

    // 球-球碰撞
    const act = activeBalls();
    for (let i = 0; i < act.length; i++) {
        for (let j = i + 1; j < act.length; j++) {
            const a = act[i], b = act[j];
            let dx = b.x - a.x, dz = b.z - a.z;
            let dist = Math.hypot(dx, dz);
            const minD = 2 * R;
            if (dist >= minD || dist === 0) continue;
            // 分离重叠
            const push = (minD - dist) / 2;
            const ux = dx / dist, uz = dz / dist;
            a.x -= ux * push; a.z -= uz * push;
            b.x += ux * push; b.z += uz * push;

            const va = a.vx * ux + a.vz * uz;
            const vb = b.vx * ux + b.vz * uz;
            const dvn = va - vb;
            if (dvn <= 0) continue;   // 分离中
            const imp = (1 + CFG.ballRest) / 2 * dvn;
            a.vx -= ux * imp; a.vz -= uz * imp;
            b.vx += ux * imp; b.vz += uz * imp;

            // 首次接触记录 + 高/低杆效果
            let cueB = null, other = null;
            if (a.num === 0) { cueB = a; other = b; }
            else if (b.num === 0) { cueB = b; other = a; }
            if (cueB) {
                if (shot && shot.first === null) {
                    shot.first = other.num;
                    // 高杆跟进 / 低杆回缩
                    if (Math.abs(cueB.vertSpin) > 0.05) {
                        const f = cueB.vertSpin * 1.35;
                        cueB.vx += shotDirStore.x * f;
                        cueB.vz += shotDirStore.z * f;
                        cueB.vertSpin = 0;
                    }
                }
            }
            SFX.ballHit(Math.abs(dvn));
        }
    }

    // 库边 + 袋口
    for (const b of balls) {
        if (b.potted) continue;
        if (checkPocket(b)) continue;

        const L = W / 2 - R, T = H / 2 - R;
        const ax = Math.abs(b.x), az = Math.abs(b.z);
        const gapLong = ax > W / 2 - CFG.cornerGap || ax < CFG.sideGap;
        const gapShort = az > H / 2 - CFG.cornerGap;

        if (b.z > T && b.vz > 0 && !gapLong) {
            b.z = T; b.vz = -b.vz * CFG.cushRest; applyCushionSpin(b, 0, 1); cushionHit(b);
        } else if (b.z < -T && b.vz < 0 && !gapLong) {
            b.z = -T; b.vz = -b.vz * CFG.cushRest; applyCushionSpin(b, 0, -1); cushionHit(b);
        }
        if (b.x > L && b.vx > 0 && !gapShort) {
            b.x = L; b.vx = -b.vx * CFG.cushRest; applyCushionSpin(b, 1, 0); cushionHit(b);
        } else if (b.x < -L && b.vx < 0 && !gapShort) {
            b.x = -L; b.vx = -b.vx * CFG.cushRest; applyCushionSpin(b, -1, 0); cushionHit(b);
        }

        // 越界保护（袋口咽喉处未捕获时强制吸袋）
        if (Math.abs(b.x) > W / 2 + 0.085 || Math.abs(b.z) > H / 2 + 0.085) {
            forcePot(b);
        }
    }

    return anyMoving;
}

function cushionHit(b) {
    const sp = Math.hypot(b.vx, b.vz);
    if (sp > 0.25) SFX.cushion(sp);
    if (shot && shot.first !== null) shot.cushionAfter = true;
}

// 库边侧塞：旋转在接触点产生切向摩擦
function applyCushionSpin(b, nx, nz) {
    if (Math.abs(b.sideSpin) < 0.03) return;
    // 接触点处表面速度 = ω × r，r = n*R，ω = (0, s, 0)
    const s = b.sideSpin;
    const sx = s * nz * CFG.R;
    const sz = -s * nx * CFG.R;
    b.vx -= sx * 9;
    b.vz -= sz * 9;
    b.sideSpin *= 0.45;
}

function checkPocket(b) {
    for (const p of POCKETS) {
        const d = Math.hypot(b.x - p.x, b.z - p.z);
        if (d < p.r) { potBall(b, p); return true; }
    }
    return false;
}

function forcePot(b) {
    let best = POCKETS[0], bd = Infinity;
    for (const p of POCKETS) {
        const d = Math.hypot(b.x - p.x, b.z - p.z);
        if (d < bd) { bd = d; best = p; }
    }
    potBall(b, best);
}

function potBall(b, p) {
    b.potted = true;
    b.vx = 0; b.vz = 0;
    b.fall = 0;
    b.pocket = p;
    if (shot) shot.potted.push(b.num);
    SFX.pocket();
    // 黑8 或关键球提示在 resolveShot 里统一处理
}

// ---------------- 出杆 ----------------
function shoot(powerFrac) {
    const cue = cueBall();
    const v = CFG.minPower + powerFrac * (CFG.maxPower - CFG.minPower);
    shotDirStore = { x: aimDir.x, z: aimDir.z };
    cue.vx = aimDir.x * v;
    cue.vz = aimDir.z * v;
    cue.vertSpin = spin.y;
    cue.sideSpin = spin.x;
    shot = { first: null, potted: [], cushionAfter: false, preGroupCleared: false };
    if (players[current].group) {
        shot.preGroupCleared = groupRemaining(players[current].group) === 0;
    }
    state = 'shooting';
    strikeAnim = 1;
    SFX.cueHit(v);
    spin = { x: 0, y: 0 };
    updateSpinWidget();
    hidePower();
    setHint('');
}

function groupRemaining(group) {
    return balls.filter(b => b.type === group && !b.potted).length;
}

// ---------------- 规则结算 ----------------
function resolveShot() {
    const wasBreak = isBreak;
    const P = players[current], O = players[1 - current];
    let foul = false;
    let foulMsg = '';

    const cuePotted = cueBall().potted;
    let potted8 = shot.potted.includes(8);
    const pottedNon8 = shot.potted.filter(n => n !== 8 && n !== 0);

    // 犯规判定（必须在清 isBreak 之前做，isLegalFirstContact 要读原值）
    if (cuePotted) { foul = true; foulMsg = '母球落袋'; }
    if (shot.first === null) { foul = true; foulMsg = '空杆未触球'; }
    else if (!isLegalFirstContact(shot.first)) { foul = true; foulMsg = '首触非法球'; }
    // 触球后无球碰库——进任意球（含黑 8）即免
    if (!foul && pottedNon8.length === 0 && !potted8 && !cuePotted && !shot.cushionAfter) {
        foul = true; foulMsg = '触球后无球碰库';
    }

    // 犯规判定完毕才清 isBreak（避免影响 isLegalFirstContact 的开球豁免）
    isBreak = false;

    // 开球进黑 8：重置回置球点（无论是否犯规都先还 8 上桌）
    if (wasBreak && potted8) {
        const eight = balls.find(b => b.num === 8);
        eight.potted = false;
        eight.fall = -1;
        eight.vx = 0; eight.vz = 0;
        eight.x = CFG.W / 4; eight.z = 0;
        eight.mesh.visible = true;
        eight.mesh.scale.set(1, 1, 1);
        eight.mesh.position.set(eight.x, CFG.R, eight.z);
        shot.potted = shot.potted.filter(n => n !== 8);
        potted8 = false;
        showMsg('开球黑 8 入袋，已重置回置球点', 2500);
    }

    // 花色分配：仅在非开球 + 开台 + 合法 + 进非 8 球（开球后桌面仍 open）
    if (openTable && !wasBreak && !foul && pottedNon8.length > 0) {
        const firstType = ballType(pottedNon8[0]);
        P.group = firstType;
        O.group = firstType === 'solid' ? 'stripe' : 'solid';
        openTable = false;
        showMsg((P.group === 'solid' ? P.name + ' 分到全色 ●' : P.name + ' 分到花色 ○'), 2600);
    }

    // 黑 8 结算（非开球阶段；开球进 8 已在上面重置）
    if (potted8) {
        const win = shot.preGroupCleared && !foul && !cuePotted;
        gameOver(win ? current : 1 - current,
            win ? '稳定收尾，黑 8 入袋！' : (shot.preGroupCleared ? '黑 8 进了但犯规判负' : '提前打进黑 8，直接判负'));
        return;
    }

    // 继续 / 换人
    let cont = false;
    if (!foul) {
        if (wasBreak)                          cont = true;                          // 开球未犯规必续
        else if (openTable)                    cont = pottedNon8.length > 0;         // 开台：进任意非 8 续
        else if (groupRemaining(P.group) === 0) cont = true;                         // 已清台打 8：未犯规续（修你报的 bug）
        else                                    cont = pottedNon8.some(n => ballType(n) === P.group);
    }

    if (foul) {
        showMsg('犯规：' + foulMsg + '，对方自由球', 3000);
        switchPlayer();
        startBallInHand();
    } else if (cont) {
        showMsg(wasBreak ? '开球续杆' : '好球！继续击打', 1800);
        state = 'aim';
    } else {
        switchPlayer();
        state = 'aim';
    }
    refreshHUD();
    maybeRunAI();
}

function isLegalFirstContact(num) {
    if (num === 0) return false;
    if (openTable) {
        if (isBreak) return true;        // 开球：首触任意合法
        return num !== 8;                // 开台后：首触不能是 8
    }
    const g = players[current].group;
    if (!g) return num !== 8;
    if (groupRemaining(g) === 0) return num === 8;
    return ballType(num) === g;
}

function switchPlayer() {
    current = 1 - current;
    showMsg('轮到 ' + players[current].name, 1800);
}

function legalTargetBalls() {
    const g = players[current].group;
    if (openTable) {
        if (isBreak) return balls.filter(b => !b.potted && b.num !== 0);   // 开球含 8
        return balls.filter(b => !b.potted && b.num !== 8 && b.num !== 0);
    }
    if (!g || groupRemaining(g) > 0) return balls.filter(b => !b.potted && b.num !== 0 && b.type === g);
    return balls.filter(b => !b.potted && b.num === 8);   // 打黑 8
}

// ---------------- 自由球 ----------------
function startBallInHand() {
    state = 'ballinhand';
    setHint('自由球：移动鼠标选择位置，点击台面放置母球');
    ghostCue.visible = true;
}

function validCuePos(x, z) {
    const R = CFG.R;
    if (Math.abs(x) > CFG.W / 2 - R || Math.abs(z) > CFG.H / 2 - R) return false;
    for (const p of POCKETS) {
        if (Math.hypot(x - p.x, z - p.z) < p.r + R * 0.5) return false;
    }
    for (const b of balls) {
        if (b.num === 0 || b.potted) continue;
        if (Math.hypot(x - b.x, z - b.z) < 2 * R * 1.02) return false;
    }
    return true;
}

function tryPlaceCue(x, z) {
    if (!validCuePos(x, z)) return false;
    const cue = cueBall();
    cue.potted = false;
    cue.fall = -1;
    cue.x = x; cue.z = z; cue.vx = 0; cue.vz = 0;
    cue.mesh.visible = true;
    cue.mesh.scale.set(1, 1, 1);
    cue.mesh.position.set(x, CFG.R, z);
    ghostCue.visible = false;
    state = 'aim';
    setHint('移动鼠标瞄准 · 按住蓄力 · 松开出杆');
    return true;
}

// ---------------- AI ----------------
const AI = {
    timers: [],
    clear() { for (const t of this.timers) clearTimeout(t); this.timers = []; },
    after(ms, fn) { this.timers.push(setTimeout(fn, ms)); },
};

function aiActive() { return vsAI && players[current].isAI && state !== 'over'; }

function maybeRunAI() {
    if (!aiActive()) return;
    AI.clear();
    AI.after(500, aiTakeTurn);
}

function aiTakeTurn() {
    if (!aiActive()) return;
    if (state === 'ballinhand') {
        aiPlaceCue();
    }
    AI.after(400, () => {
        const plan = aiChooseShot();
        if (!plan) return;
        // 平滑转动瞄准方向
        const startAng = Math.atan2(aimDir.z, aimDir.x);
        let endAng = Math.atan2(plan.dir.z, plan.dir.x);
        let diff = endAng - startAng;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        const steps = 22;
        for (let i = 1; i <= steps; i++) {
            AI.after(i * 28, () => {
                const a = startAng + diff * (i / steps);
                aimDir = { x: Math.cos(a), z: Math.sin(a) };
            });
        }
        AI.after(steps * 28 + 350, () => {
            if (state !== 'aim') return;
            state = 'charge';
            chargeStart = performance.now();
            const chargeDur = plan.power * CFG.chargeTime * 1000;
            AI.after(chargeDur, () => {
                if (state === 'charge') shoot(plan.power);
            });
        });
    });
}

function segBlocked(x1, z1, x2, z2, rad, ignore) {
    const dx = x2 - x1, dz = z2 - z1;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-9) return false;
    for (const b of balls) {
        if (b.potted || ignore.includes(b.num)) continue;
        const t = clamp(((b.x - x1) * dx + (b.z - z1) * dz) / len2, 0, 1);
        const px = x1 + dx * t, pz = z1 + dz * t;
        if (Math.hypot(b.x - px, b.z - pz) < rad) return true;
    }
    return false;
}

function aiChooseShot() {
    const cue = cueBall();
    const targets = legalTargetBalls();
    if (!targets.length || cue.potted) return null;
    const sigma = [0.035, 0.014, 0.005][aiLevel];

    let best = null, bestScore = -Infinity;
    for (const b of targets) {
        for (const p of POCKETS) {
            // 袋口方向与幽灵球位置
            let pdx = p.x - b.x, pdz = p.z - b.z;
            const pl = Math.hypot(pdx, pdz);
            if (pl < 1e-6) continue;
            pdx /= pl; pdz /= pl;
            const gx = b.x - pdx * 2 * CFG.R, gz = b.z - pdz * 2 * CFG.R;

            let adx = gx - cue.x, adz = gz - cue.z;
            const al = Math.hypot(adx, adz);
            if (al < 1e-6) continue;
            adx /= al; adz /= al;

            // 切角太薄不行
            const cosCut = adx * pdx + adz * pdz;
            if (cosCut < 0.28) continue;

            // 路径检查
            if (segBlocked(cue.x, cue.z, gx, gz, 2 * CFG.R * 0.96, [b.num])) continue;
            if (segBlocked(b.x, b.z, p.x, p.z, 2 * CFG.R * 0.92, [b.num])) continue;

            const score = cosCut * cosCut * cosCut / (0.25 + al + pl * 1.6);
            if (score > bestScore) {
                bestScore = score;
                best = { dir: { x: adx, z: adz }, dist: al + pl };
            }
        }
    }

    if (best) {
        const v = clamp(1.6 + best.dist * 2.4, 1.6, 7.2);
        const powerFrac = (v - CFG.minPower) / (CFG.maxPower - CFG.minPower);
        // 加入瞄准噪声
        const a = Math.atan2(best.dir.z, best.dir.x) + gauss() * sigma;
        return { dir: { x: Math.cos(a), z: Math.sin(a) }, power: clamp(powerFrac, 0.08, 0.95) };
    }

    // 没有好球：安全球，碰最近的合法球
    let nb = null, nd = Infinity;
    for (const b of targets) {
        const d = Math.hypot(b.x - cue.x, b.z - cue.z);
        if (d < nd) { nd = d; nb = b; }
    }
    if (!nb) return null;
    const a = Math.atan2(nb.z - cue.z, nb.x - cue.x) + gauss() * sigma * 0.5;
    return { dir: { x: Math.cos(a), z: Math.sin(a) }, power: clamp(0.3 + nd * 0.15, 0.25, 0.6) };
}

function aiPlaceCue() {
    const targets = legalTargetBalls();
    const cue = cueBall();
    // 尝试摆在目标球正后方（与袋口一条线）
    for (const b of targets) {
        for (const p of POCKETS) {
            let dx = b.x - p.x, dz = b.z - p.z;
            const l = Math.hypot(dx, dz) || 1;
            dx /= l; dz /= l;
            const cx = clamp(b.x + dx * 0.5, -CFG.W / 2 + CFG.R, CFG.W / 2 - CFG.R);
            const cz = clamp(b.z + dz * 0.5, -CFG.H / 2 + CFG.R, CFG.H / 2 - CFG.R);
            if (!segBlocked(cx, cz, b.x, b.z, 2 * CFG.R * 0.96, [b.num])) {
                if (tryPlaceCue(cx, cz)) return;
            }
        }
    }
    // 兜底：中心附近
    const cands = [[0, 0], [-CFG.W / 4, 0], [CFG.W / 4, 0], [0, -CFG.H / 4], [0, CFG.H / 4]];
    for (const [x, z] of cands) if (tryPlaceCue(x, z)) return;
    for (let i = 0; i < 60; i++) {
        const x = (Math.random() * 2 - 1) * (CFG.W / 2 - 0.1);
        const z = (Math.random() * 2 - 1) * (CFG.H / 2 - 0.1);
        if (tryPlaceCue(x, z)) return;
    }
}

// ---------------- HUD ----------------
function refreshHUD() {
    for (let i = 0; i < 2; i++) {
        const P = players[i];
        $('pp' + (i + 1) + '-name').textContent = P.name;
        const gEl = $('pp' + (i + 1) + '-group');
        const wrap = $('pp' + (i + 1) + '-balls');
        const panel = $('pp' + (i + 1));
        panel.classList.toggle('active', i === current && state !== 'over');
        if (openTable) {
            gEl.textContent = '花色未定';
            wrap.innerHTML = '';
        } else {
            gEl.textContent = P.group === 'solid' ? '全色 ● 1-7' : '花色 ○ 9-15';
            let nums;
            const onEight = groupRemaining(P.group) === 0;
            if (onEight) nums = [8];
            else if (P.group === 'solid') nums = [1, 2, 3, 4, 5, 6, 7];
            else nums = [9, 10, 11, 12, 13, 14, 15];
            wrap.innerHTML = nums.map(n => {
                const b = balls.find(x => x.num === n);
                const down = b && b.potted;
                const isStripe = n > 8;
                const col = BALL_COLORS[n];
                const style = isStripe
                    ? `background:linear-gradient(180deg,#f4f0e4 22%,${col} 22%,${col} 78%,#f4f0e4 78%)`
                    : `background:${col === '#1b1b1b' ? '#1b1b1b;color:#fff' : col}`;
                return `<span class="mini-ball ${down ? 'down' : ''} ${n === 8 ? 'eight' : ''}" style="${style}">${n}</span>`;
            }).join('');
        }
    }
    $('turn-label').textContent = state === 'over' ? '对局结束'
        : '轮到 ' + players[current].name + (aiActive() && players[current].isAI ? ' (思考中…)' : '');
}

let msgTimer = null;
function showMsg(text, ms) {
    $('msg').textContent = text;
    if (msgTimer) clearTimeout(msgTimer);
    if (ms) msgTimer = setTimeout(() => { $('msg').textContent = ''; }, ms);
}
function setHint(t) { $('hint').textContent = t; }
function hidePower() {
    power = 0;
    $('power-fill').style.width = '0%';
}

function updateSpinWidget() {
    const ball = $('spin-ball');
    const dot = $('spin-dot');
    const cx = 50 + spin.x * 38, cy = 50 - spin.y * 38;
    dot.style.left = cx + '%';
    dot.style.top = cy + '%';
    dot.style.transform = 'translate(-50%, -50%)';
    ball.style.borderColor = (spin.x || spin.y) ? 'rgba(230,57,70,0.7)' : 'rgba(255,255,255,0.25)';
}

function gameOver(winnerIdx, subText) {
    state = 'over';
    AI.clear();
    $('end-title').textContent = players[winnerIdx].name + ' 获胜！';
    $('end-sub').textContent = subText || '';
    $('overlay-end').classList.remove('hidden');
    refreshHUD();
    showMsg('', 0);
}

// ---------------- 输入 ----------------
function pointerToTable(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CFG.R);
    const pt = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, pt);
    return hit ? { x: pt.x, z: pt.z } : null;
}

function updateAimFromPointer(e) {
    const p = pointerToTable(e);
    if (!p) return;
    const cue = cueBall();
    const dx = p.x - cue.x, dz = p.z - cue.z;
    const l = Math.hypot(dx, dz);
    if (l > 0.02) aimDir = { x: dx / l, z: dz / l };
}

function humanCanAim() {
    return !players[current].isAI && (state === 'aim' || state === 'charge' || state === 'ballinhand');
}

function initInput() {
    const el = renderer.domElement;

    el.addEventListener('pointermove', (e) => {
        if (!humanCanAim()) return;
        if (state === 'ballinhand') {
            const p = pointerToTable(e);
            if (!p) return;
            const R = CFG.R;
            const gx = clamp(p.x, -CFG.W / 2 + R, CFG.W / 2 - R);
            const gz = clamp(p.z, -CFG.H / 2 + R, CFG.H / 2 - R);
            ghostCue.position.set(gx, CFG.R, gz);
            ghostCue.material.color.setHex(validCuePos(gx, gz) ? 0xffffff : 0xff5f56);
            return;
        }
        updateAimFromPointer(e);
    });

    el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        SFX.unlock();
        if (!humanCanAim()) return;
        if (state === 'ballinhand') {
            const p = pointerToTable(e);
            if (p) {
                const ok = tryPlaceCue(clamp(p.x, -CFG.W / 2 + CFG.R, CFG.W / 2 - CFG.R),
                    clamp(p.z, -CFG.H / 2 + CFG.R, CFG.H / 2 - CFG.R));
                if (!ok) showMsg('此处无法放置', 1200);
                else refreshHUD();
            }
            return;
        }
        if (state === 'aim') {
            state = 'charge';
            chargeStart = performance.now();
        }
    });

    window.addEventListener('pointerup', (e) => {
        if (state === 'charge' && !players[current].isAI) {
            const frac = clamp((performance.now() - chargeStart) / (CFG.chargeTime * 1000), 0.05, 1);
            shoot(frac);
        }
    });

    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (state === 'charge' && !players[current].isAI) {
            state = 'aim';
            hidePower();
        }
    });

    window.addEventListener('keydown', (e) => {
        if (players[current].isAI) return;
        if (e.key === 'Escape' && state === 'charge') {
            state = 'aim';
            hidePower();
        }
        if (state === 'aim' || state === 'charge') {
            const step = e.shiftKey ? 0.0016 : 0.006;
            if (e.key === 'ArrowLeft') {
                const a = Math.atan2(aimDir.z, aimDir.x) - step;
                aimDir = { x: Math.cos(a), z: Math.sin(a) };
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                const a = Math.atan2(aimDir.z, aimDir.x) + step;
                aimDir = { x: Math.cos(a), z: Math.sin(a) };
                e.preventDefault();
            }
        }
        if (e.key === 'v' || e.key === 'V') cycleView();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'q' || e.key === 'Q') { keyHeld.q = true; e.preventDefault(); }
        if (e.key === 'e' || e.key === 'E') { keyHeld.e = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'q' || e.key === 'Q') keyHeld.q = false;
        if (e.key === 'e' || e.key === 'E') keyHeld.e = false;
    });
    // 切走时清理按键状态，避免切回后还在"按住"
    window.addEventListener('blur', () => { keyHeld.q = false; keyHeld.e = false; });

    // 杆法小部件
    const spinBall = $('spin-ball');
    let spinDrag = false;
    function setSpinFromEvent(e) {
        const rect = spinBall.getBoundingClientRect();
        let sx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        let sy = -(((e.clientY - rect.top) / rect.height) - 0.5) * 2;
        const l = Math.hypot(sx, sy);
        if (l > 0.82) { sx = sx / l * 0.82; sy = sy / l * 0.82; }
        spin = { x: sx, y: sy };
        updateSpinWidget();
    }
    spinBall.addEventListener('pointerdown', (e) => {
        spinDrag = true;
        spinBall.setPointerCapture(e.pointerId);
        setSpinFromEvent(e);
        e.stopPropagation();
    });
    spinBall.addEventListener('pointermove', (e) => {
        if (spinDrag) { setSpinFromEvent(e); e.stopPropagation(); }
    });
    spinBall.addEventListener('pointerup', () => { spinDrag = false; });
    spinBall.addEventListener('pointercancel', () => { spinDrag = false; });

    $('btn-view').addEventListener('click', cycleView);
    $('btn-restart').addEventListener('click', () => startGame(vsAI, aiLevel));
}

function cycleView() {
    camMode = (camMode + 1) % CAM_VIEWS.length;
    viewToggleTime = performance.now();
    $('hint').dataset.idle = '';    // 让 hint 走 1.5s 过渡回原始文案
    showMsg('视角：' + CAM_VIEWS[camMode].name, 1200);
}

// ---------------- 摄像机 ----------------
// 3 个预设机位：3/4 透视 / 俯视 / 环桌走位（按 Q/E 绕桌子走动，看向桌面中心）
const CAM_VIEWS = [
    { name: '3/4 透视',   pos: [0,    1.60, 2.10],    look: [0,   -0.02, 0    ] },
    { name: '俯视',       pos: [0,    3.05, 0.0001],  look: [0,    0,    0    ] },
    { name: '环桌走位',   pos: null,                  look: [0,    0,    0    ] },  // 动态计算
];

// 环桌走位参数
const WALK_VIEW = {
    radius:    1.55,   // 相机离桌面中心的水平距离（m，刚好比桌子对角稍长 0.13m，贴着桌边看）
    height:    1.10,   // 相机高度（m，模拟真人站着打台球时眼睛位置，桌面 0.8 + 0.30）
    walkSpeed: 1.55,   // 角速度 rad/s（约 90°/s，绕一圈约 4 秒）
};

// 全局状态：环桌走位的当前角度
let camAngle   = 0;       // 绕桌面中心的方位角（rad）
let camWalkT   = 0;       // 仍在 lerp 收尾时使用，给提示
const keyHeld  = { q: false, e: false };

function updateCamera(dt) {
    // 环桌走位：按 Q/E 持续转动 camAngle
    if (camMode === 2) {
        if (keyHeld.q) camAngle -= WALK_VIEW.walkSpeed * dt;
        if (keyHeld.e) camAngle += WALK_VIEW.walkSpeed * dt;
        // 角度归一化到 [-π, π]
        if (camAngle >  Math.PI) camAngle -= Math.PI * 2;
        if (camAngle < -Math.PI) camAngle += Math.PI * 2;
        camWalkT = performance.now();
    }

    const v = CAM_VIEWS[camMode];
    let tp, tl;
    if (camMode === 2) {
        // 相机在桌面中心外圈，绕中心周向走，看向桌面中心
        const r = WALK_VIEW.radius;
        tp = new THREE.Vector3(r * Math.cos(camAngle), WALK_VIEW.height, r * Math.sin(camAngle));
        tl = new THREE.Vector3(0, CFG.R + 0.02, 0);
    } else {
        tp = new THREE.Vector3(v.pos[0], v.pos[1], v.pos[2]);
        tl = new THREE.Vector3(v.look[0], v.look[1], v.look[2]);
    }
    // 帧率无关的快速平滑（~0.14s 收敛），切换视角不再像在缓慢旋转
    const k = 1 - Math.exp(-dt * 22);
    camPos.lerp(tp, k);
    camLook.lerp(tl, k);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // HUD 提示当前所在位置（仅在环桌走位视角且 1.5s 内有移动）
    if (camMode === 2) {
        const a = camAngle * 180 / Math.PI;
        // 桌面 W=2.54（长边）H=1.27（短边）。我们绕桌面中心，区分"短边外" vs "长边外"
        // 用 8 个方位：长边两端 4 个，短边外 4 个，但桌子长方形有 4 个角。
        // 简化：直接显示角度 + 文字方位（长边/短边 + 左/右）
        const side = (Math.abs(Math.sin(camAngle)) > 0.707) ? '短边外' : '长边外';
        const flip = Math.sin(camAngle) > 0 ? '（头顶方向）' : '（脚端方向）';
        $('hint').textContent = `环桌走位：Q 逆时针走 / E 顺时针走 · 当前 ${a.toFixed(0)}° ${side} ${flip}`;
    } else if (performance.now() - viewToggleTime < 1500) {
        $('hint').textContent = '视角：' + v.name + '（V 切换）';
    } else if ($('hint').dataset.idle !== '1') {
        $('hint').textContent = '移动鼠标瞄准 · 按住蓄力 · 松开出杆';
        $('hint').dataset.idle = '1';
    }
}

// ---------------- 渲染循环 ----------------
let lastT = 0, physAcc = 0, strikeAnimT = 0;

function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastT) / 1000 || 0.016, 0.05);
    lastT = now;

    // 蓄力
    if (state === 'charge') {
        power = clamp((now - chargeStart) / (CFG.chargeTime * 1000), 0, 1);
        $('power-fill').style.width = (power * 100).toFixed(1) + '%';
    }

    // 物理
    if (state === 'shooting') {
        physAcc += dt;
        let guard = 0;
        while (physAcc >= CFG.dt && guard < 40) {
            physStep(CFG.dt);
            physAcc -= CFG.dt;
            guard++;
        }
        if (guard >= 40) physAcc = 0;
        // 出杆动画
        if (strikeAnim > 0) {
            strikeAnim = Math.max(0, strikeAnim - dt / 0.09);
        }
        // 检查停球
        let moving = false, falling = false;
        for (const b of balls) {
            if (b.potted) { if (b.fall >= 0 && b.fall < 1) falling = true; continue; }
            if (b.vx !== 0 || b.vz !== 0) { moving = true; break; }
        }
        if (!moving && !falling) {
            resolveShot();
        }
    }

    // 同步网格
    for (const b of balls) {
        if (b.potted) {
            if (b.fall >= 0 && b.fall < 1) {
                b.fall = Math.min(1, b.fall + dt / 0.32);
                const t = b.fall;
                b.mesh.position.x += (b.pocket.x - b.mesh.position.x) * 0.25;
                b.mesh.position.z += (b.pocket.z - b.mesh.position.z) * 0.25;
                b.mesh.position.y = CFG.R - t * t * 0.16;
                const s = 1 - t * 0.35;
                b.mesh.scale.set(s, s, s);
                if (b.fall >= 1) b.mesh.visible = false;
            }
        } else {
            // 滚动自转
            const mx = b.x - b.px, mz = b.z - b.pz;
            const md = Math.hypot(mx, mz);
            if (md > 1e-7) {
                const axis = new THREE.Vector3(mz / md, 0, -mx / md);
                b.mesh.rotateOnWorldAxis(axis, md / CFG.R);
            }
            b.px = b.x; b.pz = b.z;
            b.mesh.position.set(b.x, CFG.R, b.z);
        }
    }

    updateGuide();
    updateCueVisual(now);
    updateCamera(dt);
    renderer.render(scene, camera);
}

// ---------------- 流程控制 ----------------
function startGame(_vsAI, level) {
    vsAI = _vsAI;
    aiLevel = level;
    players = [
        { name: '玩家 1', group: null, isAI: false },
        vsAI ? { name: '电脑', group: null, isAI: true } : { name: '玩家 2', group: null, isAI: false },
    ];
    current = 0;
    openTable = true;
    isBreak = true;
    shot = null;
    spin = { x: 0, y: 0 };
    updateSpinWidget();
    AI.clear();
    rackBalls();
    aimDir = { x: 1, z: 0 };
    state = 'aim';
    power = 0;
    hidePower();
    ghostCue.visible = false;
    $('overlay').classList.add('hidden');
    $('overlay-end').classList.add('hidden');
    setHint('移动鼠标瞄准 · 按住蓄力 · 松开出杆');
    showMsg('开球！' + players[0].name + ' 先手', 2500);
    refreshHUD();
}

function initMenu() {
    let mode = 'ai';
    $('btn-mode-ai').addEventListener('click', () => {
        mode = 'ai';
        $('btn-mode-ai').classList.add('selected');
        $('btn-mode-pvp').classList.remove('selected');
        $('diff-row').style.display = 'flex';
    });
    $('btn-mode-pvp').addEventListener('click', () => {
        mode = 'pvp';
        $('btn-mode-pvp').classList.add('selected');
        $('btn-mode-ai').classList.remove('selected');
        $('diff-row').style.display = 'none';
    });
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
    $('btn-start').addEventListener('click', () => {
        SFX.unlock();
        const level = parseInt(document.querySelector('.diff-btn.selected').dataset.diff, 10) || 1;
        startGame(mode === 'ai', level);
    });
    $('btn-again').addEventListener('click', () => startGame(vsAI, aiLevel));
    $('btn-menu').addEventListener('click', () => {
        state = 'menu';
        $('overlay-end').classList.add('hidden');
        $('overlay').classList.remove('hidden');
    });
}

// ---------------- 启动 ----------------
function main() {
    if (!window.THREE) {
        document.body.innerHTML = '<div style="color:#fff;padding:40px;font-family:sans-serif">Three.js 加载失败，请检查网络后刷新。</div>';
        return;
    }
    initThree();
    initInput();
    initMenu();
    updateSpinWidget();
    requestAnimationFrame(animate);
}

main();

// 调试句柄
window.POOL = {
    get state() { return state; },
    get balls() { return balls; },
    get current() { return current; },
    get players() { return players; },
    get openTable() { return openTable; },
    get isBreak() { return isBreak; },
    startGame, shoot, aimDir,
    setAim(x, z) { const l = Math.hypot(x, z); if (l > 0) aimDir = { x: x / l, z: z / l }; return aimDir; },
    // 测试用：直接把指定号码的球标为进袋（不动 mesh 动画）
    potNum(n) { const b = balls.find(x => x.num === n); if (b) { b.potted = true; b.mesh.visible = false; } },
    // 测试用：直接设置玩家分组
    setGroups(p0, p1) { players[0].group = p0; players[1].group = p1; openTable = false; },
    // 测试用：移动球（不动速度）
    moveBall(n, x, z) { const b = balls.find(y => y.num === n); if (b) { b.x = x; b.z = z; b.mesh.position.set(x, CFG.R, z); } },
    // 测试用：把某颗球标记为进袋（含 mesh 隐藏）
    markPotted(n) { const b = balls.find(y => y.num === n); if (b) { b.potted = true; b.mesh.visible = false; b.fall = -1; } },
    // 测试用：直接用给定的 shot 记录跑一次规则结算（确定性测规则）
    __resolveMock(s) { shot = s; resolveShot(); },
    // 测试用：把 isBreak 置 false（模拟开球已经结束）
    __endBreak() { isBreak = false; },
    // 调试：读取当前环桌走位角度
    getCamAngle() { return camAngle; },
    // 调试：强行设置环桌走位角度
    setCamAngle(a) { camAngle = a; },
};

})();
