// 坦克大战 大招系统 (Ultimates System)

const ULTIMATES_POOL = [];

// Helper functions for ultimates
function spawnMeteors(game, count, damage, player) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const rx = Math.random() * (game.canvas.width - 64);
            const ry = Math.random() * (game.canvas.height - 64);
            game.effects.push(new Effect(rx + 32, ry + 32, 'EXPLOSION', 4));
            if(window.audio) window.audio.play('explosion');
            game.shakeScreen(15);
            game.enemies.forEach(e => {
                if (Math.hypot(e.x - rx, e.y - ry) < 150) {
                    e.destroy(player, damage);
                }
            });
        }, i * 300);
    }
}

function radialExplosion(game, player, bullets, type, level) {
    for (let i = 0; i < bullets; i++) {
        let angle = (i / bullets) * Math.PI * 2;
        let b = new Bullet(game, player, player.x + player.width/2, player.y + player.height/2, 'UP', level, type);
        b.vx = Math.cos(angle) * 12;
        b.vy = Math.sin(angle) * 12;
        game.bullets.push(b);
    }
}

// ========================
// 1. 毁天灭地类 (God Tier)
// ========================
ULTIMATES_POOL.push({
    name: "天降陨石群",
    desc: "全图随机降下15颗高伤害陨石",
    cd: 1200,
    effect: (p, g) => {
        g.showAnnouncement('🔥 天降陨石群！', '#ff0');
        spawnMeteors(g, 15, 20, p);
    }
});
ULTIMATES_POOL.push({
    name: "绝对零度",
    desc: "时间停止，冻结所有敌人10秒",
    cd: 1500,
    effect: (p, g) => {
        g.showAnnouncement('❄️ 绝对零度！时间停止！', '#0ff');
        g.enemyFrozenTimer = 600; 
    }
});
ULTIMATES_POOL.push({
    name: "万箭齐发",
    desc: "向四周发射36发高爆穿透弹",
    cd: 900,
    effect: (p, g) => {
        g.showAnnouncement('💥 万箭齐发！', '#f00');
        radialExplosion(g, p, 36, 'EXPLOSIVE', 5);
        if(window.audio) window.audio.play('shoot');
    }
});
ULTIMATES_POOL.push({
    name: "狂暴嗜血",
    desc: "获得15秒无敌，移速与火力拉满",
    cd: 1800,
    effect: (p, g) => {
        g.showAnnouncement('🩸 狂暴嗜血！', '#f00');
        p.setShield(900);
        p.level = 9;
        p.speed = 8;
        if (!p.perks) p.perks = [];
        p.perks.push('VAMPIRIC');
    }
});

// ========================
// 2. 强力增益类 (High Tier)
// ========================
ULTIMATES_POOL.push({
    name: "基地终极护甲",
    desc: "基地被钢铁包围15秒",
    cd: 600,
    effect: (p, g) => {
        g.showAnnouncement('🛡️ 基地获得终极防御！', '#ccc');
        g.fortifyTimer = 900;
        g.map.setBaseWalls(TILE_TYPES.STEEL);
    }
});
ULTIMATES_POOL.push({
    name: "局部黑洞",
    desc: "立刻消灭距离自己最近的3个敌人",
    cd: 750,
    effect: (p, g) => {
        g.showAnnouncement('🕳️ 局部黑洞！', '#a0a');
        let sorted = [...g.enemies].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
        for(let i=0; i<3; i++) {
            if(sorted[i]) sorted[i].destroy(p, 9999);
        }
    }
});
ULTIMATES_POOL.push({
    name: "全屏核聚变",
    desc: "清空屏幕上所有小怪，对Boss造成巨量伤害",
    cd: 2400,
    effect: (p, g) => {
        g.showAnnouncement('☢️ 全屏核聚变！', '#ff0');
        g.shakeScreen(60);
        if(window.audio) window.audio.play('explosion');
        g.enemies.forEach(e => {
            if (e.isBoss) e.destroy(p, 100);
            else e.destroy(p, 9999);
        });
    }
});
ULTIMATES_POOL.push({
    name: "火力倾泻",
    desc: "以自身为中心发射一圈激光穿透弹",
    cd: 600,
    effect: (p, g) => {
        radialExplosion(g, p, 16, 'LASER', 5);
        if(window.audio) window.audio.play('shoot');
    }
});

// ========================
// 3. 搞笑/无厘头类 (Meme Tier - Short CD)
// ========================
const funnyColors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00', '#00ffff'];
funnyColors.forEach((color, idx) => {
    ULTIMATES_POOL.push({
        name: `炫彩皮肤 (款${idx+1})`,
        desc: "仅仅是改变坦克的颜色，极其炫酷",
        cd: 30,
        effect: (p, g) => {
            p.color = color;
            g.showFloatingText('🎨 换肤成功！', p.x, p.y, color);
        }
    });
});

ULTIMATES_POOL.push({
    name: "我要隐身",
    desc: "变得半透明（但敌人还是看得到你）",
    cd: 60,
    effect: (p, g) => {
        g.showFloatingText('👻 皇帝的新隐身衣', p.x, p.y, '#fff');
    }
});

