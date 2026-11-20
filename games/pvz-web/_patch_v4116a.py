import io
P = 'js/HelpGuide.js'
s = io.open(P, encoding='utf-8').read()
orig = s

def cut(start_marker, end_marker, new_text):
    global s
    i = s.find(start_marker)
    assert i >= 0, '找不到起点: ' + start_marker[:40]
    j = s.find(end_marker, i)
    assert j >= 0, '找不到终点: ' + end_marker[:40]
    s = s[:i] + new_text + s[j + len(end_marker):]

# ---------- ① 删掉 21 条 k:'dorm' 条目（连同注释与数组收尾） ----------
cut("        // v4.0.74：补全守屋可产出植物的图鉴条目",
    "{ n: '南瓜壳·不朽', k: 'dorm', base: PL + 'PumpkinHead/PumpkinHead.gif', md: 120, t: '守屋模式：南瓜壳升级（Lv4）。5000 不朽护盾' },\n",
    "")

# ---------- ② 详情卡去掉「守屋专属形态 / 守屋模式升级获得」分支 ----------
old = """        let bs = '';
        if (fusion) {
            bs += badge(p.k === 'dorm' ? '🏰 守屋专属形态' : '🧬 融合植物');
        } else {"""
new = """        let bs = '';
        if (fusion) {
            // v4.0.116：守屋专属分区取消——图鉴里只剩真融合植物（用户：不要自己创造融合植物）
            bs += badge('🧬 融合植物');
        } else {"""
assert s.count(old) == 1, s.count(old)
s = s.replace(old, new)

old = """        bs += badge('📖 ' + (fusion ? (p.k === 'dorm' ? '守屋模式升级获得' : '手套融合获得') : '经典选卡'));"""
new = """        bs += badge('📖 ' + (fusion ? '手套融合获得' : '经典选卡'));"""
assert s.count(old) == 1, s.count(old)
s = s.replace(old, new)

# ---------- ③ renderPlants：只留 经典 / 融合 两区 ----------
old = """        // v4.0.110：FUSION 里混着 21 个"守屋专属升级形态"（k:'dorm'），它们没有融合配方 —— 单独成区，
        // 免得玩家在融合区看到它们、翻遍配方大全找不到对应配方（用户实报）
        const fuseList = FUSION.map((p, i) => ({ p, i })).filter(o => o.p.k !== 'dorm');
        const dormList = FUSION.map((p, i) => ({ p, i })).filter(o => o.p.k === 'dorm');
        return groupBar('经 典', '') +
            '<div class="hg-grid">' + CLASSIC.map((p, i) => plantTile(p, false, 'pc' + i)).join('') + '</div>' +
            groupBar('融 合', 'hg-orange') +
            '<div class="hg-grid">' + fuseList.map(o => plantTile(o.p, true, 'pf' + o.i)).join('') + '</div>' +
            (dormList.length
                ? groupBar('守屋专属', 'hg-red') +
                  '<div class="hg-grid">' + dormList.map(o => plantTile(o.p, true, 'pf' + o.i)).join('') + '</div>'
                : '') +
            '<div class="hg-tip">※ 经典 = 选卡栏直接可选 · 融合 = 手套融合获得（配方见游戏内「融合配方大全」）' +
            ' · 守屋专属 = 只在《守屋大作战》里靠「升级 / 套壳」获得，<b>没有融合配方</b></div>';"""
new = """        // v4.0.116：取消「守屋专属」分区 —— 用户明确「不要自己创造融合植物，守屋里那些没出现过的植物应该用已有的融合植物」。
        // 守屋植物链里的升级形态已全部改名为经典/融合里的现有植物（见 HauntedDorm DEFS），所以图鉴只剩两区。
        return groupBar('经 典', '') +
            '<div class="hg-grid">' + CLASSIC.map((p, i) => plantTile(p, false, 'pc' + i)).join('') + '</div>' +
            groupBar('融 合', 'hg-orange') +
            '<div class="hg-grid">' + FUSION.map((p, i) => plantTile(p, true, 'pf' + i)).join('') + '</div>' +
            '<div class="hg-tip">※ 经典 = 选卡栏直接可选 · 融合 = 手套融合获得（配方见游戏内「融合配方大全」）' +
            ' · 《守屋大作战》里的升级形态用的都是这两类里已有的植物，没有额外自造品种</div>';"""
assert s.count(old) == 1, s.count(old)
s = s.replace(old, new)

assert s != orig
io.open(P, 'w', encoding='utf-8').write(s)
print('HelpGuide 补丁 OK')
