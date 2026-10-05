import re

with open('js/main.js', 'r') as f:
    js = f.read()

# 1. Update TOWER_DEFS
old_defs = """        levels: [
            { cost: 140, range: 140, dmg: 10, cd: 1500, type: 'poison', splash: 70, poisonDmg: 5, poisonDur: 4000 },
            { cost: 200, range: 170, dmg: 20, cd: 1400, type: 'poison', splash: 80, poisonDmg: 12, poisonDur: 4000 },
            { cost: 280, range: 200, dmg: 35, cd: 1300, type: 'poison', splash: 90, poisonDmg: 25, poisonDur: 4000 }
        ]
    }
};"""

new_defs = """        levels: [
            { cost: 140, range: 140, dmg: 10, cd: 1500, type: 'poison', splash: 70, poisonDmg: 5, poisonDur: 4000 },
            { cost: 200, range: 170, dmg: 20, cd: 1400, type: 'poison', splash: 80, poisonDmg: 12, poisonDur: 4000 },
            { cost: 280, range: 200, dmg: 35, cd: 1300, type: 'poison', splash: 90, poisonDmg: 25, poisonDur: 4000 }
        ]
    },
    'LASER': { name: '激光塔', color: '#f1c40f', dmgType: 'magic', baseColor: '#34495e', barrelColor: '#f1c40f', levels: [ {cost:150, range:150, dmg:50, cd:0, type:'laser'}, {cost:200, range:170, dmg:100, cd:0, type:'laser'}, {cost:250, range:190, dmg:200, cd:0, type:'laser'} ] },
    'GOLD': { name: '炼金坊', color: '#f39c12', dmgType: 'magic', baseColor: '#e67e22', barrelColor: '#f39c12', levels: [ {cost:200, range:0, dmg:0, cd:5000, type:'gold', income:20}, {cost:300, range:0, dmg:0, cd:5000, type:'gold', income:50}, {cost:500, range:0, dmg:0, cd:5000, type:'gold', income:120} ] },
    'GATLING': { name: '加特林', color: '#95a5a6', dmgType: 'physical', baseColor: '#7f8c8d', barrelColor: '#95a5a6', levels: [ {cost:130, range:150, dmg:2, cd:100, type:'single'}, {cost:180, range:170, dmg:4, cd:80, type:'single'}, {cost:250, range:190, dmg:8, cd:50, type:'single'} ] },
    'BOMBER': { name: '地雷塔', color: '#c0392b', dmgType: 'physical', baseColor: '#e74c3c', barrelColor: '#c0392b', levels: [ {cost:160, range:200, dmg:80, cd:3000, type:'bomber'}, {cost:220, range:250, dmg:150, cd:2500, type:'bomber'}, {cost:300, range:300, dmg:300, cd:2000, type:'bomber'} ] },
    'AURA': { name: '战鼓塔', color: '#8e44ad', dmgType: 'magic', baseColor: '#9b59b6', barrelColor: '#8e44ad', levels: [ {cost:220, range:150, dmg:0, cd:0, type:'aura', buff:0.2}, {cost:300, range:200, dmg:0, cd:0, type:'aura', buff:0.35}, {cost:400, range:250, dmg:0, cd:0, type:'aura', buff:0.5} ] },
    'BLACKHOLE': { name: '黑洞塔', color: '#2c3e50', dmgType: 'magic', baseColor: '#1a252f', barrelColor: '#2c3e50', levels: [ {cost:300, range:150, dmg:20, cd:10000, type:'blackhole'}, {cost:400, range:200, dmg:50, cd:8000, type:'blackhole'}, {cost:600, range:250, dmg:100, cd:6000, type:'blackhole'} ] },
    'TELEPORT': { name: '传送门', color: '#3498db', dmgType: 'magic', baseColor: '#2980b9', barrelColor: '#3498db', levels: [ {cost:250, range:160, dmg:10, cd:2000, type:'teleport', prob:0.1}, {cost:350, range:180, dmg:20, cd:1800, type:'teleport', prob:0.2}, {cost:500, range:200, dmg:30, cd:1500, type:'teleport', prob:0.3} ] },
    'MONEY': { name: '氪金塔', color: '#1abc9c', dmgType: 'true', baseColor: '#16a085', barrelColor: '#1abc9c', levels: [ {cost:280, range:180, dmg:200, cd:800, type:'money', spend:5}, {cost:400, range:220, dmg:500, cd:600, type:'money', spend:10}, {cost:600, range:260, dmg:1200, cd:400, type:'money', spend:20} ] },
    'EXECUTE': { name: '死神塔', color: '#333333', dmgType: 'true', baseColor: '#000000', barrelColor: '#333333', levels: [ {cost:260, range:140, dmg:10, cd:1500, type:'execute', thresh:0.1}, {cost:360, range:160, dmg:20, cd:1200, type:'execute', thresh:0.15}, {cost:500, range:180, dmg:30, cd:1000, type:'execute', thresh:0.2} ] },
    'STUN': { name: '雷神锤', color: '#f39c12', dmgType: 'physical', baseColor: '#d35400', barrelColor: '#e67e22', levels: [ {cost:190, range:150, dmg:30, cd:1500, type:'stun', prob:0.2, dur:1000}, {cost:280, range:180, dmg:60, cd:1300, type:'stun', prob:0.3, dur:1500}, {cost:380, range:200, dmg:100, cd:1100, type:'stun', prob:0.4, dur:2000} ] },
    'FLAME': { name: '喷火塔', color: '#e74c3c', dmgType: 'magic', baseColor: '#c0392b', barrelColor: '#e74c3c', levels: [ {cost:180, range:100, dmg:40, cd:0, type:'flame'}, {cost:280, range:120, dmg:80, cd:0, type:'flame'}, {cost:400, range:140, dmg:160, cd:0, type:'flame'} ] },
    'VAMPIRE': { name: '吸血塔', color: '#8e44ad', dmgType: 'magic', baseColor: '#9b59b6', barrelColor: '#8e44ad', levels: [ {cost:350, range:150, dmg:30, cd:2000, type:'vampire'}, {cost:500, range:180, dmg:60, cd:1500, type:'vampire'}, {cost:700, range:200, dmg:120, cd:1000, type:'vampire'} ] },
    'NUKE': { name: '核弹井', color: '#2c3e50', dmgType: 'physical', baseColor: '#7f8c8d', barrelColor: '#bdc3c7', levels: [ {cost:500, range:1500, dmg:1000, cd:15000, type:'nuke'}, {cost:800, range:1500, dmg:2500, cd:14000, type:'nuke'}, {cost:1200, range:1500, dmg:5000, cd:12000, type:'nuke'} ] },
    'SLOT': { name: '赌狗塔', color: '#f1c40f', dmgType: 'true', baseColor: '#e74c3c', barrelColor: '#f39c12', levels: [ {cost:150, range:200, dmg:100, cd:1000, type:'slot', maxDmg:500}, {cost:250, range:230, dmg:100, cd:900, type:'slot', maxDmg:1500}, {cost:400, range:260, dmg:100, cd:800, type:'slot', maxDmg:5000} ] }
};"""

js = js.replace(old_defs, new_defs)
with open('js/main.js', 'w') as f:
    f.write(js)
