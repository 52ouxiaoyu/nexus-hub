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
    // 斯诺克彩球（16=黄2 … 21=黑7）
    16: '#f5b70a', 17: '#12703c', 18: '#7a4a21', 19: '#0f4db0', 20: '#e87a9a', 21: '#1b1b1b',
};

// ---------------- 斯诺克 ----------------
// 球号映射：0=母球 · 1~15=红球（各 1 分）· 16~21=彩球（黄2 绿3 棕4 蓝5 粉6 黑7）
const SNK_COLOURS = [
    { num: 16, val: 2, name: '黄球', color: '#f5b70a' },
    { num: 17, val: 3, name: '绿球', color: '#12703c' },
    { num: 18, val: 4, name: '棕球', color: '#7a4a21' },
    { num: 19, val: 5, name: '蓝球', color: '#0f4db0' },
    { num: 20, val: 6, name: '粉球', color: '#e87a9a' },
    { num: 21, val: 7, name: '黑球', color: '#1b1b1b' },
];
// 台面点位按真实斯诺克台比例缩放（台长 3569mm：置球区线 29"≈0.2065L，D 半径 11.5"≈0.0818L，
// 黑球点距顶库 12.75"≈0.0908L，粉球点=中心与顶库中点）
const SNK = (() => {
    const baulkX = -CFG.W / 2 + CFG.W * 0.2065;
    const dRad = CFG.W * 0.0818;
    return {
        baulkX, dRad,
        spot: {
            16: { x: baulkX, z: dRad },                       // 黄
            17: { x: baulkX, z: -dRad },                      // 绿
            18: { x: baulkX, z: 0 },                          // 棕（置球区线中点）
            19: { x: 0, z: 0 },                               // 蓝（台面中心）
            20: { x: CFG.W / 4, z: 0 },                       // 粉
            21: { x: CFG.W / 2 - CFG.W * 0.0908, z: 0 },      // 黑
        },
    };
})();
function snIsRed(n) { return n >= 1 && n <= 15; }
function snIsColour(n) { return n >= 16 && n <= 21; }
function snVal(n) { return snIsColour(n) ? SNK_COLOURS[n - 16].val : 1; }

const POCKETS = [];
// 斯诺克袋口明显更小（角袋 mouth ≈8.6cm、中袋 ≈10cm，相对美式约 0.75 / 0.78），
// 进球难度显著更高——这是斯诺克手感的核心
function rebuildPockets() {
    const sk = gameMode === 'snooker';
    const cs = sk ? 0.75 : 1, ss = sk ? 0.78 : 1;
    POCKETS.length = 0;
    const L = CFG.W / 2, T = CFG.H / 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
        POCKETS.push({ x: sx * (L + 0.015), z: sz * (T + 0.015), r: CFG.cornerCapture * cs, corner: true });
    for (const sz of [-1, 1])
        // 中袋：捕获圆心外移（上袋上移/下袋下移）——捕获圈不朝桌内伸出，
        // 贴库滚过不自动进袋，正对直打照常进袋，薄擦在袋角弹开
        POCKETS.push({ x: 0, z: sz * (T + 0.07), r: CFG.sideCapture * ss, corner: false });
}


// ---------------- 全局状态 ----------------
let balls = [];          // 所有球（0 = 母球）
let state = 'menu';      // menu | aim | charge | shooting | ballinhand | over
let players = [];
let current = 0;
let vsAI = true, aiLevel = 1;
let openTable = true, isBreak = true;
let gameMode = 'pool8';     // pool8 = 中式八球 · snooker = 斯诺克
let snooker = null;         // 斯诺克状态：{ scores:[0,0], onColour:打进红球后下一杆打彩球 }
rebuildPockets();   // 开机即填充（默认八球）——buildTable 建袋口视觉时需要读到数据
                    // （v2.0.0 回归：只靠 startGame 填充，开机时 POCKETS 为空 → 袋口视觉整体消失）
