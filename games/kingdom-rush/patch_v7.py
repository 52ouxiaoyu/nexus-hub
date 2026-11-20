import re

with open('index.html', 'r') as f:
    html = f.read()

# Add tooltip div right before the end of #ui-layer
if '<div id="tooltip"' not in html:
    html = html.replace('</div>\n    </div>\n    \n    <script src="js/audio.js">', 
                        '    <div id="tooltip" style="display:none; position:absolute; background:rgba(0,0,0,0.9); border: 2px solid #d4af37; padding: 10px; border-radius:5px; color:#fff; pointer-events:none; z-index:1000; font-size:14px; white-space:nowrap; box-shadow: 0 5px 15px rgba(0,0,0,0.5);"></div>\n        </div>\n    </div>\n    \n    <script src="js/audio.js">')

with open('index.html', 'w') as f:
    f.write(html)

with open('js/main.js', 'r') as f:
    js = f.read()

# 1. Update CONFIG and MAP_GRID
old_config = """const CONFIG = {
    CELL_SIZE: 80, COLS: 12, ROWS: 8, WIDTH: 960, HEIGHT: 640,
    START_GOLD: 400, START_HP: 20
};

// 0: empty, 1: path, 2: spawn, 3: base, 4: tree, 5: rock
const MAP_GRID = [
    [4, 4, 0, 0, 0, 5, 5, 0, 0, 4, 4, 0],
    [2, 1, 1, 1, 0, 0, 4, 1, 1, 1, 0, 0],
    [0, 5, 4, 1, 0, 0, 0, 1, 4, 1, 0, 5],
    [0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 4],
    [4, 5, 0, 0, 5, 4, 0, 0, 0, 1, 0, 0],
    [0, 4, 1, 1, 1, 1, 1, 1, 1, 1, 0, 4],
    [0, 0, 1, 4, 5, 0, 4, 0, 5, 0, 0, 5],
    [5, 4, 1, 1, 1, 1, 3, 0, 4, 0, 0, 4]
];

let WAYPOINTS = [
    {c: 0, r: 1}, {c: 3, r: 1}, {c: 3, r: 3}, {c: 7, r: 3}, 
    {c: 7, r: 1}, {c: 9, r: 1}, {c: 9, r: 5}, {c: 2, r: 5}, 
    {c: 2, r: 7}, {c: 6, r: 7}
].map(wp => ({x: wp.c * 80 + 40, y: wp.r * 80 + 40}));"""

