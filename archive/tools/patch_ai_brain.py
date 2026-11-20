import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# Add _updateAIs method
new_method = """    _updateAIs(dt) {
        this.aiTick = (this.aiTick || 0) + dt;
        if (this.aiTick > 1.5) { // 每 1.5 秒做一次决策
            this.aiTick = 0;
            for (const ai of this.ais) {
                if (ai.dead) continue;
                if (Math.hypot(ai.x - ai.targetX, ai.y - ai.targetY) > 10) continue; // 还在赶路
                
                const rm = ai.room;
                if (!rm) continue;

                const myPlants = this.plants.filter(p => p.c >= rm.x && p.c < rm.x + rm.w && p.r >= rm.y && p.r < rm.y + rm.h);
                const shrooms = myPlants.filter(p => p.def.produce && p.def.produce.sun);
                const door = myPlants.find(p => p.def.isDoor);
                const peas = myPlants.filter(p => p.def.shoot && !p.def.isDoor);

                // Priority 1: Plant a Sunshroom if none
                if (shrooms.length === 0) {
                    const cost = HauntedDorm.DEFS['sunshroom'].cost || 0;
                    if (ai.sun >= cost) {
                        ai.sun -= cost;
                        this.spawnPlant(rm.x + rm.tpl.bed.c, rm.y + rm.tpl.bed.r, 'sunshroom');
                    }
                    continue; // 一次只做一个动作
                }

                // 收集可行操作
                let actions = [];
                
                // 1. 尝试升级已有的植物 (门、阳光菇、豌豆)
                for (const p of myPlants) {
                    if (p.def.up) {
                        const c = p.def.up.cost || 0, sc = p.def.up.sporeCost || 0;
                        if (ai.sun >= c && ai.spore >= sc) {
                            // 优先升门，其次阳光菇
                            let weight = p.def.isDoor ? 3 : (p.def.produce ? 2 : 1);
                            // 如果快破门了，强制升门补血
                            if (p.def.isDoor && p.hp < p.def.hp * 0.4) weight += 10;
                            actions.push({ type: 'up', pl: p, cost: c, sporeCost: sc, to: p.def.up.to, weight: weight });
                        }
                    }
                }
                
                // 2. 尝试种豌豆或小喷菇
                const emptyTiles = [];
                for(let r = rm.y + 1; r < rm.y + rm.h - 1; r++) {
                    for(let c = rm.x + 1; c < rm.x + rm.w - 1; c++) {
                        if (!myPlants.some(p => p.c === c && p.r === r)) {
                            emptyTiles.push({c, r});
                        }
                    }
                }
                
                if (emptyTiles.length > 0) {
                    // 随机打乱空地
                    emptyTiles.sort(() => Math.random() - 0.5);
                    const peaCost = HauntedDorm.DEFS['peashooter'].cost || 0;
                    if (ai.sun >= peaCost && peas.length < 5) {
                        actions.push({ type: 'plant', id: 'peashooter', cost: peaCost, c: emptyTiles[0].c, r: emptyTiles[0].r, weight: 1 });
                    }
                    // 小喷菇产孢子 (上限 2 个)
                    const puffs = myPlants.filter(p => p.def.spore);
                    if (puffs.length < 2) {
                        actions.push({ type: 'plant', id: 'puffshroom', cost: 0, c: emptyTiles[0].c, r: emptyTiles[0].r, weight: 2 });
                    }
                }

                // 随机轮盘选择执行
                if (actions.length > 0) {
                    const totalW = actions.reduce((sum, a) => sum + a.weight, 0);
                    let r = Math.random() * totalW;
                    let chosen = actions[actions.length - 1];
                    for (const a of actions) {
                        r -= a.weight;
                        if (r <= 0) { chosen = a; break; }
                    }
                    
                    if (chosen.type === 'up') {
                        ai.sun -= chosen.cost;
                        ai.spore -= chosen.sporeCost;
                        this._evolve(chosen.pl, chosen.to);
                        this._flyText(chosen.pl.c * 80 + 40, chosen.pl.r * 80, `AI 升级！`, '#bfa8e0');
                    } else if (chosen.type === 'plant') {
                        ai.sun -= chosen.cost;
                        this.spawnPlant(chosen.c, chosen.r, chosen.id);
                        this._flyText(chosen.c * 80 + 40, chosen.r * 80, `AI 种植！`, '#bfa8e0');
                    }
                }
            }
        }
    }

    _updateGhostDirector(time) {"""

content = content.replace("    _updateGhostDirector(time) {", new_method)

old_loop_call = """        // 单僵尸导演：出笼 → 定时升级 → 打倒重生
        this._updateGhostDirector(time);"""
new_loop_call = """        // 单僵尸导演：出笼 → 定时升级 → 打倒重生
        this._updateGhostDirector(time);
        this._updateAIs(dt);"""
content = content.replace(old_loop_call, new_loop_call)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