let shot = null;         // 本杆事件记录
let aimDir = { x: 1, z: 0 };
let power = 0, chargeStart = 0;
// 蓄力力度：三角波往返（0→1→0 循环），错过最佳力度可以等它回落再松手
function chargePowerAt(now) {
    const t = (now - chargeStart) / (CFG.chargeTime * 1000);  // 单程时长
    const phase = t % 2;                                       // 一个循环 = 升 + 降
    return phase <= 1 ? phase : 2 - phase;
}
let spin = { x: 0, y: 0 };
let shotDirStore = { x: 1, z: 0 };
let customNames = ['', ''];   // 菜单里填的玩家昵称
let camMode = 1;         // 默认俯视（上帝视角，最常用）· 0 三维 1 俯视 2 环桌走位
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

    // ---- 库边 + 袋口（v2.1 重做：真实钥匙孔洞口）----
    // 结构：黑色洞盘圆心移出台面外，喉部两条 jaw 斜边从库边鼻尖汇入洞口；
    // 库边端面与 jaw 线共线（无直角），木框挖洞与洞盘同圆（不漏背景）。
    const cushMat = new THREE.MeshStandardMaterial({ color: 0x1f5b39, roughness: 0.9, side: THREE.DoubleSide });
    const cw = 0.055;          // 库边宽度（鼻线 → 木边）
    const ch = 0.042;          // 库边高度
    const sg = CFG.sideGap;    // 中袋：半 mouth

    // 多边形挤出成棱柱：shape 用 (x, -z)，挤出后 rotateX(-90°) 回到 xz 平面、底面落在 y=0
    function prism(pts, h, mat) {
        const shape = (pts instanceof THREE.Shape) ? pts
            : new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
        const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
        return m;
    }

    // 袋口几何（纯视觉；物理捕获圈 POCKETS 不变）
    // eC/eS：洞心外移量；rC/rS：洞口半径；dxc/dxs：洞圆与库边背线的半弦长
    const eC = 0.015, rC = 0.095;   // 角袋：洞心 = 桌角沿对角外移
    const eS = 0.050, rS = 0.082;   // 中袋：洞心 = 库边线外 eS（r 保证鼻线处洞宽≥槽口，无方角）
    const dxc = Math.sqrt(rC * rC - (cw - eC) * (cw - eC));
    const dxs = Math.sqrt(rS * rS - (cw - eS) * (cw - eS));
    const wB = T + cw;              // 库边背线
    const cln = T + eC - dxc;       // 角袋洞圆在短边背线上的截距（相对 ±T）

    // 洞心：角袋沿对角外移、中袋向库边外移（只依赖象限，两种模式通用）
    function holeC(p) {
        const sx = Math.sign(p.x) || 1, sz = Math.sign(p.z);
        return p.corner ? { x: sx * (L + eC), z: sz * (T + eC) }
                        : { x: 0, z: sz * (T + eS) };
    }

    // 库边 6 段（v2.1.1）。角袋端面 = 沿洞圆的圆弧：绿色 jaw 包着黑洞转圆口（用户要求"出口成圆形"）；
    // 圆弧相对直弦向台面侧外凸 → 天然压住黑色喉部四边形的直弦边，无 AA 裂缝。
    // 中袋端面仍为直斜面，向洞心延伸 2.5mm 盖缝。
    const TAU = Math.PI * 2;
    const normA = a => ((a % TAU) + TAU) % TAU;
    // 洞圆弧采样：pFrom → pTo，取经过 midAng（洞心指向台面内的方向）的那条弧；含终点不含起点
    function arcPts(C, r, pFrom, pTo, midAng, n) {
        const a0 = Math.atan2(pFrom[1] - C.z, pFrom[0] - C.x);
        const a1 = Math.atan2(pTo[1] - C.z, pTo[0] - C.x);
        const dCcw = normA(a1 - a0), mMid = normA(midAng - a0);
        const ccw = mMid <= dCcw;
        const d = ccw ? dCcw : TAU - dCcw;
        const pts = [];
        for (let i = 1; i < n; i++) {
            const a = a0 + (ccw ? 1 : -1) * d * i / n;
            pts.push([C.x + Math.cos(a) * r, C.z + Math.sin(a) * r]);
        }
        pts.push(pTo);
        return pts;
    }
    function jawPts(P, Q, C, amt) {
        amt = amt || 0.0025;
        const dx = Q[0] - P[0], dz = Q[1] - P[1], l = Math.hypot(dx, dz);
        let px = -dz / l, pz = dx / l;
        const mx = (P[0] + Q[0]) / 2 - C.x, mz = (P[1] + Q[1]) / 2 - C.z;
        if (px * mx + pz * mz < 0) { px = -px; pz = -pz; }   // 法线取指向洞心一侧
        return [[P[0] + px * amt, P[1] + pz * amt], [Q[0] + px * amt, Q[1] + pz * amt]];
    }
    // 角袋嘴：绿 jaw 沿洞圆包 ~308°，只留朝台面的圆形开口（用户要求"出口成圆形"）。
    // 嘴半角 26° → 嘴宽 2·rC·sin26° ≈ 8.3cm；嘴尖过鼻线 ~1.6cm（真实球台 jaw 微微盖住台呢）
    const MOUTH_HALF = 26 * Math.PI / 180;
    function mouthAngles(sx, sz) {
        const diag = Math.atan2(-sz, -sx);                  // 洞心指向台面的对角方向
        const a1 = diag - MOUTH_HALF, a2 = diag + MOUTH_HALF;
        const midLong = sx > 0 ? Math.PI : 0;
        const midShort = sz > 0 ? -Math.PI / 2 : Math.PI / 2;
        const dAng = (a, b) => { const d = Math.abs(normA(a) - normA(b)); return Math.min(d, TAU - d); };
        const aLong = dAng(a1, midLong) <= dAng(a2, midLong) ? a1 : a2;
        return { aLong, aShort: aLong === a1 ? a2 : a1 };
    }
    const tipAt = (Cc, a) => [Cc.x + rC * Math.cos(a), Cc.z + rC * Math.sin(a)];
    // 长边库边 ×4：中袋端(直) → 角袋端 jaw 弧包到嘴缘 → 钩回鼻线
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
        const Cc = { x: sx * (L + eC), z: sz * (T + eC) };
        const Cs = { x: 0, z: sz * (T + eS) };
        const backC = [sx * (L + eC - dxc), sz * wB];   // 角袋端背线交点（洞圆上）
        const { aLong } = mouthAngles(sx, sz);
        const tipL = tipAt(Cc, aLong);
        const cornerJaw = arcPts(Cc, rC, backC, tipL, sx > 0 ? Math.PI : 0, 14);
        const [ns, bs] = jawPts([sx * sg, sz * T], [sx * dxs, sz * wB], Cs);
        prism([bs, backC, ...cornerJaw, [tipL[0], sz * T], ns], ch, cushMat);
    }
    // 短边库边 ×2：两端 jaw 弧包到嘴缘 + 钩回鼻线，中间沿鼻线直行
    for (const sx of [-1, 1]) {
        const CcT = { x: sx * (L + eC), z: T + eC };
        const CcB = { x: sx * (L + eC), z: -(T + eC) };
        const bT = [sx * (L + cw), cln], bB = [sx * (L + cw), -cln];
        const tipT = tipAt(CcT, mouthAngles(sx, 1).aShort);
        const tipB = tipAt(CcB, mouthAngles(sx, -1).aShort);
        prism([...arcPts(CcT, rC, bT, tipT, -Math.PI / 2, 14),
               [sx * L, tipT[1]],
               [sx * L, tipB[1]],
               ...arcPts(CcB, rC, tipB, bB, Math.PI / 2, 14)], ch, cushMat);
    }

    // ---- 木边外框：外轮廓八角形（45° 斜切角），内边界沿背线行走、6 个洞口绕洞圆外弧 ----
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.55, metalness: 0.05 });
    const linerMat = new THREE.MeshStandardMaterial({ color: 0x0d0a07, roughness: 0.92, side: THREE.DoubleSide });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x241408, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide });
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x020504 });
    const railW = 0.13, railH = 0.058;
    const ox = L + cw + railW, oz = T + cw + railW;
    const bev = 0.10;                                // 外角斜切量

    // 圆弧采样追加到 hp（复用库边段的 arcPts；取经过 midAng 的那条弧，终点显式追加）
    function arcInto(hp, cx, cz, r, pFrom, pTo, midAng, n) {
        hp.push(...arcPts({ x: cx, z: cz }, r, pFrom, pTo, midAng, n));
    }

    // 内边界行走（闭合一圈）：短边线/长边线直线段由 Shape 自动连接，
    // 6 个洞口处绕洞圆的"木框侧"外弧（角袋经过外侧对角、中袋经过正外方）
    const hp = [];
    hp.push([-(L + cw), cln]);   // 起点 = 角(−,+) 弧终点
    arcInto(hp, -(L+eC), -(T+eC), rC, [-(L+cw), -cln], [-(L+eC-dxc), -wB], Math.PI * 1.25, 20);
    arcInto(hp, 0, -(T+eS), rS, [-dxs, -wB], [dxs, -wB], -Math.PI / 2, 16);
    arcInto(hp, (L+eC), -(T+eC), rC, [(L+eC-dxc), -wB], [(L+cw), -cln], Math.PI * 1.75, 20);
    arcInto(hp, (L+eC), (T+eC), rC, [(L+cw), cln], [(L+eC-dxc), wB], Math.PI * 0.25, 20);
    arcInto(hp, 0, (T+eS), rS, [dxs, wB], [-dxs, wB], Math.PI / 2, 16);
    arcInto(hp, -(L+eC), (T+eC), rC, [-(L+eC-dxc), wB], [-(L+cw), cln], Math.PI * 0.75, 20);
    // 末段终点 = 起点，去掉重复点
    if (Math.abs(hp[hp.length-1][0] - hp[0][0]) < 1e-9 && Math.abs(hp[hp.length-1][1] - hp[0][1]) < 1e-9) hp.pop();

    const outerPts = [                                // 外轮廓：八角形
        [-ox + bev, -oz], [ox - bev, -oz], [ox, -oz + bev], [ox, oz - bev],
        [ox - bev, oz], [-ox + bev, oz], [-ox, oz - bev], [-ox, -oz + bev],
    ].map(p => new THREE.Vector2(p[0], -p[1]));
    const holePts = hp.map(p => new THREE.Vector2(p[0], -p[1]));
    if (THREE.ShapeUtils.isClockWise(outerPts)) outerPts.reverse();
    if (!THREE.ShapeUtils.isClockWise(holePts)) holePts.reverse();
    const frameShape = new THREE.Shape(outerPts);
    frameShape.holes.push(new THREE.Path(holePts));
    prism(frameShape, railH, woodMat);

    // ---- 袋口视觉：黑洞盘 + 喉部四边形 + 内壁圆筒 + 木框上的镶边环 ----
    for (const p of POCKETS) {
        const C = holeC(p);
        const r = p.corner ? rC : rS;
        const sx = Math.sign(p.x) || 1, sz = Math.sign(p.z);
        // 1) 洞盘（圆心在台面外，盖住洞口与喉部尽头）
        const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48), holeMat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(C.x, 0.0028, C.z);
        scene.add(disc);
        // 2) 喉部四边形：两鼻尖 → 两背线交点（边缘与库边 jaw 端面共线，无缝无直角）
        const quad = p.corner
            ? (function () {
                const Cc2 = holeC(p);
                const mg = mouthAngles(sx, sz);
                return [tipAt(Cc2, mg.aLong), [sx*(L+eC-dxc), sz*wB], [sx*(L+cw), sz*cln], tipAt(Cc2, mg.aShort)];
              })()
            : [[-sg, sz*T], [-dxs, sz*wB], [dxs, sz*wB], [sg, sz*T]];
        const qgeo = new THREE.ShapeGeometry(new THREE.Shape(quad.map(pt => new THREE.Vector2(pt[0], -pt[1]))));
        qgeo.rotateX(-Math.PI / 2);
        const qm = new THREE.Mesh(qgeo, holeMat);
        qm.position.y = 0.0022;
        scene.add(qm);
        // 3) 内壁圆筒：洞圆在木框侧的弧段（与木框洞边同弧，斜视角呈现黑洞侧壁）
        const a0 = p.corner ? Math.atan2(sz*wB - C.z, sx*(L+eC-dxc) - C.x)
                            : Math.atan2(sz*wB - C.z, -dxs - C.x);
        const a1 = p.corner ? Math.atan2(sz*cln - C.z, sx*(L+cw) - C.x)
                            : Math.atan2(sz*wB - C.z, dxs - C.x);
        const mid = p.corner ? Math.atan2(sz, sx) : (sz > 0 ? Math.PI / 2 : -Math.PI / 2);
        const dCcw = normA(a1 - a0), mMid = normA(mid - a0);
        const ccw = mMid <= dCcw;
        const span = ccw ? dCcw : TAU - dCcw;
        const aStart = normA(ccw ? a0 : a1);
        const tube = new THREE.Mesh(
            new THREE.CylinderGeometry(r, r * 0.94, railH + 0.004, 28, 1, true, Math.PI / 2 - (aStart + span), span),
            linerMat
        );
        tube.position.set(C.x, (railH + 0.004) / 2, C.z);
        tube.receiveShadow = true;
        scene.add(tube);
        // 4) 镶边环：坐在木框顶面包住洞口（真实球台的皮质/塑钢护口）
        const ro = r + 0.016, ri = r - 0.003, ring = [];
        for (let i = 0; i <= 24; i++) {
            const a = aStart + span * i / 24;
            ring.push([C.x + Math.cos(a) * ro, C.z + Math.sin(a) * ro]);
        }
        for (let i = 24; i >= 0; i--) {
            const a = aStart + span * i / 24;
            ring.push([C.x + Math.cos(a) * ri, C.z + Math.sin(a) * ri]);
        }
        const rgeo = new THREE.ShapeGeometry(new THREE.Shape(ring.map(pt => new THREE.Vector2(pt[0], -pt[1]))));
        rgeo.rotateX(-Math.PI / 2);
        const rim = new THREE.Mesh(rgeo, rimMat);
        rim.position.y = railH + 0.001;
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
    const Lh = W / 2 + cw + railW / 2, Th = H / 2 + cw + railW / 2;
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
    if (gameMode === 'snooker') {
        if (snIsRed(num)) return 'red';
        return 'colour';
    }
    if (num === 8) return 'eight';
    return num < 8 ? 'solid' : 'stripe';
}

