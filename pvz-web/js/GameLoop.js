class AudioManager {
    constructor() {
        this.sounds = {
            bgm: new Audio('assets/audio/uraniwani.mp3'),
            plant: new Audio('assets/audio/plant_water.mp3'),
            chomp: new Audio('assets/audio/chomp.mp3'),
            sun: new Audio('assets/audio/points.mp3'),
            lose: new Audio('assets/audio/losemusic.mp3'),
            win: new Audio('assets/audio/winmusic.mp3'),       // 胜利音乐(原版官方) — v3.5.2 起胜利画面播放
            btn: new Audio('assets/audio/buttonclick.mp3'),
            splat: new Audio('assets/audio/bowlingimpact.mp3'),
            vasebreak: new Audio('assets/audio/vase_breaking.mp3'), // 砸罐破碎音效(原版官方) — v3.5.2 补注册(v3.5.0 漏加导致从未响起)
            // v3.25.0：补注册原版爆炸系音效 —— v3.23.0 起代码里一直在 play() 这些名字，
            // 但从未注册（play 查不到就静默）→ 樱桃/辣椒/冰冻/毁灭菇爆炸一直没声音
            cherrybomb: new Audio('assets/audio/cherrybomb.mp3'),
            jalapeno: new Audio('assets/audio/jalapeno.mp3'),
            frozen: new Audio('assets/audio/frozen.mp3'),
            doomshroom: new Audio('assets/audio/doomshroom.mp3'),
            explosion: new Audio('assets/audio/explosion.mp3')
        };
        this.sounds.bgm.loop = true;
    }
    
    play(name) {
        if (this.sounds[name]) {
            // Clone node to allow overlapping sounds (bgm/lose/win 是长音乐, 播原对象以便 stop)
            if (name !== 'bgm' && name !== 'lose' && name !== 'win') {
                const s = this.sounds[name].cloneNode();
                // v3.23.0：僵尸啃咬声整体调低（用户反馈太大声）
                if (name === 'chomp') s.volume = 0.35;
                s.play().catch(e => console.log(e));
            } else {
                this.sounds[name].play().catch(e => console.log(e));
            }
        }
    }
    
    stop(name) {
        if (this.sounds[name]) {
            this.sounds[name].pause();
            this.sounds[name].currentTime = 0;
        }
    }

    // v3.43.0：暂停/恢复 BGM（保留播放进度，恢复时接着播）
    pauseBgm() { if (this.sounds.bgm) this.sounds.bgm.pause(); }
    resumeBgm() { if (this.sounds.bgm) this.sounds.bgm.play().catch(e => console.log(e)); }

    // v3.23.0：程序合成音效（WebAudio）——每种植物攻击声音不同：
    // 豌豆=短促"噗"声、蘑菇=喷气"噗嘶"、瓜果=碎裂、投掷=风声、星光=高频闪音…
    // 樱桃/辣椒/毁灭菇/寒冰菇爆炸用原版 mp3（cherrybomb/jalapeno/doomshroom/frozen）。
    playFx(kind) {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            if (!this._ctx) {
                this._ctx = new AC();
                this._fxGain = this._ctx.createGain();
                this._fxGain.gain.value = 0.8;
                this._fxGain.connect(this._ctx.destination);
            }
            const ctx = this._ctx;
            if (ctx.state === 'suspended') ctx.resume();
            const t = ctx.currentTime;
            const osc = (type, f0, f1, dur, vol) => {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.type = type; o.frequency.setValueAtTime(f0, t);
                o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
                g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
                o.connect(g); g.connect(this._fxGain); o.start(t); o.stop(t + dur + 0.02);
            };
            const noise = (dur, vol, freq, q) => {
                const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
                const buf = ctx.createBuffer(1, len, ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
                const src = ctx.createBufferSource(); src.buffer = buf;
                const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 0.8;
                const g = ctx.createGain(); g.gain.value = vol;
                src.connect(f); f.connect(g); g.connect(this._fxGain); src.start(t);
            };
            switch (kind) {
                case 'pea_pop':    osc('sine', 380, 95, 0.10, 0.5); break;                            // 豌豆发射
                case 'pea_hit':    osc('sine', 200, 60, 0.08, 0.4); noise(0.05, 0.15, 2500); break;   // 豌豆命中
                case 'ice_pop':    osc('sine', 680, 210, 0.11, 0.45); noise(0.08, 0.12, 4200); break; // 寒冰豌豆
                case 'fire_pop':   osc('sawtooth', 220, 60, 0.14, 0.4); noise(0.12, 0.2, 900); break; // 火豌豆
                case 'puff':       noise(0.16, 0.35, 1100, 1.2); break;                               // 蘑菇喷气
                case 'whoosh':     noise(0.18, 0.22, 700, 0.6); break;                                // 投手抛掷风声
                case 'crash':      noise(0.22, 0.5, 850, 0.5); osc('sine', 150, 55, 0.18, 0.5); break;// 瓜果碎裂
                case 'thud':       osc('sine', 190, 70, 0.10, 0.45); noise(0.06, 0.18, 1800); break;  // 卷心菜/玉米砸中
                case 'star_shoot': osc('sine', 950, 1350, 0.07, 0.18); break;                          // 杨桃星光
                case 'box_open':   osc('square', 500, 900, 0.12, 0.2); noise(0.1, 0.15, 3000); break;  // 盲盒开启
                // ===== v3.25.0 个人特色音 =====
                case 'spike_hit':  osc('square', 240, 90, 0.07, 0.35); noise(0.07, 0.3, 3200, 1.4); break; // 地刺扎刺
                case 'gloom_burst': noise(0.3, 0.4, 500, 0.7); osc('sawtooth', 160, 60, 0.25, 0.3); break; // 忧郁菇孢子云
                case 'hammer_hit': osc('square', 140, 70, 0.09, 0.5); noise(0.06, 0.35, 1400, 1.0); break; // 木锤砸击
                case 'ice_shatter': noise(0.24, 0.42, 4800, 1.4); osc('triangle', 2200, 800, 0.14, 0.25); break; // 寒冰菇消散·冰晶碎裂 v3.26.0
                case 'vomit': {                                                                            // 咬大蒜·干呕 v3.28.0（两声由低到闷的湿呕）
                    for (let i = 0; i < 2; i++) {
                        const t0 = t + i * 0.16;
                        const o = ctx.createOscillator(), g = ctx.createGain();
                        o.type = 'sawtooth';
                        o.frequency.setValueAtTime(210 - i * 40, t0);
                        o.frequency.exponentialRampToValueAtTime(55, t0 + 0.14);
                        g.gain.setValueAtTime(0.38, t0);
                        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
                        o.connect(g); g.connect(this._fxGain); o.start(t0); o.stop(t0 + 0.17);
                        const len2 = Math.max(1, Math.floor(ctx.sampleRate * 0.13));
                        const buf2 = ctx.createBuffer(1, len2, ctx.sampleRate);
                        const d2 = buf2.getChannelData(0);
                        for (let j = 0; j < len2; j++) d2[j] = (Math.random() * 2 - 1) * (1 - j / len2);
                        const s2 = ctx.createBufferSource(); s2.buffer = buf2;
                        const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 480; f2.Q.value = 0.8;
                        const g2 = ctx.createGain(); g2.gain.value = 0.34;
                        s2.connect(f2); f2.connect(g2); g2.connect(this._fxGain); s2.start(t0);
                    }
                    break;
                }
                case 'star_volley': {                                                                      // 杨桃五星齐射（三连升调星光）
                    for (let i = 0; i < 3; i++) {
                        const o = ctx.createOscillator(), g = ctx.createGain();
                        o.type = 'sine';
                        o.frequency.setValueAtTime(900 + i * 260, t + i * 0.06);
                        o.frequency.exponentialRampToValueAtTime(1500 + i * 300, t + i * 0.06 + 0.09);
                        g.gain.setValueAtTime(0.22, t + i * 0.06);
                        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
                        o.connect(g); g.connect(this._fxGain); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.14);
                    }
                    break;
                }
            }
        } catch (e) { console.log(e); }
    }
}

