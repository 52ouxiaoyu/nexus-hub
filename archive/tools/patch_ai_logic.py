import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# 1. Update generateMap to assign owners and front vectors
old_gen_map = """            // 门洞挖开
            this.walls.delete(`${rm.x + d.c},${rm.y + d.r}`);"""
new_gen_map = """            // 门洞挖开
            this.walls.delete(`${rm.x + d.c},${rm.y + d.r}`);
            
            // 计算门前的引导点（防止僵尸撞墙）
            let dx = 0, dy = 0;
            if (d.r >= rm.h) dy = 1; else if (d.r < 0) dy = -1;
            else if (d.c >= rm.w) dx = 1; else dx = -1;
            rm.frontX = (rm.x + d.c + dx * 1.5) * this.gridSize + 40;
            rm.frontY = (rm.y + d.r + dy * 1.5) * this.gridSize + 40;"""
content = content.replace(old_gen_map, new_gen_map)

old_ai_spawn = """            const ai = {
                x: (this.worldWidth / 2) + (Math.random() * 40 - 20),
                y: (this.worldHeight / 2) + (Math.random() * 40 - 20),
                targetX: (rm.x + rm.tpl.bed.c) * this.gridSize + 40,
                targetY: (rm.y + rm.tpl.bed.r) * this.gridSize + 40,
                sun: 50, hp: 100, maxHp: 100,
                isAi: true, room: rm, roleDef: roleDef,
                icon: roleDef.icon,
                el1: document.createElement('div')
            };
            ai.el1.className = 'entity avatar';
            ai.el1.innerHTML = `<img src="${ai.icon}">`;
            this.world1.appendChild(ai.el1);
            this.ais.push(ai);
            this.allPlayers.push(ai);"""
new_ai_spawn = """            const ai = {
                x: (this.worldWidth / 2) + (Math.random() * 40 - 20),
                y: (this.worldHeight / 2) + (Math.random() * 40 - 20),
                targetX: (rm.x + rm.tpl.bed.c) * this.gridSize + 40,
                targetY: (rm.y + rm.tpl.bed.r) * this.gridSize + 40,
                sun: 50, spore: 0, hp: 100, maxHp: 100,
                isAi: true, room: rm, roleDef: roleDef,
                icon: roleDef.icon, dead: false,
                el1: document.createElement('div')
            };
            rm.owner = ai; // AI 预占领房间
            ai.el1.className = 'entity avatar';
            ai.el1.innerHTML = `<img src="${ai.icon}">`;
            this.world1.appendChild(ai.el1);
            this.ais.push(ai);
            this.allPlayers.push(ai);"""
content = content.replace(old_ai_spawn, new_ai_spawn)

# 2. Update player claiming room in spawnPlant
old_spawn_plant = """    spawnPlant(col, row, type, isDoor = false) {
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;"""
new_spawn_plant = """    spawnPlant(col, row, type, isDoor = false) {
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        const rm = this._insideRoom(col, row);
        if (rm && !rm.owner && !this.player.room) {
            rm.owner = this.player;
            this.player.room = rm; // 玩家占领该房间
        }"""
content = content.replace(old_spawn_plant, new_spawn_plant)

# 3. Modify _updateProduce to use owner
old_produce = """    _updateProduce(dt) {
        const px = this.player.x, py = this.player.y;
        for (const pl of this.plants) {
            const def = pl.def;
            if (def.produce) {
                const wx = pl.c * 80 + 40, wy = pl.r * 80 + 40;
                if (Math.hypot(wx - px, wy - py) > 300) continue; // 人不在旁边不产
                pl.prodT += dt;
                if (pl.prodT >= def.produce.every) {
                    pl.prodT = 0;
                    this.addSun(def.produce.sun);
                    this._flyText(pl.c * 80 + 40, pl.r * 80, `+${def.produce.sun} ☀`, 'yellow');
                    this.playSfx('points.mp3', 0.25);
                }
            }
            if (def.spore) {
                pl.sporeT += dt;
                if (pl.sporeT >= def.spore.every) {
                    pl.sporeT = 0;
                    this.addSpore(def.spore.n);
                    this._flyText(pl.c * 80 + 40, pl.r * 80 + 10, `+${def.spore.n} 🦠`, '#c79aff');
                }
            }
        }
    }"""
new_produce = """    _updateProduce(dt) {
        for (const pl of this.plants) {
            const rm = this._insideRoom(pl.c, pl.r);
            const owner = rm ? rm.owner : null;
            if (!owner || owner.dead) continue;
            
            const def = pl.def;
            const wx = pl.c * 80 + 40, wy = pl.r * 80 + 40;
            // 只有站得近才产出（AI 永远在房间里所以始终满足，玩家必须在房间附近）
            if (Math.hypot(wx - owner.x, wy - owner.y) > 300) continue;

            if (def.produce) {
                pl.prodT += dt;
                if (pl.prodT >= def.produce.every) {
                    pl.prodT = 0;
                    owner.sun = (owner.sun || 0) + def.produce.sun;
                    if (owner === this.player) {
                        this.addSun(def.produce.sun); // 顺便更新UI
                        this._flyText(wx, pl.r * 80, `+${def.produce.sun} ☀`, 'yellow');
                        this.playSfx('points.mp3', 0.25);
                    }
                }
            }
            if (def.spore) {
                pl.sporeT += dt;
                if (pl.sporeT >= def.spore.every) {
                    pl.sporeT = 0;
                    owner.spore = (owner.spore || 0) + def.spore.n;
                    if (owner === this.player) {
                        this.addSpore(def.spore.n);
                        this._flyText(wx, pl.r * 80 + 10, `+${def.spore.n} 🦠`, '#c79aff');
                    }
                }
            }
        }
    }"""
