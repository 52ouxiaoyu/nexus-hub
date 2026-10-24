/* ============================================================
 * 羊羊叠叠消 Sheep Stack Match  v1.1.0
 * 玩法：层叠卡牌 + 7 格槽位三消（类羊了个羊玩法，原创实现）
 * 特性：L1 教学关（有解发牌）；L2 起地狱难度（三深度带深埋）；
 *       无广告，道具免费限量
 * 句柄：window.__sheep（自动化测试用）
 * ============================================================ */
(function () {
'use strict';

// ---------- 常量 ----------
const T = 54;              // 牌边长
const PITCH = 58;          // 同层间距（同层不重叠）
const HALF = PITCH / 2;    // 相邻层错位
const LAYER_DY = 15;       // 相邻层 y 错位
const COLS = 6, ROWS = 6;  // 底层网格
const BOARD_W = COLS * PITCH + T - PITCH + 0; // 400 区域宽
const SLOT_N = 7;          // 槽位数
const OUT_N = 3;           // 移出暂存位数

// 方块种类（原创皮肤：通用 emoji）
const TYPES = [
  { e: '🐑', c: '#e8f0d8' }, { e: '🥕', c: '#ffe8d0' }, { e: '🍎', c: '#ffdcdc' },
  { e: '🌽', c: '#fff3c4' }, { e: '🍇', c: '#ecd8f5' }, { e: '🐟', c: '#d8ecf5' },
  { e: '🍄', c: '#f5dcd8' }, { e: '🧀', c: '#fff0bd' }, { e: '🌶️', c: '#fdd6d6' },
  { e: '🍞', c: '#f5e6cd' }, { e: '🌿', c: '#ddf0d0' }, { e: '🥦', c: '#d8f0dc' },
  { e: '🌰', c: '#ecdfc8' }, { e: '🌻', c: '#fff3cf' },
];

// 关卡配置：L1 新手教学（有解发牌）；L2 起地狱难度（同类三张深埋三个深度带，
// 还原原版「第一关就是最后一关」的卡关体验）
function levelConf(lv) {
  if (lv <= 1) {
    return { n: 45, types: 4, layers: 3, spread: false,
             undo: 3, out: 1, shuffle: 1 };
  }
  const n = Math.min(120 + (lv - 2) * 15, 150);
  const types = Math.min(11 + (lv - 2), TYPES.length);
  const layers = Math.min(7 + (lv - 2), 9);
  return { n: Math.round(n / 3) * 3, types, layers, spread: true,
           undo: 3, out: 1, shuffle: 1 };
}

// ---------- 状态 ----------
const G = {
  state: 'MENU',            // MENU | PLAY | WIN | LOSE
  level: 1,
  best: +(localStorage.getItem('sheepStackBest') || 1),
  tiles: [],                // {id,type,x,y,layer,state:'board'|'slot'|'out'|'gone',el}
  slot: [],                 // 槽位（tile id，按类型聚排）
  out: [],                  // 移出暂存（tile id）
  helpers: { undo: 0, out: 0, shuffle: 0 },
  history: [],              // 撤回快照
  score: 0,
  busy: false,
};

const $ = (s) => document.querySelector(s);
const board = $('#board'), slotBar = $('#slotBar'), outBar = $('#outBar');

// ---------- 发牌 ----------
// positions：分层布局；sortIndex：0 = 最顶层（最先可拿），rank = N-1-idx = 消除顺序。
// 教学关用"连续三元组"（严格按序拿牌槽位峰值 ≤4，保证有解）；
// 地狱关用"三深度带交错"（同类三张分埋顶/中/底，难度对齐原版第二关）。
function genLayout(conf) {
  const layers = conf.layers;
  const layPos = [];
  let maxRight = 0, maxBottom = 0;
  for (let i = 0; i < layers; i++) {
    const cols = Math.max(3, COLS - Math.floor(i * 0.8));
    const rows = Math.max(3, ROWS - Math.floor(i * 0.6));
    const cells = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) cells.push([c, r]);
    // 层整体居中 + 隔层错位（底层在下，越往上 y 越小 → dy 随层数减小）
    const dx = (BOARD_W - (cols - 1) * PITCH - T) / 2 + (i % 2) * (HALF - 4);
    const dy = 6 + (conf.layers - 1 - i) * LAYER_DY;
    layPos.push({ cells, cols, rows, dx, dy });
    maxRight = Math.max(maxRight, dx + (cols - 1) * PITCH + T);
    maxBottom = Math.max(maxBottom, dy + (rows - 1) * PITCH + T);
  }
  return { layPos, maxRight, maxBottom };
}

function deal(conf) {
  const { layPos, maxRight, maxBottom } = genLayout(conf);
  board.style.width = maxRight + 'px';
  board.style.height = maxBottom + 'px';
  $('#boardWrap').style.width = (maxRight + 6) + 'px';

  // 1) 各层分配数量（底层多、顶层少），并夹到每层格子容量内
  const L = conf.layers;
  const w = []; let wSum = 0;
  for (let i = 0; i < L; i++) { w.push(1 + (L - 1 - i) * 0.45); wSum += w[i]; }
  const counts = w.map((x, i) =>
    Math.min(Math.round(conf.n * x / wSum), layPos[i].cells.length));
  let diff = conf.n - counts.reduce((a, b) => a + b, 0);
  for (let guard = 0; diff !== 0 && guard < 500; guard++) {
    let changed = false;
    if (diff > 0) {          // 差额优先回填底层（剩余容量最大）
      for (let i = 0; i < L && diff > 0; i++)
        if (counts[i] < layPos[i].cells.length) { counts[i]++; diff--; changed = true; }
    } else {                 // 多了就从顶层往下扣
      for (let i = L - 1; i >= 0 && diff < 0; i--)
        if (counts[i] > 0) { counts[i]--; diff++; changed = true; }
    }
    if (!changed) break;     // 容量耗尽，接受少量缺牌（仍保证 3 的倍数）
  }

  // 2) 收集位置（底层→顶层），打乱层内格子；总数强制为 3 的倍数
  const positions = [];
  for (let i = 0; i < L; i++) {
    const lp = layPos[i];
    const cells = lp.cells.slice().sort(() => Math.random() - .5).slice(0, counts[i]);
    for (const [c, r] of cells)
      positions.push({ x: lp.dx + c * PITCH, y: lp.dy + r * PITCH, layer: i });
  }
  positions.length = positions.length - (positions.length % 3);
  // positions[0..] = 底层先入列；sortIndex = N-1-idx → 顶层最先
  const N = positions.length;
  positions.forEach((p, idx) => { p.sortIndex = N - 1 - idx; });

  // 3) 类型分配（K = N/3 组，类型表打散后循环取用）
  //    - 教学关（spread=false）：连续三元组——消除顺序上相邻，严格按序拿牌必通关
  //    - 地狱关（spread=true）：第 t 组占消除顺序 rank ∈ {t, t+K, t+2K}，
  //      即顶/中/底三个深度带各埋一张——手里一对要等埋在最底下的第三张
  const K = N / 3;
  const shuffledTypes = Array.from({ length: conf.types }, (_, i) => i)
    .sort(() => Math.random() - .5);
  const finalType = new Array(N);
  const put = (rank, type) => { finalType[N - 1 - rank] = type; }; // rank=消除序
  for (let t = 0; t < K; t++) {
    const type = shuffledTypes[t % conf.types];
    if (conf.spread) { put(t, type); put(t + K, type); put(t + 2 * K, type); }
    else { put(3 * t, type); put(3 * t + 1, type); put(3 * t + 2, type); }
  }

  // 4) 生成牌
  G.tiles = positions.map((p, idx) => ({
    id: idx, type: finalType[idx], sortIndex: p.sortIndex,
    x: p.x, y: p.y, layer: p.layer,
    state: 'board', el: null,
  }));
}

// ---------- 遮挡判定 ----------
function overlapRect(a, b) {
  const ox = Math.min(a.x + T, b.x + T) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + T, b.y + T) - Math.max(a.y, b.y);
  return ox > 10 && oy > 10;   // 视觉上明显压住才算
}
function isBlocked(tile) {
  if (tile.state !== 'board') return false;
  for (const o of G.tiles) {
    if (o.state !== 'board' || o.layer <= tile.layer) continue;
    if (overlapRect(o, tile)) return true;
  }
  return false;
}
function refreshBlocked() {
  for (const t of G.tiles) {
    if (t.state !== 'board') continue;
    t.el.classList.toggle('blocked', isBlocked(t));
    t.el.style.zIndex = 10 + t.layer;
  }
}
const freeTiles = () => G.tiles.filter(t => t.state === 'board' && !isBlocked(t));

