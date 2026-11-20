import re

with open('calabash-brothers/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. initGame inventory
content = content.replace(
    'skills: [characters[charId].skill] };',
    'skills: [characters[charId].skill], inventory: [] };'
)

# 2. lucky_event artifacts
old_lucky = """      const artifact = artifacts[Math.floor(Math.random() * artifacts.length)];
      showText(artifact.name, `你发现了一个神秘宝箱！\\n\\n打开后里面是...${artifact.name}！\\n\\n${artifact.desc}`, 
        [{ text: '🎉 收下', next: 'explore', effect: { power: artifact.power || 0, hp: artifact.hp || 0 } }]);"""

new_lucky = """      const artifact = artifacts[Math.floor(Math.random() * artifacts.length)];
      player.inventory.push(artifact);
      showText(artifact.name, `你发现了一个神秘宝箱！\\n\\n打开后里面是...${artifact.name}！\\n\\n${artifact.desc}\\n\\n(已放入背包，可在战斗中使用)`, 
        [{ text: '继续探索', next: 'explore' }]);"""
content = content.replace(old_lucky, new_lucky)

# 3. combat strategies & item use
old_combat = """      { text: `🔥 火焰攻击`, effect: { hp: -e.power * 0.15, power: 4 }, condition: player.skills.includes('喷火'), successRate: 0.85 },"""
new_combat = """      { text: `🔥 火焰攻击`, effect: { hp: -e.power * 0.15, power: 4 }, condition: player.skills.includes('喷火'), successRate: 0.85 },
      { text: `❄️🔥 冰火两重天`, effect: { hp: -e.power * 0.05, power: 15 }, condition: player.skills.includes('喷火') && player.skills.includes('吸水'), successRate: 0.95, desc: '组合技！' },
      { text: `👻💪 无形大逼兜`, effect: { hp: 0, power: 20 }, condition: player.skills.includes('隐身') && player.skills.includes('力大无穷'), successRate: 1, desc: '组合技！' },
      { text: `🎒 乱扔道具`, effect: { hp: 0 }, condition: player.inventory && player.inventory.length > 0, next: 'use_item', data: { enemy: e }, successRate: 1 },"""
content = content.replace(old_combat, new_combat)

old_combat_map = """      next: 'combat_result',
      effect: s.effect,"""
new_combat_map = """      next: s.next || 'combat_result',
      effect: s.effect,"""
content = content.replace(old_combat_map, new_combat_map)

# 4. new events (boss_harass, use_item) and karma impact in npc_encounter
old_npc = """  npc_encounter: () => {
    const npc = npcs[Math.floor(Math.random() * npcs.length)];
    if (npc.dialogues && npc.dialogues.length > 0) {"""
new_npc = """  use_item: () => {
    const { enemy } = events._tempData;
    const item = player.inventory.pop();
    const r = Math.random();
    if (r < 0.5) {
      showText('🎒 乱扔道具', `你掏出【${item.name}】砸向${enemy.name}！\\n\\n效果拔群！敌人被砸晕了！\\n\\n获得了大量战力加成！`, [{ text: '继续战斗', next: 'combat_result', effect: { power: item.power || 20, hp: item.hp || 10 }, data: { enemy, successRate: 1.5 } }]);
    } else {
      showText('🎒 乱扔道具', `你掏出【${item.name}】想对付${enemy.name}...\\n\\n结果不小心反弹砸到了自己！\\n\\n受到了伤害！`, [{ text: '继续战斗', next: 'combat_result', effect: { hp: -20, power: -5 }, data: { enemy, successRate: 0.3 } }]);
    }
  },

  boss_harass: () => {
    showText('⚠️ 蛇精的袭击', '蛇精觉得你太跳了，远程向你扔了一个【如意大泥石流】！', [
      { text: '😤 硬抗', next: 'explore', effect: { hp: -25, brave: 5 } },
      { text: '🏃 躲避', next: 'explore', effect: { hp: -5, brave: -2 } }
    ]);
  },

  npc_encounter: () => {
    const npc = npcs[Math.floor(Math.random() * npcs.length)];
    if (player.karma <= -30 && Math.random() < 0.5) {
      showText(npc.name, `${npc.desc}\\n\\n看到你满身邪气，${npc.name}觉得你比蛇精还像反派，决定直接对你动手！`, [
        { text: '暴揍一顿', next: 'explore', effect: { hp: -15, power: 10, karma: -5 } },
        { text: '仓皇逃窜', next: 'explore', effect: { hp: -5, brave: -5 } }
      ]);
      return;
    }
    if (npc.dialogues && npc.dialogues.length > 0) {"""
content = content.replace(old_npc, new_npc)

# 5. doAction explore harass chance
old_explore = """  if (action === 'explore') {
    growBoss(); turn++;
    const r = Math.random();
    if (r < 0.12) { winStreak = 0; showEvent('find_ally'); }"""
new_explore = """  if (action === 'explore') {
    growBoss(); turn++;
    const r = Math.random();
    if (r < 0.08) { showEvent('boss_harass'); }
    else if (r < 0.18) { winStreak = 0; showEvent('find_ally'); }"""
content = content.replace(old_explore, new_explore)

# 6. boss_entrance demon ending & multi-phase boss fight
old_boss_ent = """  boss_entrance: () => {
    showText('🐍 蛇精洞穴', """
new_boss_ent = """  boss_entrance: () => {
    if (player.karma <= -50) {
      showText('😈 魔王降临', `蛇精看到满身邪气的你，瑟瑟发抖：\\n\\n「大哥，原来你才是反派，爷爷还给你，我给你当小弟行不行？」\\n\\n你收服了蛇精，成为了新的大魔王！`, [{ text: '达成：魔王结局', next: 'ending' }]);
      return;
    }
    showText('🐍 蛇精洞穴', """
content = content.replace(old_boss_ent, new_boss_ent)

# 7. boss_fight phase 3 glitch
old_boss_fight = """      if (progress < 10) {
        phaseEffect = '\\n\\n🐍 蛇精狂暴了！使出致命毒雾！';
        bDmg *= 1.5;
        applyEffect({ hp: -10 });
      } else if (progress < 30) {
        const attacks = ["""
new_boss_fight = """      if (progress < 10) {
        showText('💻 系统警告', '蛇精眼看打不过，使出了绝招：【拔网线魔法】！\\n\\n你的界面开始崩溃，按钮乱码了！', [
          { text: '锟斤拷', next: 'boss_fight', effect: { hp: -20 } },
          { text: '烫烫烫', next: 'boss_fight', effect: { hp: -20 } },
          { text: '宝葫芦收妖', next: 'boss_fight', effect: { bossHp: -999 } },
          { text: '0x000000', next: 'boss_fight', effect: { hp: -20 } }
        ].sort(() => Math.random() - 0.5));
        return;
      } else if (progress < 40) {
        phaseEffect = '\\n\\n🐍 蛇精召唤了她的反派盟友！群殴开始了！';
        bDmg *= 1.5;
        applyEffect({ hp: -10 });
      } else if (progress < 60) {
        const attacks = ["""
content = content.replace(old_boss_fight, new_boss_fight)

with open('calabash-brothers/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Update script finished.")
