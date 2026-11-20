#!/usr/bin/env python3
# v4.0.104 补丁 1/2：形态字段逐玩家化（P1/P2 各自天使/内鬼）+ 死亡按键抉择 + 技能参数化
import io, sys
P = 'js/HauntedDorm.js'
src = open(P, encoding='utf-8').read()
edits = []
def rep(old, new, desc):
    edits.append((old, new, desc))

# ---------- R1 形态字段：挂到玩家对象 + P1 兼容访问器 ----------
rep(
"""        // v4.0.44：单人死亡抉择——天使 / 内鬼 二选一
        this.playerAngelic = false;   // 天使形态：光环、无房、N捕获/M加速、一条命
        this.playerTraitor = false;   // 内鬼形态：僵尸血量、挠人机门、团灭幸存者
        this.fateOpen = false;        // 抉择弹窗打开中（全场冻结）
        this._fateShown = false;""",
"""        // v4.0.104：天使/内鬼形态改为「逐玩家」——P1/P2 各自独立（双人协作两人都可能倒下）
        // 形态字段挂在玩家对象上（p.angelic / p.traitor / p.merit / p.corrupt / p.pendingFate）；
        // 这里把旧的全局字段 playerAngelic/playerTraitor/playerMerit/playerCorrupt 保留为 P1 的访问器，
        // 30+ 处既有单人逻辑零改动继续正确工作
        {
            const bind = (key, field, dflt) => Object.defineProperty(this, key, {
                get: () => (this.player ? (this.player[field] === undefined ? dflt : this.player[field]) : dflt),
                set: v => { if (this.player) this.player[field] = v; },
                configurable: true
            });
            bind('playerAngelic', 'angelic', false);
            bind('playerTraitor', 'traitor', false);
            bind('playerMerit', 'merit', 0);
            bind('playerCorrupt', 'corrupt', 0);
        }
        this.fateOpen = false;        // 抉择弹窗打开中（全场冻结）
        this._fateShown = false;""",
'R1 形态字段访问器')

# ---------- R2 玩家对象初始化新字段 ----------
rep(
"""            nutHealCd: 0 // v4.0.48：坚果门板修复 CD（60s，回 25% 总血）
        };""",
"""            nutHealCd: 0, // v4.0.48：坚果门板修复 CD（60s，回 25% 总血）
            // v4.0.104：形态字段（逐玩家）
            angelic: false, traitor: false, pendingFate: false, merit: 0, corrupt: 0
        };""",
'R2 P1 形态字段')

rep(
"""                nutHealCd: 0
            };
            this.allPlayers = [this.player, this.player2];""",
"""                nutHealCd: 0,
                // v4.0.104：形态字段（逐玩家）
                angelic: false, traitor: false, pendingFate: false, merit: 0, corrupt: 0
            };
            this.allPlayers = [this.player, this.player2];""",
'R2 P2 形态字段')

# ---------- R3 挂机托管排除形态化 / 待选玩家 ----------
rep(
"""            if (p === this.player && (this.playerAngelic || this.playerTraitor)) continue; // 天使/内鬼玩法不托管""",
"""            if (p.angelic || p.traitor || p.pendingFate) continue; // v4.0.104：天使/内鬼/待选形态不托管（P1/P2 通用）""",
'R3 托管排除形态')

# ---------- R4 P1 死亡分流：2p 进入按键抉择 ----------
rep(
"""        // v4.0.86：只剩自己存活时不再抉择——人机已全灭=孤家寡人，无人可变天使帮忙/内鬼袭击，直接失败结算
        if (this.gameMode !== '2p' && !this.isZombieFaction && !this.playerAngelic && !this.playerTraitor && !this.over) {""",
"""        // v4.0.104：双人协作——P1 第一次倒下不判死，进入按键抉择等待（N=天使 / M=内鬼）
        if (this.gameMode === '2p' && !this.isZombieFaction && !this.player.angelic && !this.player.traitor && !this.over) {
            this.player.pendingFate = true;
            this._announce('💀 P1 倒下了——按 【N】 化作天使 / 按 【M】 化作内鬼（不按则保持阵亡）', 'scream.mp3', true);
            this._refreshHud();
            return;
        }
        // v4.0.86：只剩自己存活时不再抉择——人机已全灭=孤家寡人，无人可变天使帮忙/内鬼袭击，直接失败结算
        if (this.gameMode !== '2p' && !this.isZombieFaction && !this.playerAngelic && !this.playerTraitor && !this.over) {""",
'R4 P1 2p 死亡抉择')

