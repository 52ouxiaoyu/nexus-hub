// 截图：植物图鉴只剩 经典 / 融合 两区（守屋专属已取消），融合区 55 条全是真配方植物
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
    args: ['--no-sandbox','--allow-file-access-from-files'], userDataDir: '/tmp/pptr-prof-' + Date.now() });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('!!document.getElementById("btn-help-guide")');
  await p.evaluate(() => { document.getElementById('btn-help-guide').click(); document.querySelector('#help-modal .hg-tab[data-tab="plants"]').click(); });
  await sleep(400);
  // 滚到「融合」分区
  await p.evaluate(() => {
    const g = [...document.querySelectorAll('#help-body .hg-group')].find(x => /融\s*合/.test(x.textContent));
    g.scrollIntoView({ block: 'start' });
  });
  await sleep(400);
  await p.screenshot({ path: '_v4116_guide_fusion.png' });
  // 顶部（经典区 + 页签 91）
  await p.evaluate(() => { document.getElementById('help-body').scrollTop = 0; });
  await sleep(300);
  await p.screenshot({ path: '_v4116_guide_top.png' });
  console.log('截图完成');
  await b.close();
})();