new_config = """const CONFIG = {
    CELL_SIZE: 80, COLS: 20, ROWS: 20, WIDTH: 1600, HEIGHT: 1600,
    START_GOLD: 800, START_HP: 20
};

const MAP_GRID = [
    [4,0,0,0,5,0,4,0,0,0,5,0,0,0,4,0,0,5,4,0],
    [2,1,1,1,1,1,1,1,0,0,4,0,0,5,4,0,0,4,5,0],
    [0,0,4,0,5,0,0,1,0,0,0,0,0,0,0,0,0,0,0,4],
    [0,0,0,0,4,0,0,1,1,1,1,1,1,1,1,0,4,0,0,0],
    [0,4,0,0,0,0,5,0,0,0,4,0,0,0,1,0,0,5,0,0],
    [0,0,0,5,0,0,0,0,0,0,0,5,0,0,1,1,1,1,1,0],
    [5,0,0,0,0,4,0,0,5,0,0,0,0,4,0,0,0,0,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,5],
    [0,1,0,0,0,5,0,4,0,0,1,0,0,4,0,0,5,0,1,0],
    [0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,4],
    [4,1,0,5,0,0,4,0,0,0,1,1,1,1,1,0,0,0,1,0],
    [0,1,0,0,0,0,0,0,5,0,0,4,0,0,1,0,0,4,1,0],
    [0,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,0],
    [0,0,4,0,0,0,1,0,0,4,0,0,5,0,0,0,5,0,0,0],
    [0,0,0,0,5,0,1,1,1,1,1,1,1,1,0,0,0,0,4,0],
    [5,0,0,0,0,0,0,4,0,0,0,0,0,1,0,0,0,0,0,0],
    [0,0,4,0,0,0,5,0,0,0,4,0,0,1,1,1,1,1,1,0],
    [0,5,0,0,0,4,0,0,0,0,0,5,0,0,0,0,0,4,1,0],
    [0,0,0,4,0,0,0,5,0,0,0,0,0,0,4,0,0,0,1,3],
    [4,0,0,0,5,0,0,0,0,4,0,0,5,0,0,0,0,5,0,0]
];

function generateWaypoints() {
    let pts = [];
    let r=-1, c=-1;
    for(let i=0; i<CONFIG.ROWS; i++) for(let j=0; j<CONFIG.COLS; j++) if(MAP_GRID[i][j]===2) { r=i; c=j; break; }
    pts.push({c, r});
    let prevR=-1, prevC=-1;
    
    while(r!==-1) {
        if(MAP_GRID[r][c] === 3) break;
        let nextR=-1, nextC=-1;
        let neighbors = [[r-1,c], [r+1,c], [r,c-1], [r,c+1]];
        for(let n of neighbors) {
            let nr = n[0], nc = n[1];
            if(nr>=0 && nr<CONFIG.ROWS && nc>=0 && nc<CONFIG.COLS) {
                if((MAP_GRID[nr][nc] === 1 || MAP_GRID[nr][nc] === 3) && !(nr===prevR && nc===prevC)) {
                    nextR = nr; nextC = nc; break;
                }
            }
        }
        if(nextR !== -1) {
            pts.push({c: nextC, r: nextR});
            prevR = r; prevC = c;
            r = nextR; c = nextC;
        } else break;
    }
    
    let simp = [pts[0]];
    for(let i=1; i<pts.length-1; i++) {
        let prev = pts[i-1], curr = pts[i], next = pts[i+1];
        if (curr.c === prev.c && curr.c === next.c) continue;
        if (curr.r === prev.r && curr.r === next.r) continue;
        simp.push(curr);
    }
    simp.push(pts[pts.length-1]);
    return simp.map(wp => ({x: wp.c * 80 + 40, y: wp.r * 80 + 40}));
}
let WAYPOINTS = generateWaypoints();
"""
js = js.replace(old_config, new_config)

# 2. Update resize() to add scaling
old_resize = """    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.offsetX = (window.innerWidth - CONFIG.WIDTH) / 2;
        this.offsetY = (window.innerHeight - CONFIG.HEIGHT) / 2;
        
        this.overlay.style.width = CONFIG.WIDTH + 'px';
        this.overlay.style.height = CONFIG.HEIGHT + 'px';
        this.overlay.style.left = this.offsetX + 'px';
        this.overlay.style.top = this.offsetY + 'px';"""

new_resize = """    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        let targetScale = Math.min(window.innerWidth / CONFIG.WIDTH, (window.innerHeight - 100) / CONFIG.HEIGHT);
        if (targetScale > 1.2) targetScale = 1.2;
        this.scale = targetScale;
        
        this.offsetX = (window.innerWidth - (CONFIG.WIDTH * this.scale)) / 2;
        this.offsetY = (window.innerHeight - (CONFIG.HEIGHT * this.scale)) / 2;
        
        this.overlay.style.width = CONFIG.WIDTH + 'px';
        this.overlay.style.height = CONFIG.HEIGHT + 'px';
        
        this.overlay.style.transformOrigin = 'top left';
        this.overlay.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;"""
js = js.replace(old_resize, new_resize)

# Fix upgrade menu positioning in resize() to use scale
old_menu_resize = """        if (this.state === 'playing' && this.selectedEntity && this.selectedEntity.isTower) {
            let menu = document.getElementById('upgrade-menu');
            menu.style.left = (this.selectedEntity.c * 80 + 40 + this.offsetX) + 'px'; 
            menu.style.top = (this.selectedEntity.r * 80 + this.offsetY) + 'px';
        }"""
new_menu_resize = """        if (this.state === 'playing' && this.selectedEntity && this.selectedEntity.isTower) {
            let menu = document.getElementById('upgrade-menu');
            menu.style.left = ((this.selectedEntity.c * 80 + 40) * this.scale + this.offsetX) + 'px'; 
            menu.style.top = ((this.selectedEntity.r * 80) * this.scale + this.offsetY) + 'px';
        }"""
js = js.replace(old_menu_resize, new_menu_resize)


