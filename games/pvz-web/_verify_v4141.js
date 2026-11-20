// v4.0.141 验收：守屋大作战房间尺寸上调（部分 ~50 格 / 保留少量小房）+ 出生点不落屋内
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0, FAIL = 0;
const ok = (c, m) => { if (c) { PASS++; console.log('  PASS ' + m); } else { FAIL++; console.log('  FAIL ' + m); } };

const ANALYZE = () => {
    const g = window.game;
    const areaOf = (grid, w, h) => {
        let n = 0;
        for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (grid[r][c] === 1) n++;
        return n;
    };
    // 房内连通性：从门内侧相邻格 BFS，必须能走到每个实心格
    const reach = (rm) => {
        const { grid, door } = rm.tpl;
        const W = rm.w, H = rm.h;
        const seen = new Set();
        // 门在 footprint 外的相邻实心格
        const start = [];
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const r = door.r + d[0], c = door.c + d[1];
            if (r >= 0 && r < H && c >= 0 && c < W && grid[r][c] === 1) start.push([r, c]);
        }
        if (!start.length) return { okRooms: false, reason: '门没有相邻实心格' };
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
            beds: rm.tpl.beds.length, bedOk,
            reachable: rc.okRooms, seen: rc.seen, total: rc.total,
            door: rm.tpl.door,
            inBounds: rm.x >= 1 && rm.y >= 1 && rm.x + rm.w <= g.cols - 1 && rm.y + rm.h <= g.rows - 1
        };
    });
    // 房间包围盒重叠（含 2 格间距要求）
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
    // 圆圈（半径 120px ≈ 1.5 格）四角 + 上下左右 也检查
    let ringHit = 0;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        if (g._insideRoom(sc.c + dc, sc.r + dr)) ringHit++;
    }
    // 圆圈实际占地 = 中心 ±1.5 格（240px）；与任何房间包围盒相交都算压墙
    const boxHit = g.rooms.filter(rm =>
        (sc.c + 1.5) > rm.x && (sc.c - 1.5) < rm.x + rm.w &&
        (sc.r + 1.5) > rm.y && (sc.r - 1.5) < rm.y + rm.h).length;
    // 再留 1 格余量：中心 ±2 格内不允许有房间（保证肉眼看不到擦边）
    let nearHit = 0;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        if (g.rooms.some(rm => sc.c + dc >= rm.x && sc.c + dc < rm.x + rm.w && sc.r + dr >= rm.y && sc.r + dr < rm.y + rm.h)) nearHit++;
    }
    const p1 = g.player;
    const p1InRoom = !!g._insideRoom(Math.floor(p1.x / g.gridSize), Math.floor(p1.y / g.gridSize));
    return {
        n: g.rooms.length, rooms, overlap, gapBad,
        spawn: sc, spawnInRoom, ringHit, boxHit, nearHit, p1InRoom,
        aisle: (() => { let n = 0; const set = new Set(); for (const rm of g.rooms) for (let r = 0; r < rm.h; r++) for (let c = 0; c < rm.w; c++) if (rm.tpl.grid[r][c] === 1) set.add((rm.x + c) + ',' + (rm.y + r)); return set.size; })()
    };
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
    });

    const N = 30;
    const all = [];
    let worst = null;
    for (let k = 0; k < N; k++) {
        const r = await page.evaluate((ANALYZE_SRC) => {
            window.startHauntedDorm({ gameMode: '1p', faction: 'plant', role1: 'peashooter' });
            return (new Function('return (' + ANALYZE_SRC + ')()'))();
        }, ANALYZE.toString());
        all.push(r);
        if (!worst || Math.max(...r.rooms.map(x => x.area)) > Math.max(...worst.rooms.map(x => x.area))) worst = r;
    }

    console.log('\n【A】30 局随机地图 · 尺寸分布');
    const areasPerMap = all.map(r => r.rooms.map(x => x.area).sort((a, b) => a - b));
    const flat = areasPerMap.flat();
    const avg = flat.reduce((a, b) => a + b, 0) / flat.length;
    console.log('  每局面积（升序）：');
    areasPerMap.slice(0, 6).forEach((a, i) => console.log('    #' + (i + 1) + ' ' + a.join(' ')));
    console.log('  全局 min/max/avg = ' + Math.min(...flat) + ' / ' + Math.max(...flat) + ' / ' + avg.toFixed(1));

    ok(all.every(r => r.n === 10), '每局都是 10 间房', all.map(r => r.n).join(','));
    ok(all.every(r => r.rooms.every(x => x.area >= 4)), '最小房 ≥ 4 格');
    ok(all.every(r => r.rooms.every(x => x.area <= 50)), '最大房 ≤ 50 格（正常上限）', 'max=' + Math.max(...flat));
    ok(all.every(r => r.rooms.some(x => x.area >= 40)), '每局至少有 1 间 40 格以上的大房');
    ok(all.filter(r => r.rooms.some(x => x.area >= 45)).length >= N * 0.7, '多数局有 45 格以上的大房（"50 左右"）',
        all.filter(r => r.rooms.some(x => x.area >= 45)).length + '/' + N);
    ok(all.every(r => r.rooms.some(x => x.area <= 8)), '每局都保留 1 间小房（≤8 格）');
    ok(all.every(r => r.rooms.filter(x => x.area <= 8).length <= 2), '小房不超过 2 间（"比较少"）',
        'max小房数=' + Math.max(...all.map(r => r.rooms.filter(x => x.area <= 8).length)));
    ok(avg >= 20, '平均面积 ≥ 20 格（原来约 14）', avg.toFixed(1));
    const bigCount = flat.filter(a => a >= 40).length / N;
    ok(bigCount >= 1 && bigCount <= 2.6, '每局大房数量 ≈ 1~2 间', bigCount.toFixed(2));

    console.log('\n【B】几何合法性（30 局 × 10 房）');
    ok(all.every(r => r.rooms.every(x => x.inBounds)), '所有房间都在地图内');
    ok(all.every(r => r.overlap === 0), '房间包围盒零重叠');
    ok(all.every(r => r.gapBad === 0), '房间之间至少留 2 格走廊');
    ok(all.every(r => r.rooms.every(x => x.reachable)), '每间房从门口都能走到全部实心格',
        all.flatMap(r => r.rooms.filter(x => !x.reachable).map(x => '#' + x.i + ' ' + x.seen + '/' + x.total)).slice(0, 3).join(' | '));
    ok(all.every(r => r.rooms.every(x => x.bedOk)), '每张床都在实心格且可达');
    ok(all.every(r => r.rooms.every(x => x.beds >= 1 && x.beds <= 2)), '每间房 1~2 张床');
    ok(all.every(r => r.rooms.filter(x => x.beds === 2).length === 1), '每局恰好 1 间双床房');

    console.log('\n【C】出生点 / 回血圆圈不被大房包住');
    ok(all.every(r => !r.spawnInRoom), '出生圆圈中心不在任何房间内',
        all.filter(r => r.spawnInRoom).length + ' 局异常');
    ok(all.every(r => r.ringHit === 0), '圆圈 8 邻域也不在房间内（120px 半径不会压到屋里）',
        'max命中=' + Math.max(...all.map(r => r.ringHit)));
    ok(all.every(r => r.boxHit === 0), '圆圈实际占地（±1.5 格）不与任何房间相交（不压别人家外墙）',
        all.filter(r => r.boxHit).length + ' 局异常');
    ok(all.every(r => r.nearHit === 0), '圆圈四周还留了 1 格余量（±2 格内无房间）',
        'max命中=' + Math.max(...all.map(r => r.nearHit)));
    ok(all.every(r => !r.p1InRoom), '玩家出生点在屋外（不进别人房间）');

    console.log('\n【D】运行期');
    await sleep(2500);
    const live = await page.evaluate(() => ({
        ais: window.game.ais.length,
        humans: window.game.allPlayers.filter(p => !p.isAi).length,
        rooms: window.game.rooms.length,
        plants: window.game.plants.length,
        state: window.game.state
    }));
    ok(live.ais === 5, '人机 5 只', live.ais);
    ok(live.humans === 1, '真人 1 名', live.humans);
    ok(live.plants >= live.rooms, '每间房都种了初始阳光菇', live.plants + ' 株 / ' + live.rooms + ' 房');
    ok(errs.length === 0, '无 pageerror', errs.slice(0, 3).join(' | '));

    console.log('\n===== ' + PASS + ' / ' + (PASS + FAIL) + ' 通过 =====');
    require('fs').writeFileSync('/Users/clawbox/nexus-hub/pvz-web/_v4141_worst.json', JSON.stringify(worst.rooms, null, 1));
    await b.close();
    process.exit(FAIL ? 1 : 0);
})();