// ---------- DOM ----------
function tileEl(t) {
  const el = document.createElement('div');
  el.className = 'tile blocked';
  el.dataset.id = t.id;
  el.style.background = `linear-gradient(160deg,#fff 0%,${TYPES[t.type].c} 100%)`;
  el.innerHTML = `<span>${TYPES[t.type].e}</span>`;
  el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); onTileTap(t.id); });
  return el;
}
function renderBoard() {
  board.innerHTML = '';
  for (const t of G.tiles) {
    if (t.state !== 'board') continue;
    if (!t.el) t.el = tileEl(t);
    else t.el.classList.remove('pop');
    t.el.style.left = t.x + 'px'; t.el.style.top = t.y + 'px';
    t.el.style.position = 'absolute';
    t.el.style.display = '';
    board.appendChild(t.el);
  }
  refreshBlocked();
}
function rebuildSlotDOM() {
  slotBar.querySelectorAll('.tile').forEach(e => e.remove());
  G.slot.forEach((id, i) => {
    const t = G.tiles[id];
    t.el.classList.remove('pop');
    t.el.style.display = '';
    t.el.style.position = 'absolute';
    t.el.style.left = slotX(i) + 'px'; t.el.style.top = '7px';
    t.el.style.zIndex = 20 + i;
    slotBar.appendChild(t.el);
  });
}
function rebuildOutDOM() {
  outBar.querySelectorAll('.tile').forEach(e => e.remove());
  G.out.forEach((id, i) => {
    const t = G.tiles[id];
    t.el.classList.remove('pop');
    t.el.style.cssText = '';
    t.el.classList.remove('blocked');
    outBar.children[1 + i].appendChild(t.el);
  });
}
// 槽位栏内宽约 400px：7 张牌均布
const slotX = (i) => Math.round(i * (400 - T) / (SLOT_N - 1));

