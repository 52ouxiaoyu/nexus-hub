import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# Patch plantClick UI text
old_pclick = """        if (def.up) {
            const useSun = def.up.cur === 'sun';
            this.ppUp.style.display = '';
            this.ppUp.innerText = `升级 ${useSun ? '☀' : '🦠'}${def.up.cost}`;
            this.ppUp.classList.toggle('pp-disabled', (useSun ? this.player.sun : this.player.spore) < def.up.cost);
        } else {"""
new_pclick = """        if (def.up) {
            let cstr = [];
            if (def.up.cost) cstr.push(`☀${def.up.cost}`);
            if (def.up.sporeCost) cstr.push(`🦠${def.up.sporeCost}`);
            this.ppUp.style.display = '';
            this.ppUp.innerText = `升级 ${cstr.join(' ')}`;
            const canAfford = (!def.up.cost || this.player.sun >= def.up.cost) && (!def.up.sporeCost || this.player.spore >= def.up.sporeCost);
            this.ppUp.classList.toggle('pp-disabled', !canAfford);
        } else {"""
content = content.replace(old_pclick, new_pclick)

# Patch ppUp.onclick logic
old_pp_onclick = """        this.ppUp.onclick = () => {
            const pl = this.popupPlant;
            if (!pl || !pl.def.up) { this._closePopup(); return; }
            const cost = pl.def.up.cost;
            const useSun = pl.def.up.cur === 'sun';   // v3.90.0：向日葵链/坚果链升级花普通阳光，其余花孢子
            const have = useSun ? this.player.sun : this.player.spore;
            if (have < cost) {
                this._flyText(pl.c * 80 + 40, pl.r * 80, useSun ? `阳光不足（需 ☀${cost}）` : `孢子不足（需 🦠${cost}）`, '#ff8a8a');
                this.playSfx('buttonclick.mp3', 0.35);
                return;
            }
            const to = pl.def.up.to;
            const nd = HauntedDorm.DEFS[to];
            const fac = pl.isDoor ? 0.3 : 1;
            this._closePopup();
            if (useSun) this.addSun(-cost); else this.addSpore(-cost);
            this.playSfx('readysetplant.mp3', 0.5);"""

new_pp_onclick = """        this.ppUp.onclick = () => {
            const pl = this.popupPlant;
            if (!pl || !pl.def.up) { this._closePopup(); return; }
            const cost = pl.def.up.cost || 0;
            const sporeCost = pl.def.up.sporeCost || 0;
            const canAfford = this.player.sun >= cost && this.player.spore >= sporeCost;
            if (!canAfford) {
                let err = [];
                if (this.player.sun < cost) err.push(`☀${cost}`);
                if (this.player.spore < sporeCost) err.push(`🦠${sporeCost}`);
                this._flyText(pl.c * 80 + 40, pl.r * 80, `资源不足（需 ${err.join(' ')}）`, '#ff8a8a');
                this.playSfx('buttonclick.mp3', 0.35);
                return;
            }
            const to = pl.def.up.to;
            const nd = HauntedDorm.DEFS[to];
            const fac = pl.isDoor ? 0.3 : 1;
            this._closePopup();
            if (cost) this.addSun(-cost);
            if (sporeCost) this.addSpore(-sporeCost);
            this.playSfx('readysetplant.mp3', 0.5);"""
content = content.replace(old_pp_onclick, new_pp_onclick)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
