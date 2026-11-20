// v4.0.123 验证：说明文档同步现玩法 / 人机技能条件化 / 盲盒 1~2 人限速抢 / 主菜单布局 / 守屋封面 / 中文标识
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0, FAIL = 0;
const ok = (c, m) => { if (c) { PASS++; console.log('  PASS ' + m); } else { FAIL++; console.log('  FAIL ' + m); } };

const SRC = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/HauntedDorm.js', 'utf8');
const HG_SRC = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/HelpGuide.js', 'utf8');
const IDX_SRC = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/index.html', 'utf8');

const boot = async (page) => {
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"');
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ gameMode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais && window.game.ais.length === 5');
  await sleep(1200);
};

(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1280, height: 860 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message)));
  await boot(page);

  // ============ A. 「操作与道具说明」守屋章节 ============
  console.log('\n[A] 操作与道具说明 · 守屋大作战章节');
  const A = await page.evaluate(() => {
    const btn = document.getElementById('btn-help-guide');
    if (btn) btn.click();
    const modal = document.getElementById('help-modal');
    const body = document.getElementById('help-body');
    const cards = [...document.querySelectorAll('.hg-mode')];
    const dorm = cards.find(c => c.textContent.includes('守屋大作战'));
    const items = dorm ? [...dorm.querySelectorAll('li, .hg-mode-item, .hg-item, p, div')].map(x => x.textContent) : [];
    return { open: modal ? getComputedStyle(modal).display !== 'none' : false,
             count: cards.length, txt: dorm ? dorm.textContent : '', items: items.join('|').slice(0, 200) };
  });
  ok(A.open, '说明弹窗已打开');
  ok(A.txt.length > 800, '守屋章节有实质内容（' + A.txt.length + ' 字）');
  const must = ['0.5 秒一跳', '阳光小喷菇', '十芒杨桃', '102400', '巨人僵尸', '跳板', '点名 1~2 个人机', '观察期', '推车布防', '出门', '3 株'];
  for (const k of must) ok(A.txt.includes(k), '新玩法关键词「' + k + '」在案');
  const banned = ['阳光菇 →(☀30)→ 向日葵', '机甲僵王', '植物只能种在房间里面', '大阳光菇', '水晶向日葵',
                  '石芒杨桃', '双向投手', '寒冰豌豆', '超级机箱', '巨型坚果', '南瓜堡垒', '永恒高坚果'];
  for (const k of banned) ok(!A.txt.includes(k), '旧文案「' + k + '」已清除');
  ok(!HG_SRC.includes('Choose Your Plants'), 'HelpGuide 无英文 Choose Your Plants');
  ok(!HG_SRC.includes('右上角 Speed'), 'HelpGuide 无英文 Speed');
  ok(!HG_SRC.includes('巨尸 Boss'), 'HelpGuide 无英文 Boss');
  await page.screenshot({ path: '_m0_help_dorm.png', clip: { x: 0, y: 0, width: 1280, height: 860 } });

  // ============ B. index.html 内嵌「玩法说明」面板 ============
  console.log('\n[B] 游戏内玩法说明面板');
  ok(IDX_SRC.includes('102400血·终极形态'), '僵尸链已更新到 102400 巨人僵尸');
  ok(!IDX_SRC.includes('机甲僵王'), '机甲僵王文案已清除');
  ok(IDX_SRC.includes('出门规则（v4.0.122）'), '新增出门规则段落');
  ok(IDX_SRC.includes('植物盲盒(🦠200)'), '盲盒价格已改 🦠200');
  ok(IDX_SRC.includes('阳光小喷菇') && IDX_SRC.includes('冰晶向日葵') && IDX_SRC.includes('十芒杨桃'), '阳光链名称已对齐');
  ok(IDX_SRC.includes('冰双向射手') && IDX_SRC.includes('寒冰射手') && IDX_SRC.includes('三线射手') && IDX_SRC.includes('超级机枪'), '豌豆链名称已对齐');
  ok(IDX_SRC.includes('高坚果 Lv12(34万血)'), '坚果链已更新到 Lv12');
  ok(IDX_SRC.includes('忧郁菇 Lv11'), '孢子链已补到 Lv11');
  ok(IDX_SRC.includes('火焰地刺(🦠250)→钢地刺(🦠1250)→火焰钢刺(🦠6250)'), '地刺链价格顺序修正');
  ok(!IDX_SRC.includes('每间房门口一台'), '小推车旧描述已清除');
  ok(IDX_SRC.includes('>选择你的植物'), '选卡标题改中文');
  ok(IDX_SRC.includes('>倍速: 1x<'), 'Speed 按钮改中文');
  ok(!IDX_SRC.includes('hp-label">HP'), 'HP 标签改「血量」');
  ok(!IDX_SRC.includes('Choose Your Plants'), 'index.html 无英文 Choose Your Plants');

  // ============ C. 人机技能触发条件 ============
  console.log('\n[C] 人机技能条件（真人不受限）');
  const C = await page.evaluate(() => {
    const g = window.game;
    g.paused = true;                       // 冻结模拟，只测门控
    const rm = g.rooms[0];
    const ai = { roleDef: { id: 'sunflower' }, room: rm, room2: null, dead: false, isAi: true, x: rm.frontX, y: rm.frontY };
    const doorX = rm.doorCol * g.gridSize + 40, doorY = rm.doorRow * g.gridSize + 40;
    const out = {};

    // 无房 → 一律 false
    for (const rid of ['sunflower', 'peashooter', 'wallnut', 'chomper', 'squash']) {
      out['noRoom_' + rid] = g._aiSkillGate({ roleDef: { id: rid }, room: null, room2: null, isAi: true });
    }

    // 向日葵：白天/夜晚
    ai.roleDef = { id: 'sunflower' };
    g.isNight = true;
    let nightTrue = 0; for (let i = 0; i < 40; i++) if (g._aiSkillGate(ai)) nightTrue++;
    out.sunNight = nightTrue;
    g.isNight = false;
    let dayTrue = 0; for (let i = 0; i < 80; i++) if (g._aiSkillGate(ai)) dayTrue++;
    out.sunDay = dayTrue;

    // 豌豆射手：门口僵尸 + 房内攻击植物数
    const fakeZb = { x: doorX, y: doorY, dead: false, hp: 100 };
    g.zombies.push(fakeZb);
    const fakePlants = [];
    const pushPlant = () => { const p = { c: rm.x + 1, r: rm.y + 1, owner: ai, isDoor: false, def: { shoot: {} } }; g.plants.push(p); fakePlants.push(p); return p; };
    ai.roleDef = { id: 'peashooter' };
    // 先清掉房里其它攻击植物干扰：临时把 plants 里 rm 内的 shoot 植物记下来
    const saved = g.plants.slice();
    g.plants.length = 0;
    out.peaNoPlant = g._aiSkillGate(ai);              // 门口有僵尸但房内 0 株
    pushPlant(); pushPlant();
    out.peaTwo = g._aiSkillGate(ai);                   // 2 株 → 仍 false
    pushPlant();
    out.peaThree = g._aiSkillGate(ai);                  // 3 株 → true
    g.plants.length = 0; saved.forEach(p => g.plants.push(p));

    // 门口没有僵尸 → false
    g.zombies.length = 0;
    out.peaNoZb = g._aiSkillGate(ai);

    // 大嘴花
    ai.roleDef = { id: 'chomper' };
    out.chomperNoZb = g._aiSkillGate(ai);
    g.zombies.push(fakeZb);
    out.chomperZb = g._aiSkillGate(ai);

    // 倭瓜：300px 内 / 远距离
    ai.roleDef = { id: 'squash' };
    g.zombies.length = 0;
    g.zombies.push({ x: doorX + 1200, y: doorY + 1200, dead: false, hp: 100 });
    out.squashFar = g._aiSkillGate(ai);
    g.zombies.length = 0;
    g.zombies.push({ x: doorX + 90, y: doorY + 90, dead: false, hp: 100 });
    out.squashNear = g._aiSkillGate(ai);

    // 坚果：门板在且可升级
    ai.roleDef = { id: 'wallnut' };
    g.zombies.length = 0;
    let dp = g.getPlantAt(doorX, doorY);
    out.hadDoor = !!dp;
    if (dp) { g.plants = g.plants.filter(p => p !== dp); if (dp.el1 && dp.el1.remove) dp.el1.remove(); } // 先拆门板测「没门→不放」
    out.wallNoDoor = g._aiSkillGate(ai);
    g.spawnPlant(rm.doorCol, rm.doorRow, 'wallnut', true, g.player); dp = g.getPlantAt(doorX, doorY);
    out.doorHasUp = !!(dp && dp.def && dp.def.up);
    out.wallWithDoor = g._aiSkillGate(ai);

    // 真人不受限：直接调 _useSkill
    const beforeBuff = g.player.atkBuffT || 0;
    g.player.roleDef = g.player.roleDef || { id: 'peashooter' };
    g._useSkill(g.player);
    out.humanSkillOk = (g.player.atkBuffT || 0) > beforeBuff || (g.player.buffT || 0) > 0;

    g.zombies.length = 0;
    g.paused = false;
    return out;
  });
  ok(C.noRoom_sunflower === false && C.noRoom_peashooter === false && C.noRoom_chomper === false && C.noRoom_squash === false,
     '没有固定房间 → 人机一律不放技能');
  ok(C.sunNight === 0, '向日葵夜里 40 次判定 0 次放技');
  ok(C.sunDay > 0, '向日葵白天 80 次判定 ' + C.sunDay + ' 次放技（有几率）');
  ok(C.peaNoZb === false, '豌豆射手门口没僵尸 → 不放');
  ok(C.peaNoPlant === false, '豌豆射手房内 0 株攻击植物 → 不放');
  ok(C.peaTwo === false, '豌豆射手房内 2 株（不足 3）→ 不放');
  ok(C.peaThree === true, '豌豆射手门口有僵尸 + 房内 ≥3 株 → 放');
  ok(C.chomperNoZb === false && C.chomperZb === true, '大嘴花只在门口有僵尸时赶人');
  ok(C.squashFar === false && C.squashNear === true, '倭瓜只在附近有僵尸时砸（远距离不放）');
  console.log('    (debug) 坚果 gate: noDoor=' + C.wallNoDoor + ' hadDoor=' + C.hadDoor + ' doorHasUp=' + C.doorHasUp + ' withDoor=' + C.wallWithDoor);
  ok(C.wallNoDoor === false && C.wallWithDoor === true, '坚果有可升级门板才免费升门');
  ok(C.humanSkillOk === true, '真人按技能不受这些条件限制');

  // ============ D. 盲盒：1~2 人 / 限速 / 僵尸优先 ============
  console.log('\n[D] 盲盒抢夺');
  const D = await page.evaluate(() => {
    const g = window.game;
    // 保证人机都有房（暂停期 AI 没去认领）
    g.ais.forEach((a, i) => { if (!a.room && g.rooms[i]) { a.room = g.rooms[i]; if (!g.rooms[i].owners.includes(a)) g.rooms[i].owners.push(a); } });
    const sizes = [];
    for (let i = 0; i < 60; i++) sizes.push(g._pickLooters().length);
    const pool = g.ais.filter(a => a && !a.dead && !a.isTraitor && a.room).length;
    const boxEl = document.createElement('div'); g.world1.appendChild(boxEl);
    const box = { x: g.player.x + 300, y: g.player.y + 300, life: 25, kind: 'box', el: boxEl };
    box.looters = g._pickLooters();
    const inAis = box.looters.every(a => g.ais.includes(a));
    // 限速：造一个被点名的目标，手动跑一帧 AI（先清掉会触发「逃跑 → speed=300」的干扰）
    const ai = box.looters[0] || g.ais.find(a => a.room);
    g.zombies.length = 0;
    ai.fleeing = false; ai.dead = false;
    const rmA = ai.room;
    if (rmA) { const dpx = g.getPlantAt(rmA.doorCol * g.gridSize + 40, rmA.doorRow * g.gridSize + 40);
               if (!dpx) g.spawnPlant(rmA.doorCol, rmA.doorRow, 'wallnut', true, g.player); }
    ai.targetDrop = box;
    ai.speed = 300;
    g.airdrops = [box];
    g.ghostSpawned = true;
    g._tick(1 / 60);            // 抢盒/限速逻辑在 _tick 的人机行动链里
    const spd = ai.speed;
    const kept = !!ai.targetDrop;
    ai.targetDrop = null; ai.speed = 200; g.airdrops = []; boxEl.remove();
    return { maxN: Math.max.apply(null, sizes), minN: Math.min.apply(null, sizes), pool, allZero: sizes.every(s => s === 0),
             inAis, spd, kept };
    return { maxN: Math.max.apply(null, sizes), minN: Math.min.apply(null, sizes), pool, allZero: sizes.every(s => s === 0),
             inAis, spd };
  });
  ok(D.allZero === false, '总能点到名（池内 ' + D.pool + ' 个有房人机）');
  ok(D.maxN <= 2, '每次最多点名 ' + D.maxN + ' 个人机（≤2）');
  ok(D.minN >= 1, '每次至少点名 ' + D.minN + ' 个人机（≥1）');
  ok(D.inAis === true, '被点名者都来自人机池');
  console.log('    (debug) 抢盒后 targetDrop=' + D.kept + ' movespeed=' + D.spd);
  ok(D.kept === true, '被点名者进入「出门抢盒」状态');
  ok(D.spd <= 150, '出门抢盒时移速被限到 ' + D.spd + '（≤150，常速 200）');
  ok(SRC.includes('if (p.targetDrop) score -= 60000;'), '僵尸对「出门抢盒者」打分 -60000（高于破门 -50000）');
  ok(SRC.includes("pp.targetDrop ? 600 : 220"), '户外锁定距离对抢盒者扩到 600px');
  ok(SRC.includes('static get LOOT_SPEED() { return 150; }'), 'LOOT_SPEED = 150 常量在案');

  // ============ E. 主菜单布局 ============
  console.log('\n[E] 主菜单布局');
  await page.evaluate(() => {
    if (window.game && window.game.destroy) { try { window.game.destroy(); } catch (e) { } }
    const ds = document.getElementById('dorm-screen'); if (ds) ds.style.display = 'none';
    const sm = document.getElementById('start-menu'); if (sm) { sm.style.display = 'block'; sm.style.opacity = 1; }
  });
  await sleep(500);
  const E = await page.evaluate(() => {
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), b: Math.round(b.bottom), rt: Math.round(b.right) }; };
    const corner = document.querySelector('#start-menu .menu-corner');
    const actions = document.querySelector('#start-menu #menu-actions');
    const title = document.querySelector('#start-menu .game-title');
    const cards = document.querySelector('#start-menu .menu-cards');
    const card = document.querySelector('#start-menu .mode-card');
    const cardWidths = [...document.querySelectorAll('#start-menu .mode-card')].map(el => el.offsetWidth);
    return {
      corner: r(corner), actions: r(actions), title: r(title), cards: r(cards), card: r(card), cardWidths: cardWidths,
      hasTopbar: !!document.querySelector('#start-menu .menu-topbar'),
      inCorner: !!(corner && corner.querySelector('#player-name') && corner.querySelector('#btn-back-gc')),
      actionBtns: actions ? actions.children.length : 0,
      // v4.0.126：说明按钮已从右上角挪成「我是僵尸」右侧的独立窄卡，右上角只留成就
      helpCard: !!document.querySelector('#start-menu #btn-help-guide'),
      subGone: !document.querySelector('#start-menu .game-sub') && !document.querySelector('#start-menu').textContent.includes('PLANTS vs ZOMBIES'),
      ver: (document.getElementById('start-version') || {}).textContent || ''
    };
  });
  ok(E.hasTopbar, '存在顶部工具行 .menu-topbar');
  ok(E.inCorner, '玩家名 + 返回键在左上角工具行内');
  ok(E.actionBtns >= 1 && E.helpCard, '右上角 ' + E.actionBtns + ' 个按钮（成就）+ 说明为独立窄卡');
  ok(E.corner && E.title && E.corner.b <= E.title.y + 2, '左上角工具行不与标题重叠');
  ok(E.title && E.cards && E.title.b <= E.cards.y + 2, '标题在卡片上方');
  ok(E.subGone, '英文副标题已删除');
  console.log('    (debug) 卡片宽度 =', JSON.stringify(E.cardWidths));
  ok(E.cardWidths && Math.min.apply(null, E.cardWidths) <= 200, '普通模式卡已缩小到 ' + (E.cardWidths ? Math.min.apply(null, E.cardWidths) : '?') + 'px（≤200）');
  ok(/v\d+\.\d+\.\d+/.test(E.ver) && E.ver.length < 40, '版本徽标只显示短版本号（' + E.ver + '）');

  // ============ F. 守屋封面 ============
  console.log('\n[F] 守屋大作战封面');
  const F = await page.evaluate(() => {
    const art = document.querySelector('#btn-dorm .pkt-art.dorm');
    if (!art) return {};
    const q = s => art.querySelector(s);
    const after = getComputedStyle(art, '::after');
    const sun = q('.dorm-sun');
    const sunCs = sun ? getComputedStyle(sun) : null;
    return {
      hero: (q('.dorm-hero') || {}).getAttribute ? q('.dorm-hero').getAttribute('src') : '',
      left: q('.dorm-side-l') ? q('.dorm-side-l').getAttribute('src') : '',
      right: q('.dorm-side-r') ? q('.dorm-side-r').getAttribute('src') : '',
      sunAnim: sunCs ? sunCs.animationName + ' ' + sunCs.animationDuration : '',
      borderTop: after.borderTopWidth,
      afterH: after.height
    };
  });
  ok(/Repeater/.test(F.hero || ''), '中间主位是双发豌豆（' + F.hero + '）');
  ok(/TallNut/.test(F.right || ''), '高坚果在最右（' + F.right + '）');
  ok(/SunFlower/.test(F.left || ''), '向日葵在左（' + F.left + '）');
  ok(/dorm-sun-float/.test(F.sunAnim) && /11s/.test(F.sunAnim), '阳光改用 11 秒大范围游走动画');
  ok(F.borderTop === '0px', '封面底部白线已删除（border-top ' + F.borderTop + '）');

  // ============ G. 报错 ============
  console.log('\n[G] 运行时');
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs.slice(0, 3).join(' | ') : ''));

  console.log('\n===== ' + PASS + ' PASS / ' + FAIL + ' FAIL =====');
  await b.close();
  process.exit(FAIL ? 1 : 0);
})();
