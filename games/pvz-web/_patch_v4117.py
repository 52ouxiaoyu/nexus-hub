# -*- coding: utf-8 -*-
"""pvz-web v4.0.117 守屋僵尸模式开局观察期：
   ① 观察期内任何技能/指挥键都不能用（原来 M 被 _useSkill 挡住，G/H 照样能放，H 甚至直接刷出 3 只僵尸）
   ② 「号令尸潮」改为「亲手啃死 2 名幸存者」后解锁（HUD 显示进度，未解锁按 H 给提示）
"""
import io

P = 'js/HauntedDorm.js'
s = io.open(P, encoding='utf-8').read()
done = []


def rep(old, new, tag):
    global s
    assert s.count(old) == 1, (tag, s.count(old))
    s = s.replace(old, new)
    done.append(tag)


# ---------- ① 构造函数：击杀计数 ----------
rep(
    """        this.commandTarget = null;
        this.waveOrderCd = 0;
""",
    """        this.commandTarget = null;
        this.waveOrderCd = 0;
        // v4.0.117：号令尸潮解锁进度——僵尸方真人亲手啃死的幸存者数（尸潮小怪咬死的不算）
        this.survivorKills = 0;
        this._frozenTipAt = 0;
""",
    'ctor: survivorKills')

# ---------- ② 重开一局：清零 ----------
rep(
    """        this.aiBlessAt = 90000;
        this.zombieFreezeT = this.isZombieFaction ? 10 : 0;
""",
    """        this.aiBlessAt = 90000;
        this.zombieFreezeT = this.isZombieFaction ? 10 : 0;
        this.survivorKills = 0;   // v4.0.117：尸潮解锁进度随局重置
        this._frozenTipAt = 0;
""",
    'reset: survivorKills')

# ---------- ③ 观察期封锁助手 ----------
rep(
    """    _zombieFrozen() {
        return this.isZombieFaction && this.zombieFreezeT > 0;
    }
""",
    """    _zombieFrozen() {
        return this.isZombieFaction && this.zombieFreezeT > 0;
    }
    // v4.0.117：观察期内一律不许放技能/指挥（用户实报：人不能动，却能按 H 号令尸潮刷出一队僵尸）
    _frozenSkillBlock() {
        if (!this._zombieFrozen()) return false;
        this.playSfx('buzzer.mp3', 0.3);
        this._flyText(this.player.x, this.player.y - 40,
            `❄️ 观察期中——还有 ${Math.ceil(this.zombieFreezeT)} 秒才能行动`, '#8ad4ff');
        return true;
    }
    // v4.0.117：号令尸潮解锁条件——亲手击杀 2 名幸存者
    _hordeUnlocked() { return (this.survivorKills || 0) >= 2; }
""",
    'helper: _frozenSkillBlock/_hordeUnlocked')

# ---------- ④ 指挥令旗 / 号令尸潮 入口封锁 ----------
rep(
    """    _cycleCommandTarget() {
""",
    """    _cycleCommandTarget() {
        if (this._frozenSkillBlock()) return; // v4.0.117：观察期内不许下指令
""",
    'guard: _cycleCommandTarget')

rep(
    """    _orderHorde() {
        if (this.waveOrderCd > 0) {
""",
    """    _orderHorde() {
        if (this._frozenSkillBlock()) return; // v4.0.117：观察期内不许号令尸潮
        // v4.0.117：解锁门槛——必须先亲手啃死 2 名幸存者
        if (!this._hordeUnlocked()) {
            this.playSfx('buzzer.mp3', 0.3);
            this._flyText(this.player.x, this.player.y - 40,
                `🩸 号令尸潮未解锁——先击杀 2 名幸存者（${Math.min(2, this.survivorKills || 0)}/2）`, '#ff8a8a');
            return;
        }
        if (this.waveOrderCd > 0) {
""",
    'guard: _orderHorde')

