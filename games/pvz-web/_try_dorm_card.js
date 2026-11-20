// 守屋卡片封面改版试验台：注入候选 CSS + 改写 DOM，出图对比（不落盘到 index.html）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const cssFile = process.argv[2];
  const out = process.argv[3] || '_dorm_try';
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('document.getElementById("btn-dorm")', { timeout: 20000 });
  await page.evaluate(() => { const m = document.getElementById('start-menu'); if (m) m.style.display = 'block'; });

  // DOM 改写：删 emoji 叶、☀️ 换原版 Sun.gif、加地面投影
  await page.evaluate(() => {
    const art = document.querySelector('#btn-dorm .pkt-art.dorm');
    art.querySelectorAll('.dorm-leaf').forEach(e => e.remove());
    const sun = art.querySelector('.dorm-sun');
    if (sun) {
      const img = document.createElement('img');
      img.className = 'dorm-sun';
      img.src = 'assets/images/interface/Sun.gif';
      img.alt = '阳光';
      sun.replaceWith(img);
    }
    // 三块贴地投影
    [['dorm-sh-l', 'left'], ['dorm-sh-c', 'center'], ['dorm-sh-r', 'right']].forEach(([cls]) => {
      const s = document.createElement('span');
      s.className = 'dorm-sh ' + cls;
      art.appendChild(s);
    });
  });

  // 必须插到 body 内 #menu-style 之后：head 里的同权重规则会被 body 内的 <style id="menu-style"> 反超
  const css = fs.readFileSync(cssFile, 'utf8');
  await page.evaluate(cssText => {
    const st = document.createElement('style');
    st.id = 'trial-css';
    st.textContent = cssText;
    const anchor = document.getElementById('menu-style');
    anchor.parentNode.insertBefore(st, anchor.nextSibling);
  }, css);
  await sleep(900);

  const card = await page.$('#btn-dorm');
  await card.screenshot({ path: out + '_card.png' });
  const row = await page.$('#vs-row');
  await row.screenshot({ path: out + '_row.png' });

  const d = await page.evaluate(() => {
    const art = document.querySelector('#btn-dorm .pkt-art.dorm');
    const r = art.getBoundingClientRect();
    const k = 1 / (r.width / 158);
    const items = [...art.querySelectorAll('.dorm-hero,.dorm-side,.dorm-sun')].map(i => {
      const b = i.getBoundingClientRect();
      return { cls: i.className, x: +((b.x - r.x) * k).toFixed(1), w: +(b.width * k).toFixed(1), h: +(b.height * k).toFixed(1), gapBottom: +((r.bottom - b.bottom) * k).toFixed(1) };
    });
    return { artW: +(r.width * k).toFixed(1), artH: +(r.height * k).toFixed(1), items };
  });
  console.log(JSON.stringify(d));
  await browser.close();
})();