# ---------- R5 P2 死亡分流 ----------
rep(
"""        } else if (p === this.player2) {
            p.dead = true;
            p.el1.classList.add('dead-slash');
            p.el1.style.filter = 'grayscale(1)';
            p.vx = 0; p.vy = 0;
            if (this._humansAll().every(q => q.dead)) {
                this.gameOver(false);
            } else {
                this._announce('💔 P2 倒下了！P1 继续战斗！', 'scream.mp3', true);
            }
        } else {""",
"""        } else if (p === this.player2) {
            p.dead = true;
            p.el1.classList.add('dead-slash');
            p.el1.style.filter = 'grayscale(1)';
            p.vx = 0; p.vy = 0;
            // v4.0.104：P2 第一次倒下 → 按键抉择（1=天使 / 2=内鬼）；已是形态/已出局则按原规则
            if (!p.angelic && !p.traitor && !this.over) {
                if (p.angelHalo) { p.angelHalo.remove(); p.angelHalo = null; }
                p.pendingFate = true;
                this._announce('💀 P2 倒下了——按 【1】 化作天使 / 按 【2】 化作内鬼（不按则保持阵亡）', 'scream.mp3', true);
                this._refreshHud();
                return;
            }
            if (p.angelic) this._announce('😇 P2 的天使陨落！', 'scream.mp3', true);
            if (!this._checkHumansOut()) {
                this._announce('💔 P2 倒下了！P1 继续战斗！', 'scream.mp3', true);
            }
        } else {""",
'R5 P2 死亡抉择')

# ---------- R6 天使/内鬼死亡后的结算改通用 ----------
rep(
"""        if (this.playerAngelic) this._announce('😇 天使陨落！你被僵尸抓住了…', 'scream.mp3', true);
        if (this._humansAll().every(q => q.dead)) {
            this.gameOver(false);
        } else {
            this._announce('💀 P1 倒下了！P2 继续战斗！', 'scream.mp3', true);
        }
    }""",
"""        if (this.player.angelic) this._announce('😇 天使陨落！你被僵尸抓住了…', 'scream.mp3', true);
        if (!this._checkHumansOut()) {
            this._announce('💀 P1 倒下了！P2 继续战斗！', 'scream.mp3', true);
        }
    }

    // v4.0.104：双人结局判定——真人全部阵亡且无人在等待形态选择才算失败
    _checkHumansOut() {
        const hs = this._humansAll();
        if (hs.some(q => !q.dead)) return false;      // 还有人活着
        if (hs.some(q => q.pendingFate)) return false; // 有人在等按键抉择
        this.gameOver(false);
        return true;
    }""",
'R6 死亡结算通用化')

# ---------- R7 变身：参数化 who ----------
rep(
"""    _becomeAngel(ov) {
        ov.remove();
        this.fateOpen = false;
        this.keys = {}; this.keysJustPressed = {};
        const p = this.player;
        this.playerAngelic = true;""",
"""    _becomeAngel(ov, who = 'p1') {
        if (ov) ov.remove();
        this.fateOpen = false;
        this.keys = {}; this.keysJustPressed = {};
        const p = who === 'p2' ? this.player2 : this.player;
        p.angelic = true; p.pendingFate = false; p.traitor = false;""",
'R7a 天使变身参数化头')

