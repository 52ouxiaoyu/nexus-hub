// 诊断：僵尸方模式 90 秒内 AI 建造行为
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await page.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0', { timeout: 30000 });
  // 僵尸玩家蹲在地图中心不动（不影响 AI），采样 9 次每 10 秒
  for (let i = 0; i < 9; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const r = await page.evaluate(() => ({
      t: Math.round(window.game.gameTime / 1000),
      plants: window.game.plants.length,
      roomsOwned: window.game.rooms.filter(rm => rm.owners.length > 0).map(rm => rm.owners.length),
      ais: window.game.ais.map(a => ({
        dead: !!a.dead, hasRoom: !!a.room, path: a.path ? a.path.length : -1,
        sun: Math.floor(a.sun), act: a.actTimer === undefined ? 'u' : Math.round(a.actTimer * 10) / 10,
        flee: a.speed === 300, x: Math.round(a.x / 80), y: Math.round(a.y / 80)
      }))
    }));
    console.log('T+' + r.t + 's plants=' + r.plants, 'owned=' + JSON.stringify(r.roomsOwned));
    console.log('  ' + r.ais.map(a => `[d=${a.dead ? 1 : 0} rm=${a.hasRoom ? 1 : 0} p=${a.path} ☀${a.sun} act=${a.act} flee=${a.flee ? 1 : 0} @${a.x},${a.y}]`).join(' '));
  }
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