function makeBallTexture(num) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    const type = ballType(num);
    // 斯诺克红球统一纯红（num 1~15 会撞上 8 球颜色表，必须在这里覆盖）
    const col = type === 'red' ? '#d31820' : BALL_COLORS[num];
    if (type === 'stripe') {
        g.fillStyle = '#f4f0e4'; g.fillRect(0, 0, 256, 128);
        g.fillStyle = col; g.fillRect(0, 128 * 0.28, 256, 128 * 0.44);
    } else {
        g.fillStyle = type === 'cue' ? '#f8f4e9' : col;
        g.fillRect(0, 0, 256, 128);
    }
    if (num > 0 && type !== 'red') {   // 斯诺克红球无号码（还原真实）；彩球标分值
        const label = gameMode === 'snooker' ? String(snVal(num)) : String(num);
        for (const cx of [64, 192]) {
            g.fillStyle = '#f4f0e4';
            g.beginPath(); g.arc(cx, 64, 18, 0, 7); g.fill();
            g.fillStyle = '#141414';
            g.font = 'bold 21px Arial';
            g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(label, cx, 66);
        }
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

    if (gameMode === 'snooker') return rackSnooker();

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

// 斯诺克摆球：15 红三角（顶点贴粉球点后方）+ 六彩定点 + 母球开在 D 区
function rackSnooker() {
    const R = CFG.R;
    balls.push(createBall(0, SNK.baulkX - 0.06, 0));   // 母球在 D 区内

    const dx = R * 2 * 0.872, dz = R * 2 + 0.0004;
    const apexX = SNK.spot[20].x + 2 * R + 0.002;      // 红球顶点贴着粉球点后方
    let red = 1;
    for (let row = 0; row < 5; row++)
        for (let j = 0; j <= row; j++)
            balls.push(createBall(red++, apexX + row * dx, (j - row / 2) * dz));

    for (const c of SNK_COLOURS)
        balls.push(createBall(c.num, SNK.spot[c.num].x, SNK.spot[c.num].z));
}

// 斯诺克台面标识：置球区线 + D 弧 + 六个置球点（只在斯诺克模式显示）
let snookerDecal = null;
function buildSnookerDecal() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    const W = CFG.W, H = CFG.H;
    const toPx = (x, z) => [(x + W / 2) / W * 1024, (z + H / 2) / H * 512];
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = 3;
    const bx = toPx(SNK.baulkX, 0)[0];
    g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx, 512); g.stroke();          // 置球区线
    const [cx, cy] = toPx(SNK.baulkX, 0);
    g.beginPath();
    g.arc(cx, cy, SNK.dRad / W * 1024, Math.PI / 2, Math.PI * 1.5, false);  // D 弧（凸向左）
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (const cn of [16, 17, 18, 19, 20, 21]) {
        const [sx, sy] = toPx(SNK.spot[cn].x, SNK.spot[cn].z);
        g.beginPath(); g.arc(sx, sy, 3.5, 0, 7); g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CFG.W, CFG.H),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.0012;
    mesh.visible = false;
    scene.add(mesh);
    snookerDecal = mesh;
}

// ---------------- 瞄准辅助线 ----------------
function buildGuide() {
    guideGroup = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
    const matObj = new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9 });
    const matDef = new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.5 });

    function makeLine(m, n) {
        n = n || 2;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
        geo.setDrawRange(0, 2);
        const l = new THREE.Line(geo, m);
        guideGroup.add(l);
        return l;
    }
    guideGroup.userData.aimLine = makeLine(mat);
    guideGroup.userData.objLine = makeLine(matObj, 256);  // 简单档真实模拟轨迹（最多 250 点）
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
    line.geometry.setDrawRange(0, 2);
    p.needsUpdate = true;
}

// 多段折线（预测路线用）
function setPolyline(line, pts, y) {
    const p = line.geometry.attributes.position;
    const n = Math.min(pts.length, p.count);
    for (let i = 0; i < n; i++) p.setXYZ(i, pts[i][0], y, pts[i][1]);
    line.geometry.setDrawRange(0, n);
    p.needsUpdate = true;
}

// 玩家辅助线强度随难度：0 简单=长方向线 / 1 普通=现状短指向 / 2 困难=无方向线
// （双人对战统一普通辅助，两边公平）
const GUIDE_ASSIST = {
    objLen: [9, 0.08, 0],      // 目标球方向线：简单档延伸到第一处库边（长度封顶由射线决定）
    defLen: [0.09, 0.09, 0],   // 母球分离方向线（困难档一并去掉，只留击中部位虚影圈）
};
function assistLevel() { return vsAI ? aiLevel : 1; }

// 从 (x0,z0) 沿 (dx,dz) 到第一处库边：返回 {t, axis}（axis='x' 撞短边墙 / 'z' 撞长边墙）
// 袋口区视为通行，直接穿过去（随后由进袋判定终止路线）
function rayWallT(x0, z0, dx, dz) {
    const L = CFG.W / 2 - CFG.R, T = CFG.H / 2 - CFG.R;
    let tWall = Infinity, axis = null;
    function tryWall(t, hitX, hitZ, ax) {
        if (t > 0.001 && t < tWall) {
            const axx = Math.abs(hitX), az = Math.abs(hitZ);
            const nearCornerX = axx > CFG.W / 2 - CFG.cornerGap;
            const nearSideX = axx < CFG.sideGap;
            const nearCornerZ = az > CFG.H / 2 - CFG.cornerGap;
            let gap = false;
            if (Math.abs(hitZ) > T - 1e-6) gap = nearCornerX || nearSideX;      // 长边墙
            if (Math.abs(hitX) > L - 1e-6) gap = gap || nearCornerZ;           // 短边墙
            if (!gap) { tWall = t; axis = ax; }
        }
    }
    if (dx > 1e-9) tryWall((L - x0) / dx, L, z0 + (L - x0) / dx * dz, 'x');
    if (dx < -1e-9) tryWall((-L - x0) / dx, -L, z0 + (-L - x0) / dx * dz, 'x');
    if (dz > 1e-9) tryWall((T - z0) / dz, x0 + (T - z0) / dz * dx, T, 'z');
    if (dz < -1e-9) tryWall((-T - z0) / dz, x0 + (-T - z0) / dz * dx, -T, 'z');
    return { t: isFinite(tWall) ? tWall : 3, axis };
}

// 简单档：预测目标球完整行进路线（库边折射 + 进袋终止 + 被球阻挡终止）
function predictPath(x0, z0, dx, dz, selfNum, maxBounces) {
    const pts = [[x0, z0]];
    let x = x0, z = z0, total = 0;
    for (let seg = 0; seg <= maxBounces; seg++) {
        // 前方被其他球阻挡（走廊 2R；忽略母球——它自己也在动，位置不可信）
        let tBall = Infinity;
        for (const b of balls) {
            if (b.potted || b.num === selfNum || b.num === 0) continue;
            const ex = b.x - x, ez = b.z - z;
            const proj = ex * dx + ez * dz;
            if (proj <= 0) continue;
            const perp2 = ex * ex + ez * ez - proj * proj;
            const rr = 4 * CFG.R * CFG.R;
            if (perp2 > rr) continue;
            const t = proj - Math.sqrt(rr - perp2);
            if (t > 0.001 && t < tBall) tBall = t;
        }
        // 进袋：路线进入捕获圈即终止于袋口
        let tPocket = Infinity;
        for (const p of POCKETS) {
            const ex = p.x - x, ez = p.z - z;
            const proj = ex * dx + ez * dz;
            if (proj <= 0) continue;
            const perp2 = ex * ex + ez * ez - proj * proj;
            if (perp2 < p.r * p.r) {
                const t = proj - Math.sqrt(p.r * p.r - perp2);
                if (t > 0.001 && t < tPocket) tPocket = t;
            }
        }
        const w = rayWallT(x, z, dx, dz);
        const tMin = Math.min(tBall, tPocket, w.t);
        if (!isFinite(tMin)) break;
        x += dx * tMin; z += dz * tMin;
        total += tMin;
        pts.push([x, z]);
        if (tBall <= tMin || tPocket <= tMin) break;   // 被球挡 / 进袋 → 路线到此为止
        if (w.axis === 'x') dx = -dx; else dz = -dz;   // 库边镜面折射
        if (total > 6) break;                          // 保险丝
    }
    return pts;
}