rep(
"""        // v4.0.60：天使不再是"存活者"——关闭当前祝福并停止 90 秒存活奖励计时
        this.playerMerit = 0; // v4.0.60：功德值（捕获僵尸成长，越救越强）
        if (this.blessing) { this.blessing = null; if (this.blessEl) this.blessEl.style.display = 'none'; }
        this.blessingAt = Infinity;
        // v4.0.49：天使无房间——直接显示 P1 控制框（技能面板 M/N 键提示可见）
        {
            const p1hud = document.getElementById('hud-p1');
            if (p1hud) { p1hud.style.display = 'flex'; p1hud.style.flexDirection = 'column'; p1hud.style.left = '20px'; p1hud.style.right = 'auto'; }
        }""",
"""        // v4.0.60：天使不再是"存活者"——关闭当前祝福并停止 90 秒存活奖励计时
        p.merit = 0; // v4.0.60：功德值（捕获僵尸成长，越救越强）
        if (who === 'p1') { // v4.0.104：祝福是 P1 主导的全局面板，P2 变天使不影响 P1 的祝福
            if (this.blessing) { this.blessing = null; if (this.blessEl) this.blessEl.style.display = 'none'; }
            this.blessingAt = Infinity;
        }
        // v4.0.49：天使无房间——直接显示 P1 控制框（技能面板 M/N 键提示可见）
        if (who === 'p1') {
            const p1hud = document.getElementById('hud-p1');
            if (p1hud) { p1hud.style.display = 'flex'; p1hud.style.flexDirection = 'column'; p1hud.style.left = '20px'; p1hud.style.right = 'auto'; }
        }""",
'R7b 天使变身祝福/HUD 分流')

rep(
"""        p.el1.style.filter = 'drop-shadow(0 0 14px #ffd700)';
        const halo = document.createElement('div');
        halo.className = 'angel-halo'; // 头顶光环
        p.el1.appendChild(halo);
        const nameEl = p.el1.querySelector('div[style*="top:-35px"]');
        if (nameEl) { nameEl.innerText = '你 (天使)'; nameEl.style.color = '#ffd700'; }
        // HUD：阳光/孢子/伤害 → 天使状态条（技能显示走 #skill-hud）
        const statsRow = document.querySelector('#hud-p1 > div:nth-child(2)');
        if (statsRow) statsRow.innerHTML = '<span style="color:#ffd700;">😇 天使形态</span><span style="color:#aaaaaa; font-size:13px;">无房 · 不可建造 · 只有一条命</span><span style="color:#7fd8ff; font-size:13px;">功德:0（捕获僵尸成长）</span>';
        this.setHp();
        this._refreshHud();
        // v4.0.65：变天使瞬间人机已全灭 → 没人可帮，立即失败结算（否则挂起）
        if (this.ais.every(a => a.dead)) {
            this.gameOver(false);
            return;
        }
        this._announce('😇 你化作天使！【N】捕获定住僵尸、【M】加速逃离追杀——帮人机活到胜利！小心：你只有一条命！', 'points.mp3', true);""",
"""        p.el1.style.filter = 'drop-shadow(0 0 14px #ffd700)';
        const halo = document.createElement('div');
        halo.className = 'angel-halo'; // 头顶光环
        p.el1.appendChild(halo);
        p.angelHalo = halo;
        const nameEl = p.el1.querySelector('div[style*="top:-35px"]');
        if (nameEl) { nameEl.innerText = (who === 'p2' ? 'P2' : '你') + ' (天使)'; nameEl.style.color = '#ffd700'; }
        // HUD：阳光/孢子/伤害 → 天使状态条（技能显示走 #skill-hud / P2 走 #skill-hud2）
        if (who === 'p1') {
            const statsRow = document.querySelector('#hud-p1 > div:nth-child(2)');
            if (statsRow) statsRow.innerHTML = '<span style="color:#ffd700;">😇 天使形态</span><span style="color:#aaaaaa; font-size:13px;">无房 · 不可建造 · 只有一条命</span><span style="color:#7fd8ff; font-size:13px;">功德:0（捕获僵尸成长）</span>';
        }
        this.setHp();
        this._refreshHud();
        // v4.0.65：变天使瞬间人机已全灭 → 没人可帮，立即失败结算（否则挂起）
        if (this._plantSideAlive() === 0) {
            this.gameOver(false);
            return;
        }
        this._announce(who === 'p2'
            ? '😇 P2 化作天使！【1】捕获定住僵尸、【2】加速逃离追杀——小心：只有一条命！'
            : '😇 你化作天使！【N】捕获定住僵尸、【M】加速逃离追杀——帮人机活到胜利！小心：你只有一条命！', 'points.mp3', true);""",
'R7c 天使变身 P2 支持')

