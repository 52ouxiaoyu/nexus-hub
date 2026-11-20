import re

with open('js/main.js', 'r') as f:
    js = f.read()

# 1. Buff Range increments
old_archer = """            { cost: 70, range: 180, dmg: 15, cd: 400, type: 'single' },
            { cost: 110, range: 200, dmg: 30, cd: 350, type: 'single' },
            { cost: 160, range: 220, dmg: 55, cd: 300, type: 'single' }"""
new_archer = """            { cost: 70, range: 180, dmg: 15, cd: 400, type: 'single' },
            { cost: 110, range: 230, dmg: 30, cd: 350, type: 'single' },
            { cost: 160, range: 280, dmg: 55, cd: 300, type: 'single' }"""
js = js.replace(old_archer, new_archer)

old_mage = """            { cost: 100, range: 160, dmg: 40, cd: 1200, type: 'single' },
            { cost: 160, range: 170, dmg: 80, cd: 1100, type: 'single' },
            { cost: 240, range: 180, dmg: 160, cd: 1000, type: 'single' }"""
new_mage = """            { cost: 100, range: 160, dmg: 40, cd: 1200, type: 'single' },
            { cost: 160, range: 200, dmg: 80, cd: 1100, type: 'single' },
            { cost: 240, range: 250, dmg: 160, cd: 1000, type: 'single' }"""
js = js.replace(old_mage, new_mage)

old_artillery = """            { cost: 125, range: 150, dmg: 35, cd: 2000, type: 'splash', splash: 90 },
            { cost: 220, range: 160, dmg: 70, cd: 1800, type: 'splash', splash: 100 },
            { cost: 320, range: 170, dmg: 140, cd: 1600, type: 'splash', splash: 120 }"""
new_artillery = """            { cost: 125, range: 150, dmg: 35, cd: 2000, type: 'splash', splash: 90 },
            { cost: 220, range: 190, dmg: 70, cd: 1800, type: 'splash', splash: 100 },
            { cost: 320, range: 230, dmg: 140, cd: 1600, type: 'splash', splash: 120 }"""
js = js.replace(old_artillery, new_artillery)

old_ice = """            { cost: 150, range: 140, dmg: 15, cd: 1000, type: 'splash', splash: 80, slowDur: 1500, slowMult: 0.6 },
            { cost: 200, range: 160, dmg: 30, cd: 950, type: 'splash', splash: 90, slowDur: 2000, slowMult: 0.5 },
            { cost: 250, range: 180, dmg: 50, cd: 900, type: 'splash', splash: 100, slowDur: 2500, slowMult: 0.4 }"""
new_ice = """            { cost: 150, range: 140, dmg: 15, cd: 1000, type: 'splash', splash: 80, slowDur: 1500, slowMult: 0.6 },
            { cost: 200, range: 180, dmg: 30, cd: 950, type: 'splash', splash: 90, slowDur: 2000, slowMult: 0.5 },
            { cost: 250, range: 220, dmg: 50, cd: 900, type: 'splash', splash: 100, slowDur: 2500, slowMult: 0.4 }"""
js = js.replace(old_ice, new_ice)

# 2. Draw upcoming range as dashed green circle
old_draw_highlight = """            // Range highlight
            if (this.selectedEntity === t) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath(); this.ctx.arc(t.x, t.y, baseDef.levels[t.lvl].range, 0, Math.PI*2); this.ctx.stroke();
            }"""
new_draw_highlight = """            // Range highlight
            if (this.selectedEntity === t) {
                // Current Range (Solid White)
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath(); this.ctx.arc(t.x, t.y, baseDef.levels[t.lvl].range, 0, Math.PI*2); this.ctx.stroke();
                
                // Next Level Range (Dashed Green) if not max level
                if (t.lvl < baseDef.levels.length - 1) {
                    this.ctx.save();
                    this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.6)'; // Emerald green
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.beginPath(); this.ctx.arc(t.x, t.y, baseDef.levels[t.lvl + 1].range, 0, Math.PI*2); this.ctx.stroke();
                    this.ctx.restore();
                }
            }"""
js = js.replace(old_draw_highlight, new_draw_highlight)

with open('js/main.js', 'w') as f:
    f.write(js)
