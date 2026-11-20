# -*- coding: utf-8 -*-
"""v4.0.138 守屋大作战：提示词分级治理（去人机技能刷屏 / 出局后静音 / 保留关键情报）"""
import io

P = 'js/HauntedDorm.js'
s = io.open(P, encoding='utf-8').read()
reps = []

# ---------- 1. _announce 分级门控 ----------
reps.append((
"""    _announce(text, sfx, priority = false) {
        if (!this.announceQueue) this.announceQueue = [];""",
"""    // 玩家是否已彻底出局（阵亡且没选天使/内鬼形态）→ 中央大字播报自动静音
    // 注意：天使/内鬼/待选形态都还能操作，不算出局
    _spectatorOut() {
        const hs = [this.player, this.player2].filter(p => p && !p.isAi);
        if (!hs.length) return false;
        return hs.every(p => p.dead && !p.traitor && !p.angelic && !p.pendingFate);
    }

    // v4.0.138：播报分级——只把「玩家真需要知道的事」放到屏幕正中
    //   audience='human'（默认）：仅当玩家还能操作时播；阵亡出局后自动静音
    //   audience='always'：关键情报（内鬼诞生 / 空投礼盒 / 尸潮 / 结局）不受出局影响
    //   audience='ai'：人机自己的事（放技能、升级、抢盒）——一律不播，避免刷屏
    _announce(text, sfx, priority = false, audience = 'human') {
        if (audience === 'ai') return;
        if (audience === 'human' && this._spectatorOut()) return;
        if (!this.announceQueue) this.announceQueue = [];"""))

# ---------- 2. 结算时清空播报队列 ----------
reps.append((
"""        document.getElementById('wave-announce')?.remove(); // 结算时移除残留的播报字""",
"""        document.getElementById('wave-announce')?.remove(); // 结算时移除残留的播报字
        this.announceQueue = [];          // v4.0.138：队列里排着的也一并作废，结算后不再冒提示
        this.isAnnouncing = false;"""))

# ---------- 3. 删掉「幸存者阵容」这种对玩家没用的播报 ----------
reps.append((
"""            this._announce(`🤖 幸存者阵容：${nStrong} 名老手 💪 · ${this.ais.length - nStrong} 名新手 🌱——关键时刻还得靠你！`);""",
"""            // v4.0.138：删掉「幸存者阵容 N 老手 M 新手」——对本局决策毫无用处，纯占屏"""))

# ---------- 4. 人机技能不播报（_useSkill 全场） ----------
reps.append((
"""    _useSkill(target = null) {
        // v4.0.16：接收目标玩家——原实现忽略参数，2P 模式下 P2 按 /键 释放的技能加在了 P1 身上
        const p = target || this.player;
        if (p.skillCd > 0) return;""",
"""    _useSkill(target = null) {
        // v4.0.16：接收目标玩家——原实现忽略参数，2P 模式下 P2 按 /键 释放的技能加在了 P1 身上
        const p = target || this.player;
        if (p.skillCd > 0) return;
        // v4.0.138：人机放技能只出战果，不在屏幕正中播报（用户：别的房间人机用技能的提示根本不需要出现）
        const isHuman = !p.isAi;
        const say = (t, sf, pr) => { if (isHuman) this._announce(t, sf, pr); };"""))