rep(
"""    _becomeTraitor(ov) {
        ov.remove();
        this.fateOpen = false;
        this.keys = {}; this.keysJustPressed = {};
        const p = this.player;
        this.playerTraitor = true;""",
"""    _becomeTraitor(ov, who = 'p1') {
        if (ov) ov.remove();
        this.fateOpen = false;
        this.keys = {}; this.keysJustPressed = {};
        const p = who === 'p2' ? this.player2 : this.player;
        p.traitor = true; p.pendingFate = false; p.angelic = false;""",
'R7d 内鬼变身参数化头')

rep(
"""        // v4.0.60：内鬼不再是"存活者"——关闭当前祝福并停止 90 秒存活奖励计时
        this.playerCorrupt = 0; // v4.0.60：堕落值（拆门/啃掉植物成长，越拆越凶）
        if (this.blessing) { this.blessing = null; if (this.blessEl) this.blessEl.style.display = 'none'; }
        this.blessingAt = Infinity;""",
"""        // v4.0.60：内鬼不再是"存活者"——关闭当前祝福并停止 90 秒存活奖励计时
        p.corrupt = 0; // v4.0.60：堕落值（拆门/啃掉植物成长，越拆越凶）
        if (who === 'p1') { // v4.0.104：祝福是 P1 主导的全局面板，P2 变内鬼不影响 P1 的祝福
            if (this.blessing) { this.blessing = null; if (this.blessEl) this.blessEl.style.display = 'none'; }
            this.blessingAt = Infinity;
        }""",
'R7e 内鬼祝福分流')

rep(
"""        const nameEl = p.el1.querySelector('div[style*="top:-35px"]');
        if (nameEl) { nameEl.innerText = '你 (内鬼)'; nameEl.style.color = '#ff5252'; }
        const p1Ctl = document.querySelector('#hud-p1 > div');
        if (p1Ctl) p1Ctl.innerHTML = '<div>【内鬼 控制】移动: W/A/S/D ｜ 靠近门/植物自动慢咬 ｜ 靠近幸存者啃咬</div><div>血量=当前僵尸血量 ｜ 堕落值:0（每拆掉一株植物+1：伤害+25%、血量+10%）｜ 团灭所有幸存者即胜利 ｜ 主僵尸被消灭=失败</div>';
        this.setHp();""",
"""        const nameEl = p.el1.querySelector('div[style*="top:-35px"]');
        if (nameEl) { nameEl.innerText = (who === 'p2' ? 'P2' : '你') + ' (内鬼)'; nameEl.style.color = '#ff5252'; }
        if (who === 'p1') {
            const p1Ctl = document.querySelector('#hud-p1 > div');
            if (p1Ctl) p1Ctl.innerHTML = '<div>【内鬼 控制】移动: W/A/S/D ｜ 靠近门/植物自动慢咬 ｜ 靠近幸存者啃咬</div><div>血量=当前僵尸血量 ｜ 堕落值:0（每拆掉一株植物+1：伤害+25%、血量+10%）｜ 团灭所有幸存者即胜利 ｜ 主僵尸被消灭=失败</div>';
        }
        this.setHp();
        this._refreshHud();""",
'R7f 内鬼 HUD 分流')