// 简单档轨迹模拟缓存：同一杆（方向/力度/旋转/母球位/杆序）不重复模拟
let guideSimCache = { key: '', path: null };
let shotSeq = 0;

function updateGuide() {
    const ud = guideGroup.userData;
    const assist = assistLevel();
    const objLen = GUIDE_ASSIST.objLen[assist];
    const defLen = GUIDE_ASSIST.defLen[assist];
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
    let tWall = rayWallT(cue.x, cue.z, d.x, d.z).t;

    if (hitBall && tBall < tWall) {
        const gx = cue.x + d.x * tBall, gz = cue.z + d.z * tBall;
        setLine(ud.aimLine, cue.x + d.x * CFG.R, cue.z + d.z * CFG.R, gx, gz, y);
        ud.ghost.position.set(gx, y, gz);
        ud.ghost.visible = true;
        // 目标球预测方向
        let nx = hitBall.x - gx, nz = hitBall.z - gz;
        const nl = Math.hypot(nx, nz) || 1;
        nx /= nl; nz /= nl;
        if (objLen > 0) {
            let show = true;
            if (objLen > 1) {
                // 简单档：真实物理模拟轨迹（同 discrete 步长/碰撞/库边/袋口，构造性精确）
                const pw = state === 'charge' ? power : (power > 0.05 ? power : 0.6);
                const pq = Math.round(clamp(pw, 0.05, 1) * 25) / 25;   // 力度量化 0.04 控制重算频率
                const key = Math.atan2(d.z, d.x).toFixed(3) + '|' + pq.toFixed(2) + '|' +
                            spin.x.toFixed(1) + '|' + spin.y.toFixed(1) + '|' + shotSeq + '|' +
                            cue.x.toFixed(2) + ',' + cue.z.toFixed(2);
                if (guideSimCache.key !== key) {
                    const sim = simulateTrajectory(d.x, d.z, pq, spin.y, spin.x);
                    guideSimCache.key = key;
                    guideSimCache.path = (sim.first !== null && sim.path.length >= 2) ? sim.path : null;
                }
                show = !!guideSimCache.path;
                if (show) setPolyline(ud.objLine, guideSimCache.path, y);
            } else {
                setLine(ud.objLine, hitBall.x, hitBall.z, hitBall.x + nx * objLen, hitBall.z + nz * objLen, y);
            }
            ud.objLine.visible = show;
        } else ud.objLine.visible = false;
        // 母球分离方向（切线）
        const dot = d.x * nx + d.z * nz;
        let tx = d.x - dot * nx, tz = d.z - dot * nz;
        const tl = Math.hypot(tx, tz);
        if (tl > 0.15 && defLen > 0) {
            tx /= tl; tz /= tl;
            setLine(ud.defLine, gx, gz, gx + tx * defLen, gz + tz * defLen, y);
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
    shotSeq++;
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
// ---------------- 斯诺克规则 ----------------
// 当前目标：红球阶段 / 红球打进后的任选彩球 / 红球清完后的顺序彩球
function snookerTargets() {
    const redsLeft = balls.filter(b => !b.potted && snIsRed(b.num)).length;
    if (redsLeft > 0 || snooker.onColour)
        return snooker.onColour ? { category: 'colour', val: 4 } : { category: 'red', val: 1 };
    for (const c of SNK_COLOURS) {
        const b = balls.find(x => x.num === c.num);
        if (b && !b.potted) return { category: 'colourN', num: c.num, val: c.val };
    }
    return { category: 'colourN', num: 21, val: 7 };
}

function placeBallAt(b, x, z) {
    b.x = x; b.z = z; b.vx = 0; b.vz = 0;
    b.mesh.visible = true;
    b.mesh.scale.set(1, 1, 1);
    b.mesh.position.set(x, CFG.R, z);
}

function spotFree(x, z) {
    for (const o of balls) {
        if (o.potted) continue;
        if (Math.hypot(o.x - x, o.z - z) < 2 * CFG.R * 1.02) return false;
    }
    return true;
}

// 彩球重摆：自己的点 → 分值最高的可用点 → 沿黑球方向挪自己的点（官方规则简化版）
function spotBall(b) {
    const spots = [b.num, ...[...SNK_COLOURS].sort((a, c) => c.val - a.val).map(c => c.num)];
    for (const n of spots) {
        const s = SNK.spot[n];
        if (spotFree(s.x, s.z)) { placeBallAt(b, s.x, s.z); return; }
    }
    const s = SNK.spot[b.num];
    for (let d = 0.01; d < CFG.W; d += 0.01)
        if (spotFree(s.x + d, s.z)) { placeBallAt(b, s.x + d, s.z); return; }
    placeBallAt(b, s.x, s.z);
}

function respotSnookerColours(nums) {
    for (const n of nums) {
        if (!snIsColour(n)) continue;
        const b = balls.find(x => x.num === n);
        if (!b || !b.potted) continue;
        b.potted = false; b.fall = -1;
        spotBall(b);
    }
}

// 母球落袋 → 对方在 D 区内自由摆球
function restoreCueD() {
    const cue = cueBall();
    cue.potted = false; cue.fall = -1;
    const pts = [[SNK.baulkX - 0.02, 0]];
    for (let a = -80; a <= 80; a += 10) {
        const r = a * Math.PI / 180;
        pts.push([SNK.baulkX - SNK.dRad * Math.cos(r), SNK.dRad * Math.sin(r)]);
    }
    for (const [x, z] of pts)
        if (validCuePos(x, z)) { placeBallAt(cue, x, z); return; }
    placeBallAt(cue, SNK.baulkX - 0.02, 0);
}

function resolveSnookerShot() {
    const O = players[1 - current];
    const cuePotted = cueBall().potted;
    const potted = shot.potted.filter(n => n !== 0);
    isBreak = false;

    const on = snookerTargets();
    let foul = null, pen = 4;
    const bump = v => { pen = Math.max(pen, v); };
    if (on.category === 'colourN') bump(on.val);

    if (cuePotted) foul = '母球落袋';
    if (!foul && shot.first === null) foul = '空杆未触球';
    if (!foul && shot.first !== null) {
        const legal = on.category === 'red' ? snIsRed(shot.first)
                    : on.category === 'colour' ? snIsColour(shot.first)
                    : shot.first === on.num;
        if (!legal) { foul = '首触非目标球'; bump(snVal(shot.first)); }
    }
    for (const n of potted) {
        const ok = on.category === 'red' ? snIsRed(n)
                 : on.category === 'colour' ? snIsColour(n)
                 : n === on.num;
        if (!ok) { if (!foul) foul = '打进非目标球'; bump(snVal(n)); }
    }
    if (!foul && potted.length === 0 && !cuePotted && !shot.cushionAfter) foul = '触球后无球碰库';

    if (foul) {
        snooker.scores[1 - current] += pen;
        respotSnookerColours(potted);          // 犯规打进的红保持落袋、彩球全部重摆
        if (cuePotted) restoreCueD();
        snooker.onColour = false;
        switchPlayer(true);
        showMsg('犯规：' + foul + ' · ' + players[current].name + ' +' + pen + ' 分' + (cuePotted ? ' · D 区自由球' : ''), 4200);
        if (cuePotted) startBallInHand();
        else { state = 'aim'; setHint(aimHint()); }
        setRules(); refreshHUD(); maybeRunAI();
        return;
    }

    // 合法击球计分
    let gained = 0;
    const reds = potted.filter(snIsRed);
    const cols = potted.filter(snIsColour);
    if (on.category === 'red') {
        gained = reds.length;                  // 一杆可进多颗红，每颗 1 分
        snooker.onColour = reds.length > 0;
    } else if (on.category === 'colour') {
        gained = cols.reduce((s, n) => s + snVal(n), 0);
        respotSnookerColours(cols);            // 彩球阶段前打进就重摆
        snooker.onColour = false;
    } else {
        gained = on.val;                       // 顺序阶段：进袋不重摆
    }
    snooker.scores[current] += gained;

    // 终局：顺序阶段打进黑球
    if (on.category === 'colourN' && on.num === 21) {
        const [s0, s1] = snooker.scores;
        if (s0 === s1) {
            const b = balls.find(x => x.num === 21);
            b.potted = false; b.fall = -1;
            spotBall(b);                       // 平分：重摆黑球决胜
            showMsg('平分！重摆黑球决胜', 3200);
        } else {
            gameOver(s0 > s1 ? 0 : 1, '终局比分 ' + players[0].name + ' ' + s0 + ' : ' + s1 + ' ' + players[1].name);
            return;
        }
    }

    if (potted.length === 0) {
        snooker.onColour = false;
        switchPlayer(true);
        showMsg('未进球 → 轮到 ' + players[current].name, 2600);
    } else if (snooker.onColour) {
        showMsg('红球入袋 +' + gained + ' · 下一杆任选彩球（打进后重摆回点）', 3400);
    } else if (on.category === 'colour') {
        showMsg('彩球 +' + gained + '（已重摆）· 继续打红球', 3000);
    } else if (on.category === 'colourN') {
        showMsg(SNK_COLOURS[on.num - 16].name + ' +' + gained + ' · 继续', 2600);
    } else {
        showMsg('好球！继续击打', 1800);
    }
    state = 'aim';
    setHint(aimHint());
    setRules();
    refreshHUD();
    maybeRunAI();
}

function resolveShot() {
    if (gameMode === 'snooker') { resolveSnookerShot(); return; }
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
    let eightSpotted = false;
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
        eightSpotted = true;      // 开球进 8：重置后开球方仍续杆（WPA 3.3(e)）
    }

    // 花色分配：仅在非开球 + 开台 + 合法 + 进非 8 球（开球后桌面仍 open）
    let infoMsg = null;
    if (openTable && !wasBreak && !foul && pottedNon8.length > 0) {
        const firstType = ballType(pottedNon8[0]);
        P.group = firstType;
        O.group = firstType === 'solid' ? 'stripe' : 'solid';
        openTable = false;
        const gname = g => g === 'solid' ? '全色 ● 1-7' : '花色 ○ 9-15';
        infoMsg = P.name + ' 分到 ' + gname(P.group) + ' · ' + O.name + ' 拿 ' + gname(O.group);
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
        if (wasBreak) {
            // WPA 3.3(c)：开球进球且未犯规 → 开球方继续击打，台面保持 open
            // WPA 3.3(d)：开球无球落袋 → 换对手击打（旧版"开球必续"是错的）
            cont = pottedNon8.length > 0 || eightSpotted;
        }
        else if (openTable)                     cont = pottedNon8.length > 0;   // 开放台面：进任意非 8 球即续
        else if (groupRemaining(P.group) === 0) cont = false;                     // 打 8 阶段：没进 8（未犯规）也换人，进 8 已在上面直接结算胜负
        else                                    cont = pottedNon8.some(n => ballType(n) === P.group);
    }

    if (foul) {
        // 换人时必须静默，否则"轮到 xxx"会立刻把犯规原因顶掉，玩家看不到自己为什么被罚
        switchPlayer(true);
        showMsg('犯规：' + foulMsg + ' → ' + players[current].name + ' 自由球', 3800);
        startBallInHand();
    } else if (cont) {
        if (infoMsg) {
            showMsg(infoMsg + ' · 继续击打', 4000);
        } else if (wasBreak) {
            showMsg(pottedNon8.length > 0
                ? '开球进球 · 台面仍开放（花色未定）· 继续击打，下一杆合法进球才定花色'
                : '开球黑 8 入袋已重置回置球点 · 继续击打', 4000);
        } else {
            showMsg('好球！继续击打', 1800);
        }
        state = 'aim';
    } else {
        switchPlayer(true);
        showMsg(infoMsg
            ? infoMsg + ' → 轮到 ' + players[current].name
            : (wasBreak ? '开球未进球 → 轮到 ' + players[current].name
                        : '轮到 ' + players[current].name), 2600);
        state = 'aim';
    }
    setHint(aimHint());
    setRules();
    refreshHUD();
    maybeRunAI();
}

function isLegalFirstContact(num) {
    if (num === 0) return false;
    if (gameMode === 'snooker') {
        const on = snookerTargets();
        if (on.category === 'red') return snIsRed(num);
        if (on.category === 'colour') return snIsColour(num);
        return num === on.num;
    }
    if (openTable) {
        if (isBreak) return true;        // 开球：首触任意合法
        return num !== 8;                // 开台后：首触不能是 8
    }
    const g = players[current].group;
    if (!g) return num !== 8;
    if (groupRemaining(g) === 0) return num === 8;
    return ballType(num) === g;
}

function switchPlayer(quiet) {
    current = 1 - current;
    if (!quiet) showMsg('轮到 ' + players[current].name, 1800);
}

// 底部提示：把"台面开放 / 该打黑 8"这类关键状态直接写在瞄准提示里，
// 免得玩家打完球不知道自己的花色为什么还没定
function aimHint() {
    if (state === 'ballinhand') return gameMode === 'snooker'
        ? '自由球：点击 D 区（弧线内）放置母球'
        : '自由球：移动鼠标选择位置，点击台面放置母球';
    if (gameMode === 'snooker') {
        const on = snookerTargets();
        if (on.category === 'red') return '目标：红球（1 分）· 进球后下一杆任选彩球';
        if (on.category === 'colour') return '目标：任选彩球（黄2 绿3 棕4 蓝5 粉6 黑7）· 进袋重摆后再打红球';
        return '红球清完：按 黄→绿→棕→蓝→粉→黑 顺序清彩球（不再重摆）';
    }
    const P = players[current];
    if (openTable) return '台面开放（花色未定）：可先打任意球（黑 8 除外）· 下一杆合法进球即定花色';
    if (P.group && groupRemaining(P.group) === 0) return '已清台：瞄准黑 8 收尾（打进即胜，母球落袋判负）';
    return '移动鼠标瞄准 · 按住蓄力 · 松开出杆';
}

function legalTargetBalls() {
    if (gameMode === 'snooker') {
        const on = snookerTargets();
        if (on.category === 'red') return balls.filter(b => !b.potted && snIsRed(b.num));
        if (on.category === 'colour') return balls.filter(b => !b.potted && snIsColour(b.num));
        return balls.filter(b => !b.potted && b.num === on.num);
    }
    const g = players[current].group;
    if (openTable) {
        if (isBreak) return balls.filter(b => !b.potted && b.num !== 0);   // 开球含 8
        return balls.filter(b => !b.potted && b.num !== 8 && b.num !== 0);
    }
    if (!g || groupRemaining(g) > 0) return balls.filter(b => !b.potted && b.num !== 0 && b.type === g);
    return balls.filter(b => !b.potted && b.num === 8);   // 打黑 8
}

// ---- 左下角「怎么打」规则说明卡 ----
// 目标球小图标（复用 HUD 的 .mini-ball 样式）
function miniBallHTML(n) {
    const col = BALL_COLORS[n];
    const style = n > 8
        ? `background:linear-gradient(180deg,#f4f0e4 22%,${col} 22%,${col} 78%,#f4f0e4 78%)`
        : `background:${col === '#1b1b1b' ? '#1b1b1b;color:#fff' : col}`;
    return `<span class="mini-ball" style="${style}">${n}</span>`;
}

// 三行说明：该打哪颗 / 怎样算合法 / 怎样算犯规（与 resolveShot 的判罚严格一致）
function snookerRuleHint() {
    const on = snookerTargets();
    if (on.category === 'red') return {
        target: '<b>红球</b>（还剩 ' + balls.filter(b => !b.potted && snIsRed(b.num)).length + ' 颗 · 每颗 1 分）',
        legal: '母球先碰红球并打进 → 得 1 分，下一杆任选一颗彩球打',
        foul: '母球落袋 / 先碰彩球 / 打进彩球或空杆 → 对方 +4 分（按涉及球最高分值罚）',
    };
    if (on.category === 'colour') return {
        target: '<b>任选彩球</b>：黄2 · 绿3 · 棕4 · 蓝5 · 粉6 · 黑7',
        legal: '先碰任意彩球并打进 → 得该球分值，彩球重摆回点，然后继续打红球',
        foul: '母球落袋 / 先碰或打进红球 / 空杆 → 对方 +4 分起',
    };
    const c = SNK_COLOURS[on.num - 16];
    return {
        target: '红球清完！按顺序：<b>' + c.name + '</b>（' + on.val + ' 分 · 进袋不再重摆）',
        legal: '母球先碰这颗彩球并打进 → 得分，继续打下一颗彩球',
        foul: '母球落袋 / 碰错球 / 打进别的球 → 对方 +4 分起（按涉及球最高分值罚）',
    };
}

function ruleHint() {
    if (gameMode === 'snooker') return snookerRuleHint();
    const P = players[current];

    // ① 开球
    if (isBreak && openTable) {
        return {
            target: '<b>开球</b>：把母球打向对面的球堆（1~15 号都可先碰）',
            legal: '撞到球堆 + 有球落袋且不犯规 → 你继续击打（花色仍不定）',
            foul: '母球落袋 / 完全没碰到球 → 换对方，并拿到自由球',
        };
    }
    // ② 台面开放
    if (openTable) {
        return {
            target: '台面开放：任意球都可以打（<b>黑 8 除外</b>）· 先合法打进哪一组，那一组就归你',
            legal: '母球先碰到任意非 8 号球；进球即定花色，并继续击打',
            foul: '母球落袋 / 母球先碰到黑 8 / 触球后无球碰库 → 换对方，并拿到自由球',
        };
    }
    // ③ 己方球已清完，进入打黑 8
    if (P.group && groupRemaining(P.group) === 0) {
        return {
            target: '<b>只剩黑 8</b>：把它打进就赢',
            legal: '母球先碰到黑 8 并把它打进，且母球不落袋 → 获胜',
            foul: '打黑 8 时母球落袋 / 黑 8 被提前打进 → 直接判负',
        };
    }
    // ④ 花色已定，还有球
    const gname = P.group === 'solid' ? '全色 ●' : '花色 ○';
    const nums = legalTargetBalls().map(b => b.num).sort((a, b) => a - b);
    return {
        target: `你的球是 <b>${gname}</b>（还剩 ${nums.length} 颗）：`
            + `<span class="rule-balls">${nums.map(miniBallHTML).join('')}</span>`,
        legal: '母球先碰到自己的球；打进自己的球即可继续击打',
        foul: '母球落袋 / 先碰到对方的球或黑 8 / 触球后无球碰库 → 换对方，并拿到自由球',
    };
}

function setRules() {
    const r = ruleHint();
    $('rule-target').innerHTML = r.target;
    $('rule-legal').innerHTML = r.legal;
    $('rule-foul').innerHTML = r.foul;
}

// ---------------- 自由球 ----------------
function startBallInHand() {
    state = 'ballinhand';
    setHint(gameMode === 'snooker'
        ? '自由球：点击 D 区（弧线内）放置母球'
        : '自由球：移动鼠标选择位置，点击台面放置母球');
    setRules();
    ghostCue.visible = true;
}

function validCuePos(x, z) {
    const R = CFG.R;
    if (Math.abs(x) > CFG.W / 2 - R || Math.abs(z) > CFG.H / 2 - R) return false;
    if (gameMode === 'snooker') {
        // 斯诺克自由球只能放在 D 区半圆内（置球区线之后）
        if (x > SNK.baulkX + 0.001) return false;
        if (Math.hypot(x - SNK.baulkX, z) > SNK.dRad - R * 0.5) return false;
    }
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
    setHint(aimHint());
    setRules();
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
                if (state === 'charge') {
                    spin = { x: 0, y: plan.vert || 0 };   // AI 的高低杆走位
                    shoot(plan.power);
                }
            });
        });
    });
}

