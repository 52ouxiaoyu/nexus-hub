// v4.0.119 验证：玉米加农炮恢复原版 3×3 范围伤害 + 原版发射动作 + BlastMark 落点痕迹
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 820 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0' });
  await sleep(1200);

  let pass = 0, fail = 0;
  const ok = (cond, msg) => { if (cond) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

  // ---------- T1 静态契约 ----------
  const cm = fs.readFileSync('js/managers/CollisionManager.js', 'utf8');
  const pj = fs.readFileSync('js/entities/Projectile.js', 'utf8');
  const css = fs.readFileSync('css/style.css', 'utf8');
  ok(/p\.type === 'cob' \|\| p\.cobBomb\) continue;/.test(cm), 'T1a 普通子弹碰撞检测显式跳过玉米炮弹（否则"撞到一只就单杀",范围与痕迹全丢）');
  ok(/R_GIRD = 1\.5/.test(pj) && /1800/.test(pj), 'T1b 爆炸范围 = 1.5 格圆、伤害 1800（PVZ1 原版规格）');
  ok(/BlastMark\.png/.test(pj), 'T1c 落点痕迹用原版 BlastMark.png');
  ok(!/cob-scorch/.test(pj), 'T1d 旧的 4×4 黑色方块焦块已移除');
  ok(fs.existsSync('assets/images/Plants/CobCannon/BlastMark.png'), 'T1e 素材文件 assets/images/Plants/CobCannon/BlastMark.png 已入库');
  ok(/@keyframes cobCannonFire/.test(css) && /@keyframes cobMuzzlePuff/.test(css) && /@keyframes cobBoomPuff/.test(css),
     'T1f 三套动画关键帧齐全（抬炮后坐 / 炮口白烟 / 落地烟团）');

  // ---------- 进关卡 ----------
  await p.evaluate(() => { document.getElementById('btn-fusion').click(); });
  await sleep(400);
  await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
    const picked = [];
    for (const c of cards) { if (picked.length >= 8) break; c.click(); picked.push(c.dataset.type); }
    document.getElementById('btn-lets-rock').click();
  });
  await sleep(1500);

  // ---------- 布置：5 只普通在 3×3 圆内 + 2 只在圆外 ----------
  const setup = await p.evaluate(() => {
    const g = window._pvzGame;
    if (g.state !== 'PLAYING') return { fail: g.state };
    for (const e of [...g.entities]) { if (e.element && e.element.parentNode) e.element.remove(); }
    g.entities.length = 0;
    for (let r = 0; r < g.board.rows; r++) for (let c = 0; c < g.board.cols; c++) g.board.grid[r][c] = null;
    const bd = g.board;
    const cob = g._spawnCobCannon(2, 1);
    cob.chargeReady = true; cob.chargeTimer = 0;
    const spots = [
      [2, 5, 'normal'], [2, 6, 'normal'], [1, 5, 'normal'], [3, 5, 'normal'], [1, 6, 'normal'],
      [0, 5, 'normal'], [2, 7, 'normal']
    ];
    window.__zs = spots.map(([row, col, t]) => {
      const z = new Zombie(g, row, t);
      z.x = bd.offsetX + col * bd.cellWidth + 40;
      z.y = bd.offsetY + row * bd.cellHeight + bd.cellHeight / 2 - 20;
      z.speed = 0;
      g.entities.push(z);
      return z;
    });
    window.__cob = cob;
    return { cob: [cob.x, cob.y], n: window.__zs.length };
  });
  ok(setup.n === 7, `T2a 开局就绪（${setup.n} 只僵尸 / 玉米炮 ${setup.cob}）`);

  // ---------- T3 发射：抬炮动作 + 白烟 ----------
  const fire = await p.evaluate(() => {
    const g = window._pvzGame, cob = window.__cob, bd = g.board;
    cob.fireCob(bd.offsetX + 5.5 * bd.cellWidth, bd.offsetY + 2 * bd.cellHeight + bd.cellHeight / 2);
    const el = cob.element;
    const cs = getComputedStyle(el);
    return { cls: el.className, anim: cs.animationName, puffs: document.querySelectorAll('.cob-muzzle-puff').length };
  });
  ok(/cob-firing/.test(fire.cls) && fire.anim === 'cobCannonFire', `T3a 发射瞬间播放抬炮动画（class=${fire.cls} / anim=${fire.anim}）`);
  ok(fire.puffs >= 3, `T3b 炮口喷出白烟（${fire.puffs} 团）`);
  await sleep(120);
  const lift = await p.evaluate(() => {
    const el = window.__cob.element;
    const m = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
    if (!m) return { deg: 0, raw: getComputedStyle(el).transform };
    const nums = m[1].split(',').map(Number);
    return { deg: Math.atan2(nums[1], nums[0]) * 180 / Math.PI, raw: m[1] };
  });
  ok(lift.deg < -12, `T3c 炮身真的抬起来了（实测旋转 ${lift.deg.toFixed(1)}°，静止为 0°）`);

  // ---------- T4 飞行中翻滚 ----------
  await sleep(180);
  const spin = await p.evaluate(() => {
    const c = window._pvzGame.entities.find(e => e.type === 'cob');
    return c ? { tr: c.element.style.transform, x: Math.round(c.x), y: Math.round(c.y) } : null;
  });
  ok(spin && /rotate\(/.test(spin.tr), `T4 玉米炮弹在空中翻滚（${spin ? spin.tr : 'no-proj'}，位置 ${spin ? spin.x + ',' + spin.y : '-'}）`);

  // ---------- 等落地 ----------
  await sleep(1500);
  const boom = await p.evaluate(() => {
    const g = window._pvzGame;
    const zs = window.__zs;
    return {
      dead: zs.map(z => z.state === 'DYING' || z.isDead || z.hp <= 0),
      hp: zs.map(z => Math.round(z.hp)),
      marks: [...document.querySelectorAll('.cob-blastmark')].map(m => m.getAttribute('src')),
      markBox: (() => { const m = document.querySelector('.cob-blastmark'); if (!m) return null; const r = m.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
      scorch: document.querySelectorAll('.cob-scorch').length,
      hit: (() => { const c = g.entities.find(e => e.type === 'cob'); return c ? c._cobHitCount : 'gone'; })(),
      booms: document.querySelectorAll('.cob-boom-puff').length
    };
  });
  const inside = boom.dead.slice(0, 5);
  const outside = boom.dead.slice(5);
  ok(inside.every(Boolean), `T5a 3×3 圆内 5 只全灭（死亡 ${inside.filter(Boolean).length}/5，hp=${boom.hp.slice(0, 5)}）`);
  ok(outside.every(v => !v), `T5b 圆外 2 只毫发无伤（存活 ${outside.filter(v => !v).length}/2，hp=${boom.hp.slice(5)}）`);
  ok(boom.marks.length >= 1 && /BlastMark\.png/.test(boom.marks[0]), `T5c 落点留下原版 BlastMark 痕迹（${boom.marks[0] && boom.marks[0].split('/').pop()}）`);
  ok(boom.markBox && boom.markBox.w >= 240, `T5d 痕迹覆盖约 3 格（实测 ${boom.markBox && boom.markBox.w}px ≈ ${boom.markBox ? (boom.markBox.w / 80).toFixed(1) : '?'} 格）`);
  ok(boom.scorch === 0, `T5e 没有残留旧的黑色方块焦块（${boom.scorch} 块）`);

  // ---------- T6 铁桶/铁门也是"炸死"而不是磨血 ----------
  const armored = await p.evaluate(async () => {
    const g = window._pvzGame, bd = g.board;
    const cob = g.entities.find(e => e.type === 'cobcannon');
    const z = new Zombie(g, 2, 'buckethead');
    z.x = bd.offsetX + 5 * bd.cellWidth + 40;
    z.y = bd.offsetY + 2 * bd.cellHeight + bd.cellHeight / 2 - 20;
    z.speed = 0;
    g.entities.push(z);
    const before = z.hp;
    cob.chargeReady = true;
    cob.fireCob(bd.offsetX + 5.4 * bd.cellWidth, bd.offsetY + 2.5 * bd.cellHeight);
    await new Promise(r => setTimeout(r, 1700));
    return { before, after: Math.round(z.hp), dead: z.state === 'DYING' || z.isDead || z.hp <= 0, marks: document.querySelectorAll('.cob-blastmark').length };
  });
  ok(armored.dead && armored.before >= 1300, `T6 铁桶僵尸被 1800 炸弹伤害直接炸死（${armored.before} → ${armored.after}）`);
  ok(armored.marks >= 2, `T6b 第二发另留一个痕迹（累计 ${armored.marks} 个，互不覆盖）`);

  ok(errs.length === 0, `T7 全程 0 页面报错（${errs.join('; ') || '无'}）`);

  console.log(`\n合计 ${pass} PASS / ${fail} FAIL`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
