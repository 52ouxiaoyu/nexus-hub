// v4.0.27 验证：舞王伴舞机制重做（手动驱动 update，不依赖真实对局）
// ①初始波：登场 3s 后四角各 1 只；②补充：本波死满 3 只且无存活伴舞才补新波（剩 1 只不补）；
// ③上限：一只舞王终生最多 12 只；④魅惑伴舞离场也回报；⑤新波出现在舞王当前四角
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  PASS", msg); }
  else { fail++; console.log("  FAIL", msg); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--allow-file-access-from-files', '--no-sandbox'],
    userDataDir: '/tmp/pptr-v4027-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  page.on('pageerror', e => console.log("  PAGE_ERROR:", e.message));

  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await sleep(2500);

  // 手动步进工具：对所有僵尸跑 n 帧 update（每帧重新快照，防遍历中表变化）
  await page.evaluate(() => {
    window.__step = (frames, dt = 0.05) => {
      for (let i = 0; i < frames; i++) {
        const zs = window._pvzGame.entities.filter(e => e instanceof Zombie && !e.isDead);
        for (const z of zs) { try { z.update(dt); } catch (e) {} }
      }
    };
    window.__waveOf = (d) => window._pvzGame.entities.filter(e => e instanceof Zombie && e._danceOwner === d && !e.isDead && e.state !== 'DYING');
  });

  // ===== A. 初始波：3s 后四角各 1 只 =====
  const a1 = await page.evaluate(() => {
    const g = window._pvzGame;
    const d = new Zombie(g, 2, 'dancing');
    d.x = 700; d.row = 2;
    d.summonTimer = 0.06; // 快速触发首波
    g.entities.push(d);
    window.__step(4); // 4 帧 × 0.05s = 0.2s > 0.06s
    const wave = window.__waveOf(d);
    return {
      n: wave.length,
      corners: wave.map(b => ({ dr: b.row - d.row, dx: Math.round(b.x - d.x) })).sort((p, q) => p.dr - q.dr || p.dx - q.dx),
      spawned: d._danceSpawnedTotal, alive: d._danceWaveAlive, size: d._danceWaveSize,
    };
  });
  ok(a1.n === 4, `A1 初始波四角各 1 只（实际 ${a1.n}）`);
  ok(a1.corners.every(p => Math.abs(Math.abs(p.dr) - 1) < 0.01 && Math.abs(Math.abs(p.dx) - 80) <= 6),
    `A2 站位为四角（对角线，舞王行走致 ±px 内偏差）：${JSON.stringify(a1.corners)}`);
  ok(a1.spawned === 4 && a1.alive === 4 && a1.size === 4, "A3 主人计数正确（4 召出/4 存活）");

  // ===== B. 死 3 只（剩 1 活）→ 不补新波 =====
  const b1 = await page.evaluate(() => {
    const g = window._pvzGame, d = window._pvzGame.entities.find(z => z.type === 'dancing' && !z.isDead);
    window.__d1 = d;
    const wave = window.__waveOf(d);
    for (let i = 0; i < 3; i++) wave[i].takeDamage(99999);
    window.__step(3); // 走真实死亡路径（update 里 hp<=0 → DYING → 回报主人）
    const spawnedNow = d._danceSpawnedTotal;
    window.__step(40); // 再走 2s（旧机制此时已再召 1 波）
    return {
      stillAlive: window.__waveOf(d).length,
      spawnedNow, spawnedLater: d._danceSpawnedTotal,
      waveDead: d._danceWaveDead, waveAlive: d._danceWaveAlive,
    };
  });
  ok(b1.stillAlive === 1, "B1 3 只伴舞死亡后场上剩 1 只");
  ok(b1.spawnedNow === 4 && b1.spawnedLater === 4, "B2 剩 1 只存活时不补新波（终生召唤数仍为 4）");
  ok(b1.waveAlive === 1, "B3 主人存活计数=1");

  // ===== C. 最后 1 只也死 → 本波死满 4 只 ≥3 → 补新波 4 只（四角） =====
  const c1 = await page.evaluate(() => {
    const g = window._pvzGame, d = window.__d1;
    const last = window.__waveOf(d)[0];
    last.takeDamage(99999);
    window.__step(3);
    const wave = window.__waveOf(d);
    return {
      n: wave.length, spawned: d._danceSpawnedTotal, waveDead: d._danceWaveDead,
      atCorners: wave.every(b => Math.abs(b.row - d.row) === 1 && Math.abs(b.x - d.x) === 80),
    };
  });
  ok(c1.n === 4, `C1 最后一只也死 → 补新波 4 只（实际 ${c1.n}）`);
  ok(c1.spawned === 8, "C2 终生召唤数 4→8");
  ok(c1.waveDead === 0, "C3 新波死亡计数归零");
  ok(c1.atCorners, "C4 新波出现在舞王当前位置的四角");

  // ===== D. 终生上限 12：再打光两波（8→12）后不再补 =====
  const d1 = await page.evaluate(async () => {
    const g = window._pvzGame, d = window.__d1;
    const killWave = () => {
      let guard = 0;
      while (guard++ < 40) {
        const wave = window.__waveOf(d);
        if (wave.length === 0) break;
        for (const b of wave) b.takeDamage(99999);
        window.__step(3);
      }
      window.__step(20); // 给补波留机会
    };
    killWave(); // 第三波：8→12
    const spawned12 = d._danceSpawnedTotal;
    killWave(); // 第四波不应出现
    return { spawned12, spawnedFinal: d._danceSpawnedTotal, aliveFinal: window.__waveOf(d).length };
  });
  ok(d1.spawned12 === 12, `D1 第三波补满至上限 12（实际 ${d1.spawned12}）`);
  ok(d1.spawnedFinal === 12, "D2 上限 12 后第四波不再召唤（不无限循环）");
  ok(d1.aliveFinal === 0, "D3 打光后场上无伴舞残留");

  // ===== E. 魅惑伴舞走出右侧离场也回报主人 =====
  const e1 = await page.evaluate(() => {
    const g = window._pvzGame;
    const d = new Zombie(g, 3, 'dancing');
    d.x = 700; d.row = 3; d.summonTimer = 0.06;
    g.entities.push(d);
    window.__step(4);
    window.__d2 = d;
    const b = window.__waveOf(d)[0];
    b.hypnotized = true; // 魅惑
    b.x = 984; b.updateHypnotized(0.1, 30); // 走出右边界（第 2 参=移动速度）
    return { waveAlive: d._danceWaveAlive, waveDead: d._danceWaveDead, remaining: window.__waveOf(d).length };
  });
  ok(e1.waveAlive === 3 && e1.waveDead === 1, "E1 魅惑伴舞离场计入死亡（存活 3/死亡 1）");
  ok(e1.remaining === 3, "E2 场上剩 3 只存活伴舞（不补新波，符合『还剩活的不补』）");

  // ===== F. 不再周期召唤：无死亡事件时推进 12s 也不会自动补波 =====
  const f1 = await page.evaluate(() => {
    const d = window.__d2;
    const before = d._danceSpawnedTotal;
    window.__step(240); // 12s（旧机制会再召 1 波）
    return { before, after: d._danceSpawnedTotal };
  });
  ok(f1.before === 4 && f1.after === 4, "F1 无死亡事件时永不自动召唤（周期召唤已移除）");

  // ===== G. 舞王本体死亡 → 伴舞保留但全灭后不再补波 =====
  const g1 = await page.evaluate(() => {
    const g = window._pvzGame;
    const d = new Zombie(g, 1, 'dancing');
    d.x = 700; d.row = 1; d.summonTimer = 0.06;
    g.entities.push(d);
    window.__step(4);
    d.takeDamage(99999);
    window.__step(3);
    const backupsAlive = window.__waveOf(d).length;
    for (const b of window.__waveOf(d)) b.takeDamage(99999);
    window.__step(30);
    return { backupsAlive, spawnedFinal: d._danceSpawnedTotal };
  });
  ok(g1.backupsAlive === 4, "G1 舞王死后已召出的伴舞仍在场上（不清场）");
  ok(g1.spawnedFinal === 4, "G2 舞王死后伴舞全灭也不再补波");

  console.log(`\n结果: ${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
