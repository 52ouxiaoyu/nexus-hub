import re

# Update HTML to include a stats preview container in the upgrade menu
with open('index.html', 'r') as f:
    html = f.read()

old_menu = """                <div id="upgrade-menu">
                    <div id="upg-title" style="color: #d4af37; font-size: 14px; text-align: center; margin-bottom: 5px;"></div>
                    <button id="btn-upgrade" class="upg-btn">升级 (100)</button>
                    <button id="btn-sell" class="upg-btn">出售 (50)</button>
                </div>"""

new_menu = """                <div id="upgrade-menu">
                    <div id="upg-title" style="color: #d4af37; font-size: 14px; text-align: center; margin-bottom: 5px; font-weight: bold;"></div>
                    <div id="upg-stats" style="color: #bdc3c7; font-size: 12px; margin-bottom: 8px; text-align: left; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 3px;"></div>
                    <button id="btn-upgrade" class="upg-btn" style="margin-bottom: 4px;">升级 (100)</button>
                    <button id="btn-sell" class="upg-btn">出售 (50)</button>
                </div>"""
html = html.replace(old_menu, new_menu)

with open('index.html', 'w') as f:
    f.write(html)

# Update JS to fill the stats
with open('js/main.js', 'r') as f:
    js = f.read()

old_update = """    updateUpgradeMenu() {
        if (!this.selectedEntity || !this.selectedEntity.isTower) return;
        let t = this.selectedEntity; let baseDef = TOWER_DEFS[t.type];
        document.getElementById('upg-title').innerText = `${baseDef.name} Lv.${t.lvl + 1}`;
        let btnUpg = document.getElementById('btn-upgrade');
        if (t.lvl < 2) {
            let nextDef = baseDef.levels[t.lvl + 1];
            btnUpg.innerText = `升级 (${nextDef.cost})`; btnUpg.disabled = this.gold < nextDef.cost;
        } else {
            btnUpg.innerText = `已满级`; btnUpg.disabled = true;
        }
        let totalCost = 0; for(let i=0; i<=t.lvl; i++) totalCost += baseDef.levels[i].cost;
        document.getElementById('btn-sell').innerText = `出售 (${Math.floor(totalCost * 0.6)})`;
    }"""

new_update = """    updateUpgradeMenu() {
        if (!this.selectedEntity || !this.selectedEntity.isTower) return;
        let t = this.selectedEntity; let baseDef = TOWER_DEFS[t.type];
        
        let curDef = baseDef.levels[t.lvl];
        document.getElementById('upg-title').innerText = `${baseDef.name} Lv.${t.lvl + 1}`;
        
        let statsDiv = document.getElementById('upg-stats');
        let btnUpg = document.getElementById('btn-upgrade');
        
        if (t.lvl < baseDef.levels.length - 1) {
            let nextDef = baseDef.levels[t.lvl + 1];
            
            // Build stats preview
            let dpsCur = Math.round(curDef.dmg / (curDef.cd / 1000));
            let dpsNext = Math.round(nextDef.dmg / (nextDef.cd / 1000));
            
            statsDiv.innerHTML = `
                🗡️ 秒伤: ${dpsCur} <span style="color:#2ecc71;">➜ ${dpsNext}</span><br>
                🎯 范围: ${curDef.range} <span style="color:#2ecc71;">➜ ${nextDef.range}</span>
            `;
            statsDiv.style.display = 'block';
            
            btnUpg.innerText = `升级 (${nextDef.cost})`; btnUpg.disabled = this.gold < nextDef.cost;
        } else {
            let dpsCur = Math.round(curDef.dmg / (curDef.cd / 1000));
            statsDiv.innerHTML = `🗡️ 秒伤: ${dpsCur}<br>🎯 范围: ${curDef.range}`;
            statsDiv.style.display = 'block';
            
            btnUpg.innerText = `已满级`; btnUpg.disabled = true;
        }
        
        let totalCost = 0; for(let i=0; i<=t.lvl; i++) totalCost += baseDef.levels[i].cost;
        document.getElementById('btn-sell').innerText = `出售 (${Math.floor(totalCost * 0.6)})`;
    }"""

js = js.replace(old_update, new_update)

with open('js/main.js', 'w') as f:
    f.write(js)
