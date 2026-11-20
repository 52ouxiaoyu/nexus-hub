#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v4.0.107：守屋大作战 v4.0.106 体检报告 10 项修复（全部替换成功后才写盘）"""
import io, sys

P = 'js/HauntedDorm.js'
src = io.open(P, encoding='utf-8').read()
subs = []
def rep(old, new, cnt=1, tag=''):
    global src
    n = src.count(old)
    assert n == cnt, f'[{tag}] 期望 {cnt} 处，实际 {n} 处'
    src = src.replace(old, new)
    subs.append(tag)

# ---------- 1. 2p 僵尸阵营：P2 也初始化僵尸身份 ----------
rep("""        if (this.isZombieFaction) {
            const zCfg = HauntedDorm.GHOST_LEVELS[0];
            this.player.hp = zCfg.hp * HauntedDorm.PLAYER_HP_MUL; // v4.0.36：真人玩家血池 ×3
            this.player.maxHp = zCfg.hp * HauntedDorm.PLAYER_HP_MUL;
            this.player.x = this.worldWidth ? this.worldWidth / 2 : cx;
            this.player.y = this.worldHeight ? this.worldHeight / 2 : cy;
            this.player.isZombie = true;
            this.player.cfg = zCfg;
            this.ghostSpawned = true;
            this.ghostSpawnAt = 0;
        }""",
"""        if (this.isZombieFaction) {
            const zCfg = HauntedDorm.GHOST_LEVELS[0];
            // v4.0.107：僵尸阵营 2p——P1/P2 都要初始化僵尸身份。原版只给 this.player 写 isZombie/cfg，
            // P2 有 HUD、能走动，却打不动植物也不挨打（植物索敌 filter(p=>p.isZombie) 只认出 P1）
            const zBaseX = this.worldWidth ? this.worldWidth / 2 : cx;
            const zBaseY = this.worldHeight ? this.worldHeight / 2 : cy;
            for (const zp of this.allPlayers) {
                zp.hp = zCfg.hp * HauntedDorm.PLAYER_HP_MUL; // v4.0.36：真人玩家血池 ×3
                zp.maxHp = zCfg.hp * HauntedDorm.PLAYER_HP_MUL;
                zp.x = zBaseX + (zp === this.player ? 0 : 70);
                zp.y = zBaseY;
                zp.isZombie = true;
                zp.cfg = zCfg;
                zp.level = 1;
            }
            this.ghostSpawned = true;
            this.ghostSpawnAt = 0;
        }""", 1, '1-僵尸P2初始化')

# ---------- 2. 啃食链放行 P2 ----------
rep("            if (!zpTraitor && !(this.isZombieFaction && zp === this.player)) continue;",
    "            if (!zpTraitor && !(this.isZombieFaction && zp.isZombie)) continue; // v4.0.107：僵尸阵营 P1/P2 都能啃（原只放行 this.player）",
    1, '2-啃食放行P2')

# ---------- 3. _killZombie：僵尸玩家死亡结算泛化 ----------
rep("""        if (this.isZombieFaction && zb === this.player) {
            this._announce('💀 你被植物击败了…', 'scream.mp3', true);
            if (this._gameOverTimer) clearTimeout(this._gameOverTimer);
            this._gameOverTimer = setTimeout(() => this.gameOver(false), 3000);
            return;
        }""",
"""        // v4.0.107：僵尸阵营 2p——P1/P2 都是可被植物击杀的僵尸；一人倒下另一人继续，全灭才失败
        if (this.isZombieFaction && (zb === this.player || zb === this.player2)) {
            zb.vx = 0; zb.vy = 0;
            const who = zb === this.player ? 'P1' : 'P2';
            const alive = this._humansAll().filter(h => h && !h.dead);
            if (alive.length === 0) {
                this._announce('💀 两位僵尸玩家都被植物击败了…', 'scream.mp3', true);
                if (this._gameOverTimer) clearTimeout(this._gameOverTimer);
                this._gameOverTimer = setTimeout(() => this.gameOver(false), 3000);
            } else {
                this._announce(`💀 ${who} 被植物击败了… ${who === 'P1' ? 'P2' : 'P1'} 继续战斗！`, 'scream.mp3', true);
                this._refreshHud();
            }
            return;
        }""", 1, '3-僵尸玩家死亡泛化')