ULTIMATES_POOL.push({
    name: "假装掉线",
    desc: "屏幕显示掉线提示，吓唬队友",
    cd: 120,
    effect: (p, g) => {
        g.showAnnouncement(`网络连接已断开... (其实并没有)`, '#f00');
    }
});

ULTIMATES_POOL.push({
    name: "原地放屁",
    desc: "发出奇怪的爆炸声并原地留下一团烟雾",
    cd: 60,
    effect: (p, g) => {
        if(window.audio) window.audio.play('hit');
        g.effects.push(new Effect(p.x + p.width/2, p.y + p.height/2, 'EXPLOSION', 3));
        g.showFloatingText('💨 噗...', p.x, p.y - 20, '#a50');
    }
});

ULTIMATES_POOL.push({
    name: "摇滚模式",
    desc: "发射一堆没有伤害的烟花",
    cd: 30,
    effect: (p, g) => {
        g.showAnnouncement('🎸 ROCK & ROLL!', '#f0f');
        for (let i=0; i<10; i++) {
            setTimeout(() => {
                let rx = p.x + (Math.random() - 0.5) * 200;
                let ry = p.y + (Math.random() - 0.5) * 200;
                g.effects.push(new Effect(rx, ry, 'EXPLOSION', Math.random()*2 + 1));
            }, i * 100);
        }
    }
});

ULTIMATES_POOL.push({
    name: "大喇叭",
    desc: "疯狂呼叫队友支援",
    cd: 10,
    effect: (p, g) => {
        g.showAnnouncement(`🔊 P${p.id}: 救命啊！我快不行了！`, p.color);
    }
});

ULTIMATES_POOL.push({
    name: "和平使者",
    desc: "丢下一堆回血包（敌人也能吃）",
    cd: 300,
    effect: (p, g) => {
        g.showAnnouncement('🕊️ Love & Peace!', '#0f0');
        for (let i = 0; i < 5; i++) {
            g.powerUps.push(new PowerUp(g, p.x + (Math.random()-0.5)*150, p.y + (Math.random()-0.5)*150, POWERUP_TYPES.LIFE));
        }
    }
});

ULTIMATES_POOL.push({
    name: "迷踪步",
    desc: "随机传送到地图上的一个位置",
    cd: 60,
    effect: (p, g) => {
        p.x = Math.random() * (g.canvas.width - 64);
        p.y = Math.random() * (g.canvas.height - 64);
        g.effects.push(new Effect(p.x + 32, p.y + 32, 'SPAWN', 3));
        g.showFloatingText('🌀 咻!', p.x, p.y, '#0ff');
    }
});

ULTIMATES_POOL.push({
    name: "爱的抱抱",
    desc: "把一个敌人直接传送到你脸上",
    cd: 120,
    effect: (p, g) => {
        if (g.enemies.length > 0) {
            let e = g.enemies[Math.floor(Math.random() * g.enemies.length)];
            e.x = p.x + 64; e.y = p.y;
            g.showFloatingText('❤️ 惊不惊喜!', p.x, p.y, '#f00');
        }
    }
});

ULTIMATES_POOL.push({
    name: "天降正义(虚假)",
    desc: "气势磅礴地什么也没发生",
    cd: 60,
    effect: (p, g) => {
        g.showAnnouncement('🔥 接受正义的制裁吧！！！', '#ff0');
        setTimeout(() => {
            g.showFloatingText('...呃，忘带弹药了', p.x, p.y, '#fff');
        }, 1500);
    }
});

ULTIMATES_POOL.push({
    name: "打赏主播",
    desc: "撒出一堆加分星星",
    cd: 120,
    effect: (p, g) => {
        g.showAnnouncement('🌟 感谢老铁送的穿云箭！', '#ff0');
        for (let i = 0; i < 8; i++) {
            g.powerUps.push(new PowerUp(g, p.x + (Math.random()-0.5)*150, p.y + (Math.random()-0.5)*150, POWERUP_TYPES.STAR));
        }
    }
});

// Procedurally generate more funny ultimates to make the pool exactly 100 or huge
const adjectives = ['闪耀的', '无敌的', '神奇的', '神秘的', '超级', '量子', '终极', '狂暴'];
const nouns = ['光环', '立场', '装甲', '引擎', '履带', '信号'];
for(let i=0; i<77; i++) {
    let adj = adjectives[Math.floor(Math.random()*adjectives.length)];
    let noun = nouns[Math.floor(Math.random()*nouns.length)];
    ULTIMATES_POOL.push({
        name: `${adj}${noun}`,
        desc: "充满未知的神秘力量",
        cd: Math.floor(Math.random() * 60) + 10,
        effect: (p, g) => {
            g.showFloatingText('✨ ' + adj + noun + '已激活！', p.x, p.y, '#fff');
            g.effects.push(new Effect(p.x + 32, p.y + 32, 'SPARK', 2));
        }
    });
}

// 暴露给全局
window.getTankUltimate = function() {
    return ULTIMATES_POOL[Math.floor(Math.random() * ULTIMATES_POOL.length)];
};
