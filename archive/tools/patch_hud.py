import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

old_hud = """    _refreshHud() {
        document.getElementById('sun1').innerText = this.player.sun;
        document.getElementById('spore1').innerText = this.player.spore;
    }"""

new_hud = """    _refreshHud() {
        document.getElementById('sun1').innerText = this.player.sun;
        document.getElementById('spore1').innerText = this.player.spore;
        const skillEl = document.getElementById('skill-hud');
        if (skillEl && this.player.roleDef) {
            if (this.player.skillUsed) {
                skillEl.innerHTML = `<span style="color:#aaa;"><s>${this.player.roleDef.skillDesc}</s> (已使用)</span>`;
            } else {
                skillEl.innerHTML = `<span style="color:#0f0;">${this.player.roleDef.skillDesc}</span>`;
            }
        }
    }"""
content = content.replace(old_hud, new_hud)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
