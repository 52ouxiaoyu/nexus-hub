// v4.0.116 验证：图鉴里不再有「守屋专属」自造品种，守屋所有植物名都来自 经典 / 融合 两类已有植物
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push((e.stack || String(e)).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });

  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('!!document.getElementById("btn-help-guide")', { timeout: 20000 });
  await page.evaluate(() => {
    document.getElementById('btn-help-guide').click();
    document.querySelector('#help-modal .hg-tab[data-tab="plants"]').click();
  });
  await sleep(400);

  const info = await page.evaluate(() => {
    const body = document.getElementById('help-body');
    const gs = [...body.querySelectorAll('.hg-group')].map(g => {
      const grid = g.nextElementSibling;
      const tiles = grid ? [...grid.querySelectorAll('.hg-tile')] : [];
      return {
        tag: g.querySelector('.hg-group-tag').textContent.trim().replace(/\s/g, ''),
        names: tiles.map(t => t.querySelector('.hg-tname').textContent.trim())
      };
    });
    return {
      groups: gs,
      tip: (body.querySelector('.hg-tip') || {}).textContent || '',
      tabText: document.querySelector('#help-modal .hg-tab[data-tab="plants"]').textContent,
      html: body.innerHTML
    };
  });

  const tags = info.groups.map(g => g.tag);
  console.log('  分区:', info.groups.map(g => g.tag + '(' + g.names.length + ')').join(' / '));

  ok(tags.length === 2 && tags[0] === '经典' && tags[1] === '融合',
     `T1 图鉴只剩 经典 / 融合 两区（实测 ${tags.join(' / ')}）`);
  const classic = info.groups[0].names, fusion = info.groups[1].names;
  ok(classic.length === 36, `T2a 经典 36 条（实测 ${classic.length}）`);
  // v4.0.118：新增真融合植物「寒冰高坚果」（寒冰射手+高坚果）→ 55→56
  ok(fusion.length === 56, `T2b 融合 56 条（实测 ${fusion.length}；v4.0.110 是 76 = 55 + 21 自造，v4.0.118 +1 寒冰高坚果）`);
  ok(!tags.includes('守屋专属'), 'T3 不再有「守屋专属」分区');
  const all = [...classic, ...fusion];
  ok(!all.some(n => n.includes('·守屋')), `T4 没有任何「·守屋」后缀条目（${all.filter(n => n.includes('守屋')).join(',') || '无'}）`);
  ok(!/没有融合配方/.test(info.tip), 'T5 脚注不再写「没有融合配方」');
  ok(info.tabText.includes(String(all.length)), `T6 页签植物数 = 经典+融合 = ${all.length}（实测页签：${info.tabText.trim()}）`);

  // 详情卡：魅惑向日葵 现在是真融合植物
  const detail = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('#help-body .hg-tile')];
    const t = tiles.find(x => x.querySelector('.hg-tname').textContent.trim() === '魅惑向日葵');
    if (!t) return { skip: true };
    t.click();
    return { txt: (document.querySelector('#hg-detail') || document.body).textContent.replace(/\s+/g, ' ') };
  });
  ok(detail.skip || (/融合植物/.test(detail.txt) && /手套融合获得/.test(detail.txt) && !/守屋/.test(detail.txt)),
     'T7 魅惑向日葵详情卡 = 融合植物 / 手套融合获得，无「守屋」字样');

  // ---------- 守屋 DEFS：所有植物名都必须能在图鉴里找到（Lv 后缀按同名同物处理） ----------
  await page.evaluate(() => document.querySelector('#help-modal .hg-close, #help-modal .close, #help-close')?.click());
  await sleep(200);

  const defs = await page.evaluate(() => {
    const D = HauntedDorm.DEFS;
    const rows = Object.keys(D).map(k => ({ id: k, name: D[k].name, hp: D[k].hp, up: D[k].up ? D[k].up.to : null }));
    return rows;
  });
  const norm = n => n.replace(/\s*Lv\d+$/, '');
  const unknown = defs.filter(d => !all.map(norm).includes(norm(d.name)));
  ok(unknown.length === 0,
     `T8 守屋 ${defs.length} 个植物定义的名字全部来自 经典/融合（越界：${unknown.map(d => d.name).join(',') || '无'}）`);

  const named = ['阳光小喷菇', '冰晶向日葵', '魅惑向日葵', '十芒杨桃', '冰双向射手', '超级机枪', '机枪猫尾草', '钢刺坚果', '高坚果堡垒', '忧郁蒜雾', '火焰钢刺', '冰蒜卫士', '金蒜坚果', '蒜味高坚果'];
  const missing = named.filter(n => !defs.some(d => d.name === n));
  ok(missing.length === 0, `T9 14 个自造形态已换成已有融合植物（缺：${missing.join(',') || '无'}）`);
  const gone = ['大阳光菇', '水晶向日葵', '石芒杨桃', '双向投手', '超级机箱', '机箱猫尾草', '巨型坚果', '南瓜堡垒', '永恒高坚果', '巨型忧郁菇', '暗影忧郁菇', '星际忧郁菇', '宇宙忧郁菇', '终极火焰地刺', '南瓜壳·愈', '南瓜壳·愈金', '南瓜壳·不朽'];
  const left = gone.filter(n => defs.some(d => d.name === n));
  ok(left.length === 0, `T10 17 个旧自造名已全部消失（残留：${left.join(',') || '无'}）`);

  // ---------- 升级链完好 ----------
  const chain = await page.evaluate(() => {
    const D = HauntedDorm.DEFS;
    const badUp = [];
    for (const k of Object.keys(D)) {
      const u = D[k].up;
      if (u && u.to && !D[u.to]) badUp.push(k + '→' + u.to);
    }
    const walk = start => { const out = []; let cur = start, guard = 0; while (cur && D[cur] && guard++ < 40) { out.push(cur); cur = D[cur].up && D[cur].up.to; } return out; };
    return {
      badUp,
      pea: walk('peashooter').length,
      nut: walk('wallnut').length,
      spore: walk('puffshroom').length,
      sun: walk('sunshroom').length,
      garlic: walk('garlic').length,
      spike: walk('spikeweed').length,
      pumpkin: walk('pumpkinshell').length
    };
  });
  ok(chain.badUp.length === 0, `T11 所有升级目标都存在（断链：${chain.badUp.join(',') || '无'}）`);
  ok(chain.pea === 16 && chain.nut === 12 && chain.spore === 11 && chain.sun === 11 && chain.garlic === 4 && chain.spike === 4 && chain.pumpkin === 4,
     `T12 七条升级链长度不变（豌豆${chain.pea}/坚果${chain.nut}/孢子${chain.spore}/阳光${chain.sun}/大蒜${chain.garlic}/地刺${chain.spike}/南瓜${chain.pumpkin}）`);

  // ---------- 实机：种出来的就是新名字 ----------
  await page.evaluate(() => {
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(400);
  const planted = await page.evaluate(() => {
    const g = window.game;
    // 找一个空的房内格（AI 会先占掉床位）
    let cell = null;
    for (const rm of g.rooms) {
      for (let r = rm.y; r < rm.y + rm.h && !cell; r++) {
        for (let c = rm.x; c < rm.x + rm.w && !cell; c++) {
          if (g.walls.has(c + ',' + r)) continue;
          if (g.getPlantAt(c * 80 + 40, r * 80 + 40)) continue;
          if (g._insideRoom(c, r) !== rm) continue;
          cell = [c, r];
        }
      }
      if (cell) break;
    }
    if (!cell) return [{ id: 'none', name: 'no-free-cell' }];
    const out = [];
    for (const id of ['bigsunshroom', 'superbox', 'pumpkinshell2', 'nutlv12']) {
      const p = g.spawnPlant(cell[0], cell[1], id, false, g.player);
      out.push({ id, name: p ? p.def.name : null });
      if (p) { p.el1.remove(); if (p.txtEl) p.txtEl.remove(); g.plants = g.plants.filter(x => x !== p); }
    }
    return out;
  });
  const want = { bigsunshroom: '阳光小喷菇', superbox: '超级机枪', pumpkinshell2: '南瓜壳 Lv2', nutlv12: '高坚果 Lv12' };
  const wrong = planted.filter(p => want[p.id] !== p.name);
  ok(wrong.length === 0, `T13 实机种出来的名字已更新（${planted.map(p => p.id + '=' + p.name).join(' / ')}）`);
  ok(errs.length === 0, `T14 0 条 JS 异常${errs.length ? '：' + errs[0] : ''}`);

  await browser.close();
  console.log(`\n===== v4.0.116 结果：${pass} 通过 / ${fail} 失败 =====`);
  process.exit(fail ? 1 : 0);
})();
