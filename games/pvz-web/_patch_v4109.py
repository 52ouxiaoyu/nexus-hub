# v4.0.109：房间凹口（L 形缺角）是屋外，不该铺室内木地板
import io

P = 'js/HauntedDorm.js'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, n=1, tag=''):
    global s
    c = s.count(old)
    assert c == n, f'[{tag}] 期望 {n} 处，实际 {c} 处'
    s = s.replace(old, new)

OLD = """        // 渲染地面
        for (const rm of this.rooms) {
            for (let r = 0; r < rm.h; r++) {
                for (let c = 0; c < rm.w; c++) {
                    // v4.0.71：整个房间 footprint 全铺木地板——含庭院/L形缺口等洞格（grid=0）。
                    // 用户实报：木地板只铺在实心格上，房间内洞格仍露一片草地，观感割裂
                    const tile = document.createElement('div');
                    tile.className = 'tile room';
                    tile.style.left = ((rm.x + c) * this.gridSize) + 'px';
                    tile.style.top = ((rm.y + r) * this.gridSize) + 'px';
                    this.world1.appendChild(tile);
                }
            }
        }"""

NEW = """        // 渲染地面
        for (const rm of this.rooms) {
            // v4.0.109：区分「封闭庭院」与「敞开凹口」——用户实报「墙面是凹陷的，但地板外面还在」。
            // 判定：把 footprint 边界上的洞格做 4 邻域 flood fill；能连到的洞格 = 通向屋外（L 形缺角），
            // 不铺室内木地板（露出草地，与屋外一致）；连不到的（中庭，四周被实心格围死）= 室内庭院，照旧铺。
            const openHole = new Set();
            {
                const isHole = (r, c) => r >= 0 && r < rm.h && c >= 0 && c < rm.w && rm.tpl.grid[r][c] !== 1;
                const stack = [];
                for (let r = 0; r < rm.h; r++) {
                    for (let c = 0; c < rm.w; c++) {
                        if (isHole(r, c) && (r === 0 || r === rm.h - 1 || c === 0 || c === rm.w - 1)) {
                            openHole.add(r * 1000 + c);
                            stack.push([r, c]);
                        }
                    }
                }
                while (stack.length) {
                    const [r, c] = stack.pop();
                    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nr = r + d[0], nc = c + d[1];
                        if (!isHole(nr, nc)) continue;
                        const k = nr * 1000 + nc;
                        if (openHole.has(k)) continue;
                        openHole.add(k);
                        stack.push([nr, nc]);
                    }
                }
            }
            for (let r = 0; r < rm.h; r++) {
                for (let c = 0; c < rm.w; c++) {
                    // v4.0.71：房间 footprint 铺室内木地板（含封闭庭院洞格）；
                    // v4.0.109：敞开的凹口格（屋外）跳过——原版把地板铺到墙外，看上去房间缺角处还铺着地板
                    if (openHole.has(r * 1000 + c)) continue;
                    const tile = document.createElement('div');
                    tile.className = 'tile room';
                    tile.style.left = ((rm.x + c) * this.gridSize) + 'px';
                    tile.style.top = ((rm.y + r) * this.gridSize) + 'px';
                    this.world1.appendChild(tile);
                }
            }
        }"""

rep(OLD, NEW, 1, '地面渲染')

io.open(P, 'w', encoding='utf-8').write(s)
print('ok')
