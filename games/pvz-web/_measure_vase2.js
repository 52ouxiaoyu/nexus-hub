/* v4.0.160 砸罐子配比/随机度测量：每关连开 N 局，统计罐位多样性 + 植物/僵尸/阳光配额 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const REPS = Number(process.env.REPS || 5);
(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
    userDataDir: '/tmp/pptr-mv2-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
  await p.waitForFunction('window._pvzGame');
  await sleep(400);
  const out = await p.evaluate(async (REPS) => {
    const g = window._pvzGame;
    const atk = new Set(g._vaseAttackerPool());
    const isWall = t => /nut|pumpkin|garlic/.test(t);
    const rows = [];
    for (let n = 1; n <= 10; n++) {
      const layouts = new Set(), perGame = [];
      for (let k = 0; k < REPS; k++) {
        g._startVaseLevel(n);
        await new Promise(r => setTimeout(r, 60));
        const vs = g.vases;
        layouts.add(vs.map(v => v.row + ',' + v.col + v.type[0] + (v.golden ? 'G' : '')).sort().join('|'));
        const c = { plant: 0, atk: 0, wall: 0, once: 0, sun: 0, zombie: 0 };
        vs.forEach(v => {
          const ct = v.content;
          if (!ct) return;
          if (ct.kind === 'sun') c.sun++;
          else if (ct.kind === 'zombie') c.zombie++;
          else if (ct.kind === 'plant') {
            c.plant++;
            if (atk.has(ct.type)) c.atk++;
            else if (isWall(ct.type)) c.wall++;
            else if (g._isVaseOncePlant(ct.type)) c.once++;
          }
        });
        c.vases = vs.length;
        c.typed = { p: vs.filter(v => v.type === 'plant').length, q: vs.filter(v => v.type === 'question').length, z: vs.filter(v => v.type === 'zombie').length };
        c.frontHidden = vs.filter(v => v.type === 'question' && v.col < 4 && v.content && v.content.kind === 'zombie').length;
        c.rowsZ = [0, 1, 2, 3, 4].map(r => vs.filter(v => v.row === r && v.content && v.content.kind === 'zombie').length);
        perGame.push(c);
      }
      const avg = k => +(perGame.reduce((a, x) => a + x[k], 0) / perGame.length).toFixed(2);
      rows.push({
        n, uniqLayouts: layouts.size, of: REPS, vases: avg('vases'),
        typed: perGame[0].typed,
        plants: avg('plant'), atk: avg('atk'), wall: avg('wall'), once: avg('once'),
        sun: avg('sun'), zombies: avg('zombie'),
        frontHidden: avg('frontHidden'),
        rowsZ: perGame[0].rowsZ
      });
    }
    return rows;
  }, REPS);
  for (const r of out) {
    console.log(`L${r.n} 罐${r.vases} (绿${r.typed.p}/问${r.typed.q}/紫${r.typed.z}) | 布局唯一 ${r.uniqLayouts}/${r.of} | `
      + `植物${r.plants}(输出${r.atk} 墙${r.wall} 一次${r.once}) 阳光${r.sun} 僵尸${r.zombies} | 前排暗雷${r.frontHidden} | 行内僵尸${r.rowsZ.join(',')}`);
  }
  await b.close();
})();