# ---------- 5. 关键情报加 'always' ----------
KEEP = [
    ("this._announce('👻 僵尸出笼！', 'evillaugh.mp3');",
     "this._announce('👻 僵尸出笼！', 'evillaugh.mp3', false, 'always');"),
    ("this._announce('🏆 巨人僵尸被击倒了！它洒落了一地阳光！', 'points.mp3', true);",
     "this._announce('🏆 巨人僵尸被击倒了！它洒落了一地阳光！', 'points.mp3', true, 'always');"),
    ("this._announce('🎉 植物们守住了家园！内鬼计划失败…', 'losemusic.mp3', true);",
     "this._announce('🎉 植物们守住了家园！内鬼计划失败…', 'losemusic.mp3', true, 'always');"),
    ("this._announce('🏆 领主幽灵被击败！肃清剩余残部即可获胜！', 'points.mp3', true);",
     "this._announce('🏆 领主幽灵被击败！肃清剩余残部即可获胜！', 'points.mp3', true, 'always');"),
    ("this._announce('🧟 观察期结束，行动开始！', 'scream.mp3');",
     "this._announce('🧟 观察期结束，行动开始！', 'scream.mp3', false, 'always');"),
    ("this._announce('🛒 小推车启动！', 'cherrybomb.mp3');",
     "this._announce('🛒 小推车启动！', 'cherrybomb.mp3', false, 'always');"),
    ("this._announce('🌙 夜幕降临！向日葵们熄灯睡觉，蘑菇和路灯花开始上夜班（僵尸提速 15%）', 'evillaugh.mp3', true);",
     "this._announce('🌙 夜幕降临！僵尸提速 15%', 'evillaugh.mp3', true, 'always');"),
    ("this._announce('☀ 天亮了！向日葵们醒来产阳光，蘑菇们睡觉去了，抓紧布防发育', 'points.mp3', true);",
     "this._announce('☀ 天亮了！向日葵恢复产阳光', 'points.mp3', true, 'always');"),
    ("this._announce(bossComing ? '⚠️ 警报：一大波僵尸正在接近——地面在震动！' : '⚠️ 一大波僵尸正在接近！', 'finalwave.mp3', true);",
     "this._announce(bossComing ? '⚠️ 一大波僵尸即将来临——含巨人！' : '⚠️ 一大波僵尸即将来临！', 'finalwave.mp3', true, 'always');"),
    ("this._announce(`🚨 第 ${this.waveN} 波尸潮来袭——巨人僵尸驾到！！`, 'scream.mp3', true);",
     "this._announce(`🚨 第 ${this.waveN} 波尸潮——巨人驾到！`, 'scream.mp3', true, 'always');"),
    ("this._announce(`🧟 第 ${this.waveN} 波尸潮来袭！`, 'evillaugh.mp3', true);",
     "this._announce(`🧟 第 ${this.waveN} 波尸潮来袭！`, 'evillaugh.mp3', true, 'always');"),
    ("this._announce('🕯 气氛突然安静得可怕……幸存者中，混进了一个内鬼……', 'evillaugh.mp3');",
     "this._announce('🕯 气氛突然安静……人群里混进了一个内鬼', 'evillaugh.mp3', false, 'always');"),
    ("this._announce(`😈 【${t.roleDef.name}】变成了内鬼！`, 'scream.mp3', true);",
     "this._announce(`😈 【${t.roleDef.name}】变成了内鬼！`, 'scream.mp3', true, 'always');"),
    ("this._announce('🎉 内鬼被击败了！全体幸存者 +200🦠 庆功！', 'points.mp3', true);",
     "this._announce('🎉 内鬼被击败！全体幸存者 +200🦠', 'points.mp3', true, 'always');"),
    ("this._announce(`👻 你已进化为【${cfg.name}】！`, 'finalwave.mp3', true);",
     "this._announce(`👻 你已进化为【${cfg.name}】！`, 'finalwave.mp3', true, 'always');"),
    ("this._announce(`👻 僵尸升级为【${cfg.name}】！`, 'finalwave.mp3', true);",
     "this._announce(`👻 僵尸升级为【${cfg.name}】！`, 'finalwave.mp3', true, 'always');"),
    ("this._announce(`👻 僵尸成长为【${cfg.name}】…`, 'finalwave.mp3', true);",
     "this._announce(`👻 僵尸成长为【${cfg.name}】…`, 'finalwave.mp3', true, 'always');"),
    ("this._announce('💀 你是最后一位幸存者，也倒下了——全灭！', 'scream.mp3', true);",
     "this._announce('💀 你是最后一位幸存者，也倒下了——全灭！', 'scream.mp3', true, 'always');"),
    ("this._announce('😈 内鬼屠尽了所有幸存者——邪恶胜利！', 'evillaugh.mp3', true);",
     "this._announce('😈 内鬼屠尽了所有幸存者——邪恶胜利！', 'evillaugh.mp3', true, 'always');"),
    ("this._announce('😈 所有植物方成员已被肃清——邪恶胜利！', 'evillaugh.mp3', true);",
     "this._announce('😈 所有植物方成员已被肃清——邪恶胜利！', 'evillaugh.mp3', true, 'always');"),
    ("this._announce('💀 两位僵尸玩家都被植物击败了…', 'scream.mp3', true);",
     "this._announce('💀 两位僵尸玩家都被植物击败了…', 'scream.mp3', true, 'always');"),
    ("this._announce('💀 P1 倒下了！P2 继续战斗！', 'scream.mp3', true);",
     "this._announce('💀 P1 倒下了！P2 继续战斗！', 'scream.mp3', true, 'always');"),
    ("this._announce('💔 P2 倒下了！P1 继续战斗！', 'scream.mp3', true);",
     "this._announce('💔 P2 倒下了！P1 继续战斗！', 'scream.mp3', true, 'always');"),
    # 空投：说清楚是什么宝，别只喊"盲盒"
    ("this._announce('🎁 神秘盲盒已空降过道！快出房抢！' +",
     "this._announce('🎁 门外空投：' + (kindNames[box.kind] || '神秘礼盒') + ' 已落地！快出房抢' +"),
]
reps.extend(KEEP)

