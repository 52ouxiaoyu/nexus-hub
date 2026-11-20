import re

with open('pvz-web/haunted-dorm.html', 'r') as f:
    content = f.read()

old_stats = """                <div class="ov-stat">僵尸等级<b id="ov-waves">0</b></div>
            </div>"""
new_stats = """                <div class="ov-stat">僵尸等级<b id="ov-waves">0</b></div>
                <div class="ov-stat">本局MVP<b id="ov-mvp">你</b></div>
            </div>"""
content = content.replace(old_stats, new_stats)

with open('pvz-web/haunted-dorm.html', 'w') as f:
    f.write(content)

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    js_content = f.read()

old_go = """        document.getElementById('ov-waves').innerText = this.ghostLevel;
        document.getElementById('dorm-over').style.display = 'flex';"""
new_go = """        document.getElementById('ov-waves').innerText = this.ghostLevel;
        
        let mvp = this.player;
        let maxScore = this.player.sun + this.player.spore * 100;
        for (const ai of this.ais) {
            const score = ai.sun + ai.spore * 100;
            if (score > maxScore) { maxScore = score; mvp = ai; }
        }
        const mvpEl = document.getElementById('ov-mvp');
        if (mvpEl) {
            mvpEl.innerText = mvp === this.player ? '你' : `人机-${mvp.roleDef.name}`;
            mvpEl.style.color = mvp === this.player ? '#00ff00' : mvp.color;
        }

        document.getElementById('dorm-over').style.display = 'flex';"""
js_content = js_content.replace(old_go, new_go)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(js_content)

