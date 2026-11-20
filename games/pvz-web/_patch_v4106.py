# -*- coding: utf-8 -*-
"""v4.0.106：守屋大作战 P 键绝对暂停。全部替换带 assert(count==1)，任何一处不匹配=零写入。"""
import io

P = 'js/HauntedDorm.js'
src = io.open(P, encoding='utf-8').read()
pairs = []

# 1) 构造函数：暂停状态
pairs.append((
"""        this.over = false;
        this.lastFlashAt = 0;""",
"""        this.over = false;
        this.lastFlashAt = 0;
        // v4.0.106：P 键绝对暂停（全场零模拟，只留观察）
        this.paused = false;
        this._pauseAt = 0;
        this._pendingGameOver = null;"""))

# 2) loop：暂停分支——gameTime 不推进、不调 _tick、不渲染（画面本来就静止）
pairs.append((
"""        if (this.fateOpen) { // v4.0.44：死亡抉择弹窗期间全场冻结（只保留渲染）
            this._animId = requestAnimationFrame(t => this.loop(t));
            return;
        }""",
"""        if (this.paused) {
            // v4.0.106：绝对暂停——gameTime 不推进、_tick 不执行 → 阳光产出/植物射击/僵尸行动与啃咬/
            // 人机 AI/祝福倒计时/挂机托管判定 全部原地冻结；按键缓存每帧清空，恢复后不会"补放"暂停期间的按键
            this.keysJustPressed = {};
            this._animId = requestAnimationFrame(t => this.loop(t));
            return;
        }
        if (this.fateOpen) { // v4.0.44：死亡抉择弹窗期间全场冻结（只保留渲染）
            this._animId = requestAnimationFrame(t => this.loop(t));
            return;
        }"""))

# 3) _togglePause + 遮罩（插在 loop 前）
pairs.append((
"""    loop(time) {
        if (this.over || this._destroyed) return;""",
"""    // ===== v4.0.106：P 键绝对暂停（用户：按下 P 即可暂停，阳光/植物攻击/僵尸攻击都不变化，种植也无效）=====
    _togglePause() {
        if (this.over || this._destroyed) return;
        this.paused = !this.paused;
        if (this.paused) {
            this._pauseAt = performance.now();
            this.keys = {};              // 暂停前按住的移动键不保留
            this.keysJustPressed = {};
            this._showPauseOverlay();
            this.playSfx('buttonclick.mp3', 0.3);
        } else {
            // 恢复：挂机托管的计时基准整体后移暂停时长（否则暂停 10 秒以上会被误判为挂机）
            const d = performance.now() - (this._pauseAt || performance.now());
            for (const p of [this.player, this.player2]) {
                if (p && p._lastInputAt !== undefined) p._lastInputAt += d;
            }
            this.lastTime = 0;           // 下一帧 dt 归零，防恢复瞬间大跳
            this._hidePauseOverlay();
            // 暂停期间本该结算的胜负，恢复后补一次
            if (this._pendingGameOver !== null && this._pendingGameOver !== undefined) {
                const win = this._pendingGameOver;
                this._pendingGameOver = null;
                if (this._gameOverTimer) clearTimeout(this._gameOverTimer);
                this._gameOverTimer = setTimeout(() => this.gameOver(win), 400);
            }
        }
    }

    _showPauseOverlay() {
        if (!this._pauseEl) {
            const el = document.createElement('div');
            el.id = 'dorm-pause';
            // pointer-events:auto → 连鼠标点击也一并拦住（种植/升级/拆除/祝福点选全部无效）
            el.style.cssText = 'position:fixed; inset:0; z-index:9600; display:flex; align-items:center; justify-content:center;'
                + ' background:rgba(4,8,14,0.62); pointer-events:auto; font-family:"Kaiti SC","STKaiti",serif;';
            el.innerHTML = '<div style="text-align:center; color:#f5e6c8; text-shadow:2px 2px 0 #000;">'
                + '<div style="font-size:62px; font-weight:bold; letter-spacing:14px; color:#ffe14a;">⏸ 暂 停</div>'
                + '<div style="margin-top:16px; font-size:19px; letter-spacing:2px; color:#e8dcc0;">阳光、植物攻击、僵尸行动全部冻结 · 无法种植</div>'
                + '<div style="margin-top:12px; font-size:18px; letter-spacing:3px; color:#9fd8ff;">按 P 键继续</div>'
                + '</div>';
            document.body.appendChild(el);
            this._pauseEl = el;
        }
        this._pauseEl.style.display = 'flex';
    }

    _hidePauseOverlay() {
        if (this._pauseEl) this._pauseEl.style.display = 'none';
    }

    loop(time) {
        if (this.over || this._destroyed) return;"""))