function segBlocked(x1, z1, x2, z2, rad, ignore) {
    const dx = x2 - x1, dz = z2 - z1;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-9) return false;
    for (const b of balls) {
        // 母球不能挡自己：线段起点就是母球中心（t=0 距离恒为 0），
        // 不排除的话所有进攻候选全部被判"路径被挡"——AI 只会直线轻推的根因
        if (b.potted || b.num === 0 || ignore.includes(b.num)) continue;
        const t = clamp(((b.x - x1) * dx + (b.z - z1) * dz) / len2, 0, 1);
        const px = x1 + dx * t, pz = z1 + dz * t;
        if (Math.hypot(b.x - px, b.z - pz) < rad) return true;
    }
    return false;
}

// ---------------- AI 脑内模拟（前瞻搜索） ----------------
// 克隆当前局面、静音音效，把一杆的完整物理在"脑内"跑完；不渲染、不动真实状态。
function simulateShot(dirX, dirZ, powerFrac, vertSpin = 0) {
    const savedBalls = balls, savedShot = shot, savedDir = shotDirStore;
    const sBH = SFX.ballHit, sCU = SFX.cushion, sPO = SFX.pocket;
    SFX.ballHit = () => {}; SFX.cushion = () => {}; SFX.pocket = () => {};
    balls = balls.map(b => ({
        num: b.num, type: b.type, x: b.x, z: b.z, vx: 0, vz: 0,
        potted: b.potted, vertSpin: 0, sideSpin: 0, fall: 0, pocket: null, mesh: null,
    }));
    shot = { first: null, potted: [], cushionAfter: false, preGroupCleared: false };
    shotDirStore = { x: dirX, z: dirZ };
    const c = balls[0];
    const v = CFG.minPower + powerFrac * (CFG.maxPower - CFG.minPower);
    c.vx = dirX * v; c.vz = dirZ * v; c.vertSpin = vertSpin;
    let res;
    try {
        for (let i = 0; i < 3600; i++) if (!physStep(CFG.dt)) break;
        res = { potted: shot.potted.slice(), first: shot.first, cushionAfter: shot.cushionAfter, balls };
    } finally {
        balls = savedBalls; shot = savedShot; shotDirStore = savedDir;
        SFX.ballHit = sBH; SFX.cushion = sCU; SFX.pocket = sPO;
    }
    return res;
}

