class CollisionManager {
    constructor(game) {
        this.game = game;
    }
    
    update() {
        // Optimize: we only need to check collisions between Projectiles and Zombies
        // Plant/Zombie collision is handled by Zombie walking logic.
        
        const projectiles = this.game.entities.filter(e => e instanceof Projectile && !e.isDead);
        const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING' && !e.hypnotized);
        
        for (let p of projectiles) {
            for (let z of zombies) {
                if (p.row === z.row && p.type !== 'cattail' && p.type !== 'gloom_puff' && p.type !== 'zpea') {
                    // 抛射型子弹（西瓜/冰西瓜）走抛物线：只有落到接近本行高度时才判定命中，
                    // 否则它在半空中就会把僵尸"隔空打死"（canHitNow 对普通子弹恒为 true）
                    if (typeof p.canHitNow === 'function' && !p.canHitNow()) continue;
                    if (p.x + p.radius > z.x - 30 && p.x - p.radius < z.x + 30) {
                        if (p.type === 'fumeshroom') {
                            if (!p.hitZombies.has(z)) {
                                p.hitZombies.add(z);
                                // v3.14.0：大喷菇雾气穿门（pierce）—— 铁门/铁桶挡不住，直接打本体
                                z.takeDamage(p.damage, { pierce: true });
                                if (this.game.audioManager.playFx) this.game.audioManager.playFx('puff'); // v3.23.0
                                else this.game.audioManager.play('splat');
                            }
                        } else {
                            p.isDead = true; 
                            // ===== v3.10.0 投手（卷心菜/玉米/黄油）= 破甲弹 =====
                            // 破甲规则：伤害越过护甲直接落在僵尸本体上，但护甲"感知不到"这次伤害
                            // → 路障帽/铁桶/报纸/铁门永不脱落（详见 Zombie.takeDamage / armorHp）。
                            // 该规则只给这三个投掷物开（其它植物仍是普通伤害）。
                            const pierce = p.type === 'cabbage' || p.type === 'icecabbage'
                                        || p.type === 'kernel' || p.type === 'popcorn'
                                        || p.type === 'butter'
                                        || p.type === 'scaredyshroom' // v3.14.0：胆小菇孢子穿门
                                        || p.type === 'fume_burst';   // v3.26.0：大喷菇弹幕穿门
                            z.takeDamage(p.damage, pierce ? { pierce: true } : undefined);
                            
                            if (p.type === 'snowpea' || p.type === 'wintermelon' || p.type === 'icecabbage') {
                                z.setSlow(10.0);
                            } else if (p.type === 'firepea') {
                                z.thaw(); // Fire thaws out zombies
                            } else if (p.type === 'butter') {
                                z.freezeButter(3.0); // 玉米投手 20% 黄油：定身 3 秒
                            }
                            
                            // v3.28.0：西瓜系统一"直击 60 + 溅射 30"——猫尾草西瓜/铁冰西瓜猫尾草
                            // 旧版没有溅射，玩家反馈"猫尾草西瓜伤害弱一档"，现与普通西瓜完全同一档
                            if (p.type === 'melon' || p.type === 'wintermelon' ||
                                p.type === 'cattail_melon' || p.type === 'cattail_wintermelon') {
                                const allZombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
                                for (let oz of allZombies) {
                                    if (oz !== z && Math.abs(oz.row - z.row) <= 1 && Math.abs(oz.x - z.x) < 150) {
                                        oz.takeDamage(p.damage / 2);
                                        if (p.type === 'wintermelon' || p.type === 'cattail_wintermelon') {
                                            oz.setSlow(10.0);
                                        }
                                    }
                                }
                            }
                            
                            // 爆米花（融合：玉米投手+火爆辣椒）：命中 3×3 溅射（同为破甲伤害）
                            if (p.type === 'popcorn') {
                                const allZombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
                                for (let oz of allZombies) {
                                    if (oz !== z && Math.abs(oz.row - z.row) <= 1 && Math.abs(oz.x - z.x) < 150) {
                                        oz.takeDamage(p.damage / 2, { pierce: true });
                                    }
                                }
                            }
                            
                            // 小樱桃炸弹（樱桃射手第 10 发）：命中即爆，
                            // 以命中僵尸为中心 3×3 爆炸，900 伤害（原版樱桃炸弹 1800 的一半）
                            if (p.type === 'minicherry') {
                                const allZombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
                                for (let oz of allZombies) {
                                    if (oz !== z && Math.abs(oz.row - z.row) <= 1 && Math.abs(oz.x - z.x) < 150) {
                                        oz.takeDamage(p.damage);
                                    }
                                }
                                let boom = document.createElement('img');
                                boom.src = 'assets/images/Plants/CherryBomb/Boom.gif';
                                boom.style.position = 'absolute';
                                boom.style.left = (z.x - 60) + 'px';
                                boom.style.top = (z.y - 80) + 'px';
                                boom.style.zIndex = '100';
                                this.game.container.appendChild(boom);
                                setTimeout(() => boom.remove(), 800);
                            }
                            
                            // v3.23.0：命中音效按弹种区分——瓜果碎裂/蔬菜砸中/豌豆噗
                            // v3.26.0：fume_burst 30 连发不逐发响（发射口已统一放一次 puff）
                            const hitFx = (p.type === 'melon' || p.type === 'wintermelon' ||
                                           p.type === 'cattail_melon' || p.type === 'cattail_wintermelon') ? 'crash'
                                : (p.type === 'cabbage' || p.type === 'icecabbage' || p.type === 'kernel' ||
                                   p.type === 'popcorn' || p.type === 'butter' || p.type === 'minicherry') ? 'thud'
                                : (p.type === 'snowpea') ? 'ice_pop'
                                : (p.type === 'firepea') ? 'fire_pop'
                                : (p.type === 'fume_burst') ? null
                                : 'pea_hit';
                            if (hitFx && this.game.audioManager.playFx) this.game.audioManager.playFx(hitFx);
                            else if (hitFx) this.game.audioManager.play('splat');
                            break; 
                        }
                    }
                }
            }
        }
        
        // Torchwood interactions
        // v3.28.0 关键修复：每个树桩对每颗豌豆只转化一次。
        // 旧版没有"已转化"标记 → 寒冰豌豆第一帧被解冻成普通豌豆，第二帧还在树桩 ±20px
        // 范围内又被普通豌豆分支点着成火焰豌豆 —— 玩家看到的"寒冰豌豆穿树桩还是火豌豆"。
        // 正确规则（原版）：寒冰豌豆过树桩=解冻成普通豌豆；普通豌豆过树桩=点燃；后续树桩照常点燃。
        const plants = this.game.entities.filter(e => e instanceof Plant && !e.isDead);
        for (let p of projectiles) {
            if (p.type === 'peashooter' || p.type === 'snowpea' || p.type === 'backpea') {
                for (let pl of plants) {
                    if (pl.type === 'torchwood' && pl.row === p.row && Math.abs(pl.x - p.x) < 20) {
                        if (!p._torchSeen) p._torchSeen = new Set();
                        if (p._torchSeen.has(pl)) continue; // 这颗豌豆已经过这个树桩
                        p._torchSeen.add(pl);
                        if (p.type === 'snowpea') {
                            p.type = 'peashooter'; // Thaws
                            p.element.src = 'assets/images/Plants/PB00.gif';
                        } else {
                            p.type = 'firepea';
                            p.damage = 40;
                            p.element.src = 'assets/images/Plants/PB10.gif';
                        }
                        break;
                    }
                }
            }
        }

        // v3.23.0：豌豆头/机枪头僵尸的豌豆（zpea）——命中植物造成伤害
        // v3.27.0：只有"纯地面刺"低矮不打；带坚果躯体的融合株（地刺坚果/高坚果钢地刺）照常挨打
        for (let p of projectiles) {
            if (p.type !== 'zpea' || p.isDead) continue;
            const hitPlants = this.game.entities.filter(e => e instanceof Plant && !e.isDead && e.row === p.row &&
                Math.abs(e.x - p.x) < 35 &&
                e.type !== 'spikeweed' && e.type !== 'spikerock');
            if (hitPlants.length > 0) {
                hitPlants[0].hp -= p.damage;
                if (this.game.audioManager.playFx) this.game.audioManager.playFx('pea_hit');
                p.isDead = true;
            }
        }
    }
}
