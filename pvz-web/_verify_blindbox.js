// 自动化回归测试：植物盲盒 100% 成功生成与保底扣费机制验证
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  PASS:", msg); }
  else { fail++; console.log("  FAIL:", msg); }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox'],
    userDataDir: '/tmp/pptr-blindbox-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('file://' + path.resolve(__dirname, 'haunted-dorm.html?mode=1p&role1=peashooter'), { waitUntil: 'networkidle0' });
  await sleep(1000);

  // 冻结真实游戏循环以进行确定性单元与集成断言
  await page.evaluate(() => {
    const g = window.game;
    g.loop = () => {};
    g._updateAIs = () => {};
    g.mowers.forEach(m => { m.gone = true; if (m.el1) m.el1.remove(); });
    g.mowers = [];
  });

  console.log('=== 测试 1: 盲盒池 100 次抽取无死角开箱验证 ===');
  const poolRes = await page.evaluate(() => {
    const g = window.game;
    const p = g.player;
    const room = g.rooms[0];
    let successes = 0;
    const rolledTypes = {};
    let nonPlantCount = 0;

    // 清空房间内植物以便连续开盒测试
    for (let i = 0; i < 100; i++) {
      // 临时清除测试格植物
      g.plants = g.plants.filter(pl => !(pl.c === 20 && pl.r === 20));
      const el = document.querySelectorAll('.tile');
      
      const created = g.spawnPlant(20, 20, 'blindbox', false, p);
      if (created && created.def && created.hp > 0 && !created.def.instant && created.type !== 'iceshroom') {
        successes++;
        rolledTypes[created.type] = (rolledTypes[created.type] || 0) + 1;
      } else {
        nonPlantCount++;
      }
      if (created && created.el1) created.el1.remove();
      g.plants = g.plants.filter(pl => pl !== created);
    }
    return { successes, nonPlantCount, rolledTypes, distinct: Object.keys(rolledTypes).length };
  });

  ok(poolRes.successes === 100, `100 次盲盒抽取 100% 成功生成实体植物 (成功: ${poolRes.successes}/100)`);
  ok(poolRes.nonPlantCount === 0, `无任何失败或非实体植物 (非实体数: ${poolRes.nonPlantCount})`);
  ok(poolRes.distinct >= 8, `盲盒开出物覆盖丰富植物种类 (开出种类数: ${poolRes.distinct})`);
  console.log('   开出种类统计:', poolRes.rolledTypes);

  console.log('=== 测试 2: 鼠标种植链路 (doPlant) 扣费与落地验证 ===');
  const mouseAffordRes = await page.evaluate(() => {
    const g = window.game;
    const p = g.player;
    const rm = g.rooms[0];
    // 选一个空闲房内格子
    let targetC = rm.x + 1, targetR = rm.y + 1;
    // 确保没有植物
    g.plants = g.plants.filter(pl => !(pl.c === targetC && pl.r === targetR));

    p.spore = 250;
    g.menuCol = targetC;
    g.menuRow = targetR;
    g.doPlant('blindbox');

    const created = g.plants.find(pl => pl.c === targetC && pl.r === targetR);
    return {
      sporeAfter: p.spore,
      plantCreated: !!created,
      plantType: created ? created.type : null,
      plantName: created ? created.def.name : null
    };
  });

  ok(mouseAffordRes.sporeAfter === 150, `足额种植时精准扣除 100 孢子 (剩余: ${mouseAffordRes.sporeAfter}, 预期: 150)`);
  ok(mouseAffordRes.plantCreated, `目标格成功落地实体植物 (开出: ${mouseAffordRes.plantName})`);

  console.log('=== 测试 3: 孢子不足时 (spore < 100) 鼠标种植安全拦截与飘字反馈 ===');
  const mouseBrokeRes = await page.evaluate(() => {
    const g = window.game;
    const p = g.player;
    const rm = g.rooms[0];
    let targetC = rm.x + 2, targetR = rm.y + 1;
    g.plants = g.plants.filter(pl => !(pl.c === targetC && pl.r === targetR));

    p.spore = 40; // 只有 40 孢子，不足 100
    g.menuCol = targetC;
    g.menuRow = targetR;

    let flyTexts = [];
    const origFly = g._flyText.bind(g);
    g._flyText = (x, y, txt, col) => {
      flyTexts.push({ x, y, txt });
      origFly(x, y, txt, col);
    };

    g.doPlant('blindbox');
    g._flyText = origFly;

    const plantExists = g.plants.some(pl => pl.c === targetC && pl.r === targetR);
    return {
      sporeAfter: p.spore,
      plantExists,
      flyTexts
    };
  });

  ok(mouseBrokeRes.sporeAfter === 40, `孢子不足时分文不扣 (当前: ${mouseBrokeRes.sporeAfter})`);
  ok(!mouseBrokeRes.plantExists, `孢子不足时目标格保持为空，杜绝假生成`);
  ok(mouseBrokeRes.flyTexts.some(f => f.txt.includes('孢子不足')), `在视野中触发了明确的「孢子不足」提示飘字`);

  console.log('=== 测试 4: 键盘建造菜单 (_execKMenu) 足额与不足额校验 ===');
  const kMenuRes = await page.evaluate(() => {
    const g = window.game;
    const p = g.player;
    const rm = g.rooms[0];
    let targetC = rm.x + 1, targetR = rm.y + 2;
    g.plants = g.plants.filter(pl => !(pl.c === targetC && pl.r === targetR));

    p.spore = 100;
    const mockMenu = { targetCol: targetC, targetRow: targetR };
    g._execKMenu(p, mockMenu, { action: 'buy', type: 'blindbox' });
    const created = g.plants.find(pl => pl.c === targetC && pl.r === targetR);

    // 再次在同个已有植物的格子上建，验证重复占用保护与防扣费
    p.spore = 100;
    let flyOccupied = [];
    const origFly = g._flyText.bind(g);
    g._flyText = (x, y, txt, col) => { flyOccupied.push(txt); origFly(x, y, txt, col); };
    g._execKMenu(p, mockMenu, { action: 'buy', type: 'blindbox' });
    g._flyText = origFly;

    return {
      firstSuccess: !!created,
      sporeAfterFirst: p.spore,
      occupiedPrompt: flyOccupied.some(t => t.includes('已有植物'))
    };
  });

  ok(kMenuRes.firstSuccess, `键盘建造盲盒 100% 成功落地植物`);
  ok(kMenuRes.sporeAfterFirst === 100, `重复建造在已有植物格子时不扣分并提示`);
  ok(kMenuRes.occupiedPrompt, `正确提示「该位置已有植物！」`);

  console.log('=== 测试 5: 菜单动态视觉置灰反馈 ===');
  const dimRes = await page.evaluate(() => {
    const g = window.game;
    const p = g.player;
    const rm = g.rooms[0];
    const targetC = rm.x + 1, targetR = rm.y + 3;
    g.plants = g.plants.filter(pl => !(pl.c === targetC && pl.r === targetR));

    p.spore = 20; // 余额不足
    g.openPlantMenu(400, 300);
    const optBroke = g.plantMenu.querySelector('.plant-option[data-t="blindbox"]');
    const brokeOpacity = optBroke ? optBroke.style.opacity : null;

    p.spore = 200; // 余额充足
    g.openPlantMenu(400, 300);
    const optRich = g.plantMenu.querySelector('.plant-option[data-t="blindbox"]');
    const richOpacity = optRich ? optRich.style.opacity : null;

    g._closePlantMenu();
    return { brokeOpacity, richOpacity };
  });

  ok(dimRes.brokeOpacity === '0.55', `孢子不足 100 时，盲盒选项置灰 (opacity: ${dimRes.brokeOpacity})`);
  ok(dimRes.richOpacity === '1', `孢子充足时，盲盒选项高亮激活 (opacity: ${dimRes.richOpacity})`);

  ok(errors.length === 0, `全程无页面脚本未捕获报错 (错误数: ${errors.length})`);
  if (errors.length > 0) console.log('   PAGE_ERRORS:', errors);

  console.log(`\n测试汇总: PASS: ${pass}, FAIL: ${fail}`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