# 3. Update setupGrid() with tooltips
old_setupGrid_cell = """                cell.onclick = () => {
                    if (this.state !== 'playing') return;
                    
                    let clickedTower = this.towers.find(t => t.c === c && t.r === r);
                    if (clickedTower) {
                        this.selectedTowerType = null; document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
                        this.selectedEntity = clickedTower;
                        this.updateUpgradeMenu();
                        let menu = document.getElementById('upgrade-menu');
                        menu.style.display = 'flex'; menu.style.left = (c * 80 + 40 + this.offsetX) + 'px'; menu.style.top = (r * 80 + this.offsetY) + 'px';
                        Audio.playHit(); return;
                    }"""

new_setupGrid_cell = """                cell.onclick = () => {
                    if (this.state !== 'playing') return;
                    
                    let clickedTower = this.towers.find(t => t.c === c && t.r === r);
                    if (clickedTower) {
                        this.selectedTowerType = null; document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
                        this.selectedEntity = clickedTower;
                        this.updateUpgradeMenu();
                        let menu = document.getElementById('upgrade-menu');
                        menu.style.display = 'flex'; 
                        menu.style.left = ((c * 80 + 40) * this.scale + this.offsetX) + 'px'; 
                        menu.style.top = ((r * 80) * this.scale + this.offsetY) + 'px';
                        Audio.playHit(); return;
                    }"""
js = js.replace(old_setupGrid_cell, new_setupGrid_cell)


# Update tooltips logic on cell hover
old_hover = """                cell.onmouseover = () => { if (this.selectedTowerType && MAP_GRID[r][c] === 0) cell.style.backgroundColor = 'rgba(255, 215, 0, 0.2)'; };
                cell.onmouseout = () => { cell.style.backgroundColor = 'transparent'; };"""

new_hover = """                cell.onmouseover = () => { 
                    if (this.selectedTowerType && MAP_GRID[r][c] === 0) cell.style.backgroundColor = 'rgba(255, 215, 0, 0.2)'; 
                    
                    let tooltip = document.getElementById('tooltip');
                    let content = '';
                    let tower = this.towers.find(t => t.c === c && t.r === r);
                    if (tower) {
                        let def = TOWER_DEFS[tower.type];
                        content = `<strong>${def.name} Lv.${tower.lvl+1}</strong><br>类型: <span style="color:${def.dmgType==='magic'?'#3498db':'#e67e22'}">${def.dmgType==='magic'?'魔法伤害':'物理伤害'}</span>`;
                    } else {
                        let prop = this.props.find(p => p.c === c && p.r === r);
                        if (prop) {
                            content = `<strong>${prop.type==='tree'?'神秘古树 🌲':'坚硬巨石 🪨'}</strong><br>耐久: ${Math.ceil(prop.hp)} / ${prop.maxHp}<br>拆除奖励: <span style="color:#f1c40f;">+${prop.reward} 金币</span>`;
                        } else if (MAP_GRID[r][c] === 3) {
                            content = `<strong>王国之心 🏰 (我方基地)</strong><br>剩余生命: ${this.hp} / ${CONFIG.START_HP}<br>一旦生命归零，王国将会覆灭！`;
                        } else if (MAP_GRID[r][c] === 2) {
                            content = `<strong>魔窟 👿 (出兵口)</strong><br>源源不断的怪物将从这里涌出。`;
                        }
                    }
                    if (content) {
                        tooltip.innerHTML = content;
                        tooltip.style.display = 'block';
                    }
                };
                cell.onmousemove = (e) => {
                    let tooltip = document.getElementById('tooltip');
                    if (tooltip.style.display === 'block') {
                        tooltip.style.left = (e.clientX + 15) + 'px';
                        tooltip.style.top = (e.clientY + 15) + 'px';
                    }
                };
                cell.onmouseout = () => { 
                    cell.style.backgroundColor = 'transparent'; 
                    document.getElementById('tooltip').style.display = 'none';
                };"""
js = js.replace(old_hover, new_hover)

# 4. Update draw() to use scale
old_draw = """    draw() {
        // Fill entire window with grass
        this.ctx.fillStyle = '#355E24'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);"""

new_draw = """    draw() {
        // Fill entire window with grass
        this.ctx.fillStyle = '#355E24'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);"""
js = js.replace(old_draw, new_draw)

with open('js/main.js', 'w') as f:
    f.write(js)