# ---------- 4. 僵尸死亡掉落阳光袋（激活死代码 this.suns） ----------
rep("""        if (zb.dead) return;
        zb.dead = true;
        this.kills++;
        this.lastKiller = killer; // 记录击杀者""",
"""        if (zb.dead) return;
        zb.dead = true;
        this.kills++;
        this.lastKiller = killer; // 记录击杀者
        // v4.0.107：僵尸死亡掉落阳光袋——this.suns 原本是死代码（只有拾取与渲染，全文件没有一处 push）
        if (!this.isZombieFaction) this._dropSunBag(zb);""", 1, '4-阳光袋掉落')

# ---------- 5. 门板/植物回血：def.hp → maxHp（门板 maxHp 只有图鉴 30%，用 def.hp 会回成 3.3 倍血） ----------
rep("""\n                                pl.hp = pl.def.hp || pl.maxHp || pl.hp;""",
"""\n                                pl.hp = pl.maxHp || pl.def.hp || pl.hp; // v4.0.107：按 maxHp 回满（门板 maxHp=图鉴 30%，用 def.hp 会回成 3.3 倍血）""",
1, '5a-奖杯回血maxHp')
rep("""\n                                    pl.hp = pl.def.hp || pl.maxHp || pl.hp;""",
"""\n                                    pl.hp = pl.maxHp || pl.def.hp || pl.hp; // v4.0.107：按 maxHp 回满（同上）""",
1, '5b-圣光回血maxHp')

# ---------- 6. 回血按距离而非"只比列" ----------
rep("""\n                            if (pl.c >= pickedByPlayer.x / 80 - 10 && pl.c <= pickedByPlayer.x / 80 + 10) {""",
"""\n                            // v4.0.107：按距离（5 格）而非"只比列"——原写法站在地图中间，同列上下 21 格植物全部回满
                            if (Math.hypot(pl.c * 80 + 40 - pickedByPlayer.x, pl.r * 80 + 40 - pickedByPlayer.y) <= 400) {""",
1, '6a-奖杯回血半径')
rep("""\n                                if (pl.c >= pickedByPlayer.x/80 - 10 && pl.c <= pickedByPlayer.x/80 + 10) {""",
"""\n                                // v4.0.107：按距离（5 格）而非"只比列"（同上）
                                if (Math.hypot(pl.c * 80 + 40 - pickedByPlayer.x, pl.r * 80 + 40 - pickedByPlayer.y) <= 400) {""",
1, '6b-圣光回血半径')

# ---------- 7. 人机盲盒奖励与玩家同表（原：任何盲盒都 +1000☀/+100🦠，是玩家 💰钱袋的 6.7 倍） ----------
rep("""                if (pickedByAI) {
                    pickedByAI.sun += 1000;
                    pickedByAI.spore += 100;
                    this._flyText(a.x, a.y, '🤖 盲盒被AI抢走了！', '#aaa');""",
"""                if (pickedByAI) {
                    // v4.0.107：人机不再"任何盲盒都 +1000☀"（原与玩家 💰钱袋 +150 相差 6.7 倍，抢到一次 = 400 秒产出，
                    // 一局强弱全看谁先摸到箱子）。现按外观分档、约为玩家同档的 60%；配合 _updateProduce 的 40% 被动产出，经济不再全押随机
                    const aiSun = a.kind === 'diamond' ? 600 : a.kind === 'money' ? 90 : 150;
                    const aiSpore = a.kind === 'diamond' ? 60 : 40;
                    pickedByAI.sun += aiSun;
                    pickedByAI.spore += aiSpore;
                    this._flyText(a.x, a.y, `🤖 盲盒被AI抢走了！(+${aiSun}☀ +${aiSpore}🦠)`, '#aaa');""",
1, '7-人机盲盒分档')

# ---------- 8. 人机植物恢复 40% 被动产出 ----------
rep("""            if (owner.isAi) continue; // v4.0.45：削人机——人机的产出类植物（向日葵/小喷菇等）不再自动产资源，人机主要靠开局资金+事件奖励行动""",
"""            // v4.0.107：人机不再"零产出"（v4.0.45 全砍后，人机经济 100% 押在盲盒随机数上）——恢复 40% 被动产出（无飘字无音效）
            const aiProdMul = owner.isAi ? 0.4 : 1;""",
1, '8a-人机产出倍率')
rep("                    let sAmt = def.produce.sun * boost;",
    "                    let sAmt = def.produce.sun * boost * aiProdMul;",
    1, '8b-阳光乘AI倍率')
rep("                    const spAmt = def.spore.n * boost;",
    "                    const spAmt = def.spore.n * boost * aiProdMul;",
    1, '8c-孢子乘AI倍率')

