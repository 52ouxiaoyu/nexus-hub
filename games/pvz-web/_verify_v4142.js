// v4.0.142 验收：
//  A 守屋房间再放大（阈值上新档）+ 几何/出生点回归
//  B 南瓜套套在路灯花上不再下坠（锚点=可见内容底边）
//  C 砸罐子：路灯花照亮 → 骰子重掷后缩略图仍在场上（不再空白/半透明空壳）
//  D 我是僵尸：卡带尾部「🔥 融合 / 炉」按钮已删，手套入口仍在
//  E 彩蛋猫层级压过顶部条
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0, FAIL = 0;
const ok = (c, m, extra) => { if (c) { PASS++; console.log('  PASS ' + m + (extra !== undefined ? '  [' + extra + ']' : '')); } else { FAIL++; console.log('  FAIL ' + m + (extra !== undefined ? '  [' + extra + ']' : '')); } };

const ANALYZE = () => {
    const g = window.game;
    const areaOf = (grid, w, h) => {
        let n = 0;
        for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (grid[r][c] === 1) n++;
        return n;
    };
    const reach = (rm) => {
        const { grid, door } = rm.tpl;
        const W = rm.w, H = rm.h;
        const seen = new Set();
        const start = [];
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const r = door.r + d[0], c = door.c + d[1];
            if (r >= 0 && r < H && c >= 0 && c < W && grid[r][c] === 1) start.push([r, c]);
        }
        if (!start.length) return { okRooms: false };
        const st = [start[0]];
        seen.add(start[0][0] * 1000 + start[0][1]);
        while (st.length) {
            const [r, c] = st.pop();
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue;
                if (grid[nr][nc] !== 1) continue;
                const k = nr * 1000 + nc;
                if (seen.has(k)) continue;
                seen.add(k); st.push([nr, nc]);
            }
        }
        let total = 0;
        for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (grid[r][c] === 1) total++;
        return { okRooms: seen.size === total, seen: seen.size, total, seenSet: [...seen] };
    };
    const rooms = g.rooms.map((rm, i) => {
        const a = areaOf(rm.tpl.grid, rm.w, rm.h);
        const rc = reach(rm);
        const bedOk = rm.tpl.beds.every(b => {
            const solid = rm.tpl.grid[b.r] && rm.tpl.grid[b.r][b.c] === 1;
            const rch = rc.seenSet ? rc.seenSet.includes(b.r * 1000 + b.c) : false;
            return solid && rch;
        });
        return {
            i, x: rm.x, y: rm.y, w: rm.w, h: rm.h, area: a,
            beds: rm.tpl.beds.length, bedOk, reachable: rc.okRooms,
            inBounds: rm.x >= 1 && rm.y >= 1 && rm.x + rm.w <= g.cols - 1 && rm.y + rm.h <= g.rows - 1
        };
    });
    let overlap = 0, gapBad = 0;
    for (let i = 0; i < g.rooms.length; i++) {
        for (let j = i + 1; j < g.rooms.length; j++) {
            const a = g.rooms[i], b = g.rooms[j];
            if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) overlap++;
            const gx = a.x - (b.x + b.w), gx2 = b.x - (a.x + a.w);
            const gy = a.y - (b.y + b.h), gy2 = b.y - (a.y + a.h);
            if (Math.max(gx, gx2) < 2 && Math.max(gy, gy2) < 2) gapBad++;
        }
    }
    const sc = g.spawnCenter;
    const spawnInRoom = !!g._insideRoom(sc.c, sc.r);
    const boxHit = g.rooms.filter(rm =>
        (sc.c + 1.5) > rm.x && (sc.c - 1.5) < rm.x + rm.w &&
        (sc.r + 1.5) > rm.y && (sc.r - 1.5) < rm.y + rm.h).length;
    let nearHit = 0;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        if (g.rooms.some(rm => sc.c + dc >= rm.x && sc.c + dc < rm.x + rm.w && sc.r + dr >= rm.y && sc.r + dr < rm.y + rm.h)) nearHit++;
    }
    const p1 = g.player;
    const p1InRoom = !!g._insideRoom(Math.floor(p1.x / g.gridSize), Math.floor(p1.y / g.gridSize));
    return { n: g.rooms.length, rooms, overlap, gapBad, spawnInRoom, boxHit, nearHit, p1InRoom };
};

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e.message)));
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
    await page.waitForFunction('typeof window.startHauntedDorm === "function"');
    await page.evaluate(() => { localStorage.clear(); });

    // ---------- E 彩蛋猫层级（要在隐藏菜单之前量）----------
    console.log('\n【E】彩蛋猫不被顶部条盖住');
    const zinfo = await page.evaluate(() => {
        const cat = document.getElementById('menu-cat-wrap');
        const bar = document.querySelector('.menu-topbar');
        return {
            cat: cat ? getComputedStyle(cat).zIndex : null,
            bar: bar ? getComputedStyle(bar).zIndex : null,
            ver: getComputedStyle(document.getElementById('start-version')).zIndex
        };
    });
    ok(Number(zinfo.cat) > Number(zinfo.bar), '猫的层级高于顶部条（返回/说明/成就）', 'cat=' + zinfo.cat + ' bar=' + zinfo.bar);
    ok(Number(zinfo.cat) > 5, '猫层级 ≥ 8', zinfo.cat);

    // ---------- A 守屋房间 ----------
    await page.evaluate(() => {
        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('dorm-screen').style.display = 'block';
    });
    const N = 30;
    const all = [];
    let worst = null;
    for (let k = 0; k < N; k++) {
        const r = await page.evaluate((SRC) => {
            window.startHauntedDorm({ gameMode: '1p', faction: 'plant', role1: 'peashooter' });
            return (new Function('return (' + SRC + ')()'))();
        }, ANALYZE.toString());
        all.push(r);
        if (!worst || Math.max(...r.rooms.map(x => x.area)) > Math.max(...worst.rooms.map(x => x.area))) worst = r;
    }
    console.log('\n【A】30 局随机地图 · 尺寸分布');
    const areasPerMap = all.map(r => r.rooms.map(x => x.area).sort((a, b) => a - b));
    const flat = areasPerMap.flat();
    const avg = flat.reduce((a, b) => a + b, 0) / flat.length;
    areasPerMap.slice(0, 4).forEach((a, i) => console.log('    #' + (i + 1) + ' ' + a.join(' ')));
    console.log('  全局 min/max/avg = ' + Math.min(...flat) + ' / ' + Math.max(...flat) + ' / ' + avg.toFixed(1));

    ok(all.every(r => r.n === 10), '每局都是 10 间房', all.map(r => r.n).join(','));
    ok(all.every(r => r.rooms.every(x => x.area >= 6)), '最小房 ≥ 6 格（原最小 4 格）', Math.min(...flat));
    ok(all.every(r => r.rooms.every(x => x.area <= 50)), '最大房 ≤ 50 格（正常上限）', Math.max(...flat));
    ok(all.every(r => r.rooms.some(x => x.area >= 40)), '每局至少 1 间 40 格以上的大房');
    ok(all.every(r => r.rooms.filter(x => x.area <= 13).length === 1), '每局恰好 1 间小房（≤13 格，不多给）',
        'max=' + Math.max(...all.map(r => r.rooms.filter(x => x.area <= 13).length)));
    ok(avg >= 23, '平均单房面积 ≥ 23 格（v4.0.141 是 21.2）', avg.toFixed(1));
    ok(flat.filter(a => a >= 28).length / flat.length >= 0.30, '28 格以上的房占比 ≥ 30%（"不小的房"变多）',
        (flat.filter(a => a >= 28).length / flat.length * 100).toFixed(0) + '%');

    console.log('\n【A2】几何合法性（30 局 × 10 房）');
    ok(all.every(r => r.rooms.every(x => x.inBounds)), '所有房间都在地图内');
    ok(all.every(r => r.overlap === 0), '房间包围盒零重叠');
    ok(all.every(r => r.gapBad === 0), '房间之间至少留 2 格走廊');
    ok(all.every(r => r.rooms.every(x => x.reachable)), '每间房从门口都能走到全部实心格',
        all.flatMap(r => r.rooms.filter(x => !x.reachable).map(x => '#' + x.i)).slice(0, 3).join(' | '));
    ok(all.every(r => r.rooms.every(x => x.bedOk)), '每张床都在实心格且可达');
    ok(all.every(r => r.rooms.filter(x => x.beds === 2).length === 1), '每局恰好 1 间双床房');

    console.log('\n【A3】出生点 / 回血圆圈不被大房包住');
    ok(all.every(r => !r.spawnInRoom), '出生圆圈中心不在任何房间内');
    ok(all.every(r => r.boxHit === 0), '圆圈实际占地（±1.5 格）不与任何房间相交');
    ok(all.every(r => r.nearHit === 0), '圆圈四周留 1 格余量（±2 格内无房间）');
    ok(all.every(r => !r.p1InRoom), '玩家出生在屋外');

    await sleep(2000);
    const live = await page.evaluate(() => ({
        ais: window.game.ais.length,
        humans: window.game.allPlayers.filter(p => !p.isAi).length,
        rooms: window.game.rooms.length,
        plants: window.game.plants.length
    }));
    console.log('\n【A4】运行期');
    ok(live.ais === 5, '人机 5 只', live.ais);
    ok(live.plants >= live.rooms, '每间房都有初始阳光菇', live.plants + '/' + live.rooms);

    // ---------- 重载进入砸罐子 / 主游戏 ----------
    await page.reload();
    await page.waitForFunction('typeof window.game === "object" || typeof window._pvzGame === "object"');
    await page.waitForFunction('window._pvzGame && window._pvzGame.board');

    // ---------- B 南瓜套 × 路灯花 ----------
    console.log('\n【B】南瓜套套在路灯花上（不再下坠）');
    const shieldInfo = await page.evaluate(async () => {
        const g = window._pvzGame;
        g.state = 'PLAYING';
        g.vaseMode = true; // 借用砸罐子场景的 board/entityLayer（不影响后续断言）
        // 找一块空旷的连续两行空地，避免与场景实体重叠
        g.board.addPlant = g.board.addPlant.bind(g.board);
        const p = new Plant(g, 'plantern');
        let placed = null;
        for (let r = 1; r < g.board.rows - 1 && !placed; r++) {
            for (let c = 1; c < g.board.cols - 1 && !placed; c++) {
                if (g.board.canPlant(r, c) && g.board.canPlant(r, c + 1)) { placed = [r, c]; }
            }
        }
        if (!placed) return { err: '没有空地' };
        if (!g.board.addPlant(p, placed[0], placed[1])) return { err: 'addPlant 失败' };
        p.attachShield();
        // GIF 是异步解码的：offsetHeight/naturalHeight 在 load 前都是 0，
        // _shieldGeomCalc 会直接 return 旧几何（null）→ 量出来全是兜底值
        for (let i = 0; i < 40 && !(p.element.naturalHeight > 0); i++) {
            await new Promise(r => setTimeout(r, 50));
        }
        // 手动推进一帧：让 _shieldGeomCalc 生效
        p.update(0.016);
        const er = p.element.getBoundingClientRect();
        const sr = p.shieldEl ? p.shieldEl.getBoundingClientRect() : null;
        if (!sr) return { err: '没有 shieldEl' };
        const nat = p.element.naturalHeight || er.height;
        const contentBottomRatio = 163 / 237; // plantern 0.gif 的可见内容底边比例
        const contentBottom = er.top + er.height * (nat ? contentBottomRatio : 1);
        return {
            natH: nat, elH: Math.round(er.height), elTop: Math.round(er.top), elBottom: Math.round(er.bottom),
            contentBottom: Math.round(contentBottom),
            shieldTop: Math.round(sr.top), shieldBottom: Math.round(sr.bottom),
            gap: Math.round(sr.bottom - contentBottom),
            cellH: g.board.cellHeight, hasShield: !!p.shield
        };
    });
    if (shieldInfo.err) { ok(false, '南瓜套 × 路灯花 用例可执行', shieldInfo.err); }
    else {
        ok(shieldInfo.hasShield, '套壳成功');
        ok(Math.abs(shieldInfo.gap) <= 8, '壳底贴着路灯花「看得见的脚」（不再下坠 ~72px）',
            'gap=' + shieldInfo.gap + 'px, cellH=' + shieldInfo.cellH + ', elH=' + shieldInfo.elH);
        ok(shieldInfo.elH > 150, '（前提）路灯花是可验证的大画布立绘', 'element 高 ' + shieldInfo.elH + 'px');
    }

    // ---------- C 砸罐子重掷 ----------
    console.log('\n【C】砸罐子：照亮后重掷，罐内预览不丢');
    await page.reload();
    await page.waitForFunction('window._pvzGame && window._pvzGame.board');
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.vaseDifficulty = 'easy';
        g._beginVaseGame();
    });
    await sleep(1200);
    const vaseRes = await page.evaluate(async () => {
        const g = window._pvzGame;
        const layer = g.entityLayer;
        // 挑一个植物罐做用例（内容可预览植物立绘）
        const v = g.vases.find(x => !x.smashed && x.content && x.content.kind === 'plant');
        if (!v) return { err: '本局没有植物罐' };
        // lightUpNeighbors 会跳过中心格（灯自己不算被照亮），所以灯必须放在罐子旁边
        let lamp = null;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
            const r = v.row + dr, c = v.col + dc;
            if (r < 0 || r >= g.board.rows || c < 0 || c >= g.board.cols) continue;
            if (g.vases.some(x => !x.smashed && x.row === r && x.col === c)) continue;
            lamp = { r, c };
            break;
        }
        if (!lamp) return { err: '罐子四周没有空位放灯' };
        g.lightUpNeighbors(lamp.r, lamp.c);
        if (!v.revealed) return { err: '照亮失败：罐子未被标记 revealed' };
        // 缩略图 <img> 异步解码，量 rect 前先等它拿到自然尺寸
        {
            const probe = v.contentEl && (v.contentEl.tagName === 'IMG' ? v.contentEl : v.contentEl.querySelector('img'));
            for (let i = 0; i < 40 && probe && !(probe.naturalWidth > 0); i++) await new Promise(r => setTimeout(r, 50));
        }
        const before = v.contentEl ? {
            parent: v.contentEl.parentNode === layer ? 'layer' : (v.contentEl.parentNode && v.contentEl.parentNode.tagName),
            src: (v.contentEl.querySelector && v.contentEl.querySelector('img') ? v.contentEl.querySelector('img').getAttribute('src') : v.contentEl.getAttribute('src')) || '',
            w: Math.round(v.contentEl.getBoundingClientRect().width)
        } : null;
        const kindBefore = v.content.type;
        const uses0 = g.vaseRerollUses;
        g.rerollVase(v);
        {
            const probe = v.contentEl && (v.contentEl.tagName === 'IMG' ? v.contentEl : v.contentEl.querySelector('img'));
            for (let i = 0; i < 40 && probe && !(probe.naturalWidth > 0); i++) await new Promise(r => setTimeout(r, 50));
        }
        const el = v.contentEl;
        const img = el ? (el.tagName === 'IMG' ? el : el.querySelector('img')) : null;
        const rect = el ? el.getBoundingClientRect() : null;
        return {
            before, kindBefore,
            revealed: v.revealed,
            hasEl: !!el,
            parentIsLayer: !!(el && el.parentNode === layer),
            parentTag: el && el.parentNode ? el.parentNode.className : null,
            inVaseImg: !!(el && el.parentNode === v.element),
            src: img ? img.getAttribute('src') : null,
            natW: img ? img.naturalWidth : 0,
            w: rect ? Math.round(rect.width) : 0,
            h: rect ? Math.round(rect.height) : 0,
            vaseOpacity: v.element ? v.element.style.opacity : '',
            uses: g.vaseRerollUses, uses0,
            zIndex: el ? el.style.zIndex : null,
            kindAfter: v.content.type
        };
    });
    if (vaseRes.err) { ok(false, '砸罐子用例可执行', vaseRes.err); }
    else {
        ok(vaseRes.before && vaseRes.before.w > 0, '照亮后缩略图正常（前置条件）', vaseRes.before && vaseRes.before.src);
        ok(vaseRes.hasEl, '重掷后缩略图重新生成（不再空白）');
        ok(vaseRes.parentIsLayer, '缩略图挂在 entityLayer 上（不是塞进 <img> 罐子里）', 'parent=' + vaseRes.parentTag);
        ok(!vaseRes.inVaseImg, '没有把图 append 进 img 罐子（img 子节点永不渲染）');
        ok(vaseRes.natW > 0 && vaseRes.w > 4, '缩略图实际渲染出像素', 'natural=' + vaseRes.natW + ' 显示 ' + vaseRes.w + 'x' + vaseRes.h);
        ok(vaseRes.uses === vaseRes.uses0 - 1, '骰子次数正常扣减', vaseRes.uses0 + '→' + vaseRes.uses);
        ok(Math.abs(parseFloat(vaseRes.vaseOpacity) - 0.4) < 0.01, '罐子仍是"照亮后半透明"状态（预期）', vaseRes.vaseOpacity);
    }

    // ---------- D 僵尸卡带：无融合炉按钮 ----------
    console.log('\n【D】我是僵尸：卡带不再有「🔥 融合 / 炉」');
    const bankInfo = await page.evaluate(() => {
        const g = window._pvzGame;
        g.zombieMode = true;
        g.state = 'PLAYING';
        g.sunCount = 5000;
        g.buildZombieBank();
        const bank = document.getElementById('zombie-bank');
        const glove = document.getElementById('zfuse-glove');
        return {
            fuseBtns: bank.querySelectorAll('.fuse-btn').length,
            cards: bank.querySelectorAll('.zcard').length,
            hasFuseText: Array.from(bank.querySelectorAll('.zcard')).some(c => /融合|炉/.test(c.textContent)),
            gloveExists: !!glove,
            gloveClick: !!glove && !!glove.dataset.zfBound
        };
    });
    ok(bankInfo.fuseBtns === 0, '卡带里没有 .fuse-btn', bankInfo.fuseBtns);
    ok(!bankInfo.hasFuseText, '卡面上没有任何「融合 / 炉」字样');
    ok(bankInfo.cards > 0, '普通僵尸卡仍在', bankInfo.cards + ' 张');
    ok(bankInfo.gloveExists, '阳光上方融合手套仍在（唯一入口）');

    const fuseStillWorks = await page.evaluate(() => {
        const g = window._pvzGame;
        g._zFusePicking = false;
        g._toggleFuseMode();
        const on = g._zFusePicking;
        g._toggleFuseMode();
        return { on, off: g._zFusePicking };
    });
    ok(fuseStillWorks.on === true && fuseStillWorks.off === false, '手套仍能开关融合模式');

    ok(errs.length === 0, '无 pageerror', errs.slice(0, 3).join(' | '));

    console.log('\n===== ' + PASS + ' / ' + (PASS + FAIL) + ' 通过 =====');
    require('fs').writeFileSync('/Users/clawbox/nexus-hub/pvz-web/_v4142_worst.json', JSON.stringify(worst.rooms, null, 1));
    await b.close();
    process.exit(FAIL ? 1 : 0);
})();
