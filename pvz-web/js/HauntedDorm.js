class HauntedDorm {
    constructor() {
        this.cols = 40;
        this.rows = 30;
        this.gridSize = 80;
        this.worldWidth = this.cols * this.gridSize;
        this.worldHeight = this.rows * this.gridSize;
        
        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;
        
        const urlParams = new URLSearchParams(window.location.search);
        this.role = urlParams.get('role') || 'plant';
        
        this.player = { 
            x: cx, y: cy, sun: 50, hp: 100, 
            icon: this.role === 'zombie' ? 'assets/images/Zombies/Zombie/0.gif' : 'assets/images/Plants/Peashooter/0.gif',
            camX: 0, camY: 0
        };
        
        this.keys = {};
        this.walls = new Set();
        this.plants = [];
        this.zombies = [];
        this.zombiesSpawned = false;
        
        this.lastWaterTime = 0;
        this.menuOpen = false;
        this.menuCol = -1;
        this.menuRow = -1;
        
        this.initDOM();
        this.generateMap();
        this.bindInput();
        
        this.startTime = performance.now();
        this.lastTime = this.startTime;
        requestAnimationFrame(t => this.loop(t));
    }
    
    initDOM() {
        this.world1 = document.getElementById('world1');
        this.vp1 = document.getElementById('vp1');
        
        this.world1.style.width = this.worldWidth + 'px';
        this.world1.style.height = this.worldHeight + 'px';
        
        this.player.el1 = document.createElement('div');
        this.player.el1.className = 'entity avatar';
        this.player.el1.innerHTML = `<img src="${this.player.icon}">`;
        this.world1.appendChild(this.player.el1);
        
        this.plantMenu = document.getElementById('plant-menu');
    }
    
    generateMap() {
        const center1 = document.createElement('div');
        center1.className = 'tile center';
        center1.style.left = (this.worldWidth / 2 - 120) + 'px';
        center1.style.top = (this.worldHeight / 2 - 120) + 'px';
        center1.style.width = '240px'; center1.style.height = '240px';
        this.world1.appendChild(center1);
        
        this.rooms = [];
        
        // 房间形状模板 (1=地面)
        const templates = [
            { // 4x4 矩形
                grid: [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]],
                door: {r: 4, c: 2}, bed: {r: 1, c: 2}
            },
            { // L型
                grid: [[1,1,0,0],[1,1,0,0],[1,1,1,1],[1,1,1,1]],
                door: {r: 4, c: 1}, bed: {r: 1, c: 0}
            },
            { // 凹型
                grid: [[1,1,0,1,1],[1,1,0,1,1],[1,1,1,1,1],[1,1,1,1,1]],
                door: {r: 4, c: 2}, bed: {r: 2, c: 2}
            },
            { // 长条型
                grid: [[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1]],
                door: {r: 5, c: 1}, bed: {r: 1, c: 1}
            }
        ];
        
        for (let i = 0; i < 10; i++) {
            let tpl, rx, ry, valid = false;
            let attempts = 0;
            while (!valid && attempts < 1000) {
                attempts++;
                tpl = templates[Math.floor(Math.random() * templates.length)];
                const rw = tpl.grid[0].length;
                const rh = tpl.grid.length;
                
                rx = Math.floor(Math.random() * (this.cols - rw - 4)) + 2;
                ry = Math.floor(Math.random() * (this.rows - rh - 4)) + 2;
                
                if (Math.abs(rx - this.cols/2) < 6 && Math.abs(ry - this.rows/2) < 6) continue;
                
                valid = true;
                for (const rm of this.rooms) {
                    if (!(rx + rw + 2 < rm.x || rx - 2 > rm.x + rm.w ||
                          ry + rh + 2 < rm.y || ry - 2 > rm.y + rm.h)) {
                        valid = false;
                        break;
                    }
                }
            }
            if (valid) {
                this.rooms.push({ x: rx, y: ry, w: tpl.grid[0].length, h: tpl.grid.length, tpl: tpl });
            }
        }
        
        // 渲染墙体
        for (const rm of this.rooms) {
            const isInside = (r, c) => r>=0 && r<rm.h && c>=0 && c<rm.w && rm.tpl.grid[r][c] === 1;
            for (let r = -1; r <= rm.h; r++) {
                for (let c = -1; c <= rm.w; c++) {
                    if (isInside(r, c)) continue;
                    
                    if (isInside(r-1, c) || isInside(r+1, c) || isInside(r, c-1) || isInside(r, c+1) ||
                        isInside(r-1, c-1) || isInside(r-1, c+1) || isInside(r+1, c-1) || isInside(r+1, c+1)) {
                        
                        // 生成门
                        if (r === rm.tpl.door.r && c === rm.tpl.door.c) {
                            this.spawnPlant(rm.x + c, rm.y + r, 'wallnut');
                            rm.doorCol = rm.x + c;
                            rm.doorRow = rm.y + r;
                            continue;
                        }
                        
                        const key = `${rm.x + c},${rm.y + r}`;
                        this.walls.add(key);
                        
                        const wall1 = document.createElement('div');
                        wall1.className = 'tile wall';
                        wall1.style.left = ((rm.x + c) * this.gridSize) + 'px';
                        wall1.style.top = ((rm.y + r) * this.gridSize) + 'px';
                        this.world1.appendChild(wall1);
                    }
                }
            }
            
            // 生成床(阳光菇)
            this.spawnPlant(rm.x + rm.tpl.bed.c, rm.y + rm.tpl.bed.r, 'sunshroom');
        }
    }
    
    spawnPlant(col, row, type) {
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        
        const pTypes = {
            'sunshroom': { src: 'assets/images/Plants/SunShroom/0.gif', hp: 300 },
            'wallnut': { src: 'assets/images/Plants/WallNut/0.gif', hp: 4000 },
            'puffshroom': { src: 'assets/images/Plants/PuffShroom/0.gif', hp: 300 },
            'peashooter': { src: 'assets/images/Plants/Peashooter/0.gif', hp: 300 },
            'potatomine': { src: 'assets/images/Plants/PotatoMine/0.gif', hp: 300 }
        };
        
        const maxHp = pTypes[type].hp;
        const pt = { r: row, c: col, type: type, hp: maxHp, maxHp: maxHp };
        
        const el1 = document.createElement('div');
        el1.className = 'tile';
        el1.style.left = (col * this.gridSize) + 'px';
        el1.style.top = (row * this.gridSize) + 'px';
        
        const img = `<img src="${pTypes[type].src}" style="width:100%; height:100%; object-fit:contain; transform: scale(1.2) translateY(-10px);">`;
        
        // 血条 (只要受伤就会显示)
        const hpBar = `<div class="hp-bar-bg"><div class="hp-bar-fg" style="width:100%;"></div></div>`;
        
        el1.innerHTML = hpBar + img;
        this.world1.appendChild(el1);
        pt.el1 = el1;
        this.plants.push(pt);
        
        if (type === 'sunshroom') {
            const txt = document.createElement('div');
            txt.className = 'float-text';
            txt.innerText = '浇水 (空格)';
            el1.appendChild(txt);
            pt.txtEl = txt;
        }
    }
    
    spawnZombie(x, y) {
        const zb = { x, y, hp: 300, vx: 0, vy: 0 };
        this.zombies.push(zb);
        
        const zEl1 = document.createElement('div');
        zEl1.className = 'entity avatar';
        zEl1.innerHTML = `<img src="assets/images/Zombies/Zombie/Zombie.gif" style="width:150%; height:150%; transform:translate(-20%, -30%);">`;
        this.world1.appendChild(zEl1);
        zb.el1 = zEl1;
    }
    
    openPlantMenu(mouseX, mouseY) {
        if (this.role === 'zombie') return;
        
        const rect = this.vp1.getBoundingClientRect();
        const worldX = mouseX - rect.left + this.player.camX;
        const worldY = mouseY - rect.top + this.player.camY;
        
        const col = Math.floor(worldX / this.gridSize);
        const row = Math.floor(worldY / this.gridSize);
        
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
        if (this.walls.has(`${col},${row}`)) return;
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        
        this.menuCol = col;
        this.menuRow = row;
        this.menuOpen = true;
        
        this.plantMenu.style.display = 'flex';
        this.plantMenu.style.left = (mouseX + 20) + 'px';
        this.plantMenu.style.top = (mouseY - 20) + 'px';
    }
    
    doPlant(type, cost) {
        this.plantMenu.style.display = 'none';
        this.menuOpen = false;
        
        if (this.player.sun >= cost) {
            this.player.sun -= cost;
            document.getElementById('sun1').innerText = this.player.sun;
            this.spawnPlant(this.menuCol, this.menuRow, type);
        }
    }
    
    bindInput() {
        window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
        
        this.vp1.addEventListener('mousedown', e => {
            if (e.target.closest('#plant-menu')) return;
            if (this.menuOpen) {
                this.plantMenu.style.display = 'none';
                this.menuOpen = false;
                return;
            }
            this.openPlantMenu(e.clientX, e.clientY);
        });
    }
    
    checkCollision(x, y) {
        const r = 25; 
        const corners = [
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor((y+r)/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor((y+r)/this.gridSize) }
        ];
        return corners.some(p => this.walls.has(`${p.c},${p.r}`));
    }
    
    getPlantAt(x, y) {
        const c = Math.floor(x / this.gridSize);
        const r = Math.floor(y / this.gridSize);
        return this.plants.find(pl => pl.c === c && pl.r === r);
    }
    
    loop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        
        if (!this.zombiesSpawned && time - this.startTime > 20000) {
            this.zombiesSpawned = true;
            for(let z=0; z<3; z++) {
                this.spawnZombie(this.worldWidth/2 + (Math.random()-0.5)*200, this.worldHeight/2 + (Math.random()-0.5)*200);
            }
            const msg = document.createElement('div');
            msg.style = "position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:red; font-size:40px; font-weight:bold; text-shadow:2px 2px 0 #000; z-index:9999;";
            msg.innerText = "猛鬼出笼！";
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        }
        
        const speed = 400;
        
        let vx1 = 0, vy1 = 0;
        if (this.keys['a'] || this.keys['arrowleft']) vx1 -= speed;
        if (this.keys['d'] || this.keys['arrowright']) vx1 += speed;
        if (this.keys['w'] || this.keys['arrowup']) vy1 -= speed;
        if (this.keys['s'] || this.keys['arrowdown']) vy1 += speed;
        
        let nx = this.player.x + vx1 * dt;
        let ny = this.player.y;
        if (nx > 20 && nx < this.worldWidth - 20 && !this.checkCollision(nx, ny)) this.player.x = nx;
        
        nx = this.player.x;
        ny = this.player.y + vy1 * dt;
        if (ny > 30 && ny < this.worldHeight - 10 && !this.checkCollision(nx, ny)) this.player.y = ny;
        
        // 浇水逻辑
        let nearShroom = null;
        for (const pl of this.plants) {
            if (pl.type === 'sunshroom') {
                pl.txtEl.style.opacity = 0;
                const px = pl.c * this.gridSize + 40;
                const py = pl.r * this.gridSize + 40;
                if (Math.hypot(this.player.x - px, this.player.y - py) < 120) {
                    nearShroom = pl;
                }
            }
        }
        if (nearShroom) {
            nearShroom.txtEl.style.opacity = 1;
            if (this.keys[' '] && time - this.lastWaterTime > 1000) {
                this.lastWaterTime = time;
                this.player.sun += 25;
                document.getElementById('sun1').innerText = this.player.sun;
                // 飘字特效
                const fly = document.createElement('div');
                fly.innerText = '+25';
                fly.style = `position:absolute; color:yellow; font-weight:bold; font-size:24px; left:${nearShroom.c * this.gridSize + 40}px; top:${nearShroom.r * this.gridSize}px; transition:all 1s; pointer-events:none; z-index:500; text-shadow:1px 1px 2px #000;`;
                this.world1.appendChild(fly);
                setTimeout(() => { fly.style.top = (nearShroom.r * this.gridSize - 50) + 'px'; fly.style.opacity = 0; }, 50);
                setTimeout(() => fly.remove(), 1050);
            }
        }
        
        // 僵尸AI (追踪最近玩家并攻击障碍)
        const zSpeed = 80;
        this.zombies.forEach(zb => {
            // 首先判断玩家所在的房间
            let targetX = this.player.x;
            let targetY = this.player.y;
            
            // 简单寻路：判断是否与玩家隔着门
            const hitPlant = this.getPlantAt(zb.x + (targetX-zb.x > 0 ? 30 : -30), zb.y + (targetY-zb.y > 0 ? 30 : -30));
            
            let dx = targetX - zb.x;
            let dy = targetY - zb.y;
            let len = Math.hypot(dx, dy);
            
            if (len > 0) {
                let nzx = zb.x + (dx/len) * zSpeed * dt;
                let nzy = zb.y + (dy/len) * zSpeed * dt;
                
                const atkPlant = this.getPlantAt(nzx, nzy);
                if (atkPlant) {
                    atkPlant.hp -= 30 * dt; // 攻击植物
                    const bg = atkPlant.el1.querySelector('.hp-bar-bg');
                    const fg = atkPlant.el1.querySelector('.hp-bar-fg');
                    if (bg) {
                        bg.style.display = 'block';
                        fg.style.width = Math.max(0, (atkPlant.hp / atkPlant.maxHp) * 100) + '%';
                    }
                    if (atkPlant.hp <= 0) {
                        atkPlant.el1.remove();
                        this.plants = this.plants.filter(p => p !== atkPlant);
                    }
                } else {
                    if (!this.checkCollision(nzx, zb.y)) zb.x = nzx;
                    if (!this.checkCollision(zb.x, nzy)) zb.y = nzy;
                }
                
                if (len < 40) {
                    this.player.el1.style.filter = "brightness(0) invert(1)";
                    setTimeout(() => this.player.el1.style.filter = "drop-shadow(0 10px 5px rgba(0,0,0,0.5))", 100);
                }
            }
            zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px';
        });
        
        this.player.el1.style.left = this.player.x + 'px'; 
        this.player.el1.style.top = this.player.y + 'px';
        
        const vpw = this.vp1.clientWidth;
        const vph = this.vp1.clientHeight;
        
        const cx = Math.max(0, Math.min(this.worldWidth - vpw, this.player.x - vpw / 2));
        const cy = Math.max(0, Math.min(this.worldHeight - vph, this.player.y - vph / 2));
        this.player.camX = cx; this.player.camY = cy;
        this.world1.style.transform = `translate(${-cx}px, ${-cy}px)`;
        
        requestAnimationFrame(t => this.loop(t));
    }
}

window.onload = () => {
    window.game = new HauntedDorm();
};