# ---------- 9. P2 天使/内鬼同样停产 ----------
rep("            if (owner === this.player && (this.playerAngelic || this.playerTraitor)) continue; // v4.0.44：天使无产出；内鬼不再享受植物供奉",
    "            if (owner.angelic || owner.traitor) continue; // v4.0.107：任一玩家（P1/P2）变身天使/内鬼都不再享受植物供奉（原只判 P1）",
    1, '9-天使内鬼停产泛化')

# ---------- 10. AI 主僵尸补 Lv.10（植物方永远见不到巨人僵尸） ----------
rep("""                { s: 390, lv: 7 }, { s: 450, lv: 8 }, { s: 510, lv: 9 }
            ];""",
"""                { s: 390, lv: 7 }, { s: 450, lv: 8 }, { s: 510, lv: 9 }, { s: 570, lv: 10 }
            ]; // v4.0.107：补 Lv.10 巨人僵尸（原表停在 lv9，植物方永远见不到巨人；玩家僵尸链却能到 10）""",
1, '10-AI僵尸Lv10')

# ---------- 11. 内鬼判定泛化（原硬编码 P1） ----------
rep("""    _humansAll() { return this.player2 ? [this.player, this.player2] : [this.player]; }""",
"""    _humansAll() { return this.player2 ? [this.player, this.player2] : [this.player]; }
    // v4.0.107：任一真人是否内鬼/天使——原结算与判定全部硬编码 this.playerTraitor（P2 变身时判错）
    _anyTraitor() { return this._humansAll().some(p => p && p.traitor); }
    _anyAngelic() { return this._humansAll().some(p => p && p.angelic); }""",
1, '11a-任一内鬼方法')
rep("        if (this.playerTraitor) {\n            // v4.0.44：内鬼结局",
    "        if (this._anyTraitor()) {\n            // v4.0.44：内鬼结局",
    1, '11b-结算标题内鬼')
rep("        } else if (this.playerAngelic) {\n            // v4.0.44：天使结局",
    "        } else if (this._anyAngelic()) {\n            // v4.0.44：天使结局",
    1, '11c-结算标题天使')
rep("            if (this.playerTraitor && this._plantSideAlive() === 0) {\n                this._announce('😈 内鬼屠尽了所有幸存者——邪恶胜利！', 'evillaugh.mp3', true);",
    "            if (this._anyTraitor() && this._plantSideAlive() === 0) {\n                this._announce('😈 内鬼屠尽了所有幸存者——邪恶胜利！', 'evillaugh.mp3', true);",
    1, '11d-内鬼胜利判定')
rep("        if (this.playerTraitor && !zb.isMinion && !zb.isBoss) {",
    "        if (this._anyTraitor() && !zb.isMinion && !zb.isBoss) {",
    1, '11e-内鬼计划失败判定')
rep("        this._gameOverTimer = setTimeout(() => this.gameOver(!this.playerTraitor && !this.isZombieFaction), 3000); // v4.0.65：玩家内鬼时植物赢=内鬼败",
    "        this._gameOverTimer = setTimeout(() => this.gameOver(!this._anyTraitor() && !this.isZombieFaction), 3000); // v4.0.65：玩家内鬼时植物赢=内鬼败",
    1, '11f-复活胜负3000')
rep("                    this._gameOverTimer = setTimeout(() => this.gameOver(!this.playerTraitor && !this.isZombieFaction), 2000); // v4.0.65：玩家内鬼时植物赢=内鬼败",
    "                    this._gameOverTimer = setTimeout(() => this.gameOver(!this._anyTraitor() && !this.isZombieFaction), 2000); // v4.0.65：玩家内鬼时植物赢=内鬼败",
    1, '11g-小怪肃清胜负')
rep("                this._gameOverTimer = setTimeout(() => this.gameOver(!this.playerTraitor && !this.isZombieFaction), 2000); // v4.0.65：玩家内鬼时植物赢=内鬼败",
    "                this._gameOverTimer = setTimeout(() => this.gameOver(!this._anyTraitor() && !this.isZombieFaction), 2000); // v4.0.65：玩家内鬼时植物赢=内鬼败",
    1, '11h-BOSS肃清胜负')
rep("                                    if (this.playerTraitor && pp === this.player) continue;",
    "                                    if (pp.traitor) continue; // v4.0.107：任一人内鬼都免疫自家门板溅射",
    1, '11i-门溅射内鬼免疫')