rep(
"""        this._announce('😈 你化身内鬼！去挠开人机的门，咬杀所有幸存者——主僵尸被消灭则计划失败！', 'evillaugh.mp3', true);
    }""",
"""        this._announce(who === 'p2'
            ? '😈 P2 化身内鬼！去挠开人机的门，咬杀所有幸存者——主僵尸被消灭则计划失败！'
            : '😈 你化身内鬼！去挠开人机的门，咬杀所有幸存者——主僵尸被消灭则计划失败！', 'evillaugh.mp3', true);
    }

    // v4.0.104：2p 双人形态选择键——P1 死后 N=天使 / M=内鬼；P2 死后 1=天使 / 2=内鬼
    // P2 变天使后 1=捕获、2=加速（活着的普通 P2 这两键仍是建造菜单主键，不受影响）
    _fateKeydown(e) {
        const key = e.key ? e.key.toLowerCase() : '';
        const code = e.code || '';
        const is1 = key === '1' || code === 'Digit1' || code === 'Numpad1';
        const is2 = key === '2' || code === 'Digit2' || code === 'Numpad2';
        const isN = key === 'n' || code === 'KeyN';
        const isM = key === 'm' || code === 'KeyM';
        if (this.player && this.player.pendingFate) {
            if (isN) { this._becomeAngel(null, 'p1'); return true; }
            if (isM) { this._becomeTraitor(null, 'p1'); return true; }
        }
        if (this.player2 && this.player2.pendingFate) {
            if (is1) { this._becomeAngel(null, 'p2'); return true; }
            if (is2) { this._becomeTraitor(null, 'p2'); return true; }
        }
        // P2 天使技能（1=捕获 / 2=加速）
        if (this.player2 && this.player2.angelic && !this.player2.dead) {
            if (is1) { if ((this.player2.capCd || 0) <= 0) this._angelCapture(this.player2); return true; }
            if (is2) { if ((this.player2.spdCd || 0) <= 0) this._angelSpeed(this.player2); return true; }
        }
        return false;
    }""",
'R7g 内鬼播报 + _fateKeydown')

# ---------- R8 技能参数化 ----------
rep(
"""    _angelCapture() {
        const p = this.player;""",
"""    _angelCapture(pl) {
        const p = pl || this.player;""",
'R8a 捕获参数化')

rep(
"""        best.stunT = 3;
        best.capturedT = this.playerMerit >= 6 ? 5 : 3; // v4.0.60：功德 6 → 定身 3s→5s""",
"""        best.stunT = 3;
        best.capturedT = (p.merit || 0) >= 6 ? 5 : 3; // v4.0.60：功德 6 → 定身 3s→5s（v4.0.104 逐玩家）""",
'R8b 捕获功德参数化')

rep(
"""        p.capCd = 20; // v4.0.99：冷却固定 20s（删功德 3 档位）
        this._gainMerit(); // v4.0.60：每次成功捕获 +1 功德""",
"""        p.capCd = 20; // v4.0.99：冷却固定 20s（删功德 3 档位）
        this._gainMerit(p); // v4.0.60：每次成功捕获 +1 功德（v4.0.104 逐玩家）""",
'R8c 捕获加功德参数化')

rep(
"""    _angelSpeed() {
        const p = this.player;
        p.speedBuffT = 6; // 复用全局疾跑通道（移速 800）""",
"""    _angelSpeed(pl) {
        const p = pl || this.player;
        p.speedBuffT = 6; // 复用全局疾跑通道（移速 800）""",
'R8d 加速参数化')

rep(
"""    _gainCorrupt() {
        this.playerCorrupt = (this.playerCorrupt || 0) + 1;
        const c = this.playerCorrupt;
        const p = this.player;""",
"""    _gainCorrupt(pl) {
        const p = pl || this.player;
        p.corrupt = (p.corrupt || 0) + 1;
        const c = p.corrupt;""",
'R8e 堕落值参数化')