# 空投尾部括号文案简化（人机出动数量对玩家无用）
reps.append((
"""                        (box.looters.length ? `（${box.looters.length} 个人机也出门了）` : ''), 'readysetplant.mp3');""",
"""                        (box.looters.length ? `（${box.looters.length} 个人机也出门）` : ''), 'readysetplant.mp3', false, 'always');"""))

# ---------- 6. 堕落值长文本缩短 ----------
reps.append((
"""            this._announce(c === 1 ? '😈 堕落值开启！拆门/咬杀幸存者持续变强（伤害+25%、血量+10%/层）！' : '😈 堕落值已满（6/6）！伤害+150%、血量+77%，无人能挡！', 'evillaugh.mp3');""",
"""            this._announce(c === 1 ? '😈 堕落值 1/6：拆门与咬杀都会更强' : '😈 堕落值满 6/6：伤害 +150%', 'evillaugh.mp3', false, 'always');"""))

# ---------- 7. 倭瓜技能（AI 也可能触发）----------
reps.append((
"""        this._announce(`🥒 ${p.roleDef ? p.roleDef.name : p.name} 倭瓜技能：全场僵尸半血！`, 'explosion.mp3');""",
"""        this._announce(`🥒 ${p.roleDef ? p.roleDef.name : p.name} 倭瓜技能：全场僵尸半血！`, 'explosion.mp3', false, p.isAi ? 'ai' : 'always');"""))

dup_ok = 3   # 「内鬼屠尽」这条在 P1/P2/尸潮三处结局里各出现一次，全部都要加 always
for i, (old, new) in enumerate(reps):
    n = s.count(old)
    assert n >= 1, 'reps[%d] count=%d :: %s' % (i, n, old[:70])
    assert n == 1 or n == dup_ok, 'reps[%d] 意外重复 %d 次 :: %s' % (i, n, old[:70])
    s = s.replace(old, new)

# ---------- 8. _useSkill 内部 announce → say ----------
a = s.index('    _useSkill(target = null) {')
b = s.index('    bindInput() {', a)
body = s[a:b]
cnt = body.count('this._announce(')
assert cnt >= 8, cnt
body2 = body.replace('this._announce(', 'say(')
s = s[:a] + body2 + s[b:]

io.open(P, 'w', encoding='utf-8').write(s)
print('HauntedDorm 补丁完成：%d 处定点替换 + _useSkill 内 %d 处播报改为真人专属' % (len(reps), cnt))