# ---------- 12. 僵尸（含小怪）不咬同为僵尸的玩家 ----------
rep("            const victims = [...this.ais, this.player, this.player2].filter(v => v && v !== zp);",
    "            const victims = [...this.ais, this.player, this.player2].filter(v => v && v !== zp && !v.isZombie); // v4.0.107：同为僵尸的玩家不互相啃",
    1, '12b-victims排除僵尸玩家')
rep("                if (p.traitor) continue; // v4.0.44/104：僵尸不咬玩家内鬼（P1/P2 通用）",
    "                if (p.traitor) continue; // v4.0.44/104：僵尸不咬玩家内鬼（P1/P2 通用）\n                if (p.isZombie) continue; // v4.0.107：僵尸阵营玩家不被己方僵尸/小怪咬",
    1, '12c-僵尸不咬僵尸玩家')

# ---------- 13. 门口正格不再弹「种不了」的菜单 ----------
rep("""        if (!inRoomGrid && !isDoorTile) isSpikeTile = true;""",
"""        if (!inRoomGrid && !isDoorTile) isSpikeTile = true;
        // v4.0.107：门口正格（门板已无）永久不可重建——原菜单仍给「坚果墙/地刺/土豆地雷」，点了一律被退款并报"大门已被咬毁"
        if (isDoorTile) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '🚪 大门已被咬毁，永久失效，无法重建！', '#ff8a8a');
            this.playSfx('buzzer.mp3', 0.3);
            return;
        }""",
1, '13-门口菜单拦截')

# ---------- 14. 开局 50 阳光 + 出生在最近空房门外 ----------
rep("            x: this.gameMode === '2p' ? cx - 60 : cx, y: cy, sun: 0, spore: 0, hp: 100, maxHp: 100,",
    "            x: this.gameMode === '2p' ? cx - 60 : cx, y: cy, sun: this.isZombieFaction ? 0 : 50, spore: 0, hp: 100, maxHp: 100, // v4.0.107：开局 50 阳光（原 0 阳光+不在房内=第一分钟零收入）",
    1, '14a-初始阳光P1')
rep("                x: cx + 60, y: cy, sun: 0, spore: 0, hp: 100, maxHp: 100,",
    "                x: cx + 60, y: cy, sun: this.isZombieFaction ? 0 : 50, spore: 0, hp: 100, maxHp: 100, // v4.0.107：同 P1",
    1, '14b-初始阳光P2')
rep("        this._ensureSafeSpawn(); // v4.0.16：出生点防墙里（地图生成后校验，此时 walls 才有数据）",
    "        this._ensureSafeSpawn(); // v4.0.16：出生点防墙里（地图生成后校验，此时 walls 才有数据）\n        this._placeHomeSpawn();  // v4.0.107：植物方出生在最近空房门外一格（原出生在地图正中，最近房门 468px）",
    1, '14c-调用落点')

# _placeHomeSpawn 方法：插在 _ensureSafeSpawn 之后
rep("""    _announce(text, sfx, priority = false) {""",
"""    // v4.0.107：植物方开局落点 = 最近空房门外一格。
    // 实测（v4.0.106）：出生点在地图正中，最近房门 468px，玩家原地不动 255 秒阳光只有 12——而阳光只能由房内植物产出。
    _placeHomeSpawn() {
        if (this.isZombieFaction || !this.rooms || this.rooms.length === 0) return;
        const used = [];
        for (const p of this.allPlayers) {
            if (!p || p.dead) continue;
            let best = null, bestD = Infinity;
            for (const rm of this.rooms) {
                if (used.includes(rm)) continue;
                if (rm.owners && rm.owners.length >= (rm.capacity || 1)) continue;
                const d = Math.hypot(rm.frontX - p.x, rm.frontY - p.y);
                if (d < bestD) { bestD = d; best = rm; }
            }
            if (!best) continue;
            used.push(best);
            // 门外一格（门朝上→再上一格，朝下→下一格，朝左/右同理），避开门口那格坚果门板
            const dr = best.tpl.door;
            let cx = best.doorCol, cy = best.doorRow, ox = 0, oy = 0;
            if (dr.r === -1) oy = -1;
            else if (dr.r >= best.h) oy = 1;
            else if (dr.c === -1) ox = -1;
            else if (dr.c >= best.w) ox = 1;
            let sx = (cx + ox) * 80 + 40, sy = (cy + oy) * 80 + 40;
            let guard = 0;
            while (guard++ < 4 && (this.walls.has(`${cx + ox},${cy + oy}`) || this.checkCollision(sx, sy, 14))) {
                ox *= 2; oy *= 2;
                sx = (cx + ox) * 80 + 40; sy = (cy + oy) * 80 + 40;
            }
            if (this.checkCollision(sx, sy, 14)) { sx = best.frontX; sy = best.frontY; }
            p.x = sx; p.y = sy;
            p._homeRoom = best; // 仅用于开局引导；房间归属仍靠种下第一株植物
        }
    }

    _announce(text, sfx, priority = false) {""",
1, '14d-落点方法')