rep(
"""        this.setHp();
        this._refreshHud();
        const p1Ctl = document.querySelector('#hud-p1 > div');
        if (p1Ctl && this.playerTraitor) {
            p1Ctl.innerHTML = `<div>【内鬼 控制】移动: W/A/S/D ｜ 靠近门/植物自动慢咬 ｜ 靠近幸存者啃咬</div><div>血量=${p.maxHp} ｜ 堕落值:${c}/6（伤害+${25 * Math.min(6, c)}%）｜ 团灭所有幸存者即胜利 ｜ 主僵尸被消灭=失败</div>`;
        }
    }""",
"""        this.setHp();
        this._refreshHud();
        if (p === this.player) { // v4.0.104：HUD 只更新本人那侧（P2 走 skill-hud2）
            const p1Ctl = document.querySelector('#hud-p1 > div');
            if (p1Ctl && p.traitor) {
                p1Ctl.innerHTML = `<div>【内鬼 控制】移动: W/A/S/D ｜ 靠近门/植物自动慢咬 ｜ 靠近幸存者啃咬</div><div>血量=${p.maxHp} ｜ 堕落值:${c}/6（伤害+${25 * Math.min(6, c)}%）｜ 团灭所有幸存者即胜利 ｜ 主僵尸被消灭=失败</div>`;
            }
        }
    }""",
'R8f 堕落值 HUD 分流')

rep(
"""    _gainMerit() {
        this.playerMerit = (this.playerMerit || 0) + 1;
        const m = this.playerMerit;
        const bonus = m >= 6 ? '捕获定身升至5秒！' : '';
        this._flyText(this.player.x, this.player.y - 30, `⭐ 功德 +1（${m}/6）${bonus}`, '#ffd700');
        this.playSfx('points.mp3', 0.35);
        this._refreshHud();
        const statsRow = document.querySelector('#hud-p1 > div:nth-child(2)');
        if (statsRow && this.playerAngelic) {
            statsRow.innerHTML = `<span style="color:#ffd700;">😇 天使形态</span><span style="color:#aaaaaa; font-size:13px;">无房 · 不可建造 · 只有一条命</span><span style="color:#7fd8ff; font-size:13px;">功德:${m}/6（捕获僵尸成长）</span>`;
        }
    }""",
"""    _gainMerit(pl) {
        const p = pl || this.player;
        p.merit = (p.merit || 0) + 1;
        const m = p.merit;
        const bonus = m >= 6 ? '捕获定身升至5秒！' : '';
        this._flyText(p.x, p.y - 30, `⭐ 功德 +1（${m}/6）${bonus}`, '#ffd700');
        this.playSfx('points.mp3', 0.35);
        this._refreshHud();
        if (p === this.player) { // v4.0.104：HUD 只更新本人那侧
            const statsRow = document.querySelector('#hud-p1 > div:nth-child(2)');
            if (statsRow && p.angelic) {
                statsRow.innerHTML = `<span style="color:#ffd700;">😇 天使形态</span><span style="color:#aaaaaa; font-size:13px;">无房 · 不可建造 · 只有一条命</span><span style="color:#7fd8ff; font-size:13px;">功德:${m}/6（捕获僵尸成长）</span>`;
            }
        }
    }""",
'R8g 功德参数化')

# ---------- R9 键位接入 ----------
rep(
"""            if ((key === 'm' || e.code === 'KeyM') && !e.repeat && this.player && !this.player.dead) {
                // v4.0.44：天使形态 M=加速；内鬼/普通形态 M=角色技能
                if (this.playerAngelic) {""",
"""            // v4.0.104：2p 双人形态系统——死亡按键抉择 / P2 天使技能 先于一切处理（吃掉后续键位）
            if (this.gameMode === '2p' && !e.repeat && !this.over && this._fateKeydown(e)) return;
            if ((key === 'm' || e.code === 'KeyM') && !e.repeat && this.player && !this.player.dead) {
                // v4.0.44：天使形态 M=加速；内鬼/普通形态 M=角色技能
                if (this.player.angelic) {""",
'R9a 键位拦截')

rep(
"""            if ((key === 'n' || e.code === 'KeyN') && !e.repeat && this.player && !this.player.dead) {
                if (this.playerAngelic) {""",
"""            if ((key === 'n' || e.code === 'KeyN') && !e.repeat && this.player && !this.player.dead) {
                if (this.player.angelic) {""",
'R9b N 键天使判定')