content = content.replace(old_produce, new_produce)

# 4. Modify Zombie AI targeting and Game Over logic
old_zombie_eat = """                        } else {
                            if (atkPlant.hp <= 0) {
                                this.playSfx('gulp.mp3', 0.4);
                                atkPlant.el.remove();
                                this.plants.splice(this.plants.indexOf(atkPlant), 1);
                                // 如果玩家的阳光菇被铲掉或吃掉，游戏结束
                                if (atkPlant.def.produce && atkPlant.def.produce.sun && this.player.room && atkPlant.c >= this.player.room.x && atkPlant.c < this.player.room.x + this.player.room.w && atkPlant.r >= this.player.room.y && atkPlant.r < this.player.room.y + this.player.room.h) {
                                    this.gameOver(false); // 玩家阳光菇被吃，直接失败
                                    return;
                                }
                            }
                        }"""
new_zombie_eat = """                        } else {
                            if (atkPlant.hp <= 0) {
                                this.playSfx('gulp.mp3', 0.4);
                                atkPlant.el.remove();
                                this.plants.splice(this.plants.indexOf(atkPlant), 1);
                                
                                const prm = this._insideRoom(atkPlant.c, atkPlant.r);
                                if (prm && prm.owner && atkPlant.def.produce && atkPlant.def.produce.sun) {
                                    if (prm.owner === this.player) {
                                        this.gameOver(false);
                                        return;
                                    } else {
                                        prm.owner.dead = true;
                                        prm.owner.el1.style.opacity = '0.3';
                                        this._flyText(prm.owner.x, prm.owner.y, '已被淘汰！', 'red');
                                        zb.targetRoom = null; // 重置僵尸目标
                                    }
                                }
                            }
                        }"""
content = content.replace(old_zombie_eat, new_zombie_eat)

old_zombie_target = """            // 追踪所有玩家（包含真人+人机）中距离最近的一个
            let closestTarget = null, minDist = Infinity;
            for (const p of this.allPlayers) {
                const dist = Math.hypot(zb.x - p.x, zb.y - p.y);
                if (dist < minDist) { minDist = dist; closestTarget = p; }
            }
            if (!closestTarget) closestTarget = this.player;

            // 僵尸首要目标是玩家的【阳光菇】（而不是玩家本人）
            let targetX = closestTarget.x;
            let targetY = closestTarget.y;
            if (closestTarget.room) {
                const tr = closestTarget.room;
                // 找出该房间里产阳光的植物（阳光菇系列）
                const shroom = this.plants.find(pl => pl.c >= tr.x && pl.c < tr.x + tr.w && pl.r >= tr.y && pl.r < tr.y + tr.h && pl.def.produce && pl.def.produce.sun);
                if (shroom) {
                    targetX = shroom.c * 80 + 40;
                    targetY = shroom.r * 80 + 40;
                }
            }"""
new_zombie_target = """            // 如果当前没有目标房间，或者目标房间主人死了，重新挑一个有人的房间
            if (!zb.targetRoom || !zb.targetRoom.owner || zb.targetRoom.owner.dead) {
                const validRooms = this.rooms.filter(r => r.owner && !r.owner.dead);
                if (validRooms.length > 0) {
                    // 挑选直线距离最近的有效房间
                    validRooms.sort((a,b) => Math.hypot(zb.x - (a.frontX), zb.y - (a.frontY)) - Math.hypot(zb.x - (b.frontX), zb.y - (b.frontY)));
                    zb.targetRoom = validRooms[0];
                }
            }

            let targetX = this.worldWidth / 2;
            let targetY = this.worldHeight / 2;
            
            if (zb.targetRoom) {
                const rm = zb.targetRoom;
                // 是否已经破门进屋？
                const door = this.plants.find(p => p.c === rm.x + rm.tpl.door.c && p.r === rm.y + rm.tpl.door.r && p.def.isDoor);
                if (door) {
                    // 门还在：先导航到门前的引导点 (防止撞墙)，靠近后再直接啃门
                    if (Math.hypot(zb.x - rm.frontX, zb.y - rm.frontY) > 80) {
                        targetX = rm.frontX;
                        targetY = rm.frontY;
                    } else {
                        targetX = door.c * 80 + 40;
                        targetY = door.r * 80 + 40;
                    }
                } else {
                    // 门破了：直接冲向阳光菇！
                    const shroom = this.plants.find(p => p.c >= rm.x && p.c < rm.x + rm.w && p.r >= rm.y && p.r < rm.y + rm.h && p.def.produce && p.def.produce.sun);
                    if (shroom) {
                        targetX = shroom.c * 80 + 40;
                        targetY = shroom.r * 80 + 40;
                    } else {
                        targetX = rm.owner.x;
                        targetY = rm.owner.y;
                    }
                }
            } else {
                targetX = this.player.x;
                targetY = this.player.y;
            }"""
content = content.replace(old_zombie_target, new_zombie_target)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