function flyText(txt, x, y) {
  const f = document.createElement('div');
  f.className = 'fly'; f.textContent = txt;
  f.style.left = x + 'px'; f.style.top = y + 'px';
  board.appendChild(f);
  setTimeout(() => f.remove(), 820);
}

// ---------- 音效（WebAudio，无外部素材）----------
let AC = null;
function sfx(kind) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    const t0 = AC.currentTime;
    const cfg = { pick: [660, .06], match: [880, .18], fail: [180, .35], win: [1046, .3], help: [520, .1] }[kind];
    o.type = kind === 'fail' ? 'sawtooth' : 'triangle';
    o.frequency.setValueAtTime(cfg[0], t0);
    if (kind === 'match') o.frequency.setValueAtTime(cfg[0] * 1.5, t0 + .07);
    if (kind === 'win') o.frequency.setValueAtTime(cfg[0] * 1.25, t0 + .1);
    g.gain.setValueAtTime(.16, t0);
    g.gain.exponentialRampToValueAtTime(.001, t0 + cfg[1]);
    o.connect(g); g.connect(AC.destination);
    o.start(t0); o.stop(t0 + cfg[1]);
  } catch (e) { /* 无声环境忽略 */ }
}

// ---------- 快照（撤回用）----------
function snapshot() {
  G.history.push({
    tiles: G.tiles.map(t => ({ id: t.id, state: t.state, x: t.x, y: t.y })),
    slot: G.slot.slice(), out: G.out.slice(), score: G.score,
  });
  if (G.history.length > 6) G.history.shift();
}

