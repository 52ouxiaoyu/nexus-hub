import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

old_roles = """        this.playerRoles = [
            { id: 'sunflower', name: '向日葵', icon: 'assets/images/Plants/SunFlower/0.gif', skillDesc: '【M键】10秒内阳光产出翻倍' },
            { id: 'peashooter', name: '豌豆射手', icon: 'assets/images/Plants/Peashooter/0.gif', skillDesc: '【M键】15秒内全场植物攻击力翻倍' },
            { id: 'wallnut', name: '坚果', icon: 'assets/images/Plants/WallNut/0.gif', skillDesc: '【M键】一局一次免费升级门' },
            { id: 'chomper', name: '大嘴花', icon: 'assets/images/Plants/Chomper/0.gif', skillDesc: '【M键】赶跑僵尸一次' },
            { id: 'squash', name: '倭瓜', icon: 'assets/images/Plants/Squash/0.gif', skillDesc: '【M键】半血以上砸掉僵尸一半血' }
        ];"""

new_roles = """        this.playerRoles = [
            { id: 'sunflower', name: '向日葵', icon: 'assets/images/Plants/SunFlower/0.gif', skillDesc: '【M键】10秒内阳光产出翻倍' },
            { id: 'peashooter', name: '豌豆射手', icon: 'assets/images/Plants/Peashooter/0.gif', skillDesc: '【M键】15秒内全场植物攻击力翻倍', imgStyle: 'transform: scale(1.2)' },
            { id: 'wallnut', name: '坚果', icon: 'assets/images/Plants/WallNut/0.gif', skillDesc: '【M键】一局一次免费升级门' },
            { id: 'chomper', name: '大嘴花', icon: 'assets/images/Plants/Chomper/0.gif', skillDesc: '【M键】赶跑僵尸一次', imgStyle: 'transform: scale(1.2)' },
            { id: 'squash', name: '倭瓜', icon: 'assets/images/Plants/Squash/0.gif', skillDesc: '【M键】半血以上砸掉僵尸一半血', imgStyle: 'transform: scale(2.0)' }
        ];"""
content = content.replace(old_roles, new_roles)

# Also fix the `this.player.el1` which used `this.roleDef.name`, it should use `this.playerRoleDef.name` and `this.playerRoleDef.imgStyle`
old_player_el = """        this.player.el1 = document.createElement('div');
        this.player.el1.className = 'entity avatar';
        this.player.el1.innerHTML = `<img src="${this.player.icon}" style="${this.roleDef.imgStyle || ''}">` + 
                                    `<div style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); color:#00ff00; font-size:16px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">你 (${this.roleDef.name})</div>`;
        this.player.el1.style.filter = `drop-shadow(0 0 10px #00ff00)`;"""

new_player_el = """        this.player.el1 = document.createElement('div');
        this.player.el1.className = 'entity avatar';
        this.player.el1.innerHTML = `<img src="${this.player.icon}" style="${this.playerRoleDef.imgStyle || ''}">` + 
                                    `<div style="position:absolute; top:-35px; left:50%; transform:translateX(-50%); color:#00ff00; font-size:18px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">你 (${this.playerRoleDef.name})</div>`;
        this.player.el1.style.filter = `drop-shadow(0 0 10px #00ff00)`;"""
content = content.replace(old_player_el, new_player_el)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
