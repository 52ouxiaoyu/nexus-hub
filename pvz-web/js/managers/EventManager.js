class EventManager {
    constructor(game) {
        this.game = game;
        this.events = [
            { msg: '⚠️ 警告：天降陨石！', color: '#ff4444', minScore: 300, exec: g => {
                const r = Math.floor(Math.random() * g.board.rows);
                const c = 2 + Math.floor(Math.random() * 6);
                const x = g.board.offsetX + c * g.board.cellWidth + g.board.cellWidth/2;
                const y = g.board.offsetY + r * g.board.cellHeight + g.board.cellHeight/2;
                const target = document.createElement('div');
                target.style.cssText = `position:absolute; left:${x-50}px; top:${y-50}px; width:100px; height:100px; border:6px dashed red; border-radius:50%; z-index:3000; box-shadow:0 0 20px red;`;
                g.entityLayer.appendChild(target);
                let toggle = true; const intv = setInterval(() => { target.style.opacity = toggle?'0.2':'1'; toggle=!toggle; }, 200);
                setTimeout(() => {
                    clearInterval(intv); if(target.parentNode) target.parentNode.removeChild(target);
                    g.audioManager.play('splat');
                    const boom = document.createElement('img'); boom.src = 'assets/images/Plants/DoomShroom/Boom.png';
                    boom.style.cssText = `position:absolute; left:${x}px; top:${y}px; transform:translate(-50%,-80%); z-index:3000;`;
                    g.entityLayer.appendChild(boom); setTimeout(()=>boom.remove(), 1000);
                    
                    const crater = new Plant(g, 'crater'); 
                    crater.x = x; crater.y = y; crater.row = r; crater.col = c;
                    crater.hp = 99999; 
                    crater.element.src='assets/images/Plants/DoomShroom/crater11.png'; 
                    crater.element.style.zIndex=10;
                    g.entities.push(crater); 
                    
                    // Remove existing plant in grid and replace with crater
                    if (g.board.grid[r][c]) g.board.grid[r][c].hp = 0;
                    g.board.grid[r][c] = crater;
                    
                    setTimeout(() => { 
                        crater.hp=0; 
                        if(g.board.grid[r][c] === crater) g.board.grid[r][c] = null;
                    }, 30000);
                    
                    g.entities.filter(e => Math.abs(e.x-x)<100 && Math.abs(e.y-y)<100 && e!==crater && !e.isProjectile).forEach(e => e.hp=0);
                }, 3000);
            }},
            { msg: '🌪️ 危机：狂风呼啸！', color: '#88ccff', minScore: 200, exec: g => {
                g.entities.filter(e => e instanceof Zombie && !e.isDead).forEach(z => { z.x = Math.min(900, z.x + 150); });
                const p = g.entities.filter(e => e instanceof Plant && !e.isDead && e.type!=='crater');
                for(let i=0; i<2; i++) { if(p.length>0) { const idx=Math.floor(Math.random()*p.length); p[idx].hp=0; p.splice(idx,1); } }
            }},
            { msg: '✨ 奇迹：阳光普照！', color: '#ffd700', exec: g => {
                for(let i=0; i<15; i++) setTimeout(() => g.entities.push(new Sun(g, 100+Math.random()*700, 0)), i*200);
            }},
            { msg: '🧟 突袭：地道僵尸！', color: '#88ff88', minScore: 200, exec: g => {
                for(let i=0; i<4; i++) setTimeout(() => {
                    const z = new Zombie(g, Math.floor(Math.random()*g.board.rows), 'normal');
                    z.x = 400 + Math.random()*300; z.element.style.clipPath = 'inset(100% 0 0 0)'; z.element.style.transition = 'clip-path 1s';
                    g.entities.push(z); setTimeout(()=>z.element.style.clipPath='inset(0 0 0 0)', 50);
                }, i*500);
            }},
            { msg: '🔄 恩赐：冷却重置！', color: '#00ff00', exec: g => {
                for(let k in g.cooldowns) g.cooldowns[k] = 0; g.updateUI();
            }},
            { msg: '💰 暴富：天降横财！', color: '#ffd700', exec: g => { g.sunCount += 300; g.updateUI(); }},
            { msg: '📉 破产：阳光税！', color: '#ffaaaa', minScore: 100, exec: g => { g.sunCount = Math.max(0, g.sunCount - 200); g.updateUI(); }},
            { msg: '🌍 震动：超级地震！', color: '#ff8800', exec: g => {
                g.container.style.animation = 'shake 0.5s infinite';
                if(!document.getElementById('shake-style')) {
                    const style = document.createElement('style'); style.id='shake-style';
                    style.innerHTML = `@keyframes shake { 0%{margin-top:2px;margin-left:2px} 25%{margin-top:-2px;margin-left:-2px} 50%{margin-top:2px;margin-left:-2px} 75%{margin-top:-2px;margin-left:2px} 100%{margin-top:2px;margin-left:2px} }`;
                    document.head.appendChild(style);
                }
                setTimeout(() => g.container.style.animation = '', 3000);
                g.entities.filter(e => e instanceof Zombie).forEach(z => z.hp -= 20);
            }},
            { msg: '🕺 狂欢：蹦迪时刻！', color: '#ff00ff', exec: g => {
                const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
                let i = 0; const intv = setInterval(() => { g.container.style.backgroundColor = colors[i++%colors.length]; }, 200);
                setTimeout(() => { clearInterval(intv); g.container.style.backgroundColor = ''; }, 4000);
            }},

            { msg: '🚶 迷惑：太空漫步！', color: '#cccccc', exec: g => {
                const zombies = g.entities.filter(e => e instanceof Zombie);
                zombies.forEach(z => z.speed = -30);
                setTimeout(() => zombies.forEach(z => {if(!z.isDead) z.speed = 20}), 4000);
            }},
            { msg: '🐜 缩小：迷你僵尸！', color: '#ffaaaa', exec: g => {
                g.entities.filter(e => e instanceof Zombie).forEach(z => { z.element.style.transform += ' scale(0.5)'; z.hp = Math.max(1, z.hp/2); });
            }},
            { msg: '🦖 巨化：变异僵尸！', color: '#ff4444', minScore: 500, exec: g => {
                const z = g.entities.find(e => e instanceof Zombie && !e.isDead);
                if(z) { z.element.style.transform += ' scale(1.8)'; z.hp *= 3; z.damage *= 2; }
            }},
            { msg: '🌑 黑暗：断电了！', color: '#555555', minScore: 150, exec: g => {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:black;z-index:4000;opacity:0.95;pointer-events:none;transition:opacity 0.5s;';
                g.container.appendChild(overlay);
                setTimeout(() => { overlay.style.opacity = '0'; setTimeout(()=>overlay.remove(), 500); }, 3500);
            }},
            { msg: '☁️ 迷雾：视线受阻！', color: '#dddddd', minScore: 100, exec: g => {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:white;z-index:4000;opacity:0.8;pointer-events:none;transition:opacity 1s;';
                g.container.appendChild(overlay);
                setTimeout(() => { overlay.style.opacity = '0'; setTimeout(()=>overlay.remove(), 1000); }, 5000);
            }},
            { msg: '⏩ 时光：岁月如梭！', color: '#aaffaa', exec: g => {
                g.gameSpeed = 4; setTimeout(() => g.gameSpeed = 1, 4000);
            }},
            { msg: '🐢 迟缓：时间泥沼！', color: '#4444ff', exec: g => {
                const z = g.entities.filter(e => e instanceof Zombie); z.forEach(e => e.setSlow(10));
                setTimeout(() => z.forEach(e => e.thaw()), 6000);
            }},
            { msg: '💖 治愈：僵尸医疗！', color: '#ffaaaa', minScore: 200, exec: g => {
                g.entities.filter(e => e instanceof Zombie).forEach(z => z.hp += 200);
            }},
            { msg: '🍀 生机：植物逢春！', color: '#aaffaa', exec: g => {
                g.entities.filter(e => e instanceof Plant).forEach(p => p.hp += 300);
            }},
            { msg: '👻 灵异：隐身术！', color: '#aaaaaa', minScore: 200, exec: g => {
                const z = g.entities.filter(e => e instanceof Zombie); z.forEach(e => e.element.style.opacity = '0.15');
                setTimeout(() => z.forEach(e => {if(e.element) e.element.style.opacity = '1'}), 5000);
            }},
            { msg: '🚧 堵车：全部退后！', color: '#ffffaa', exec: g => {
                g.entities.filter(e => e instanceof Zombie).forEach(z => z.x = 900);
            }},
            { msg: '💃 尬舞：全员停摆！', color: '#ff88ff', exec: g => {
                const z = g.entities.filter(e => e instanceof Zombie);
                const oldSpeeds = z.map(e=>e.speed);
                z.forEach(e => { e.speed = 0; e.element.style.transition='transform 3s'; e.element.style.transform='rotate(1080deg)'; });
                setTimeout(() => z.forEach((e,i) => { e.speed = oldSpeeds[i]||20; e.element.style.transition=''; e.element.style.transform=''; }), 3000);
            }},
            { msg: '🛡️ 破甲：防具剥落！', color: '#aaffff', exec: g => {
                g.entities.filter(e => e instanceof Zombie).forEach(z => { if(z.type==='conehead'||z.type==='buckethead'||z.type==='screendoor') z.hp=150; });
            }},
            { msg: '⭕ 麦田：怪圈现象！', color: '#aaff44', minScore: 300, exec: g => {
                const p = g.entities.filter(e => e instanceof Plant && !e.isDead);
                for(let i=0; i<3; i++) { if(p.length>0) { const idx=Math.floor(Math.random()*p.length); p[idx].hp=0; p.splice(idx,1); } }
            }},
            { msg: '🌱 变异：植物叛变！', color: '#ff44aa', minScore: 400, exec: g => {
                const p = g.entities.filter(e => e instanceof Plant && !e.isDead && e.type!=='crater');
                if(p.length > 0) {
                    const target = p[Math.floor(Math.random()*p.length)];
                    target.hp = 0;
                    g.entities.push(new Zombie(g, target.row, 'normal'));
                }
            }},
            { msg: '🌧️ 腐蚀：酸雨降临！', color: '#44ff44', exec: g => {
                g.entities.filter(e => e instanceof Zombie).forEach(z => z.hp -= 100);
            }},
            { msg: '🔥 旱灾：阳光蒸发！', color: '#ff6622', minScore: 100, exec: g => {
                g.entities.filter(e => e instanceof Sun).forEach(s => s.hp = 0);
            }},
            { msg: '🌦️ 太阳雨：疯狂掉落！', color: '#ffff44', exec: g => {
                for(let i=0; i<30; i++) setTimeout(() => g.entities.push(new Sun(g, 100+Math.random()*700, 0)), i*100);
            }},
            { msg: '👿 空投：小鬼雨！', color: '#884488', minScore: 300, exec: g => {
                for(let i=0; i<3; i++) setTimeout(() => {
                    const z = new Zombie(g, Math.floor(Math.random()*g.board.rows), 'imp');
                    z.x = 200 + Math.random()*400; z.yOffset = -500;
                    g.entities.push(z);
                    const intv = setInterval(()=>{ z.yOffset+=20; z.element.style.top=`${z.y+z.yOffset}px`; if(z.yOffset>=0){z.yOffset=0;clearInterval(intv);} }, 20);
                }, i*400);
            }},
            { msg: '🎧 狂热：BGM加速！', color: '#ffffff', exec: g => {
                if(g.audioManager.sounds.bgm) g.audioManager.sounds.bgm.playbackRate = 1.5;
                setTimeout(() => { if(g.audioManager.sounds.bgm) g.audioManager.sounds.bgm.playbackRate = 1.0; }, 10000);
            }},
            { msg: '📼 疲惫：BGM降速！', color: '#aaaaaa', exec: g => {
                if(g.audioManager.sounds.bgm) g.audioManager.sounds.bgm.playbackRate = 0.5;
                setTimeout(() => { if(g.audioManager.sounds.bgm) g.audioManager.sounds.bgm.playbackRate = 1.0; }, 10000);
            }},
            { msg: '💪 兴奋剂：植物强壮！', color: '#ff0000', exec: g => {
                g.entities.filter(e => e instanceof Plant).forEach(p => { p.hp += 2000; p.element.style.transform = 'scale(1.2)'; });
            }},
            { msg: '🎰 彩票：僵尸带资进组！', color: '#ffff00', exec: g => {
                const z = new Zombie(g, Math.floor(Math.random()*g.board.rows), 'normal');
                z.hp = 100; // Weak zombie
                z.die = function() { g.sunCount += 150; g.updateUI(); Zombie.prototype.die.call(this); };
                g.entities.push(z);
            }},
            { msg: '🧊 绝对零度：全屏冻结！', color: '#88ffff', exec: g => {
                const z = g.entities.filter(e => e instanceof Zombie);
                const oldSpeeds = z.map(e=>e.speed);
                z.forEach(e => { e.speed = 0; e.element.style.filter = 'sepia(100%) hue-rotate(180deg) saturate(300%)'; });
                setTimeout(() => z.forEach((e,i) => { e.speed = oldSpeeds[i]||20; e.element.style.filter=''; }), 4000);
            }},
            { msg: '🙏 戴夫的恩赐！', color: '#ffffff', exec: g => {
                g.score += 500; g.updateScore(); g.sunCount += 100; g.updateUI();
            }},
            { msg: '🍄 孢子：天降蘑菇！', color: '#aa44aa', exec: g => {
                const r = Math.floor(Math.random()*g.board.rows); const c = Math.floor(Math.random()*g.board.cols);
                if (g.board.canPlant(r, c)) {
                    const p = new Plant(g, 'puffshroom');
                    g.board.addPlant(p, r, c);
                }
            }},
            { msg: '🚀 闪现：前锋突进！', color: '#ff8844', minScore: 300, exec: g => {
                g.entities.filter(e => e instanceof Zombie).forEach(z => { z.x = Math.max(100, z.x - 150); });
            }},
            { msg: '🍃 一阵寂寞的风吹过...', color: '#666666', exec: g => {
                // Troll event, nothing happens
            }},
            { msg: '🔄 乾坤大挪移！', color: '#ff00ff', minScore: 200, exec: g => {
                const z = g.entities.filter(e => e instanceof Zombie && !e.isDead);
                if(z.length >= 2) {
                    const z1 = z[Math.floor(Math.random()*z.length)];
                    let z2 = z[Math.floor(Math.random()*z.length)];
                    while(z1 === z2) z2 = z[Math.floor(Math.random()*z.length)];
                    const tempX = z1.x, tempRow = z1.row, tempY = z1.y;
                    z1.x = z2.x; z1.row = z2.row; z1.y = z2.y;
                    z2.x = tempX; z2.row = tempRow; z2.y = tempY;
                }
            }}
        ];
    }
    
    trigger() {
        const validEvents = this.events.filter(ev => !ev.minScore || this.game.score >= ev.minScore);
        const ev = validEvents[Math.floor(Math.random() * validEvents.length)];
        this.game.showAnnouncement(ev.msg, ev.color);
        try { ev.exec(this.game); } catch(e) { console.error('Event Error:', e); }
    }
}
