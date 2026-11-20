// v4.0.143 验收：①破门永久（人机不能重建坚果门）②人机原地绕圈兜底 ③真人僵尸碰到人机即秒杀
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0, FAIL = 0;
const ok = (c, m, extra) => {
    if (c) { PASS++; console.log('  PASS ' + m + (extra !== undefined ? '  [' + extra + ']' : '')); }
    else { FAIL++; console.log('  FAIL ' + m + (extra !== undefined ? '  [' + extra + ']' : '')); }
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
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
    await page.waitForFunction('typeof window.startHauntedDorm === "function"');
    await page.evaluate(() => {
        localStorage.clear();
        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('dorm-screen').style.display = 'block';
        window.startHauntedDorm({ gameMode: '1p', faction: 'zombie', role1: 'peashooter' });
    });
    await sleep(1200);

    // ============ A. 破门永久 ============
    console.log('\n【A】门被咬毁后永久失效（人机不能重建坚果门）');
    const A = await page.evaluate(() => {
        const g = window.game;
        const rm = g.rooms.find(r => g.getPlantAt(r.doorCol * 80, r.doorRow * 80)) || g.rooms[0];
        const door = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
        const before = door ? door.hp : null;
        // 模拟被咬毁
        if (door) { door.el1 && door.el1.remove(); if (door.txtEl) door.txtEl.remove(); g.plants = g.plants.filter(x => x !== door); }
        const goneNow = !g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
        // 同步标记（_tick 顶部会调，这里直接调一次确认幂等）
        g._syncRoomDoors();
        g._syncRoomDoors();
        const brokenAfterSync = !!rm.doorBroken;
        // ① 门危逃亡走到新房间 → _claimRoom 认领（旧版在这里补满血坚果）
        const ai = g.ais[0];
        rm.owners = [];
        ai.room = null; ai.targetRoom = rm;
        const claimOk = g._claimRoom(ai, rm);
        const rebuiltByClaim = !!g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
        // ② 玩家走进空房自动认领（同一条 _claimRoom）
        const rm2 = g.rooms.find(r => r !== rm && (r.owners || []).length === 0);
        let rebuiltByPlayer = null, rm2broken = null;
        if (rm2) {
            const d2 = g.getPlantAt(rm2.doorCol * 80, rm2.doorRow * 80);
            if (d2) { d2.el1 && d2.el1.remove(); g.plants = g.plants.filter(x => x !== d2); }
            g._syncRoomDoors();
            rm2broken = !!rm2.doorBroken;
            rm2.owners = [];
            g._claimRoom(g.player, rm2);
            rebuiltByPlayer = !!g.getPlantAt(rm2.doorCol * 80, rm2.doorRow * 80);
        }
        // ③ 从没被咬过的房（门还在）→ 标记不应变成 broken
        const rm3 = g.rooms.find(r => r !== rm && r !== rm2 && g.getPlantAt(r.doorCol * 80, r.doorRow * 80));
        const intactBroken = rm3 ? !!rm3.doorBroken : false;
        return { before, goneNow, brokenAfterSync, claimOk, rebuiltByClaim, rm2broken, rebuiltByPlayer, intactBroken,
                 doorTiles: g.rooms.filter(r => r.doorBroken).length };
    });
    ok(A.before > 0, 'A1 测试房间原本有坚果门板', 'hp=' + A.before);
    ok(A.goneNow, 'A2 门板已从场上移除');
    ok(A.brokenAfterSync, 'A3 同步一次即标记 rm.doorBroken');
    ok(A.rebuiltByClaim === false, 'A4 人机 _claimRoom 认领后，门口仍是空的（不再补满血坚果）');
    ok(A.rm2broken === true && A.rebuiltByPlayer === false, 'A5 玩家走进空房自动认领也不会重建破门',
        'rm2broken=' + A.rm2broken + ' rebuilt=' + A.rebuiltByPlayer);
    ok(A.intactBroken === false, 'A6 门还活着的房间不会被误标为破门');

    // ============ B. 人机绕圈兜底 ============
    console.log('\n【B】人机原地绕圈兜底（6 秒挪不动就就地安顿）');
    const B = await page.evaluate(async () => {
        const g = window.game;
        const ai = g.ais.find(a => !a.dead) || g.ais[0];
        // 造一个「有路点但走不动」的死循环：把人机放在一间空房的床位上，每帧按住不动
        const rm = g.rooms.find(r => (r.owners || []).length === 0) || g.rooms[0];
        rm.owners = [];
        const bed = rm.tpl.beds[0];
        const sx = (rm.x + bed.c) * g.gridSize + 40, sy = (rm.y + bed.r) * g.gridSize + 40;
        ai.x = sx; ai.y = sy;
        if (ai.el1) { ai.el1.style.left = sx + 'px'; ai.el1.style.top = sy + 'px'; }
        ai.room = null; ai.targetRoom = rm; ai.pinned = false; ai.fleeing = false;
        ai._spinRef = null; ai._badRoom = {};
        let t = g.gameTime;
        for (let i = 0; i < 160; i++) {          // 160 × 50ms = 8 秒
            ai.path = [{ x: sx + 900, y: sy + 900 }]; // 一直「想走」
            ai.x = sx; ai.y = sy;                     // 但原地不动
            t += 50;
            g._tick(0.05, t);
        }
        const settled = ai.pinned === true || (!ai.path && !ai.targetRoom);
        return { settled, pinned: !!ai.pinned, pathLen: ai.path ? ai.path.length : 0, targetRoom: ai.targetRoom ? 1 : 0 };
    });
    ok(B.settled, 'B1 连续 6 秒「有路点却挪不动」后不再死循环（已钉床或已停摆）',
        'pinned=' + B.pinned + ' path=' + B.pathLen + ' target=' + B.targetRoom);

    const B2 = await page.evaluate(() => {
        const g = window.game;
        // 回到床边发现进不去 → 必须把该房拉黑，且不再挑回同一间
        const ai = g.ais.find(a => !a.dead) || g.ais[0];
        const rm = g.rooms[0];
        ai._badRoom = {};
        const key = g._aiRoomKey(rm);
        g._aiMarkBadRoom(ai, rm, 20000);
        const bad = g._aiRoomBad(ai, rm);
        // 黑名单房不会被「最近可住」选中
        const pick = g._aiNearestClaimRoom(ai);
        return { bad, pickedSame: pick === rm };
    });
    ok(B2.bad, 'B2 失败房会被拉黑 20 秒');
    ok(!B2.pickedSame, 'B3 黑名单里的房不会再被选成目标（防原地乒乓）');

    // ============ C. 碰到人机即秒杀 ============
    console.log('\n【C】真人僵尸碰到人机 = 一击毙命');
    await page.evaluate(() => {
        window.startHauntedDorm({ gameMode: '1p', faction: 'zombie', role1: 'peashooter' });
    });
    await sleep(900);
    const C = await page.evaluate(async () => {
        const g = window.game;
        g.gameTime = Math.max(g.gameTime, 6000); // 跳过开局 5 秒保护
        const ai = g.ais.find(a => !a.dead);
        const sc = g._spawnCenterPx();
        ai.pinned = false; ai.room = null; ai.targetRoom = null; ai.path = null; ai.fleeing = false;
        ai.x = sc.x; ai.y = sc.y;
        if (ai.el1) { ai.el1.style.left = ai.x + 'px'; ai.el1.style.top = ai.y + 'px'; }
        g.player.x = sc.x + 10; g.player.y = sc.y;   // 贴脸（<50px）
        g.player.dead = false;
        const hpBefore = ai.hp, killsBefore = g.kills || 0;
        let t = g.gameTime;
        for (let i = 0; i < 6 && !ai.dead; i++) { t += 16; g._tick(0.016, t); }
        return { hpBefore, hpAfter: ai.hp, dead: !!ai.dead, killsBefore, killsAfter: g.kills || 0,
                 firstFrameDead: !!ai.dead, t };
    });
    ok(C.hpBefore > 100, 'C1 人机初始血量正常', 'hp=' + C.hpBefore);
    ok(C.dead === true, 'C2 僵尸玩家贴到人机身上 → 人机当场死亡（不再需要啃 7 口 / 10 秒）',
        'hp=' + C.hpAfter);
    ok(C.killsAfter === C.killsBefore + 1, 'C3 击杀数与尸潮进度正常记账',
        C.killsBefore + ' -> ' + C.killsAfter);

    const C4 = await page.evaluate(async () => {
        const g = window.game;
        const ai2 = g.ais.find(a => !a.dead);
        if (!ai2) return { err: '没有活着的人机了' };
        // 远离接触距离（>50px）必须打不死——避免「隔空秒杀」
        g.player.x = ai2.x + 300; g.player.y = ai2.y;
        let t = g.gameTime;
        const hp0 = ai2.hp;
        for (let i = 0; i < 12; i++) { t += 16; g._tick(0.016, t); }
        return { hp0, hp1: ai2.hp, dead: !!ai2.dead, dist: Math.hypot(g.player.x - ai2.x, g.player.y - ai2.y) };
    });
    ok(!C4.err && !C4.dead, 'C4 拉开距离后不会隔空秒杀（判定仍是 50px 接触）',
        C4.err || ('dist=' + Math.round(C4.dist) + ' hp=' + C4.hpAfter));

    // ============ D. 稳定性 ============
    console.log('\n【D】稳定性');
    const D = await page.evaluate(() => {
        const g = window.game;
        return {
            ais: g.ais.length,
            alive: g.ais.filter(a => !a.dead).length,
            plants: g.plants.length,
            brokenRooms: g.rooms.filter(r => r.doorBroken).length,
            doors: g.rooms.filter(r => g.getPlantAt(r.doorCol * 80, r.doorRow * 80)).length
        };
    });
    ok(D.ais === 5, 'D1 人机仍是 5 个', D.ais);
    ok(D.brokenRooms <= D.ais + 2, 'D2 破门标记数量合理（不会全图误标）', D.brokenRooms + '/10');
    ok(errs.length === 0, 'D3 全程零 pageerror', errs.slice(0, 2).join(' | '));

    console.log('\n合计：' + PASS + ' PASS / ' + FAIL + ' FAIL');
    await b.close();
    process.exit(FAIL ? 1 : 0);
})();
