import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# 1. Bind 'M' key
bind_code = """        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key.toLowerCase() === 'm' && !e.repeat && !this.player.skillUsed) {
                this._useSkill();
            }"""
content = content.replace("""        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;""", bind_code)

# 2. Add _useSkill method
use_skill_code = """    _useSkill() {
        if (this.player.skillUsed) return;
        const p = this.player;
        const r = p.roleDef.id;
        const zb = this.zombies[0];

        if (r === 'sunflower') {
            p.skillUsed = true;
            p.sunBuffT = 10;
            this._announce('🌻 技能激活：10秒内阳光产出翻倍！', 'points.mp3');
        } else if (r === 'peashooter') {
            p.skillUsed = true;
            p.atkBuffT = 15;
            this._announce('🌿 技能激活：15秒内植物攻击力翻倍！', 'points.mp3');
        } else if (r === 'wallnut') {
            let myRm = null;
            for (const rm of this.rooms) {
                const rxMin = rm.x * this.gridSize, rxMax = (rm.x + rm.w) * this.gridSize;
                const ryMin = rm.y * this.gridSize, ryMax = (rm.y + rm.h) * this.gridSize;
                if (p.x >= rxMin && p.x <= rxMax && p.y >= ryMin && p.y <= ryMax) {
                    myRm = rm; break;
                }
            }
            if (myRm) {
                const doorPlant = this.getPlantAt(myRm.doorCol * this.gridSize, myRm.doorRow * this.gridSize);
                if (doorPlant && doorPlant.def.up) {
                    p.skillUsed = true;
                    this._upgradePlant(doorPlant, doorPlant.def.up.to);
                    this._announce('🌰 技能激活：大门免费升级完毕！', 'points.mp3');
                } else {
                    this._announce('❌ 门不存在或无法再升级！', 'buzzer.mp3');
                }
            } else {
                this._announce('❌ 必须在房间内才能升级门！', 'buzzer.mp3');
            }
        } else if (r === 'chomper') {
            if (zb && !zb.dead) {
                p.skillUsed = true;
                zb.hp = Math.min(zb.hp, zb.maxHp * 0.05); // 触发回城
                zb.retreating = true;
                this._announce('🌸 技能激活：大嘴花将僵尸吓跑了！', 'chomp.mp3');
            }
        } else if (r === 'squash') {
            if (zb && !zb.dead) {
                if (zb.hp >= zb.maxHp / 2) {
                    p.skillUsed = true;
                    zb.hp -= zb.maxHp / 2;
                    if (zb.hpBg) zb.hpBg.style.display = 'block';
                    if (zb.hpFg) zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%';
                    this._announce('🎃 技能激活：倭瓜砸掉了僵尸一半血！', 'squash_hmm.mp3');
                } else {
                    this._announce('❌ 僵尸血量不足一半，无法使用！', 'buzzer.mp3');
                }
            }
        }
        this._refreshHud();
    }

    bindInput() {"""
content = content.replace("    bindInput() {", use_skill_code)

# 3. Decrement buffs in loop
tick_code = """        if (Math.floor(time / 500) !== Math.floor((time - dt * 1000) / 500)) this._updateGhostChip(); // 0.5s 刷一次信息牌

        if (this.player.sunBuffT > 0) this.player.sunBuffT -= dt;
        if (this.player.atkBuffT > 0) this.player.atkBuffT -= dt;"""
content = content.replace("        if (Math.floor(time / 500) !== Math.floor((time - dt * 1000) / 500)) this._updateGhostChip(); // 0.5s 刷一次信息牌", tick_code)

# 4. Apply buff to sun production
old_sun = """            if (pDef.produce) {
                pl.prodT += dt;
                if (pl.prodT >= pDef.produce.every) {
                    pl.prodT = 0;
                    this.suns.push({ x: pl.c * 80 + 40, y: pl.r * 80 + 40, life: 10, v: pDef.produce.sun });
                }
            }"""
new_sun = """            if (pDef.produce) {
                pl.prodT += dt;
                if (pl.prodT >= pDef.produce.every) {
                    pl.prodT = 0;
                    let amt = pDef.produce.sun;
                    if (this.player.sunBuffT > 0) amt *= 2;
                    this.suns.push({ x: pl.c * 80 + 40, y: pl.r * 80 + 40, life: 10, v: amt });
                }
            }"""
content = content.replace(old_sun, new_sun)

# 5. Apply buff to shoot damage
old_shoot = """                        hp: 1, maxHp: 1, life: 3, dmg: pDef.shoot.dmg, slow: pDef.shoot.slow,
                        homing: pDef.shoot.homing, aoe: pDef.shoot.aoe || 0,
                        el: el1"""
new_shoot = """                        hp: 1, maxHp: 1, life: 3, dmg: pDef.shoot.dmg * (this.player.atkBuffT > 0 ? 2 : 1), slow: pDef.shoot.slow,
                        homing: pDef.shoot.homing, aoe: pDef.shoot.aoe || 0,
                        el: el1"""
content = content.replace(old_shoot, new_shoot)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
