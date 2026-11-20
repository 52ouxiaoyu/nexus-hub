with open('index.html', 'r') as f:
    html = f.read()

old_menu = """                <div id="build-menu" class="bottom-bar" style="display: none; flex-wrap: wrap; justify-content: center; max-width: 600px;">
                    <div class="tower-card" data-type="ARCHER" title="物理单体速射"><div class="tower-icon">🏹</div><div class="tower-cost">70</div></div>
                    <div class="tower-card" data-type="MAGE" title="魔法穿甲单体"><div class="tower-icon">🔮</div><div class="tower-cost">100</div></div>
                    <div class="tower-card" data-type="ARTILLERY" title="物理群体溅射"><div class="tower-icon">💣</div><div class="tower-cost">125</div></div>
                    <div class="tower-card" data-type="ICE" title="魔法群体减速"><div class="tower-icon">❄️</div><div class="tower-cost">150</div></div>
                    <div class="tower-card" data-type="SNIPER" title="超远物理重击"><div class="tower-icon">🎯</div><div class="tower-cost">180</div></div>
                    <div class="tower-card" data-type="POISON" title="魔法群体持续毒伤"><div class="tower-icon">🍄</div><div class="tower-cost">140</div></div>
                </div>"""

new_menu = """                <div id="build-menu" class="bottom-bar" style="display: none; flex-wrap: wrap; justify-content: center; max-width: 1000px; gap: 5px;">
                    <div class="tower-card" data-type="ARCHER" title="物理单体速射"><div class="tower-icon">🏹</div><div class="tower-cost">70</div></div>
                    <div class="tower-card" data-type="MAGE" title="魔法穿甲单体"><div class="tower-icon">🔮</div><div class="tower-cost">100</div></div>
                    <div class="tower-card" data-type="ARTILLERY" title="物理群体溅射"><div class="tower-icon">💣</div><div class="tower-cost">125</div></div>
                    <div class="tower-card" data-type="ICE" title="魔法群体减速"><div class="tower-icon">❄️</div><div class="tower-cost">150</div></div>
                    <div class="tower-card" data-type="SNIPER" title="超远物理重击"><div class="tower-icon">🎯</div><div class="tower-cost">180</div></div>
                    <div class="tower-card" data-type="POISON" title="魔法持续毒伤"><div class="tower-icon">🍄</div><div class="tower-cost">140</div></div>
                    <div class="tower-card" data-type="LASER" title="持续射线(魔法)"><div class="tower-icon">⚡</div><div class="tower-cost">150</div></div>
                    <div class="tower-card" data-type="GOLD" title="每5秒产金币"><div class="tower-icon">🏭</div><div class="tower-cost">200</div></div>
                    <div class="tower-card" data-type="GATLING" title="极速物理刮痧"><div class="tower-icon">🔫</div><div class="tower-cost">130</div></div>
                    <div class="tower-card" data-type="BOMBER" title="全图随机埋雷"><div class="tower-icon">🛢️</div><div class="tower-cost">160</div></div>
                    <div class="tower-card" data-type="AURA" title="群体攻速光环"><div class="tower-icon">🥁</div><div class="tower-cost">220</div></div>
                    <div class="tower-card" data-type="BLACKHOLE" title="全屏吸怪黑洞"><div class="tower-icon">🌌</div><div class="tower-cost">300</div></div>
                    <div class="tower-card" data-type="TELEPORT" title="几率传送退回"><div class="tower-icon">🌀</div><div class="tower-cost">250</div></div>
                    <div class="tower-card" data-type="MONEY" title="消耗金币打真伤"><div class="tower-icon">💎</div><div class="tower-cost">280</div></div>
                    <div class="tower-card" data-type="EXECUTE" title="处决低血量"><div class="tower-icon">☠️</div><div class="tower-cost">260</div></div>
                    <div class="tower-card" data-type="STUN" title="几率眩晕敌人"><div class="tower-icon">🔨</div><div class="tower-cost">190</div></div>
                    <div class="tower-card" data-type="FLAME" title="近战范围喷火"><div class="tower-icon">🔥</div><div class="tower-cost">180</div></div>
                    <div class="tower-card" data-type="VAMPIRE" title="攻击回基地血量"><div class="tower-icon">🦇</div><div class="tower-cost">350</div></div>
                    <div class="tower-card" data-type="NUKE" title="极慢全屏核打击"><div class="tower-icon">☢️</div><div class="tower-cost">500</div></div>
                    <div class="tower-card" data-type="SLOT" title="全随机神仙伤害"><div class="tower-icon">🎰</div><div class="tower-cost">150</div></div>
                </div>"""

html = html.replace(old_menu, new_menu)
html = html.replace('v6.0.0 (Borderless)', 'v7.0.0 (Ultimate 20 Towers)')

with open('index.html', 'w') as f:
    f.write(html)
