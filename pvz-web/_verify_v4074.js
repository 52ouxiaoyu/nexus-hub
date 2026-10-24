/* v4.0.74 验证：拆除规则 + 弹窗去拆除键 + 跳板飞向出生点(抛物线) + 出生点绿圈/僵尸红圈 + 图鉴补21条 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const ROOT = __dirname;
let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log((c ? '  PASS ' : '  FAIL ') + n); };

(async () => {
  const dorm = fs.readFileSync(path.join(ROOT, 'js/HauntedDorm.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'css/haunted-dorm.css'), 'utf8');
  const guide = fs.readFileSync(path.join(ROOT, 'js/HelpGuide.js'), 'utf8');

  // —— 静态断言 ——
  ok('拆除规则判定 _canDemolish 存在', /_canDemolish\(pl\)/.test(dorm));
  ok('拆除规则：路灯花/向日葵/坚果/大蒜链不可拆', /t === 'plantern'/.test(dorm) && /t\.indexOf\('sunflower'\) >= 0/.test(dorm) && /t\.indexOf\('nut'\) === 0/.test(dorm) && /t\.indexOf\('garlic'\) >= 0/.test(dorm));
  ok('菜单 del 受 _canDemolish 守卫', /if \(this\._canDemolish\(pl\)\) \{\s*menu\.options\.push\(\{ action: 'del'/.test(dorm));
  ok('菜单 del 执行兜底守卫', /路灯花\/坚果\/向日葵不可拆除/.test(dorm));
  ok('弹窗拆除键 display:none', /this\.ppDemolish\.style\.display = 'none'/.test(dorm));
  ok('跳板启动 _jumpFly 飞行', /e\._jumpFly = \{ sx: e\.x, sy: e\.y/.test(dorm));
  ok('跳板落点=出生点 spawnPoint', /const sp = this\.spawnPoint \|\|/.test(dorm));
  ok('_tick 抛物线插值（0.9s）', /f\.elapsed \/ 0\.9/.test(dorm) && /Math\.sin\(Math\.PI \* k\) \* 200/.test(dorm));
  ok('飞行中玩家禁移动 / AI 暂停', /!!this\.player\._jumpFly/.test(dorm) && /ai\._jumpFly\) continue/.test(dorm));
  ok('僵尸不触发跳板', /e\.isZombie\) continue/.test(dorm));
  ok('出生点绿圈元素生成', /className = 'spawn-marker'/.test(dorm));
  ok('僵尸圈 CSS 改红虚线', /\.tile\.center \{[\s\S]*?rgba\(200,70,70/.test(css) && /border: 3px dashed rgba\(255,110,110/.test(css));
  ok('出生点绿圈 CSS 新增', /\.spawn-marker \{[\s\S]*?border: 3px dashed rgba\(120,255,140/.test(css));
  ok('僵尸指挥提示改红圈', /最上排中心红圈自动回血/.test(dorm));
  // v4.0.110：4 条与融合产物同名的守屋形态加了「·守屋」后缀消歧
  ok('图鉴补全 21 条（大阳光菇~南瓜壳·不朽）',
    /n: '大阳光菇'/.test(guide) && /n: '水晶向日葵'/.test(guide) && /n: '魅惑向日葵·守屋'/.test(guide) &&
    /n: '石芒杨桃'/.test(guide) && /n: '双向投手'/.test(guide) && /n: '超级机箱'/.test(guide) &&
    /n: '机箱猫尾草'/.test(guide) && /n: '巨型坚果'/.test(guide) && /n: '南瓜堡垒'/.test(guide) &&
    /n: '永恒高坚果'/.test(guide) && /n: '巨型忧郁菇'/.test(guide) && /n: '宇宙忧郁菇'/.test(guide) &&
    /n: '终极火焰地刺'/.test(guide) && /n: '冰蒜卫士·守屋'/.test(guide) && /n: '金蒜坚果·守屋'/.test(guide) &&
    /n: '蒜味高坚果·守屋'/.test(guide) && /n: '南瓜壳·愈'/.test(guide) && /n: '南瓜壳·不朽'/.test(guide));

  // —— 运行时 ——
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now(),
  });
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto('file://' + path.join(ROOT, 'haunted-dorm.html'), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));

    const r = await page.evaluate(() => {
      const g = window.game;
      if (!g || !g.rooms) return null;
      const out = {};
      // 1) 拆除规则实测
      out.delOk = g._canDemolish({ def: { type: 'peashooter' } });
      out.delBlocked = [
        g._canDemolish({ def: { type: 'plantern' } }),
        g._canDemolish({ def: { type: 'plantern3' } }),
        g._canDemolish({ def: { type: 'sunflower' } }),
        g._canDemolish({ def: { type: 'twinsunflower' } }),
        g._canDemolish({ def: { type: 'wallnut' } }),
        g._canDemolish({ def: { type: 'tallnut' } }),
        g._canDemolish({ def: { type: 'nutlv8' } }),
        g._canDemolish({ def: { type: 'garlic' } }),
        g._canDemolish({ def: { type: 'goldgarlic' } }),
      ].every(x => x === false);
      // 2) 弹窗拆除键隐藏
      out.ppDemolishHidden = g.ppDemolish && g.ppDemolish.style.display === 'none';
      // 3) 圆圈
      out.greenMarker = !!g.world1.querySelector('.spawn-marker');
      out.zombieCircle = !!g.world1.querySelector('.tile.center');
      const zc = g.world1.querySelector('.tile.center');
      out.zombieCircleRed = zc && getComputedStyle(zc).borderStyle === 'dashed' && /255, *110, *110/.test(getComputedStyle(zc).borderColor);
      // 4) 跳板落点=出生点
      const room = g.rooms[0];
      const t = g._jumpPadTarget(room);
      out.padTarget = (Math.abs(t.x - g.spawnPoint.x) < 2 && Math.abs(t.y - g.spawnPoint.y) < 2);
      // 5) 跳板触发飞行：把玩家放到跳板上手动触发
      const pad = room.jumpPad;
      const px = pad.c * g.gridSize + 40, py = pad.r * g.gridSize + 40;
      g.player.x = px; g.player.y = py;
      g.player.el1.style.left = px + 'px'; g.player.el1.style.top = py + 'px';
      return out;
    });
    ok('可拆植物（豌豆射手）可拆除', r && r.delOk === true);
    ok('三类植物全部不可拆除（路灯花/向日葵/坚果/大蒜链）', r && r.delBlocked === true);
    ok('弹窗拆除键已隐藏', r && r.ppDemolishHidden === true);
    ok('出生点绿色虚线圈存在', r && r.greenMarker === true);
    ok('僵尸回血台红圈存在且红色虚线', r && r.zombieCircle === true && r.zombieCircleRed === true);
    ok('跳板落点=玩家出生点', r && r.padTarget === true);

    // 6) 飞行实测：触发后 0.3s 应有 _jumpFly 且位置变化；0.3s 高度为负（腾空）
    await new Promise(r => setTimeout(r, 350));
    const fly = await page.evaluate(() => {
      const g = window.game;
      const f = g.player._jumpFly;
      if (!f) return null;
      const midX = g.player.x;
      const isUp = !!g.player.el1 && /translateY\(-[\d.]+px\)/.test(g.player.el1.style.transform);
      return { midX, isUp, sx: f.sx, sy: f.sy, tx: f.tx, ty: f.ty };
    });
    ok('跳板触发后进入飞行（_jumpFly 存在）', fly !== null);
    ok('飞行中位置已移动（离开跳板）', fly && Math.abs(fly.midX - fly.sx) > 1);
    ok('飞行中腾空（translateY 负值）', fly && fly.isUp === true);

    // 7) 飞行结束：1.2s 后应落地且位置=出生点
    await new Promise(r => setTimeout(r, 1000));
    const land = await page.evaluate(() => {
      const g = window.game;
      const landed = !g.player._jumpFly;
      const nearSpawn = Math.abs(g.player.x - g.spawnPoint.x) < 3 && Math.abs(g.player.y - g.spawnPoint.y) < 3;
      const transformRestored = !g.player.el1.style.transform;
      return { landed, nearSpawn, transformRestored };
    });
    ok('飞行结束落地', land && land.landed === true);
    ok('落点=出生点', land && land.nearSpawn === true);
    ok('飞行后 transform 还原', land && land.transformRestored === true);

    // 8) 图鉴运行时（index.html 主菜单的帮助弹窗）：植物图鉴 tab 条目数（FUSION 补 21 条）
    const pageIx = await browser.newPage();
    const errsIx = [];
    pageIx.on('pageerror', e => errsIx.push(String(e)));
    await pageIx.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1200));
    const tabCount = await pageIx.evaluate(() => {
      const t = document.querySelector('.hg-tab[data-tab="plants"]');
      return t ? t.textContent : null;
    });
    ok('图鉴植物 tab 标题含数量（FUSION 补 21 条后 ≥110）', tabCount && /植物图鉴（(\d+)）/.test(tabCount) && parseInt(tabCount.match(/植物图鉴（(\d+)）/)[1], 10) >= 110);
    if (tabCount) console.log('    图鉴条目: ' + tabCount);
    ok('index.html 无 JS 错误', errsIx.length === 0);

    ok('页面无 JS 错误', errs.length === 0);
    if (errs.length) console.log('    errs: ' + errs.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }

  console.log('===== v4.0.74 守屋修复验证: ' + pass + ' 通过 / ' + fail + ' 失败 =====');
  process.exit(fail ? 1 : 0);
})();