// 简单档辅助线专用：用与真实出杆完全相同的 physStep（同碰撞/库边/袋口/摩擦/旋转）
// 把这一杆真的跑一遍，返回目标球（首次被母球接触的球）的真实轨迹。
// 玩家出杆没有随机噪声，方向确定 → 模拟轨迹 = 真实轨迹（构造性精确，无几何近似误差）。
function simulateTrajectory(dirX, dirZ, powerFrac, vertSpin = 0, sideSpin = 0) {
    const savedBalls = balls, savedShot = shot, savedDir = shotDirStore;
    const sBH = SFX.ballHit, sCU = SFX.cushion, sPO = SFX.pocket;
    SFX.ballHit = () => {}; SFX.cushion = () => {}; SFX.pocket = () => {};
    balls = balls.map(b => ({
        num: b.num, type: b.type, x: b.x, z: b.z, vx: 0, vz: 0,
        potted: b.potted, vertSpin: 0, sideSpin: 0, fall: 0, pocket: null, mesh: null,
    }));
    shot = { first: null, potted: [], cushionAfter: false, preGroupCleared: false };
    shotDirStore = { x: dirX, z: dirZ };
    const c = balls[0];
    const v = CFG.minPower + powerFrac * (CFG.maxPower - CFG.minPower);
    c.vx = dirX * v; c.vz = dirZ * v; c.vertSpin = vertSpin; c.sideSpin = sideSpin;
    let first = null, path = [];
    try {
        let tb = null, lastX = 0, lastZ = 0;
        for (let i = 0; i < 3600; i++) {
            if (!physStep(CFG.dt)) break;
            if (tb === null) {
                if (shot.first === null) { if (c.potted) break; continue; }
                first = shot.first;
                tb = balls.find(b => b.num === first);
                lastX = tb.x; lastZ = tb.z;
                path.push([lastX, lastZ]);
            }
            if (tb.potted) { path.push([tb.x, tb.z]); break; }         // 进袋：终点在袋喉
            if (Math.hypot(tb.x - lastX, tb.z - lastZ) >= 0.06) {
                lastX = tb.x; lastZ = tb.z;
                if (path.length < 250) path.push([lastX, lastZ]);
            }
            if (tb.vx === 0 && tb.vz === 0) break;                     // 摩擦停下
        }
        if (tb !== null) path.push([tb.x, tb.z]);                      // 末点必录
        if (path.length > 250) path = path.slice(0, 250);
    } finally {
        balls = savedBalls; shot = savedShot; shotDirStore = savedDir;
        SFX.ballHit = sBH; SFX.cushion = sCU; SFX.pocket = sPO;
    }
    return { first, path };
}

function segBlockedIn(arr, x1, z1, x2, z2, rad, ignore) {
    const dx = x2 - x1, dz = z2 - z1;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-9) return false;
    for (const b of arr) {
        if (b.potted || ignore.includes(b.num)) continue;
        const t = clamp(((b.x - x1) * dx + (b.z - z1) * dz) / len2, 0, 1);
        const px = x1 + dx * t, pz = z1 + dz * t;
        if (Math.hypot(b.x - px, b.z - pz) < rad) return true;
    }
    return false;
}