# 开局引导飘字
rep("""        this._updateGhostChip();
        this._refreshHud();""",
"""        this._updateGhostChip();
        this._refreshHud();
        // v4.0.107：开局引导——不进屋就没有任何阳光，原版没有任何提示
        if (!this.isZombieFaction) {
            setTimeout(() => {
                if (this.over || this._destroyed) return;
                for (const p of this.allPlayers) {
                    if (!p || p.dead) continue;
                    this._flyText(p.x, p.y - 64, '🏠 走进房间 · 在床位上种一株植物就开始产阳光', '#ffd54a');
                }
            }, 800);
        }""",
1, '14e-开局引导')

# ---------- 15. _updateSuns：带 dt + 寿命 + 飘字真实数额 ----------
rep("""    _updateSuns() {
        this.suns = this.suns.filter(s => {
            let picker = null;
            if (!this.player.dead && Math.hypot(s.x - this.player.x, s.y - this.player.y) < 55) {
                picker = this.player;
            } else if (this.gameMode === '2p' && this.player2 && !this.player2.dead && Math.hypot(s.x - this.player2.x, s.y - this.player2.y) < 55) {
                picker = this.player2;
            }
            if (picker) {
                s.el.remove();
                this.addSun(25, picker);
                this._flyText(s.x, s.y, '+25 ☀', 'yellow');
                this.playSfx('points.mp3', 0.4);
                return false;
            }
            return true;
        });
    }""",
"""    _updateSuns(dt = 1/60) {
        this.suns = this.suns.filter(s => {
            let picker = null;
            if (!this.player.dead && Math.hypot(s.x - this.player.x, s.y - this.player.y) < 55) {
                picker = this.player;
            } else if (this.gameMode === '2p' && this.player2 && !this.player2.dead && Math.hypot(s.x - this.player2.x, s.y - this.player2.y) < 55) {
                picker = this.player2;
            }
            if (picker) {
                if (s.el) s.el.remove();
                const amt = s.amount || 25;
                this.addSun(amt, picker);
                this._flyText(s.x, s.y, `+${amt} ☀`, 'yellow');
                this.playSfx('points.mp3', 0.4);
                return false;
            }
            // v4.0.107：阳光袋有寿命，22 秒后消失（原 this.suns 从不 push，这段是死代码）
            if (s.life !== undefined) {
                s.life -= dt;
                if (s.life <= 0) { if (s.el) s.el.remove(); return false; }
                if (s.el) {
                    s.el.style.left = s.x + 'px';
                    s.el.style.top = s.y + 'px';
                    s.el.style.opacity = Math.min(1, s.life / 3);
                }
            }
            return true;
        });
    }

    // v4.0.107：僵尸死亡掉落阳光袋（补完原设计：僵尸掉阳光，玩家出房捡）
    _dropSunBag(zb) {
        if (!this.suns) this.suns = [];
        while (this.suns.length >= 12) {
            const old = this.suns.shift();
            if (old && old.el) old.el.remove();
        }
        const amount = zb.isBoss ? 100 : (zb.isMinion ? 15 : 25);
        const el = document.createElement('div');
        el.className = 'entity';
        el.style.cssText = `width:46px;height:46px;z-index:120;pointer-events:none;left:${zb.x}px;top:${zb.y}px;`;
        el.innerHTML = `<div style="font-size:38px;line-height:46px;text-align:center;filter:drop-shadow(0 0 8px #ffd54a);">☀️</div>`;
        if (this.world1) this.world1.appendChild(el);
        this.suns.push({ x: zb.x, y: zb.y, amount, el, life: 22 });
        this._flyText(zb.x, zb.y - 22, `☀ 阳光袋 +${amount}`, '#ffd54a');
    }""",
1, '15-阳光袋系统')

rep("        this._updateSuns();", "        this._updateSuns(dt);", 1, '15b-传入dt')

io.open(P, 'w', encoding='utf-8').write(src)
print('✅ 全部替换成功：%d 项' % len(subs))
for s in subs: print('   -', s)
