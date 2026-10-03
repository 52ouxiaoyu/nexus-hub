class HauntedDorm {
    constructor() {
        this.cols = 40;
        this.rows = 30;
        this.gridSize = 80;
        this.worldWidth = this.cols * this.gridSize;
        this.worldHeight = this.rows * this.gridSize;
        
        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;
        
        // 更改为通用人物图标（戴夫和僵尸头像代表两方）
        this.players = [
            { id: 1, x: cx - 40, y: cy, sun: 200, icon: 'assets/images/interface/Dave.gif', selectedSeed: null },
            { id: 2, x: cx + 40, y: cy, sun: 200, icon: 'assets/images/Zombies/Zombie/ZombieHead.gif', selectedSeed: null }
        ];
        
        this.keys = {};
        this.walls = new Set();
        this.plants = [];
        
        this.initDOM();
        this.generateMap();
        this.bindInput();
        
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }
    
    initDOM() {
        this.world1 = document.getElementById('world1');
        this.world2 = document.getElementById('world2');
        this.vp1 = document.getElementById('vp1');
        this.vp2 = document.getElementById('vp2');
        
        this.world1.style.width = this.worldWidth + 'px';
        this.world1.style.height = this.worldHeight + 'px';
        this.world2.style.width = this.worldWidth + 'px';
        this.world2.style.height = this.worldHeight + 'px';
        
        this.players.forEach(p => {
            p.el1 = document.createElement('div');
            p.el1.className = 'entity avatar';
            p.el1.innerHTML = `<img src="${p.icon}">`;
            this.world1.appendChild(p.el1);
            
            p.el2 = document.createElement('div');
            p.el2.className = 'entity avatar';
            p.el2.innerHTML = `<img src="${p.icon}">`;
            this.world2.appendChild(p.el2);
        });
    }
    
    generateMap() {
        const center1 = document.createElement('div');
        center1.className = 'tile center';
        center1.style.left = (this.worldWidth / 2 - 120) + 'px';
        center1.style.top = (this.worldHeight / 2 - 120) + 'px';
        center1.style.width = '240px'; center1.style.height = '240px';
        this.world1.appendChild(center1);
        this.world2.appendChild(center1.cloneNode(true));
        
        this.rooms = [];
        
        // 生成 10 个互不相交的房间
        for (let i = 0; i < 10; i++) {
            let rw, rh, rx, ry, valid = false;
            let attempts = 0;
            while (!valid && attempts < 1000) {
                attempts++;
                rw = Math.floor(Math.random() * 2) + 4; // 4 to 5 width
                rh = Math.floor(Math.random() * 2) + 4; // 4 to 5 height
                rx = Math.floor(Math.random() * (this.cols - rw - 4)) + 2;
                ry = Math.floor(Math.random() * (this.rows - rh - 4)) + 2;
                
                // 避开中心区域
                if (Math.abs(rx - this.cols/2) < 6 && Math.abs(ry - this.rows/2) < 6) continue;
                
                // 检查是否与其他房间重叠（留出至少 2 格的过道）
                valid = true;
                for (const rm of this.rooms) {
                    if (!(rx + rw + 2 < rm.x || rx - 2 > rm.x + rm.w ||
                          ry + rh + 2 < rm.y || ry - 2 > rm.y + rm.h)) {
                        valid = false;
                        break;
                    }
                }
            }
            if (valid) this.rooms.push({x: rx, y: ry, w: rw, h: rh});
        }
        
        // 渲染房间与初始化内容
        for (const rm of this.rooms) {
            for (let wr = -1; wr <= rm.h; wr++) {
                for (let wc = -1; wc <= rm.w; wc++) {
                    if (wr === -1 || wr === rm.h || wc === -1 || wc === rm.w) {
                        if (wr === rm.h && wc === Math.floor(rm.w/2)) continue; // 门在正下方中间
                        
                        const key = `${rm.x + wc},${rm.y + wr}`;
                        this.walls.add(key);
                        
                        const wall1 = document.createElement('div');
                        wall1.className = 'tile wall';
                        wall1.style.left = ((rm.x + wc) * this.gridSize) + 'px';
                        wall1.style.top = ((rm.y + wr) * this.gridSize) + 'px';
                        this.world1.appendChild(wall1);
                        this.world2.appendChild(wall1.cloneNode(true));
                    }
                }
            }
            
            // 在房间中间自动生成一个阳光菇
            const cx = rm.x + Math.floor(rm.w/2);
            const cy = rm.y + Math.floor(rm.h/2) - 1;
            this.spawnPlant(cx, cy, 'sunshroom');
        }
        
        // 渲染野生僵尸（初始生成在中央附近，这里放一个测试僵尸）
        this.zombies = [];
        for(let z=0; z<3; z++) {
            this.spawnZombie(this.worldWidth/2 + (Math.random()-0.5)*200, this.worldHeight/2 + (Math.random()-0.5)*200);
        }
    }
    
    spawnPlant(col, row, type) {
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        
        const pTypes = {
            'sunshroom': 'assets/images/Plants/SunShroom/0.gif',
            'wallnut': 'assets/images/Plants/WallNut/0.gif',
            'puffshroom': 'assets/images/Plants/PuffShroom/0.gif'
        };
        
        const pt = { r: row, c: col, type: type };
        this.plants.push(pt);
        
        const el1 = document.createElement('div');
        el1.className = 'tile';
        el1.style.left = (col * this.gridSize) + 'px';
        el1.style.top = (row * this.gridSize) + 'px';
        el1.innerHTML = `<img src="${pTypes[pt.type]}" style="width:100%; height:100%; object-fit:contain; transform: scale(1.2) translateY(-10px);">`;
        
        this.world1.appendChild(el1);
        this.world2.appendChild(el1.cloneNode(true));
    }
    
    spawnZombie(x, y) {
        const zb = { x, y, hp: 100, vx: 0, vy: 0 };
        this.zombies.push(zb);
        
        const zEl1 = document.createElement('div');
        zEl1.className = 'entity avatar';
        zEl1.innerHTML = `<img src="assets/images/Zombies/Zombie/Zombie.gif" style="width:150%; height:150%; transform:translate(-20%, -30%);">`;
        this.world1.appendChild(zEl1);
        zb.el1 = zEl1;
        
        const zEl2 = document.createElement('div');
        zEl2.className = 'entity avatar';
        zEl2.innerHTML = `<img src="assets/images/Zombies/Zombie/Zombie.gif" style="width:150%; height:150%; transform:translate(-20%, -30%);">`;
        this.world2.appendChild(zEl2);
        zb.el2 = zEl2;
    }
    
    selectSeed(pid, type, cost, event) {
        const p = this.players[pid - 1];
        if (p.sun >= cost) {
            p.selectedSeed = { type, cost };
            // 高亮UI
            document.querySelectorAll(`#hud-p${pid} .seeds img`).forEach(img => img.style.borderColor = '#000');
            event.target.style.borderColor = '#0f0';
        }
    }
    
    tryPlanting(pid, mouseX, mouseY) {
        const p = this.players[pid - 1];
        if (!p.selectedSeed) return;
        
        const vp = pid === 1 ? this.vp1 : this.vp2;
        const rect = vp.getBoundingClientRect();
        
        // 计算世界坐标
        const camX = p.camX || 0;
        const camY = p.camY || 0;
        const worldX = mouseX - rect.left + camX;
        const worldY = mouseY - rect.top + camY;
        
        const col = Math.floor(worldX / this.gridSize);
        const row = Math.floor(worldY / this.gridSize);
        
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
        
        // 检查墙壁和现有植物
        if (this.walls.has(`${col},${row}`)) return;
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        
        // 种下
        p.sun -= p.selectedSeed.cost;
        document.getElementById(`sun${pid}`).innerText = p.sun;
        
        const pTypes = {
            'sunshroom': 'assets/images/Plants/SunShroom/0.gif',
            'wallnut': 'assets/images/Plants/WallNut/0.gif',
            'puffshroom': 'assets/images/Plants/PuffShroom/0.gif'
        };
        
        const pt = { r: row, c: col, type: p.selectedSeed.type };
        this.plants.push(pt);
        
        const el1 = document.createElement('div');
        el1.className = 'tile';
        el1.style.left = (col * this.gridSize) + 'px';
        el1.style.top = (row * this.gridSize) + 'px';
        el1.innerHTML = `<img src="${pTypes[pt.type]}" style="width:100%; height:100%; object-fit:contain; transform: scale(1.2) translateY(-10px);">`;
        
        this.world1.appendChild(el1);
        this.world2.appendChild(el1.cloneNode(true));
        
        // 取消选择
        p.selectedSeed = null;
        document.querySelectorAll(`#hud-p${pid} .seeds img`).forEach(img => img.style.borderColor = '#000');
    }
    
    bindInput() {
        window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
        
        this.vp1.addEventListener('mousedown', e => this.tryPlanting(1, e.clientX, e.clientY));
        this.vp2.addEventListener('mousedown', e => this.tryPlanting(2, e.clientX, e.clientY));
    }
    
    checkCollision(x, y) {
        const r = 20; // 碰撞半径
        const corners = [
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor((y+r)/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor((y+r)/this.gridSize) }
        ];
        return corners.some(p => this.walls.has(`${p.c},${p.r}`));
    }
    
    loop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        
        const speed = 400;
        
        const movePlayer = (p, vx, vy) => {
            let nx = p.x + vx * dt;
            let ny = p.y;
            if (nx > 20 && nx < this.worldWidth - 20 && !this.checkCollision(nx, ny)) p.x = nx;
            
            nx = p.x;
            ny = p.y + vy * dt;
            if (ny > 30 && ny < this.worldHeight - 10 && !this.checkCollision(nx, ny)) p.y = ny;
        };
        
        // P1
        let vx1 = 0, vy1 = 0;
        if (this.keys['a']) vx1 -= speed;
        if (this.keys['d']) vx1 += speed;
        if (this.keys['w']) vy1 -= speed;
        if (this.keys['s']) vy1 += speed;
        movePlayer(this.players[0], vx1, vy1);
        
        // P2
        let vx2 = 0, vy2 = 0;
        if (this.keys['arrowleft']) vx2 -= speed;
        if (this.keys['arrowright']) vx2 += speed;
        if (this.keys['arrowup']) vy2 -= speed;
        if (this.keys['arrowdown']) vy2 += speed;
        movePlayer(this.players[1], vx2, vy2);
        
        // 更新僵尸 (简易随机漫步)
        this.zombies.forEach(zb => {
            if (Math.random() < 0.02) {
                zb.vx = (Math.random() - 0.5) * 100;
                zb.vy = (Math.random() - 0.5) * 100;
            }
            const nx = zb.x + zb.vx * dt;
            const ny = zb.y + zb.vy * dt;
            if (!this.checkCollision(nx, ny)) {
                zb.x = nx;
                zb.y = ny;
            } else {
                zb.vx *= -1; zb.vy *= -1; // 撞墙反弹
            }
            
            zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px';
            zb.el2.style.left = zb.x + 'px'; zb.el2.style.top = zb.y + 'px';
        });
        
        // 渲染坐标
        this.players.forEach(p => {
            p.el1.style.left = p.x + 'px'; p.el1.style.top = p.y + 'px';
            p.el2.style.left = p.x + 'px'; p.el2.style.top = p.y + 'px';
        });
        
        // 渲染双摄相机
        const vpw = this.vp1.clientWidth;
        const vph = this.vp1.clientHeight;
        
        this.players.forEach((p, idx) => {
            const cx = Math.max(0, Math.min(this.worldWidth - vpw, p.x - vpw / 2));
            const cy = Math.max(0, Math.min(this.worldHeight - vph, p.y - vph / 2));
            p.camX = cx; p.camY = cy;
            
            const world = idx === 0 ? this.world1 : this.world2;
            world.style.transform = `translate(${-cx}px, ${-cy}px)`;
        });
        
        requestAnimationFrame(t => this.loop(t));
    }
}

window.onload = () => {
    window.game = new HauntedDorm();
};