// 从 (bx,bz) 出发对 arr 中 nums 这些球的最佳几何进球分（评估走位 / 防守价值）
function geoBestScore(bx, bz, arr, nums) {
    let bestS = 0;
    for (const n of nums) {
        const b = arr.find(x => x.num === n);
        if (!b || b.potted) continue;
        for (const p of POCKETS) {
            let pdx = p.x - b.x, pdz = p.z - b.z;
            const pl = Math.hypot(pdx, pdz);
            if (pl < 1e-6) continue;
            pdx /= pl; pdz /= pl;
            const gx = b.x - pdx * 2 * CFG.R, gz = b.z - pdz * 2 * CFG.R;
            let adx = gx - bx, adz = gz - bz;
            const al = Math.hypot(adx, adz);
            if (al < 1e-6) continue;
            adx /= al; adz /= al;
            const cosCut = adx * pdx + adz * pdz;
            if (cosCut < 0.2) continue;
            if (segBlockedIn(arr, bx, bz, gx, gz, 2 * CFG.R * 0.96, [b.num])) continue;
            if (segBlockedIn(arr, b.x, b.z, p.x, p.z, 2 * CFG.R * 0.92, [b.num])) continue;
            const sc = cosCut * cosCut * cosCut / (0.25 + al + pl * 1.6);
            if (sc > bestS) bestS = sc;
        }
    }
    return bestS;
}

// 给一杆的模拟结果打分：进球收益 - 犯规惩罚 ± 走位 / 防守价值
function scoreSim(res, ctx) {
    const pottedSet = new Set(res.potted);
    const sb = res.balls;
    const cueEnd = sb[0];
    let val = 0;

    const firstLegal = res.first !== null && isLegalFirstContact(res.first);
    const scratch = cueEnd.potted;

    // 8 号球：合法打赢 / 提前送 = 输
    if (pottedSet.has(8)) {
        const onEight = ctx.my && ctx.myRemBefore === 0;
        if (onEight && !scratch && firstLegal) return 2000;
        return -1200;
    }

    let ownPots = 0, oppPots = 0;
    for (const n of res.potted) {
        if (n === 0) continue;
        if (ctx.my && ballType(n) === ctx.my) ownPots++;
        else if (!ctx.my && n !== 8) ownPots++;     // 台面开放：进的都算机会
        else oppPots++;
    }
    val += ownPots * 130 - oppPots * 70;
    if (!firstLegal) val -= 350;
    if (scratch) val -= 450;

    if (ownPots > 0 && !scratch && firstLegal) {
        // 进攻成功 → 评估走位：终局母球打下一颗球的质量
        const remainNums = [];
        for (const b of sb) {
            if (b.potted || b.num === 0 || b.num === 8) continue;
            if (!ctx.my || ballType(b.num) === ctx.my) remainNums.push(b.num);
        }
        if (!remainNums.length) val += 160;                        // 自己的球清完了，下一杆打 8
        else val += Math.min(geoBestScore(cueEnd.x, cueEnd.z, sb, remainNums) * 220, 110);
    } else if (ownPots === 0 && !scratch) {
        // 没进球 → 防守价值 = 让对手下一杆有多难受
        const oppNums = [];
        for (const b of sb) {
            if (b.potted || b.num === 0) continue;
            if (ctx.opp && ballType(b.num) === ctx.opp) oppNums.push(b.num);
            else if (!ctx.opp && b.num !== 8) oppNums.push(b.num);
        }
        const oppNext = oppNums.length ? geoBestScore(cueEnd.x, cueEnd.z, sb, oppNums) : 0;
        val += 8 - oppNext * 90;
    }
    return val;
}

function aiChooseShot() {
    const cue = cueBall();
    const targets = legalTargetBalls();
    if (!targets.length || cue.potted) return null;
    const sigma = [0.035, 0.014, 0.005][aiLevel];
    const cutMin = [0.22, 0.28, 0.30][aiLevel];

    // ---- 开球：直线全力冲球堆最前沿 ----
    if (isBreak) {
        let apex = null, ad = Infinity;
        for (const b of targets) {
            const d = Math.hypot(b.x - cue.x, b.z - cue.z);
            if (d < ad) { ad = d; apex = b; }
        }
        if (apex) {
            const a = Math.atan2(apex.z - cue.z, apex.x - cue.x) + gauss() * sigma;
            return { dir: { x: Math.cos(a), z: Math.sin(a) }, power: 0.97 };
        }
    }

    // ---- 收集候选：(球, 袋) 几何组合 ----
    const cands = [];
    for (const b of targets) {
        for (const p of POCKETS) {
            let pdx = p.x - b.x, pdz = p.z - b.z;
            const pl = Math.hypot(pdx, pdz);
            if (pl < 1e-6) continue;
            pdx /= pl; pdz /= pl;
            const gx = b.x - pdx * 2 * CFG.R, gz = b.z - pdz * 2 * CFG.R;
            let adx = gx - cue.x, adz = gz - cue.z;
            const al = Math.hypot(adx, adz);
            if (al < 1e-6) continue;
            adx /= al; adz /= al;
            const cosCut = adx * pdx + adz * pdz;
            if (cosCut < 0.18) continue;
            if (segBlocked(cue.x, cue.z, gx, gz, 2 * CFG.R * 0.96, [b.num])) continue;
            if (segBlocked(b.x, b.z, p.x, p.z, 2 * CFG.R * 0.92, [b.num])) continue;
            const geo = cosCut * cosCut * cosCut / (0.25 + al + pl * 1.6);
            cands.push({ dir: { x: adx, z: adz }, dist: al + pl, cosCut, geo });
        }
    }
    cands.sort((a, b) => b.geo - a.geo);

    // ---- 简单难度 / 斯诺克：一步几何决策（scoreSim 是 8 球花色专用，斯诺克不适用） ----
    if (aiLevel === 0 || gameMode === 'snooker') {
        const best = cands.find(c => c.cosCut >= cutMin);
        if (best) {
            const v = clamp(1.5 + best.dist * 2.3 / Math.max(best.cosCut, 0.32), 1.7, 7.4);
            const powerFrac = (v - CFG.minPower) / (CFG.maxPower - CFG.minPower);
            const a = Math.atan2(best.dir.z, best.dir.x) + gauss() * sigma;
            return { dir: { x: Math.cos(a), z: Math.sin(a) }, power: clamp(powerFrac, 0.10, 0.95) };
        }
        return aiDefense(targets, sigma);
    }

    // ---- 普通/困难：脑内模拟搜索（进攻候选 + 防守候选同一评分体系） ----
    const P = players[current];
    const ctx = {
        my: P.group,
        opp: players[1 - current].group,
        myRemBefore: P.group ? groupRemaining(P.group) : 99,
    };
    const aims = cands.slice(0, aiLevel === 2 ? 9 : 7);
    const powers = aiLevel === 2 ? [0.35, 0.62, 0.9] : [0.45, 0.8];
    let bestPlan = null, bestVal = -Infinity;
    for (const c of aims) {
        // 高低杆只对较直的球有意义（薄球走位意义不大，省算力）
        const spinList = aiLevel === 2 && c.cosCut > 0.55 ? [0, 0.55, -0.55] : [0];
        for (const pf of powers) {
            for (const sy of spinList) {
                const res = simulateShot(c.dir.x, c.dir.z, pf, sy);
                const val = scoreSim(res, ctx) + gauss() * (aiLevel === 2 ? 0.6 : 2.5);
                if (val > bestVal) { bestVal = val; bestPlan = { dir: c.dir, power: pf, vert: sy }; }
            }
        }
    }

    // ---- 防守候选：轻推最近合法球，多档力度进同一评分体系 ----
    let nb = null, nd = Infinity;
    for (const b of targets) {
        const d = Math.hypot(b.x - cue.x, b.z - cue.z);
        if (d < nd) { nd = d; nb = b; }
    }
    if (nb) {
        const da = Math.atan2(nb.z - cue.z, nb.x - cue.x);
        const ddir = { x: Math.cos(da), z: Math.sin(da) };
        for (const pf of [0.10, 0.18, 0.28]) {
            const res = simulateShot(ddir.x, ddir.z, pf, 0);
            const val = scoreSim(res, ctx) + gauss() * (aiLevel === 2 ? 0.6 : 2.5);
            if (val > bestVal) { bestVal = val; bestPlan = { dir: ddir, power: pf, vert: 0 }; }
        }
    }
    if (!bestPlan) return aiDefense(targets, sigma);

    // 噪声复验：评分时用的是理想方向，实际出杆带瞄准噪声。
    // 对决胜球（如打黑8）毫厘之差就是胜负，所以从理想线 + 3 个噪声样本里
    // 选模拟实测最优的那个方向——保证"选出来的就是打出来的"。
    const vert = bestPlan.vert || 0;
    let bdir = bestPlan.dir;
    let bval = scoreSim(simulateShot(bdir.x, bdir.z, bestPlan.power, vert), ctx);
    for (let k = 0; k < 3; k++) {
        const a0 = Math.atan2(bestPlan.dir.z, bestPlan.dir.x) + gauss() * sigma;
        const d = { x: Math.cos(a0), z: Math.sin(a0) };
        const v = scoreSim(simulateShot(d.x, d.z, bestPlan.power, vert), ctx);
        if (v > bval) { bval = v; bdir = d; }
    }
    return { dir: bdir, power: clamp(bestPlan.power, 0.10, 0.95), vert };
}