rep(
"""            if ((key === '+' || e.code === 'NumpadAdd') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.player2.dead && !this.isZombieFaction) {
                this._healDoor(this.player2);
            }""",
"""            if ((key === '+' || e.code === 'NumpadAdd') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.player2.dead && !this.isZombieFaction && !this.player2.angelic && !this.player2.traitor) {
                this._healDoor(this.player2);
            }""",
'R9c P2 修门禁形态')

rep(
"""            if ((key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.isZombieFaction) {
                this.setWatering(this.player2, !this.player2.waterOn);
            }""",
"""            if ((key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.isZombieFaction && !this.player2.angelic && !this.player2.traitor) {
                this.setWatering(this.player2, !this.player2.waterOn);
            }""",
'R9d P2 浇水禁形态')

rep(
"""            if ((key === '/' || key === '3' || key === 'pagedown' || e.code === 'Slash' || e.code === 'Digit3' || e.code === 'Numpad3' || e.code === 'PageDown') && !e.repeat && this.gameMode === '2p' && this.player2 && this.player2.skillCd <= 0) {""",
"""            if ((key === '/' || key === '3' || key === 'pagedown' || e.code === 'Slash' || e.code === 'Digit3' || e.code === 'Numpad3' || e.code === 'PageDown') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.player2.angelic && !this.player2.traitor && this.player2.skillCd <= 0) {""",
'R9e P2 技能禁形态')

# ---------- R10 P2 建造菜单 / 修门 / 倭瓜 禁形态 ----------
rep(
"""        if (this.gameMode === '2p' && this.player2 && !this.player2.dead) {
            // v4.0.16：P2 主键改数字位 1确认/2取消（0浇水/3技能）""",
"""        if (this.gameMode === '2p' && this.player2 && !this.player2.dead && !this.player2.angelic && !this.player2.traitor) {
            // v4.0.16：P2 主键改数字位 1确认/2取消（0浇水/3技能）""",
'R10a P2 建造菜单禁形态')

rep(
"""            if ((key === '5' || e.code === 'Digit5' || e.code === 'Numpad5') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.player2.dead) {""",
"""            if ((key === '5' || e.code === 'Digit5' || e.code === 'Numpad5') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.player2.dead && !this.player2.angelic && !this.player2.traitor) {""",
'R10b P2 倭瓜禁形态')

# ---------- R11 _healDoor / _squashSkill 按玩家判形态 ----------
rep(
"""    _healDoor(p) {
        if (p.dead || this.isZombieFaction || this.playerAngelic || this.playerTraitor) return;""",
"""    _healDoor(p) {
        if (p.dead || this.isZombieFaction || p.angelic || p.traitor) return; // v4.0.104：逐玩家判形态""",
'R11a 修门逐玩家')

rep(
"""    _squashSkill(p) {
        if (!p || p.dead || this.isZombieFaction || this.playerAngelic || this.playerTraitor) return;""",
"""    _squashSkill(p) {
        if (!p || p.dead || this.isZombieFaction || p.angelic || p.traitor) return; // v4.0.104：逐玩家判形态""",
'R11b 倭瓜逐玩家')

# ---------- R12 走进空房认领：两人都禁形态 ----------
rep(
"""            if (p === this.player && (this.playerAngelic || this.playerTraitor)) continue; // v4.0.44：天使没有房间；内鬼也不再认领""",
"""            if (p.angelic || p.traitor) continue; // v4.0.44/104：天使没有房间；内鬼也不再认领（P1/P2 通用）""",
'R12 认领禁形态')

# ---------- R13 僵尸索敌：内鬼通用 ----------
rep(
"""            if (this.playerTraitor && p === this.player) continue; // v4.0.44：玩家也是内鬼——内鬼不咬内鬼
            if (!p.isAi) { human = p; break; }""",
"""            if (p.traitor) continue; // v4.0.44/104：玩家内鬼是僵尸方——内鬼不咬内鬼
            if (!p.isAi) { human = p; break; }""",
'R13a 索敌真人优先排内鬼')