# 4) 键位：P 暂停/继续；暂停期间屏蔽其余所有按键
pairs.append((
"""            // v4.0.104：2p 双人形态系统——死亡按键抉择 / P2 天使技能 先于一切处理（吃掉后续键位）
            if (this.gameMode === '2p' && !e.repeat && !this.over && this._fateKeydown(e)) return;""",
"""            // v4.0.106：P 键暂停/继续（全场唯一的可用键）
            if ((key === 'p' || e.code === 'KeyP') && !e.repeat) {
                if (!this.over) this._togglePause();
                e.preventDefault();
                return;
            }
            if (this.paused) return; // 暂停期间其余按键一律无效（移动/技能/修门/建造/浇水）
            // v4.0.104：2p 双人形态系统——死亡按键抉择 / P2 天使技能 先于一切处理（吃掉后续键位）
            if (this.gameMode === '2p' && !e.repeat && !this.over && this._fateKeydown(e)) return;"""))

# 5) 鼠标：暂停时点地面/点植物无效
pairs.append((
"""        this._onVp1MouseDown = e => {
            if (this.gameMode === '2p') return; // 双人模式禁用鼠标操作""",
"""        this._onVp1MouseDown = e => {
            if (this.paused) return; // v4.0.106：暂停期间种植/升级/拆除全部无效
            if (this.gameMode === '2p') return; // 双人模式禁用鼠标操作"""))

# 6) 种植菜单点击：暂停时无效
pairs.append((
"""        this._onPlantMenuClick = e => {
            const tab = e.target.closest('.pm-tab');""",
"""        this._onPlantMenuClick = e => {
            if (this.paused) return; // v4.0.106：暂停期间菜单点击无效
            const tab = e.target.closest('.pm-tab');"""))

# 7) 升级/拆除弹窗按钮：暂停时无效
pairs.append((
"""        this.ppDemolish.onclick = () => {
            const pl = this.popupPlant;
            if (!pl) return;""",
"""        this.ppDemolish.onclick = () => {
            if (this.paused) return; // v4.0.106
            const pl = this.popupPlant;
            if (!pl) return;"""))
pairs.append((
"""        this.ppUp.onclick = () => {
            const pl = this.popupPlant;
            if (!pl || !pl.def.up) { this._closePopup(); return; }""",
"""        this.ppUp.onclick = () => {
            if (this.paused) return; // v4.0.106
            const pl = this.popupPlant;
            if (!pl || !pl.def.up) { this._closePopup(); return; }"""))

# 8) 祝福点选：暂停时无效
pairs.append((
"""            el.onclick = (e) => {
                e.stopPropagation();
                this._pickBlessing(parseInt(el.dataset.idx));
            };""",
"""            el.onclick = (e) => {
                e.stopPropagation();
                if (this.paused) return; // v4.0.106
                this._pickBlessing(parseInt(el.dataset.idx));
            };"""))

# 9) doPlant 兜底：暂停期间不落种
pairs.append((
"""    doPlant(type) {
        this._closePlantMenu();""",
"""    doPlant(type) {
        if (this.paused) { this._closePlantMenu(); return; } // v4.0.106：暂停期间无法种植
        this._closePlantMenu();"""))

# 10) 结算：暂停期间到达的胜负延迟到恢复后
pairs.append((
"""    gameOver(win) {
        if (this.over || this._destroyed) return;
        this.over = true;""",
"""    gameOver(win) {
        if (this.over || this._destroyed) return;
        if (this.paused) { // v4.0.106：暂停期间不结算，恢复后再判
            if (this._gameOverTimer) { clearTimeout(this._gameOverTimer); this._gameOverTimer = null; }
            this._pendingGameOver = !!win;
            return;
        }
        this.over = true;"""))

# 11) destroy：移除暂停遮罩
pairs.append((
"""        this.keys = {};
        this.keysJustPressed = {};
        if (this.world1) this.world1.innerHTML = '';""",
"""        this.keys = {};
        this.keysJustPressed = {};
        this.paused = false;
        if (this._pauseEl && this._pauseEl.parentNode) this._pauseEl.parentNode.removeChild(this._pauseEl);
        this._pauseEl = null;
        if (this.world1) this.world1.innerHTML = '';"""))

for old, new in pairs:
    assert src.count(old) == 1, ('MISS %d' % src.count(old), old[:80])
    src = src.replace(old, new)

io.open(P, 'w', encoding='utf-8').write(src)
print('PATCH_OK', len(pairs))