// ============================================================================
// v3.50.0 数据驱动新融合（用户：融合植物扩到 50~75 个；视觉用原版素材合成——
// 帽子式叠放 / 原版像素变色，禁止"一张图 P 在那里"的拼贴感；伤害与阳光成本匹配）。
// 命名规则 = fusion_<p1>_<p2>：Plant.js 构造器按名字自动拆 traits，行为由
// update() 的 hasTrait 体系自动组合（射击/投掷/产能/换行/地刺/吞噬全部免写）；
// 外观走 PVZ_FUSION_LOOK 表（base/bf/bt/ov/oc/ot/of/yOffset），全部原版 gif/png。
// hp 自动 = max(双亲)（坚果系 4000 / 高坚果系 8000 天然成立）。
// md = 素材最大边（HelpGuide lawnStage 缩放锚点，与 v3.44.0 约定一致）。
// ============================================================================
const PVZ_FUSION_EXTRA = [
    // —— 冰系补全（与寒冰卷心菜同门，均带【极寒波动】大技能）——
    { type: 'fusion_repeater_snowpea', a: 'repeater', b: 'snowpea', name: '冰双发射手', md: 73,
      look: { base: 'assets/images/Plants/Repeater/Repeater.gif', bf: 'hue-rotate(165deg) saturate(1.5) brightness(1.12)' },
      t: '双发射手+寒冰射手：2 连发冰豌豆 20×2，命中减速 10 秒；大技能【极寒波动】' },
    { type: 'fusion_threepeater_snowpea', a: 'threepeater', b: 'snowpea', name: '冰三线射手', md: 80,
      look: { base: 'assets/images/Plants/Threepeater/Threepeater.gif', bf: 'hue-rotate(165deg) saturate(1.5) brightness(1.1)' },
      t: '三线射手+寒冰射手：同时射上中下三行冰豌豆，命中减速；大技能【极寒波动】' },
    { type: 'fusion_splitpea_snowpea', a: 'splitpea', b: 'snowpea', name: '冰双向射手', md: 92,
      look: { base: 'assets/images/Plants/SplitPea/SplitPea.gif', bf: 'hue-rotate(165deg) saturate(1.5) brightness(1.1)' },
      t: '双向豌豆+寒冰射手：向前 20 / 向后 40 冰豌豆，命中减速；大技能【极寒波动】' },
    { type: 'fusion_puffshroom_snowpea', a: 'puffshroom', b: 'snowpea', name: '冰雾小喷菇', md: 71,
      look: { base: 'assets/images/Plants/PuffShroom/PuffShroom.gif', bf: 'hue-rotate(160deg) saturate(1.6) brightness(1.15)' },
      t: '小喷菇+寒冰射手：免费过渡冰豆，命中减速；大技能【极寒波动】' },
    { type: 'fusion_garlic_snowpea', a: 'garlic', b: 'snowpea', name: '冰蒜卫士', md: 75,
      look: { base: 'assets/images/Plants/Garlic/Garlic.gif', bf: 'hue-rotate(170deg) saturate(1.4) brightness(1.15)' },
      t: '大蒜+寒冰射手：冰息喷吐 20+减速，僵尸咬它换行引导走位；大技能【极寒波动】' },
    { type: 'fusion_sunflower_iceshroom', a: 'sunflower', b: 'iceshroom', name: '冰晶向日葵', md: 74,
      look: { base: 'assets/images/Plants/SunFlower/SunFlower1.gif', bf: 'hue-rotate(150deg) saturate(1.5) brightness(1.15)' },
      t: '向日葵+寒冰菇：正常产能 25/24s；大技能【极寒波动】——冰雾护田' },
    { type: 'fusion_wintermelon_torchwood', a: 'wintermelon', b: 'torchwood', name: '冰火西瓜', md: 96,
      look: { base: 'assets/images/Plants/WinterMelon/WinterMelon.png', bf: 'hue-rotate(150deg) saturate(1.4) brightness(1.15)' },
      t: '冰西瓜+火炬树桩：冰晶在火炬上淬炼——抛射 60+溅射 30 且减速；大技能【极寒波动】' },
    { type: 'fusion_wintermelon_cabbagepult', a: 'wintermelon', b: 'cabbagepult', name: '冰双果投手', md: 96, rare: 'rare',
      look: { base: 'assets/images/Plants/WinterMelon/WinterMelon.png', bf: 'brightness(1.12) saturate(1.25)',
              ov: 'assets/images/Plants/CabbagePult/CabbagePult.png', ot: 'translate(-2px, -30px) scale(0.62)', of: 'brightness(1.25) hue-rotate(150deg) saturate(1.9)' },
      t: '冰西瓜+卷心菜投手：头顶扣着一颗冰蓝卷心菜帽（同双料投手帽式），冰瓜与破甲卷心菜交替投掷，全部带减速；大技能【极寒波动】' },
    // —— 火炬系补全 ——
    { type: 'fusion_peashooter_torchwood', a: 'peashooter', b: 'torchwood', name: '火焰射手', md: 71,
      look: { base: 'assets/images/Plants/Peashooter/Peashooter.gif', bf: 'sepia(1) saturate(2.8) hue-rotate(-22deg) brightness(1.12)' },
      t: '豌豆射手+火炬树桩：豌豆过火炬点燃，火焰豌豆 40/1.5s；大技能【三连焰豆】——每 15 秒连喷 3 颗火焰豌豆' },
    { type: 'fusion_garlic_torchwood', a: 'garlic', b: 'torchwood', name: '火炬蒜塔', md: 87,
      look: { base: 'assets/images/Plants/Garlic/Garlic.gif', bf: 'sepia(1) saturate(1.8) hue-rotate(-15deg) brightness(0.9) contrast(1.06)',
              ov: 'assets/images/Plants/Torchwood/Torchwood.gif', oc: 'polygon(0 0, 100% 0, 100% 32%, 0 32%)', ot: 'translate(0px, 8px) scale(1.5)', of: 'saturate(2.6) brightness(1.35) hue-rotate(-10deg)' },
      t: '大蒜+火炬树桩：身后燃着放大亮红巨焰的焦糖蒜塔，僵尸咬它换行且每秒被烫 40' },
    { type: 'fusion_melonpult_torchwood', a: 'melonpult', b: 'torchwood', name: '火焰西瓜', md: 96,
      look: { base: 'assets/images/Plants/MelonPult/MelonPult.png', bf: 'sepia(.6) saturate(2) hue-rotate(-25deg) brightness(1.12)' },
      t: '西瓜投手+火炬树桩：西瓜在火炬上烤热——抛射 75+溅射 30，无视铁门；命中的僵尸身上会点着火炬火焰持续灼烧；大技能【烈焰瓜】——每 20 秒投出 90 伤烈焰瓜（同样点燃）' },
    // —— 坚果系补全（实用性补强，大技能不过分）——
    { type: 'fusion_wallnut_garlic', a: 'wallnut', b: 'garlic', name: '金蒜坚果', md: 73,
      look: { base: 'assets/images/Plants/WallNut/WallNut.gif', bf: 'grayscale(1) sepia(.15) brightness(1.7)',
              ov: 'assets/images/Plants/Garlic/Garlic.gif', ot: 'translate(-3px, 0px) scale(1.55)',
              oc: 'polygon(0 0, 30% 0, 30% 100%, 0 100%)',
              of: 'blur(2px) opacity(0.5) saturate(1.35) brightness(1.25)',
              ov2: 'assets/images/Plants/Garlic/Garlic.gif', ot2: 'translate(3px, 0px) scale(1.55)',
              oc2: 'polygon(70% 0, 100% 0, 100% 100%, 70% 100%)',
              of2: 'blur(2px) opacity(0.5) saturate(1.35) brightness(1.25)' },
      t: '坚果墙+大蒜：白色坚果皮两侧浮着淡淡的大蒜纹路，4000 血肉盾，僵尸咬它换行引导走位；大技能【蒜息冲击】——每 15 秒蒜息波震扎周围 60' },
    { type: 'fusion_tallnut_garlic', a: 'tallnut', b: 'garlic', name: '蒜味高坚果', md: 119,
      look: { base: 'assets/images/Plants/TallNut/TallNut.gif', bf: 'grayscale(1) sepia(.15) brightness(1.65)',
              ov: 'assets/images/Plants/Garlic/Garlic.gif', ot: 'translate(-4px, 0px) scale(2.2)',
              oc: 'polygon(0 0, 30% 0, 30% 100%, 0 100%)',
              of: 'blur(2.6px) opacity(0.45) saturate(1.35) brightness(1.25)',
              ov2: 'assets/images/Plants/Garlic/Garlic.gif', ot2: 'translate(4px, 0px) scale(2.2)',
              oc2: 'polygon(70% 0, 100% 0, 100% 100%, 70% 100%)',
              of2: 'blur(2.6px) opacity(0.45) saturate(1.35) brightness(1.25)' },
      t: '高坚果+大蒜：白色高坚果皮两侧浮着淡淡蒜皮纹 8000 血肉盾天花板；被咬的僵尸换行并被蒜味弹开一大段' },
    { type: 'fusion_spikerock_wallnut', a: 'spikerock', b: 'wallnut', name: '钢刺坚果', md: 73,
      look: { base: 'assets/images/Plants/WallNut/WallNut.gif', bf: 'saturate(0.75) brightness(1.08)', ov: 'assets/images/Plants/Spikerock/Spikerock.gif', ot: 'translate(0px, 24px) scale(0.9)' },
      t: '钢地刺+坚果墙：脚下钢刺 120/0.75s（不会被啃）+ 4000 血本体；大技能【径向突刺】——每 10 秒钢刺暴起扎周围 120' },
    { type: 'fusion_wallnut_twinsunflower', a: 'wallnut', b: 'twinsunflower', name: '双子坚果', md: 84,
      look: { base: 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif', bc: 'polygon(0 46%, 100% 46%, 100% 100%, 0 100%)',
              bt: 'translate(0px, 16px) scale(1.4)',
              ov: 'assets/images/Plants/WallNut/WallNut.gif', ot: 'translate(-17px, -6px) scale(0.58)',
              ov2: 'assets/images/Plants/WallNut/WallNut.gif', ot2: 'translate(17px, -2px) scale(0.53) scaleX(-1)' },
      t: '坚果墙+双子向日葵：两条青藤分别结出一颗坚果的 4000 血双生肉盾（不产阳光）；单颗坚果被吃完会脱落，30 秒后原地重新长出' },
    { type: 'fusion_cabbage_tallnut', a: 'cabbagepult', b: 'tallnut', name: '高坚果堡垒', md: 119, rare: 'rare',
      look: { base: 'assets/images/Plants/TallNut/TallNut.gif', ov: 'assets/images/Plants/CabbagePult/CabbagePult.png', ot: 'translate(4px, -56px) scale(0.7)' },
      t: '卷心菜投手+高坚果：8000 血堡垒 + 抛射 40 破甲；大技能【巨菜炮击】' },
    // —— 投手系补全 ——
    { type: 'fusion_melon_cabbagepult', a: 'melonpult', b: 'cabbagepult', name: '双果投手', md: 96,
      look: { base: 'assets/images/Plants/MelonPult/MelonPult.png', ov: 'assets/images/Plants/CabbagePult/CabbagePult.png', oc: 'polygon(0 0, 100% 0, 100% 42%, 0 42%)', ot: 'translate(-2px, -30px) scale(0.6)' },
      t: '西瓜投手+卷心菜投手：双料投手同款帽子式合成——卷心菜连篮扣在西瓜头顶；西瓜（60+溅射）与破甲卷心菜（40）交替投掷；大技能【双瓜齐射】——每 20 秒瓜菜齐投' },
    // —— 菇系补全 ——
    // v3.62.0：删「怕羞向日葵」（用户裁定图鉴照片难看，直接取消）
    { type: 'fusion_fumeshroom_garlic', a: 'fumeshroom', b: 'garlic', name: '蒜味喷雾', md: 100,
      look: { base: 'assets/images/Plants/FumeShroom/FumeShroom.gif', bf: 'sepia(.4) saturate(1.3) hue-rotate(40deg) brightness(1.08)' },
      t: '大喷菇+大蒜：单行穿透孢子弹幕；被咬的僵尸被辣得退回出场点，并换到五行中任意一行重新进攻' },
    { type: 'fusion_scaredyshroom_garlic', a: 'scaredyshroom', b: 'garlic', name: '胆小蒜卫', md: 81,
      look: { base: 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif', bf: 'sepia(.4) saturate(1.3) hue-rotate(40deg) brightness(1.08)' },
      t: '胆小菇+大蒜：20 伤射击，僵尸靠近缩头；蒜味保护罩——被咬时本行全部僵尸都被驱赶到相邻两行' },
    // —— 机枪系补全 ——
    { type: 'fusion_gatlingpea_repeater', a: 'gatlingpea', b: 'repeater', name: '超级机枪', md: 88, rare: 'rare',
      look: { base: 'assets/images/Plants/GatlingPea/GatlingPea.gif', bf: 'saturate(1.3) brightness(1.1)' },
      t: '机枪射手+双发射手：6 连发豌豆 20×6 / 1.5s，单行火力巅峰；大技能【弹幕狂潮】——每 20 秒 8 连发急速弹幕' },
    { type: 'fusion_gatlingpea_cattail', a: 'gatlingpea', b: 'cattail', name: '机枪猫尾草', md: 96, rare: 'rare',
      look: { base: 'assets/images/Plants/Cattail/Cattail.gif',
              ov: 'assets/images/Plants/GatlingPea/GatlingPea.gif', ot: 'translate(-3px, -14px) scale(0.68)',
              oc: 'polygon(0 0, 100% 0, 100% 50%, 62% 50%, 60% 62%, 40% 62%, 38% 50%, 0 50%)' },
      t: '机枪射手+猫尾草：猫尾头顶架着加特林四管头（只取头部，不再是整株小苗），全场追踪 4 连发尖刺 20×4 / 1.4s；大技能【追踪弹幕】——每 18 秒 6 刺全场连射' },
    // v3.56.0：蒜香大嘴花删除（用户：直接取消掉）
    // —— 射手+地刺 ——
    { type: 'fusion_peashooter_spikeweed', a: 'peashooter', b: 'spikeweed', name: '射刺豌豆', md: 85,
      look: { base: 'assets/images/Plants/Peashooter/Peashooter.gif', bt: 'scale(1.12)', bf: 'sepia(.75) saturate(1.55) hue-rotate(-18deg) brightness(0.98)', ov: 'assets/images/Plants/Spikeweed/Spikeweed.gif', ot: 'translate(0px, 30px) scale(0.95)' },
      t: '豌豆射手+地刺：一株实打实的棕色豌豆射手（脚下生根地刺），射出带刺地刺弹 20，每射满 50 枚在本行随机空格布下一根地刺（技能）；大技能【尖刺爆发】——每 15 秒周身尖刺扎 60' },
    // —— v3.53.0 八条新融合（用户批准名单：低频植物提频 + 大喷菇/毁灭菇/钢地刺实用性补强）——
    { type: 'fusion_sunshroom_puffshroom', a: 'sunshroom', b: 'puffshroom', name: '阳光小喷菇', md: 71,
      look: { base: 'assets/images/Plants/PuffShroom/PuffShroom.gif', bf: 'sepia(1) saturate(2.6) hue-rotate(-8deg) brightness(1.25)' },
      t: '阳光菇+小喷菇：免费的蘑菇接上阳光菇——又能喷孢子（6×9/轮）又是产阳光大户（小粒 25，成熟后 40，比向日葵还多）；大技能【极寒波动】' },
    { type: 'fusion_threepeater_torchwood', a: 'threepeater', b: 'torchwood', name: '火焰三线', md: 80,
      look: { base: 'assets/images/Plants/Threepeater/Threepeater.gif', bf: 'sepia(1) saturate(2.6) hue-rotate(-22deg) brightness(1.12)' },
      t: '三线射手+火炬树桩：同时射上中下三行火豌豆 40×3——豌豆过火炬点燃的原版逻辑' },
    // v3.57.0：南瓜高坚果 / 冰雾大喷菇 / 冰毁灭菇删除（用户：技能凸显不足，直接取消）
    { type: 'fusion_gloomshroom_garlic', a: 'gloomshroom', b: 'garlic', name: '忧郁蒜雾', md: 112,
      look: { base: 'assets/images/Plants/GloomShroom/GloomShroom.gif', bf: 'sepia(.85) saturate(1.9) hue-rotate(-12deg) brightness(1.18)' },
      t: '忧郁菇+大蒜：通体金黄蒜色的 3×3 孢子绞肉机（与紫红忧郁菇一眼区分）——啃它的僵尸被辣得换行，绕到旁边照样被雾喷' },
    { type: 'fusion_hypnoshroom_sunflower', a: 'hypnoshroom', b: 'sunflower', name: '魅惑向日葵', md: 74,
      look: { base: 'assets/images/Plants/SunFlower/SunFlower1.gif', bf: 'hue-rotate(290deg) saturate(1.5) brightness(1.08)' },
      t: '魅惑菇+向日葵：正常产阳光 25/24s；僵尸把它的总血量吃光后，它会最后生产一大批阳光（5×25），把吃掉它的那只僵尸变成魅惑状态为你而战' },
    { type: 'fusion_spikerock_torchwood', a: 'spikerock', b: 'torchwood', name: '火焰钢刺', md: 85,
      look: { base: 'assets/images/Plants/Spikerock/Spikerock.gif', bf: 'sepia(1) saturate(2.6) hue-rotate(-22deg) brightness(1.15)' },
      t: '钢地刺+火炬树桩：烧红的钢刺 120/0.75s，踩上/啃到它的僵尸每秒再被烫 40；僵尸啃不到它，只有冰车能碾' },
];
window.PVZ_FUSION_EXTRA = PVZ_FUSION_EXTRA;
// 外观表（Plant.js 场上渲染 / HelpGuide 图鉴 / 罐内预览共用）
window.PVZ_FUSION_LOOK = {};
PVZ_FUSION_EXTRA.forEach(f => { window.PVZ_FUSION_LOOK[f.type] = Object.assign({ md: f.md }, f.look); });
// 【极寒波动】冰系家族大技能名单（v3.50.0）
window.PVZ_ICE_ULT_TYPES = new Set([
    'fusion_icekernel', 'fusion_snow_cattail', 'fusion_gloomsnow', 'fusion_gatlingsnow',
    'fusion_snowpea_starfruit', 'fusion_snownut', 'fusion_wintermelon_cattail',
    'fusion_repeater_snowpea', 'fusion_threepeater_snowpea', 'fusion_splitpea_snowpea',
    'fusion_puffshroom_snowpea', 'fusion_garlic_snowpea', 'fusion_sunflower_iceshroom',
    'fusion_wintermelon_torchwood', 'fusion_wintermelon_cabbagepult', 'fusion_icecabbage'
]);

// ============================================================================
// v3.74.0 防具掉落物系统 —— v3.80.3 整体删除（用户：掉落物和掉落融合株都太难看）
// ============================================================================

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.entityLayer = document.getElementById('entity-layer');
        
        this.lastTime = 0;
        this.entities = []; 
        
        this.sunCount = 50;
        this.sunCountElement = document.getElementById('sun-count');
        
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
        
        this.fusionMode = false;
        this.vaseMode = false; // 砸罐子模式标志（v3.4.1 修复：此前从未被赋值，导致砸罐模式无法启动）
        this.zombieMode = false; // 我是僵尸模式标志（v3.7.0）
        this.zombieDifficulty = null; // 我是僵尸难度: 'easy' | 'hard' | 'hell'
        this.pendingZombie = null;    // 我是僵尸：当前选中的僵尸卡 type（点草坪行释放）
        this.zBrainEls = [];          // 每行左端"脑子" DOM
        this.vaseFreeCards = []; // 砸罐子：植物罐砸出的免费一次性植物卡 {type, element, consumed}
        this.vaseDifficulty = null; // 砸罐子难度: 'easy' 简单 | 'hard' 困难 | 'hell' 地狱（null 时按 hard 配置兜底）
        this._sigEl = null; // 战场左侧"区耀丁"署名 DOM（vase 模式专属）
        
        this.lastTime = 0;
        
        this.board = new Board(this);
        this.inputManager = new InputManager(this);
        this.waveManager = new WaveManager(this);
        this.collisionManager = new CollisionManager(this);
        this.audioManager = new AudioManager();
        
        this.skySunTimer = 0;
        this.skySunInterval = 8; 
        
        this.score = 0;
        this.cooldowns = {}; // Stores cooldown timers for plants
        this.iceTrails = []; // v3.40.0 冰车冰道：{row, col, el, ttl}
        this.gameSpeed = 1;
        
        this.initUI();
        this.showMenu();
        
        const speedBtn = document.getElementById('btn-speed');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => {
                if (this.gameSpeed === 1) this.gameSpeed = 2;
                else if (this.gameSpeed === 2) this.gameSpeed = 5;
                else this.gameSpeed = 1;
                speedBtn.innerText = `Speed: ${this.gameSpeed}x`;
            });
        }

        // ===== v3.43.0 左下角暂停键（经典/融合/砸罐子/我是僵尸通用）=====
        // 暂停时主循环只保留 rAF 心跳、不再执行 update() —— 攻击/效果/刷怪/冷却全部静止；
        // 全屏遮罩挡住一切点击输入，防止"暂停中偷种植物/偷砸罐"。
        this.paused = false;
        this._buildPauseUi();
        
        // 空格键：融合模式下快速切换 手 ↔ 融合手套（与点击 🧤 按钮等价，避免用鼠标点按钮、来回移动的繁琐操作）
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'Space') return;
            // v3.31.0：砸罐子手套同样用空格激活（此前 !this.fusionMode 把 vase 模式拦死）
            if (this.state !== 'PLAYING' || !(this.fusionMode || this.vaseMode)) return;
            if (this.paused) return; // v3.43.0 暂停中一切操作冻结
            // 选卡界面 / 开始菜单 / 融合图鉴弹窗打开时不响应
            const overlayOpen = (id) => {
                const el = document.getElementById(id);
                return !!el && el.style.display !== 'none' && el.style.display !== '';
            };
            if (overlayOpen('seed-chooser') || overlayOpen('start-menu') || overlayOpen('recipe-modal')) return;
            e.preventDefault(); // 阻止空格滚动页面
            if (!e.repeat) this.toggleGlove(); // 按住不放只触发一次
        });

        // ===== v3.24.0 玉米加农炮：M 键发射（瞄准模式中）=====
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'KeyM' || e.repeat) return;
            if (this.state !== 'PLAYING' || !this.aimingCob) return;
            if (this.paused) return; // v3.43.0 暂停中一切操作冻结
            const overlayOpen = (id) => {
                const el = document.getElementById(id);
                return !!el && el.style.display !== 'none' && el.style.display !== '';
            };
            if (overlayOpen('seed-chooser') || overlayOpen('start-menu') || overlayOpen('recipe-modal')) return;
            e.preventDefault();
            this.fireCobCannon();
        });

        // v3.24.0：瞄准模式中准星跟随鼠标（记录草坪坐标系坐标供发射用）
        document.addEventListener('mousemove', (e) => {
            if (!this._cobCrosshair) return;
            const rect = this.container.getBoundingClientRect();
            const scale = window.gameScale || 1;
            const mx = (e.clientX - rect.left) / scale;
            const my = (e.clientY - rect.top) / scale;
            this._cobCrosshair.style.left = mx + 'px';
            this._cobCrosshair.style.top = my + 'px';
            this._cobAimPos = { x: mx, y: my };
        });
    }
    
    updateScore() {
        const scoreEl = document.getElementById('score-count');
        if (scoreEl) {
            scoreEl.innerText = this.score;
        }
        
        // Trigger event on milestone (融合进化/我是僵尸模式关闭全局随机事件)
        if (!this.fusionMode && !this.zombieMode && this.scoreMilestones && this.scoreMilestones.length > 0) {
            if (this.score >= this.scoreMilestones[0]) {
                this.scoreMilestones.shift(); // Remove the reached milestone
                this.eventTimer = 120 + Math.random() * 60; // Reset time-based timer so they don't overlap
                this.triggerRandomEvent();
            }
        }
    }
    
    showMenu() {
        const menu = document.getElementById('start-menu');
        const btnAdv = document.getElementById('btn-adventure');
        const btnFusion = document.getElementById('btn-fusion');
        const btnVase = document.getElementById('btn-vase');
        const btnZombie = document.getElementById('btn-zombie');
        
        btnAdv.onclick = () => {
            this.audioManager.play('btn');
            menu.style.display = 'none';
            this.fusionMode = false;
            this.vaseMode = false;
            this.zombieMode = false;
            this.showSeedChooser();
        };
        
        btnFusion.onclick = () => {
            this.audioManager.play('btn');
            menu.style.display = 'none';
            this.fusionMode = true;
            this.vaseMode = false;
            this.zombieMode = false;
            this.showSeedChooser();
        };
        
        // 砸罐子：先弹难度选择（简单/困难/地狱），选定后免选卡直接开局
        btnVase.onclick = () => {
            this.audioManager.play('btn');
            this._openVaseDifficulty();
        };

        // 我是僵尸（v3.7.0）：同样先弹三档难度，选定后免选卡直接开局
        if (btnZombie) {
            btnZombie.onclick = () => {
                this.audioManager.play('btn');
                this._openZombieDifficulty();
            };
        }

        // 难度选择弹窗按钮绑定（HTML 静态节点，仅绑定一次）
        const dModal = document.getElementById('difficulty-modal');
        const bindDiff = (id, diff) => {
            const b = document.getElementById(id);
            if (b) b.onclick = () => this._chooseVaseDifficulty(diff);
        };
        bindDiff('diff-easy', 'easy');
        bindDiff('diff-hard', 'hard');
        bindDiff('diff-hell', 'hell');
        const dBack = document.getElementById('diff-back');
        if (dBack) {
            dBack.onclick = () => {
                this.audioManager.play('btn');
                if (dModal) dModal.style.display = 'none'; // 返回主菜单
            };
        }

        // 我是僵尸难度弹窗按钮（HTML 静态节点，仅绑定一次）
        const zModal = document.getElementById('zdiff-modal');
        const bindZDiff = (id, diff) => {
            const b = document.getElementById(id);
            if (b) b.onclick = () => this._chooseZombieDifficulty(diff);
        };
        bindZDiff('zdiff-easy', 'easy');
        bindZDiff('zdiff-hard', 'hard');
        bindZDiff('zdiff-hell', 'hell');
        const zBack = document.getElementById('zdiff-back');
        if (zBack) {
            zBack.onclick = () => {
                this.audioManager.play('btn');
                if (zModal) zModal.style.display = 'none'; // 返回主菜单
            };
        }
    }

    // ===== 砸罐子难度选择（v3.5.0）：简单 / 困难 / 地狱 =====
    _openVaseDifficulty() {
        const modal = document.getElementById('difficulty-modal');
        if (!modal) { this._beginVaseGame(); return; } // 兜底：找不到弹窗直接开默认局
        modal.style.display = 'flex';
    }

    _chooseVaseDifficulty(diff) {
        this.vaseDifficulty = diff; // 'easy' | 'hard' | 'hell'
        this._beginVaseGame();
    }

    // 统一开局入口：隐藏菜单/选卡/难度弹窗 → 进入 vase 模式
    _beginVaseGame() {
        this.audioManager.play('btn');
        const menu = document.getElementById('start-menu');
        if (menu) menu.style.display = 'none';
        const chooser = document.getElementById('seed-chooser');
        if (chooser) chooser.style.display = 'none';
        const modal = document.getElementById('difficulty-modal');
        if (modal) modal.style.display = 'none';
        this.fusionMode = false;
        this.vaseMode = true;
        this.zombieMode = false;
        this.selectedSeeds = [];
        // v3.50.0：砸罐子模式鼠标变成木锤（用户：鼠标移过去/拿着木锤砸罐子）
        // v3.51.1：光标改用锤子僵尸手上的原版小木锤（assets/.../Hammer.png），热点=锤头(3,3)
        // v3.55.0：改"只在罐子上出现"（用户：全场都出锤子不太好，HelpGuide 一直承诺的就是悬停罐子才变锤）
        //   + 运行时 canvas 2x 放大（用户：太小；原素材 30×34 → 光标 60×68，热点=锤头(6,6)）。
        //   光标数据 URL 预生成于 _vaseHammerData，由 InputManager.mousemove 动态套用/还原
        // v3.63.0：改用直杆锤 HammerStraight.png（用户：杆儿不是直的；头横平/柄竖直重组素材，
        //   22×38 → 光标 44×76，热点=锤头底面中心(11,13)）
        const c0 = this.container;
        this._vaseHammerData = null;
        {
            const hi = new Image();
            hi.onload = () => {
                const S = 2;
                const cv = document.createElement('canvas');
                cv.width = hi.naturalWidth * S;
                cv.height = hi.naturalHeight * S;
                cv.getContext('2d').drawImage(hi, 0, 0, cv.width, cv.height);
                this._vaseHammerData = { url: cv.toDataURL('image/png'), hx: 11 * S, hy: 13 * S };
            };
            hi.src = 'assets/images/Zombies/HammerZombie/HammerStraight.png?v=' + this.assetStamp();
        }
        if (c0) c0.style.cursor = 'default';
        this.startGame();
    }

    // ===== 我是僵尸模式（I, ZOMBIE）v3.7.0 =====
    // 玩家扮演僵尸：用阳光购买/释放僵尸从右往左进攻，啃穿植物防线、吃到最左端脑子即通关。
    // 敌阵 = 开局随机种满左 6 列(col0~5)的基础植物（绝无融合植物），右 3 列是僵尸出生推进区。
    // 三档难度：初始阳光(600/400/250) + 僵尸解锁(3/5/7 种) + 敌阵强度(温和/标准/凶悍)。
    _openZombieDifficulty() {
        const modal = document.getElementById('zdiff-modal');
        if (!modal) { this._beginZombieGame(); return; } // 兜底：找不到弹窗直接开默认局
        modal.style.display = 'flex';
    }

    _chooseZombieDifficulty(diff) {
        this.zombieDifficulty = diff; // 'easy' | 'hard' | 'hell'
        this._zDiffCfgCache = null;   // v3.13.3：新一局重新掷骰（舞王低频等按局随机项）
        this._beginZombieGame();
    }

    // 统一开局入口：隐藏各层 → 进入 zombie 模式
    _beginZombieGame() {
        this.audioManager.play('btn');
        const menu = document.getElementById('start-menu');
        if (menu) menu.style.display = 'none';
        const chooser = document.getElementById('seed-chooser');
        if (chooser) chooser.style.display = 'none';
        const modal = document.getElementById('zdiff-modal');
        if (modal) modal.style.display = 'none';
        const dModal = document.getElementById('difficulty-modal');
        if (dModal) dModal.style.display = 'none';
        this.fusionMode = false;
        this.vaseMode = false;
        this.zombieMode = true;
        this.selectedSeeds = [];
        this.startGame();
    }

    // 僵尸阳光价目（用户确认的原版风格价目）
    // v3.8.1 调价：舞王(召唤免费伴舞)与冰车(无视植物直接碾碎)强度显著高于橄榄球，
    // 却比橄榄球便宜 → 按强度重排：橄榄球 225→200，舞王 175→250，冰车 200→250。
    zombiePrice() {
        // v3.65.0：特殊池定价 —— 坚果头(肉盾)100 / 寒冰头(免疫炸弹)150 / 辣椒头(啃完炸株)125 /
        // 盲盒(开出随机僵尸,赌局)100 / 巨人(碾压)300
        return { normal: 50, conehead: 75, polevaulting: 75, newspaper: 100, buckethead: 125,
                 screendoor: 200, football: 200, dancing: 250, zomboni: 250,
                 nuthead: 100, snowpeahead: 150, jalapenohead: 125, mysterybox: 100, gargantuar: 300 };
    }
    zombieName(type) {
        return { normal: '普通僵尸', conehead: '路障僵尸', polevaulting: '撑杆僵尸', newspaper: '读报僵尸', // v3.44.0 撑杆统一（跳跳僵尸称呼取消）
                 buckethead: '铁桶僵尸', dancing: '舞王僵尸', screendoor: '铁门僵尸',
                 football: '橄榄球僵尸', zomboni: '冰车僵尸',
                 nuthead: '坚果头僵尸', snowpeahead: '寒冰头僵尸', jalapenohead: '火爆辣椒头僵尸',
                 mysterybox: '盲盒僵尸', gargantuar: '巨人僵尸' }[type] || type;
    }
    // 僵尸卡面素材：与 Zombie.js 构造函数使用同一目录（大小写敏感部署环境必须精确）
    zombieImg(type) {
        return {
            normal: 'assets/images/Zombies/Zombie/Zombie.gif',
            conehead: 'assets/images/Zombies/ConeheadZombie/ConeheadZombie.gif',
            polevaulting: 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombie.gif',
            newspaper: 'assets/images/Zombies/NewspaperZombie/HeadWalk1.gif',
            buckethead: 'assets/images/Zombies/BucketheadZombie/BucketheadZombie.gif',
            dancing: 'assets/images/Zombies/DancingZombie/DancingZombie.gif',
            screendoor: 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif',
            football: 'assets/images/Zombies/FootballZombie/FootballZombie.gif',
            zomboni: 'assets/images/Zombies/Zomboni/1.gif',
            // v3.65.0 特殊池：植物头僵尸直接用头顶植物立绘做卡面，巨人沿用图鉴的僵尸大图
            nuthead: 'assets/images/Plants/WallNut/WallNut.gif',
            snowpeahead: 'assets/images/Plants/SnowPea/SnowPea.gif',
            jalapenohead: 'assets/images/Plants/Jalapeno/Jalapeno.gif',
            mysterybox: 'assets/images/Plants/PlantBox/GiftBox.png',
            gargantuar: 'assets/images/Zombies/Zombie/Zombie.gif'
        }[type];
    }

    // 三档难度配置：初始阳光 + 解锁僵尸种类（PVZ1 白昼原版池，无任何融合专属僵尸）
    // v3.8.0 降难度：地狱模式新增两种"破阵型"僵尸（舞王僵尸召唤伴舞、冰车僵尸直接碾碎植物），
    // 让玩家在 250 阳光的紧开局里有更强的破局手段。
    // v3.13.3：困难档 30% 概率解锁舞王僵尸（用户要求"10 局出现 3 局顶天"的低频强力僵尸）；
    // 配置对象每局只生成一次（_zDiffCfgCache，选难度时清空），保证一局内卡带/敌阵/出怪一致。
    _zombieDiffCfg() {
        if (this._zDiffCfgCache) return this._zDiffCfgCache;
        const d = this.zombieDifficulty || 'easy';
        const map = {
            // v3.56.0：三档难度微降（用户"我是僵尸的难度微微调低一点"）——初始阳光上调
            easy: { key: 'easy', label: '简单', sun: 650, plantTier: 0,
                unlock: ['normal', 'conehead', 'polevaulting'] },
            hard: { key: 'hard', label: '困难', sun: 480, plantTier: 1,
                unlock: ['normal', 'conehead', 'polevaulting', 'newspaper', 'buckethead'] },
            // v3.42.0：地狱加难（用户"有点简单"）——初始阳光 250→200；v3.56.0 微调回 280
            hell: { key: 'hell', label: '地狱', sun: 280, plantTier: 2,
                unlock: ['normal', 'conehead', 'polevaulting', 'newspaper', 'buckethead'] }
        };
        const cfg = map[d] || map.easy;
        if (cfg.key === 'hard' && Math.random() < 0.3) {
            cfg.unlock = cfg.unlock.concat(['dancing']); // 困难档低频舞王
        }
        // v3.17.0：特殊僵尸常驻 —— 地狱档 铁门/橄榄球/冰车 每局全在卡带上；
        // 困难档 铁门/橄榄球 常驻（此前 30% 掷骰，玩家反馈"地狱少了冰车和橄榄球"）
        if (cfg.key === 'hard' || cfg.key === 'hell') {
            cfg.unlock = cfg.unlock.concat(['screendoor', 'football']);
            if (cfg.key === 'hell') cfg.unlock = cfg.unlock.concat(['zomboni']);
            // v3.65.0：每局从特殊池随机刷新 1 只上架卡带（坚果头/寒冰头/火爆辣椒头/盲盒/巨人），
            // 与原有那些僵尸同场在售（每局只掷一次，一局内卡带固定）
            const SPECIALS = ['nuthead', 'snowpeahead', 'jalapenohead', 'mysterybox', 'gargantuar'];
            cfg.specialZombie = SPECIALS[Math.floor(Math.random() * SPECIALS.length)];
            cfg.unlock = cfg.unlock.concat([cfg.specialZombie]);
        }
        this._zDiffCfgCache = cfg;
        return cfg;
    }

    // 顶部僵尸卡带：按难度解锁池生成（点击选中 → 点草坪行释放）
    buildZombieBank() {
        const bank = document.getElementById('zombie-bank');
        if (!bank) return;
        bank.innerHTML = '';
        const cfg = this._zombieDiffCfg();
        const price = this.zombiePrice();
        cfg.unlock.forEach(type => {
            const card = document.createElement('div');
            card.className = 'zcard';
            card.dataset.type = type;
            card.dataset.cost = price[type];
            const img = document.createElement('img');
            img.src = this.zombieImg(type);
            const nm = document.createElement('span'); nm.className = 'z-name'; nm.textContent = this.zombieName(type);
            const cs = document.createElement('span'); cs.className = 'z-cost'; cs.textContent = price[type];
            card.appendChild(img); card.appendChild(nm); card.appendChild(cs);
            bank.appendChild(card);
        });
        // v3.65.0：本局随机上架的特殊僵尸播报一次
        if (cfg.specialZombie) {
            this.showAnnouncement(`🎲 本局特殊僵尸上架：${this.zombieName(cfg.specialZombie)}！`, '#c8a2ff');
        }
        this._refreshZombieBank();
    }

    // 阳光变化后刷新僵尸卡可买态 + 选中高亮
    _refreshZombieBank() {
        const cards = document.querySelectorAll('#zombie-bank .zcard');
        const price = this.zombiePrice();
        cards.forEach(c => {
            const affordable = this.sunCount >= price[c.dataset.type];
            c.classList.toggle('disabled', !affordable);
            c.classList.toggle('selected', c.dataset.type === this.pendingZombie);
        });
    }

    // 僵尸被吃植物奖/扣阳光等场景统一刷新（UI 与卡带）
    _syncZombieSunUI() {
        this.sunCountElement.innerText = this.sunCount;
        this._refreshZombieBank();
    }

    // 吃掉经济植物的奖励（僵尸模式）：被僵尸啃死 → 向日葵 +200 / 双子 +500 / 阳光菇 +450
    zombieEatSunflowerReward(plantType) {
        const gain = { sunflower: 200, twinsunflower: 500, sunshroom: 450 }[plantType] || 200;
        this.sunCount += gain;
        this._syncZombieSunUI();
        this.audioManager.play('sun');
        this._zombieFloatText(`+${gain} 阳光`, plantType === 'twinsunflower' ? '#ffd54a' : '#ffe45c');
    }

    // 飘字（奖励/提示），自动上浮消失
    _zombieFloatText(text, color, x, y) {
        const el = document.createElement('div');
        el.className = 'z-float';
        el.textContent = text;
        el.style.color = color || '#ffe45c';
        const cx = (x !== undefined) ? x : (this.board.offsetX + this.board.cols * this.board.cellWidth / 2);
        const cy = (y !== undefined) ? y : 150;
        el.style.left = cx + 'px';
        el.style.top = cy + 'px';
        this.container.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = 'translateY(-34px)';
            el.style.opacity = '0';
        });
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1250);
    }

    // 每行左端(房子口)摆一个"脑子"。v3.7.1 起：必须吃光全部 5 行脑子才通关（不再是一路吃脑即胜）
    _spawnBrainEls() {
        this._clearBrainEls();
        this._brainEaten = new Array(this.board.rows).fill(false); // 各行脑子是否已被吃掉
        for (let r = 0; r < this.board.rows; r++) {
            const b = document.createElement('div');
            b.className = 'z-brain';
            b.dataset.row = r;
            b.textContent = '🧠';
            b.style.left = (this.board.offsetX - 10) + 'px';   // col0 左缘（房子口），僵尸啃到 x<40 即吃脑
            b.style.top = (this.board.offsetY + r * this.board.cellHeight + this.board.cellHeight / 2 - 10) + 'px';
            this.entityLayer.appendChild(b);
            this.zBrainEls.push(b);
        }
    }
    _clearBrainEls() {
        this.zBrainEls.forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el); });
        this.zBrainEls = [];
        this._brainEaten = null;
    }

    // 僵尸到达最左端(x<40) → 吃掉该行脑子。全部 5 行吃光才通关（v3.7.1）
    // 吃脑后的僵尸立即退场（isDead → GameLoop 统一回收 DOM/数组项）
    zombieEatBrain(row, zombie) {
        if (this.state !== 'PLAYING' || !this.zombieMode) return;
        if (!this._brainEaten) this._brainEaten = new Array(this.board.rows).fill(false);
        // v3.79.0：吃脑退场统一"原地淡出 0.4s 再回收"——旧版直接 isDead 闪没，
        // 植物头僵尸看起来像"头凭空悬在原地"（用户实测怪异）。淡出期间 state=DYING 冻结行动。
        const exitZombie = (z) => {
            if (!z || z.isDead) return;
            if (z.headEl) { z.headEl.style.transition = 'opacity 0.4s ease-in'; z.headEl.style.opacity = '0'; }
            if (z.element) { z.element.style.transition = 'opacity 0.4s ease-in'; z.element.style.opacity = '0'; }
            z.state = 'DYING';
            setTimeout(() => { z.isDead = true; }, 420);
        };
        if (row < 0 || row >= this.board.rows) { exitZombie(zombie); return; }
        // 该行脑子已被吃（同行后续僵尸走到左端）：直接退场，不重复计分
        if (this._brainEaten[row]) { exitZombie(zombie); return; }

        this._brainEaten[row] = true;
        const el = this.zBrainEls[row];
        if (el && el.parentNode) el.parentNode.removeChild(el);
        this.score += 100;
        if (this.updateScore) this.updateScore();
        this.audioManager.play('chomp');
        exitZombie(zombie); // 吃掉脑子后僵尸淡出退场

        const eaten = this._brainEaten.filter(Boolean).length;
        const total = this.board.rows;
        this._zombieFloatText(`🧠 ${eaten}/${total}`, '#ff8fa3');
        if (eaten >= total) {
            this.zombieWin(); // 吃光全部脑子 → 通关
        } else {
            this.showAnnouncement(`吃掉一个脑子！还剩 ${total - eaten} 个（共 ${total} 个）`, '#ff8fa3');
        }
    }

    // ===== 敌阵生成：左 6 列(col0~5) 每格随机一种基础植物（绝无融合植物）=====
    // 按难度 tier 选植物池：tier0 温和 / tier1 标准 / tier2 最凶。
    // v3.7.2 降难度（玩家反馈困难、地狱过难）三道并施：
    //   ① 池子里"机枪射手级"的凶植物大量换成"豌豆射手级"，每档只留少数硬骨头（不全部替换）；
    //   ② 移除 高坚果(8000 HP)：它坐在阵前时僵尸要啃 160s，是"一株都推不动"的头号元凶；
    //   ③ 逐行限流：每行射手 ≤ cap(简单1/困难2/地狱3)、坚果墙 ≤1 ——
    //      把"一行 6 株全是火力"改成"火力 + 经济 + 少量肉盾"的合理配比。
    // 每行保底：至少 1 株攻击类；全局向日葵 ≥3 株(玩家回本来源)。
    // 不含"种下即炸"的樱桃炸弹/火爆辣椒/寒冰菇/毁灭菇（原版 I,Zombie 敌阵本就没有，
    // 且它们会在开局自爆消失 → 空格子）；陷阱类(土豆雷/窝瓜)全局 ≤3。
    setupZombieEnemies() {
        const cfg = this._zombieDiffCfg();
        const pools = [
            { // tier 0 简单：基础射手 + 少量肉盾
                sunflower: 20, peashooter: 22, snowpea: 8, wallnut: 8, chomper: 3,
                potatomine: 4, squash: 2, threepeater: 2, repeater: 3, spikeweed: 6, garlic: 3,
                torchwood: 2, cabbagepult: 3, kernelpult: 3
            },
            { // tier 1 困难：豌豆/坚果为中坚，只留少量西瓜投手与火炬树桩当"硬骨头"
                // v3.12.0：加入 猫尾草/冰西瓜/忧郁菇/小喷菇/胆小菇/阳光菇/南瓜套
                sunflower: 18, peashooter: 28, snowpea: 12, wallnut: 10, chomper: 4,
                potatomine: 4, squash: 2, threepeater: 6, repeater: 8, splitpea: 3, spikeweed: 5,
                torchwood: 2, melonpult: 1, garlic: 3, cabbagepult: 4, kernelpult: 4,
                cattail: 2, wintermelon: 1, gloomshroom: 3, puffshroom: 6,
                scaredyshroom: 4, sunshroom: 5, pumpkinhead: 3, doomshroom: 2,
                fumeshroom: 2, starfruit: 1, gatlingpea: 1, spikerock: 1, tallnut: 1, hypnoshroom: 1
            },
            { // tier 2 地狱：仍是三档里最凶，但不再是"无解"
                // v3.14.0：用户要求"加入全部的植物"——机枪射手/大喷菇/杨桃/钢地刺/高坚果/魅惑菇
                // 以极低权重回归（强植物低频）；种下即爆的 樱桃/辣椒/寒冰 仍不入池（开局自爆白给），
                // 毁灭菇以陷阱形态入池（v3.13.3）；保留 西瓜投手(溅射)/火炬树桩(增伤)/寒冰射手(减速)
                // v3.10.0：加入 卷心菜投手/玉米投手 —— 它们破甲+黄油定身，是对装甲流的克制点
                // v3.12.0：加入 猫尾草/冰西瓜/忧郁菇/小喷菇/胆小菇/阳光菇/南瓜套
                // v3.42.0：强植物权重整体上调（机枪2/冰西瓜2/猫尾草3/忧郁菇4/钢地刺2/高坚果2/
                // 陷阱毁灭菇3/杨桃2/魅惑菇2）—— 地狱敌阵更凶
                sunflower: 16, twinsunflower: 2, peashooter: 26, snowpea: 12, wallnut: 10,
                chomper: 3, potatomine: 4, squash: 3, threepeater: 6, repeater: 8, splitpea: 3,
                spikeweed: 5, torchwood: 2, melonpult: 2, garlic: 4, cabbagepult: 4, kernelpult: 4,
                cattail: 3, wintermelon: 2, gloomshroom: 4, puffshroom: 6,
                scaredyshroom: 4, sunshroom: 5, pumpkinhead: 3, doomshroom: 3,
                fumeshroom: 2, starfruit: 2, gatlingpea: 2, spikerock: 2, tallnut: 2, hypnoshroom: 2
            }
        ];
        const pool = pools[cfg.plantTier] || pools[0];

        // 全类型射手（含本档池子里没有的，仅用于"是不是射手"的判断）
        const isShooter = t => ['peashooter', 'snowpea', 'threepeater', 'repeater', 'splitpea', 'gatlingpea',
            'melonpult', 'wintermelon', 'starfruit', 'gloomshroom', 'fumeshroom', 'cattail',
            'cabbagepult', 'kernelpult'].includes(t);
        const isWall = t => t === 'wallnut' || t === 'tallnut' || t === 'pumpkinhead';
        // v3.42.0：地狱每行射手上限 3→4（火力密度大幅提升）
        const maxShootersPerRow = { 0: 1, 1: 2, 2: 4 }[cfg.plantTier];
        const maxWallsPerRow = 1;

        // 构建加权候选（过滤任何 fusion_ 类型与 plantern；
        // pumpkinhead v3.12.0 入阵；v3.13.0 起落位时改为套在同行植物头上，见落地前转换）
        const types = Object.keys(pool).filter(t =>
            !t.startsWith('fusion_') && t !== 'plantern'
        );
        const pickFrom = (list) => {
            const total = list.reduce((s, t) => s + pool[t], 0);
            let r = Math.random() * total;
            for (const t of list) { r -= pool[t]; if (r <= 0) return t; }
            return list[0] || 'sunflower';
        };

        // 保证每次开局干净
        const zombieEnemies = this.entities.filter(e => e._zombieEnemy);
        zombieEnemies.forEach(e => { if (e.element && e.element.parentNode) e.element.parentNode.removeChild(e.element); });

        // 逐行生成（射手/墙体限流，防止一行 6 株全是火力把僵尸秒在阵前）
        const gridPlan = [];
        for (let r = 0; r < this.board.rows; r++) {
            const row = [];
            let nShooters = 0, nWalls = 0;
            for (let c = 0; c < 6; c++) {
                const allowed = types.filter(t =>
                    !(isShooter(t) && nShooters >= maxShootersPerRow) &&
                    !(isWall(t) && nWalls >= maxWallsPerRow));
                const t = allowed.length ? pickFrom(allowed) : pickFrom(types);
                if (isShooter(t)) nShooters++;
                if (isWall(t)) nWalls++;
                row.push(t);
            }
            gridPlan.push(row);
        }
        // 全局修正：阳光植物（向日葵/阳光菇/双子向日葵）数量按难度定档 ——
        // v3.25.0（用户指定）：简单 ~10 / 困难 7~9 / 地狱 3~5（旧版三档均保底 3，地狱偏低）
        const sunKinds = ['sunflower', 'sunshroom', 'twinsunflower'];
        const countSun = () => gridPlan.flat().filter(x => sunKinds.includes(x)).length;
        const sunRange = { 0: [9, 11], 1: [7, 9], 2: [3, 5] }[cfg.plantTier] || [3, 5];
        const sunTarget = sunRange[0] + Math.floor(Math.random() * (sunRange[1] - sunRange[0] + 1));
        let sunGuard = 0;
        while (countSun() < sunTarget && sunGuard++ < 300) {
            const rr = Math.floor(Math.random() * 5), cc = Math.floor(Math.random() * 6);
            if (!sunKinds.includes(gridPlan[rr][cc])) {
                gridPlan[rr][cc] = (cfg.plantTier === 2 && Math.random() < 0.25) ? 'twinsunflower'
                    : (Math.random() < 0.35 ? 'sunshroom' : 'sunflower');
            }
        }
        sunGuard = 0;
        while (countSun() > sunTarget && sunGuard++ < 300) {
            const rr = Math.floor(Math.random() * 5), cc = Math.floor(Math.random() * 6);
            if (sunKinds.includes(gridPlan[rr][cc])) {
                gridPlan[rr][cc] = pickFrom(types);
            }
        }
        // 向日葵前移：把落在后三列(col0~2)的向日葵与同排前区(col3~5)的非向日葵对调。
        // 僵尸从右侧进攻 → 向日葵靠前 = 玩家啃到就能回本（该模式的核心经济来源），
        // 否则经济植物全埋在阵底，玩家永远攒不出第二个僵尸。
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c <= 2; c++) {
                if (!gridPlan[r][c].startsWith('sun') && !gridPlan[r][c].startsWith('twin')) continue;
                for (let fc = 5; fc >= 3; fc--) {
                    if (gridPlan[r][fc].startsWith('sun') || gridPlan[r][fc].startsWith('twin')) continue;
                    const tmp = gridPlan[r][fc];
                    gridPlan[r][fc] = gridPlan[r][c];
                    gridPlan[r][c] = tmp;
                    break;
                }
            }
        }
        // 陷阱/自毁类（土豆雷/窝瓜）全局 ≤3，防止整场都是陷阱
        const bombTypes = ['potatomine', 'squash'];
        let overBombs = gridPlan.flat().filter(x => bombTypes.includes(x)).length - 3;
        for (let r = 0; r < 5 && overBombs > 0; r++) {
            for (let c = 0; c < 6 && overBombs > 0; c++) {
                if (bombTypes.includes(gridPlan[r][c])) {
                    gridPlan[r][c] = pickFrom(types);
                    if (!bombTypes.includes(gridPlan[r][c])) overBombs--;
                }
            }
        }
        // 每行保底 1 攻击射手（防整行无输出）
        for (let r = 0; r < 5; r++) {
            if (!gridPlan[r].some(isShooter)) {
                const cc = Math.floor(Math.random() * 6);
                const good = types.filter(t => isShooter(t) && pool[t] >= 2);
                if (good.length) gridPlan[r][cc] = good[Math.floor(Math.random() * good.length)];
            }
        }
        // 最终限流兜底：上面的"向日葵补足 / 炸弹替换 / 射手保底"都可能把某行的射手或墙体
        // 又顶回上限之上，这里统一压回（超出的换成非射手非墙体），确保"一行不会 6 株全是火力"。
        const fillerTypes = types.filter(t => !isShooter(t) && !isWall(t));
        for (let r = 0; r < this.board.rows; r++) {
            let nSh = 0, nW = 0;
            for (let c = 0; c < 6; c++) {
                const t = gridPlan[r][c];
                if (isShooter(t)) { nSh++; if (nSh > maxShootersPerRow) gridPlan[r][c] = null; }
                else if (isWall(t)) { nW++; if (nW > maxWallsPerRow) gridPlan[r][c] = null; }
            }
            for (let c = 0; c < 6; c++) {
                if (gridPlan[r][c] === null) {
                    gridPlan[r][c] = fillerTypes.length ? pickFrom(fillerTypes) : 'sunflower';
                }
            }
        }

        // v3.25.0 行战力均衡：按战力权重把"一行小喷菇、另一行西瓜炮台"的极端分布拉平。
        // 只在同类之间跨行对调（射手↔射手 / 墙↔墙 / 其他↔其他），不破坏每行射手/墙体限额。
        {
            const powerMap = {
                peashooter: 2, snowpea: 3, repeater: 4, threepeater: 5, splitpea: 4, gatlingpea: 8,
                melonpult: 8, wintermelon: 10, cattail: 9, gloomshroom: 7, fumeshroom: 3, puffshroom: 1,
                scaredyshroom: 1, sunshroom: 1, sunflower: 1, twinsunflower: 2, wallnut: 2, tallnut: 5,
                pumpkinhead: 3, chomper: 5, potatomine: 4, squash: 4, spikeweed: 2, spikerock: 4,
                garlic: 2, torchwood: 3, cabbagepult: 4, kernelpult: 4, starfruit: 5, hypnoshroom: 4, doomshroom: 10
            };
            const pw = t => powerMap[t] || 3;
            const cat = t => isShooter(t) ? 's' : (isWall(t) ? 'w' : 'o');
            for (let iter = 0; iter < 80; iter++) {
                const rp = gridPlan.map(row => row.reduce((s, t) => s + pw(t), 0));
                let hi = 0, lo = 0;
                rp.forEach((p, i) => { if (p > rp[hi]) hi = i; if (p < rp[lo]) lo = i; });
                if (rp[hi] - rp[lo] <= 4) break;
                let bigC = -1, bigV = -1, smallC = -1, smallV = 1e9;
                for (let c = 0; c < 6; c++) {
                    const t = gridPlan[hi][c];
                    if (pw(t) > bigV) { bigV = pw(t); bigC = c; }
                }
                for (let c = 0; c < 6; c++) {
                    const t = gridPlan[lo][c];
                    if (pw(t) < smallV && pw(t) < bigV) { smallV = pw(t); smallC = c; }
                }
                if (bigC < 0 || smallC < 0) break;
                const A = gridPlan[hi][bigC], B = gridPlan[lo][smallC];
                if (cat(A) !== cat(B)) break; // 没有同类可换 → 放弃（限额优先于完美均衡）
                gridPlan[hi][bigC] = B;
                gridPlan[lo][smallC] = A;
            }
        }

        // v3.25.0 阳光数量校准：限流兜底/射手保底可能把计数顶偏，这里收敛回目标档
        {
            sunGuard = 0;
            while (countSun() > sunTarget && sunGuard++ < 300) {
                const rr = Math.floor(Math.random() * 5), cc = Math.floor(Math.random() * 6);
                if (sunKinds.includes(gridPlan[rr][cc])) gridPlan[rr][cc] = pickFrom(fillerTypes.length ? fillerTypes : types);
            }
            sunGuard = 0;
            while (countSun() < sunTarget && sunGuard++ < 300) {
                const rr = Math.floor(Math.random() * 5), cc = Math.floor(Math.random() * 6);
                if (!sunKinds.includes(gridPlan[rr][cc]) && !isShooter(gridPlan[rr][cc]) && !isWall(gridPlan[rr][cc])) {
                    gridPlan[rr][cc] = (cfg.plantTier === 2 && Math.random() < 0.25) ? 'twinsunflower'
                        : (Math.random() < 0.35 ? 'sunshroom' : 'sunflower');
                }
            }
        }

        // v3.13.0：南瓜套不再独立成株当"壳墙"（和坚果墙没有区别），
        // 改为套在同行另一株植物头上——南瓜套格转成 filler 植物，
        // 并给选中的宿主格打标，落地时 attachShield() 挂 4000 耐久的壳。
        const shellRows = [];
        for (let r = 0; r < this.board.rows; r++) shellRows.push(new Array(6).fill(false));
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < 6; c++) {
                if (gridPlan[r][c] !== 'pumpkinhead') continue;
                const cands = [];
                for (let cc = 0; cc < 6; cc++) {
                    const t = gridPlan[r][cc];
                    if (cc !== c && t && t !== 'pumpkinhead' && !shellRows[r][cc]) cands.push(cc);
                }
                if (cands.length) {
                    const host = cands[Math.floor(Math.random() * cands.length)];
                    shellRows[r][host] = true;
                    // v3.25.0：补格用"非阳光"填充 —— 阳光数量已在上面校准到难度档，
                    // 这里若再随机补进向日葵会突破 3~5 上限
                    const nonsunFiller = fillerTypes.filter(t => !sunKinds.includes(t));
                    gridPlan[r][c] = nonsunFiller.length ? pickFrom(nonsunFiller) : 'peashooter';
                }
                // 极端情况（整行找不到宿主）才保留独立成株兜底
            }
        }

        // ===== v3.77.0 可解性兜底（我是僵尸）：每行"持续射手"战力设上限 =====
        // 防止出现"该行火力超出玩家僵尸卡带预算"的必败行 —— 不用铲子/手套也能推动每一行。
        // 超限行把战力最高的射手降为豌豆射手（保持该行仍有攻击射手，与既有保底不冲突）。
        // 注意放在南瓜套转换之后：转换会把南瓜套格转成 filler（可能含射手），
        // 旧代码顺序在最终限流之前，存在顶超射手上限的连带漏洞 —— 这里一并收敛。
        {
            const shootPower = { peashooter: 2, snowpea: 3, repeater: 4, threepeater: 5, splitpea: 4,
                gatlingpea: 8, melonpult: 8, wintermelon: 10, cattail: 9, gloomshroom: 7,
                fumeshroom: 3, cabbagepult: 4, kernelpult: 4, starfruit: 5 };
            const cap = { 0: 6, 1: 14, 2: 22 }[cfg.plantTier] ?? 14;
            for (let r = 0; r < this.board.rows; r++) {
                let g2 = 0;
                while (g2++ < 20) {
                    const sp = gridPlan[r].reduce((s, t) => s + (shootPower[t] || 0), 0);
                    if (sp <= cap) break;
                    let bc = -1, bv = 0;
                    for (let c = 0; c < 6; c++) {
                        const p = shootPower[gridPlan[r][c]] || 0;
                        if (p > bv) { bv = p; bc = c; }
                    }
                    if (bc < 0 || bv <= 2) break; // 全是豌豆级了还超限（不可能）→ 放弃防死循环
                    gridPlan[r][bc] = 'peashooter';
                }
            }
        }

        // 落地：种到 col0~5（注意敌阵植物与玩家无关，直接 addPlant 逻辑实例化）
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < 6; c++) {
                const type = gridPlan[r][c];
                let plant = new Plant(this, type);
                // 防御：若该 type 在 getStats 里无素材分支（type 命名漂移），退回豌豆射手，
                // 避免敌阵出现"空格子"（v3.7.1 修复 potatoMine/fume 命名漂移的根因）
                if (!plant.element.getAttribute('src')) {
                    plant = new Plant(this, 'peashooter');
                }
                plant._zombieEnemy = true; // 标记为"敌方植物"（仅统计用）
                // 敌阵植物是"被动防御方"：禁止种下自动引爆（否则樱桃炸弹/毁灭菇等开局自爆消失，
                // 玩家会看到空格子）。保留 土豆雷/窝瓜 的"被接近/被踩才触发"机制（v3.7.1）
                plant.autoExplode = false;
                if (this.board.addPlant(plant, r, c)) {
                    // 种满 6 列(col0-5) = 30 株
                    // v3.13.0：该格被标记为南瓜套宿主 → 套上 4000 耐久的壳
                    if (shellRows[r][c]) plant.attachShield();
                    // v3.13.3：敌阵毁灭菇 = 陷阱 —— 开局 1 秒定时自爆会白白浪费，
                    // 关掉自爆引信，改为僵尸贴近同格时才起爆（见 Plant.update 的 _enemyTrap 分支）
                    if (type === 'doomshroom') {
                        // 重新启用自爆机器（v3.13.3）：_enemyTrap 分支只在僵尸贴脸时走引信倒计时，
                        // 不会出现 v3.7.1 担心的"开局定时自爆"——引信 1.0s 从开局一直冻着
                        plant.autoExplode = true;
                        plant._enemyTrap = true;
                    }
                }
            }
        }
    }

    // 顶栏难度角标（我是僵尸）
    // v3.35.0：恢复最原始的样子——角标回顶栏、文案带"我是僵尸 ·"前缀、顶栏 Speed 按钮归位。
    // （v3.33.0 的"挪去右上角 + 去前缀"只应作用于砸罐子模式，误伤了本模式）
    _syncZombieHud() {
        const old = document.getElementById('zombie-diff-chip');
        if (old && old.parentNode) old.parentNode.removeChild(old);
        if (!this.zombieMode) return;
        const cfg = this._zombieDiffCfg();
        const chip = document.createElement('div');
        chip.id = 'zombie-diff-chip';
        chip.className = 'diff-chip diff-' + cfg.key;
        chip.innerHTML = `我是僵尸 · ${cfg.label}<span class="diff-chip-en">${cfg.key.toUpperCase()}</span>`;
        chip.title = `我是僵尸 · ${cfg.label}难度`;
        const top = document.getElementById('top-bar');
        if (top) top.appendChild(chip);
    }

    // v3.35.0：Speed 按钮按模式归位 —— 我是僵尸=回顶栏末尾（原始位置）；
    // 其它模式（砸罐子/经典/融合）留在右上角 corner-hud（v3.33.0 用户指定布局）
    _layoutSpeedButton() {
        const btn = document.getElementById('btn-speed');
        if (!btn) return;
        const parent = this.zombieMode
            ? document.getElementById('top-bar')
            : document.getElementById('corner-hud');
        if (parent && btn.parentNode !== parent) parent.appendChild(btn);
    }

    // 玩家点击草坪行释放僵尸（InputManager 调用）；阳光不足/非行内返回
    deployZombie(type, row) {
        if (this.state !== 'PLAYING' || !this.zombieMode) return;
        if (row < 0 || row >= this.board.rows) return;
        const price = this.zombiePrice();
        if (!price[type]) return;
        if (this.sunCount < price[type]) {
            this.showAnnouncement('阳光不够，先啃向日葵攒阳光吧', '#ff8a5c');
            return;
        }
        this.sunCount -= price[type];
        this._syncZombieSunUI();
        const z = new Zombie(this, row, type);
        z._playerZombie = true; // 标记为我方僵尸（胜负检测用）
        this.entities.push(z);
        this.audioManager.play('plant');
        this.pendingZombie = null;
        this._refreshZombieBank();
    }

    // 胜利：全部 5 行脑子都被吃掉（zombieEatBrain 在吃光最后一行时调用）
    zombieWin() {
        if (this.state !== 'PLAYING') return;
        this.state = 'GAMEOVER';
        this._hidePauseUi(); // v3.43.0 结算时收起暂停 UI
        this.audioManager.stop('bgm');
        this.audioManager.play('win');
        const diffLabel = this._zombieDiffCfg().label;
        const total = this.board.rows;
        const overlay = document.createElement('div');
        overlay.className = 'vase-win-overlay';
        overlay.innerHTML = `
            <div class="vase-win-panel">
                <div class="vase-win-lv">ALL BRAINS EATEN!</div>
                <div class="vase-win-title">🧠 通关！</div>
                <div class="vase-win-sub">僵尸吃光了全部 ${total} 个脑子！<span class="vase-win-diff">难度 · ${diffLabel}</span></div>
                <div class="vase-win-score">Final Score：<b>${this.score}</b></div>
                <div class="vase-win-btns">
                    <button id="z-win-replay" class="vase-win-btn again">再玩一局</button>
                    <button id="z-win-exit" class="vase-win-btn exit">退出</button>
                </div>
            </div>`;
        this.container.appendChild(overlay);
        overlay.querySelector('#z-win-replay').onclick = () => this.restartZombieLevel();
        overlay.querySelector('#z-win-exit').onclick = () => location.reload();
        this._zombieEndEls = [overlay];
    }

    // 失败：我方僵尸全灭 + 阳光买不起任何僵尸（< 最便宜 50）
    zombieLose() {
        if (this.state !== 'PLAYING') return;
        this.state = 'GAMEOVER';
        this._hidePauseUi(); // v3.43.0 结算时收起暂停 UI
        this.audioManager.stop('bgm');
        this.audioManager.play('lose');
        const diffLabel = this._zombieDiffCfg().label;
        const overlay = document.createElement('div');
        overlay.className = 'vase-win-overlay';
        overlay.innerHTML = `
            <div class="vase-win-panel">
                <div class="vase-win-lv" style="color:#a04030;">ALL ZOMBIES DOWN</div>
                <div class="vase-win-title" style="color:#7a2a18;">僵尸大军覆没…</div>
                <div class="vase-win-sub">植物守住了脑子<span class="vase-win-diff">难度 · ${diffLabel}</span></div>
                <div class="vase-win-score">Final Score：<b>${this.score}</b></div>
                <div class="vase-win-btns">
                    <button id="z-lose-replay" class="vase-win-btn again">再玩一局</button>
                    <button id="z-lose-exit" class="vase-win-btn exit">退出</button>
                </div>
            </div>`;
        this.container.appendChild(overlay);
        overlay.querySelector('#z-lose-replay').onclick = () => this.restartZombieLevel();
        overlay.querySelector('#z-lose-exit').onclick = () => location.reload();
        this._zombieEndEls = [overlay];
    }

    // 每帧胜负检测（仅 zombieMode）：僵尸全灭 + 阳光 < 50 → 判负（给 2.5s 防抖动）
    _checkZombieEnd(dt) {
        if (this.state !== 'PLAYING') return;
        const hasMyZombie = this.entities.some(e =>
            e instanceof Zombie && !e.isDead && e.state !== 'DYING' && !e.hypnotized && e._playerZombie
        );
        if (hasMyZombie) { this._zLoseTimer = 0; return; }
        if (this.sunCount >= 50) { this._zLoseTimer = 0; return; }
        if (!this._zLoseTimer) this._zLoseTimer = 0;
        this._zLoseTimer += dt || (1 / 60);
        if (this._zLoseTimer >= 2.5) this.zombieLose();
    }

    // 再玩一局：清整场（脑子/敌阵植物/我方僵尸/子弹/阳光实体）后原地按同难度重开
    restartZombieLevel() {
        this.audioManager.play('btn');
        if (this._zombieEndEls) {
            this._zombieEndEls.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
            this._zombieEndEls = null;
        }
        this._clearBrainEls();
        this.entities.forEach(e => this._removeEntityDom(e));
        this.entities = [];
        this._hardSweepEntityLayer(); // v3.18.0：硬清场，孤儿 DOM 一律带走
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) this.board.grid[r][c] = null;
        }
        this.score = 0;
        this.pendingZombie = null;
        this._zLoseTimer = 0;
        this.updateScore();
        this.startGame();
    }

    // 三档难度的完整配置：罐子数量 / 类型抽签桶 / 问号罐出僵尸概率 / 植物罐出植物概率 / 僵尸池 / 僵尸血量倍率
    _vaseDiffCfg() {
        const d = this.vaseDifficulty || 'hard';
        const map = {
            easy: {
                key: 'easy', label: '简单', totalMin: 16, totalMax: 20,
                plantMin: 8, plantMax: 14, // v3.41.0 植物罐保底：可以很多但僵尸罐至少留 2 个
                bag: ['plant','plant','plant','plant','plant','plant','plant','plant','plant',
                      'question','question','question',
                      'zombie','zombie','zombie'], // 植物罐绝对多数 9/15=60%, 僵尸罐保有 3
                qZombie: 0.25,   // 简单: 问号罐仅 25% 出僵尸 —— 75% 是植物, 轻松友好
                qSun: 0.15,      // v3.43.0 问号罐 15% 直接开出一撮阳光(50) —— 图鉴承诺的"惊喜"正式实装
                pCard: 0.75,     // v3.16.0 植物罐 75% 植物 / 25% 阳光
                plantPerm: 0.85, // 植物罐砸出的植物 85% 永久 / 15% 一次性(炸弹)
                qPerm: 0.72,     // 问号罐砸出的植物 72% 永久 / 28% 一次性
                zPool: ['normal','normal','normal','normal','normal','normal','conehead','conehead','flag'],
                hpMul: 1.0
            },
            hard: {
                key: 'hard', label: '困难', totalMin: 22, totalMax: 26,
                plantMin: 5, plantMax: 9, // v3.62.0 植物罐保底 5~9（原 3~7；用户：困难比地狱还难，调低）
                bag: ['plant','plant','plant','plant','plant','plant','plant',
                      'question','question','question','question','question','question',
                      'zombie','zombie','zombie','zombie','zombie','zombie','zombie'], // v3.62.0 植物罐 +1（7/20）
                qZombie: 0.4,    // v3.62.0 困难: 问号罐 40% 僵尸 / 60% 植物（原 50/50）
                qSun: 0.12,      // v3.43.0 问号罐 12% 开出阳光(50)
                pCard: 0.75,   // v3.16.0 植物罐 75% 植物 / 25% 阳光
                plantPerm: 0.85, // v3.62.0 植物罐砸出的植物 85% 永久（原 80%）
                qPerm: 0.68,     // v3.62.0 问号罐砸出的植物 68% 永久 / 32% 一次性（原 62%）
                zPool: ['normal','normal','normal','normal','conehead','conehead','buckethead','flag','polevaulting','newspaper'],
                hpMul: 1.0 // v3.62.0 困难降难：血量倍率回 1.0（原 1.1；困难须明显低于地狱的 1.45）
            },
            hell: {
                key: 'hell', label: '地狱', totalMin: 26, totalMax: 28,
                plantMin: 1, plantMax: 5, // v3.41.0 植物罐保底 1~5：地狱的植物金贵
                bag: ['plant','plant',
                      'question','question','question','question','question','question','question','question','question','question','question','question','question',
                      'zombie','zombie','zombie','zombie','zombie','zombie'], // 问号罐拉满 14/20=70%, 才有地狱色彩
                qZombie: 0.6,    // 地狱: 问号罐 60% 僵尸 —— 僵尸偏多但 40% 保底是植物, 绝不是全僵尸
                qSun: 0.10,      // v3.43.0 问号罐 10% 开出阳光(50)
                pCard: 0.75,     // v3.16.0 植物罐 75% 植物 / 25% 阳光
                plantPerm: 0.9,  // 地狱植物金贵: 植物罐砸出的植物 90% 永久 / 10% 一次性
                qPerm: 0.72,     // 问号罐砸出的植物 72% 永久 / 28% 一次性
                zPool: ['normal','normal','normal','conehead','conehead','buckethead','buckethead','newspaper','polevaulting','flag','screendoor'],
                hpMul: 1.45      // v3.30.0 地狱加难：砸出僵尸血量 +45%（原 1.35）
            }
        };
        return map[d] || map.hard;
    }

    // v3.43.0：问号罐内容抽签独立成函数 —— 图鉴承诺的"阳光/植物/僵尸三选一"此前阳光从未实装。
    // 先按 qSun 掷阳光(50)，其余按 qZombie 出僵尸 / 兜底植物（概率语义与旧版一致，仅阳光分支新增）
    _rollQuestionVaseContent(cfg, col) {
        if (Math.random() < (cfg.qSun || 0)) return { kind: 'sun', value: 50 };
        if (Math.random() < cfg.qZombie) return { kind: 'zombie', type: this._rollVaseZombieType(col, true) }; // v3.23.0 问号罐禁高级三杰
        return { kind: 'plant', type: this._rollVasePlantContent('question') };
    }

    showSeedChooser() {
        const chooser = document.getElementById('seed-chooser');
        const grid = document.getElementById('chooser-grid');
        const countSpan = document.getElementById('chooser-count');
        const btnRock = document.getElementById('btn-lets-rock');
        
        chooser.style.display = 'flex';
        this.selectedSeeds = []; // Will store the selected seed objects
        grid.innerHTML = '';
        
        // v3.49.0：恢复 v3.46.x 的融合选卡袋——只保留 18 张基础牌（用户回退要求）；
        // 其余植物通过融合/进化获得，独特融合体靠手套配方
        const fusionBasePlants = ['sunflower', 'peashooter', 'wallnut', 'cherrybomb', 'squash',
            'jalapeno', 'potatomine', 'chomper', 'tallnut', 'puffshroom',
            'iceshroom', 'doomshroom', 'spikeweed', 'garlic', 'melonpult',
            'cabbagepult', 'kernelpult', 'plantbox'];
        const seedList = this.fusionMode
            ? this.seeds.filter(s => fusionBasePlants.includes(s.type))
            : this.seeds;
        
        seedList.forEach(s => {
            const card = document.createElement('div');
            card.className = 'chooser-card';
            card.dataset.type = s.type; // 便于模式自检/自动化断言（v3.10.0）
            card.style.backgroundImage = `url('${s.img}')`;
            // Add a tick or dim when selected
            card.onclick = () => {
                const index = this.selectedSeeds.indexOf(s);
                if (index > -1) {
                    this.selectedSeeds.splice(index, 1);
                    card.style.filter = 'none';
                } else {
                    if (this.selectedSeeds.length < 12) { // v3.75.0：10→12 张（用户 12~15 区间，12 张顶栏恰好两行不压草坪）
                        this.selectedSeeds.push(s);
                        card.style.filter = 'brightness(50%)'; // Dim to show selected
                    }
                }
                
                countSpan.innerText = this.selectedSeeds.length;
                if (this.selectedSeeds.length > 0) {
                    btnRock.disabled = false;
                    btnRock.style.opacity = '1';
                } else {
                    btnRock.disabled = true;
                    btnRock.style.opacity = '0.5';
                }
            };
            grid.appendChild(card);
        });
        
        // v3.44.0：开局校验 —— 经典/融合模式既没带产阳光植物、也没带攻击植物时弹双按钮提示
        const SUN_MAKERS = ['sunflower', 'twinsunflower', 'sunshroom'];
        const ATTACKERS = ['peashooter', 'repeater', 'threepeater', 'gatlingpea', 'snowpea', 'splitpea',
            'starfruit', 'cherrybomb', 'jalapeno', 'potatomine', 'squash', 'chomper', 'melonpult',
            'wintermelon', 'cabbagepult', 'kernelpult', 'puffshroom', 'fumeshroom', 'scaredyshroom',
            'gloomshroom', 'iceshroom', 'doomshroom', 'spikeweed', 'spikerock', 'cattail', 'torchwood'];
        const go = () => { chooser.style.display = 'none'; this.startGame(); };
        btnRock.onclick = () => {
            this.audioManager.play('btn');
            if (!this.zombieMode && !this.vaseMode && this.selectedSeeds.length > 0) {
                const hasSun = this.selectedSeeds.some(sd => SUN_MAKERS.includes(sd.type));
                const hasAtk = this.selectedSeeds.some(sd => ATTACKERS.includes(sd.type));
                if (!hasSun && !hasAtk) {
                    this.audioManager.play('btn');
                    this._showSeedWarn(go);   // 「添加」= 回选卡继续挑；「继续」= 硬着头皮开局
                    return;
                }
            }
            go();
        };

        const btnBack = document.getElementById('btn-back');
        btnBack.onclick = () => {
            this.audioManager.play('btn');
            chooser.style.display = 'none';
            document.getElementById('start-menu').style.display = 'block';
        };
    }
    
    startGame() {
        const seedBank = document.getElementById('seed-bank');
        seedBank.innerHTML = ''; // clear
        // v3.50.0：非砸罐子模式恢复默认光标（砸罐子模式的木锤光标在 _openVaseGame 设置）
        if (!this.vaseMode && this.container) this.container.style.cursor = 'default';
        this._ultAnnounced = new Set(); // v3.50.0：大技能播报每局重新计数
        this.cooldowns = {};
        this.vaseFreeCards = []; // 砸罐子：清空上一局残留的免费植物卡
        // v3.74.0：清空上一局残留的掉落物
        // v3.40.0：清空上一局残留的冰车冰道
        if (this.iceTrails) { this.iceTrails.forEach(t => { if (t.el && t.el.parentNode) t.el.remove(); }); this.iceTrails = []; }
        this.waveManager.reset(); // v3.11.1：原地重开时刷怪节奏归零（全新对局时与构造值相同，无副作用）
        
        if (this.fusionMode || this.vaseMode) {
            const gloveBtn = document.getElementById('glove-bank');
            gloveBtn.style.display = 'flex';
            // v3.31.0：click 监听此前只在 initFusionUI（融合模式专属）里挂 → 砸罐子模式点击无效。
            // 统一挪到这里，dataset 防重复绑定（重复绑定会导致一次点击 toggle 两次=看起来没反应）
            if (!gloveBtn.dataset.gloveBound) {
                gloveBtn.dataset.gloveBound = '1';
                gloveBtn.addEventListener('click', () => this.toggleGlove());
            }
            // v3.32.0：砸罐子模式同样开放融合图鉴（用户：不知道哪些植物可以融合）
            document.getElementById('recipe-book-btn').style.display = 'flex';
            this.initFusionUI();
        } else {
            document.getElementById('glove-bank').style.display = 'none';
            document.getElementById('recipe-book-btn').style.display = 'none';
        }
        // v3.30.0 砸罐子手套：每关 2 次 —— 可融合（同融合手套）+ 新增"搬移植物换格"
        this.vaseGloveUses = this.vaseMode ? 2 : 0;
        this._syncVaseGloveHud();
        this._layoutSpeedButton(); // v3.35.0：我是僵尸=Speed 回顶栏（原始样子），其它模式留右上角

        if (this.vaseMode) {
            // 砸罐子：阳光从 0 起步，只能靠植物罐砸出的阳光积攒（攒到 75 买路灯花），
            // 天降阳光已在 update() 中对 vase 模式关闭
            this.sunCount = 0;
            this.sunCountElement.innerText = '0';
            this.setupVases();           // 按 this.vaseDifficulty 配置摆罐
            this.insertPlanternShop();   // 路灯花商店：常驻种子栏首位
            this._showVaseSignature();   // 战场左侧(罐子区的左边)打出帅气的「区耀丁」署名
            this._syncVaseHud();         // HUD 常驻难度角标
        }

        // 我是僵尸（v3.7.0）：不出植物种子卡 → 顶部切到僵尸卡带；种满敌阵 + 摆脑子
        if (this.zombieMode) {
            seedBank.style.display = 'none';
            const zb = document.getElementById('zombie-bank');
            if (zb) zb.style.display = 'flex';
            const shovel = document.getElementById('shovel-bank');
            if (shovel) shovel.style.display = 'none';
            const cfg = this._zombieDiffCfg();
            this.sunCount = cfg.sun;
            this.sunCountElement.innerText = String(cfg.sun);
            this.selectedSeeds = [];
            this.pendingZombie = null;
            this._zLoseTimer = 0;
            this.buildZombieBank();
            this._spawnBrainEls();
            this.setupZombieEnemies();
        }
        // v3.35.0：无条件同步（非僵尸模式时函数会清掉上一局残留的旧角标），
        // 顺带修掉"我是僵尸 → 其它模式"顶栏残留角标的老隐患
        this._syncZombieHud();

        // Setup random events (Delay time-based events, favor score-based)
        this.eventTimer = 150 + Math.random() * 60; // First time-based event between 2.5 to 3.5 minutes
        this.scoreMilestones = [100, 300, 500, 800, 1200, 1800, 2500, 3500, 5000]; // Events trigger specifically at these scores
        
        this.selectedSeeds.forEach((s, i) => {
            this.cooldowns[s.type] = 0;
            const card = document.createElement('div');
            card.className = 'seed-card';
            card.dataset.type = s.type;
            card.dataset.cost = s.cost;
            card.dataset.cooldown = s.cooldown;
            card.style.backgroundImage = `url('${s.img}')`;
            card.innerHTML = `
                <div class="cooldown-overlay"></div>
            `;
            seedBank.appendChild(card);
        });
        
        this.updateUI();
        // 重开/开局前先停掉可能仍在播的输赢音乐, 再切回关卡 BGM, 防止叠播
        this.audioManager.stop('lose');
        this.audioManager.stop('win');
        this.audioManager.play('bgm');
        this.lastTime = performance.now();
        // v3.43.0：开局恢复非暂停态并亮出左下角暂停键
        this.paused = false;
        const _pov = document.getElementById('pause-overlay');
        if (_pov) _pov.style.display = 'none';
        const _pbtn = document.getElementById('btn-pause');
        if (_pbtn) { _pbtn.style.display = 'block'; _pbtn.innerText = '⏸ 暂停'; }
        // 仅当主循环不在跑时启动 rAF（state 离开 PLAYING 后 loop 已停）；
        // PLAYING 中再调 startGame(如测试重开)则沿用旧循环, 防止双 rAF 导致双倍速
        if (this.state !== 'PLAYING') {
            this.state = 'PLAYING';
            requestAnimationFrame((t) => this.loop(t));
        } else {
            this.state = 'PLAYING';
        }
    }
    
    initUI() {
        // Just define the seeds, don't populate the top bar yet
        this.seeds = [
            { type: 'sunflower', cost: 50, cooldown: 7.5, img: 'assets/images/Card/Plants/SunFlower.png?v=1790944905' },
            { type: 'twinsunflower', cost: 150, cooldown: 50, img: 'assets/images/Card/Plants/TwinSunflower.png?v=1790944905' },
            { type: 'sunshroom', cost: 25, cooldown: 7.5, img: 'assets/images/Card/Plants/SunShroom.png?v=1790944905' },
            { type: 'peashooter', cost: 100, cooldown: 7.5, img: 'assets/images/Card/Plants/Peashooter.png?v=1790944905' },
            { type: 'repeater', cost: 200, cooldown: 7.5, img: 'assets/images/Card/Plants/Repeater.png?v=1790944905' },
            { type: 'threepeater', cost: 325, cooldown: 7.5, img: 'assets/images/Card/Plants/Threepeater.png?v=1790944905' },
            { type: 'gatlingpea', cost: 550, cooldown: 50, img: 'assets/images/Card/Plants/GatlingPea.png?v=1790944905' },
            { type: 'snowpea', cost: 175, cooldown: 7.5, img: 'assets/images/Card/Plants/SnowPea.png?v=1790944905' },
            { type: 'splitpea', cost: 125, cooldown: 7.5, img: 'assets/images/Card/Plants/SplitPea.png?v=1790944905' },
            { type: 'torchwood', cost: 175, cooldown: 7.5, img: 'assets/images/Card/Plants/Torchwood.png?v=1790944905' },
            { type: 'wallnut', cost: 50, cooldown: 30, img: 'assets/images/Card/Plants/WallNut.png?v=1790944905' },
            { type: 'cherrybomb', cost: 150, cooldown: 50, img: 'assets/images/Card/Plants/CherryBomb.png?v=1790944905' },            { type: 'squash', cost: 50, cooldown: 30, img: 'assets/images/Card/Plants/Squash.png?v=1790944905' },
            { type: 'jalapeno', cost: 125, cooldown: 50, img: 'assets/images/Card/Plants/Jalapeno.png?v=1790944905' },
            { type: 'potatomine', cost: 25, cooldown: 30, img: 'assets/images/Card/Plants/PotatoMine.png?v=1790944905' },
            { type: 'chomper', cost: 150, cooldown: 7.5, img: 'assets/images/Card/Plants/Chomper.png?v=1790944905' },
            { type: 'tallnut', cost: 125, cooldown: 30, img: 'assets/images/Card/Plants/TallNut.png?v=1790944905' },
            { type: 'puffshroom', cost: 0, cooldown: 7.5, img: 'assets/images/Card/Plants/PuffShroom.png?v=1790944905' },
            { type: 'fumeshroom', cost: 75, cooldown: 7.5, img: 'assets/images/Card/Plants/FumeShroom.png?v=1790944905' },
            { type: 'scaredyshroom', cost: 25, cooldown: 7.5, img: 'assets/images/Card/Plants/ScaredyShroom.png?v=1790944905' },
            { type: 'gloomshroom', cost: 225, cooldown: 7.5, img: 'assets/images/Card/Plants/GloomShroom.png?v=1790944905' },
            { type: 'spikerock', cost: 225, cooldown: 7.5, img: 'assets/images/Card/Plants/Spikerock.png?v=1790944905' },
            { type: 'cattail', cost: 275, cooldown: 7.5, img: 'assets/images/Card/Plants/Cattail.png?v=1790944905' },
            { type: 'melonpult', cost: 500, cooldown: 7.5, img: 'assets/images/Card/Plants/MelonPult.png?v=1790944905' },{ type: 'iceshroom', cost: 75, cooldown: 50, img: 'assets/images/Card/Plants/IceShroom.png?v=1790944905' },
            { type: 'doomshroom', cost: 125, cooldown: 50, img: 'assets/images/Card/Plants/DoomShroom.png?v=1790944905' },
            { type: 'spikeweed', cost: 100, cooldown: 7.5, img: 'assets/images/Card/Plants/Spikeweed.png?v=1790944905' },
            { type: 'garlic', cost: 50, cooldown: 7.5, img: 'assets/images/Card/Plants/Garlic.png?v=1790944905' },
            // ===== v3.6.0 经典模式新增 4 植物（数值取 PVZ1 原版；融合模式选卡仍过滤为 15 基础牌，不受影响）=====
            { type: 'wintermelon', cost: 200, cooldown: 7.5, img: 'assets/images/Card/Plants/WinterMelon.png?v=1790944905' },
            { type: 'starfruit', cost: 125, cooldown: 7.5, img: 'assets/images/Card/Plants/Starfruit.png?v=1790944905' },
            { type: 'hypnoshroom', cost: 75, cooldown: 30, img: 'assets/images/Card/Plants/HypnoShroom.png?v=1790944905' },
            { type: 'pumpkinhead', cost: 125, cooldown: 30, img: 'assets/images/Card/Plants/PumpkinHead.png?v=1790944905' },
            // ===== v3.10.0 投手两兄弟，v3.11.0 调价（破甲 + 黄油定身很值钱，不再按原版 100 阳光卖）=====
            // 抛射物可破甲：越过路障/铁桶/报纸/铁门直接打僵尸本体，护甲不脱落。
            // 玉米投手另有 20% 概率投出黄油（定身 3 秒）。
            { type: 'cabbagepult', cost: 150, cooldown: 7.5, img: 'assets/images/Card/Plants/CabbagePult.png?v=1790944905' },
            { type: 'kernelpult', cost: 175, cooldown: 7.5, img: 'assets/images/Card/Plants/KernelPult.png?v=1790944905' },
            // ===== v3.65.0 玉米加农炮入经典（原为三玉米投手融合专属）：500 阳光直接种植，占两格 =====
            { type: 'cobcannon', cost: 500, cooldown: 50, img: 'assets/images/Card/Plants/CobCannon.png?v=1790944905' },
            // ===== v3.24.0 植物盲盒：500 阳光，种下随机开出"经典冒险+融合进化"全植物池中的一株 =====
            { type: 'plantbox', cost: 500, cooldown: 5, img: 'assets/images/Card/Plants/PlantBox.png?v=1790944905' }
        ];
        // The top bar will be populated in startGame() after selection
    }
    
    addSun(amount) {
        this.sunCount += amount;
        this.sunCountElement.innerText = this.sunCount;
        this.updateUI();
    }
    

    initFusionUI() {
        const gloveBtn = document.getElementById('glove-bank');
        this.isGloveActive = false;
        this.gloveSource = null;
        if (this._fusionUIInit) return;
        this._fusionUIInit = true;
        // v3.31.0：手套 click 绑定已上移到 startGame（dataset 防重复），这里不再重复绑
        
        const recipes = [
            { a: 'peashooter', b: 'peashooter', result: '双发豌豆', img: 'assets/images/Plants/Repeater/Repeater.gif', css: false },
            { a: 'peashooter', b: 'repeater', result: '三线射手', img: 'assets/images/Plants/Threepeater/Threepeater.gif', css: false },
            { a: 'repeater', b: 'repeater', result: '机枪射手', img: 'assets/images/Plants/GatlingPea/GatlingPea.gif', css: false },
            { a: 'sunflower', b: 'sunflower', result: '双子向日葵', img: 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif', css: false },
            { a: 'peashooter', b: 'iceshroom', result: '寒冰射手', img: 'assets/images/Plants/SnowPea/SnowPea.gif', css: false },
            { a: 'peashooter', b: 'squash', result: '双向豌豆', img: 'assets/images/Plants/SplitPea/SplitPea.gif', css: false },
            { a: 'puffshroom', b: 'puffshroom', result: '大喷菇', img: 'assets/images/Plants/FumeShroom/FumeShroom.gif', css: false },
            { a: 'puffshroom', b: 'sunflower', result: '阳光菇', img: 'assets/images/Plants/SunShroom/SunShroom.gif', css: false },
            { a: 'puffshroom', b: 'peashooter', result: '胆小菇', img: 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif', css: false },
            { a: 'wallnut', b: 'jalapeno', result: '火炬树桩', img: 'assets/images/Plants/Torchwood/Torchwood.gif', css: false },
            // v3.11.0：删除「大嘴花+高坚果 = 西瓜投手」——这条配方没有任何逻辑依据，
            // 西瓜投手在融合模式里本来就直接在选卡栏可选。
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', base: 'assets/images/Plants/SunFlower/SunFlower1.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(0px, -20px) scale(1.0)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(5px, -15px) scale(1.0)' },
            { a: 'snowpea', b: 'cherrybomb', result: '寒冰炸弹', img: 'assets/images/Plants/CherryBomb/CherryBomb.gif', filter: 'hue-rotate(180deg) saturate(1.5)', css: false },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -45px) scale(0.9)' },
            { a: 'chomper', b: 'wallnut', result: '大嘴坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(20px, -25px) scale(0.9)' },
            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false },
            { a: 'peashooter', b: 'cherrybomb', result: '樱桃射手', img: 'assets/images/Plants/Peashooter/Peashooter.gif', filter: 'hue-rotate(-45deg) saturate(2.0)', css: false },
            { a: 'sunflower', b: 'doomshroom', result: '毁灭向日葵', img: 'assets/images/Plants/SunFlower/SunFlower1.gif', filter: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)', css: false },
            { a: 'melonpult', b: 'iceshroom', result: '冰西瓜投手', img: 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1790944905', css: false },
            { a: 'repeater', b: 'spikeweed', result: '猫尾草', img: 'assets/images/Plants/Cattail/Cattail.gif', css: false },
            { a: 'fumeshroom', b: 'fumeshroom', result: '忧郁菇', img: 'assets/images/Plants/GloomShroom/GloomShroom.gif', css: false },
            { a: 'spikeweed', b: 'spikeweed', result: '钢地刺', img: 'assets/images/Plants/Spikerock/Spikerock.gif', css: false },
            { a: 'spikeweed', b: 'wallnut', result: '地刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Spikeweed/Spikeweed.gif', overTransform: 'translate(0px, 24px) scale(1.0)' },
            { a: 'spikerock', b: 'tallnut', result: '钢刺高坚果', base: 'assets/images/Plants/TallNut/TallNut.gif', over: 'assets/images/Plants/Spikerock/Spikerock.gif', overTransform: 'translate(0px, 30px) scale(1.0)' },
            // ===== v3.2.38 新增 =====
            { a: 'splitpea', b: 'sunflower', result: '杨桃', img: 'assets/images/Plants/Starfruit/Starfruit.gif', css: false },
            { a: 'puffshroom', b: 'garlic', result: '魅惑菇', img: 'assets/images/Plants/HypnoShroom/HypnoShroom.gif', css: false },
            { a: 'wallnut', b: 'tallnut', result: '南瓜壳（可套在任意植物上）', img: 'assets/images/Plants/PumpkinHead/PumpkinHead.gif', css: false },
            { a: 'melonpult', b: 'cattail', result: '西瓜猫尾草', base: 'assets/images/Plants/Cattail/Cattail.gif', over: 'assets/images/Plants/MelonPult/MelonPult.png?v=1790944905', overTransform: 'translate(-5px, -30px) scale(0.7)' },
            { a: 'wintermelon', b: 'cattail', result: '冰西瓜猫尾草', base: 'assets/images/Plants/Cattail/Cattail.gif', over: 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1790944905', overTransform: 'translate(-5px, -30px) scale(0.7)' },
            // ===== v3.10.0 以卷心菜投手 / 玉米投手为基础的新融合 =====
            // v3.11.0：下面两条的 overClip / overTransform 与 Plant.js 内的实机分支**完全同步**
            // （此前图鉴写的是旧的"左上角对齐 + 整块上移"版本，与实机不是同一套，图鉴和游戏里长得不一样）
            { a: 'cabbagepult', b: 'kernelpult', result: '双料投手（3/4 投卷心菜、1/4 投黄油定身 3 秒）', base: 'assets/images/Plants/KernelPult/KernelPult.png?v=1790944905', over: 'assets/images/Plants/CabbagePult/CabbagePult.png?v=1790944905', overClip: 'polygon(0 0, 48% 0, 48% 50%, 0 50%)', overTransform: 'translate(37px, 8px)' },
            { a: 'cabbagepult', b: 'wallnut', result: '卷心菜堡垒（坚果肉盾 + 继续投掷，4000 耐久）', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/CabbagePult/CabbagePult.png?v=1790944905', overClip: 'polygon(0 0, 46% 0, 46% 46%, 0 46%)', overTransform: 'translate(26px, -4px)' },
            { a: 'cabbagepult', b: 'iceshroom', result: '寒冰卷心菜（破甲 + 命中减速 10 秒）', img: 'assets/images/Plants/CabbagePult/CabbagePult.png?v=1790944905', filter: 'brightness(112%) hue-rotate(120deg) saturate(1.7)', css: false },
            { a: 'kernelpult', b: 'jalapeno', result: '爆米花投手（破甲 + 命中 3×3 溅射）', img: 'assets/images/Plants/KernelPult/KernelPult.png?v=1790944905', filter: 'hue-rotate(-18deg) saturate(1.9) brightness(1.18)', css: false },
            { a: 'kernelpult', b: 'kernelpult', result: '玉米加农炮（需两株横向相邻 + 第三株融合；占两格，充能后点击开镜、按 M 发射）', img: 'assets/images/Plants/CobCannon/CobCannon.png?v=1790944905', css: false },
            // ===== v3.36.0 新增融合 =====
            // ===== v3.37.0：删除 v3.36.0 的「坚果×2=高坚果 / 小喷菇+大喷菇=忧郁菇 / 樱桃+寒冰菇=寒冰炸弹」——
            // 与已有配方/直选重复（忧郁菇=大喷菇×2 已有、寒冰炸弹=寒冰射手+樱桃已有、高坚果本就可直选），
            // 图鉴出现同果双行与实际不符 =====
            // ===== v3.46.0：删除「坚果向日葵」（用户裁定外观太丑；sunflower+wallnut 不再产出融合株）=====
            { a: 'snowpea', b: 'starfruit', result: '冰杨桃（杨桃五向齐射冰豌豆，命中减速）', img: 'assets/images/Plants/Starfruit/Starfruit.gif', filter: 'brightness(1.1) hue-rotate(160deg) saturate(1.6)', css: false },
            // ===== v3.45.0 十一条新融合（用户批准名单）=====
            { a: 'gatlingpea', b: 'snowpea', result: '冰机枪射手（4 连发冰豌豆，命中减速）', img: 'assets/images/Plants/GatlingPea/GatlingPea.gif', filter: 'brightness(1.15) hue-rotate(180deg) saturate(1.5)', css: false },
            { a: 'cattail', b: 'snowpea', result: '冰猫尾草（全场追踪冰刺，命中减速）', img: 'assets/images/Plants/Cattail/Cattail.gif', filter: 'brightness(1.2) hue-rotate(160deg) saturate(1.8)', css: false },
            { a: 'gloomshroom', b: 'iceshroom', result: '冰忧郁菇（3×3 冰雾绞肉，命中减速）', img: 'assets/images/Plants/GloomShroom/GloomShroom.gif', filter: 'brightness(1.15) hue-rotate(160deg) saturate(1.7)', css: false },
            { a: 'starfruit', b: 'starfruit', result: '十芒杨桃（十方向齐射星光，每颗 40）', img: 'assets/images/Plants/Starfruit/Starfruit.gif', filter: 'saturate(1.6) brightness(1.2) hue-rotate(15deg)', css: false },
            { a: 'potatomine', b: 'jalapeno', result: '烈焰地雷（布好后触发整行 1800 烈焰）', img: 'assets/images/Plants/PotatoMine/PotatoMine.gif', filter: 'hue-rotate(-30deg) saturate(2.2) brightness(1.15)', css: false },
            { a: 'squash', b: 'cherrybomb', result: '爆炸弹跳（跃起压扁，落点 3×3 爆炸）', base: 'assets/images/Plants/Squash/Squash.gif', baseTransform: 'scale(1.18) translate(0px, -72px)', baseFilter: 'hue-rotate(-35deg) saturate(1.9)' },
            { a: 'kernelpult', b: 'snowpea', result: '冰玉米投手（玉米粒减速，黄油定身保留）', img: 'assets/images/Plants/KernelPult/KernelPult.png?v=1790944905', filter: 'brightness(1.15) hue-rotate(160deg) saturate(1.8)', css: false },
            { a: 'spikeweed', b: 'torchwood', result: '火焰地刺（灼烧刺 80/0.75s；僵尸啃不到只有冰车能碾，镇守行不结冰）', img: 'assets/images/Plants/Spikeweed/Spikeweed.gif', filter: 'sepia(1) saturate(3) hue-rotate(-25deg) brightness(1.15)', css: false },
            { a: 'repeater', b: 'torchwood', result: '火焰双发（2 连发火焰豌豆 40×2；每第 4 轮过热爆发 6 连发 60×6）', img: 'assets/images/Plants/Repeater/Repeater.gif', filter: 'sepia(1) saturate(2.6) hue-rotate(-20deg) brightness(1.12)', css: false },
            { a: 'twinsunflower', b: 'twinsunflower', result: '四头向日葵（每轮 100 阳光；每 60 秒全场降阳光雨 6 颗）', base: 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif', baseTransform: 'scale(1.3)', baseFilter: 'saturate(1.35) brightness(1.12)', over: 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif', overTransform: 'translate(10px, 6px) scaleX(-1) scale(1.3)' },
            { a: 'tallnut', b: 'jalapeno', result: '辣椒高坚果（8000 血，啃它的僵尸每秒被烫 40）', img: 'assets/images/Plants/TallNut/TallNut.gif', filter: 'sepia(1) saturate(2.6) hue-rotate(-20deg) brightness(1.1)', css: false }
        ];
        // v3.50.0：数据驱动新融合配方（与 PVZ_FUSION_EXTRA 同源，外观参数原样复刻场上合成）
        // v3.80.3：掉落物融合已整体删除，配方书只走 PVZ_FUSION_EXTRA
        (window.PVZ_FUSION_EXTRA || []).forEach(f => {
            const L = f.look || {};
            // v3.74.0：配方大全里的融合植物只写名字（用户：解释没必要）
            recipes.push({
                a: f.a, b: f.b, result: f.name,
                base: L.base, baseFilter: L.bf, baseTransform: L.bt,
                over: L.ov, overClip: L.oc, overTransform: L.ot, css: false
            });
        });
        
        const list = document.getElementById('recipe-list');
        list.innerHTML = '';
        recipes.forEach(r => {
            let li = document.createElement('li');
            li.style.borderBottom = '1px dashed #ccc';
            li.style.padding = '10px 0';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.justifyContent = 'space-between';
            
            const getImg = (t) => {
                const map = {
                    'peashooter': 'assets/images/Plants/Peashooter/Peashooter.gif',
                    'sunflower': 'assets/images/Plants/SunFlower/SunFlower1.gif',
                    'wallnut': 'assets/images/Plants/WallNut/WallNut.gif',
                    'snowpea': 'assets/images/Plants/SnowPea/SnowPea.gif',
                    'cherrybomb': 'assets/images/Plants/CherryBomb/CherryBomb.gif',
                    'puffshroom': 'assets/images/Plants/PuffShroom/PuffShroom.gif',
                    'potatomine': 'assets/images/Plants/PotatoMine/PotatoMine.gif',
                    'chomper': 'assets/images/Plants/Chomper/Chomper.gif',
                    'repeater': 'assets/images/Plants/Repeater/Repeater.gif',
                    'iceshroom': 'assets/images/Plants/IceShroom/IceShroom.gif',
                    'squash': 'assets/images/Plants/Squash/Squash.gif',
                    'doomshroom': 'assets/images/Plants/DoomShroom/DoomShroom.gif',
                    'jalapeno': 'assets/images/Plants/Jalapeno/Jalapeno.gif',
                    'fumeshroom': 'assets/images/Plants/FumeShroom/FumeShroom.gif',
                    'spikeweed': 'assets/images/Plants/Spikeweed/Spikeweed.gif',
                    'tallnut': 'assets/images/Plants/TallNut/TallNut.gif',
                    'melonpult': 'assets/images/Plants/MelonPult/MelonPult.png?v=1790944905',
                    'wintermelon': 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1790944905',
                    'cattail': 'assets/images/Plants/Cattail/Cattail.gif',
                    'gloomshroom': 'assets/images/Plants/GloomShroom/GloomShroom.gif',
                    'spikerock': 'assets/images/Plants/Spikerock/Spikerock.gif',
                    'threepeater': 'assets/images/Plants/Threepeater/Threepeater.gif',
                    'splitpea': 'assets/images/Plants/SplitPea/SplitPea.gif',
                    'garlic': 'assets/images/Plants/Garlic/Garlic.gif',
                    'starfruit': 'assets/images/Plants/Starfruit/Starfruit.gif',
                    'hypnoshroom': 'assets/images/Plants/HypnoShroom/HypnoShroom.gif',
                    'pumpkinhead': 'assets/images/Plants/PumpkinHead/PumpkinHead.gif',
                    'cabbagepult': 'assets/images/Plants/CabbagePult/CabbagePult.png?v=1790944905',
                    'kernelpult': 'assets/images/Plants/KernelPult/KernelPult.png?v=1790944905',
                    // v3.59.0：补齐缺失的 5 类材料缩略图（此前这 16 条配方在配方书里材料格是空白）
                    'torchwood': 'assets/images/Plants/Torchwood/Torchwood.gif',
                    'gatlingpea': 'assets/images/Plants/GatlingPea/GatlingPea.gif',
                    'twinsunflower': 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif',
                    'scaredyshroom': 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif',
                    'sunshroom': 'assets/images/Plants/SunShroom/SunShroom.gif'
                };
                return map[t] || '';
            };
            // v3.61.0：倭瓜画布 100×226，株体只占底部 68×82——70×100 contain 后株体只剩 ~36px 小块
            //（用户：配方书里的倭瓜"变小状态"）。裁剪窗直取底部株体，显示尺寸与其他材料持平。
            const matThumb = (t) => {
                if (t === 'squash') {
                    return `<div style="width: 62px; height: 75px; background: url('assets/images/Plants/Squash/Squash.gif') center bottom / 91px 206px no-repeat; flex: none;"></div>`;
                }
                // v3.74.0：掉落物防具缩略图 —— v3.80.3 掉落物系统已删除
                return `<img src="${getImg(t)}" style="max-width: 70px; max-height: 100px; object-fit: contain;">`;
            };

            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; width: 42%;">
                    <div style="width: 70px; height: 100px; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                        ${matThumb(r.a)}
                    </div>
                    <span style="font-weight: bold; font-size: 20px;">+</span>
                    <div style="width: 70px; height: 100px; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                        ${matThumb(r.b)}
                    </div>
                </div>
                <div style="width: 8%; text-align: center; font-size: 24px; font-weight: bold;">=</div>
                <div style="width: 50%; text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 10px; font-weight: bold; color: #822; font-size: 16px;">
                    <span>${(r.result || '').replace(/（[^）]*）/g, '')}</span>
                    <div style="position: relative; width: 78px; height: 80px; display: flex; justify-content: center; align-items: center; flex: none;">
                        ${r.base ?
                          /* v3.11.0：图鉴预览改为**与游戏内完全相同的叠加约定**——
                             用 0 尺寸锚点表示"植物中心"，两张贴图都按 translate(-50%,-50%) 居中，
                             再整体缩放。旧写法把 over 用 left:0/top:0 对齐 base 左上角，
                             与游戏内的"以中心对齐"不是同一套，图鉴与实机长得不一样。 */
                          `<div style="position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform: scale(0.62);">
                              <img src="${r.base}" style="position: absolute; left: 0; top: 0; transform: translate(-50%, -50%) ${r.baseTransform || ''}; ${r.baseFilter ? `filter: ${r.baseFilter};` : ''}">
                              ${r.over ? `<img src="${r.over}" style="position: absolute; left: 0; top: 0; transform: translate(-50%, -50%) ${r.overTransform || ''}; ${r.overClip ? `clip-path: ${r.overClip}; -webkit-clip-path: ${r.overClip};` : ''}">` : ''}
                           </div>`
                          : `<img src="${r.img}" style="max-width: 74px; max-height: 76px; filter: ${r.filter || 'none'}; object-fit: contain;">`
                        }
                    </div>
                </div>
            `;
            list.appendChild(li);
        });
        
        document.getElementById('recipe-book-btn').addEventListener('click', () => {
            document.getElementById('recipe-modal').style.display = 'block';
        });
        
        document.getElementById('close-recipe').addEventListener('click', () => {
            document.getElementById('recipe-modal').style.display = 'none';
        });
    }

    // 切换 手 ↔ 融合手套（🧤按钮 与 空格键 共用）。
    // 开启：清掉手里正拿的种子/铲子，光标变为🧤；关闭：把正在拿取的植物放回原格，光标恢复为手。
    toggleGlove() {
        const gloveBtn = document.getElementById('glove-bank');
        if (!gloveBtn || gloveBtn.style.display === 'none') return false;
        // v3.30.0 砸罐子手套：每关 2 次，用完不能再掏出手套
        if (this.vaseMode && !this.isGloveActive && this.vaseGloveUses <= 0) {
            this.showAnnouncement('本关的手套次数已用完（每关 2 次）', '#ff6666');
            if (this.audioManager) this.audioManager.play('btn');
            return false;
        }
        this.isGloveActive = !this.isGloveActive;
        this.isGloveDragging = false;
        if (this.isGloveActive) {
            if (this.inputManager) {
                this.inputManager.selectedSeed = null;
                this.inputManager.isShovelSelected = false;
                this.inputManager.dragGhost.style.display = 'none';
            }
        } else {
            // 若手套正拿着某株植物，先把它放回原格再收起手套
            if (this.gloveSource) this.gloveSource.gloveRestore(); // v3.51.2 overlay 按快照还原（滤镜融合体 overlay 保持隐藏）
            if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
        }
        this.gloveSource = null;
        this.container.style.cursor = this.isGloveActive
            ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' style=\'font-size:24px\'><text y=\'24\'>🧤</text></svg>"), auto'
            : 'default';
        gloveBtn.style.background = this.isGloveActive ? 'rgba(0, 255, 0, 0.5)' : 'rgba(0,0,0,0.5)';
        if (this.isGloveActive && this.audioManager) this.audioManager.play('btn');
        return this.isGloveActive;
    }

    // v3.30.0：砸罐子手套次数角标（融合模式无次数限制 → 不显示角标）
    _syncVaseGloveHud() {
        const btn = document.getElementById('glove-bank');
        if (!btn) return;
        let badge = document.getElementById('glove-uses-badge');
        if (this.vaseMode && this.vaseGloveUses > 0) {
            btn.title = `融合手套（本关剩余 ${this.vaseGloveUses} 次 · 空格键切换）\n点植物拿起 → 点另一株植物融合 / 点空格把植物搬到那格`;
            if (!badge) {
                badge = document.createElement('span');
                badge.id = 'glove-uses-badge';
                badge.style.cssText = 'position:absolute;top:-7px;right:-7px;background:#c62828;color:#fff;font-size:12px;font-weight:bold;line-height:1;padding:3px 6px;border-radius:9px;border:1px solid #7a1414;pointer-events:none;z-index:10;';
                if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
                btn.appendChild(badge);
            }
            badge.style.display = 'block';
            badge.textContent = '×' + this.vaseGloveUses;
        } else if (badge) {
            badge.style.display = 'none';
        }
    }

    // v3.30.0：消耗一次砸罐子手套（仅 vase 模式生效）
    _useVaseGlove() {
        if (!this.vaseMode) return;
        this.vaseGloveUses = Math.max(0, this.vaseGloveUses - 1);
        this._syncVaseGloveHud();
        if (this.vaseGloveUses > 0) this.showAnnouncement(`手套剩余 ${this.vaseGloveUses} 次`, '#ffdd66');
        else this.showAnnouncement('手套次数已用完', '#ff8866');
    }

    // v3.33.0：拖拽幽灵 = 完整融合形态（主体 + 叠加层 + 配色滤镜）。
    // 旧版只拿 element.src 当背景图 —— 爆米花投手拖起来变"普通玉米投手"、
    // 地刺坚果拖起来变"光杆坚果"，玩家根本认不出拖的是哪株融合体。
    // v3.34.0：不再缩 0.75 —— 主体/叠加层 img 按自然尺寸原样渲染，与场上的植物一样大
    //（用户：手套拿起来的植物应该跟原本的植物一样大，只是位置发生变化）。
    _applyFusionDragGhost(plant) {
        if (!this.inputManager) return;
        const g = this.inputManager.dragGhost;
        g.innerHTML = '';
        g.style.filter = '';
        g.style.backgroundImage = 'none';
        const stage = document.createElement('div');
        stage.style.cssText = 'position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;';
        const body = document.createElement('img');
        body.src = plant.element.getAttribute('src');
        body.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;';
        // v3.61.0：倭瓜株体在 100×226 长画布底部（y 144~226，中心 y≈185）——按画布中心对齐
        // 会让株体垂在光标下方 72px（用户：融合时"倭瓜不在鼠标上，在鼠标偏下"）。
        // translate(-50%,-82%)：株体中心（185/226≈82%）恰好落在光标上。
        let bodyShiftY = null; // 非 null 时=叠加层需要同步上移的像素
        if (plant.hasTrait && plant.hasTrait('squash')) {
            body.style.transform = 'translate(-50%, -82%)';
            bodyShiftY = -72;
        }
        body.style.filter = plant.element.style.filter || '';
        stage.appendChild(body);
        const ov = plant.fusionOverlay;
        if (ov && ov.getAttribute('src') && ov.style.display !== 'none') {
            const oi = document.createElement('img');
            oi.src = ov.getAttribute('src');
            oi.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
            oi.style.transform = ov.style.transform || 'translate(-50%, -50%)';
            // 主体上移时叠加层（帽子等）同步上移，否则帽子和株体脱节
            //（prepend 的 translateY 在世界系最后施加，不受后续 scale 影响）
            if (bodyShiftY !== null) {
                oi.style.transform = `translateY(${bodyShiftY}px) ` + oi.style.transform;
            }
            if (ov.style.clipPath && ov.style.clipPath !== 'none') oi.style.clipPath = ov.style.clipPath;
            if (ov.style.filter) oi.style.filter = ov.style.filter;
            stage.appendChild(oi);
        }
        g.appendChild(stage);
    }

    // v3.34.0：土豆雷家族的"武装状态"随融合继承 ——
    // 材料（土豆雷/孢子地雷）已经发芽（isArmed）时，融合产物出生即武装，不再从头计时；
    // 材料还是关着的，产物也保持关着的（继续按自身节奏出土）。
    _inheritMineState(newPlant, source) {
        if (!newPlant || !source) return;
        if (!newPlant.hasTrait || !newPlant.hasTrait('potatomine')) return;
        if (!source.hasTrait || !source.hasTrait('potatomine')) return;
        if (!source.isArmed || newPlant.isArmed) return; // 关着的→关着的（默认行为）；已武装的产物不回退
        newPlant.isArmed = true;
        newPlant.armTimer = 0;
        newPlant.element.src = 'assets/images/Plants/PotatoMine/PotatoMine.gif';
        if (newPlant.type === 'fusion_sporemine' && newPlant.fusionOverlay) {
            newPlant.fusionOverlay.style.transform = 'translate(-50%, -50%) translate(0px, -45px) scale(0.9)';
        }
    }

    tryGloveInteraction(row, col) {
        if (!this.isGloveActive) return false;
        
        const plant = this.board.grid[row][col];
        if (!plant) {
            // v3.30.0 砸罐子手套：拿着植物点空格 = 把植物搬到那格（本关 2 次之一）
            if (this.vaseMode && this.gloveSource) {
                const src = this.gloveSource;
                const vaseThere = this.vases && this.vases.some(v => !v.smashed && v.row === row && v.col === col);
                if (vaseThere || !this.board.canPlant(row, col)) {
                    this.showAnnouncement(vaseThere ? '那个格子上还有罐子，放不下去' : '这个位置放不了植物', '#ffaa00');
                    return true; // 保持拿着，玩家可以换个格子
                }
                // 手工搬家：不动 entities 数组（防重复入列），只改格子和坐标
                this.board.grid[src.row][src.col] = null;
                this.board.grid[row][col] = src;
                src.row = row; src.col = col;
                src.x = this.board.offsetX + col * this.board.cellWidth + this.board.cellWidth / 2;
                src.y = this.board.offsetY + row * this.board.cellHeight + this.board.cellHeight / 2;
                src.element.style.left = src.x + 'px';
                src.element.style.top = (src.y + (src.yOffset || 0)) + 'px'; // v3.34.0 补 yOffset（与 update 的渲染基准一致）
                if (src.fusionOverlay) {
                    src.fusionOverlay.style.left = src.x + 'px';
                    src.fusionOverlay.style.top = (src.y + (src.yOffset || 0)) + 'px';
                }
                src.element.style.zIndex = Math.floor(src.y);
                src.gloveRestore(); // v3.51.2 overlay 按快照还原
                if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
                this.gloveSource = null;
                this.isGloveDragging = false;
                this.isGloveActive = false;
                document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
                this.container.style.cursor = 'default';
                if (this.audioManager) this.audioManager.play('plant');
                this._useVaseGlove();
                return true;
            }
            // Clicked empty space, cancel drag but keep glove active maybe? Or cancel all.
            this.isGloveActive = false;
            this.isGloveDragging = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
            if (this.gloveSource) this.gloveSource.gloveRestore(); // v3.51.2 overlay 按快照还原
            this.gloveSource = null;
            return true;
        }

        if (!this.gloveSource) {
            // Pick up the first plant
            this.gloveSource = plant;
            this.isGloveDragging = true;
            // Set drag ghost image to this plant
            if (this.inputManager) {
                // v3.33.0：融合株拖起来 = 完整融合形态（主体+叠加层+滤镜），不再只露主体。
                // 必须在藏起场上叠加层之前建幽灵（否则 helper 会因 display:none 跳过叠加层）
                this._applyFusionDragGhost(plant);
                this.inputManager.dragGhost.style.display = 'block';
                // Manually trigger move to put ghost at cursor immediately
            }
            plant.gloveHide(); // v3.51.2 快照并隐藏主体+叠加层
        } else {
            if (this.gloveSource === plant) {
                // Cancel selection
                plant.gloveRestore(); // v3.51.2 overlay 按快照还原
                this.gloveSource = null;
                this.isGloveDragging = false;
                if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
                return true;
            }
            
            // ===== v3.24.0 玉米加农炮：两株横向相邻的玉米投手 + 手套里的第三个玉米投手 =====
            if (this.gloveSource.type === 'kernelpult' && plant.type === 'kernelpult') {
                const pair = this._findKernelPair(plant, this.gloveSource);
                if (pair) {
                    const third = this.gloveSource;
                    this.gloveSource.gloveRestore(); // v3.51.2
                    this._mergeCobCannon(pair.a, pair.b, third);
                    this.isGloveActive = false;
                    this.isGloveDragging = false;
                    document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
                    this.container.style.cursor = 'default';
                    if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
                    this.gloveSource = null;
                    this._useVaseGlove(); // v3.30.0 砸罐子手套：融合成功消耗一次（非 vase 模式空操作）
                    return true;
                }
                this.showAnnouncement('玉米加农炮需要 3 株玉米投手：两株横向相邻，再把第三株融合上去', '#ffaa00');
                this.gloveSource.gloveRestore(); // v3.51.2
                this.gloveSource = null;
                this.isGloveActive = false;
                this.isGloveDragging = false;
                document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
                this.container.style.cursor = 'default';
                if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
                return true;
            }

            // 手套融合（普通）：任何两株植物（含炸弹类）都可直接合成。
            // 注：炸弹种下会自动爆炸并在爆炸时融合周围 3×3，因此炸弹主要靠"种下"触发融合。
            // Try to fuse
            let fusionType = null;
            try { fusionType = this.getFusionResult(this.gloveSource.type, plant.type); } catch(e) { console.error(e); }
            if (fusionType) {
                if (fusionType === 'fusion_pumpkinhead') {
                    // 南瓜壳：PVZ 原版"套壳"玩法——材料植物被消耗，宿主植物保留并套上外壳
                    if (this.applyPumpkinShell(this.gloveSource, plant)) this._useVaseGlove(); // v3.30.0
                } else {
                    this.gloveSource.gloveRestore(); // v3.51.2 Reset display before dying to ensure cleanup
                    this.gloveSource.hp = 0; // kill source
                    plant.hp = 0; // kill target

                    this.board.grid[this.gloveSource.row][this.gloveSource.col] = null;
                    this.board.grid[row][col] = null;

                    try {
                        let newPlant = new Plant(this, fusionType);
                        this._inheritMineState(newPlant, this.gloveSource); // v3.34.0 土豆雷武装状态继承
                        if (this.board.addPlant(newPlant, row, col)) {
                            if (this.audioManager) this.audioManager.play('btn');
                            this.announceFusionOnce(fusionType); // v3.23.0：同配方只提示一次
                        }
                    } catch(e) { console.error(e); }
                    this._useVaseGlove(); // v3.30.0 砸罐子手套：融合成功消耗一次
                }
            } else if (plant.type === 'pumpkinhead') {
                // v3.32.0：任何植物拖到空南瓜壳上 = 移植进壳里（壳剩余耐久保留、植物搬家不被消耗）。
                // 此前只有 wallnut/tallnut 有套壳分支，大嘴花等拖上来只会提示"无法融合"。
                const shellHp = Math.max(1, Math.min(4000, plant.hp));
                const src = this.gloveSource;
                plant.hp = 0; // 空壳实体被移植取代
                this.board.grid[row][col] = null;
                // 手工搬家（不走 addPlant，防 entities 重复入列）
                this.board.grid[src.row][src.col] = null;
                this.board.grid[row][col] = src;
                src.row = row; src.col = col;
                src.x = this.board.offsetX + col * this.board.cellWidth + this.board.cellWidth / 2;
                src.y = this.board.offsetY + row * this.board.cellHeight + this.board.cellHeight / 2;
                src.element.style.left = src.x + 'px';
                src.element.style.top = (src.y + (src.yOffset || 0)) + 'px';
                // 壳的剩余耐久转移为新宿主的护甲（与铲子分层逻辑同规）
                if (!src.shield) {
                    src.shield = { hp: shellHp, maxHp: 4000 };
                    try { src._spawnShieldEl(); } catch(e) { console.error(e); }
                }
                if (this.audioManager) this.audioManager.play('btn');
                this._useVaseGlove(); // v3.32.0 移植消耗一次（非 vase 模式空操作）
            } else if (this.gloveSource.type === 'wallnut' || this.gloveSource.type === 'tallnut') {
                // 墙果材料（坚果墙/高坚果）拖到任意植物上 = 给那株植物套上南瓜壳
                // （PVZ 原版：南瓜壳可保护任何常驻植物；材料被消耗、宿主保留）
                if (this.applyPumpkinShell(this.gloveSource, plant)) this._useVaseGlove(); // v3.30.0
            } else {
                this.gloveSource.gloveRestore(); // v3.51.2 overlay 按快照还原
                this.showAnnouncement('这两种植物无法融合', '#ff0000');
            }
            
            this.isGloveActive = false;
            this.isGloveDragging = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
            this.gloveSource = null;
        }
        return true;
    }

    // 南瓜壳套壳（PVZ 原版玩法）：material（坚果墙/高坚果，手套源）作为材料被消耗，
    // host（场上任意常驻植物）保留并套上 +4000 耐久外壳；僵尸须先啃穿外壳才会伤到里面的植物。
    applyPumpkinShell(material, host) {
        const restoreMaterial = () => {
            material.gloveRestore(); // v3.51.2 overlay 按快照还原
        };
        // 一次性/爆炸类植物不能套壳（套了也无意义；与 PVZ 原版一致）
        const oneShot = ['cherrybomb', 'jalapeno', 'potatomine', 'squash', 'doomshroom', 'iceshroom', 'crater'];
        if (host.isDead || host.shield || host.shieldEl) {
            restoreMaterial();
            return false;
        }
        if (oneShot.includes(host.type)) {
            restoreMaterial();
            return false;
        }
        restoreMaterial(); // Reset display before dying to ensure cleanup
        material.hp = 0; // 消耗材料植物（坚果墙/高坚果之一）
        this.board.grid[material.row][material.col] = null;
        try {
            if (host.attachShield()) {
                if (this.audioManager) this.audioManager.play('btn');
            }
        } catch(e) { console.error(e); }
        return true;
    }

    // v3.12.0 分层铲除：格子上半部 = 铲掉南瓜壳里的植物（壳以独立壳墙形态留在格内，
    // 耐久=壳当前剩余）；下半部 = 只铲南瓜壳（植物无损）。无壳植物照常整株铲掉。
    shovelPlant(row, col, mouseY) {
        if (row < 0 || row >= this.board.rows || col < 0 || col >= this.board.cols) return;
        const plant = this.board.grid[row][col];
        if (!plant || plant.isDead) return;
        if (plant.shield && plant.shieldEl) {
            const cellTop = this.board.offsetY + row * this.board.cellHeight;
            const upperHalf = (mouseY === undefined) || (mouseY < cellTop + this.board.cellHeight / 2);
            if (upperHalf) {
                // 铲里面的植物：壳留在原地（剩余耐久带走），之后可把新植物种进壳里
                const shellHp = plant.shield.hp;
                plant.shield = null;
                plant.hp = 0;
                this.board.grid[row][col] = null;
                const shell = new Plant(this, 'pumpkinhead');
                shell.hp = Math.max(1, Math.min(4000, Math.round(shellHp)));
                this.board.addPlant(shell, row, col);
            } else {
                plant.removeShield(true); // 只铲壳，植物无损
            }
            if (this.audioManager) this.audioManager.play('plant');
            return;
        }
        this.board.removePlant(row, col);
    }

    // v3.23.0：同一种融合配方只提示一次（第二次合成同样的株不再弹文字）
    announceFusionOnce(fusionType) {
        if (!this._fusionAnnounced) this._fusionAnnounced = new Set();
        if (this._fusionAnnounced.has(fusionType)) return;
        this._fusionAnnounced.add(fusionType);
        this.showAnnouncement(`融合成功：${this.getPlantName(fusionType)}!`, '#ff00ff');
    }

    // v3.23.0：僵尸中文名统一出口（罐子公告/盲盒开箱共用）
    _zombieZhName(type) {
        return { normal: '普通僵尸', conehead: '路障僵尸', buckethead: '铁桶僵尸', flag: '旗手僵尸',
            polevaulting: '撑杆僵尸', newspaper: '读报僵尸', screendoor: '铁门僵尸', football: '橄榄球僵尸', // v3.44.0 撑杆统一（跳跳僵尸称呼取消）
            zomboni: '冰车僵尸', dancing: '舞王僵尸', pogo: '撑杆僵尸', ladder: '梯子僵尸',
            jackinthebox: '玩偶盒僵尸', imp: '小鬼僵尸', gargantuar: '巨人僵尸', lgboss: '路障巨人',
            peahead: '豌豆头僵尸', nuthead: '坚果头僵尸', sunhead: '向日葵头僵尸', snowpeahead: '寒冰头僵尸',
            jalapenohead: '火爆辣椒头僵尸', machinegunhead: '机枪头僵尸', tallnuthead: '高坚果头僵尸', // v3.43.0 与图鉴名称统一
            mysterybox: '盲盒僵尸', hammerzombie: '锤子僵尸',
            ironcone: '双盔僵尸', madpaper: '疯狂读报僵尸', torchzombie: '火把僵尸', garliczombie: '大蒜僵尸' }[type] || type;
    }

    // v3.74.0 防具掉落 _dropZombieLoot —— v3.80.3 整体删除（用户：掉落物太难看）

    getPlantName(type) {
        const names = {            sunflower: '向日葵', peashooter: '豌豆射手', wallnut: '坚果墙', cherrybomb: '樱桃炸弹',
            snowpea: '寒冰射手', repeater: '双发射手', squash: '窝瓜', jalapeno: '火爆辣椒',
            potatomine: '土豆地雷', chomper: '大嘴花', tallnut: '高坚果', puffshroom: '小喷菇',
            fumeshroom: '大喷菇', sunshroom: '阳光菇', scaredyshroom: '胆小菇', iceshroom: '寒冰菇',
            doomshroom: '毁灭菇', spikeweed: '地刺', threepeater: '三线射手', splitpea: '裂荚射手',
            gatlingpea: '机枪射手', twinsunflower: '双子向日葵', torchwood: '火炬树桩', garlic: '大蒜', plantern: '路灯花',
            wintermelon: '冰西瓜', starfruit: '杨桃', hypnoshroom: '魅惑菇', pumpkinhead: '南瓜壳',
            fusion_peaflower: '豌豆向日葵', fusion_nutshooter: '坚果射手', fusion_frostbomb: '寒冰炸弹',
            fusion_sporemine: '孢子地雷', fusion_spikynut: '地刺坚果', fusion_snownut: '寒冰坚果',
            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵',
            // v3.36.0 新融合
            fusion_snowpea_starfruit: '冰杨桃',
            fusion_spikerock_tallnut: '钢地刺高坚果',
            fusion_melon_cattail: '西瓜猫尾草', fusion_wintermelon_cattail: '冰西瓜猫尾草',
            fusion_starfruit: '杨桃', fusion_hypnoshroom: '魅惑菇',
            fusion_pumpkinhead: '南瓜壳', fusion_chomper_wallnut: '大嘴坚果',
            fusion_icecabbage: '寒冰卷心菜', fusion_popcorn: '爆米花投手',
            fusion_cabbagenut: '卷心菜堡垒', fusion_veggiepult: '双料投手',
            cabbagepult: '卷心菜投手', kernelpult: '玉米投手',
            cobcannon: '玉米加农炮', plantbox: '植物盲盒',
            // ===== v3.45.0 十一条新融合 =====
            fusion_gatlingsnow: '冰机枪射手', fusion_snow_cattail: '冰猫尾草', fusion_gloomsnow: '冰忧郁菇',
            fusion_starfruit10: '十芒杨桃', fusion_firemine: '烈焰地雷', fusion_boomsquash: '爆炸弹跳',
            fusion_icekernel: '冰玉米投手', fusion_firespikeweed: '火焰地刺', fusion_firerepeater: '火焰双发',
            fusion_quadsun: '四头向日葵', fusion_firetallnut: '辣椒高坚果'
        };
        // v3.50.0：数据驱动新融合的名称
        const extra = (window.PVZ_FUSION_EXTRA || []).find(f => f.type === type);
        if (extra) return extra.name;
        return names[type] || type;
    }

    getFusionResult(plantA, plantB) {
        if (plantA === 'peashooter' && plantB === 'peashooter') return 'repeater';
        if (plantA === 'repeater' && plantB === 'peashooter') return 'threepeater';
        if (plantA === 'peashooter' && plantB === 'repeater') return 'threepeater';
        if (plantA === 'repeater' && plantB === 'repeater') return 'gatlingpea';
        if (plantA === 'sunflower' && plantB === 'sunflower') return 'twinsunflower';
        if (plantA === 'puffshroom' && plantB === 'puffshroom') return 'fumeshroom';
        
        const set = new Set([plantA, plantB]);
        if (set.has('peashooter') && set.has('sunflower')) return 'fusion_peaflower';
        if (set.has('spikeweed') && set.has('wallnut')) return 'fusion_spikynut';
        if (set.has('spikerock') && set.has('tallnut')) return 'fusion_spikerock_tallnut';
        if (set.has('wallnut') && set.has('peashooter')) return 'fusion_nutshooter';
        if (set.has('snowpea') && set.has('cherrybomb')) return 'fusion_frostbomb';
        if (set.has('peashooter') && set.has('cherrybomb')) return 'fusion_cherrybomb_peashooter';
        if (set.has('sunflower') && set.has('doomshroom')) return 'fusion_doomshroom_sunflower';
        if (set.has('puffshroom') && set.has('potatomine')) return 'fusion_sporemine';

        if (set.has('wallnut') && set.has('snowpea')) return 'fusion_snownut';
        if (set.has('peashooter') && set.has('iceshroom')) return 'snowpea';
        if (set.has('peashooter') && set.has('squash')) return 'splitpea';
        if (set.has('melonpult') && set.has('iceshroom')) return 'wintermelon';
        if (set.has('repeater') && set.has('spikeweed')) return 'cattail';
        if (set.has('melonpult') && set.has('cattail')) return 'fusion_melon_cattail';
        if (set.has('wintermelon') && set.has('cattail')) return 'fusion_wintermelon_cattail';
        if (set.has('puffshroom') && set.has('sunflower')) return 'sunshroom';
        if (plantA === 'fumeshroom' && plantB === 'fumeshroom') return 'gloomshroom';
        if (plantA === 'spikeweed' && plantB === 'spikeweed') return 'spikerock';
        if (set.has('puffshroom') && set.has('peashooter')) return 'scaredyshroom';
        if (set.has('wallnut') && set.has('jalapeno')) return 'torchwood';
        // 注意：大嘴花 + 高坚果 不合成西瓜投手（西瓜投手本就直接在选卡栏可选，v3.11.0 起删除此配方）
        
        // ===== v3.10.0 以卷心菜投手 / 玉米投手为基础的新融合 =====
        if (set.has('cabbagepult') && set.has('iceshroom')) return 'fusion_icecabbage'; // 寒冰卷心菜：破甲+减速
        if (set.has('kernelpult') && set.has('jalapeno')) return 'fusion_popcorn';      // 爆米花投手：破甲+3×3溅射
        if (set.has('cabbagepult') && set.has('wallnut')) return 'fusion_cabbagenut';   // 卷心菜堡垒：坚果肉盾+投掷
        if (set.has('cabbagepult') && set.has('kernelpult')) return 'fusion_veggiepult'; // 双料投手：两种弹药交替
        
        // ===== v3.2.38 新增低成本配方 =====
        if (set.has('splitpea') && set.has('sunflower')) return 'fusion_starfruit';   // 杨桃：裂荚射手+向日葵
        if (set.has('puffshroom') && set.has('garlic')) return 'fusion_hypnoshroom'; // 魅惑菇：小喷菇+大蒜
        if (set.has('wallnut') && set.has('tallnut')) return 'fusion_pumpkinhead';    // 南瓜壳：坚果墙+高坚果（手套特殊流程=套壳）
        if (set.has('chomper') && set.has('wallnut')) return 'fusion_chomper_wallnut'; // 大嘴坚果：大嘴花+坚果墙（修复"图鉴有、规则无"）

        // ===== v3.36.0 新增融合（用户要求"再想一些融合植物"）=====
        // 注意：同株×2 的判定必须用精确双参数（Set.has 两次查同一值会误配任意含该植物的组合）
        // ===== v3.37.0：删除「坚果×2=高坚果 / 小喷菇+大喷菇=忧郁菇 / 樱桃+寒冰菇=寒冰炸弹」三条重复配方 =====
        // ===== v3.46.0：删除「坚果向日葵」（用户裁定外观太丑）=====
        if (set.has('snowpea') && set.has('starfruit')) return 'fusion_snowpea_starfruit'; // 冰杨桃：杨桃五向齐射 + 寒冰减速

        // ===== v3.45.0 十一条新融合（用户批准名单）=====
        if (set.has('gatlingpea') && set.has('snowpea')) return 'fusion_gatlingsnow';   // 冰机枪射手：机枪 4 连发 × 冰弹减速
        if (set.has('cattail') && set.has('snowpea')) return 'fusion_snow_cattail';     // 冰猫尾草：全场追踪 × 冰弹减速
        if (set.has('gloomshroom') && set.has('iceshroom')) return 'fusion_gloomsnow';  // 冰忧郁菇：3×3 冰雾绞肉 + 减速
        if (plantA === 'starfruit' && plantB === 'starfruit') return 'fusion_starfruit10'; // 十芒杨桃：杨桃×2 十方向齐射
        if (set.has('potatomine') && set.has('jalapeno')) return 'fusion_firemine';     // 烈焰地雷：地雷布防 × 辣椒整行烈焰
        if (set.has('squash') && set.has('cherrybomb')) return 'fusion_boomsquash';     // 爆炸弹跳：窝瓜压扁 × 樱桃 3×3 爆炸
        if (set.has('kernelpult') && set.has('snowpea')) return 'fusion_icekernel';     // 冰玉米投手：玉米粒减速 + 黄油定身
        if (set.has('spikeweed') && set.has('torchwood')) return 'fusion_firespikeweed';// 火焰地刺：地刺 × 火炬=灼烧翻倍
        if (set.has('repeater') && set.has('torchwood')) return 'fusion_firerepeater';  // 火焰双发：豌豆过火炬=火焰（原版逻辑）
        if (plantA === 'twinsunflower' && plantB === 'twinsunflower') return 'fusion_quadsun'; // 四头向日葵：双子×2 产能翻倍
        if (set.has('tallnut') && set.has('jalapeno')) return 'fusion_firetallnut';     // 辣椒高坚果：硬壳 × 烫嘴（wallnut+辣椒=火炬已占用）

        // ===== v3.50.0 数据驱动新融合（PVZ_FUSION_EXTRA 表）=====
        // 命名规则 fusion_<p1>_<p2>，行为由 traits 自动组合；同对植物 set 匹配不分先后
        // v3.80.3：掉落物融合已删除，DROP_ONLY 拦截随之移除
        const extra = (window.PVZ_FUSION_EXTRA || []).find(f => set.has(f.a) && set.has(f.b));
        if (extra) return extra.type;
        return null;
    }

    // ===== v3.24.0 植物盲盒池 =====
    // v3.25.0 改版：①玉米加农炮移出盲盒（开出只占一格，与两格本体冲突）；
    // ②概率分层 —— 越普通权重越高(5)，中坚植物(3)，冰西瓜/猫尾草这类强力植物低频(1)。
    _plantBoxPool() {
        // 基础牌全部都在 seeds（classic）里；融合产物见 fusionOut（不含 cobcannon）
        const classic = this.seeds.map(s => s.type).filter(t => t !== 'plantbox');
        const fusionOut = ['repeater', 'threepeater', 'gatlingpea', 'twinsunflower', 'fumeshroom',
            'snowpea', 'splitpea', 'wintermelon', 'cattail', 'sunshroom', 'gloomshroom',
            'spikerock', 'scaredyshroom', 'torchwood', 'starfruit', 'hypnoshroom', 'pumpkinhead',
            'fusion_peaflower', 'fusion_nutshooter', 'fusion_frostbomb', 'fusion_cherrybomb_peashooter',
            'fusion_doomshroom_sunflower', 'fusion_sporemine', 'fusion_spikynut', 'fusion_snownut',
            'fusion_spikerock_tallnut', 'fusion_melon_cattail', 'fusion_wintermelon_cattail',
            'fusion_icecabbage', 'fusion_popcorn', 'fusion_cabbagenut', 'fusion_veggiepult',
            'fusion_starfruit', 'fusion_hypnoshroom', 'fusion_pumpkinhead', 'fusion_chomper_wallnut',
            'fusion_snowpea_starfruit',
            'fusion_gatlingsnow', 'fusion_snow_cattail', 'fusion_gloomsnow', 'fusion_starfruit10',
            'fusion_firemine', 'fusion_boomsquash', 'fusion_icekernel', 'fusion_firespikeweed',
            'fusion_firerepeater', 'fusion_quadsun', 'fusion_firetallnut']; // v3.36.0/v3.45.0 新融合入池
        // v3.50.0：数据驱动新融合全部入池（权重分层见 rare/mid）
        (window.PVZ_FUSION_EXTRA || []).forEach(f => fusionOut.push(f.type));
        // 权重分层：rare=强力低频(1) / mid=中坚(3) / 其余=普通高频(5)
        const rare = new Set(['gatlingpea', 'wintermelon', 'cattail', 'gloomshroom', 'twinsunflower',
            'doomshroom', 'spikerock',
            'fusion_wintermelon_cattail', 'fusion_melon_cattail', 'fusion_icecabbage',
            'fusion_frostbomb', 'fusion_doomshroom_sunflower', 'fusion_spikerock_tallnut',
            'fusion_veggiepult', 'fusion_chomper_wallnut', 'fusion_snowpea_starfruit',
            'fusion_gatlingsnow', 'fusion_snow_cattail', 'fusion_gloomsnow', 'fusion_quadsun',
            // v3.50.0 新融合强力档
            'fusion_wintermelon_cabbagepult', 'fusion_cabbage_tallnut',
            'fusion_gatlingpea_repeater', 'fusion_gatlingpea_cattail', 'fusion_melon_cabbagepult']);
        const mid = new Set(['repeater', 'threepeater', 'splitpea', 'snowpea', 'torchwood',
            'cabbagepult', 'kernelpult', 'garlic', 'fumeshroom', 'scaredyshroom', 'sunshroom',
            'pumpkinhead', 'hypnoshroom', 'starfruit', 'tallnut', 'iceshroom',
            'fusion_peaflower', 'fusion_nutshooter', 'fusion_cherrybomb_peashooter',
            'fusion_sporemine', 'fusion_spikynut', 'fusion_snownut', 'fusion_popcorn',
            'fusion_cabbagenut', 'fusion_starfruit', 'fusion_hypnoshroom', 'fusion_pumpkinhead',
            'fusion_starfruit10', 'fusion_firemine', 'fusion_boomsquash',
            'fusion_icekernel', 'fusion_firespikeweed', 'fusion_firerepeater', 'fusion_firetallnut',
            // v3.50.0 新融合中坚档
            'fusion_repeater_snowpea', 'fusion_threepeater_snowpea', 'fusion_splitpea_snowpea',
            'fusion_sunflower_iceshroom', 'fusion_peashooter_torchwood', 'fusion_melonpult_torchwood',
            'fusion_wintermelon_torchwood', 'fusion_wallnut_twinsunflower']);
        const pool = [...new Set([...classic, ...fusionOut])];
        const weighted = [];
        for (const t of pool) {
            // v3.52.0：向日葵系在盲盒里出率压低（用户：向日葵没什么实际作用还拉低攻击）
            let w = rare.has(t) ? 1 : (mid.has(t) ? 3 : 5);
            if (t === 'sunflower' || t === 'twinsunflower') w = 2;
            for (let i = 0; i < w; i++) weighted.push(t);
        }
        return weighted;
    }

    // ===== v3.24.0 玉米加农炮（PVZ1 原版 Cob Cannon）=====
    // 配方：两个玉米投手横向相邻摆放，手套再拿起任意第三个玉米投手，
    // 放到相邻对的其中一株上 → 三株合体为玉米加农炮，占两格（原相邻对的位置）。
    _findKernelPair(target, exclude) {
        const b = this.board;
        for (const dc of [-1, 1]) {
            const c = target.col + dc;
            if (c < 0 || c >= b.cols) continue;
            const nb = b.grid[target.row] ? b.grid[target.row][c] : null;
            if (nb && nb !== exclude && !nb.isDead && nb.type === 'kernelpult') {
                return (dc === -1) ? { a: nb, b: target } : { a: target, b: nb };
            }
        }
        return null;
    }

    // v3.65.0 玉米加农炮落位公共函数：在 (row, colL) 占两格生成 cobcannon（融合合并与经典直种共用）
    _spawnCobCannon(row, colL) {
        const bd = this.board;
        const cob = new Plant(this, 'cobcannon');
        cob.row = row;
        cob.col = colL;
        cob._cobCol2 = colL + 1;                       // 占两格：主格 colL + 右格 colL+1
        cob.x = bd.offsetX + colL * bd.cellWidth + bd.cellWidth;   // 两格中点
        cob.y = bd.offsetY + row * bd.cellHeight + bd.cellHeight / 2;
        cob.element.style.top = `${cob.y + cob.yOffset}px`;
        bd.grid[row][colL] = cob;
        bd.grid[row][colL + 1] = cob;
        this.entities.push(cob);
        return cob;
    }

    _mergeCobCannon(a, b, third) {
        const bd = this.board;
        const row = a.row;
        const colL = Math.min(a.col, b.col);
        if (colL + 1 >= bd.cols) return;
        // 三株材料全部下场（清掉它们占用的所有格子——cobcannon 之前可能有别的占格状态）
        [a, b, third].forEach(p => {
            p.element.style.display = 'block';
            p.hp = 0;
            for (let r = 0; r < bd.rows; r++) {
                for (let c = 0; c < bd.cols; c++) {
                    if (bd.grid[r][c] === p) bd.grid[r][c] = null;
                }
            }
        });
        this._spawnCobCannon(row, colL);
        if (this.audioManager) this.audioManager.play('btn');
        this.announceFusionOnce('cobcannon');
    }

    // 点击充能完毕的玉米加农炮 → 进入瞄准模式（准星跟随鼠标，M 键发射，点击任意处取消）
    enterCobAim(cob) {
        if (this.aimingCob) return;
        this.aimingCob = cob;
        const cross = document.createElement('div');
        cross.style.cssText = [
            'position:absolute', 'width:56px', 'height:56px', 'pointer-events:none',
            'border:3px solid #ff3b30', 'border-radius:50%',
            'transform:translate(-50%,-50%)', 'z-index:9999',
            'box-shadow:0 0 10px rgba(255,0,0,.55), inset 0 0 6px rgba(255,0,0,.35)'
        ].join(';');
        cross.innerHTML = [
            '<div style="position:absolute;left:50%;top:-10px;width:2px;height:14px;background:#ff3b30;transform:translateX(-50%)"></div>',
            '<div style="position:absolute;left:50%;bottom:-10px;width:2px;height:14px;background:#ff3b30;transform:translateX(-50%)"></div>',
            '<div style="position:absolute;top:50%;left:-10px;height:2px;width:14px;background:#ff3b30;transform:translateY(-50%)"></div>',
            '<div style="position:absolute;top:50%;right:-10px;height:2px;width:14px;background:#ff3b30;transform:translateY(-50%)"></div>',
            '<div style="position:absolute;left:50%;top:50%;width:6px;height:6px;background:#ff3b30;border-radius:50%;transform:translate(-50%,-50%)"></div>'
        ].join('');
        this.entityLayer.appendChild(cross);
        this._cobCrosshair = cross;
        this.showAnnouncement('移动鼠标瞄准，按 M 键发射玉米炮！', '#ff7f27');
    }

    exitCobAim() {
        if (this._cobCrosshair && this._cobCrosshair.parentNode) this._cobCrosshair.remove();
        this._cobCrosshair = null;
        this.aimingCob = null;
    }

    fireCobCannon() {
        const cob = this.aimingCob;
        const pos = this._cobAimPos;
        this.exitCobAim();
        if (!cob || cob.isDead || !cob.chargeReady || !pos) return;
        cob.fireCob(pos.x, pos.y);
    }
    
    // ===== v3.40.0 冰车冰道：冰车驶过的格子结冰，30 秒后融化；冰面上无法种植 =====
    layIce(row, col) {
        if (row < 0 || row >= this.board.rows || col < 0 || col >= this.board.cols) return;
        if (this.iceTrails.some(t => t.row === row && t.col === col)) return;
        const el = document.createElement('img');
        el.src = 'assets/images/Zombies/Zomboni/ice.png?v=' + this.assetStamp();
        const x = this.board.offsetX + col * this.board.cellWidth;
        const y = this.board.offsetY + row * this.board.cellHeight;
        el.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' +
            this.board.cellWidth + 'px;height:' + this.board.cellHeight + 'px;z-index:0;pointer-events:none;opacity:.92;';
        // 插到实体层最底下，冰是"地面"，永远垫在植物/僵尸下面
        if (this.entityLayer.firstChild) this.entityLayer.insertBefore(el, this.entityLayer.firstChild);
        else this.entityLayer.appendChild(el);
        this.iceTrails.push({ row, col, el, ttl: 30 });
    }

    updateIceTrails(dt) {
        if (!this.iceTrails || !this.iceTrails.length) return;
        for (let i = this.iceTrails.length - 1; i >= 0; i--) {
            const t = this.iceTrails[i];
            t.ttl -= dt;
            if (t.ttl <= 2) t.el.style.opacity = Math.max(0, t.ttl / 2) * 0.92; // 最后一秒渐隐
            if (t.ttl <= 0) {
                if (t.el && t.el.parentNode) t.el.remove();
                this.iceTrails.splice(i, 1);
            }
        }
    }

    isIced(row, col) {
        return !!(this.iceTrails && this.iceTrails.some(t => t.row === row && t.col === col));
    }

    // v3.47.0：火爆辣椒可以直接烧毁冰道（原版行为）——辣椒爆炸时清掉整行冰面，
    // 烧完的格子立刻恢复可种植；毁灭菇陨石坑 30 秒不动，冰道只有辣椒能提前清
    meltIceTrailsInRow(row) {
        if (!this.iceTrails || !this.iceTrails.length) return;
        for (let i = this.iceTrails.length - 1; i >= 0; i--) {
            const t = this.iceTrails[i];
            if (t.row !== row) continue;
            if (t.el && t.el.parentNode) t.el.remove();
            this.iceTrails.splice(i, 1);
        }
    }

    tryPlanting(type, row, col) {
        if (this.state !== 'PLAYING') return; // v3.11.2：终局面板/回放期间禁止种植
        // v3.40.0：冰面上不能种植（冰车驶过留下的冰道）
        if (this.isIced(row, col)) {
            this.showAnnouncement('冰面上种不了植物，等冰化掉吧', '#88ddff');
            return;
        }
        // 砸罐子模式：植物罐砸出的免费一次性植物卡 —— 无阳光、无冷却，种下即消耗
        if (this.vaseFreeCards && this.vaseFreeCards.length > 0) {
            const fc = this.vaseFreeCards.find(c => !c.consumed && c.type === type);
            if (fc) {
                // 砸罐子：目标格上有未砸的罐子 → 不能种（先砸开再种），卡不消耗
                if (this.vaseMode && this.vases && this.vases.length) {
                    const underVase = this.vases.some(v => !v.smashed && v.row === row && v.col === col);
                    if (underVase) {
                        this.showAnnouncement('这个格子上还有罐子，先砸开它再种吧', '#ffaa00');
                        return;
                    }
                }
                if (this.board.canPlant(row, col)) {
                    const plant = new Plant(this, type);
                    if (this.board.addPlant(plant, row, col)) {
                        fc.consumed = true;
                        if (fc.element && fc.element.parentNode) {
                            fc.element.parentNode.removeChild(fc.element);
                        }
                        this.updateUI();
                        this.audioManager.play('plant');
                        if (type === 'plantern') {
                            // 路灯花种植瞬间照亮周围一圈罐子里的内容
                            this.lightUpNeighbors(row, col);
                        }
                    }
                } else {
                    // v3.12.0：免费的南瓜套也可以直接套在已有植物上
                    const ep = this.board.grid[row] ? this.board.grid[row][col] : null;
                    const oneShotEp = ['cherrybomb', 'jalapeno', 'potatomine', 'squash', 'doomshroom', 'iceshroom', 'crater'];
                    // v3.25.0：空南瓜套（壳墙，如砸罐子砸出的剩余南瓜套）也可以把免费植物种进壳里
                    if (ep && !ep.isDead && ep.type === 'pumpkinhead' && type !== 'pumpkinhead' &&
                        !oneShotEp.includes(type)) {
                        const shellHp = ep.hp;
                        ep.hp = 0;
                        this.board.grid[row][col] = null;
                        const plant = new Plant(this, type);
                        if (this.board.addPlant(plant, row, col)) {
                            plant.shield = { hp: Math.max(1, Math.min(4000, Math.round(shellHp))), maxHp: 4000 };
                            plant._spawnShieldEl();
                            fc.consumed = true;
                            if (fc.element && fc.element.parentNode) fc.element.parentNode.removeChild(fc.element);
                            this.updateUI();
                            this.audioManager.play('plant');
                            if (type === 'plantern') this.lightUpNeighbors(row, col);
                        } else {
                            this.board.grid[row][col] = ep; // 回滚
                            ep.hp = shellHp;
                        }
                    } else if (ep && !ep.isDead && type === 'pumpkinhead' && ep.type !== 'pumpkinhead' &&
                        !ep.shield && !ep.shieldEl &&
                        !oneShotEp.includes(ep.type)) {
                        if (ep.attachShield()) {
                            fc.consumed = true;
                            if (fc.element && fc.element.parentNode) fc.element.parentNode.removeChild(fc.element);
                            this.audioManager.play('plant');
                        }
                    }
                }
                return; // 无论成功与否都走免费卡逻辑（失败不消耗卡）
            }
        }

        if (this.cooldowns[type] > 0) return; // Still cooling down

        const seed = this.seeds.find(s => s.type === type);
        if (!seed) return;
        if (this.sunCount < seed.cost) return;

        // v3.74.0 掉落物融合（种在掉落物上）—— v3.80.3 整体删除

        let existingPlant = this.board.grid[row][col];
        
        // Wallnut First Aid
        if (existingPlant) {
            if ((type === 'wallnut' && existingPlant.hasTrait('wallnut')) ||
                (type === 'tallnut' && existingPlant.hasTrait('tallnut'))) {
                if (existingPlant.hp < existingPlant.maxHp) {
                    existingPlant.hp = existingPlant.maxHp;
                    // Reset appearance if they have visual damage states (cracked nut)
                    if (existingPlant.updateAppearance) {
                        existingPlant.updateAppearance();
                    }
                    // Reset visual filter if applicable (ice blue)
                    // But actually wait, updateAppearance will handle basic images.
                    // Let's just deduct sun and return.
                    this.sunCount -= seed.cost;
                    this.sunCountElement.innerText = this.sunCount;
                    this.cooldowns[type] = seed.cooldown;
                    this.updateUI();
                    this.audioManager.play('plant');
                    return;
                }
            }
        }
        
        // ===== v3.24.0 植物盲盒（500 阳光）=====
        // 种下的不是植物本身：扣 500 阳光后从"经典冒险 + 融合进化"全植物池随机开出一株种下。
        if (type === 'plantbox') {
            if (this.board.canPlant(row, col)) {
                const pool = this._plantBoxPool();
                const got = pool[Math.floor(Math.random() * pool.length)];
                let plant = new Plant(this, got);
                if (this.board.addPlant(plant, row, col)) {
                    this.sunCount -= seed.cost;
                    this.sunCountElement.innerText = this.sunCount;
                    this.cooldowns[type] = seed.cooldown;
                    this.updateUI();
                    this.audioManager.play('plant');
                    // v3.26.0：礼盒开箱演出——礼盒短暂盖在格上，600ms 后裂开成残骸露出植物
                    const cx = this.board.offsetX + col * this.board.cellWidth + this.board.cellWidth / 2;
                    const cy = this.board.offsetY + row * this.board.cellHeight + this.board.cellHeight / 2;
                    const box = document.createElement('img');
                    box.src = `assets/images/Plants/PlantBox/GiftBox.png?v=${this.assetStamp()}`;
                    // v3.35.0：礼盒重画为宽幅构图(192x140)，开箱演出同步改宽尺寸
                    box.style.cssText = 'position:absolute;width:78px;height:57px;object-fit:contain;pointer-events:none;' +
                        'left:' + cx + 'px;top:' + cy + 'px;transform:translate(-50%,-50%);' +
                        'z-index:' + (Math.floor(cy) + 2) + ';';
                    this.entityLayer.appendChild(box);
                    if (this.audioManager.playFx) this.audioManager.playFx('box_open');
                    setTimeout(() => {
                        box.remove();
                        this._giftShatterFX(cx, cy);
                        this.showAnnouncement(`🎁 植物盲盒开出：${this.getPlantName(got)}！`, '#c8a2ff');
                    }, 600);
                }
            }
            return;
        }

        // ===== v3.65.0 玉米加农炮直接种植（经典模式选卡）：占两格（col + col+1）=====
        if (type === 'cobcannon') {
            const b = this.board;
            if (col + 1 >= b.cols) {
                this.showAnnouncement('玉米加农炮要占两格，最右边一列放不下', '#ffaa00');
            } else if (this.board.canPlant(row, col) && this.board.canPlant(row, col + 1)) {
                this._spawnCobCannon(row, col);
                this.sunCount -= seed.cost;
                this.sunCountElement.innerText = this.sunCount;
                this.cooldowns[type] = seed.cooldown;
                this.updateUI();
                this.audioManager.play('plant');
            } else {
                this.showAnnouncement('玉米加农炮要占两格空地才能种下', '#ffaa00');
            }
            return;
        }

        // ===== 南瓜壳（PVZ 原版玩法）=====
        // v3.12.0 双向套装：南瓜壳可套在已有植物上，也可空地独立成株（壳墙），
        // 之后把任意植物种进壳格 = 植物进壳（壳剩余耐久转为护甲）。
        if (type === 'pumpkinhead') {
            if (!existingPlant || existingPlant.isDead) {
                // 空地：独立壳墙（三阶段裂纹），等待植物入住
                if (this.board.canPlant(row, col)) {
                    let shell = new Plant(this, 'pumpkinhead');
                    if (this.board.addPlant(shell, row, col)) {
                        this.sunCount -= seed.cost;
                        this.sunCountElement.innerText = this.sunCount;
                        this.cooldowns[type] = seed.cooldown;
                        this.updateUI();
                        this.audioManager.play('plant');
                    }
                }
                return;
            }
            if (existingPlant.type === 'pumpkinhead') {
                return;
            }
            if (existingPlant.shield || existingPlant.shieldEl) {
                return;
            }
            const oneShot = ['cherrybomb', 'jalapeno', 'potatomine', 'squash', 'doomshroom', 'iceshroom', 'crater'];
            if (oneShot.includes(existingPlant.type)) {
                return;
            }
            if (existingPlant.attachShield()) {
                this.sunCount -= seed.cost;
                this.sunCountElement.innerText = this.sunCount;
                this.cooldowns[type] = seed.cooldown;
                this.updateUI();
                this.audioManager.play('plant');
            }
            return;
        }

        // ===== v3.12.0：植物放进空南瓜壳（双向套装）=====
        // 壳的剩余耐久转移为新宿主的护甲；宿主占据壳的格位。
        if (existingPlant && !existingPlant.isDead && existingPlant.type === 'pumpkinhead') {
            const shellHp = existingPlant.hp;
            existingPlant.hp = 0;
            this.board.grid[row][col] = null;
            let plant = new Plant(this, type);
            if (this.board.addPlant(plant, row, col)) {
                plant.shield = { hp: Math.max(1, shellHp), maxHp: 4000 };
                plant._spawnShieldEl();
                this.sunCount -= seed.cost;
                this.sunCountElement.innerText = this.sunCount;
                this.cooldowns[type] = seed.cooldown;
                this.updateUI();
                this.audioManager.play('plant');
            }
            return;
        }

        // ===== v3.12.0：炸弹放到已有植物上 → 不移位，原地附着 =====
        // 引爆时以宿主位置为中心，产生与一次性植物完全相同的爆炸效果（宿主保留）。
        // 融合进化模式：若炸弹与宿主有配方，引爆瞬间按配方原地融合。
        const isBomb = ['cherrybomb', 'doomshroom', 'iceshroom', 'jalapeno'].includes(type);
        if (existingPlant && !existingPlant.isDead && isBomb) {
            if (this.fusionMode) {
                const fusionType = this.getFusionResult(type, existingPlant.type);
                if (!fusionType) {
                    this.showAnnouncement('该植物没有与这颗炸弹的融合配方，可种在它旁边的空格上', '#ff0000');
                    return; // 不消耗阳光
                }
            }
            this.sunCount -= seed.cost;
            this.sunCountElement.innerText = this.sunCount;
            this.cooldowns[type] = seed.cooldown;
            this.updateUI();
            const bomb = new Plant(this, type);
            bomb.row = existingPlant.row;
            bomb.col = existingPlant.col;
            bomb.x = existingPlant.x;
            bomb.y = existingPlant.y;
            bomb.yOffset = existingPlant.yOffset || 0;
            bomb._bombHost = existingPlant; // 附着标记（炸点=宿主位置）
            this.entities.push(bomb);
            bomb.update(0);
            this.audioManager.play('plant');
            this.showAnnouncement(`炸弹已附着在${this.getPlantName(existingPlant.type)}身上，即将原地引爆`, '#ffaa00');
            return;
        }

        if (this.board.canPlant(row, col)) {
            let plant = new Plant(this, type);
            if (this.board.addPlant(plant, row, col)) {
                this.sunCount -= seed.cost;
                this.sunCountElement.innerText = this.sunCount;
                this.cooldowns[type] = seed.cooldown; // Start cooldown
                this.updateUI();
                this.audioManager.play('plant');
                if (isBomb && this.fusionMode) {
                    this.showAnnouncement('炸弹已就位：即将自动引爆，并融合周围 3×3 内可融合的植物', '#ffaa00');
                }
            }
        }
    }
    
    updateUI() {
        const cards = document.querySelectorAll('#seed-bank .seed-card');
        cards.forEach(card => {
            const type = card.dataset.type;
            const cost = parseInt(card.dataset.cost);
            const totalCooldown = parseFloat(card.dataset.cooldown);
            const currentCooldown = this.cooldowns[type];
            
            const overlay = card.querySelector('.cooldown-overlay');
            
            // Check if on cooldown
            if (currentCooldown > 0) {
                card.classList.add('disabled');
                const percent = (currentCooldown / totalCooldown) * 100;
                overlay.style.height = `${percent}%`;
            } else {
                overlay.style.height = '0%';
                if (this.sunCount >= cost) {
                    card.classList.remove('disabled');
                } else {
                    card.classList.add('disabled'); // Not enough sun
                }
            }
        });
    }
    
    gameOver() {
        if (this.state === 'GAMEOVER') return;
        this.state = 'GAMEOVER';
        this._hidePauseUi(); // v3.43.0 结算时收起暂停 UI
        this.audioManager.stop('bgm');
        this.audioManager.play('lose');
        // v3.11.1：失败画面与砸罐子胜利 / 我是僵尸胜负统一为同一套 vase-win 面板
        // （此前是 ZombiesWon.png 大图 + 两个原生浏览器按钮，与其它三个结束画面割裂）
        this._showGameOverPanel();
    }

    // 统一失败面板：经典冒险 / 融合进化 / 砸罐子（我是僵尸走 zombieLose，已是同款）
    _showGameOverPanel() {
        this._removeGameOverEls();
        const modeName = this.fusionMode ? '融合进化' : '经典冒险';
        // 砸罐子失败保留难度角标；经典/融合没有难度，用模式名占同一位置
        const chip = this.vaseMode ? `难度 · ${this._vaseDiffCfg().label}` : `模式 · ${modeName}`;
        const overlay = document.createElement('div');
        overlay.className = 'vase-win-overlay';
        overlay.innerHTML = `
            <div class="vase-win-panel">
                <div class="vase-win-lv" style="color:#a04030;">THE ZOMBIES ATE YOUR BRAINS!</div>
                <div class="vase-win-title" style="color:#7a2a18;">僵尸吃掉了你的脑子！</div>
                <div class="vase-win-sub">植物防线被突破了<span class="vase-win-diff">${chip}</span></div>
                <div class="vase-win-score">Final Score：<b>${this.score}</b></div>
                <div class="vase-win-btns">
                    <button id="go-retry" class="vase-win-btn again">再玩一局</button>
                    <button id="go-exit" class="vase-win-btn exit">退出</button>
                </div>
            </div>`;
        this.container.appendChild(overlay);
        overlay.querySelector('#go-retry').onclick = () => {
            this.audioManager.play('btn');
            if (this.vaseMode) this.restartVaseLevel(); // 砸罐子：原地清场重摆罐子
            else this.retryClassicLevel();              // 经典/融合：清场回选卡界面
        };
        overlay.querySelector('#go-exit').onclick = () => location.reload(); // 回主菜单（干净重载）
        this._gameOverEls = [overlay];
    }

    _removeGameOverEls() {
        if (this._gameOverEls) {
            this._gameOverEls.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
            this._gameOverEls = null;
        }
    }

    // v3.18.0 硬清场：entityLayer 里除署名外全部移除 —— 无论哪条路径泄漏的孤儿 DOM
    // （手套正拿的植物/融合失败的 new Plant/死亡过滤器漏删的叠加件），再玩一局后草坪必须干净
    _hardSweepEntityLayer() {
        [...this.entityLayer.children].forEach(el => {
            if (el === this._sigEl) return; // 署名保留
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        if (this.inputManager) {
            this.inputManager.selectedSeed = null;
            this.inputManager.isShovelSelected = false;
            this.inputManager.dragGhost.style.display = 'none';
        }
        this.gloveSource = null;
        this.isGloveDragging = false;
    }

    // v3.11.2 统一实体 DOM 清理：主元素 + 融合叠加件。
    // fusionOverlay 是挂在 entityLayer 上的独立 <img>（Plant.js 构造末尾 appendChild），
    // 重开只删 e.element 会把融合部件留在场上 —— "半株植物"残影，重开残留类 bug 的同族坑。
    _removeEntityDom(e) {
        if (e.element && e.element.parentNode) e.element.parentNode.removeChild(e.element);
        if (e.fusionOverlay && e.fusionOverlay.parentNode) e.fusionOverlay.parentNode.removeChild(e.fusionOverlay);
        // v3.16.0：南瓜壳的两层叠加件（前壁/背壁）是独立 DOM —— 不清会残留成
        // "再玩一局后场上还挂着没用的壳"（用户实测 bug）
        if (e.shieldEl && e.shieldEl.parentNode) e.shieldEl.parentNode.removeChild(e.shieldEl);
        if (e.shieldBackEl && e.shieldBackEl.parentNode) e.shieldBackEl.parentNode.removeChild(e.shieldBackEl);
        // v3.77.1：僵尸独立挂件 DOM 一并清走 —— 我是僵尸里植物头僵尸吃脑退场走 isDead
        // 直退（不经过死亡动画的 dropPlantHead），头顶植物会残留壳在僵尸终点（用户实测 bug）；
        // 同族的还有融合僵尸防具挂件/灼烧火焰/锤子木锤
        if (e.headEl && e.headEl.parentNode) e.headEl.parentNode.removeChild(e.headEl);
        if (e._accEl && e._accEl.parentNode) e._accEl.parentNode.removeChild(e._accEl);
        if (e._flameEl && e._flameEl.parentNode) e._flameEl.parentNode.removeChild(e._flameEl);
        if (e._hammerEl && e._hammerEl.parentNode) e._hammerEl.parentNode.removeChild(e._hammerEl);
    }

    // 经典/融合「再玩一局」：清场 + 重置阳光/分数/刷怪节奏 → 回到选卡界面重新选植物
    retryClassicLevel() {
        this._removeGameOverEls();
        this.entities.forEach(e => this._removeEntityDom(e));
        this.entities = [];
        this._hardSweepEntityLayer(); // v3.18.0：硬清场，孤儿 DOM 一律带走
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) this.board.grid[r][c] = null;
        }
        this.score = 0;
        this.updateScore();
        this.sunCount = 50;
        this.sunCountElement.innerText = String(this.sunCount);
        this.waveManager.reset();
        this.showSeedChooser();
    }
    
    // ===== v3.44.0 选卡校验弹窗（深棕框，与其他弹窗同款）：继续 / 添加 =====
    _showSeedWarn(onGo) {
        let ov = document.getElementById('seed-warn-overlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'seed-warn-overlay';
            ov.innerHTML = '<div class="seed-warn-panel">' +
                '<div class="seed-warn-title">⚠ 卡组提醒</div>' +
                '<div class="seed-warn-text">你没有带阳光或攻击的植物，请带上。</div>' +
                '<div class="seed-warn-btns">' +
                    '<button id="seed-warn-add">添 加</button>' +
                    '<button id="seed-warn-go">继 续</button>' +
                '</div></div>';
            document.body.appendChild(ov);
        }
        ov.querySelector('#seed-warn-add').onclick = () => {
            this.audioManager.play('btn');
            ov.style.display = 'none';
        };
        ov.querySelector('#seed-warn-go').onclick = () => {
            this.audioManager.play('btn');
            ov.style.display = 'none';
            if (onGo) onGo();
        };
        ov.style.display = 'flex';
    }

    // ===== v3.43.0 暂停系统 =====
    // 左下角按钮 + 全屏遮罩（遮罩上点击 = 继续）。遮罩同时是"输入闸"：
    // 暂停中草坪/罐子/卡片的一切点击都会先打到遮罩上，无法穿透。
    _buildPauseUi() {
        const ui = document.getElementById('ui-layer');
        if (ui && !document.getElementById('btn-pause')) {
            const btn = document.createElement('button');
            btn.id = 'btn-pause';
            btn.innerText = '⏸ 暂停';
            btn.addEventListener('click', () => this.togglePause());
            ui.appendChild(btn);
        }
        if (this.container && !document.getElementById('pause-overlay')) {
            const ov = document.createElement('div');
            ov.id = 'pause-overlay';
            ov.innerHTML = '<div class="pause-panel"><div class="pause-big">⏸ 已暂停</div>' +
                '<div class="pause-tip">点击任意处继续</div></div>'; // v3.44.0 删掉抽象的"游戏完全静止"
            ov.addEventListener('click', () => this.togglePause());
            this.container.appendChild(ov);
        }
    }
    togglePause() {
        if (this.state !== 'PLAYING') return;
        this.paused = !this.paused;
        const ov = document.getElementById('pause-overlay');
        const btn = document.getElementById('btn-pause');
        if (ov) ov.style.display = this.paused ? 'flex' : 'none';
        if (btn) btn.innerText = this.paused ? '▶ 继续' : '⏸ 暂停';
        if (this.paused) this.audioManager.pauseBgm();
        else this.audioManager.resumeBgm();
        this.audioManager.play('btn');
    }
    // 结算面板出现 / 回主菜单时收起暂停 UI（防 GAMEOVER 后还能点出暂停遮罩）
    _hidePauseUi() {
        this.paused = false;
        const ov = document.getElementById('pause-overlay');
        const btn = document.getElementById('btn-pause');
        if (ov) ov.style.display = 'none';
        if (btn) { btn.style.display = 'none'; btn.innerText = '⏸ 暂停'; }
    }

    loop(timestamp) {
        // Delta time in seconds
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Cap deltaTime to prevent huge jumps if tab was inactive
        const dt = Math.min(deltaTime, 0.1); 
        
        if (this.state === 'PLAYING') {
            // v3.43.0：暂停时不执行任何 update —— 攻击/效果/冷却/刷怪全部冻结，画面静止
            if (!this.paused) {
                for (let i = 0; i < this.gameSpeed; i++) {
                    this.update(dt);
                }
            }
            requestAnimationFrame((t) => this.loop(t));
        }
    }
    
    update(deltaTime) {
        this.waveManager.update(deltaTime);
        this.collisionManager.update();
        this.updateIceTrails(deltaTime); // v3.40.0：冰车冰道融化
        
        // 时间制随机事件（融合进化模式关闭）
        if (!this.fusionMode && this.eventTimer > 0) {
            this.eventTimer -= deltaTime;
            if (this.eventTimer <= 0) {
                this.eventTimer = 120 + Math.random() * 60; // 2 to 3 minutes
                this.triggerRandomEvent();
            }
        }
        
        // Update cooldowns
        let uiNeedsUpdate = false;
        for (let type in this.cooldowns) {
            if (this.cooldowns[type] > 0) {
                this.cooldowns[type] -= deltaTime;
                if (this.cooldowns[type] < 0) this.cooldowns[type] = 0;
                uiNeedsUpdate = true;
            }
        }
        if (uiNeedsUpdate) this.updateUI();
        
        // Sky sun generation（砸罐子/我是僵尸模式关闭天降阳光：我是僵尸的阳光只来自初始给发 + 啃向日葵）
        if (!this.vaseMode && !this.zombieMode) {
            this.skySunTimer += deltaTime;
            if (this.skySunTimer >= this.skySunInterval) {
                this.skySunTimer = 0;
                const randomX = this.board.offsetX + Math.random() * (this.board.cols * this.board.cellWidth);
                this.entities.push(new Sun(this, randomX, -50));
            }
        }
        
        // Update all entities
        for (let i = 0; i < this.entities.length; i++) {
            this.entities[i].update(deltaTime);
        }
        
        // Clean up dead entities (remove from DOM and array)
        this.entities = this.entities.filter(e => {
            if (e.isDead) {
                // v3.18.0：改走统一清理 —— 旧写法只删主元素，南瓜壳两层/融合叠加件/
                // 梯子等独立 DOM 会残留成"看不见的僵尸壳"（重开残留 bug 的同族根源）
                this._removeEntityDom(e);
                if (e.ladderOverlay && e.ladderOverlay.parentNode) e.ladderOverlay.parentNode.removeChild(e.ladderOverlay);
                if (e.cavityEl && e.cavityEl.parentNode) e.cavityEl.parentNode.removeChild(e.cavityEl);
                return false;
            }
            return true;
        });
        
        // Z-Sorting using element zIndex
        this.entities.forEach(e => {
            if (e.element) {
                let z = Math.floor(e.y);
                // v3.14.0：冰车/巨人/Boss 等大型僵尸画在同行植物之上（车身应遮挡被碾的植物）
                if (e instanceof Zombie && (e.type === 'zomboni' || e.type === 'gargantuar' || e.type === 'lgboss')) z += 3;
                if (e instanceof Projectile) z += 1000; // Projectiles always on top of row
                if (e instanceof Sun) z += 2000; // Suns always on top of EVERYTHING
                e.element.style.zIndex = z;
                // v3.27.0：融合叠加层（如地刺坚果的"坚果身+地刺"）跟着本体一起排层级，
                // 且永远压在主体之上 —— 旧写法 zIndex 恒为 1，叠加件被本体和所有实体压在底下
                if (e.fusionOverlay) e.fusionOverlay.style.zIndex = z + 1;
            }
        });

        // 砸罐子：每帧检查胜利条件（罐子全砸完 + 场上僵尸消失）——
        // 这样即使最后一波僵尸是被植物打死而非砸罐砸出来的，胜利画面也会出现
        if (this.vaseMode) this.checkVaseVictory();
        // 我是僵尸：每帧胜负检测（僵尸全灭且阳光不足 → 判负；吃脑胜利在 Zombie.js 触发）
        if (this.zombieMode) this._checkZombieEnd(deltaTime);
    }

    showAnnouncement(text, color) {
        if (!this.announcementUI) {
            this.announcementUI = document.createElement('div');
            this.announcementUI.style.position = 'absolute';
            this.announcementUI.style.bottom = '10%';
            this.announcementUI.style.left = '50%';
            this.announcementUI.style.transform = 'translate(-50%, 0)';
            this.announcementUI.style.fontSize = '24px';
            this.announcementUI.style.fontWeight = 'bold';
            this.announcementUI.style.textShadow = '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000';
            this.announcementUI.style.zIndex = '5000';
            this.announcementUI.style.pointerEvents = 'none';
            this.announcementUI.style.opacity = '0';
            this.announcementUI.style.transition = 'opacity 0.5s';
            this.container.appendChild(this.announcementUI);
        }
        this.announcementUI.innerText = text;
        this.announcementUI.style.color = color || 'white';
        this.announcementUI.style.opacity = '1';
        
        if (this.announcementTimeout) clearTimeout(this.announcementTimeout);
        this.announcementTimeout = setTimeout(() => {
            this.announcementUI.style.opacity = '0';
        }, 4000);
    }

    // v3.50.0 大技能通知：同一株的大技能一局只播报一次（用户：大招不要老是说，
    // 最下面那一行只用出现一次就可以了）——首次触发播报，后续全部静默生效
    showUltimateNotice(key, text, color) {
        if (!this._ultAnnounced) this._ultAnnounced = new Set();
        if (this._ultAnnounced.has(key)) return;
        this._ultAnnounced.add(key);
        this.showAnnouncement(text, color);
    }

    triggerRandomEvent() {
        if (this.fusionMode || this.vaseMode || this.zombieMode) return; // 融合进化 / 砸罐子 / 我是僵尸模式 不触发全局随机事件
        if (!this.eventManager) this.eventManager = new EventManager(this);
        this.eventManager.trigger();
    }

    // ===== 砸罐子模式（Vasebreaker）v3.5.0 难度分级：简单 / 困难 / 地狱 =====
    // 全部难度参数见 _vaseDiffCfg():
    //   罐子总数范围、类型抽签桶(plant/question/zombie 权重)、问号罐内部出僵尸概率、
    //   植物罐内部出植物卡概率、僵尸池强度、僵尸血量倍率(hpMul)。
    // 所有罐子的具体内容(植物种/僵尸种/阳光)都在本阶段预掷生成(v.content),
    //   smash 时直接读取, 这样路灯花揭示出来的就是真正会砸出来的东西。
    setupVases() {
        const cfg = this._vaseDiffCfg();
        const candidates = [];
        for (let r = 1; r < this.board.rows; r++) {
            for (let c = 1; c < this.board.cols; c++) candidates.push([r, c]);
        }
        const total = cfg.totalMin + Math.floor(Math.random() * (cfg.totalMax - cfg.totalMin + 1));
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        const chosen = candidates.slice(0, total);

        // v3.15.0 金色罐子（仅地狱）：每局 1 个必出、50% 追加第 2 个（上限 2）。
        // 随机挑选已选罐位升级为金罐 —— 内容改为 50% 融合高阶植物 / 50% 强力僵尸。
        let goldenSlots = new Set();
        if (cfg.key === 'hell' && total >= 1) {
            const goldCount = Math.min(total, 1 + (Math.random() < 0.5 ? 1 : 0));
            // v3.23.0：金罐只落在中间排（col 3~5）——问号罐靠前、僵尸罐靠后、金罐居中
            const idxs = chosen.map((_, i) => i).filter(i => chosen[i][1] >= 3 && chosen[i][1] <= 5);
            for (let i = idxs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
            }
            goldenSlots = new Set(idxs.slice(0, goldCount));
        }

        // 类型分布: 先保证 plant/question/zombie 各至少 1 个, 其余按难度抽签桶加权抽取
        const types = ['plant', 'question', 'zombie'];
        const drawBag = cfg.bag;
        while (types.length < total) {
            types.push(drawBag[Math.floor(Math.random() * drawBag.length)]);
        }
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }

        // v3.41.0 布局重排：「大部分」僵尸罐钉后排（col≥5），少数（约 1/4）强制混入中前排；
        // 「大部分」问号罐钉前中排（col 升序取最靠前），少数强制混入中后排 —— 布局不再一眼看穿
        {
            const zCount = types.filter(t => t === 'zombie').length;
            const qCount = types.filter(t => t === 'question').length;
            const used = new Set(goldenSlots);
            const zPinned = Math.round(zCount * 0.75);
            const qPinned = Math.round(qCount * 0.75);
            const shuffleArr = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } };
            // 僵尸罐主体 → 后排
            const backIdx = chosen.map((_, i) => i).filter(i => !used.has(i) && chosen[i][1] >= 5);
            shuffleArr(backIdx);
            const zIdxs = backIdx.slice(0, zPinned);
            zIdxs.forEach(i => used.add(i));
            if (zIdxs.length < zPinned) {
                const fill = chosen.map((_, i) => i).filter(i => !used.has(i))
                    .sort((a, b) => chosen[b][1] - chosen[a][1]);
                fill.slice(0, zPinned - zIdxs.length).forEach(i => { zIdxs.push(i); used.add(i); });
            }
            // 僵尸罐少数派 → 中前排（col≤4）随机混入
            const zMid = chosen.map((_, i) => i).filter(i => !used.has(i) && chosen[i][1] <= 4);
            shuffleArr(zMid);
            zMid.slice(0, zCount - zIdxs.length).forEach(i => { zIdxs.push(i); used.add(i); });
            if (zIdxs.length < zCount) {
                const fill = chosen.map((_, i) => i).filter(i => !used.has(i));
                shuffleArr(fill);
                fill.slice(0, zCount - zIdxs.length).forEach(i => { zIdxs.push(i); used.add(i); });
            }
            // 问号罐主体 → 前中排（col 升序取最靠前）
            const restQ = chosen.map((_, i) => i).filter(i => !used.has(i))
                .sort((a, b) => chosen[a][1] - chosen[b][1] || chosen[a][0] - chosen[b][0]);
            const qIdxs = restQ.slice(0, qPinned);
            qIdxs.forEach(i => used.add(i));
            // 问号罐少数派 → 中后排（col≥3）随机混入
            const qRest = chosen.map((_, i) => i).filter(i => !used.has(i) && chosen[i][1] >= 3);
            shuffleArr(qRest);
            qRest.slice(0, qCount - qIdxs.length).forEach(i => { qIdxs.push(i); used.add(i); });
            if (qIdxs.length < qCount) {
                const fill = chosen.map((_, i) => i).filter(i => !used.has(i));
                shuffleArr(fill);
                fill.slice(0, qCount - qIdxs.length).forEach(i => { qIdxs.push(i); used.add(i); });
            }
            const newTypes = new Array(types.length).fill('plant');
            zIdxs.forEach(i => { newTypes[i] = 'zombie'; });
            qIdxs.forEach(i => { newTypes[i] = 'question'; });
            types.length = 0;
            types.push(...newTypes);
        }

        // v3.41.0 植物罐保底校准（重排后统计，金罐位不计入）：
        //   地狱 1~5 / 困难 3~7 / 简单 8~14；削减时地狱把名额还给问号罐（问号尽量多），
        //   其余难度还给僵尸罐；补足时保证僵尸罐至少 1 个
        {
            const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
            let pCount = types.filter((t, i) => t === 'plant' && !goldenSlots.has(i)).length;
            const target = clamp(pCount, cfg.plantMin, cfg.plantMax);
            const fillType = cfg.key === 'hell' ? 'question' : 'zombie';
            let guard = 0;
            while (pCount > target && guard++ < 200) {
                const idx = types.findIndex((t, i) => t === 'plant' && !goldenSlots.has(i));
                if (idx < 0) break; // 至少保 1 个植物罐
                types[idx] = fillType;
                pCount--;
            }
            guard = 0;
            while (pCount < target && guard++ < 200) {
                const zLeft = types.filter(t => t === 'zombie').length;
                const cand = types.map((t, i) =>
                    (t !== 'plant' && !goldenSlots.has(i) && !(t === 'zombie' && zLeft <= 1)) ? i : -1).filter(i => i >= 0);
                if (!cand.length) break; // 僵尸罐至少保 1 个
                types[cand[Math.floor(Math.random() * cand.length)]] = 'plant';
                pCount++;
            }
        }

        this.vases = [];
        this._vaseEliteCount = 0; // v3.30.0 冰车/舞王/橄榄球每局 ≤3 只（金罐也计入）
        this.vasesTotal = total;
        this.vasesSmashed = 0;
        this.score = 0;
        this.updateScore();

        chosen.forEach((pos, i) => {
            const vType = types[i];
            const isGolden = goldenSlots.has(i); // v3.15.0 金罐
            // 预掷罐内内容（概率全部取自当前难度配置）:
            //   植物罐: pCard 概率出植物卡 / 其余出阳光罐(50 阳光, 供买路灯花)
            //   问号罐: qZombie 概率出僵尸 / 其余出植物卡
            //   僵尸罐: 必出僵尸
            //   任何罐子都不再出 plantern —— 路灯花只能从商店购买
            let content = (vType === 'zombie') // v3.15.0 let：金罐内容需覆盖赋值
                ? { kind: 'zombie', type: this._rollVaseZombieType(pos[1]) }
                : (vType === 'plant')
                    ? (Math.random() < cfg.pCard)
                        ? { kind: 'plant', type: this._rollVasePlantContent(vType) }
                        : { kind: 'sun', value: 50 }
                    : this._rollQuestionVaseContent(cfg, pos[1]); // v3.43.0 抽签独立成函数（含阳光）
            // 金罐覆盖内容（v3.15.0）：与普通抽签完全无关
            if (isGolden) content = this._rollGoldenVaseContent();

            const v = { row: pos[0], col: pos[1], type: vType, golden: isGolden, content, smashed: false, revealed: false, element: null, contentEl: null };
            const sprite = isGolden ? 'Vase_Gold.png'
                          : vType === 'plant' ? 'Vase_Plant.png'
                          : vType === 'zombie' ? 'Vase_Zombie.png'
                          : 'Vase_Question.png';
            const img = document.createElement('img');
            img.src = 'assets/images/Vase/' + sprite + '?v=1790944905'; // v= 占位,bump_version 替换为新 cache-buster
            img.className = 'entity vase-entity';
            img.style.pointerEvents = 'none';
            if (isGolden) img.style.filter = 'drop-shadow(0 0 7px rgba(255, 210, 60, 0.95))'; // 金罐常驻金光
            const cx = this.board.offsetX + v.col * this.board.cellWidth + this.board.cellWidth / 2;
            const cy = this.board.offsetY + v.row * this.board.cellHeight + this.board.cellHeight / 2 + 12;
            img.style.left = cx + 'px';
            img.style.top = cy + 'px';
            img.style.zIndex = Math.floor(cy) - 1;
            this.entityLayer.appendChild(img);
            v.element = img;
            this.vases.push(v);
        });

        // v3.5.1 问号罐保底(先执行): 本局问号罐 ≥2 个时强制至少 1 个出植物 ——
        // 玩家绝不会遇到「场上所有问号罐全是僵尸」的绝望局面
        {
            const qVases = this.vases.filter(v => v.type === 'question' && !v.golden); // v3.15.0 金罐内容不受保底改写
            if (qVases.length >= 2 && qVases.every(v => v.content && v.content.kind === 'zombie')) {
                qVases[0].content = { kind: 'plant', type: this._rollVasePlantContent('question') };
            }
        }

        // v3.5.1 每局保底(最后执行, 覆盖问号罐保底新塞入的植物): 无论随机如何,
        // 本局所有植物内容中「一次性炸弹」占比强制 ≤ 40% (永久植物 ≥ 60%)。
        // 分层抽取只能保证长期期望, 保底杜绝单局极端 ——
        // 玩家不会遇到"整局砸出来的全是樱桃炸弹/窝瓜, 没火力防不住"的情况。
        {
            const plantContents = this.vases.filter(v => v.content && v.content.kind === 'plant' && !v.golden); // v3.15.0 金罐不参与一次性置换
            if (plantContents.length > 0) {
                const needPerm = Math.ceil(plantContents.length * 0.6);
                let perm = 0;
                for (const v of plantContents) if (!this._isVaseOncePlant(v.content.type)) perm++;
                for (const v of plantContents) {
                    if (perm >= needPerm) break;
                    if (this._isVaseOncePlant(v.content.type)) {
                        v.content.type = this._pickVasePermPlant(); // 换成随机永久植物
                        perm++;
                    }
                }
            }
        }

        // v3.65.0 地狱保底：金罐里本局至少开出 1 株融合植物（金罐 1~2 个，50% 植物率可能整局零融合；
        // 保底后融合株出现 1~2 株——第 2 个金罐仍按原 50/50 自然掷骰）
        if (cfg.key === 'hell') {
            const goldens = this.vases.filter(v => v.golden);
            const hasFusion = goldens.some(v => v.content && v.content.kind === 'plant' &&
                typeof v.content.type === 'string' && v.content.type.startsWith('fusion_'));
            if (!hasFusion && goldens.length > 0) {
                const target = goldens[Math.floor(Math.random() * goldens.length)];
                target.content = { kind: 'plant', type: this._pickGoldenPlant() };
            }
        }

        // ===== v3.77.0 可解性保底：每局进攻植物数量达标（不用铲子/手套也能完整走完一局）=====
        // 用户实测出现"整局只有一株豌豆"的必败局。根因：地狱植物罐保底 1~5 且 25% 开阳光、
        // 问号罐 60% 出僵尸 —— 极端随机可以几乎不产出可作战植物。逐级补足：
        //   ① 植物罐开出的阳光 → 进攻植物卡（阳光换火力）
        //   ② 非进攻植物卡（坚果/向日葵/大蒜等）→ 进攻植物
        //   ③ 问号罐的阳光内容 → 进攻植物卡
        //   ④ 问号罐的僵尸内容 → 进攻植物卡（最后手段）
        //   ⑤ 僵尸罐 → 植物罐（极端兜底，僵尸罐至少保 1 个）
        // 金罐融合株不计入下限（属额外惊喜）；一次性炸弹也不计入（爆炸后无持续火力）。
        {
            const ATK_MIN = { easy: 6, hard: 4, hell: 3 }[cfg.key] ?? 4;
            const atkSet = this._vaseAttackerSet();
            const isAtkCard = v => v.content && v.content.kind === 'plant' && atkSet.has(v.content.type);
            const countAtk = () => this.vases.filter(v => !v.golden && isAtkCard(v)).length;
            let guard = 0;
            while (countAtk() < ATK_MIN && guard++ < 300) {
                let v = this.vases.find(x => !x.golden && x.type === 'plant' && x.content && x.content.kind === 'sun')
                     || this.vases.find(x => !x.golden && x.content && x.content.kind === 'plant' && !atkSet.has(x.content.type))
                     || this.vases.find(x => !x.golden && x.type === 'question' && x.content && x.content.kind === 'sun')
                     || this.vases.find(x => !x.golden && x.type === 'question' && x.content && x.content.kind === 'zombie');
                if (!v) {
                    const zLeft = this.vases.filter(x => !x.golden && x.type === 'zombie').length;
                    if (zLeft <= 1) break; // 僵尸罐至少保 1 个 —— 场上没对手也不行
                    v = this.vases.find(x => !x.golden && x.type === 'zombie');
                    v.type = 'plant';
                    if (v.element) v.element.src = 'assets/images/Vase/Vase_Plant.png';
                }
                v.content = { kind: 'plant', type: this._pickVaseAttacker() };
            }
        }

        // ===== v3.80.2 难度再降：每行保底 1 株进攻植物（用户：保证每一行都会有攻击类植物）=====
        // v3.77.0 只保证全局总数（6/4/3），随机仍可能某一行一个进攻植物都没有。
        // 这里按行补足：本行找不到进攻植物罐时，按同优先级（阳光罐→非进攻植物罐→问号阳光→问号僵尸→僵尸罐）改造一罐。
        {
            const atkSet = this._vaseAttackerSet();
            let guard = 0;
            for (let r = 0; r < this.board.rows && guard < 300; r++) {
                const hasAtk = this.vases.some(v => !v.golden && v.row === r &&
                    v.content && v.content.kind === 'plant' && atkSet.has(v.content.type));
                if (hasAtk) continue;
                let v = this.vases.find(x => !x.golden && x.row === r && x.type === 'plant' && x.content && x.content.kind === 'sun')
                     || this.vases.find(x => !x.golden && x.row === r && x.content && x.content.kind === 'plant' && !atkSet.has(x.content.type))
                     || this.vases.find(x => !x.golden && x.row === r && x.type === 'question' && x.content && x.content.kind === 'sun')
                     || this.vases.find(x => !x.golden && x.row === r && x.type === 'question' && x.content && x.content.kind === 'zombie');
                if (!v) {
                    const zLeft = this.vases.filter(x => !x.golden && x.type === 'zombie').length;
                    if (zLeft <= 1) continue; // 僵尸罐至少保 1 个 —— 场上没对手也不行
                    v = this.vases.find(x => !x.golden && x.row === r && x.type === 'zombie');
                    if (!v) continue;
                    v.type = 'plant';
                    if (v.element) v.element.src = 'assets/images/Vase/Vase_Plant.png';
                }
                v.content = { kind: 'plant', type: this._pickVaseAttacker() };
                guard++;
            }
        }

        // v3.12.0：南瓜套罐 —— 部分植物/问号罐被南瓜壳裹住（难度越高越常见，每局最多 3 个）。
        // 僵尸走到罐格必须先啃穿壳（相当于一个不占种植格的坚果），玩家仍可照常点砸。
        // v3.13.1：罐子和植物一样"被放进"南瓜套里 —— 壳用与植物套壳同款 97×67，
        // 底部锚在罐子底缘，罐子上半截从壳顶洞口探出（罐画布 90×100，内容底缘=中心+45px）。
        // 被套的罐子外观一致 —— 套壳不代表里面一定是僵尸（问号罐照样可能套出僵尸）。
        {
            // v3.16.0：南瓜套改固定名额 —— 困难 1~2 个、地狱 1~3 个、简单 0。
            // 旧版按 20%/罐 概率在 26 罐的地狱里期望 5 个，玩家反馈太多。
            const wrapRange = { easy: [0, 0], hard: [1, 2], hell: [1, 3] }[cfg.key] ?? [0, 0];
            const wrapTarget = wrapRange[0] + Math.floor(Math.random() * (wrapRange[1] - wrapRange[0] + 1));
            const wrapCands = this.vases.filter(v => !v.golden);
            for (let i = wrapCands.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [wrapCands[i], wrapCands[j]] = [wrapCands[j], wrapCands[i]];
            }
            let wrapped = 0;
            for (const v of wrapCands) {
                // v3.13.3：僵尸罐同样可能被套 —— 套壳外观与罐内容无关，
                // 砸开套壳罐弹出的僵尸会被留场的壳墙挡在壳里（壳的"实际作用"）
                // v3.15.0：金罐不套壳 —— 金光外观是玩家的关键信息，不能被南瓜套盖住
                if (wrapped >= wrapTarget) break;
                    v.pumpkinHp = 4000;
                    v.pumpkinMaxHp = 4000;
                    const ov = document.createElement('img');
                    ov.src = 'assets/images/Plants/PumpkinHead/shield_full.png?v=1790944905'; // v= 占位,bump_version 替换
                    ov.className = 'entity vase-pumpkin';
                    ov.style.pointerEvents = 'none';
                    ov.style.width = '97px';
                    ov.style.height = '67px';
                    ov.style.objectFit = 'contain';
                    const cx = this.board.offsetX + v.col * this.board.cellWidth + this.board.cellWidth / 2;
                    const cy = this.board.offsetY + v.row * this.board.cellHeight + this.board.cellHeight / 2 + 12;
                    // 罐内容底缘 = cy+45；壳底=罐底-2，壳中心 = 底缘-67/2
                    ov.style.left = cx + 'px';
                    ov.style.top = (cy + 9.5) + 'px';
                    ov.style.transform = 'translate(-50%, -50%)';
                    ov.style.zIndex = String(Math.floor(cy + 9.5) + 1); // 压在罐子(z=floor(cy)-1)之上
                    this.entityLayer.appendChild(ov);
                    v.pumpkinEl = ov;
                    // v3.13.2：背壁层画在罐子身后，壳顶洞口里看到的是南瓜内壁而非草地
                    const back = document.createElement('img');
                    back.src = 'assets/images/Plants/PumpkinHead/Pumpkin_back.gif?v=1790944905'; // v= 占位,bump_version 替换
                    back.className = 'entity vase-pumpkin-back';
                    back.style.pointerEvents = 'none';
                    back.style.width = '97px';
                    back.style.height = '67px';
                    back.style.objectFit = 'contain';
                    back.style.left = cx + 'px';
                    back.style.top = (cy + 9.5) + 'px';
                    back.style.transform = 'translate(-50%, -50%)';
                    back.style.zIndex = String(Math.floor(cy) - 2); // 罐子身后
                    this.entityLayer.appendChild(back);
                    v.pumpkinBackEl = back;
                    wrapped++;
            }
        }

        // v3.80.0：开场提示精简（用户：字数太多不好看）——只报难度与罐数
        // v3.80.1：用户微调——不说"只有"，直接报数
        this.showAnnouncement(`${cfg.label}砸罐子，场上有 ${total} 个罐子`, '#ffdd66');
    }

    // ===== 砸罐子植物卡池 v3.5.1: 严格分层控制「永久 / 一次性」比例 =====
    // 玩家反馈: 以前植物池把一次性炸弹和永久植物混在一个池子平权抽取,
    //   连续抽到樱桃炸弹/土豆雷/窝瓜就"整局全是炸弹、没有火力、根本防不住"。
    // 现在改为「先按难度掷类目, 再在类目内加权抽取」:
    //   永久池(可持续作战): 豌豆射手家族/坚果/向日葵/大嘴花/地刺等 —— 占大头
    //   一次性池(炸弹类):   樱桃炸弹/土豆地雷/窝瓜/火爆辣椒/寒冰菇 —— 只做稀有惊喜/解围
    // 植物罐(绿)与问号罐砸出的植物都受控; 任何罐子都不出 plantern(只能商店买)。
    _vasePermPool() {
        // v3.74.0 概率平均化（用户：抽到所有植物的概率应该平均，忧郁菇出场率太高）：
        // 每种永久植物一格 = 等概率；高级池（机枪/西瓜/冰西瓜/猫尾草/忧郁菇/双子/钢地刺）
        // 也并入本池一起平均 —— 忧郁菇从"高级池 1/7"降到与玉米投手同档。
        // 毁灭菇不进池（仍是 1% 稀有兜底，v3.41.0 用户指定），路灯花只能购买。
        // v3.80.3（用户：四头向日葵等融合植物从没在砸罐子出现过）：
        // 全部融合植物并入普通罐池 —— 复用金罐的并集（硬编码 ∪ 盲盒 fusionOut ∪ PVZ_FUSION_EXTRA），
        // 新增融合自动入池，与基础植物同权重等概率。
        const base = [
            'peashooter', 'snowpea', 'repeater', 'wallnut', 'sunflower',
            'tallnut', 'spikeweed', 'chomper', 'threepeater', 'splitpea',
            'cabbagepult', 'kernelpult', 'garlic', 'fumeshroom', 'starfruit',
            'pumpkinhead', 'puffshroom', 'scaredyshroom', 'sunshroom', 'hypnoshroom',
            'gatlingpea', 'melonpult', 'wintermelon', 'cattail', 'gloomshroom',
            'twinsunflower', 'spikerock'
        ];
        return [...new Set(base.concat(this._allFusionPlantTypes()))];
    }
    _vaseOncePool() {
        // 一次性炸弹: 全是解围手段, 权重刻意压低 —— 不承担"防线"职责
        return [
            'cherrybomb','cherrybomb',   // 樱桃炸弹: 相对常见的一键清场
            'potatomine','potatomine',   // 土豆地雷: 免费陷阱, 前中期友好
            'squash','squash',           // 窝瓜: 单点秒杀
            'jalapeno',                  // 火爆辣椒: 全行清除(稀有)
            'iceshroom'                  // 寒冰菇: 全屏冻结(稀有)
        ];
    }
    _pickVasePermPlant() {
        const p = this._vasePermPool();
        return p[Math.floor(Math.random() * p.length)];
    }
    // ===== v3.77.0 可解性保底专用：进攻植物池（持续火力，不含坚果/经济/一次性）=====
    // 用于 setupVases 的进攻数量下限 —— 保证"不用铲子/手套也能完整走完一局"
    _vaseAttackerPool() {
        return ['peashooter', 'snowpea', 'repeater', 'threepeater', 'splitpea', 'gatlingpea',
            'cabbagepult', 'kernelpult', 'melonpult', 'wintermelon', 'cattail',
            'fumeshroom', 'gloomshroom', 'puffshroom', 'scaredyshroom', 'starfruit',
            'spikeweed', 'spikerock', 'chomper'];
    }
    _vaseAttackerSet() {
        if (!this._vaseAtkSetCache) this._vaseAtkSetCache = new Set(this._vaseAttackerPool());
        return this._vaseAtkSetCache;
    }
    _pickVaseAttacker() {
        const p = this._vaseAttackerPool();
        return p[Math.floor(Math.random() * p.length)];
    }
    _isVaseOncePlant(type) {
        return type === 'cherrybomb' || type === 'potatomine' || type === 'squash'
            || type === 'jalapeno' || type === 'iceshroom';
    }
    // v3.16.0：高级植物专池（低频惊喜）：机枪/西瓜/冰西瓜/猫尾草/忧郁菇/双子/钢地刺
    // v3.41.0：毁灭菇移出本池 —— 它能直接清整个图，改为 _rollVasePlantContent 里约 1% 稀有兜底
    _vaseHighPool() {
        return ['gatlingpea', 'melonpult', 'wintermelon', 'cattail', 'gloomshroom', 'twinsunflower', 'spikerock'];
    }
    _rollVasePlantContent(vaseType) {
        // v3.74.0 概率平均化（用户：抽到所有植物的概率应该平均）：
        // 旧"25% 高级专池"并入 _vasePermPool 统一等概率抽 —— 每种永久植物概率完全相同；
        // 仅保留毁灭菇约 1% 稀有兜底（v3.41.0 用户指定它不能随便出）。
        if (Math.random() < 0.013) return 'doomshroom';
        const cfg = this._vaseDiffCfg();
        // 植物罐(绿)是玩家主要植物来源, 偏永久; 问号罐赌性略高但永久仍占多数
        const permRatio = vaseType === 'plant'
            ? (cfg.plantPerm ?? 0.85)
            : (cfg.qPerm ?? 0.65);
        const pool = Math.random() < permRatio ? this._vasePermPool() : this._vaseOncePool();
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // 砸罐子僵尸池（v3.16.0 重构）：75% 低级 / 25% 高级
    // col 传罐子所在列 —— 前两排(col≤2，快进家的格子)绝不给撑杆跳与高级僵尸
    _rollVaseZombieType(col, noElite) {
        // v3.69.0 问号罐限定池（用户指定 6 种）：普通/路障/铁桶/读报(用户称"毒爆")/撑杆/小鬼——
        // 旗帜、锤子、铁门、精英与植物头一律不进问号罐；前两排照旧禁撑杆
        if (noElite) {
            let q = ['normal','normal','normal','normal',
                     'conehead','conehead',
                     'buckethead',
                     'newspaper',
                     'polevaulting',
                     'imp'];
            if (col !== undefined && col <= 2) q = q.filter(t => t !== 'polevaulting');
            return q[Math.floor(Math.random() * q.length)];
        }
        // 紫罐（僵尸罐）低级池：v3.69.0 补齐用户名单——新增小鬼/伴舞（舞王召唤的随从也能单独出罐）
        const low = [
            'normal','normal','normal','normal',
            'conehead','conehead',
            'buckethead',
            'flag',
            'polevaulting',
            'newspaper',
            'imp',
            'backup',
            'hammerzombie'   // v3.25.0 锤子僵尸：血量=路障，走过罐格就挥锤砸碎
        ];
        const d = this.vaseDifficulty || 'hell';
        // v3.54.0 用户新规：①舞王/橄榄球只出僵尸罐与金罐（问号罐沿用 v3.23.0 禁令）；
        // ②冰车只出金罐——从普通抽签池移除；③融合植物僵尸本就只出金罐（_pickGoldenZombie）不变。
        // 铁门从精英池剥离为独立低频 0.10：旧版精英封顶 3 只后精英池只剩铁门，
        // 35% 高级抽签全落铁门头上（>普通僵尸 24%），用户反馈"铁板快跟普通僵尸一样高"
        let high = [];
        if (d === 'hard') high = ['football'];
        else if (d === 'hell') high = ['football', 'dancing'];
        // v3.30.0：冰车/舞王/橄榄球每局合计最多 3 只（金罐也计入）；达上限后普通抽签不再出精英
        this._vaseEliteCount = this._vaseEliteCount || 0;
        if (this._vaseEliteCount >= 3) high = [];
        // 前两排：去掉撑杆跳、禁用高级僵尸与铁门
        if (col !== undefined && col <= 2) {
            const p = low.filter(t => t !== 'polevaulting');
            return p[Math.floor(Math.random() * p.length)];
        }
        // 精英（橄榄球/舞王）0.35 不变
        if (high.length > 0 && Math.random() < 0.35) {
            const t = high[Math.floor(Math.random() * high.length)];
            this._vaseEliteCount++;
            return t;
        }
        // 铁门：独立 0.10 低频（仅僵尸罐，问号罐走上方限定池）
        if (Math.random() < 0.10) return 'screendoor';
        // v3.74.0 融合僵尸：困难/地狱的紫罐低频 8% 四选一（用户：新增融合僵尸，难度不要太高，
        // 禁用巨人/冰车/橄榄球/舞王/Boss —— 这四只全部由现有僵尸两两融合而来，血量温和）
        if ((d === 'hard' || d === 'hell') && Math.random() < 0.08) {
            const fz = ['ironcone', 'madpaper', 'torchzombie', 'garliczombie'];
            return fz[Math.floor(Math.random() * fz.length)];
        }
        return low[Math.floor(Math.random() * low.length)];
    }

    // ===== v3.15.0 金色罐子（地狱限定）内容抽签 =====
    // 金罐绝不出现普通僵尸与基础植物：50% 融合进化高阶植物 / 50% 强力僵尸。
    // v3.74.0：植物分支内 10% 玉米加农炮 / 10% 植物盲盒（用户：金罐也要能开出这些）。
    _rollGoldenVaseContent() {
        if (Math.random() < 0.5) return { kind: 'zombie', type: this._pickGoldenZombie() };
        const r = Math.random();
        if (r < 0.10) return { kind: 'plant', type: 'cobcannon' };
        if (r < 0.20) return { kind: 'plant', type: 'plantbox' };
        return { kind: 'plant', type: this._pickGoldenPlant() };
    }
    _pickGoldenPlant() {
        // v3.16.0：金罐"融合植物"= 只出经典冒险选卡栏里没有的融合株（fusion_*）。
        // 旧池（机枪/冰西瓜/猫尾草等）经典模式本就可选，不符合"不存在于经典冒险模式"的定义。
        // v3.65.0：池子改为"全部融合植物"——旧硬编码池 ∪ 盲盒池 fusion_* ∪ 数据驱动 PVZ_FUSION_EXTRA，
        // 新增融合自动入金罐，不再每版手补名单。
        // v3.80.3：并集抽到 _allFusionPlantTypes()，金罐与普通罐共用（普通罐 v3.80.3 起也能出全部融合）
        const pool = this._allFusionPlantTypes();
        const unique = [...new Set(pool)];
        return unique[Math.floor(Math.random() * unique.length)];
    }
    // v3.80.3：全部融合植物并集（金罐原池抽离共用）——
    // 硬编码老融合 ∪ 盲盒池 fusionOut 里的 fusion_* ∪ 数据驱动 PVZ_FUSION_EXTRA
    _allFusionPlantTypes() {
        const pool = [
            'fusion_wintermelon_cattail', 'fusion_melon_cattail', 'fusion_veggiepult', 'fusion_popcorn',
            'fusion_icecabbage', 'fusion_cabbagenut', 'fusion_doomshroom_sunflower', 'fusion_spikerock_tallnut',
            'fusion_chomper_wallnut', 'fusion_frostbomb', 'fusion_nutshooter', 'fusion_peaflower',
            'fusion_snownut', 'fusion_spikynut', 'fusion_sporemine', 'fusion_cherrybomb_peashooter',
            'fusion_starfruit', 'fusion_hypnoshroom',
            'fusion_cabbage_tallnut', 'fusion_wintermelon_cabbagepult', 'fusion_gatlingpea_repeater',
            'fusion_gatlingpea_cattail', 'fusion_melon_cabbagepult',
            // v3.80.3：补入 v3.45/v3.50 十一条新融合（此前只进金罐 EXTRA/盲盒路径，漏了这批硬编码）
            'fusion_starfruit10', 'fusion_firemine', 'fusion_boomsquash', 'fusion_icekernel',
            'fusion_firespikeweed', 'fusion_firerepeater', 'fusion_quadsun', 'fusion_firetallnut'
        ];
        const fusionOut = ['repeater', 'threepeater', 'gatlingpea', 'twinsunflower', 'fumeshroom',
            'snowpea', 'splitpea', 'wintermelon', 'cattail', 'sunshroom', 'gloomshroom',
            'spikerock', 'scaredyshroom', 'torchwood', 'starfruit', 'hypnoshroom', 'pumpkinhead',
            'fusion_peaflower', 'fusion_nutshooter', 'fusion_frostbomb', 'fusion_cherrybomb_peashooter',
            'fusion_doomshroom_sunflower', 'fusion_sporemine', 'fusion_spikynut', 'fusion_snownut',
            'fusion_spikerock_tallnut', 'fusion_melon_cattail', 'fusion_wintermelon_cattail',
            'fusion_icecabbage', 'fusion_popcorn', 'fusion_cabbagenut', 'fusion_veggiepult',
            'fusion_starfruit', 'fusion_hypnoshroom', 'fusion_pumpkinhead', 'fusion_chomper_wallnut',
            'fusion_snowpea_starfruit'];
        fusionOut.forEach(t => { if (t.startsWith('fusion_')) pool.push(t); });
        (window.PVZ_FUSION_EXTRA || []).forEach(f => { if (f.type && f.type.startsWith('fusion_')) pool.push(f.type); });
        return pool;
    }
    // v3.16.0：融合株没有独立卡面 —— 返回两个基础部件
    // v3.27.0：改为 [主体, 副体] —— parts[0] 是"主要的那株"铺底、parts[1] 叠放在上层。
    // 判定标准与 Plant.js 场上渲染一致：谁的身体当"底座"谁是主体
    //（如地刺坚果 = 坚果身铺底 + 地刺叠上面；高坚果钢地刺 = 高坚果铺底 + 钢地刺叠上面）。
    _fusionCardParts(type) {
        const map = {
            fusion_peaflower: ['sunflower', 'peashooter'],
            fusion_nutshooter: ['wallnut', 'peashooter'],
            fusion_frostbomb: ['cherrybomb', 'snowpea'],
            fusion_sporemine: ['potatomine', 'puffshroom'],
            fusion_spikynut: ['wallnut', 'spikeweed'],
            fusion_snownut: ['wallnut', 'snowpea'],
            fusion_melon_cattail: ['cattail', 'melonpult'],
            fusion_wintermelon_cattail: ['cattail', 'wintermelon'],
            fusion_chomper_wallnut: ['wallnut', 'chomper'],
            fusion_icecabbage: ['cabbagepult', 'iceshroom'],
            fusion_popcorn: ['kernelpult', 'jalapeno'],
            fusion_cabbagenut: ['wallnut', 'cabbagepult'],
            fusion_veggiepult: ['kernelpult', 'cabbagepult'],
            fusion_starfruit: ['splitpea', 'sunflower'],
            fusion_hypnoshroom: ['puffshroom', 'garlic'],
            fusion_pumpkinhead: ['wallnut', 'tallnut'],
            fusion_spikerock_tallnut: ['tallnut', 'spikerock']
        };
        if (map[type]) return map[type];
        const parts = type.split('_');
        return parts.length >= 3 ? [parts[1], parts[2]] : null;
    }
    // v3.16.0：融合株卡面 = 主部件卡面铺底 + 副部件卡面右下角叠放
    //（卡图 100×120 上下双段：上层彩色 60px —— 用 100% 200% + top 只露彩色段）
    _fusionCardOverlay(type, stamp, widthPct) {
        const parts = this._fusionCardParts(type);
        if (!parts) return null;
        const a2 = this.plantCardArt(parts[1]);
        if (!a2) return null;
        const ov = document.createElement('div');
        ov.style.cssText = 'position:absolute; right:1px; bottom:1px; width:' + (widthPct || '62%') +
            '; aspect-ratio:5/3; pointer-events:none;' +
            "background-image:url('assets/images/Card/Plants/" + a2 + ".png?v=" + stamp + "');" +
            'background-size:100% 200%; background-position:top; background-repeat:no-repeat;';
        return ov;
    }
    _pickGoldenZombie() {
        // 融合僵尸（豌豆/坚果/向日葵/寒冰射手头，出金罐强化 1000 血）+ 高血僵尸（冰车×2 加权/橄榄球/巨人）
        // v3.23.0：加入火爆辣椒/机枪/高坚果头与盲盒僵尸
        // v3.74.0：加入四只融合僵尸（双盔/疯狂读报撑杆/火把/大蒜），去掉冰车重复权重
        const pool = ['peahead', 'nuthead', 'sunhead', 'snowpeahead', 'jalapenohead', 'machinegunhead', 'tallnuthead', 'mysterybox', 'zomboni', 'football', 'gargantuar', 'hammerzombie',
            'ironcone', 'madpaper', 'torchzombie', 'garliczombie'];
        let t = pool[Math.floor(Math.random() * pool.length)];
        // v3.30.0：金罐的冰车/橄榄球同样计入每局 ≤3 封顶；超限改出巨人（金罐不落空）
        if (t === 'zomboni' || t === 'football' || t === 'dancing') {
            this._vaseEliteCount = (this._vaseEliteCount || 0) + 1;
            if (this._vaseEliteCount > 3) t = 'gargantuar';
        }
        return t;
    }
    // 罐子类型 → 中文前缀（v3.15.0 增加金罐）
    _vaseTypeLabel(t) {
        return t === 'plant' ? '植物罐' : (t === 'zombie' ? '僵尸罐' : (t === 'golden' ? '金罐' : '问号罐'));
    }

    // ===== v3.12.0 南瓜套罐：外壳的移除与啃伤 =====
    // v3.25.0 罐子碎裂特效：从罐身贴图上随机裁 8 片"碎片"，向四周抛飞 + 旋转 + 淡出
    // v3.26.0：礼盒裂开残骸（植物盲盒开箱用）——8 片礼盒碎片飞溅旋转淡出
    _giftShatterFX(cx, cy) {
        const layer = this.entityLayer;
        const url = `assets/images/Plants/PlantBox/GiftBox.png?v=${this.assetStamp()}`;
        for (let i = 0; i < 8; i++) {
            const sh = document.createElement('div');
            const size = 8 + Math.floor(Math.random() * 12);
            const sx = Math.floor(Math.random() * (129 - size));
            const sy = Math.floor(Math.random() * (179 - size));
            sh.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;pointer-events:none;' +
                'left:' + cx + 'px;top:' + cy + 'px;background-image:url(\'' + url + '\');' +
                'background-position:-' + sx + 'px -' + sy + 'px;z-index:' + (Math.floor(cy) + 3) + ';';
            layer.appendChild(sh);
            const ang = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 55;
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist * 0.7;
            const rot = Math.random() * 260 - 130;
            setTimeout(() => {
                sh.style.transition = 'transform 0.45s ease-out, opacity 0.45s ease-in';
                sh.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg)';
                sh.style.opacity = '0';
            }, 20);
            setTimeout(() => { if (sh.parentNode) sh.parentNode.removeChild(sh); }, 500);
        }
    }

    _vaseShatterFX(v) {
        const layer = this.entityLayer;
        const cx = this.board.offsetX + v.col * this.board.cellWidth + this.board.cellWidth / 2;
        const cy = this.board.offsetY + v.row * this.board.cellHeight + this.board.cellHeight / 2 + 12;
        const sprite = v.golden ? 'Vase_Gold.png'
                      : v.type === 'plant' ? 'Vase_Plant.png'
                      : v.type === 'zombie' ? 'Vase_Zombie.png'
                      : 'Vase_Question.png';
        const url = `assets/images/Vase/${sprite}?v=${this.assetStamp()}`;
        for (let i = 0; i < 8; i++) {
            const sh = document.createElement('div');
            const size = 8 + Math.floor(Math.random() * 10);
            const sx = Math.floor(Math.random() * (90 - size));
            const sy = Math.floor(Math.random() * (100 - size));
            sh.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;pointer-events:none;' +
                'left:' + cx + 'px;top:' + cy + 'px;background-image:url(\'' + url + '\');' +
                'background-position:-' + sx + 'px -' + sy + 'px;z-index:' + (Math.floor(cy) + 3) + ';';
            layer.appendChild(sh);
            const ang = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 55;
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist * 0.7;
            const rot = Math.random() * 260 - 130;
            requestAnimationFrame(() => requestAnimationFrame(() => {
                sh.style.transition = 'transform 0.55s cubic-bezier(.2,.5,.6,1), opacity 0.55s ease-in';
                sh.style.transform = 'translate(' + dx + 'px,' + (dy + 55) + 'px) rotate(' + rot + 'deg)';
                sh.style.opacity = '0';
            }));
            setTimeout(() => { if (sh.parentNode) sh.parentNode.removeChild(sh); }, 640);
        }
    }

    // ===== v3.63.0 玩家砸罐挥锤动画（纯视觉）：直杆木锤在罐子上方抡起 → 劈到锤头落在罐心，
    // 带一点回弹；播完淡出移除。锤子僵尸砸罐有自带挂件挥锤（Zombie._hammerSwing），不走这里。
    _vaseHammerSwingFX(row, col) {
        if (!this.entityLayer || !this.board) return;
        const cx = this.board.offsetX + col * this.board.cellWidth + this.board.cellWidth / 2;
        const cy = this.board.offsetY + row * this.board.cellHeight + this.board.cellHeight / 2 + 12;
        const img = document.createElement('img');
        img.src = 'assets/images/Zombies/HammerZombie/HammerStraight.png?v=' + this.assetStamp();
        img.className = 'vase-hammer-swing';
        img.style.zIndex = 9999;
        // 柄底（transform-origin 50% 95%）锚在罐心右上：劈下后锤头正好落在罐子上
        const GRIP_DX = 24, GRIP_DY = -58;      // 握点相对罐心的偏移
        const GRIP_PIVOT_X = 22, GRIP_PIVOT_Y = 72; // 握点在 44×76 元素内的位置(≈50%/95%)
        img.style.left = (cx + GRIP_DX - GRIP_PIVOT_X) + 'px';
        img.style.top = (cy + GRIP_DY - GRIP_PIVOT_Y) + 'px';
        this.entityLayer.appendChild(img);
        setTimeout(() => {
            img.style.transition = 'opacity 0.15s ease-out';
            img.style.opacity = '0';
            setTimeout(() => { if (img.parentNode) img.parentNode.removeChild(img); }, 160);
        }, 330);
    }

    _removeVasePumpkin(v) {
        v.pumpkinHp = 0;
        if (v.pumpkinEl && v.pumpkinEl.parentNode) v.pumpkinEl.parentNode.removeChild(v.pumpkinEl);
        v.pumpkinEl = null;
        if (v.pumpkinBackEl && v.pumpkinBackEl.parentNode) v.pumpkinBackEl.parentNode.removeChild(v.pumpkinBackEl);
        v.pumpkinBackEl = null;
    }
    // 僵尸啃一口套罐的壳；返回剩余耐久（0 = 已啃穿，壳被移除）
    // v3.13.2：南瓜套从生到死只有完好态一个外观，不做任何裂纹/糊态变化
    //（用户明确要求），耐久只走数值。
    _damageVasePumpkin(v, dmg) {
        if (!v.pumpkinEl) { v.pumpkinHp = 0; return 0; }
        v.pumpkinHp = Math.max(0, v.pumpkinHp - dmg);
        if (v.pumpkinEl.src.indexOf('shield_full.png') === -1) {
            v.pumpkinEl.src = 'assets/images/Plants/PumpkinHead/shield_full.png';
        }
        if (v.pumpkinHp <= 0) this._removeVasePumpkin(v);
        return v.pumpkinHp;
    }

    smashVase(row, col) {
        if (this.state !== 'PLAYING') return;
        const v = this.vases.find(x => !x.smashed && x.row === row && x.col === col);
        if (!v) return;
        v.smashed = true;
        this.vasesSmashed++;
        // v3.13.2：套罐被砸后南瓜套不消失 —— 转为独立壳墙留在格内（耐久=剩余值），
        // 该格照常可种植新植物（进壳）、壳内植物被铲后也可再种，与经典模式一致。
        const shellHp = v.pumpkinHp;
        this._removeVasePumpkin(v);
        // 罐子破碎音效（原版 PvZ 陶瓷破碎声，与破碎动画同步响起）
        this.audioManager.play('vasebreak');
        // v3.25.0 罐子碎裂特效：罐身碎片四散飞溅（问号/植物/僵尸罐各自用自己的贴图）
        this._vaseShatterFX(v);
        // 罐子破碎动画：放大 + 淡出
        if (v.element && v.element.parentNode) {
            const el = v.element;
            el.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
            el.style.transform = 'translate(-50%, -50%) scale(1.5)';
            el.style.opacity = '0';
            setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
        }
        // 罐内揭示内容(若已被路灯花照亮: 半透明罐里可见的缩略图) 随罐一起消失
        if (v.contentEl && v.contentEl.parentNode) v.contentEl.parentNode.removeChild(v.contentEl);
        v.contentEl = null;
        // 按预掷内容揭示: 植物 → 发免费卡; 僵尸 → 出现该种僵尸; 阳光 → 掉落可收集阳光
        if (v.content.kind === 'plant') {
            this._grantVasePlantCard(v.content.type, v.type);
        } else if (v.content.kind === 'zombie') {
            this._revealZombieFromVase(v.content.type, v);
        } else if (v.content.kind === 'sun') {
            // 阳光罐: 在该格生成一颗自动落地的阳光, 落地 0.5s 后飞入阳光计数器
            const cx = this.board.offsetX + v.col * this.board.cellWidth + this.board.cellWidth / 2;
            const cy = this.board.offsetY + v.row * this.board.cellHeight + this.board.cellHeight / 2;
            const s = new Sun(this, cx, cy, cy); // targetY=cy → 原地落地
            s.value = v.content.value || 50;
            this.entities.push(s);
            this.score += 15;
            this.updateScore();
            const prefix = this._vaseTypeLabel(v.type); // v3.15.0 支持金罐
            this.showAnnouncement(`${prefix}：+${s.value} 阳光！攒够 75 可在种子栏购买路灯花`, '#ffd54a');
        }
        // v3.13.2：南瓜套落地成壳墙（放在内容揭示之后，格内无植物才落；耐久=南瓜套剩余值）
        if (shellHp > 0 && this.board.canPlant(row, col) && !this.board.grid[row][col]) {
            const shell = new Plant(this, 'pumpkinhead');
            shell.hp = Math.max(1, Math.min(4000, Math.round(shellHp)));
            this.board.addPlant(shell, row, col);
        }
        // 罐子减少提示
        this.showAnnouncement(`已砸开 ${this.vasesSmashed}/${this.vasesTotal}`, '#ffdd66');
        this.checkVaseVictory();
    }

    // type -> Card/Plants 素材文件名（大小写与 git 入库路径严格一致，部署环境大小写敏感！）
    plantCardArt(type) {
        const map = {
            peashooter: 'Peashooter', snowpea: 'SnowPea', repeater: 'Repeater',
            sunflower: 'SunFlower', wallnut: 'WallNut', cherrybomb: 'CherryBomb',
            squash: 'Squash', jalapeno: 'Jalapeno', potatomine: 'PotatoMine',
            chomper: 'Chomper', puffshroom: 'PuffShroom', fumeshroom: 'FumeShroom',
            spikeweed: 'Spikeweed', threepeater: 'Threepeater', splitpea: 'SplitPea',
            gatlingpea: 'GatlingPea', melonpult: 'MelonPult', tallnut: 'TallNut',
            iceshroom: 'IceShroom', doomshroom: 'DoomShroom', cattail: 'Cattail',
            wintermelon: 'WinterMelon', torchwood: 'Torchwood', garlic: 'Garlic', plantern: 'Plantern',
            sunshroom: 'SunShroom', scaredyshroom: 'ScaredyShroom', twinSunflower: 'TwinSunflower', twinsunflower: 'TwinSunflower', // v3.15.0 补小写键（金罐植物池）
            spikerock: 'Spikerock', // v3.15.0 金罐植物池
            cabbagepult: 'CabbagePult', kernelpult: 'KernelPult',
            starfruit: 'Starfruit', hypnoshroom: 'HypnoShroom', // v3.16.0 补卡面（此前砸开无图）
            pumpkinhead: 'PumpkinHead', gloomshroom: 'GloomShroom',
            cobcannon: 'CobCannon', plantbox: 'PlantBox' // v3.74.0 金罐可开出
        };
        return map[type] || null;
    }

    // ===== 路灯花商店：vase 模式种子栏首位常驻一张 75 阳光的购买卡 =====
    // 路灯花唯一获得方式 —— 罐子(植物/问号/僵尸)都打不出, 只能攒阳光购买
    insertPlanternShop() {
        const bank = document.getElementById('seed-bank');
        if (!bank || bank.querySelector('.plantern-shop-card')) return;
        const el = document.createElement('div');
        el.className = 'seed-card plantern-shop-card';
        el.dataset.type = 'plantern';
        el.dataset.cost = 75;
        el.dataset.cooldown = 0.5;
        el.style.backgroundImage = `url('assets/images/Card/Plants/Plantern.png?v=${this.assetStamp()}')`;
        el.innerHTML = '<div class="cooldown-overlay"></div><span class="shop-price">☀75</span>';
        el.title = '路灯花商店：花 75 阳光购买一盏路灯花（罐子里打不出，只能购买）\n种植后照亮周围一圈罐子里真正的内容';
        bank.prepend(el);
    }

    buyPlantern() {
        if (this.state !== 'PLAYING') return;
        const COST = 75;
        if (this.sunCount < COST) {
            this.showAnnouncement(`阳光不足：路灯花需要 ${COST} 阳光，继续砸植物罐攒阳光吧`, '#ff6666');
            this.audioManager.play('btn');
            return;
        }
        this.sunCount -= COST;
        this.sunCountElement.innerText = this.sunCount;
        // 生成一张可拖动的路灯花免费卡（复用免费卡机制：拖到草地任意格种植）
        const art = this.plantCardArt('plantern');
        const el = document.createElement('div');
        el.className = 'seed-card vase-free-card';
        el.dataset.type = 'plantern';
        el.dataset.cost = 0;
        el.dataset.cooldown = 0.5;
        if (art) {
            el.style.backgroundImage = `url('assets/images/Card/Plants/${art}.png?v=${this.assetStamp()}')`;
        }
        el.innerHTML = '<div class="cooldown-overlay"></div>';
        el.title = '路灯花（已购买 · 拖到草地上种植，照亮周围一圈罐子）';
        const bank = document.getElementById('seed-bank');
        if (bank) bank.appendChild(el);
        this.vaseFreeCards.push({ type: 'plantern', element: el, consumed: false });
        this.updateUI();
        this.audioManager.play('sun');
        this.showAnnouncement('已用 75 阳光购买路灯花！拖到草地上种植即可照亮周围一圈罐子的内容', '#ffd54a');
    }

    // 砸罐子: 给一张预掷种类的免费植物卡(无阳光/无冷却, 种下即消耗)
    _grantVasePlantCard(type, vaseType) {
        vaseType = vaseType || 'question';
        const art = this.plantCardArt(type);
        const el = document.createElement('div');
        el.className = 'seed-card vase-free-card';
        el.dataset.type = type;
        el.dataset.cost = 0;
        el.dataset.cooldown = 0.5;
        if (art) {
            el.style.backgroundImage = `url('assets/images/Card/Plants/${art}.png?v=${this.assetStamp()}')`;
        }
        el.innerHTML = '<div class="cooldown-overlay"></div>';
        el.title = `${this.getPlantName(type)}（免费 · 拖到草地上种植）`;
        if (!art) {
            // v3.32.2：融合株卡面 = 空白卡模板 + 场上融合形态等比缩进上窗。
            //（旧版"主体卡面铺底 + 副体卡面右下角叠放"是两张植物图拼贴——用户：融合植物的图片并没有出现，
            //  要求直接把融合植物在草坪上的样子放进物品栏）
            const probe = new Plant(this, type);
            const bodySrc = probe.element.getAttribute('src');
            const ovEl = probe.fusionOverlay;
            const ovSrc = ovEl ? ovEl.getAttribute('src') : null;
            const ovVisible = ovSrc && ovEl.style.display !== 'none';
            if (probe.element.parentNode) probe.element.parentNode.removeChild(probe.element);
            if (ovEl && ovEl.parentNode) ovEl.parentNode.removeChild(ovEl);
            const stamp = this.assetStamp();
            if (bodySrc) {
                el.style.position = 'relative';
                el.style.backgroundImage = `url('assets/images/Card/Plants/空白卡片.png?v=${stamp}')`;
                // 舞台锚点=卡面上窗中心：主体/叠加层共用一个锚点，叠加层内联 transform 原样照搬即等比复刻
                const stage = document.createElement('div');
                stage.style.cssText = 'position:absolute;left:50%;top:20px;width:0;height:0;transform:scale(0.5);pointer-events:none;';
                const bodyImg = document.createElement('img');
                bodyImg.src = bodySrc.includes('?') ? bodySrc : `${bodySrc}?v=${stamp}`;
                bodyImg.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:none;';
                if (probe.element.style.filter) bodyImg.style.filter = probe.element.style.filter;
                stage.appendChild(bodyImg);
                if (ovVisible) {
                    const ov = document.createElement('img');
                    ov.src = ovSrc.includes('?') ? ovSrc : `${ovSrc}?v=${stamp}`;
                    ov.style.position = 'absolute';
                    ov.style.pointerEvents = 'none';
                    ov.style.transform = ovEl.style.transform || 'translate(-50%, -50%)';
                    if (ovEl.style.clipPath) ov.style.clipPath = ovEl.style.clipPath;
                    stage.appendChild(ov);
                }
                el.appendChild(stage);
            } else {
                // 兜底：探针也拿不到素材的异常类型 → 退回旧版双部件卡面拼贴
                const parts = this._fusionCardParts(type);
                const a1 = parts && this.plantCardArt(parts[0]);
                if (a1) {
                    el.style.position = 'relative';
                    el.style.backgroundImage = `url('assets/images/Card/Plants/${a1}.png?v=${stamp}')`;
                    const ov = this._fusionCardOverlay(type, stamp);
                    if (ov) el.appendChild(ov);
                }
            }
        }
        const bank = document.getElementById('seed-bank');
        if (bank) bank.appendChild(el);

        this.vaseFreeCards.push({ type, element: el, consumed: false });
        this.updateUI();
        this.audioManager.play('plant');
        this.score += 20;
        this.updateScore();
        const prefix = this._vaseTypeLabel(vaseType); // v3.15.0 支持金罐
        this.showAnnouncement(`${prefix}：获得「${this.getPlantName(type)}」卡片！拖到草地上任意格子种植`, '#66ff66');
    }

    assetStamp() {
        // 与 bump_version.py 同步的缓存戳：读取当前 URL 使用的 ?v=（取第一个种子图片的值兜底）
        const m = (this.seeds && this.seeds[0] && this.seeds[0].img || '').match(/v=(\d+)/);
        return m ? m[1] : '';
    }

    // 砸罐子: 让一只预掷种类的僵尸从该格左侧出现
    _revealZombieFromVase(type, vase) {
        const z = new Zombie(this, vase.row, type);
        // 让僵尸从罐子格 x 出现(默认 950 太靠右,不合理)
        z.x = this.board.offsetX + vase.col * this.board.cellWidth + this.board.cellWidth / 2;
        z.element.style.left = z.x + 'px';
        // v3.21.0：撤销 v3.18.0/v3.19.0 的"罐中僵尸站定"——恢复原版行走+啃食（用户确认站定非所需）
        // v3.15.0：金罐强化 —— 融合植物头僵尸本体仅 200 血，从金罐出来时按"很厉害"定位强化为 1000 血
        //（先强化基准值，地狱 hpMul ×1.35 再在其上生效 —— 顺序不能颠倒）
        if (vase.golden && (type === 'peahead' || type === 'nuthead' || type === 'sunhead' || type === 'snowpeahead' || type === 'jalapenohead' || type === 'machinegunhead' || type === 'tallnuthead')) {
            z.hp = 1000; z.maxHp = 1000;
        }
        // 地狱难度: 血量 ×1.35（简单/困难为 1.0 不生效）
        const hpMul = this._vaseDiffCfg().hpMul;
        if (hpMul > 1) {
            z.hp = Math.round(z.hp * hpMul);
            z.maxHp = z.hp;
        }
        this.entities.push(z);
        this.score = Math.max(0, this.score - 5);
        this.updateScore();
        const zhName = this._zombieZhName(type); // v3.23.0 统一出口
        const prefix = this._vaseTypeLabel(vase.golden ? 'golden' : vase.type); // v3.15.0 支持金罐
        this.showAnnouncement(`${prefix}：${zhName} 来了！`, '#ff6666');
    }

    // 路灯花照亮周围一圈(8 邻居)的罐子: 罐子变成半透明, 罐内直接可见真正的内容
    //   (植物 → 卡图预览; 僵尸 → 僵尸立绘)。揭示内容与预掷 v.content 完全一致。
    lightUpNeighbors(row, col) {
        if (!this.vases || this.vases.length === 0) return;
        const stamp = this.assetStamp();
        // 僵尸类型 → 在场上的小立绘,用于罐内预览
        const zombieIcon = {
            normal:    'Zombie/Zombie.gif',
            flag:      'FlagZombie/FlagZombie.gif',
            conehead:  'ConeheadZombie/ConeheadZombie.gif',
            buckethead:'BucketheadZombie/BucketheadZombie.gif',
            polevaulting:'PoleVaultingZombie/PoleVaultingZombie.gif',
            newspaper: 'NewspaperZombie/HeadWalk1.gif',
            screendoor:'ScreenDoorZombie/HeadWalk1.gif',
            football:'FootballZombie/FootballZombie.gif',   // v3.14.0 罐子特殊僵尸
            zomboni:  'Zomboni/1.gif',
            dancing:  'DancingZombie/DancingZombie.gif',
            imp:      'Imp/Zombie.gif',                 // v3.69.0 小鬼入罐池
            backup:   'BackupDancer/BackupDancer.gif',  // v3.69.0 伴舞入罐池
            // v3.15.0 金罐新僵尸：植物头僵尸用头顶植物立绘做预览（本体与普通僵尸同图）
            peahead:     '../Plants/Peashooter/Peashooter.gif',
            nuthead:     '../Plants/WallNut/WallNut.gif',
            sunhead:     '../Plants/SunFlower/SunFlower1.gif',
            snowpeahead: '../Plants/SnowPea/SnowPea.gif',
            jalapenohead:'../Plants/Jalapeno/Jalapeno.gif',
            machinegunhead:'../Plants/GatlingPea/GatlingPea.gif',
            tallnuthead: '../Plants/TallNut/TallNut.gif',
            mysterybox:  '../Plants/PlantBox/GiftBox.png',
            gargantuar:  'Zombie/Zombie.gif',
            // v3.74.0 融合僵尸罐内预览（基础底图；双盔/火把另加挂件合成，见下方 ZOMBIE_ACC_PREVIEW；
            // v3.79.0 大蒜僵尸改植物头式 —— 走 PLANT_HEAD_CFG 的身体+大蒜头合成，与植物头家族一致）
            ironcone:    'BucketheadZombie/BucketheadZombie.gif',
            madpaper:    'NewspaperZombie/LostNewspaper.gif',
            torchzombie: 'Zombie/Zombie.gif',
            garliczombie:'../Plants/Garlic/Garlic.gif'
        };
        // v3.74.0：融合僵尸挂件预览 —— 照明后不能长得跟普通僵尸一样（v3.68.0 锤子僵尸同款教训）。
        // 复刻场上 _spawnAcc 几何：身体 56px（k=56/144），挂件从源 gif 裁剪区等比贴到锚点。
        // v3.79.0：双盔=铁桶帽沿原桶位置向上叠（场上 dx:-5,dy:-73）；火把改手上（同锤子锚点 dx:-6,dy:10）；
        // 大蒜僵尸已并入植物头式（PLANT_HEAD_CFG.garliczombie），不再需要挂件预览
        const ZOMBIE_ACC_PREVIEW = {
            torchzombie: { body: 'Zombie/Zombie.gif', src: 'Plants/Torchwood/Torchwood.gif', cw: 73, ch: 87, x1: 0, y1: 0, x2: 73, y2: 87, w: 26, dx: -12, dy: 6 },
            ironcone: { body: 'BucketheadZombie/BucketheadZombie.gif', src: 'Zombies/BucketheadZombie/BucketheadZombie.gif', cw: 166, ch: 144, x1: 52, y1: 2, x2: 104, y2: 52, w: 52, dx: -5, dy: -72, flip: true }
        };
        let lit = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = row + dr, c = col + dc;
                if (r < 0 || r >= this.board.rows || c < 0 || c >= this.board.cols) continue;
                const v = this.vases.find(x => !x.smashed && x.row === r && x.col === c);
                if (!v || v.revealed) continue;
                v.revealed = true;
                // 1) 罐子半透明化 + 暖光, 让罐内内容透出来
                if (v.element) {
                    v.element.style.opacity = '0.40';
                    v.element.style.filter = 'drop-shadow(0 0 5px rgba(255, 225, 110, 0.9))';
                    v.element.style.transition = 'opacity 0.25s ease-out, filter 0.25s ease-out';
                }
                // 2) 内容缩略图叠在罐子中心（看起来"装在罐子里"）
                let inner;
                if (v.content.kind === 'plant') {
                    // v3.29.0：罐内植物预览统一换成「植物本体立绘」—— 与植物头僵尸的罐内预览
                    // 同款风格（用户：罐里"只有一个植物脑袋"的那张图很好看，全部植物都用它）。
                    // 探针 Plant 实例只读素材路径（element.src / fusionOverlay.src），读完立即摘除
                    // ——不进主循环、不参与碰撞、不计分，对游戏状态零影响。
                    const probe = new Plant(this, v.content.type);
                    const bodySrc = probe.element.getAttribute('src');
                    if (probe.element.parentNode) probe.element.parentNode.removeChild(probe.element);
                    if (probe.fusionOverlay && probe.fusionOverlay.parentNode) {
                        probe.fusionOverlay.parentNode.removeChild(probe.fusionOverlay);
                    }
                    if (bodySrc) {
                        const ovEl = probe.fusionOverlay;
                        const ovSrc = ovEl ? ovEl.getAttribute('src') : null;
                        const ovVisible = ovSrc && ovEl.style.display !== 'none';
                        if (ovVisible) {
                            // v3.32.0：融合株罐内预览 = 主体 + 叠加层按场上几何等比缩放
                            //（旧版只显示主体立绘 → 地刺坚果在罐里看着就是普通坚果）
                            inner = document.createElement('div');
                            inner.className = 'entity vase-reveal';
                            inner.style.pointerEvents = 'none';
                            inner.style.position = 'relative';
                            inner.style.width = '58px';
                            inner.style.height = '64px';
                            // 舞台锚点在预览中心：场上主体/叠加层都以 (x, y+yOffset) 为中心定位，
                            // 叠加层的内联 transform 自带 translate(-50%,-50%) 前缀与额外偏移，原样照搬即等比复刻
                            const stage = document.createElement('div');
                            stage.style.cssText = 'position:absolute;left:50%;top:50%;width:0;height:0;transform:scale(0.75);pointer-events:none;';
                            const bodyImg = document.createElement('img');
                            bodyImg.src = bodySrc.includes('?') ? bodySrc : `${bodySrc}?v=${stamp}`;
                            bodyImg.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:none;';
                            if (probe.element.style.filter) bodyImg.style.filter = probe.element.style.filter;
                            stage.appendChild(bodyImg);
                            const ov = document.createElement('img');
                            ov.src = ovSrc.includes('?') ? ovSrc : `${ovSrc}?v=${stamp}`;
                            ov.style.position = 'absolute';
                            ov.style.pointerEvents = 'none';
                            ov.style.transform = ovEl.style.transform || 'translate(-50%, -50%)';
                            if (ovEl.style.clipPath) ov.style.clipPath = ovEl.style.clipPath;
                            stage.appendChild(ov);
                            inner.appendChild(stage);
                        } else {
                            inner = document.createElement('img');
                            inner.className = 'entity vase-reveal';
                            inner.style.pointerEvents = 'none';
                            inner.src = bodySrc.includes('?') ? bodySrc : `${bodySrc}?v=${stamp}`;
                            inner.style.width = 'auto';
                            inner.style.maxWidth = '58px';
                            inner.style.maxHeight = '64px';
                            inner.style.objectFit = 'contain';
                            if (probe.element.style.filter) inner.style.filter = probe.element.style.filter;
                        }
                    } else {
                        // 兜底：素材表查不到的异常类型 → 退回旧版卡面裁切预览
                        //（种子卡素材 100×120 上下双段，只露出上半段彩色卡面）
                        const art = this.plantCardArt(v.content.type);
                        inner = document.createElement('div');
                        inner.className = 'entity vase-reveal vase-reveal-card';
                        inner.style.pointerEvents = 'none';
                        if (art) inner.style.backgroundImage = `url('assets/images/Card/Plants/${art}.png?v=${stamp}')`;
                        inner.style.width = '58px';
                        inner.style.height = '35px';
                    }
                } else {
                    inner = document.createElement('img');
                    inner.className = 'entity vase-reveal';
                    inner.style.pointerEvents = 'none';
                    if (v.content.kind === 'zombie') {
                        // v3.30.0：植物头僵尸（含盲盒僵尸）罐内预览 = 僵尸身体 + 头顶植物头合成
                        //（旧版只给植物立绘 —— 与 v3.29.0 后的植物罐预览长得一模一样，分不清罐里是什么）
                        const headCfg = Zombie.PLANT_HEAD_CFG && Zombie.PLANT_HEAD_CFG[v.content.type];
                        const accCfg = ZOMBIE_ACC_PREVIEW[v.content.type];
                        if (accCfg) {
                            // v3.74.0：融合僵尸预览 = 底图 + 裁剪挂件（火把/大蒜/铁桶）
                            const wrap = document.createElement('div');
                            wrap.className = 'entity vase-reveal';
                            wrap.style.pointerEvents = 'none';
                            wrap.style.width = '56px';
                            wrap.style.height = '64px';
                            const k = 56 / 144;
                            const body = document.createElement('img');
                            body.src = `assets/images/Zombies/${accCfg.body}?v=${stamp}`;
                            body.style.cssText = 'position:absolute;left:0;bottom:0;width:56px;height:56px;';
                            wrap.appendChild(body);
                            const aw = accCfg.w * k;
                            const cw = (accCfg.x2 - accCfg.x1) * k, chh = (accCfg.y2 - accCfg.y1) * k;
                            const acc = document.createElement('div');
                            acc.style.cssText = 'position:absolute;overflow:hidden;pointer-events:none;' +
                                'width:' + cw.toFixed(1) + 'px;height:' + chh.toFixed(1) + 'px;' +
                                'left:' + (28 + accCfg.dx * k - cw / 2).toFixed(1) + 'px;top:' + (36 + accCfg.dy * k - chh / 2).toFixed(1) + 'px;';
                            const aImg = document.createElement('img');
                            // v3.79.1：flip=垂直镜像（双盔外桶倒扣）——镜像后 top 改为 -(ch-y2)*k
                            aImg.src = `assets/images/${accCfg.src}?v=${stamp}`;
                            aImg.style.cssText = 'position:absolute;max-width:none;' +
                                'left:' + (-accCfg.x1 * k).toFixed(1) + 'px;top:' + (accCfg.flip ? (-(accCfg.ch - accCfg.y2) * k) : (-accCfg.y1 * k)).toFixed(1) + 'px;' +
                                'width:' + (accCfg.cw * k).toFixed(1) + 'px;' +
                                (accCfg.flip ? 'transform:scaleY(-1);' : '');
                            acc.appendChild(aImg);
                            wrap.appendChild(acc);
                            inner = wrap;
                        } else if (v.content.type === 'hammerzombie') {
                            // v3.68.0：锤子僵尸罐内预览 = 普通僵尸身体 + 手里木锤挂件（用户：照明后跟普通僵尸
                            // 一模一样）。复刻场上 _spawnHammer/_syncHammer：锤挂在本体中心旁 (-6,+12)，按
                            // 场上 144px → 预览 56px 的 k 系数等比换算大小与偏移。
                            const wrap = document.createElement('div');
                            wrap.className = 'entity vase-reveal';
                            wrap.style.pointerEvents = 'none';
                            wrap.style.width = '56px';
                            wrap.style.height = '64px';
                            const k = 56 / 144;
                            const body = document.createElement('img');
                            body.src = `assets/images/Zombies/Zombie/Zombie.gif?v=${stamp}`;
                            body.style.cssText = 'position:absolute;left:0;bottom:0;width:56px;height:56px;';
                            wrap.appendChild(body);
                            const hm = document.createElement('img');
                            hm.src = `assets/images/Zombies/HammerZombie/Hammer.png?v=${stamp}`;
                            hm.style.cssText = 'position:absolute;width:' + (30 * k).toFixed(1) + 'px;height:' + (34 * k).toFixed(1) + 'px;' +
                                'left:' + (28 - 6 * k).toFixed(1) + 'px;top:' + (36 + 12 * k).toFixed(1) + 'px;' +
                                'transform:translate(-50%,-50%);pointer-events:none;';
                            wrap.appendChild(hm);
                            inner = wrap;
                        } else if (headCfg) {
                            const wrap = document.createElement('div');
                            wrap.className = 'entity vase-reveal';
                            wrap.style.pointerEvents = 'none';
                            wrap.style.width = '56px';
                            wrap.style.height = '64px';
                            // 身体：普通僵尸 gif，按预览宽度等比（场上立绘 144px → 56px，k=缩放系数）
                            const k = 56 / 144;
                            const body = document.createElement('img');
                            body.src = `assets/images/Zombies/Zombie/Zombie.gif?v=${stamp}`;
                            body.style.position = 'absolute';
                            body.style.left = '0';
                            body.style.bottom = '0';
                            body.style.width = '56px';
                            body.style.height = '56px';
                            wrap.appendChild(body);
                            // 头：复用场上 createPlantHead 的裁剪参数（等比缩小，水平翻转朝左）
                            const hw = headCfg.w * k;
                            const head = document.createElement('div');
                            head.style.position = 'absolute';
                            head.style.overflow = 'hidden';
                            head.style.width = hw + 'px';
                            head.style.height = (hw * headCfg.ch / headCfg.cw * headCfg.keepTop) + 'px';
                            head.style.left = (28 - hw / 2 + 10 * k) + 'px';   // 头区中心=身体中心右偏 10px（同 syncPlantHead）
                            const topOff = (headCfg.topOff !== undefined) ? headCfg.topOff : -48;
                            head.style.top = (36 + topOff * k) + 'px';          // 身体中心(36px) + 头顶锚点等比偏移
                            const hImg = document.createElement('img');
                            hImg.src = headCfg.src.includes('?') ? headCfg.src : `${headCfg.src}?v=${stamp}`;
                            hImg.style.position = 'absolute';
                            hImg.style.left = '0';
                            hImg.style.top = '0';
                            hImg.style.width = hw + 'px';
                            hImg.style.transform = 'scaleX(-1)';
                            head.appendChild(hImg);
                            wrap.appendChild(head);
                            inner = wrap;
                        } else {
                            inner.src = `assets/images/Zombies/${zombieIcon[v.content.type] || 'Zombie/Zombie.gif'}?v=${stamp}`;
                            inner.style.width = '56px';
                            inner.style.height = 'auto';
                            inner.style.maxHeight = '64px';
                        }
                    } else {
                        // 阳光罐：罐内直接显示一个小太阳
                        inner.src = `assets/images/interface/Sun.gif?v=${stamp}`;
                        inner.style.width = '40px';
                        inner.style.height = '40px';
                    }
                }
                const cx = this.board.offsetX + v.col * this.board.cellWidth + this.board.cellWidth / 2;
                const cy = this.board.offsetY + v.row * this.board.cellHeight + this.board.cellHeight / 2 + 12;
                inner.style.left = cx + 'px';
                inner.style.top = cy + 'px';
                inner.style.transform = 'translate(-50%, -50%)';
                // v3.44.0：南瓜套罐的预览必须浮在套壳之上（套壳 z≈+22，旧 +2 会被压在壳后，
                // 再叠加罐身淡出 40% —— 玩家看到的就是"南瓜套突然往下坠了一截"的错觉）
                inner.style.zIndex = String(Math.floor(cy) + (v.pumpkinHp > 0 ? 25 : 2));
                this.entityLayer.appendChild(inner);
                v.contentEl = inner;
                lit++;
            }
        }
        if (lit > 0) {
            this.showAnnouncement(`路灯花照亮了 ${lit} 个罐子：罐子变透明，可看清里面装的是什么`, '#ffff66');
        } else {
            this.showAnnouncement('路灯花附近没有可以照亮的罐子', '#ffff66');
        }
    }

    // 战场左侧打出帅气的「区耀丁」署名（vase 模式专属）：
    // 罐子从 col1 起摆，其左边正是第一列 col0 —— 该列永远不会出现罐子，
    // 竖排金字署名固定浮在那里，作为玩家签名水印（种植物/僵尸经过都在其上，不影响游戏）
    _showVaseSignature() {
        if (!this.vaseMode) return;
        if (this._sigEl && this._sigEl.parentNode) this._sigEl.parentNode.removeChild(this._sigEl);
        this._sigEl = null;
        const sig = document.createElement('div');
        sig.className = 'vase-sign';
        sig.textContent = '区耀丁';
        const x = this.board.offsetX + this.board.cellWidth / 2; // col0 中心
        const y = this.board.offsetY + (this.board.rows * this.board.cellHeight) / 2; // 战场垂直中点
        sig.style.left = x + 'px';
        sig.style.top = y + 'px';
        this.entityLayer.appendChild(sig);
        this._sigEl = sig;
    }

    // HUD 常驻难度角标（右上角 Speed 按钮旁），仅 vase 模式显示
    _syncVaseHud() {
        const old = document.getElementById('vase-diff-chip');
        if (old && old.parentNode) old.parentNode.removeChild(old);
        if (!this.vaseMode) return;
        const cfg = this._vaseDiffCfg();
        const chip = document.createElement('div');
        chip.id = 'vase-diff-chip';
        chip.className = 'diff-chip diff-' + cfg.key;
        // v3.34.0：文案去掉"难度"前缀，只留 档位名+英文；竖排挂在 Speed 正下方
        chip.innerHTML = `${cfg.label}<span class="diff-chip-en">${cfg.key.toUpperCase()}</span>`;
        chip.title = `砸罐子 · ${cfg.label}难度`;
        const corner = document.getElementById('corner-hud');
        if (corner) corner.appendChild(chip);
    }

    checkVaseVictory() {
        if (this.state !== 'PLAYING') return;
        if (this.vases.length === 0) return;
        if (!this.vases.every(v => v.smashed)) return;
        // 等场上僵尸清空（Dying 动画允许播放完、元素已移除）
        const live = this.entities.some(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
        if (live) return;
        this.state = 'GAMEOVER';
        this._hidePauseUi(); // v3.43.0 结算时收起暂停 UI
        this.audioManager.stop('bgm');
        this.audioManager.play('win'); // v3.5.2 修复: 胜利必须播胜利音乐(此前误播 lose)
        // 胜利弹窗：居中 modal —— LEVEL CLEAR + VICTORY! 砸罐子完成! + 难度 + Final Score + 再玩一局/退出
        const container = this.container;
        const diffLabel = this._vaseDiffCfg().label; // 简单/困难/地狱
        const overlay = document.createElement('div');
        overlay.className = 'vase-win-overlay';
        overlay.innerHTML = `
            <div class="vase-win-panel">
                <div class="vase-win-lv">LEVEL CLEAR</div>
                <div class="vase-win-title">VICTORY!</div>
                <div class="vase-win-sub">砸罐子完成！<span class="vase-win-diff">难度 · ${diffLabel}</span></div>
                <div class="vase-win-score">Final Score：<b>${this.score}</b></div>
                <div class="vase-win-btns">
                    <button id="vase-win-replay" class="vase-win-btn again">再玩一局</button>
                    <button id="vase-win-exit" class="vase-win-btn exit">退出</button>
                </div>
            </div>`;
        container.appendChild(overlay);
        overlay.querySelector('#vase-win-replay').onclick = () => this.restartVaseLevel();
        overlay.querySelector('#vase-win-exit').onclick = () => location.reload(); // 回主菜单（干净重载）
        this._vaseWinEls = [overlay];
    }

    // 胜利后"再玩一局"：清掉整场残留(罐子/植物/僵尸/阳光/子弹) 后原地开一局新砸罐子
    restartVaseLevel() {
        this.audioManager.play('btn');
        // 1) 移除胜利画面（v3.11.1：失败画面 _gameOverEls 同样可能存在，一并移除）
        this._removeGameOverEls();
        if (this._vaseWinEls) {
            this._vaseWinEls.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
            this._vaseWinEls = null;
        }
        // 2) 移除所有罐子与其罐内揭示内容（含 v3.12.0 南瓜套罐的外壳层）
        (this.vases || []).forEach(v => {
            if (v.element && v.element.parentNode) v.element.parentNode.removeChild(v.element);
            if (v.contentEl && v.contentEl.parentNode) v.contentEl.parentNode.removeChild(v.contentEl);
            if (v.pumpkinEl && v.pumpkinEl.parentNode) v.pumpkinEl.parentNode.removeChild(v.pumpkinEl);
            if (v.pumpkinBackEl && v.pumpkinBackEl.parentNode) v.pumpkinBackEl.parentNode.removeChild(v.pumpkinBackEl);
        });
        this.vases = [];
        this.vasesTotal = 0;
        this.vasesSmashed = 0;
        // 3) 清掉场上所有实体(植物/僵尸/阳光/子弹)的 DOM 与数组, 重置棋盘
        this.entities.forEach(e => this._removeEntityDom(e));
        this.entities = [];
        this._hardSweepEntityLayer(); // v3.18.0：硬清场，孤儿 DOM 一律带走
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) this.board.grid[r][c] = null;
        }
        this.score = 0;
        this.updateScore();
        // 4) 走标准开局：清种子栏 + 阳光归零 + 商店 + 重掷罐子 + 重启主循环(state: GAMEOVER→PLAYING)
        this.startGame();
    }
}

// Start game when page loads
window.onload = () => {
    window._pvzGame = new Game();
};
