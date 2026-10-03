class HauntedDorm {
    constructor() {
        this.cols = 40;
        this.rows = 30;
        this.gridSize = 80;
        this.worldWidth = this.cols * this.gridSize;
        this.worldHeight = this.rows * this.gridSize;
        
        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;
        
        this.players = [
            { id: 1, x: cx - 40, y: cy, sun: 200, hp: 100, icon: 'assets/images/interface/Dave.gif', selectedSeed: null },
            { id: 2, x: cx + 40, y: cy, sun: 200, hp: 100, icon: 'assets/images/Zombies/Zombie/ZombieHead.gif', selectedSeed: null }
        ];
        
        this.keys = {};
        this.walls = new Set();
        this.plants = [];
        this.zombies = [];
        this.zombiesSpawned = false;
        
        this.initDOM();
        this.generateMap();
        this.bindInput();
        
        this.startTime = performance.now();
        this.lastTime = this.startTime;
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
        
        for (let i = 0; i < 10; i++) {
            let rw, rh, rx, ry, valid = false;
            let attempts = 0;
            while (!valid && attempts < 1000) {
                attempts++;
                rw = Math.floor(Math.random() * 2) + 4;
                rh = Math.floor(Math.random() * 2) + 4;
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
            if (valid) this.rooms.push({x: rx, y: ry, w: rw, h: rh});
        }
        
        for (const rm of this.rooms) {
            for (let wr = -1; wr <= rm.h; wr++) {
                for (let wc = -1; wc <= rm.w; wc++) {
                    if (wr === -1 || wr === rm.h || wc === -1 || wc === rm.w) {
                        if (wr === rm.h && wc === Math.floor(rm.w/2)) {
                            // 门在正下方中间，初始生成坚果墙
                            this.spawnPlant(rm.x + wc, rm.y + wr, 'wallnut');
                            continue;
                        }
                        
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
            
            // 房间内自动生成阳光菇
            const cx = rm.x + Math.floor(rm.w/2);
            const cy = rm.y + Math.floor(rm.h/2) - 1;
            this.spawnPlant(cx, cy, 'sunshroom');
        }
    }
    
    spawnPlant(col, row, type) {
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        
        const pTypes = {
            'sunshroom': { src: 'assets/images/Plants/SunShroom/0.gif', hp: 300 },
            'wallnut': { src: 'assets/images/Plants/WallNut/0.gif', hp: 4000 },
            'puffshroom': { src: 'assets/images/Plants/PuffShroom/0.gif', hp: 300 }
        };
        
        const pt = { r: row, c: col, type: type, hp: pTypes[type].hp };
        
        const el1 = document.createElement('div');
        el1.className = 'tile';
        el1.style.left = (col * this.gridSize) + 'px';
        el1.style.top = (row * this.gridSize) + 'px';
        el1.innerHTML = `<img src="${pTypes[type].src}" style="width:100%; height:100%; object-fit:contain; transform: scale(1.2) translateY(-10px);">`;
        
        this.world1.appendChild(el1);
        const el2 = el1.cloneNode(true);
        this.world2.appendChild(el2);
        
        pt.el1 = el1;
        pt.el2 = el2;
        this.plants.push(pt);
    }
    
    spawnZombie(x, y) {
        const zb = { x, y, hp: 200, vx: 0, vy: 0 };
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
            document.querySelectorAll(`#hud-p${pid} .seeds img`).forEach(img => img.style.borderColor = '#000');
            event.target.style.borderColor = '#0f0';
        }
    }
    
    tryPlanting(pid, mouseX, mouseY) {
        const p = this.players[pid - 1];
        if (!p.selectedSeed) return;
        
        const vp = pid === 1 ? this.vp1 : this.vp2;
        const rect = vp.getBoundingClientRect();
        
        const worldX = mouseX - rect.left + (p.camX || 0);
        const worldY = mouseY - rect.top + (p.camY || 0);
        
        const col = Math.floor(worldX / this.gridSize);
        const row = Math.floor(worldY / this.gridSize);
        
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
        if (this.walls.has(`${col},${row}`)) return;
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        
        p.sun -= p.selectedSeed.cost;
        document.getElementById(`sun${pid}`).innerText = p.sun;
        
        this.spawnPlant(col, row, p.selectedSeed.type);
        
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
        const r = 20;
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
        
        // 10秒后生成僵尸
        if (!this.zombiesSpawned && time - this.startTime > 10000) {
            this.zombiesSpawned = true;
            for(let z=0; z<3; z++) {
                this.spawnZombie(this.worldWidth/2 + (Math.random()-0.5)*200, this.worldHeight/2 + (Math.random()-0.5)*200);
            }
            // 简单的文字提示
            const msg = document.createElement('div');
            msg.style = "position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:red; font-size:40px; font-weight:bold; text-shadow:2px 2px 0 #000; z-index:9999;";
            msg.innerText = "猛鬼出笼！";
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        }
        
        const speed = 400;
        
        const movePlayer = (p, vx, vy) => {
            let nx = p.x + vx * dt;
            let ny = p.y;
            if (nx > 20 && nx < this.worldWidth - 20 && !this.checkCollision(nx, ny)) p.x = nx;
            
            nx = p.x;
            ny = p.y + vy * dt;
            if (ny > 30 && ny < this.worldHeight - 10 && !this.checkCollision(nx, ny)) p.y = ny;
        };
        
        let vx1 = 0, vy1 = 0;
        if (this.keys['a']) vx1 -= speed;
        if (this.keys['d']) vx1 += speed;
        if (this.keys['w']) vy1 -= speed;
        if (this.keys['s']) vy1 += speed;
        movePlayer(this.players[0], vx1, vy1);
        
        let vx2 = 0, vy2 = 0;
        if (this.keys['arrowleft']) vx2 -= speed;
        if (this.keys['arrowright']) vx2 += speed;
        if (this.keys['arrowup']) vy2 -= speed;
        if (this.keys['arrowdown']) vy2 += speed;
        movePlayer(this.players[1], vx2, vy2);
        
        // 僵尸AI (追踪最近玩家并攻击障碍)
        const zSpeed = 80;
        this.zombies.forEach(zb => {
            // 找最近玩家
            let target = this.players[0];
            let dist = Math.hypot(target.x - zb.x, target.y - zb.y);
            const dist2 = Math.hypot(this.players[1].x - zb.x, this.players[1].y - zb.y);
            if (dist2 < dist) { target = this.players[1]; dist = dist2; }
            
            // 计算方向
            let dx = target.x - zb.x;
            let dy = target.y - zb.y;
            let len = Math.hypot(dx, dy);
            
            if (len > 0) {
                let nx = zb.x + (dx/len) * zSpeed * dt;
                let ny = zb.y + (dy/len) * zSpeed * dt;
                
                // 检查是否撞到植物 (比如坚果墙)
                const hitPlant = this.getPlantAt(nx, ny);
                if (hitPlant) {
                    // 攻击植物
                    hitPlant.hp -= 20 * dt;
                    if (hitPlant.hp <= 0) {
                        hitPlant.el1.remove();
                        hitPlant.el2.remove();
                        this.plants = this.plants.filter(p => p !== hitPlant);
                    }
                } else {
                    // 滑动碰撞移动
                    if (!this.checkCollision(nx, zb.y)) zb.x = nx;
                    if (!this.checkCollision(zb.x, ny)) zb.y = ny;
                }
                
                // 如果靠得太近，造成玩家伤害（简单闪烁效果，暂不计算死）
                if (dist < 40) {
                    target.el1.style.filter = "brightness(0) invert(1)";
                    setTimeout(() => target.el1.style.filter = "drop-shadow(0 10px 5px rgba(0,0,0,0.5))", 100);
                }
            }
            
            zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px';
            zb.el2.style.left = zb.x + 'px'; zb.el2.style.top = zb.y + 'px';
        });
        
        this.players.forEach(p => {
            p.el1.style.left = p.x + 'px'; p.el1.style.top = p.y + 'px';
            p.el2.style.left = p.x + 'px'; p.el2.style.top = p.y + 'px';
        });
        
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
