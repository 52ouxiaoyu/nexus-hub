import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# 1. Patch Player Avatar
old_player_el = """        this.player.el1 = document.createElement('div');
        this.player.el1.className = 'entity avatar';
        this.player.el1.innerHTML = `<img src="${this.player.icon}">`;"""
new_player_el = """        this.player.el1 = document.createElement('div');
        this.player.el1.className = 'entity avatar';
        this.player.el1.innerHTML = `<img src="${this.player.icon}" style="${this.roleDef.imgStyle || ''}">` + 
                                    `<div style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); color:#00ff00; font-size:16px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">你 (${this.roleDef.name})</div>`;
        this.player.el1.style.filter = `drop-shadow(0 0 10px #00ff00)`;"""
content = content.replace(old_player_el, new_player_el)

# 2. Patch AI Bots
old_ai_spawn = """            rm.owner = ai; // AI 预占领房间
            ai.el1.className = 'entity avatar';
            ai.el1.innerHTML = `<img src="${ai.icon}" style="${ai.roleDef.imgStyle || ''}">`;"""
new_ai_spawn = """            rm.owner = ai; // AI 预占领房间
            ai.el1.className = 'entity avatar';
            const colors = ['#ff7777', '#77ff77', '#7777ff', '#ffff77', '#ff77ff'];
            const color = colors[i % colors.length];
            ai.el1.innerHTML = `<img src="${ai.icon}" style="${ai.roleDef.imgStyle || ''}">` +
                               `<div style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); color:${color}; font-size:16px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">人机 - ${ai.roleDef.name}</div>`;
            ai.el1.style.filter = `drop-shadow(0 0 10px ${color})`;"""
content = content.replace(old_ai_spawn, new_ai_spawn)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