// ---------- 点击入槽 ----------
function onTileTap(id) {
  if (G.state !== 'PLAY' || G.busy) return;
  const t = G.tiles[id];
  if (t.state === 'out') { tapOut(id); return; }
  if (t.state !== 'board' || isBlocked(t)) return;

  snapshot();
  // 从牌区移除
  t.state = 'slot';
  const r1 = t.el.getBoundingClientRect();
  board.removeChild(t.el);

  // 槽位插入位置：同类末尾
  let insert = G.slot.length;
  for (let i = 0; i < G.slot.length; i++) {
    if (G.tiles[G.slot[i]].type === t.type) insert = i + 1;
    else if (G.tiles[G.slot[i]].type > t.type) { insert = i; break; }
  }
  G.slot.splice(insert, 0, id);
  rebuildSlotDOM();

  // 入槽动画（FLIP）
  const el = t.el;
  const r2 = el.getBoundingClientRect();
  const dx = r1.left - r2.left, dy = r1.top - r2.top;
  el.style.transition = 'none';
  el.style.transform = `translate(${dx}px,${dy}px)`;
  requestAnimationFrame(() => {
    el.style.transition = 'transform .18s ease';
    el.style.transform = '';
  });

  sfx('pick');

  // 三消判定
  const same = G.slot.filter(i => G.tiles[i].type === t.type);
  if (same.length >= 3) {
    G.busy = true;
    setTimeout(() => doMatch(same.slice(0, 3)), 200);
  } else if (G.slot.length >= SLOT_N) {
    G.busy = true;
    setTimeout(() => lose(), 350);
  }
}

function doMatch(ids) {
  ids.forEach(id => {
    const t = G.tiles[id];
    t.state = 'gone';
    t.el.classList.add('pop');
    const rm = t.el;
    setTimeout(() => rm.remove(), 340);
  });
  G.slot = G.slot.filter(i => !ids.includes(i));
  G.score += 10;
  sfx('match');
  flyText('+10', 170, 40);
  setTimeout(() => {
    G.busy = false;
    rebuildSlotDOM();
    if (G.tiles.every(t => t.state === 'gone')) win();
  }, 260);
}

// ---------- 移出暂存 ----------
function tapOut(id) {
  if (G.state !== 'PLAY' || G.busy) return;
  if (G.slot.length >= SLOT_N) return;
  snapshot();
  G.out = G.out.filter(i => i !== id);
  const t = G.tiles[id];
  t.state = 'slot';
  let insert = G.slot.length;
  for (let i = 0; i < G.slot.length; i++) {
    if (G.tiles[G.slot[i]].type === t.type) insert = i + 1;
    else if (G.tiles[G.slot[i]].type > t.type) { insert = i; break; }
  }
  G.slot.splice(insert, 0, id);
  rebuildOutDOM(); rebuildSlotDOM();
  const same = G.slot.filter(i => G.tiles[i].type === t.type);
  if (same.length >= 3) { G.busy = true; setTimeout(() => doMatch(same.slice(0, 3)), 200); }
  sfx('pick');
}

// ---------- 道具 ----------
function useUndo() {
  if (G.state !== 'PLAY' || G.busy || G.helpers.undo <= 0 || !G.history.length) return;
  G.helpers.undo--; updateHelpBar(); sfx('help');
  const s = G.history.pop();
  G.tiles.forEach(t => {
    const rec = s.tiles[t.id];
    t.state = rec.state; t.x = rec.x; t.y = rec.y;
  });
  G.slot = s.slot.slice(); G.out = s.out.slice(); G.score = s.score;
  renderBoard(); rebuildSlotDOM(); rebuildOutDOM();
}
function useOut() {
  if (G.state !== 'PLAY' || G.busy || G.helpers.out <= 0) return;
  if (!G.slot.length) return;
  G.helpers.out--; updateHelpBar(); sfx('help');
  const moved = G.slot.splice(0, Math.min(3, G.slot.length));
  moved.forEach(id => { G.tiles[id].state = 'out'; });
  G.out.push(...moved);
  rebuildOutDOM(); rebuildSlotDOM(); refreshBlocked();
}
function useShuffle() {
  if (G.state !== 'PLAY' || G.busy || G.helpers.shuffle <= 0) return;
  G.helpers.shuffle--; updateHelpBar(); sfx('help');
  const bt = G.tiles.filter(t => t.state === 'board');
  const types = bt.map(t => t.type).sort(() => Math.random() - .5);
  bt.forEach((t, i) => { t.type = types[i]; if (t.el) t.el.remove(); t.el = null; });
  renderBoard();
}
function updateHelpBar() {
  $('#btnUndo').querySelector('.cnt').textContent = '×' + G.helpers.undo;
  $('#btnOut').querySelector('.cnt').textContent = '×' + G.helpers.out;
  $('#btnShuffle').querySelector('.cnt').textContent = '×' + G.helpers.shuffle;
  $('#btnUndo').disabled = G.helpers.undo <= 0;
  $('#btnOut').disabled = G.helpers.out <= 0;
  $('#btnShuffle').disabled = G.helpers.shuffle <= 0;
}