// 兜底防守：轻碰最近合法球（简单难度 & 极端局面用）
function aiDefense(targets, sigma) {
    const cue = cueBall();
    let nb = null, nd = Infinity;
    for (const b of targets) {
        const d = Math.hypot(b.x - cue.x, b.z - cue.z);
        if (d < nd) { nd = d; nb = b; }
    }
    if (!nb) return null;
    const a = Math.atan2(nb.z - cue.z, nb.x - cue.x) + gauss() * sigma * 0.4;
    const v = clamp(1.9 + nd * 1.3, 1.9, 3.8);
    const powerFrac = (v - CFG.minPower) / (CFG.maxPower - CFG.minPower);
    return { dir: { x: Math.cos(a), z: Math.sin(a) }, power: clamp(powerFrac, 0.10, 0.45) };
}

function aiPlaceCue() {
    const targets = legalTargetBalls();
    // 评分制：遍历所有 (目标球, 袋口, 后退距离) 组合，选整体进球条件最好的摆位。
    // 摆在「球—袋连线正后方」= 直线球（切角 1），所以评分主要看袋口远近 + 路径通畅。
    let best = null, bestScore = -Infinity;
    for (const b of targets) {
        for (const p of POCKETS) {
            let dx = b.x - p.x, dz = b.z - p.z;
            const l = Math.hypot(dx, dz) || 1;
            dx /= l; dz /= l;
            for (const back of [0.35, 0.55, 0.8]) {
                const cx = b.x + dx * back, cz = b.z + dz * back;
                if (!validCuePos(cx, cz)) continue;
                if (segBlocked(cx, cz, b.x, b.z, 2 * CFG.R * 0.96, [b.num])) continue;
                const score = 1 / (0.3 + l);
                if (score > bestScore) { bestScore = score; best = { cx, cz }; }
            }
        }
    }
    if (best && tryPlaceCue(best.cx, best.cz)) return;
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
    if (gameMode === 'snooker') {
        const redsLeft = balls.filter(b => !b.potted && snIsRed(b.num)).length;
        const seq = redsLeft === 0 && !snooker.onColour;
        for (let i = 0; i < 2; i++) {
            const P = players[i];
            $('pp' + (i + 1) + '-name').textContent = P.name;
            const gEl = $('pp' + (i + 1) + '-group');
            const wrap = $('pp' + (i + 1) + '-balls');
            $('pp' + (i + 1)).classList.toggle('active', i === current && state !== 'over');
            gEl.classList.remove('open');
            gEl.textContent = '得分 ' + snooker.scores[i];
            let html = '';
            if (!seq) html += '<span class="mini-ball" style="background:#d31820;color:#fff">红' + redsLeft + '</span>';
            html += SNK_COLOURS.map(c => {
                const b = balls.find(x => x.num === c.num);
                const down = seq && b && b.potted;
                return `<span class="mini-ball ${down ? 'down' : ''}" style="background:${c.color === '#1b1b1b' ? '#1b1b1b;color:#fff' : c.color}">${c.val}</span>`;
            }).join('');
            wrap.innerHTML = html;
        }
        $('turn-label').textContent = state === 'over' ? '对局结束'
            : '轮到 ' + players[current].name + (aiActive() && players[current].isAI ? ' (思考中…)' : '');
        return;
    }
    for (let i = 0; i < 2; i++) {
        const P = players[i];
        $('pp' + (i + 1) + '-name').textContent = P.name;
        const gEl = $('pp' + (i + 1) + '-group');
        const wrap = $('pp' + (i + 1) + '-balls');
        const panel = $('pp' + (i + 1));
        panel.classList.toggle('active', i === current && state !== 'over');
        if (openTable) {
            gEl.textContent = '台面开放 · 花色未定';
            gEl.classList.add('open');
            wrap.innerHTML = '';
        } else {
            gEl.classList.remove('open');
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
            shoot(clamp(power, 0.05, 1));   // 用屏幕上显示的当前力度，所见即所得
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
        if (state === 'menu' || state === 'over') return;   // 菜单/结算界面 players 可能未初始化
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
        if (e.target && e.target.tagName === 'INPUT') return;   // 昵称输入框里正常打字
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

    // 蓄力（三角波：慢升到满 → 慢降回 0 → 循环）
    if (state === 'charge') {
        power = chargePowerAt(now);
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
function startGame(_vsAI, level, mode) {
    vsAI = _vsAI;
    aiLevel = level;
    gameMode = mode || 'pool8';
    snooker = gameMode === 'snooker' ? { scores: [0, 0], onColour: false } : null;
    rebuildPockets();
    if (snookerDecal) snookerDecal.visible = gameMode === 'snooker';
    players = [
        { name: customNames[0].trim() || '玩家 1', group: null, isAI: false },
        vsAI ? { name: '电脑', group: null, isAI: true }
             : { name: customNames[1].trim() || '玩家 2', group: null, isAI: false },
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
    setHint(aimHint());
    setRules();
    showMsg(gameMode === 'snooker'
        ? '斯诺克开球！' + players[0].name + ' 先手 · 先打红球（1 分），红彩交替积累分数'
        : '开球！' + players[0].name + ' 先手 · 台面开放，任意球可先打（黑 8 除外）', 3200);
    refreshHUD();
}

function initMenu() {
    let mode = 'ai';
    let gameType = 'pool8';
    document.querySelectorAll('.game-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.game-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            gameType = btn.dataset.game;
            $('menu-sub').textContent = gameType === 'snooker'
                ? '斯诺克规则 · 15 红 6 彩 · Three.js 实时渲染'
                : '八球规则 · Three.js 实时渲染';
        });
    });
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
    // 昵称输入：人机模式玩家2固定"电脑"，双人模式可自定义
    function applyNameMode(m) {
        const p2 = $('name-p2');
        if (m === 'ai') { p2.disabled = true; p2.value = ''; p2.placeholder = '电脑'; }
        else { p2.disabled = false; p2.placeholder = '玩家 2 昵称'; }
    }
    applyNameMode(mode);
    $('btn-mode-ai').addEventListener('click', () => applyNameMode('ai'));
    $('btn-mode-pvp').addEventListener('click', () => applyNameMode('pvp'));
    // 输入框里回车直接开始
    document.querySelectorAll('.name-input').forEach(inp => {
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-start').click(); });
    });
    $('btn-start').addEventListener('click', () => {
        SFX.unlock();
        // 注意：data-diff="0"（简单）解析出 0 是合法值，不能写 "|| 1"（0 为 falsy 会被顶成普通档）
        const parsed = parseInt(document.querySelector('.diff-btn.selected').dataset.diff, 10);
        const level = Number.isNaN(parsed) ? 1 : parsed;
        customNames = [$('name-p1').value, $('name-p2').value];
        startGame(mode === 'ai', level, gameType);
    });
    $('btn-again').addEventListener('click', () => startGame(vsAI, aiLevel, gameMode));
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
    buildSnookerDecal();
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
    set current(v) { current = v; },
    get players() { return players; },
    get openTable() { return openTable; },
    set openTable(v) { openTable = v; },
    get isBreak() { return isBreak; },
    set isBreak(v) { isBreak = v; },
    get gameMode() { return gameMode; },
    get snooker() { return snooker; },
    get power() { return power; },
    chargePowerAt, maybeRunAI, aiChooseShot, simulateShot, scoreSim,
    startGame, shoot, aimDir, setRules, ruleHint,
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
    // 调试：拿到场景对象（排查渲染问题时染色用）
    get scene() { return scene; },
    // 测试用：辅助线
    updateGuide,
    simulateTrajectory,
    get guideGroup() { return guideGroup; },
    // 调试：相机对象（验证默认机位用）
    get camera() { return camera; },
};

})();