rep(
"""                if (this.playerTraitor && p === this.player) continue;
                const d = Math.hypot(p.x - t.x, p.y - t.y);""",
"""                if (p.traitor) continue;
                const d = Math.hypot(p.x - t.x, p.y - t.y);""",
'R13b 索敌最近排内鬼')

rep(
"""                !(this.playerTraitor && pp === this.player) &&""",
"""                !pp.traitor &&""",
'R13c 户外优先排内鬼')

rep(
"""                    if (this.playerTraitor && p === this.player) continue; // v4.0.44：玩家内鬼=僵尸方""",
"""                    if (p.traitor) continue; // v4.0.44/104：玩家内鬼=僵尸方""",
'R13d 仇恨评分排内鬼')

rep(
"""                if (this.playerTraitor && p === this.player) continue; // v4.0.44：僵尸不咬玩家内鬼""",
"""                if (p.traitor) continue; // v4.0.44/104：僵尸不咬玩家内鬼（P1/P2 通用）""",
'R13e 接触伤害排内鬼')

# ---------- R14 植物索敌内鬼：两人 ----------
rep(
"""        if (!this.isZombieFaction && this.playerTraitor && this.player && !this.player.dead) targets.push(this.player);""",
"""        if (!this.isZombieFaction) { // v4.0.104：P1/P2 任一内鬼都是植物攻击目标
            for (const tp of this.allPlayers) { if (tp && tp.traitor && !tp.dead) targets.push(tp); }
        }""",
'R14 植物索敌内鬼泛化')

# ---------- R15 _refreshHud：P2 技能栏支持天使/内鬼 ----------
rep(
"""            const skillEl2 = document.getElementById('skill-hud2');
            if (skillEl2 && this.player2.roleDef) {""",
"""            const skillEl2 = document.getElementById('skill-hud2');
            if (skillEl2 && this.player2.angelic) {
                // v4.0.104：P2 天使双技能面板（1=捕获 / 2=加速）
                const capSec2 = (this.player2.merit || 0) >= 6 ? 5 : 3;
                const cap2 = (this.player2.capCd || 0) > 0
                    ? `<span style="color:#777777;"><s>【1】捕获</s> (CD:${Math.ceil(this.player2.capCd)}s)</span>`
                    : `<span style="color:#7fd8ff;">【1】捕获</span> <span style="color:#aaaaaa;">(定身${capSec2}秒)</span>`;
                const spd2 = (this.player2.spdCd || 0) > 0
                    ? `<span style="color:#777777;"><s>【2】加速</s> (CD:${Math.ceil(this.player2.spdCd)}s)</span>`
                    : `<span style="color:#ffd700;">【2】加速</span> <span style="color:#aaaaaa;">(6秒疾跑)</span>`;
                skillEl2.innerHTML = `😇 ${cap2} ｜ ${spd2} <span style="color:#ffd54a; font-size:12px;">｜ ⭐功德 ${this.player2.merit || 0}/6</span>`;
            } else if (skillEl2 && this.player2.traitor) {
                skillEl2.innerHTML = `<span style="color:#ff5252;">😈 内鬼</span> <span style="color:#aaaaaa;">堕落值 ${this.player2.corrupt || 0}/6（伤害+${25 * Math.min(6, this.player2.corrupt || 0)}%）</span>`;
            } else if (skillEl2 && this.player2.roleDef) {""",
'R15 P2 技能栏形态显示')

# ---------- R16 挂机托管：归还时清 pendingFate ----------
rep(
"""                p.targetRoom = null; p.targetDrop = null; // v4.0.103：清掉托管期间的寻路目标，归还即从脚下重新开始""",
"""                p.targetRoom = null; p.targetDrop = null; // v4.0.103：清掉托管期间的寻路目标，归还即从脚下重新开始
                // v4.0.104：形态字段不受托管影响""",
'R16 归还备注')

# 执行
for old, new, desc in edits:
    n = src.count(old)
    if n != 1:
        print(f'FAIL [{desc}] count={n}')
        sys.exit(1)
    src = src.replace(old, new)
open(P, 'w', encoding='utf-8').write(src)
print(f'PATCH1 OK: {len(edits)} edits')