# ---------- ⑤ 按键层：观察期内技能键全部吞掉（带一次提示） ----------
rep(
    """            if (this.paused) return; // 暂停期间其余按键一律无效（移动/技能/修门/建造/浇水）
""",
    """            if (this.paused) return; // 暂停期间其余按键一律无效（移动/技能/修门/建造/浇水）
            // v4.0.117：僵尸阵营观察期内——技能/指挥键一律无效（原来只有 M 被 _useSkill 挡住，G/H 照样能放）
            if (this._zombieFrozen() && !e.repeat) {
                const _sk = ['m', 'n', 'b', 'g', 'h', '5', '/', '3', '+', ' '];
                const _sc = ['KeyM', 'KeyN', 'KeyB', 'KeyG', 'KeyH', 'Digit5', 'Numpad5',
                             'Slash', 'Digit3', 'Numpad3', 'PageDown', 'NumpadAdd', 'Space'];
                if (_sk.includes(key) || _sc.includes(e.code)) {
                    if (this.gameTime - (this._frozenTipAt || 0) > 900) {
                        this._frozenTipAt = this.gameTime;
                        this._frozenSkillBlock();
                    }
                    if (e.preventDefault) e.preventDefault();
                    return;
                }
            }
""",
    'keydown: frozen skill keys')

# ---------- ⑥ HUD：锁定态 + 观察期提示 ----------
rep(
    """                const hordTxt = this.waveOrderCd > 0
                    ? `<span style="color:#777777;"><s>【H】号令尸潮</s> (CD:${Math.ceil(this.waveOrderCd)}s)</span>`
                    : `<span style="color:#ff5252;">【H】号令尸潮</span>`;
""",
    """                const hordTxt = !this._hordeUnlocked()
                    ? `<span style="color:#8a8a8a;"><s>【H】号令尸潮</s>（击杀幸存者 ${Math.min(2, this.survivorKills || 0)}/2 解锁）</span>`
                    : (this.waveOrderCd > 0
                        ? `<span style="color:#777777;"><s>【H】号令尸潮</s> (CD:${Math.ceil(this.waveOrderCd)}s)</span>`
                        : `<span style="color:#ff5252;">【H】号令尸潮</span>`);
""",
    'hud: horde lock text')

rep(
    """                if (this.player.skillCd > 0) {
                    skillEl.innerHTML = `<span style="color:#aaa;"><s>【M键】狂暴冲刺</s> (CD: ${Math.ceil(this.player.skillCd)}s)</span> ｜ ${hordTxt} <span style="color:#ffd54a; font-size:12px;">⚑ 目标:${cmdTxt} (G切换)</span>`;
""",
    """                if (this._zombieFrozen()) {
                    // v4.0.117：观察期内技能栏整体锁定（不再显示"可放"的绿色/红色高亮）
                    skillEl.innerHTML = `<span style="color:#8ad4ff;">❄️ 观察期 ${Math.ceil(this.zombieFreezeT)}s · 技能锁定（还不能动，也放不了技能）</span>`;
                } else if (this.player.skillCd > 0) {
                    skillEl.innerHTML = `<span style="color:#aaa;"><s>【M键】狂暴冲刺</s> (CD: ${Math.ceil(this.player.skillCd)}s)</span> ｜ ${hordTxt} <span style="color:#ffd54a; font-size:12px;">⚑ 目标:${cmdTxt} (G切换)</span>`;
""",
    'hud: frozen lock line')

# ---------- ⑦ 击杀幸存者：累加解锁进度 ----------
rep(
    """                            if (v.hp <= 0 && !v.dead) {
                                this.kills++;
""",
    """                            if (v.hp <= 0 && !v.dead) {
                                this.kills++;
                                // v4.0.117：号令尸潮解锁进度——只算僵尸方真人自己咬死的（尸潮小怪的不算）
                                const _wasLocked = !this._hordeUnlocked();
                                this.survivorKills = (this.survivorKills || 0) + 1;
                                if (_wasLocked && this._hordeUnlocked()) {
                                    this._announce('🩸 已击杀 2 名幸存者——【H】号令尸潮 已解锁！', 'finalwave.mp3', true);
                                    this._refreshHud();
                                }
""",
    'kill: survivorKills++')

# ---------- ⑧ 开局引导文案 ----------
rep(
    """'<div>【指挥】G: 切换优先猎杀目标 ｜ H: 号令尸潮(60s) ｜ 最上排中心红圈自动回血 ｜ 啃破大门吃掉幸存者获胜</div>';""",
    """'<div>【指挥】G: 切换优先猎杀目标 ｜ H: 号令尸潮(击杀2人后解锁·60s) ｜ 最上排中心红圈自动回血 ｜ 啃破大门吃掉幸存者获胜</div>';""",
    'guide text')

io.open(P, 'w', encoding='utf-8').write(s)
print('补丁完成：')
for t in done:
    print('  OK', t)