// ---------- 流程 ----------
function startLevel(lv) {
  G.level = lv;
  const conf = levelConf(lv);
  G.slot = []; G.out = []; G.history = []; G.score = 0;
  G.helpers = { undo: conf.undo, out: conf.out, shuffle: conf.shuffle };
  deal(conf);
  renderBoard(); rebuildSlotDOM(); rebuildOutDOM(); updateHelpBar();
  $('#lvlBadge').textContent = '第 ' + lv + ' 关';
  $('#overlay').classList.add('hidden');
  G.state = 'PLAY'; G.busy = false;
}
function win() {
  G.state = 'WIN'; sfx('win');
  if (G.level + 1 > G.best) { G.best = G.level + 1; localStorage.setItem('sheepStackBest', G.best); }
  $('#winInfo').innerHTML = `第 <b>${G.level}</b> 关通关！得分 <b>${G.score}</b><br>下一关方块更多、埋得更深`;
  $('#overlay').classList.remove('hidden');
  $('#menuPanel').classList.add('hidden');
  $('#losePanel').classList.add('hidden');
  $('#winPanel').classList.remove('hidden');
}
function lose() {
  G.state = 'LOSE'; sfx('fail');
  const left = G.tiles.filter(t => t.state !== 'gone').length;
  $('#loseInfo').innerHTML = `还剩 <b>${left}</b> 块方块没消除<br>提示：优先拿被压住的深层方块`;
  $('#overlay').classList.remove('hidden');
  $('#menuPanel').classList.add('hidden');
  $('#winPanel').classList.add('hidden');
  $('#losePanel').classList.remove('hidden');
}
function showMenu() {
  G.state = 'MENU';
  $('#bestLine').textContent = G.best > 1 ? `🏆 最高纪录：第 ${G.best - 1} 关通关` : '';
  $('#overlay').classList.remove('hidden');
  $('#winPanel').classList.add('hidden');
  $('#losePanel').classList.add('hidden');
  $('#menuPanel').classList.remove('hidden');
}

// ---------- 缩放适配 ----------
function fit() {
  const st = $('#stage');
  const s = Math.min(1, innerWidth / 434, innerHeight / 790);
  st.style.transform = `scale(${s})`;
}
addEventListener('resize', fit); fit();

// ---------- 绑定 ----------
$('#btnStart').addEventListener('click', () => startLevel(G.best));
$('#btnRestart').addEventListener('click', () => startLevel(1));
$('#btnNext').addEventListener('click', () => startLevel(G.level + 1));
$('#btnRetry').addEventListener('click', () => startLevel(G.level));
$('#btnMenu').addEventListener('click', showMenu);
$('#btnUndo').addEventListener('click', useUndo);
$('#btnOut').addEventListener('click', useOut);
$('#btnShuffle').addEventListener('click', useShuffle);

// ---------- 测试句柄 ----------
window.__sheep = {
  G, startLevel, deal, levelConf, isBlocked, freeTiles, slotX,
  tap: onTileTap, useUndo, useOut, useShuffle, refreshBlocked,
  TYPES,
};

showMenu();
})();
