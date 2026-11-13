/*!
 * MiniGames.js — pvz-web 后院游乐场（v4.0.134）
 * 10 个独立玩法，全部运行在同一个 900×600 canvas 上：
 *   玉米方块(俄罗斯方块) / 僵尸地鼠(打地鼠) / 花园2048 / 泡泡牧场(三消养成)
 *   豌豆弹球(打砖块) / 机械龙攻城(Boss 战) / 寒冰推箱(推箱子) / 泡泡对轰(双人)
 *   花园连连看(记忆配对) / 泡泡塔(爬塔)
 * ESC 逐层返回（游戏 → 大厅 → 主菜单）。
 */
(function () {
    'use strict';

    const W = 900, H = 600;
    const PL = 'assets/images/Plants/';
    const ZB = 'assets/images/Zombies/';
    const SPR = {
        peashooter: PL + 'Peashooter/0.gif',
        sunflower: PL + 'SunFlower/0.gif',
        wallnut: PL + 'WallNut/0.gif',
        tallnut: PL + 'TallNut/0.gif',
        snowpea: PL + 'SnowPea/0.gif',
        repeater: PL + 'Repeater/0.gif',
        threepeater: PL + 'Threepeater/0.gif',
        gatling: PL + 'GatlingPea/0.gif',
        melon: PL + 'MelonPult/MelonPult.png',
        wintermelon: PL + 'WinterMelon/WinterMelon.png',
        cobcannon: PL + 'CobCannon/CobCannon.png',
        pot: PL + 'FlowerPot/0.gif',
        lilypad: PL + 'LilyPad/0.gif',
        spikeweed: PL + 'Spikeweed/0.gif',
        cherry: PL + 'CherryBomb/0.gif',
        torchwood: PL + 'Torchwood/0.gif',
        kernel: PL + 'KernelPult/KernelPult.png',
        cob: PL + 'CobCannon/Cob.png',            // v4.0.138：161x76 的玉米棒（原版玉米炮弹），比 96px 投石车清楚得多
        doom: PL + 'DoomShroom/0.gif',
        puffshroom: PL + 'PuffShroom/0.gif',
        fumefume: PL + 'FumeShroom/0.gif',
        gloom: PL + 'GloomShroom/0.gif',
        butter: PL + 'KernelPult/Butter.png',
        cattail: PL + 'Cattail/Cattail.gif',
        garlic: PL + 'Garlic/0.gif',
        pumpkin: PL + 'PumpkinHead/0.gif',
        zombie: ZB + 'Zombie/0.gif',
        cone: ZB + 'ConeheadZombie/0.gif',
        bucket: ZB + 'BucketheadZombie/0.gif',
        balloon: ZB + 'BalloonZombie/0.gif',
        dragon: ZB + 'LGBOSS/1.gif',        // v4.0.152：机械龙攻城用的 Boss（464x400，14 帧）
        sun: 'assets/images/interface/Sun.gif'
    };
    const _im = Object.create(null);

    /* ================================================================
     * 音效引擎（v4.0.156）—— WebAudio 纯合成，不加载任何音频文件
     * ----------------------------------------------------------------
     * 之前整个泡泡工坊是静音的。原版素材库里没有「泡泡」「机械龙」这类声音，
     * 与其硬塞一段僵尸呻吟（跟钢铁龙完全不搭），不如现合成两套音色：
     *   泡泡/玻璃  → 中高频、短促、带气声，颗数越多越亮
     *   机械龙    → 低频锯齿 + 颤音 + 金属噪声，闭着眼也听得出是另一回事
     * 浏览器自动播放策略：AudioContext 必须在用户手势之后才能出声，
     * 所以 ensure() 懒建，且每次调用都顺手 resume 一次（切标签回来也能恢复）。
     * ================================================================ */
    const SFX = (function () {
        let ac = null, out = null, muted = false, nBuf = null;
        const gate = Object.create(null);          // 每个音效名 → 上次播放时间，用来节流

        function ensure() {
            if (ac) { if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} } return ac; }
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            try {
                ac = new AC();
                out = ac.createGain();
                out.gain.value = 0.8;
                out.connect(ac.destination);
                // 预生成一段 1.2s 白噪声，所有气声/金属声都从它裁（避免每次 new Buffer）
                const n = Math.floor(ac.sampleRate * 1.2);
                nBuf = ac.createBuffer(1, n, ac.sampleRate);
                const d = nBuf.getChannelData(0);
                for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
            } catch (e) { ac = null; }
            return ac;
        }
        // 节流：一帧里连锁消掉二十颗球，不该叠二十层「噼啪」糊成噪声
        function allow(k, ms) {
            if (muted || !ensure()) return false;
            const t = performance.now();
            if (gate[k] && t - gate[k] < ms) return false;
            gate[k] = t;
            return true;
        }
        // 单振荡器。f0→f1 指数滑（倍频程上是等距的，听感才是「滑上去」而不是「冲上去」）
        function tone(o) {
            const t = ac.currentTime + (o.d || 0);
            const os = ac.createOscillator(), g = ac.createGain();
            os.type = o.t || 'sine';
            os.frequency.setValueAtTime(o.f0, t);
            if (o.f1 && o.f1 !== o.f0) os.frequency.exponentialRampToValueAtTime(Math.max(18, o.f1), t + o.dur);
            if (o.det) os.detune.value = o.det;
            const v = Math.max(0.0004, o.v);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(v, t + Math.min(o.dur * 0.7, o.atk || 0.008));
            g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
            let tail = g;
            if (o.lp) {
                const f = ac.createBiquadFilter();
                f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.8;
                g.connect(f); tail = f;
            }
            os.connect(g); tail.connect(out);
            os.start(t); os.stop(t + o.dur + 0.03);
        }
        // 噪声段。type/f0/f1/q 决定它是「气声」(bandpass)、「风声」(lowpass) 还是「金属碎」(highpass)
        function noise(o) {
            const t = ac.currentTime + (o.d || 0);
            const s = ac.createBufferSource();
            s.buffer = nBuf;
            s.playbackRate.value = o.rate || 1;
            const f = ac.createBiquadFilter();
            f.type = o.type || 'bandpass';
            f.frequency.setValueAtTime(o.f0 || 1200, t);
            if (o.f1 && o.f1 !== o.f0) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.f1), t + o.dur);
            f.Q.value = o.q == null ? 1 : o.q;
            const g = ac.createGain();
            const v = Math.max(0.0004, o.v);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(v, t + (o.atk || 0.006));
            g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
            s.connect(f); f.connect(g); g.connect(out);
            s.start(t); s.stop(t + o.dur + 0.02);
        }
        // 喉音：锯齿 + 低通 + 颤音（LFO 接到 frequency）。
        // 纯 sine 滑音听着像汽笛，加上 4~7Hz 的颤音和深度渐变才像活物的嗓子。
        function growl(o) {
            const t = ac.currentTime + (o.d || 0);
            const os = ac.createOscillator(), g = ac.createGain();
            os.type = o.t || 'sawtooth';
            os.frequency.setValueAtTime(o.f0, t);
            os.frequency.exponentialRampToValueAtTime(Math.max(18, o.f1), t + o.dur);
            if (o.det) os.detune.value = o.det;
            const lfo = ac.createOscillator(), lg = ac.createGain();
            lfo.frequency.setValueAtTime(o.vib || 6, t);
            lg.gain.setValueAtTime(o.depth || 8, t);
            if (o.depthTo) lg.gain.linearRampToValueAtTime(o.depthTo, t + o.dur);
            lfo.connect(lg); lg.connect(os.frequency);
            const lp = ac.createBiquadFilter();
            lp.type = 'lowpass'; lp.frequency.value = o.lp || 2000; lp.Q.value = 0.9;
            const v = Math.max(0.0004, o.v);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(v, t + (o.atk || 0.05));
            g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
            os.connect(lp); lp.connect(g); g.connect(out);
            os.start(t); os.stop(t + o.dur + 0.03);
            lfo.start(t); lfo.stop(t + o.dur + 0.03);
        }

        const S = {
            /* ---------- 通用 UI ---------- */
            click() {
                if (!allow('click', 60)) return;
                tone({ t: 'triangle', f0: 720, f1: 980, dur: 0.07, v: 0.16 });
                tone({ t: 'sine', f0: 1440, f1: 1900, dur: 0.05, v: 0.08, d: 0.02 });
            },
            win() {
                if (!allow('win', 800)) return;
                [523, 659, 784, 1046, 1318].forEach((f, i) => {
                    tone({ t: 'triangle', f0: f, f1: f, dur: 0.38, v: 0.20, d: i * 0.10, atk: 0.012 });
                    tone({ t: 'sine', f0: f * 2, f1: f * 2, dur: 0.22, v: 0.07, d: i * 0.10 });
                });
                tone({ t: 'sine', f0: 262, f1: 523, dur: 0.5, v: 0.14, d: 0.05, atk: 0.05 });
            },
            fail() {
                if (!allow('fail', 800)) return;
                [392, 330, 262, 196].forEach((f, i) => {
                    tone({ t: 'triangle', f0: f, f1: f * 0.99, dur: 0.34, v: 0.20, d: i * 0.13, atk: 0.01 });
                });
                tone({ t: 'sine', f0: 98, f1: 62, dur: 1.1, v: 0.20, d: 0.42, atk: 0.04 });
            },

            /* ---------- 泡泡工坊：玻璃 / 水 ---------- */
            // 发射：炮口「噗啾」—— 气声上扬 + 一点炮身闷响
            fire(k) {
                if (!allow('fire', 38)) return;
                const v = 0.26 * (k == null ? 1 : k);
                noise({ dur: 0.10, v: v * 0.55, f0: 700, f1: 2100, q: 1.5 });
                tone({ t: 'sine', f0: 250, f1: 640, dur: 0.12, v: v * 0.75 });
                tone({ t: 'triangle', f0: 118, f1: 86, dur: 0.08, v: v * 0.5 });
            },
            // 撞墙：泡泡轻磕玻璃壁
            bounce(k) {
                if (!allow('bounce', 50)) return;
                const v = 0.15 * (k == null ? 1 : k);
                noise({ dur: 0.04, v: v * 0.55, f0: 2600, q: 1.9 });
                tone({ t: 'sine', f0: 780, f1: 520, dur: 0.05, v: v * 0.5 });
            },
            // 粘合：泡泡贴上去的「啵哒」—— 低频塌一下 + 极短的膜张力
            stick(k) {
                if (!allow('stick', 34)) return;
                const v = 0.32 * (k == null ? 1 : k);
                tone({ t: 'sine', f0: 205, f1: 92, dur: 0.14, v: v * 0.85, atk: 0.004 });
                tone({ t: 'triangle', f0: 560, f1: 305, dur: 0.055, v: v * 0.30 });
                noise({ dur: 0.05, v: v * 0.28, f0: 1300, q: 1.2 });
            },
            // 碎裂：爆破气声 + 一串玻璃叮。消得越多整体越高、叮得越多
            pop(n, k) {
                if (!allow('pop', 32)) return;
                const nn = Math.max(3, Math.min(14, n || 3));
                const v = (0.28 + Math.min(0.22, nn * 0.014)) * (k == null ? 1 : k);
                const up = 1 + (nn - 3) * 0.055;
                noise({ dur: 0.17, v: v * 0.75, f0: 1900 * up, f1: 620, q: 0.85 });
                tone({ t: 'sine', f0: 340 * up, f1: 108, dur: 0.13, v: v * 0.8, atk: 0.003 });
                const m = Math.min(5, 2 + (nn >> 1));
                for (let i = 0; i < m; i++) {
                    const f = (1250 + Math.random() * 900) * up;
                    tone({ t: 'sine', f0: f, f1: f * 0.72, dur: 0.10, v: v * 0.25, d: 0.012 + i * 0.019 });
                }
            },
            // 悬空掉落：一路往下漏气，颗粒越多漏得越长
            drop(n, k) {
                if (!allow('drop', 65)) return;
                const v = 0.23 * (k == null ? 1 : k);
                tone({ t: 'sine', f0: 640, f1: 150, dur: 0.42, v: v * 0.55, atk: 0.02 });
                for (let i = 0; i < Math.min(4, Math.max(2, (n || 3) >> 1)); i++) {
                    tone({ t: 'sine', f0: 480, f1: 205, dur: 0.16, v: v * 0.28, d: 0.05 + i * 0.075 });
                }
            },
            // 顶行下压：齿轮咬合 + 整排砸下来的闷响
            push(k) {
                if (!allow('push', 220)) return;
                const v = 0.32 * (k == null ? 1 : k);
                tone({ t: 'sine', f0: 122, f1: 46, dur: 0.34, v: v * 0.9, atk: 0.006 });
                noise({ dur: 0.20, v: v * 0.36, type: 'lowpass', f0: 620, q: 0.9 });
                tone({ t: 'sawtooth', f0: 262, f1: 188, dur: 0.14, v: v * 0.15, lp: 900 });
            },
            // 危险线警报：两声下行短音，只在泡泡逼近炮口时响（1.5 秒内不重复）
            danger() {
                if (!allow('danger', 1500)) return;
                tone({ t: 'square', f0: 880, f1: 880, dur: 0.09, v: 0.10, lp: 2800 });
                tone({ t: 'square', f0: 660, f1: 660, dur: 0.13, v: 0.10, d: 0.15, lp: 2800 });
            },
            // 墓碑：石头摩擦 + 落地
            tomb(k) {
                if (!allow('tomb', 85)) return;
                const v = 0.25 * (k == null ? 1 : k);
                noise({ dur: 0.17, v: v * 0.62, type: 'lowpass', f0: 900, f1: 300, q: 0.8 });
                tone({ t: 'triangle', f0: 208, f1: 118, dur: 0.13, v: v * 0.42 });
            },
            // 连击计数（塔/对轰用）：音高逐级上扬，最多升八度
            combo(n, k) {
                if (!allow('combo', 90)) return;
                const st = Math.min(12, (n || 1) - 1);
                const f = 620 * Math.pow(2, st / 12);
                const v = 0.20 * (k == null ? 1 : k);
                tone({ t: 'triangle', f0: f, f1: f, dur: 0.14, v: v });
                tone({ t: 'sine', f0: f * 2, f1: f * 2, dur: 0.09, v: v * 0.45, d: 0.03 });
            },
            // v4.0.157：植物体系的四个专属音色
            // 机枪连射：一串极密的活塞声，七连发一次推完（机械感靠方波 + 快速衰减）
            machine() {
                if (!allow('machine', 420)) return;
                for (let i = 0; i < 7; i++) {
                    noise({ dur: 0.05, v: 0.19, f0: 1500 + i * 130, f1: 620, q: 1.6, d: i * 0.052 });
                    tone({ t: 'square', f0: 230 - i * 9, f1: 92, dur: 0.06, v: 0.10, d: i * 0.052, lp: 1400 });
                }
                tone({ t: 'sine', f0: 76, f1: 42, dur: 0.5, v: 0.22, atk: 0.01 });
            },
            // 黄油：黏稠的一声「噗叽」，尾巴往下坠
            butter() {
                if (!allow('butter', 320)) return;
                tone({ t: 'sine', f0: 340, f1: 88, dur: 0.30, v: 0.28, atk: 0.012 });
                noise({ dur: 0.26, v: 0.20, type: 'lowpass', f0: 900, f1: 260, q: 1.4 });
            },
            // 冰封：结冰的噼啪 + 玻璃嗡鸣
            freeze() {
                if (!allow('freeze', 420)) return;
                noise({ dur: 0.50, v: 0.24, type: 'highpass', f0: 2200, f1: 4000, q: 0.8 });
                [1760, 2340, 2960].forEach((f, i) =>
                    tone({ t: 'sine', f0: f, f1: f * 0.9, dur: 0.40, v: 0.09, d: i * 0.05 }));
                tone({ t: 'sine', f0: 140, f1: 60, dur: 0.50, v: 0.20 });
            },
            // 施毒：湿软的「噗」+ 一串小气泡
            poison() {
                if (!allow('poison', 280)) return;
                tone({ t: 'sine', f0: 240, f1: 78, dur: 0.22, v: 0.20 });
                for (let i = 0; i < 3; i++) {
                    tone({ t: 'sine', f0: 380 + Math.random() * 220, f1: 180, dur: 0.14, v: 0.10, d: 0.05 + i * 0.06 });
                }
                noise({ dur: 0.20, v: 0.12, type: 'lowpass', f0: 700, q: 1.6 });
            },
            // 植物长成 / 升级：上行三和弦，等级越高起音越高
            grow(step) {
                if (!allow('grow', 220)) return;
                const base = 392 * Math.pow(2, Math.min(6, Math.max(1, step || 1) - 1) / 12);
                [0, 4, 7].forEach((st, i) =>
                    tone({ t: 'triangle', f0: base * Math.pow(2, st / 12), f1: base * Math.pow(2, st / 12), dur: 0.20, v: 0.16, d: i * 0.06 }));
            },

            /* ---------- 机械龙：低频锯齿 + 金属噪声 ---------- */
            // 受伤：短促低吼，每次音高随机一点，连打像在连着挨咬
            dmg(k) {
                if (!allow('dmg', 80)) return;
                const v = 0.28 * (k == null ? 1 : k);
                growl({ f0: 148 + Math.random() * 46, f1: 70, dur: 0.28, v: v * 0.8, vib: 27, depth: 20, lp: 1100, atk: 0.008 });
                noise({ dur: 0.13, v: v * 0.32, f0: 620, q: 1.1 });
            },
            // 护甲被拆：金属断裂 + 一块大铁砸地
            armor() {
                if (!allow('armor', 380)) return;
                noise({ dur: 0.55, v: 0.32, type: 'highpass', f0: 2600, f1: 1100, q: 0.7 });
                [2450, 3100, 1780, 2690].forEach((f, i) => {
                    tone({ t: 'triangle', f0: f, f1: f * 0.55, dur: 0.34, v: 0.15, d: i * 0.045, det: -8 });
                });
                tone({ t: 'sine', f0: 92, f1: 40, dur: 0.52, v: 0.30, d: 0.03 });
            },
            // 阶段咆哮：1.5 秒长吼，双层失谐 + 颤音加深 + 气流
            roar() {
                if (!allow('roar', 900)) return;
                growl({ f0: 190, f1: 96, dur: 1.5, v: 0.38, vib: 5.5, depth: 26, depthTo: 46, lp: 1500, atk: 0.10 });
                growl({ f0: 128, f1: 58, dur: 1.5, v: 0.28, vib: 3.2, depth: 14, det: -9, lp: 720, d: 0.02, atk: 0.12 });
                noise({ dur: 1.3, v: 0.24, f0: 280, f1: 1500, q: 0.55, d: 0.06, atk: 0.35 });
            },
            // 蓄力喷吐：吸气的上扫，越近越急（炮口预警同步）
            warn() {
                if (!allow('warn', 1100)) return;
                noise({ dur: 0.95, v: 0.22, f0: 420, f1: 2600, q: 2.2, atk: 0.62 });
                tone({ t: 'sine', f0: 300, f1: 920, dur: 0.9, v: 0.11, atk: 0.55 });
            },
            // 喷吐：火柱呼啸 + 低频推力
            spray() {
                if (!allow('spray', 280)) return;
                noise({ dur: 0.85, v: 0.32, f0: 1500, f1: 380, q: 0.7, atk: 0.03 });
                noise({ dur: 0.70, v: 0.20, type: 'lowpass', f0: 700, f1: 200, q: 1.0, d: 0.02 });
                tone({ t: 'sine', f0: 72, f1: 38, dur: 0.8, v: 0.22, d: 0.01, atk: 0.04 });
            },
            // 死亡哀嚎：2.6 秒从高一路塌到 33Hz，颤音越到后面越抖（嗓子里那口气散了）
            death() {
                if (!allow('death', 600)) return;
                growl({ f0: 430, f1: 62, dur: 2.5, v: 0.40, vib: 6.5, depth: 22, depthTo: 64, lp: 1800, atk: 0.05 });
                growl({ f0: 215, f1: 33, dur: 2.6, v: 0.32, vib: 4.1, depth: 12, det: -10, lp: 820, d: 0.03, atk: 0.06 });
                noise({ dur: 1.5, v: 0.26, f0: 1400, f1: 180, q: 0.6, d: 1.15, atk: 0.3 });
                tone({ t: 'square', f0: 320, f1: 40, dur: 0.9, v: 0.12, d: 1.7, lp: 900 });
            },

            /* ---------- 后院游乐场其余 6 个玩法 ---------- */
            // 俄罗斯方块：落块闷响 / 消行上行
            lock() {
                if (!allow('lock', 45)) return;
                tone({ t: 'sine', f0: 168, f1: 96, dur: 0.09, v: 0.20 });
                noise({ dur: 0.05, v: 0.10, type: 'lowpass', f0: 900 });
            },
            line(n) {
                if (!allow('line', 120)) return;
                const base = 440 * Math.pow(2, Math.min(3, (n || 1) - 1) / 6);
                for (let i = 0; i < 4; i++) {
                    tone({ t: 'triangle', f0: base * Math.pow(2, i / 4), f1: base * Math.pow(2, i / 4), dur: 0.24, v: 0.17, d: i * 0.055 });
                }
                noise({ dur: 0.28, v: 0.13, f0: 2400, f1: 900, q: 0.9 });
            },
            // 地鼠：敲中「咚锵」/ 敲错下行
            whack() {
                if (!allow('whack', 60)) return;
                tone({ t: 'sine', f0: 260, f1: 120, dur: 0.12, v: 0.26, atk: 0.003 });
                tone({ t: 'triangle', f0: 1560, f1: 1240, dur: 0.09, v: 0.11, d: 0.01 });
                noise({ dur: 0.06, v: 0.14, f0: 1800, q: 1.4 });
            },
            miss() {
                if (!allow('miss', 120)) return;
                tone({ t: 'square', f0: 220, f1: 150, dur: 0.16, v: 0.10, lp: 1600 });
                tone({ t: 'square', f0: 160, f1: 110, dur: 0.18, v: 0.09, d: 0.09, lp: 1400 });
            },
            // 2048：合成音高随等级上升
            merge(lv) {
                if (!allow('merge', 40)) return;
                const st = Math.min(20, (lv || 1));
                const f = 330 * Math.pow(2, st / 12);
                tone({ t: 'triangle', f0: f, f1: f * 1.5, dur: 0.13, v: 0.15 });
                tone({ t: 'sine', f0: f * 2, f1: f * 3, dur: 0.10, v: 0.07, d: 0.02 });
            },
            // 打砖块：弹球撞砖 / 挡板
            brick() {
                if (!allow('brick', 40)) return;
                tone({ t: 'square', f0: 620, f1: 380, dur: 0.06, v: 0.09, lp: 2200 });
                noise({ dur: 0.05, v: 0.10, f0: 2200, q: 1.6 });
            },
            paddle() {
                if (!allow('paddle', 60)) return;
                tone({ t: 'sine', f0: 340, f1: 520, dur: 0.07, v: 0.16 });
            },
            // 推箱子：推进去 / 归位
            box(ok) {
                if (!allow('box', 70)) return;
                noise({ dur: 0.14, v: 0.13, type: 'lowpass', f0: 640, f1: 380, q: 0.9 });
                tone({ t: 'sine', f0: ok ? 300 : 150, f1: ok ? 520 : 105, dur: 0.13, v: 0.16 });
            },
            // 连连看：翻牌 / 配对成功
            flip() {
                if (!allow('flip', 50)) return;
                noise({ dur: 0.05, v: 0.10, f0: 2000, q: 1.5 });
                tone({ t: 'triangle', f0: 520, f1: 700, dur: 0.05, v: 0.10 });
            },
            match() {
                if (!allow('match', 100)) return;
                tone({ t: 'triangle', f0: 660, f1: 660, dur: 0.12, v: 0.16 });
                tone({ t: 'triangle', f0: 990, f1: 990, dur: 0.16, v: 0.13, d: 0.07 });
            },
            // 泡泡塔的三颗特殊球：炸弹=闷爆、彩虹=上行、闪电=电流
            special(kind) {
                if (!allow('special', 120)) return;
                if (kind === 'bomb') {
                    noise({ dur: 0.42, v: 0.34, type: 'lowpass', f0: 1400, f1: 220, q: 0.9 });
                    tone({ t: 'sine', f0: 150, f1: 38, dur: 0.42, v: 0.34, atk: 0.004 });
                    for (let i = 0; i < 4; i++) {
                        const f = 1600 + Math.random() * 1600;
                        tone({ t: 'triangle', f0: f, f1: f * 0.4, dur: 0.2, v: 0.09, d: 0.05 + i * 0.04 });
                    }
                } else if (kind === 'rainbow') {
                    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => {
                        tone({ t: 'sine', f0: f, f1: f, dur: 0.26, v: 0.13, d: i * 0.045 });
                    });
                } else {
                    noise({ dur: 0.30, v: 0.20, type: 'highpass', f0: 3000, f1: 1200, q: 0.8 });
                    tone({ t: 'sawtooth', f0: 1400, f1: 180, dur: 0.28, v: 0.14, lp: 3200 });
                    tone({ t: 'square', f0: 900, f1: 2600, dur: 0.12, v: 0.08, d: 0.05, lp: 3000 });
                }
            }
        };

        // 验收钩子：把一个 AnalyserNode 挂到总线上，用来量「到底有没有出声」
        // （合成音效没法截图，只能量波形；隐藏音频设备时也是真实计算出来的采样）
        S.probe = function () {
            if (!ensure()) return null;
            if (!S._an) {
                S._an = ac.createAnalyser();
                S._an.fftSize = 2048;
                out.connect(S._an);
            }
            const d = new Float32Array(S._an.fftSize);
            S._an.getFloatTimeDomainData(d);
            let sum = 0, peak = 0;
            for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); sum += d[i] * d[i]; if (v > peak) peak = v; }
            return { rms: Math.sqrt(sum / d.length), peak: peak };
        };
        S.state = function () {
            return { ok: !!ac, ctx: ac ? ac.state : 'none', gain: out ? out.gain.value : -1, muted: muted };
        };
        S.setMuted = function (m) {
            muted = !!m;
            if (!muted) ensure();
            if (out) out.gain.value = muted ? 0 : 0.8;
            return muted;
        };
        S.isMuted = function () { return muted; };
        S.unlock = function () { ensure(); };
        S.toggle = function () { return S.setMuted(!muted); };
        return S;
    })();

    /* ================= 基础绘制工具 ================= */
    let ctx = null;
    function txt(s, x, y, size, color, align, weight) {
        ctx.font = (weight || 700) + ' ' + size + 'px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillStyle = color || '#fff';
        ctx.textAlign = align || 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(s, x, y);
    }
    function rr(x, y, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
    function spr(k, x, y, w, h, alpha) {
        const im = _im[k];
        if (!im || !im.complete || !im.naturalWidth) return false;
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.drawImage(im, x, y, w, h);
        ctx.globalAlpha = 1;
        return true;
    }
    // v4.0.138：宽优先等比——玉米棒 161x76 是横条，塞进方框会小得看不见，改成撑满可用宽度
    function sprFitW(k, cx, cy, w, alpha) {
        const im = _im[k];
        if (!im || !im.complete || !im.naturalWidth) return false;
        const h = w * im.naturalHeight / im.naturalWidth;
        return spr(k, cx - w / 2, cy - h / 2, w, h, alpha);
    }
    function sprH(k, x, y, h, alpha) {           // 按高度等比
        const im = _im[k];
        if (!im || !im.complete || !im.naturalWidth) return false;
        return spr(k, x, y, h * im.naturalWidth / im.naturalHeight, h, alpha);
    }
    // 等比 contain 居中：宽扁的素材（如玉米棒 161x76）放进方格/方框不拉伸
    function sprFit(k, cx, cy, box, alpha) {
        const im = _im[k];
        if (!im || !im.complete || !im.naturalWidth) return false;
        const r = im.naturalWidth / im.naturalHeight;
        let w = box, h = box;
        if (r > 1) h = box / r; else w = box * r;
        return spr(k, cx - w / 2, cy - h / 2, w, h, alpha);
    }
    function bgGrass() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#2f5a20'); g.addColorStop(0.45, '#3f6f26'); g.addColorStop(1, '#274a19');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.globalAlpha = 0.10; ctx.strokeStyle = '#c9ee8f'; ctx.lineWidth = 1;
        for (let y = 90; y < H; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.restore();
    }
    function panel(x, y, w, h, a) {
        ctx.save();
        ctx.fillStyle = 'rgba(10,22,8,' + (a == null ? 0.55 : a) + ')';
        rr(x, y, w, h, 16); ctx.fill();
        ctx.strokeStyle = 'rgba(190,225,140,0.28)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    }

    let GAME_SCALE = 1;

    /* ================= 基类 ================= */
    class Base {
        constructor() { this.over = false; this.win = false; this.overT = 0; this.t = 0; this.score = 0; }
        reset() { this.over = false; this.win = false; this.overT = 0; this.t = 0; this.score = 0; this.setup(); }
        setup() {}
        update(dt) { }
        draw() { }
        onKey(down, k, e) { }
        onDown(x, y) { }
        onMove(x, y) { }
        onUp() { }
        end(win) {
            if (this.over) return;
            this.over = true; this.win = !!win; this.overT = 0;
            if (win) SFX.win(); else SFX.fail();   // v4.0.156：通关/失败音（各玩法不必各写一遍）
        }
        overlay(title, sub, color) {
            ctx.fillStyle = 'rgba(6,14,5,0.74)'; ctx.fillRect(0, 0, W, H);
            txt(title, W / 2, H / 2 - 34, 46, color || '#ffe066', 'center', 900);
            if (sub) txt(sub, W / 2, H / 2 + 22, 21, '#e8f5cf', 'center', 600);
            txt('点击任意处 · 或按 R 重开', W / 2, H / 2 + 76, 17, 'rgba(255,255,255,0.72)', 'center', 600);
        }
    }

    /* ================================================================
     * 1. 玉米方块（俄罗斯方块）
     * ============================================================== */
    const TET_SHAPES = {
        I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        O: [[1, 1], [1, 1]],
        T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
        J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
        S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
    };
    const TET_SKIN = {
        I: { p: 'peashooter', c: '#8ecb3a', n: '豌豆' },
        O: { p: 'wallnut', c: '#c79a58', n: '坚果' },
        T: { p: 'pot', c: '#c2703c', n: '花盆' },
        L: { p: 'lilypad', c: '#4fa77c', n: '睡莲' },
        J: { p: 'spikeweed', c: '#8d9440', n: '地刺' },
        S: { p: 'cherry', c: '#cf4130', n: '樱桃' },
        Z: { p: 'cob', c: '#e0b83c', n: '玉米' }      // v4.0.138：换成 161x76 的玉米棒，比 96px 投石车清楚
    };
    class Tetris extends Base {
        setup() {
            // v4.0.138：棋盘撑大（280x504 → 320x544），侧栏字号整体收小，主视觉交给棋盘
            this.CO = 10; this.RO = 17; this.CELL = 32;
            this.bx = 116; this.by = 30;
            this.board = Array.from({ length: this.RO }, () => new Array(this.CO).fill(null));
            this.bag = []; this.cur = null; this.next = this.pick();
            this.dropT = 0; this.dropIv = 620; this.lines = 0; this.score = 0; this.clearing = 0;
            this.survT = 0;        // 存活秒数（时间积分来源）
            this.boostT = 0;       // 加速窗口剩余秒数（期间时间积分翻倍）
            this.timeScore = 0;    // 光是"活下来"赚到的分，和消行分分开显示
            this.spawn();
        }
        pick() {
            if (!this.bag.length) {
                this.bag = Object.keys(TET_SHAPES).slice();
                for (let i = this.bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = this.bag[i]; this.bag[i] = this.bag[j]; this.bag[j] = t; }
            }
            return this.bag.pop();
        }
        spawn() {
            const k = this.next; this.next = this.pick();
            const m = TET_SHAPES[k].map(r => r.slice());
            this.cur = { k, m, x: 3, y: k === 'I' ? -1 : 0 };
            if (this.hit(this.cur.m, this.cur.x, this.cur.y)) this.end(false);
        }
        hit(m, px, py) {
            for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
                if (!m[r][c]) continue;
                const x = px + c, y = py + r;
                if (x < 0 || x >= this.CO || y >= this.RO) return true;
                if (y >= 0 && this.board[y][x]) return true;
            }
            return false;
        }
        rotate(m) {
            const n = m.length, out = Array.from({ length: n }, () => new Array(n).fill(0));
            for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[c][n - 1 - r] = m[r][c];
            return out;
        }
        tryMove(dx, dy) {
            if (!this.cur || this.over) return false;
            if (!this.hit(this.cur.m, this.cur.x + dx, this.cur.y + dy)) { this.cur.x += dx; this.cur.y += dy; return true; }
            return false;
        }
        lock() {
            const { m, x, y, k } = this.cur;
            for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
                if (m[r][c] && y + r >= 0) this.board[y + r][x + c] = k;
            }
            let n = 0;
            for (let r = this.RO - 1; r >= 0; r--) {
                if (this.board[r].every(v => v)) { this.board.splice(r, 1); this.board.unshift(new Array(this.CO).fill(null)); n++; r++; }
            }
            SFX.lock();                             // v4.0.156：落块
            if (n) {
                SFX.line(n);                        // 消行：一次消得越多，音阶起点越高
                this.score += [0, 100, 300, 600, 1000][n];
                this.lines += n;
                this.dropIv = Math.max(150, 620 - Math.floor(this.lines / 10) * 55);
            }
            this.spawn();
        }
        update(dt) {
            if (this.over) return;
            // v4.0.138：积分不只看消行——活着的每一秒都在涨；处于加速状态时按双倍结算
            this.survT += dt;
            const rate = this.boostT > 0 ? 6 : 3;        // 基础 3 分/秒（180/分），加速 6 分/秒（360/分）
            if (this.boostT > 0) this.boostT -= dt;      // 先判档再倒计时，否则第一帧永远拿不到 2 倍
            const gain = dt * rate;
            this.timeScore += gain;
            this.score += gain;
            this.dropT += dt * 1000;
            if (this.dropT >= this.dropIv) {
                this.dropT = 0;
                if (!this.tryMove(0, 1)) this.lock();
            }
        }
        onKey(down, k) {
            if (!down || this.over) return;
            if (k === 'left') this.tryMove(-1, 0);
            else if (k === 'right') this.tryMove(1, 0);
            else if (k === 'down') { this.boostT = Math.max(this.boostT, 0.5); if (this.tryMove(0, 1)) this.score += 1; }
            else if (k === 'up') {
                const m = this.rotate(this.cur.m);
                for (const dx of [0, -1, 1, -2, 2]) if (!this.hit(m, this.cur.x + dx, this.cur.y)) { this.cur.m = m; this.cur.x += dx; break; }
            } else if (k === 'space') {
                let g = 0; while (this.tryMove(0, 1)) g++;
                this.boostT = Math.max(this.boostT, 1.2);   // 硬降后 1.2 秒按加速结算
                this.score += g * 2; this.lock();
            }
        }
        draw() {
            bgGrass();
            const { CELL, CO, RO, bx, by } = this;
            panel(bx - 12, by - 12, CO * CELL + 24, RO * CELL + 24, 0.62);
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
            for (let c = 1; c < CO; c++) { ctx.beginPath(); ctx.moveTo(bx + c * CELL, by); ctx.lineTo(bx + c * CELL, by + RO * CELL); ctx.stroke(); }
            for (let r = 1; r < RO; r++) { ctx.beginPath(); ctx.moveTo(bx, by + r * CELL); ctx.lineTo(bx + CO * CELL, by + r * CELL); ctx.stroke(); }
            ctx.restore();
            // v4.0.138：玉米块改成自绘——161x76 的玉米棒缩到 12px 高必然糊，
            // 自绘圆角底 + 玉米粒阵在任何尺寸都是锐的
            const cornCell = (x, y, a) => {
                ctx.globalAlpha = a == null ? 1 : a;
                const g0 = ctx.createLinearGradient(0, y, 0, y + CELL);
                g0.addColorStop(0, '#f5d75a'); g0.addColorStop(1, '#d3a520');
                ctx.fillStyle = g0; rr(x + 1, y + 1, CELL - 2, CELL - 2, 7); ctx.fill();
                ctx.strokeStyle = 'rgba(120,80,10,0.55)'; ctx.lineWidth = 1.5;
                rr(x + 1.5, y + 1.5, CELL - 3, CELL - 3, 7); ctx.stroke();
                // 玉米粒：3x3 圆点，留边
                const pad = CELL * 0.20, step = (CELL - pad * 2) / 2.6;
                ctx.fillStyle = 'rgba(255,246,180,0.95)';
                for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
                    const cx = x + pad + c * step, cy = y + pad + r * step;
                    ctx.beginPath(); ctx.ellipse(cx, cy, CELL * 0.088, CELL * 0.076, 0, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = 'rgba(120,80,10,0.18)';
                for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
                    const cx = x + pad + c * step, cy = y + pad + r * step;
                    ctx.beginPath(); ctx.ellipse(cx, cy + CELL * 0.072, CELL * 0.082, CELL * 0.028, 0, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            };
            const cell = (k, x, y, a) => {
                if (k === 'Z') { cornCell(x, y, a); return; }
                const s = TET_SKIN[k];
                ctx.globalAlpha = a == null ? 1 : a;
                ctx.fillStyle = s.c; rr(x + 1, y + 1, CELL - 2, CELL - 2, 7); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.20)'; rr(x + 3, y + 3, CELL - 6, 8, 4); ctx.fill();
                ctx.globalAlpha = 1;
                const ca = a == null ? 1 : a;
                spr(s.p, x + 5, y + 5, CELL - 10, CELL - 10, ca);
            };
            for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) {
                if (this.board[r][c]) cell(this.board[r][c], bx + c * CELL, by + r * CELL);
            }
            if (this.cur && !this.over) {
                let gy = this.cur.y; while (!this.hit(this.cur.m, this.cur.x, gy + 1)) gy++;
                for (let r = 0; r < this.cur.m.length; r++) for (let c = 0; c < this.cur.m[r].length; c++) {
                    if (!this.cur.m[r][c]) continue;
                    if (gy !== this.cur.y) cell(this.cur.k, bx + (this.cur.x + c) * CELL, by + (gy + r) * CELL, 0.13);
                }
                for (let r = 0; r < this.cur.m.length; r++) for (let c = 0; c < this.cur.m[r].length; c++) {
                    if (!this.cur.m[r][c]) continue;
                    if (this.cur.y + r >= 0) cell(this.cur.k, bx + (this.cur.x + c) * CELL, by + (this.cur.y + r) * CELL);
                }
            }
            // 右侧 HUD（v4.0.138：数字整体收小，把版面让给棋盘）
            const hx = 500;
            txt('玉米方块', hx, 66, 27, '#ffe9a8', 'left', 900);
            txt('CORN BLOCKS', hx, 92, 11.5, 'rgba(255,255,255,0.5)', 'left', 700);

            panel(hx - 10, 112, 372, 76, 0.5);
            txt('分数', hx, 132, 13, 'rgba(255,255,255,0.62)');
            txt(String(Math.floor(this.score)), hx, 162, 26, '#ffe066', 'left', 900);
            txt('消行', hx + 200, 132, 13, 'rgba(255,255,255,0.62)');
            txt(String(this.lines), hx + 200, 162, 26, '#9fe060', 'left', 900);

            // 时间 / 加速：这两栏解释"分是怎么涨上来的"
            panel(hx - 10, 198, 372, 62, 0.45);
            txt('存活', hx, 218, 12.5, 'rgba(255,255,255,0.6)');
            txt(this.survT.toFixed(0) + 's', hx + 40, 218, 17, '#cfe8b0', 'left', 800);
            txt('时间分', hx + 120, 218, 12.5, 'rgba(255,255,255,0.6)');
            txt('+' + Math.floor(this.timeScore), hx + 178, 218, 17, '#cfe8b0', 'left', 800);
            const boosting = this.boostT > 0;
            txt(boosting ? '加速中 ×2 积分' : '软降/直落触发加速', hx, 246, 13,
                boosting ? '#ffe066' : 'rgba(255,255,255,0.45)', 'left', boosting ? 900 : 600);

            panel(hx - 10, 270, 372, 106, 0.5);
            txt('下一个', hx, 292, 13, 'rgba(255,255,255,0.6)');
            txt(TET_SKIN[this.next].n, hx, 314, 15, '#dfe9c4');
            const nm = TET_SHAPES[this.next];
            const ns = TET_SKIN[this.next];
            const ncell = 24;
            for (let r = 0; r < nm.length; r++) for (let c = 0; c < nm[r].length; c++) {
                if (!nm[r][c]) continue;
                const x = hx + 210 + c * ncell, y = 300 + r * ncell;
                if (this.next === 'Z') {
                    const g2 = ctx.createLinearGradient(0, y, 0, y + ncell);
                    g2.addColorStop(0, '#f5d75a'); g2.addColorStop(1, '#d3a520');
                    ctx.fillStyle = g2; rr(x, y, ncell - 2, ncell - 2, 5); ctx.fill();
                    ctx.fillStyle = 'rgba(255,246,180,0.95)';
                    for (let i = 0; i < 4; i++) {
                        ctx.beginPath(); ctx.arc(x + 5 + (i % 2) * 8, y + 6 + Math.floor(i / 2) * 8, 2.2, 0, Math.PI * 2); ctx.fill();
                    }
                } else {
                    ctx.fillStyle = ns.c; rr(x, y, ncell - 2, ncell - 2, 5); ctx.fill();
                    spr(ns.p, x + 2, y + 2, ncell - 6, ncell - 6);
                }
            }

            panel(hx - 10, 386, 372, 108, 0.45);
            txt('← → 移动　↑ 旋转', hx, 410, 14, '#dff0c4');
            txt('↓ 软降　空格 直落', hx, 436, 14, '#dff0c4');
            txt('活越久分越高 · 加速双倍', hx, 462, 13, 'rgba(255,255,255,0.55)');
            txt('ESC 回大厅', hx, 482, 12.5, 'rgba(255,255,255,0.4)');
            if (this.over) this.overlay('被啃穿了！', '分数 ' + Math.floor(this.score) + ' · 消行 ' + this.lines + ' · 存活 ' + this.survT.toFixed(0) + 's', '#ff8f6b');
        }
    }

    /* ================================================================
     * 2. 僵尸地鼠（打地鼠）
     * ============================================================== */
    class Whack extends Base {
        setup() {
            this.holes = [];
            const cx = [300, 450, 600], cy = [215, 335, 455];
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
                this.holes.push({ x: cx[c], y: cy[r], st: 'idle', t: 0, type: 'normal', hits: 1, up: 0 });
            }
            this.time = 60; this.spawnT = 0.35; this.combo = 0; this.hits = 0; this.miss = 0;
            this.floats = [];
        }
        spawnOne() {
            const free = this.holes.filter(h => h.st === 'idle');
            if (!free.length) return;
            const h = free[(Math.random() * free.length) | 0];
            const roll = Math.random();
            let type = 'normal', hits = 1, val = 10;
            if (roll < 0.16) { type = 'cone'; val = 20; }
            else if (roll < 0.27) { type = 'bucket'; hits = 3; val = 45; }
            else if (roll < 0.37) { type = 'sun'; val = -15; }
            h.st = 'up'; h.type = type; h.hits = hits; h.maxHits = hits; h.val = val;
            h.t = type === 'bucket' ? 1.7 : (type === 'sun' ? 1.1 : 0.95);
            h.up = 0;
        }
        update(dt) {
            if (this.over) return;
            this.time -= dt;
            if (this.time <= 0) { this.time = 0; this.end(this.score > 0); return; }
            const prog = 1 - this.time / 60;
            this.spawnT -= dt;
            if (this.spawnT <= 0) {
                this.spawnOne();
                this.spawnT = Math.max(0.34, 0.95 - prog * 0.55) * (0.7 + Math.random() * 0.6);
                if (Math.random() < 0.22 + prog * 0.25) this.spawnOne();
            }
            for (const h of this.holes) {
                if (h.st === 'up' || h.st === 'hit') {
                    h.up = Math.min(1, h.up + dt * 7);
                    h.t -= dt;
                    if (h.t <= 0) { h.st = 'idle'; h.up = 0; if (h.type !== 'sun') this.miss++; }
                }
            }
            this.floats = this.floats.filter(f => (f.t -= dt) > 0);
        }
        onDown(x, y) {
            if (this.over) return;
            for (const h of this.holes) {
                if (h.st !== 'up') continue;
                const top = this.riseTop(h);
                if (Math.abs(x - h.x) > 78 || y < top || y > h.y - 20) continue;
                if (h.type === 'sun') {
                    SFX.miss();                     // v4.0.156：敲错植物
                    this.score = Math.max(0, this.score - 15); this.combo = 0;
                    this.floats.push({ x: h.x, y: top + 20, s: '-15 打错植物', t: 0.9, c: '#ff8f6b' });
                    h.st = 'idle'; h.up = 0;
                } else {
                    h.hits--;
                    if (h.hits > 0) {
                        SFX.whack();                // 铁桶弹开
                        this.floats.push({ x: h.x, y: top + 10, s: '铛！', t: 0.5, c: '#ffe066' });
                        h.t = Math.max(h.t, 0.7);
                    } else {
                        this.combo++; this.hits++;
                        SFX.whack();
                        if (this.combo >= 3) SFX.combo(this.combo);
                        const gain = h.val * (1 + Math.min(4, this.combo - 1) * 0.25);
                        this.score += Math.round(gain);
                        this.floats.push({ x: h.x, y: top + 6, s: '+' + Math.round(gain), t: 0.8, c: '#b7f06a' });
                        h.st = 'idle'; h.up = 0;
                    }
                }
                return;
            }
            this.combo = 0;
        }
        riseTop(h) {
            const hh = h.type === 'sun' ? 74 : 86;
            return (h.y - 34) - hh * (0.3 + 0.7 * h.up);
        }
        draw() {
            bgGrass();
            // 顶部计时条
            const t = Math.max(0, this.time) / 60;
            ctx.fillStyle = 'rgba(0,0,0,0.42)'; rr(60, 62, 780, 16, 8); ctx.fill();
            const g = ctx.createLinearGradient(60, 0, 840, 0);
            g.addColorStop(0, '#ff6b4a'); g.addColorStop(1, '#ffd24a');
            ctx.fillStyle = t < 0.25 ? '#ff5a3c' : g; rr(60, 62, Math.max(6, 780 * t), 16, 8); ctx.fill();
            txt('剩余 ' + Math.ceil(this.time) + 's', 450, 96, 16, '#ffe9a8', 'center', 700);
            txt('分数 ' + this.score, 120, 96, 18, '#fff', 'center', 700);
            txt('敲 ' + this.hits + ' · 漏 ' + this.miss, 780, 96, 16, 'rgba(255,255,255,0.7)', 'center', 700);

            for (const h of this.holes) {
                // 阴影
                ctx.fillStyle = 'rgba(0,0,0,0.28)';
                ctx.beginPath(); ctx.ellipse(h.x, h.y + 12, 78, 18, 0, 0, Math.PI * 2); ctx.fill();
                if (h.st === 'up') {
                    const key = h.type === 'cone' ? 'cone' : h.type === 'bucket' ? 'bucket' : h.type === 'sun' ? 'sunflower' : 'zombie';
                    const hh = h.type === 'sun' ? 74 : 86;
                    const im = _im[key];
                    const w = im && im.naturalWidth ? hh * im.naturalWidth / im.naturalHeight : hh * 0.82;
                    const baseY = h.y - 34;
                    ctx.save();
                    ctx.beginPath(); ctx.rect(h.x - 92, baseY - 210, 184, 210); ctx.clip();
                    spr(key, h.x - w / 2, this.riseTop(h), w, hh);
                    ctx.restore();
                }
                // 墓碑
                const gw = 132, gh = 84, gx = h.x - gw / 2, gy = h.y - 54;
                ctx.fillStyle = '#5e5f52'; rr(gx, gy, gw, gh, 16); ctx.fill();
                ctx.fillStyle = '#767869'; rr(gx + 5, gy + 5, gw - 10, gh - 14, 12); ctx.fill();
                ctx.fillStyle = 'rgba(30,32,24,0.5)';
                txt('R.I.P', h.x, gy + 34, 20, 'rgba(30,32,24,0.55)', 'center', 900);
                ctx.fillStyle = '#3a3120';
                ctx.beginPath(); ctx.ellipse(h.x, gy + gh - 6, gw / 2 + 9, 13, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(116,150,68,0.45)';
                ctx.beginPath(); ctx.ellipse(h.x, gy + gh - 2, gw / 2 + 16, 9, 0, 0, Math.PI * 2); ctx.fill();
            }
            for (const f of this.floats) {
                ctx.globalAlpha = Math.min(1, f.t * 2.2);
                txt(f.s, f.x, f.y - (0.9 - f.t) * 46, 22, f.c, 'center', 900);
                ctx.globalAlpha = 1;
            }
            if (this.over) this.overlay('时间到！', '分数 ' + this.score + ' · 敲中 ' + this.hits + ' · 漏 ' + this.miss, '#ffe066');
        }
    }

    /* ================================================================
     * 3. 花园 2048
     * ============================================================== */
    const G2048 = [
        null,
        { p: 'peashooter', n: '豌豆', c: '#8fc93a' },
        { p: 'repeater', n: '双发', c: '#74b52c' },
        { p: 'threepeater', n: '三线', c: '#5da227' },
        { p: 'gatling', n: '机枪', c: '#4a8c22' },
        { p: 'melon', n: '西瓜', c: '#3a7a44' },
        { p: 'wintermelon', n: '冰西瓜', c: '#2f6f9c' },
        { p: 'cobcannon', n: '玉米炮', c: '#b8872c' },
        { p: 'doom', n: '毁灭菇', c: '#6a4090' }     // v4.0.138：目标抬到第 8 级，通关难度翻倍
    ];
    const G2048_MAX = 8;
    class Garden2048 extends Base {
        setup() {
            this.N = 4; this.CELL = 104; this.GAP = 12;
            this.bx = 96; this.by = 118;
            this.g = Array.from({ length: 4 }, () => new Array(4).fill(0));
            this.pop = {};
            this.won = false; this.winBanner = 0;   // v4.0.138：通关只提示一次，之后继续玩
            this.add(); this.add();
            this.best = this.best || 0;
        }
        add() {
            const empty = [];
            for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!this.g[r][c]) empty.push([r, c]);
            if (!empty.length) return;
            const [r, c] = empty[(Math.random() * empty.length) | 0];
            this.g[r][c] = Math.random() < 0.88 ? 1 : 2;
            this.pop[r + ',' + c] = 0.18;
        }
        slide(dir) {
            if (this.over) return;
            const before = JSON.stringify(this.g);
            const N = 4;
            const line = (arr) => {
                let a = arr.filter(v => v);
                for (let i = 0; i < a.length - 1; i++) {
                    if (a[i] === a[i + 1] && a[i] < G2048_MAX) {
                        a[i]++; this.score += Math.pow(2, a[i]) * 2;
                        SFX.merge(a[i]);            // v4.0.156：合成音高随等级往上爬
                        a.splice(i + 1, 1);
                    }
                }
                while (a.length < N) a.push(0);
                return a;
            };
            if (dir === 'left' || dir === 'right') {
                for (let r = 0; r < 4; r++) {
                    let row = this.g[r].slice();
                    if (dir === 'right') row.reverse();
                    row = line(row);
                    if (dir === 'right') row.reverse();
                    this.g[r] = row;
                }
            } else {
                for (let c = 0; c < 4; c++) {
                    let col = [0, 1, 2, 3].map(r => this.g[r][c]);
                    if (dir === 'down') col.reverse();
                    col = line(col);
                    if (dir === 'down') col.reverse();
                    for (let r = 0; r < 4; r++) this.g[r][c] = col[r];
                }
            }
            if (JSON.stringify(this.g) !== before) {
                this.add();
                this.extra = (this.extra || 0) + (Math.random() < 0.3 ? 1 : 0);
                if (this.extra >= 3) { this.extra = 0; this.add(); }
                this.checkEnd();
            }
        }
        checkEnd() {
            // v4.0.138：通关只弹一次横幅，不锁操作；之后继续玩，塞满照样判负。
            // 原实现 win 时直接 over=true，玩家一按键又把 win 清掉，导致此后永远卡在通关分支、输了没界面。
            let max = 0;
            for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) max = Math.max(max, this.g[r][c]);
            if (max >= G2048_MAX && !this.won) { this.won = true; this.winBanner = 3.2; }
            let can = false;
            for (let r = 0; r < 4 && !can; r++) for (let c = 0; c < 4; c++) {
                if (!this.g[r][c]) { can = true; break; }
                if (c < 3 && this.g[r][c] === this.g[r][c + 1]) { can = true; break; }
                if (r < 3 && this.g[r][c] === this.g[r + 1][c]) { can = true; break; }
            }
            if (!can) this.end(false);
        }
        update(dt) {
            for (const k in this.pop) { this.pop[k] -= dt; if (this.pop[k] <= 0) delete this.pop[k]; }
            if (this.winBanner > 0) this.winBanner -= dt;
        }
        onKey(down, k) {
            if (!down) return;
            if (this.over) return;
            if (k === 'left' || k === 'a') this.slide('left');
            else if (k === 'right' || k === 'd') this.slide('right');
            else if (k === 'up' || k === 'w') this.slide('up');
            else if (k === 'down' || k === 's') this.slide('down');
        }
        draw() {
            bgGrass();
            const { CELL, GAP } = this;
            panel(this.bx - 16, this.by - 16, 4 * CELL + 3 * GAP + 32, 4 * CELL + 3 * GAP + 32, 0.55);
            for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
                const x = this.bx + c * (CELL + GAP), y = this.by + r * (CELL + GAP);
                ctx.fillStyle = 'rgba(255,255,255,0.07)'; rr(x, y, CELL, CELL, 12); ctx.fill();
                const v = this.g[r][c];
                if (!v) continue;
                const d = G2048[v];
                const p = this.pop[r + ',' + c] || 0;
                const sc = 1 + Math.max(0, p) * 1.6;
                ctx.save();
                ctx.translate(x + CELL / 2, y + CELL / 2); ctx.scale(sc, sc); ctx.translate(-(x + CELL / 2), -(y + CELL / 2));
                ctx.fillStyle = d.c; rr(x, y, CELL, CELL, 12); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(x + 6, y + 6, CELL - 12, 16, 6); ctx.fill();
                spr(d.p, x + 18, y + 8, CELL - 36, CELL - 36);
                txt(d.n, x + CELL / 2, y + CELL - 15, 14, 'rgba(255,255,255,0.95)', 'center', 700);
                ctx.restore();
            }
            const hx = 600;
            txt('花园 2048', hx, 132, 30, '#ffe9a8', 'left', 900);
            txt('GARDEN 2048', hx, 162, 12, 'rgba(255,255,255,0.5)', 'left', 700);
            panel(hx - 10, 186, 250, 96, 0.5);
            txt('分数', hx, 210, 14, 'rgba(255,255,255,0.65)');
            txt(String(this.score), hx, 246, 34, '#ffe066', 'left', 900);
            panel(hx - 10, 296, 250, 240, 0.45);
            txt('合成路线', hx, 318, 14, 'rgba(255,255,255,0.65)');
            for (let i = 1; i <= G2048_MAX; i++) {
                const d = G2048[i];
                const row = i <= 4 ? 0 : 1;
                const col = row === 0 ? i - 1 : i - 5;
                const gx2 = hx + 4 + col * 58, gy2 = 334 + row * 52;
                // 深色的毁灭菇贴在深绿背景上几乎看不见 → 垫一层浅底
                ctx.fillStyle = 'rgba(255,255,255,0.10)';
                rr(gx2 - 3, gy2 - 3, 32, 32, 8); ctx.fill();
                sprH(d.p, gx2, gy2, 26);
                txt(d.n, gx2 + 13, gy2 + 36, 10.5, 'rgba(255,255,255,0.55)', 'center', 600);
                if (col < 3) txt('›', gx2 + 40, gy2 + 13, 12, 'rgba(255,255,255,0.28)', 'center');
            }
            txt('方向键 / WASD 滑动', hx, 448, 14, '#dff0c4');
            txt('合出「毁灭菇」即通关', hx, 474, 14, '#dff0c4');
            txt('同种相邻会融合升级', hx, 500, 13, 'rgba(255,255,255,0.55)');
            txt('通关后可以继续冲分', hx, 522, 12.5, 'rgba(255,255,255,0.42)');
            // 通关横幅（不锁操作，只提示一次）
            if (this.winBanner > 0) {
                const a = Math.min(1, this.winBanner / 0.6);
                ctx.save(); ctx.globalAlpha = a;
                ctx.fillStyle = 'rgba(20,50,10,0.86)';
                rr(this.bx - 6, this.by - 62, 4 * CELL + 3 * GAP + 12, 46, 12); ctx.fill();
                txt('🌱 通关！毁灭菇到手 —— 还能继续冲分', this.bx + (4 * CELL + 3 * GAP) / 2, this.by - 39, 17, '#b7f06a', 'center', 900);
                ctx.restore();
            }
            if (this.over) {
                this.overlay('花园塞满了', '分数 ' + Math.floor(this.score) + (this.won ? ' · 已通关' : ''), '#ff8f6b');
            }
        }
    }

    /* ================================================================
     * 4. 泡泡牧场（v4.0.157 顶替「猫尾草泡泡龙」）—— 三消的球掉进花盆养作物
     * ============================================================== */
    const BUB_COLORS = [
        { c: '#5fbf35', p: 'peashooter', n: '豌豆' },
        { c: '#4aa8e0', p: 'snowpea', n: '寒冰' },
        { c: '#9b6ad6', p: 'puffshroom', n: '小喷菇' },
        { c: '#e8c53a', p: 'kernel', n: '玉米' },
        { c: '#d94a3d', p: 'cherry', n: '樱桃' }   // v4.0.152：泡泡塔第 5 层起启用第 5 色
    ];

    const _bubMix = (hex, mix, t) => {
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        const mr = (mix >> 16) & 255, mg = (mix >> 8) & 255, mb = mix & 255;
        return 'rgb(' + Math.round(r + (mr - r) * t) + ',' +
                       Math.round(g + (mg - g) * t) + ',' +
                       Math.round(b + (mb - b) * t) + ')';
    };

    // 给 _bubMix 出来的 'rgb(r,g,b)' 挂透明度（透射光要用）
    const _bubRGBA = (rgb, a) => rgb.replace('rgb(', 'rgba(').replace(')', ',' + a + ')');

    /* v4.0.155（用户：泡泡太丑了，就是一个球球）——
       旧版是「白色核心 + 纯色平涂 + 深色边 + 一圈白描边」，四个色阶挤在球心，
       没有明暗结构，所以读起来是一颗塑料球 / 玻璃弹珠。
       现在按「水晶球」的三件事重画：
         ① 一条完整的明暗链 —— 光源在左上（亮白）→ 本色 → 右下（压暗）→ 边缘最暗；
            球的体积感全在这条链上，不在描边。
         ② 光分两层 —— 斜椭圆的大高光 + 肩上一粒硬亮点，而不是正中的一个圆点。
         ③ 底部的光是「一片晕」不是「一条弧」—— 弧线会被读成球底咧了张嘴。
       另外植物缩进球心 0.96R 居中当「标本」，旧版铺满整颗像贴纸。
       三块场地 + 经典泡泡龙共用这一份，免得以后又分叉。 */
    function paintBub(x, y, col, a, R) {
        const c = BUB_COLORS[col] || BUB_COLORS[0];
        const al = a == null ? 1 : a;
        ctx.globalAlpha = al;

        // ① 球体照明
        const g = ctx.createRadialGradient(
            x - R * 0.30, y - R * 0.34, R * 0.04,
            x + R * 0.06, y + R * 0.12, R * 1.02
        );
        g.addColorStop(0, 'rgba(255,255,255,0.92)');
        g.addColorStop(0.13, _bubMix(c.c, 0xffffff, 0.46));
        g.addColorStop(0.42, c.c);
        g.addColorStop(0.76, _bubMix(c.c, 0x000000, 0.20));
        g.addColorStop(1, _bubMix(c.c, 0x000000, 0.44));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();

        // ② 球心的植物（隔着球壁看，不盖住高光）
        spr(c.p, x - R * 0.48, y - R * 0.48, R * 0.96, R * 0.96, 0.80);
        ctx.globalAlpha = al;   // spr 会把 alpha 复位成 1，这里还回来

        // ③ 透射光：光穿过泡壁在球体下方积成一片亮雾，颜色比本色更浅更艳。
        //    这一层是「玻璃/果冻」和「实心塑料」的分界 —— 没有它，球再亮也是块塑料。
        const tg = ctx.createRadialGradient(x - R * 0.02, y + R * 0.50, 0, x - R * 0.02, y + R * 0.50, R * 0.62);
        tg.addColorStop(0, _bubRGBA(_bubMix(c.c, 0xffffff, 0.55), 0.40));
        tg.addColorStop(0.55, _bubRGBA(_bubMix(c.c, 0xffffff, 0.25), 0.16));
        tg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();

        // ④ 外缘亮边（泡壁对着光的那一圈，细，不能抢戏）
        const lw = Math.max(1, R * 0.062);
        ctx.strokeStyle = 'rgba(255,255,255,0.46)';
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(x, y, R - lw * 0.5 - 0.3, 0, Math.PI * 2); ctx.stroke();

        // ⑤ 主高光：斜椭圆（圆形高光会像塑料）
        ctx.save();
        ctx.translate(x - R * 0.33, y - R * 0.40);
        ctx.rotate(-0.60);
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.beginPath(); ctx.ellipse(0, 0, R * 0.27, R * 0.135, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // ⑥ 高光肩上的一粒硬点
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath(); ctx.arc(x - R * 0.46, y - R * 0.46, Math.max(1, R * 0.075), 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = 1;
    }

    /* ================================================================
     * 泡泡场地内核（v4.0.152）—— 机械龙攻城 / 泡泡对轰 / 泡泡塔 共用
     * 一块六边形网格 + 一个炮台 + 反弹球 + 三消 + 悬空掉落
     * 单块场地自成一个对象，所以「泡泡对轰」能在同一帧里跑两块。
     * ============================================================== */
    const TOMB = 99;          // 墓碑块：不能同色消除，只能被贴着的爆破带走
    class BubLane {
        constructor(o) {
            this.R = o.R; this.COLS = o.COLS; this.LEFT = o.LEFT; this.TOP = o.TOP;
            this.ROWH = o.ROWH || o.R * Math.sqrt(3);
            this.rows = o.rows; this.nColors = o.nColors || 4;
            this.sx = o.sx; this.sy = o.sy; this.deadline = o.deadline;
            this.ceilRows = o.ceilRows || 1;      // 顶上几行算「贴在天花板上」
            this.missPush = o.missPush === true;
            this.missLimit = o.missLimit || 8;
            this.noClear = o.noClear === true;    // true = 清空不算通关（机械龙模式靠血量定胜负）
            this.sfxK = o.sfxK == null ? 1 : o.sfxK;   // v4.0.156：音效音量系数（对轰里 AI 那侧调低）
            this.showAim = true;
            this.reset(o.fillRows == null ? 4 : o.fillRows, o.gapEvery || 3);
        }
        reset(fillRows, gapEvery) {
            this.g = Array.from({ length: this.rows }, () => new Array(this.COLS).fill(-1));
            for (let r = 0; r < fillRows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                if (r === fillRows - 1 && c % gapEvery === 0) continue;
                this.g[r][c] = (Math.random() * this.nColors) | 0;
            }
            this.shooter = { ang: -Math.PI / 2 };
            this.ball = null;
            this.cur = (Math.random() * this.nColors) | 0;
            this.next = (Math.random() * this.nColors) | 0;
            this.curSp = null; this.nextSp = null;
            this.pops = []; this.drops = [];
            this.score = 0; this.dead = false; this.cleared = false;
            this.combo = 0; this.missStreak = 0;
        }
        get wallL() { return this.LEFT + this.R; }
        get wallR() { return this.LEFT + this.COLS * this.R * 2 - this.R; }
        colsIn(r) { return r % 2 ? this.COLS - 1 : this.COLS; }
        cx(r, c) { return this.LEFT + this.R + c * this.R * 2 + (r % 2 ? this.R : 0); }
        yOf(r) { return this.TOP + r * this.ROWH + this.R; }
        inB(r, c) { return r >= 0 && r < this.rows && c >= 0 && c < this.colsIn(r); }
        neighbors(r, c) {
            const odd = r % 2 === 1;
            return odd
                ? [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]]
                : [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]];
        }
        count() {
            let n = 0;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) if (this.g[r][c] >= 0) n++;
            return n;
        }
        lowest() {
            for (let r = this.rows - 1; r >= 0; r--) if (this.g[r].some(v => v >= 0)) return r;
            return -1;
        }
        /* ---------- 瞄准 ---------- */
        aimLimit() {
            let th = 0;
            for (let r = 0; r <= this.rows - 2; r++) {
                const dy = this.sy - this.yOf(r);
                if (dy <= 0) continue;
                const dl = Math.abs(this.cx(r, 0) - this.sx);
                const dr = Math.abs(this.cx(r, this.colsIn(r) - 1) - this.sx);
                th = Math.max(th, Math.atan2(Math.max(dl, dr), dy));
            }
            return Math.min(th + 0.02, 1.45);
        }
        aimAt(x, y) {
            const th = this.aimLimit(), mid = -Math.PI / 2;
            let d = Math.atan2(y - this.sy, x - this.sx) - mid;
            d = Math.atan2(Math.sin(d), Math.cos(d));
            if (d > Math.PI / 2) d = Math.PI / 2;
            if (d < -Math.PI / 2) d = -Math.PI / 2;
            this.shooter.ang = mid + Math.max(-th, Math.min(th, d));
        }
        nudge(d) {
            const th = this.aimLimit(), mid = -Math.PI / 2;
            this.shooter.ang = Math.max(mid - th, Math.min(mid + th, this.shooter.ang + d));
        }
        /* ---------- 射击 ---------- */
        fire() {
            if (this.ball || this.dead || this.cleared) return false;
            const a = this.shooter.ang, sp = 780;
            this.ball = {
                x: this.sx, y: this.sy - 34, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                col: this.cur, sp: this.curSp || null
            };
            SFX.fire(this.sfxK);
            return true;
        }
        advance() {
            this.cur = this.next; this.curSp = this.nextSp || null;
            const p = this.pickNext ? this.pickNext() : null;
            if (p) { this.next = p.col; this.nextSp = p.sp || null; }
            else { this.next = (Math.random() * this.nColors) | 0; this.nextSp = null; }
        }
        /* ---------- 每帧 ---------- */
        update(dt) {
            this.pops = this.pops.filter(p => (p.t -= dt) > 0);
            this.drops = this.drops.filter(d => { d.v += 700 * dt; d.y += d.v * dt; return d.y < H + 40; });
            // v4.0.156：泡泡沉到危险线附近就催一下（节流 1.5s，只在玩家自己那侧响）
            if (!this.dead && !this.cleared && this.sfxK >= 0.5) {
                const low = this.lowest();
                if (low >= 0 && this.yOf(low) + this.R > this.deadline - 58) SFX.danger();
            }
            if (!this.ball || this.dead || this.cleared) return;
            const b = this.ball;
            const steps = Math.max(1, Math.ceil((Math.abs(b.vx) + Math.abs(b.vy)) * dt / 6));
            for (let i = 0; i < steps; i++) {
                b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
                if (b.x < this.wallL) { b.x = this.wallL; b.vx = Math.abs(b.vx); SFX.bounce(this.sfxK); }
                if (b.x > this.wallR) { b.x = this.wallR; b.vx = -Math.abs(b.vx); SFX.bounce(this.sfxK); }
                if (b.y < this.TOP + this.R * 0.55) { this.land(b); return; }
                for (let r = 0; r < this.rows; r++) {
                    for (let c = 0; c < this.colsIn(r); c++) {
                        if (this.g[r][c] < 0) continue;
                        const dx = b.x - this.cx(r, c), dy = b.y - this.yOf(r);
                        if (dx * dx + dy * dy < (this.R * 1.82) * (this.R * 1.82)) { this.land(b); return; }
                    }
                }
                if (b.y > H + 40) { this.ball = null; this.advance(); return; }
            }
        }
        land(b) {
            this.ball = null;
            if (b.sp && this.onSpecial) {
                SFX.stick(this.sfxK);            // 特殊球也是「贴上去」才生效
                this.onSpecial(this, b.sp, b.x, b.y);
                this.afterLand(1, 0);
                this.advance();
                return;
            }
            const cell = this.findCell(b);
            if (!cell) { this.advance(); return; }
            this.g[cell[0]][cell[1]] = b.col;
            const res = this.settle(cell[0], cell[1], b.col);
            // v4.0.156：粘合声是「贴住」那一刻，碎裂声是「够三个」那一刻 —— 两者必居其一；
            // 顺带掉下去的悬空球再补一层往下漏气的声音
            if (res.popped > 0) SFX.pop(res.popped, this.sfxK);
            else SFX.stick(this.sfxK);
            if (res.dropped > 0) SFX.drop(res.dropped, this.sfxK);
            if (this.onLand) this.onLand(this, res);
            this.afterLand(res.popped, res.dropped);
            this.advance();
        }
        afterLand(popped, dropped) {
            if (popped > 0) this.missStreak = 0;
            else if (this.missPush && ++this.missStreak >= this.missLimit) {
                this.missStreak = 0;
                this.pushCeil(this.colsIn(0), null);
            }
            this.checkState();
        }
        checkState() {
            if (this.dead || this.cleared) return;
            if (this.count() === 0) {
                if (!this.noClear) { this.cleared = true; if (this.onClear) this.onClear(this); }
                return;
            }
            const low = this.lowest();
            if (low >= 0 && this.yOf(low) + this.R >= this.deadline) {
                this.dead = true;
                if (this.onDead) this.onDead(this);
            }
        }
        findCell(b) {
            let best = null, bd = 1e9;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                if (this.g[r][c] >= 0) continue;
                let ok = r === 0;
                if (!ok) {
                    for (const [nr, nc] of this.neighbors(r, c)) {
                        if (nr < 0) { ok = true; break; }
                        if (this.g[nr] && this.g[nr][nc] >= 0) { ok = true; break; }
                    }
                }
                if (!ok) continue;
                const dx = b.x - this.cx(r, c), dy = b.y - this.yOf(r);
                const d = dx * dx + dy * dy;
                if (d < bd) { bd = d; best = [r, c]; }
            }
            return best;
        }
        cluster(r0, c0) {
            const col = this.g[r0][c0];
            if (col < 0 || col === TOMB) return [];
            const seen = new Set([r0 + ',' + c0]), st = [[r0, c0]], out = [[r0, c0]];
            while (st.length) {
                const [r, c] = st.pop();
                for (const [nr, nc] of this.neighbors(r, c)) {
                    if (!this.inB(nr, nc)) continue;
                    if (this.g[nr][nc] !== col) continue;
                    const k = nr + ',' + nc;
                    if (seen.has(k)) continue;
                    seen.add(k); out.push([nr, nc]); st.push([nr, nc]);
                }
            }
            return out;
        }
        removeCells(cells, color) {
            let n = 0;
            for (const [r, c] of cells) {
                const v = this.g[r][c];
                if (v < 0) continue;
                this.pops.push({ x: this.cx(r, c), y: this.yOf(r), t: 0.32, c: color == null ? v : color });
                this.g[r][c] = -1; n++;
            }
            return n;
        }
        // 贴着被消掉的泡泡的墓碑跟着一起碎
        clearTombsNear(cells) {
            const hit = new Set();
            for (const [r, c] of cells) {
                for (const [nr, nc] of this.neighbors(r, c)) {
                    if (this.inB(nr, nc) && this.g[nr][nc] === TOMB) hit.add(nr + ',' + nc);
                }
            }
            let n = 0;
            hit.forEach(k => {
                const [r, c] = k.split(',').map(Number);
                this.pops.push({ x: this.cx(r, c), y: this.yOf(r), t: 0.32, c: TOMB });
                this.g[r][c] = -1; n++;
            });
            return n;
        }
        dropFloating() {
            const keep = new Set(), q = [];
            for (let r = 0; r < Math.min(this.ceilRows, this.rows); r++) {
                for (let c = 0; c < this.colsIn(r); c++) {
                    if (this.g[r][c] >= 0) { keep.add(r + ',' + c); q.push([r, c]); }
                }
            }
            while (q.length) {
                const [r, c] = q.pop();
                for (const [nr, nc] of this.neighbors(r, c)) {
                    if (!this.inB(nr, nc) || this.g[nr][nc] < 0) continue;
                    const k = nr + ',' + nc;
                    if (keep.has(k)) continue;
                    keep.add(k); q.push([nr, nc]);
                }
            }
            let n = 0;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                if (this.g[r][c] >= 0 && !keep.has(r + ',' + c)) {
                    this.drops.push({ x: this.cx(r, c), y: this.yOf(r), v: 60, c: this.g[r][c] });
                    this.g[r][c] = -1; n++;
                }
            }
            return n;
        }
        settle(r, c, col) {
            if (col < 0 || col === TOMB) return { popped: 0, dropped: 0, size: 1 };
            const cl = this.cluster(r, c);
            if (cl.length >= 3) {
                this.removeCells(cl);
                const tombs = this.clearTombsNear(cl);
                const dropped = this.dropFloating();
                this.score += cl.length * 10 + dropped * 15 + tombs * 20;
                this.combo++;
                return { popped: cl.length + tombs, dropped, size: cl.length, col, tombs };
            }
            this.combo = 0;
            return { popped: 0, dropped: 0, size: cl.length, col, tombs: 0 };
        }
        /* ---------- 顶行下压 ---------- */
        pushCeil(n, colorFn) {
            SFX.push(this.sfxK);
            for (let r = this.rows - 1; r >= 1; r--) {
                this.g[r] = this.g[r - 1].slice();
                // 奇数行只有 COLS-1 格，下移后会比偶数行少一个 → 补成 -1，
                // 否则 undefined 会被当成「一粒看不见的球」（v4.0.151 踩过）
                while (this.g[r].length < this.COLS) this.g[r].push(-1);
                for (let c = this.colsIn(r); c < this.COLS; c++) {
                    if (this.g[r][c] >= 0) {
                        this.drops.push({ x: this.cx(r, c), y: this.yOf(r), v: 60, c: this.g[r][c] });
                        this.g[r][c] = -1;
                    }
                }
            }
            this.g[0] = new Array(this.COLS).fill(-1);
            const cols = [];
            for (let c = 0; c < this.colsIn(0); c++) cols.push(c);
            for (let i = cols.length - 1; i > 0; i--) {
                const j = (Math.random() * (i + 1)) | 0;
                const t = cols[i]; cols[i] = cols[j]; cols[j] = t;
            }
            const m = Math.min(n == null ? cols.length : n, cols.length);
            for (let i = 0; i < m; i++) {
                this.g[0][cols[i]] = colorFn ? colorFn() : ((Math.random() * this.nColors) | 0);
            }
            this.checkState();
        }
        /* ---------- 特殊球用到的批量清除 ---------- */
        burst(x, y, rad) {
            const list = [], r2 = rad * rad;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                if (this.g[r][c] < 0) continue;
                const dx = this.cx(r, c) - x, dy = this.yOf(r) - y;
                if (dx * dx + dy * dy <= r2) list.push([r, c]);
            }
            const n = this.removeCells(list);
            this.dropFloating();
            return n;
        }
        colorNear(x, y) {
            let best = -1, bd = 1e9;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                const v = this.g[r][c];
                if (v < 0 || v === TOMB) continue;
                const dx = this.cx(r, c) - x, dy = this.yOf(r) - y;
                const d = dx * dx + dy * dy;
                if (d < bd) { bd = d; best = v; }
            }
            return best;
        }
        wipeColor(col) {
            const list = [];
            if (col < 0 || col === TOMB) return 0;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                if (this.g[r][c] === col) list.push([r, c]);
            }
            const n = this.removeCells(list);
            this.dropFloating();
            return n;
        }
        rowNear(y) {
            let best = 0, bd = 1e9;
            for (let r = 0; r < this.rows; r++) {
                const d = Math.abs(this.yOf(r) - y);
                if (d < bd) { bd = d; best = r; }
            }
            return best;
        }
        wipeRow(r) {
            const list = [];
            for (let c = 0; c < this.colsIn(r); c++) if (this.g[r][c] >= 0) list.push([r, c]);
            const n = this.removeCells(list);
            this.dropFloating();
            return n;
        }
        /* ---------- 绘制 ---------- */
        draw(withAim) {
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                const v = this.g[r][c];
                if (v < 0) continue;
                const x = this.cx(r, c), y = this.yOf(r);
                if (v === TOMB) this.tomb(x, y); else this.bub(x, y, v);
            }
            for (const p of this.pops) {
                ctx.globalAlpha = Math.max(0, p.t / 0.32);
                ctx.fillStyle = p.c === TOMB ? '#9a978d' : (BUB_COLORS[p.c] || BUB_COLORS[0]).c;
                ctx.beginPath();
                ctx.arc(p.x, p.y, this.R * (1.6 - p.t), 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            for (const d of this.drops) {
                if (d.c === TOMB) this.tomb(d.x, d.y); else this.bub(d.x, d.y, d.c);
            }
            if (this.ball) {
                if (this.ball.sp) this.spBall(this.ball.x, this.ball.y, this.ball.sp);
                else this.bub(this.ball.x, this.ball.y, this.ball.col);
            } else if (withAim !== false && this.showAim && !this.dead && !this.cleared) {
                this.drawAim();
            }
        }
        drawAim() {
            const a = this.shooter.ang, vx = Math.cos(a), vy = Math.sin(a);
            if (vy > -0.02) return;
            const ox = this.sx + vx * 30, oy = this.sy - 20 + vy * 30;
            const lim2 = (this.R * 1.7) * (this.R * 1.7);
            let px = ox, py = oy, ex = ox, ey = oy;
            for (let i = 0; i < 200; i++) {
                px += vx * 9; py += vy * 9; ex = px; ey = py;
                if (px <= this.wallL || px >= this.wallR) break;
                if (py <= this.TOP + this.R * 0.55) break;
                const r0 = Math.max(0, Math.floor((py - this.TOP - this.R) / this.ROWH) - 1);
                let hit = false;
                for (let r = r0; r <= Math.min(this.rows - 1, r0 + 2) && !hit; r++) {
                    for (let c = 0; c < this.colsIn(r); c++) {
                        if (this.g[r][c] < 0) continue;
                        const dx = px - this.cx(r, c), dy = py - this.yOf(r);
                        if (dx * dx + dy * dy < lim2) { hit = true; break; }
                    }
                }
                if (hit) break;
            }
            ctx.save();
            ctx.strokeStyle = 'rgba(180,235,255,0.26)'; ctx.lineWidth = 2;
            ctx.setLineDash([6, 9]);
            ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(180,235,255,0.32)';
            ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        bub(x, y, col, a, rad) { paintBub(x, y, col, a, rad || this.R); }
        tomb(x, y) {
            const R = this.R;
            ctx.fillStyle = '#6d6a62';
            ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#8e8a80';
            rr(x - R * 0.42, y - R * 0.56, R * 0.84, R * 1.02, R * 0.16); ctx.fill();
            ctx.fillStyle = '#4b4842';
            ctx.fillRect(x - R * 0.07, y - R * 0.34, R * 0.14, R * 0.62);
            ctx.fillRect(x - R * 0.24, y - R * 0.18, R * 0.48, R * 0.14);
            ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2); ctx.stroke();
        }
        spBall(x, y, sp, rad) {
            const R = rad || this.R;
            if (sp === 'bomb') {
                const bg = ctx.createRadialGradient(x - R * 0.34, y - R * 0.4, R * 0.15, x, y, R);
                bg.addColorStop(0, '#928e83'); bg.addColorStop(0.45, '#55524b'); bg.addColorStop(1, '#22221d');
                ctx.fillStyle = bg;
                ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#e0653a'; ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.arc(x, y, R - 1.2, 0, Math.PI * 2); ctx.stroke();
                // 镜面高光
                ctx.save();
                ctx.translate(x - R * 0.3, y - R * 0.34); ctx.rotate(-0.7);
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath(); ctx.ellipse(0, 0, R * 0.3, R * 0.16, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                // 火花
                ctx.strokeStyle = '#f0a05a'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x + R * 0.26, y - R * 0.8); ctx.quadraticCurveTo(x + R * 0.72, y - R * 1.15, x + R * 0.36, y - R * 1.5); ctx.stroke();
                const sg = ctx.createRadialGradient(x + R * 0.34, y - R * 1.5, 0, x + R * 0.34, y - R * 1.5, R * 0.42);
                sg.addColorStop(0, 'rgba(255,255,220,0.95)'); sg.addColorStop(0.4, 'rgba(255,214,74,0.85)'); sg.addColorStop(1, 'rgba(255,140,40,0)');
                ctx.fillStyle = sg;
                ctx.beginPath(); ctx.arc(x + R * 0.34, y - R * 1.5, R * 0.42, 0, Math.PI * 2); ctx.fill();
                // 顶盖 + 导火索
                ctx.fillStyle = '#b9b5a8';
                rr(x - R * 0.2, y - R * 1.02, R * 0.4, R * 0.22, R * 0.08); ctx.fill();
            } else if (sp === 'rainbow') {
                const cs = ['#5fbf35', '#4aa8e0', '#9b6ad6', '#e8c53a'];
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath(); ctx.moveTo(x, y);
                    ctx.arc(x, y, R, i * Math.PI / 2, (i + 1) * Math.PI / 2);
                    ctx.closePath(); ctx.fillStyle = cs[i]; ctx.fill();
                }
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.beginPath(); ctx.arc(x - R * 0.3, y - R * 0.35, R * 0.16, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillStyle = '#e8b93a';
                ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff8dc';
                ctx.beginPath();
                ctx.moveTo(x + R * 0.12, y - R * 0.62);
                ctx.lineTo(x - R * 0.34, y + R * 0.1);
                ctx.lineTo(x + R * 0.02, y + R * 0.1);
                ctx.lineTo(x - R * 0.12, y + R * 0.62);
                ctx.lineTo(x + R * 0.36, y - R * 0.12);
                ctx.lineTo(x + R * 0.02, y - R * 0.12);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2); ctx.stroke();
            }
        }
    }

    /* ================================================================
     * 4. 泡泡牧场（v4.0.157 换掉「猫尾草泡泡龙」）
     * ----------------------------------------------------------------
     * 用户：经典泡泡龙可以删掉，换一个新奇的玩法。
     * 老版的问题是「打空就算赢」，跟机械龙攻城共用一套三消和炮台，
     * 除了画风没有任何区别 —— 拆成两张卡反而更重复。
     *
     * 这一版把「消除」变成「种植」：
     *   消掉的植物球会掉进下方的花盆，花盆只收同色（每个盆绑一种颜色）；
     *   同色喂满 3 颗就升一级，豌豆 → 双发 → 机枪 → 寒冰 → 玉米 → 西瓜，
     *   升到 6 级的作物会自己往上打，替你清场。
     *   目标：养出 2 盆满级作物。清空场地不算赢（BubLane.noClear），
     *   所以不能靠「一把清光」速通，必须一边压住泡泡一边攒种子。
     *   每次升级都会惊动杂草多压一截 —— 越强越危险，这是刻意的取舍。
     * ============================================================== */
    const FARM_LV = [
        { p: 'peashooter', n: '豌豆射手', dps: 1 },
        { p: 'repeater', n: '双发豌豆', dps: 1 },
        { p: 'gatling', n: '机枪豌豆', dps: 1 },
        { p: 'snowpea', n: '寒冰豌豆', dps: 1 },
        { p: 'kernel', n: '玉米投手', dps: 1 },
        { p: 'melon', n: '西瓜投手', dps: 1 }
    ];
    const FARM_CROPS = [
        { col: 0, n: '豌豆', c: '#5fbf35' },
        { col: 1, n: '寒冰', c: '#4aa8e0' },
        { col: 2, n: '喷菇', c: '#9b6ad6' },
        { col: 3, n: '玉米', c: '#e8c53a' },
        { col: 0, n: '豌豆', c: '#5fbf35' }
    ];
    const FARM_SEED = 3;                 // 每级要喂几颗同色
    const FARM_WIN = 2;                  // 拿几盆满级算通关

    class BubbleFarm extends Base {
        setup() {
            // 画布只有 600 高：场地 104~404、炮台 424、花盆 474~594。
            // 第一版按 700 排的，花盆整个被画布底边切掉了 —— 这种裁切断言查不出来。
            this.lane = new BubLane({
                R: 21, COLS: 19, LEFT: 51, TOP: 104, rows: 8,
                sx: 450, sy: 424, deadline: 404, nColors: 4,
                fillRows: 3, gapEvery: 3, ceilRows: 2, missPush: true, missLimit: 7
            });
            this.lane.noClear = true;     // 清空不算赢，养出满级作物才算
            this.lane.onLand = (l, res) => this.onPop(res);
            this.lane.onDead = () => this.end(false);

            this.pots = FARM_CROPS.map((c, i) => ({
                col: c.col, crop: c, lv: 0, seed: 0, cd: 0,
                x: 60 + i * 156 + 75, y: 474, flash: 0, fx: 0
            }));
            this.shots = [];              // 作物打出去的豌豆
            this.floats = [];             // 飘字
            this.pushT = 7.5;
            this.best = 0;
            this.banner = ''; this.bannerT = 0;
        }

        /* ---------- 消除 → 喂花盆 ---------- */
        onPop(res) {
            const col = res.col == null ? 0 : res.col;
            if (res.popped <= 0) return;
            this.feed(col, Math.max(1, res.size || 3));
            if (res.dropped > 0) this.feed(col, Math.min(3, res.dropped));
            SFX.combo(res.popped);
        }

        feed(col, n) {
            const p = this.pots.filter(q => q.col === col && q.lv < FARM_LV.length)[0];
            if (!p) return;
            p.seed += n;
            p.flash = 0.4;
            while (p.seed >= FARM_SEED && p.lv < FARM_LV.length) {
                p.seed -= FARM_SEED;
                p.lv++;
                p.fx = 0.8;
                SFX.grow(p.lv);
                this.floats.push({ x: p.x, y: p.y - 20, s: 'Lv' + p.lv + ' ' + FARM_LV[p.lv - 1].n, t: 1.3, c: '#ffe066' });
                // 作物越强，杂草压得越狠（每升一级多压 2 颗）
                this.lane.pushCeil(2, null);
                if (p.lv >= FARM_LV.length) this.checkWin();
            }
        }

        checkWin() {
            const full = this.pots.filter(q => q.lv >= FARM_LV.length).length;
            if (full >= FARM_WIN && !this.over) this.end(true);
        }

        /* ---------- 作物反击 ---------- */
        pickTarget() {
            const l = this.lane;
            for (let r = l.rows - 1; r >= 0; r--) {
                const cs = [];
                for (let c = 0; c < l.colsIn(r); c++) {
                    const v = l.g[r][c];
                    if (v >= 0 && v !== TOMB) cs.push(c);
                }
                if (cs.length) {
                    // 打最靠中间那颗，溅射更容易带到邻居
                    const c = cs[(cs.length / 2) | 0];
                    return [r, c];
                }
            }
            return null;
        }

        updatePlants(dt) {
            for (const p of this.pots) {
                if (p.lv <= 0) continue;
                p.cd -= dt;
                if (p.cd > 0) continue;
                const cell = this.pickTarget();
                if (!cell) { p.cd = 0.4; continue; }
                p.cd = Math.max(1.35, 4.2 - p.lv * 0.44);    // Lv1 3.76s → Lv6 1.56s
                const l = this.lane;
                this.shots.push({
                    x0: p.x, y0: p.y - 26, x1: l.cx(cell[0], cell[1]), y1: l.yOf(cell[0]),
                    cell, lv: p.lv, t: 0, dur: 0.24, pot: p
                });
            }
        }

        updateShots(dt) {
            const l = this.lane;
            for (const s of this.shots) {
                s.t += dt;
                if (s.t < s.dur) continue;
                s.done = true;
                if (l.g[s.cell[0]] && l.g[s.cell[0]][s.cell[1]] >= 0) {
                    const cells = [[s.cell[0], s.cell[1]]];
                    // 寒冰及以上带一点溅射，满级西瓜直接轰掉整簇
                    if (s.lv >= 6) {
                        for (const [nr, nc] of l.neighbors(s.cell[0], s.cell[1])) {
                            if (l.inB(nr, nc) && l.g[nr][nc] === l.g[s.cell[0]][s.cell[1]]) cells.push([nr, nc]);
                        }
                    } else if (s.lv >= 4 && Math.random() < 0.4) {
                        const nb = l.neighbors(s.cell[0], s.cell[1])
                            .filter(([nr, nc]) => l.inB(nr, nc) && l.g[nr][nc] >= 0 && l.g[nr][nc] !== TOMB);
                        if (nb.length) cells.push(nb[0]);
                    }
                    const n = l.removeCells(cells);
                    l.dropFloating();
                    l.score += n * 8;
                    this.floats.push({ x: s.x1, y: s.y1 - 8, s: '+' + n, t: 0.7, c: '#c9f58a' });
                }
            }
            this.shots = this.shots.filter(s => !s.done);
        }

        /* ---------- 每帧 ---------- */
        update(dt) {
            for (const p of this.pots) {
                p.flash = Math.max(0, p.flash - dt);
                p.fx = Math.max(0, p.fx - dt);
            }
            for (const f of this.floats) { f.t -= dt; f.y -= dt * 26; }
            this.floats = this.floats.filter(f => f.t > 0);
            this.bannerT = Math.max(0, this.bannerT - dt);
            if (this.over) { this.lane.update(dt); this.updateShots(dt); return; }

            this.lane.update(dt);
            this.updatePlants(dt);
            this.updateShots(dt);

            // 杂草慢慢往上长 —— 没有这一条，玩家可以一直不落球等作物自己清场
            this.pushT -= dt;
            if (this.pushT <= 0) {
                this.pushT = Math.max(5.2, 7.5 - this.pots.reduce((a, p) => a + p.lv, 0) * 0.09);
                this.lane.pushCeil(4, null);
            }
        }

        /* ---------- 绘制 ---------- */
        draw() {
            // 黄昏牧场：暖绿草地 + 远处栅栏，跟钢铁工坊的暗铜完全分开
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#5b7a2e'); g.addColorStop(0.42, '#42611f'); g.addColorStop(1, '#24380f');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            // 夕阳
            const sg = ctx.createRadialGradient(760, 40, 10, 760, 40, 320);
            sg.addColorStop(0, 'rgba(255,206,110,0.42)');
            sg.addColorStop(0.5, 'rgba(255,160,70,0.14)');
            sg.addColorStop(1, 'rgba(255,140,60,0)');
            ctx.fillStyle = sg; ctx.fillRect(340, 0, 560, 380);
            // 斜向细纹（草地不画横条，横条会读成地板）
            ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = '#d8f0a0'; ctx.lineWidth = 1;
            for (let x = -200; x < W + 200; x += 18) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 260, H); ctx.stroke();
            }
            ctx.restore();

            this.drawField();
            this.lane.draw();
            this.drawPots();
            this.drawShots();
            this.drawShooter();
            this.drawHud();

            if (this.bannerT > 0) {
                const a = Math.min(1, this.bannerT / 0.5);
                ctx.save(); ctx.globalAlpha = a;
                ctx.fillStyle = 'rgba(24,40,10,0.84)';
                rr(160, 300, 580, 48, 13); ctx.fill();
                ctx.strokeStyle = 'rgba(200,240,140,0.5)'; ctx.lineWidth = 2; ctx.stroke();
                txt(this.banner, 450, 324, 19, '#e8ffb8', 'center', 900);
                ctx.restore();
            }
            if (this.over) {
                const full = this.pots.filter(p => p.lv >= FARM_LV.length).length;
                if (this.win) this.overlay('牧场大丰收！', '满级作物 ' + full + ' 盆 · 分数 ' + this.lane.score + ' · 用时 ' + Math.round(this.t) + ' 秒', '#d8f56a');
                else this.overlay('杂草压垮了围栏', '满级作物 ' + full + ' 盆 · 分数 ' + this.lane.score, '#ff9b6b');
            }
        }

        drawField() {
            const l = this.lane, wl = l.wallL, wr = l.wallR, y0 = l.TOP - 10;
            const gg = ctx.createLinearGradient(0, y0, 0, l.deadline + 20);
            gg.addColorStop(0, 'rgba(30,48,16,0.55)');
            gg.addColorStop(1, 'rgba(18,30,9,0.72)');
            ctx.fillStyle = gg; ctx.fillRect(0, y0, W, l.deadline - y0 + 26);
            // 左右篱笆
            for (const x of [wl - 12, wr + 4]) {
                const wg = ctx.createLinearGradient(x, 0, x + 8, 0);
                wg.addColorStop(0, 'rgba(120,88,44,0.95)'); wg.addColorStop(1, 'rgba(56,40,20,0.95)');
                ctx.fillStyle = wg; ctx.fillRect(x, y0, 8, l.deadline - y0 + 26);
            }
            ctx.strokeStyle = 'rgba(255,120,90,0.42)';
            ctx.setLineDash([9, 9]); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, l.deadline); ctx.lineTo(W, l.deadline); ctx.stroke();
            ctx.setLineDash([]);
            txt('长到这条线就输', 20, l.deadline - 11, 11, 'rgba(255,160,140,0.6)', 'left', 600);
        }

        drawPots() {
            for (const p of this.pots) {
                const max = p.lv >= FARM_LV.length;
                const y = p.y;
                // 木箱
                const bg = ctx.createLinearGradient(0, y, 0, y + 120);
                bg.addColorStop(0, max ? '#7c5c2a' : '#6b4a24');
                bg.addColorStop(1, max ? '#3f2c10' : '#33220d');
                ctx.fillStyle = bg;
                rr(p.x - 72, y, 144, 120, 10); ctx.fill();
                ctx.strokeStyle = max ? 'rgba(255,214,110,0.85)' : 'rgba(150,110,60,0.55)';
                ctx.lineWidth = max ? 2.4 : 1.6; ctx.stroke();
                // 木板缝
                ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
                for (let i = 1; i < 3; i++) {
                    ctx.beginPath(); ctx.moveTo(p.x - 72, y + i * 30); ctx.lineTo(p.x + 72, y + i * 30); ctx.stroke();
                }
                // 土
                ctx.fillStyle = '#2a1a0c';
                rr(p.x - 58, y + 6, 116, 26, 7); ctx.fill();

                // 盆里的作物
                if (p.lv > 0) {
                    const lv = FARM_LV[p.lv - 1];
                    const bob = Math.sin(this.t * 2 + p.x) * 2;
                    const sc = 0.55 + p.lv * 0.075;
                    sprFit(lv.p, p.x, y + 4 + bob, 58 * sc, 1);
                    if (p.fx > 0) {
                        ctx.save();
                        ctx.globalAlpha = p.fx * 1.1;
                        const rg = ctx.createRadialGradient(p.x, y - 6, 4, p.x, y - 6, 56);
                        rg.addColorStop(0, 'rgba(255,245,170,0.85)');
                        rg.addColorStop(1, 'rgba(255,220,90,0)');
                        ctx.fillStyle = rg;
                        ctx.beginPath(); ctx.arc(p.x, y - 6, 56, 0, Math.PI * 2); ctx.fill();
                        ctx.restore();
                    }
                } else {
                    txt('空盆', p.x, y + 58, 13.5, 'rgba(255,255,255,0.46)', 'center', 700);
                }

                // 等级
                if (p.lv > 0) {
                    txt('Lv' + p.lv, p.x, y + 82, 12.5, max ? '#ffe066' : 'rgba(230,240,200,0.8)', 'center', 800);
                    txt(FARM_LV[p.lv - 1].n, p.x, y + 100, 11, 'rgba(230,240,200,0.6)', 'center', 600);
                }
                // 种子进度（3 格）
                for (let i = 0; i < FARM_SEED; i++) {
                    const on = max || p.seed > i;
                    ctx.fillStyle = on ? p.crop.c : 'rgba(255,255,255,0.12)';
                    rr(p.x - 18 + i * 13, y + 64, 10, 8, 2.5); ctx.fill();
                }
                // 绑定色标
                ctx.fillStyle = p.crop.c;
                ctx.beginPath(); ctx.arc(p.x - 62, y + 14, 6, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
                txt(p.crop.n, p.x - 53, y + 14.5, 10, 'rgba(255,255,255,0.6)', 'left', 700);
            }
        }

        drawShots() {
            for (const s of this.shots) {
                const k = Math.min(1, s.t / s.dur);
                const x = s.x0 + (s.x1 - s.x0) * k;
                const y = s.y0 + (s.y1 - s.y0) * k;
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = s.lv >= 6 ? '#9be86a' : '#c9f58a';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(x, y); ctx.stroke();
                ctx.restore();
                if (s.lv >= 6) {
                    ctx.fillStyle = '#7bc94a';
                    ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.45)';
                    ctx.beginPath(); ctx.arc(x - 2, y - 2, 2.4, 0, Math.PI * 2); ctx.fill();
                } else if (s.lv >= 4) {
                    ctx.fillStyle = '#8fe4ff';
                    ctx.beginPath(); ctx.arc(x, y, 4.6, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillStyle = '#b7f06a';
                    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        drawShooter() {
            const l = this.lane, a = l.shooter.ang;
            ctx.fillStyle = '#5a4022';
            rr(l.sx - 28, l.sy - 4, 56, 20, 7); ctx.fill();
            ctx.fillStyle = '#7a5c30';
            rr(l.sx - 28, l.sy - 4, 56, 6, 3); ctx.fill();
            sprH('cattail', l.sx - 32, l.sy - 24, 58);
            ctx.save();
            ctx.translate(l.sx, l.sy - 18);
            ctx.rotate(a + Math.PI / 2);
            ctx.fillStyle = '#c9e08a';
            rr(-6, -44, 12, 40, 6); ctx.fill();
            ctx.restore();
            const px = l.sx + Math.cos(a) * 66, py = l.sy - 18 + Math.sin(a) * 66;
            if (l.curSp) l.spBall(px, py, l.curSp); else l.bub(px, py, l.cur, 0.82);
        }

        drawHud() {
            const l = this.lane;
            const full = this.pots.filter(p => p.lv >= FARM_LV.length).length;
            // 0~52 是 DOM 顶栏（回大厅 / 关卡名 / 声音），HUD 一律从 68 起
            txt('泡泡牧场', 20, 68, 17, '#e8ffb8', 'left', 900);
            txt('满级 ' + full + ' / ' + FARM_WIN, 148, 68, 13, full >= FARM_WIN ? '#ffe066' : 'rgba(230,245,200,0.72)', 'left', 800);
            txt('剩 ' + l.count() + ' 颗 · 分数 ' + l.score, 450, 68, 12.5, 'rgba(230,245,200,0.6)', 'center', 700);
            txt('消掉同色植物掉进花盆 · 喂满 3 颗升 1 级', 450, 88, 11.5, 'rgba(230,245,200,0.46)', 'center', 600);
            txt(Math.round(this.t) + 's', 880, 68, 12, 'rgba(230,245,200,0.5)', 'right', 700);
            for (const f of this.floats) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, f.t / 0.5);
                txt(f.s, f.x, f.y, 16, f.c, 'center', 900);
                ctx.restore();
            }
        }

        /* ---------- 输入 ---------- */
        onDown(x, y) {
            if (this.over) { if (this.overT > 0.45) this.reset(); return; }
            this.lane.aimAt(x, y);
            this.lane.fire();
        }
        onMove(x, y) {
            if (this.over) return;
            this.lane.aimAt(x, y);
        }
        onKey(down, k) {
            if (!down || this.over) return;
            const l = this.lane;
            if (k === 'left' || k === 'a') l.nudge(-0.045);
            if (k === 'right' || k === 'd') l.nudge(0.045);
            if (k === 'space' || k === 'up') l.fire();
        }
    }

    /* ================================================================
     * 5. 豌豆弹球（打砖块）
     * ============================================================== */
    class Breakout extends Base {
        setup() {
            this.px = 450; this.pw = 118; this.ph = 16; this.py = 546;
            this.baseSpeed = 415;
            this.balls = [];
            this.lives = 3; this.slow = 0; this.triPending = false;
            this.spawnBall(450, this.py - 26, 250, -330, true);
            this.bricks = [];
            const cols = 8, bw = 84, bh = 26, gx = 4, gy = 6, x0 = 112, y0 = 118;
            // v4.0.139：坚果砖原来是整排 8 块铺满 700px，球被关在下面来回弹（就是卡顿感的主要来源）。
            // 改成散落的 3 块障碍，左右留出行车道，球能上去打上面的砖。
            const NUT_AT = '1,4,6';
            for (let r = 0; r < 5; r++) for (let c = 0; c < cols; c++) {
                const nut = r === 4 && NUT_AT.split(',').indexOf(String(c)) >= 0;
                const type = nut ? 'nut' : (r <= 1 ? 'bucket' : 'grave');
                this.bricks.push({
                    x: x0 + c * (bw + gx), y: y0 + r * (bh + gy), w: bw, h: bh,
                    type, hp: type === 'bucket' ? 3 : type === 'grave' ? 1 : Infinity
                });
            }
            this.drops = [];
            this.msg = ''; this.msgT = 0;
            this.acc = 0;
        }
        get ball() { return this.balls[0] || null; }      // 兼容旧脚本里 active.ball.stuck
        spawnBall(x, y, vx, vy, stuck) {
            const b = { x: x, y: y, vx: vx, vy: vy, r: 9, stuck: !!stuck };
            this.balls.push(b);
            return b;
        }
        splitBalls() {
            const b = this.balls[0];
            if (!b) return;
            const sp = Math.hypot(b.vx, b.vy) || this.baseSpeed;
            const a0 = Math.atan2(b.vy, b.vx);
            [-0.32, 0.32].forEach(off => {
                if (this.balls.length >= 4) return;
                this.spawnBall(b.x, b.y, Math.cos(a0 + off) * sp, Math.sin(a0 + off) * sp, false);
            });
        }
        launch() {
            let any = false;
            for (const b of this.balls) if (b.stuck) { b.stuck = false; any = true; }
            if (any && this.triPending) { this.triPending = false; this.splitBalls(); }
            return any;
        }
        update(dt) {
            if (this.over) return;
            if (this.slow > 0) this.slow -= dt;
            if (this.msgT > 0) this.msgT -= dt;
            // v4.0.139：固定步长推进。原来直接用 dt 推位移，掉一帧球就跳两倍距离 → 一顿一顿。
            this.acc = Math.min(this.acc + dt, 0.12);
            const STEP = 1 / 180;
            while (this.acc >= STEP && !this.over) {
                this.physics(STEP);
                this.acc -= STEP;
            }
            if (this.over) return;
            // 掉落道具
            const keep = [];
            for (const d of this.drops) {
                d.v += 180 * dt; d.y += d.v * dt;
                if (d.y > this.py - 16 && d.y < this.py + 18 && Math.abs(d.x - this.px) < this.pw / 2 + 14) { this.grab(d.t); continue; }
                if (d.y < H + 30) keep.push(d);
            }
            this.drops = keep;
            // 通关：可打破的砖清空
            let alive = 0;
            for (const k of this.bricks) if (k.hp > 0 && k.type !== 'nut') { alive++; break; }
            if (!alive) this.end(true);
        }
        physics(h) {
            const sp = this.slow > 0 ? 0.55 : 1;
            const gone = [];
            for (const b of this.balls) {
                if (b.stuck) { b.x = this.px; b.y = this.py - 26; continue; }
                b.x += b.vx * h * sp;
                b.y += b.vy * h * sp;
                this.wallHit(b);
                this.paddleHit(b);
                for (const k of this.bricks) {
                    if (k.hp <= 0 && k.type !== 'nut') continue;
                    if (this.brickHit(b, k)) break;        // 一步只处理一块，角落里不会来回反
                }
                if (b.y - b.r > H + 6) gone.push(b);
            }
            if (gone.length) {
                this.balls = this.balls.filter(b => gone.indexOf(b) < 0);
                if (!this.balls.length) this.loseLife();
            }
        }
        wallHit(b) {
            if (b.x < 60 + b.r) { b.x = 60 + b.r; b.vx = Math.abs(b.vx); }
            if (b.x > 840 - b.r) { b.x = 840 - b.r; b.vx = -Math.abs(b.vx); }
            if (b.y < 86 + b.r) { b.y = 86 + b.r; b.vy = Math.abs(b.vy); }
        }
        paddleHit(b) {
            if (b.vy <= 0) return;
            if (b.y + b.r < this.py || b.y - b.r > this.py + this.ph) return;
            if (Math.abs(b.x - this.px) > this.pw / 2 + b.r) return;
            const off = Math.max(-1, Math.min(1, (b.x - this.px) / (this.pw / 2)));
            const ang = off * 1.05;
            const speed = Math.min(660, Math.hypot(b.vx, b.vy) * 1.02);
            b.vx = Math.sin(ang) * speed;
            b.vy = -Math.abs(Math.cos(ang) * speed);
            // 正中间回弹会变成纯垂直、在一列里反复弹 → 给一个最小的横向分量
            if (Math.abs(b.vx) < speed * 0.26) {
                const dir = off === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(off);
                b.vx = dir * speed * 0.26;
                b.vy = -Math.sqrt(Math.max(0, speed * speed - b.vx * b.vx));
            }
            b.y = this.py - b.r - 0.5;          // 必须推出去，否则下一步还判命中
            SFX.paddle();
        }
        brickHit(b, k) {
            const cx = Math.min(Math.max(b.x, k.x), k.x + k.w);
            const cy = Math.min(Math.max(b.y, k.y), k.y + k.h);
            const dx = b.x - cx, dy = b.y - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 > b.r * b.r) return false;
            if (d2 < 12) {
                // 圆心已经陷进矩形：按最近的一条边推出去
                const dl = b.x - k.x, dr = k.x + k.w - b.x;
                const dtp = b.y - k.y, dbt = k.y + k.h - b.y;
                const m = Math.min(dl, dr, dtp, dbt);
                if (m === dl) { b.x = k.x - b.r; b.vx = -Math.abs(b.vx); }
                else if (m === dr) { b.x = k.x + k.w + b.r; b.vx = Math.abs(b.vx); }
                else if (m === dtp) { b.y = k.y - b.r; b.vy = -Math.abs(b.vy); }
                else { b.y = k.y + k.h + b.r; b.vy = Math.abs(b.vy); }
            } else {
                const d = Math.sqrt(d2);
                const nx = dx / d, ny = dy / d;
                b.x = cx + nx * (b.r + 0.4);
                b.y = cy + ny * (b.r + 0.4);
                const dot = b.vx * nx + b.vy * ny;
                if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
            }
            SFX.brick();                            // v4.0.156：撞砖的脆响
            if (k.type !== 'nut') {
                k.hp--;
                this.score += k.type === 'bucket' ? 30 : 10;
                if (k.hp <= 0 && Math.random() < 0.22) {
                    const t = ['chili', 'ice', 'tri'][(Math.random() * 3) | 0];
                    this.drops.push({ x: k.x + k.w / 2, y: k.y + k.h / 2, t: t, v: 120 });
                }
            }
            return true;
        }
        grab(t) {
            if (t === 'chili') {
                let n = 0;
                this.bricks.forEach(k => { if (k.hp > 0 && k.hp < 99) { k.hp = 0; n++; } });
                this.score += n * 8; this.msg = '辣椒清屏 · +' + n * 8;
            } else if (t === 'ice') { this.slow = 6; this.msg = '寒冰减速 6 秒'; }
            else {
                // v4.0.139：原来只把 this.extra++ 就完事，根本没有第二颗球（假功能）
                if (this.balls.length >= 4) { this.score += 60; this.msg = '三线射手 · 球已满 +60'; }
                else if (this.balls.some(b => b.stuck)) { this.triPending = true; this.msg = '三线射手 · 发球后分三路'; }
                else { this.splitBalls(); this.msg = '三线射手 · 球数 +2'; }
            }
            this.msgT = 1.4;
        }
        loseLife() {
            this.lives--;
            if (this.lives <= 0) { this.end(false); return; }
            this.balls = [];
            this.triPending = false;
            this.spawnBall(this.px, this.py - 26, 250, -330, true);
            this.acc = 0;
            this.msg = '还剩 ' + this.lives + ' 条命'; this.msgT = 1.3;
        }
        onDown() { if (!this.over) this.launch(); }
        onMove(x) { this.px = Math.max(60 + this.pw / 2, Math.min(840 - this.pw / 2, x)); }
        onKey(down, k) {
            if (!down || this.over) return;
            if (k === 'left' || k === 'a') this.px = Math.max(60 + this.pw / 2, this.px - 46);
            if (k === 'right' || k === 'd') this.px = Math.min(840 - this.pw / 2, this.px + 46);
            if (k === 'space') this.launch();
        }
        draw() {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#10233a'); g.addColorStop(1, '#1d3f2a');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            txt('豌豆弹球', 450, 62, 24, '#ffe9a8', 'center', 900);
            for (const k of this.bricks) {
                if (k.hp <= 0 && k.type !== 'nut') continue;
                if (k.type === 'nut') {
                    ctx.fillStyle = '#7a5a2e'; rr(k.x, k.y, k.w, k.h, 8); ctx.fill();
                    ctx.strokeStyle = 'rgba(255,230,180,0.35)'; ctx.lineWidth = 2; ctx.stroke();
                    spr('wallnut', k.x + k.w / 2 - 13, k.y + 1, 26, 24);
                } else if (k.type === 'bucket') {
                    ctx.fillStyle = k.hp === 3 ? '#7d8a94' : k.hp === 2 ? '#99a3aa' : '#b9c1c6';
                    rr(k.x, k.y, k.w, k.h, 6); ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
                } else {
                    ctx.fillStyle = '#5d6152'; rr(k.x, k.y, k.w, k.h, 6); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(k.x + 4, k.y + 4, k.w - 8, 8, 4); ctx.fill();
                }
            }
            spr('lilypad', this.px - this.pw / 2 - 10, this.py - 12, this.pw + 20, 40);
            for (const b of this.balls) {
                ctx.fillStyle = '#9ce34a';
                ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath(); ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2); ctx.fill();
            }
            for (const d of this.drops) {
                const col = d.t === 'chili' ? '#e04a2a' : d.t === 'ice' ? '#5ac8f0' : '#e8d24a';
                ctx.fillStyle = col; ctx.beginPath(); ctx.arc(d.x, d.y, 11, 0, Math.PI * 2); ctx.fill();
                txt(d.t === 'chili' ? '辣' : d.t === 'ice' ? '冰' : '三', d.x, d.y + 1, 12, '#fff', 'center', 900);
            }
            txt('生命 ' + Math.max(0, this.lives), 78, 574, 17, '#ff8f6b', 'left', 800);
            txt('分数 ' + this.score, 450, 574, 17, '#ffe9a8', 'center', 700);
            if (this.balls.length > 1) txt('球 ×' + this.balls.length, 340, 574, 15, '#9ce34a', 'center', 800);
            txt(this.slow > 0 ? '寒冰减速 ' + this.slow.toFixed(1) + 's' : '', 820, 574, 14, '#7fd8ff', 'right', 700);
            if (this.msgT > 0) txt(this.msg, 450, 500, 18, '#ffe066', 'center', 800);
            if (this.balls.some(b => b.stuck) && !this.over) txt('点击 / 空格 发球', 450, 500, 17, 'rgba(255,255,255,0.75)', 'center', 700);
            if (this.over) this.overlay(this.lives <= 0 ? '防线被突破了' : '全部清空！', '分数 ' + this.score, this.lives <= 0 ? '#ff8f6b' : '#b7f06a');
        }
    }

    /* ================================================================
     * 5. 机械龙攻城（v4.0.157 植物体系）
     * ----------------------------------------------------------------
     * 旧版是「消一颗 4 点」的线性伤害，跟经典泡泡龙只差一层皮。
     * 这一版把「同色三消」直接翻译成「同种植物连成一片」：
     *   绿（豌豆）  3 连 = 豌豆射手 5 点，4 连 = 双发豌豆 10 点，5 连起 15/20…
     *   蓝（寒冰）  伤害只有豌豆一半，但每颗给龙叠一层霜冻（喷吐间隔 +12%，
     *               满 6 层直接冰封 3 秒、受伤翻倍）；连续 5 回合没人消寒冰
     *               → 场上寒冰全部融回普通豌豆（寒冰会化，不能一直放着不管）
     *   紫（菇）    3 连 = 小喷菇，毒 1/回合；4 连 = 大喷菇 2/回合；
     *               5 连 = 忧郁菇 4/回合，代价是把龙的血上限顶到 1000
     *   黄（玉米）  每消 3 颗掷一次 25% 的黄油骰，中了定身 10 秒
     * 另外「连续 4 次成功消除」触发机枪豌豆：一次性 40 点，连击槽会告诉你差几次。
     * 一回合 = 玩家打出一颗球，毒在下一回合开头结算。
     * 三条状态线互相加成是有意设计的：先上毒（紫）→ 冻住（蓝）→ 冰封里打机枪（绿），
     * 比无脑打绿球快一倍，但每一条都要先攒，急了就断连。
     * ============================================================== */
    class DragonRaid extends Base {
        setup() {
            // v4.0.153（用户：A 跟经典泡泡龙看着差不多）——两套画面语言，机制一点不动。
            // 炮台位置试过偏左到 250，但实测偏得越远越难（250→1/6、300→4/6、350→3/6、450→5/6 通关），
            // 那就守住 450：难度曲线必须和改动前一模一样，区分全靠配色 / 材质 / 场景。
            this.lane = new BubLane({
                R: 21, COLS: 19, LEFT: 51, TOP: 150, rows: 10,
                sx: 450, sy: 556, deadline: 510, nColors: 4,
                fillRows: 3, gapEvery: 3, ceilRows: 2, missPush: false
            });
            this.lane.noClear = true;      // 清空场地不算赢，只有把龙打死才算
            this.lane.onLand = (l, res) => this.onPop(res);
            this.lane.onDead = () => this.end(false);

            this.hpMax = 640; this.hp = this.hpMax;
            this.phase = 1;
            this.sprayT = 6.0; this.warn = 0;
            this.flash = 0; this.shake = 0;
            this.spikes = []; this.fx = [];
            this.banner = ''; this.bannerT = 0;
            this.dieT = 0;
            this.gatlingFx = 0;
            this.dmgDone = 0;

            /* ---- v4.0.157 状态线 ---- */
            this.turn = 0;                       // 玩家已出手次数
            this.combo = 0;                      // 连续成功消除次数（机枪槽 0..4）
            this.poison = { per: 0, turns: 0 };  // 毒：每回合 per 点，剩 turns 回合
            this.frost = 0;                      // 霜冻 0..6
            this.iceCd = 0;                      // 冰封剩余秒
            this.butter = 0;                     // 黄油定身剩余秒
            this.iceIdle = 0;                    // 寒冰球连续几回合没被消
            this.gloom = false;                  // 忧郁菇是否已把血上限顶到 1000
            this.poisonFx = 0;
        }

        /* ---------- 伤害入口 ---------- */
        // quiet = 不飘字（毒）；raw = 不吃黄油/冰封的加成（毒是持续伤，不跟着爆发）
        hit(dmg, label, quiet, raw) {
            if (this.over || this.dieT > 0) return 0;
            let mul = 1;
            if (!raw) {
                if (this.butter > 0) mul += 0.5;   // 关节被黄油糊住，打哪都疼
                if (this.iceCd > 0) mul += 1.0;    // 冻住的装甲发脆
            }
            const real = Math.max(1, Math.round(dmg * mul));
            const n = Math.max(1, Math.min(7, Math.round(real / 4)));
            for (let i = 0; i < n; i++) {
                this.spikes.push({
                    x: this.lane.sx + (Math.random() - 0.5) * 70,
                    y: this.lane.sy - 34,
                    t: 0, dur: 0.26 + i * 0.045, dmg: i === 0 ? real : 0
                });
            }
            this.hp = Math.max(0, this.hp - real);
            this.dmgDone += real;
            SFX.dmg(Math.min(1.5, 0.5 + real / 40));
            this.flash = 0.3;
            this.shake = Math.max(this.shake, Math.min(9, 1.5 + real * 0.3));
            if (!quiet) {
                this.fx.push({
                    x: 400 + (Math.random() - 0.5) * 150, y: 176 + (Math.random() - 0.5) * 24,
                    s: '-' + real, t: 1.0, tag: label || '',
                    c: this.iceCd > 0 ? '#bfe9ff' : (this.butter > 0 ? '#ffe9a8' : '#ffd166')
                });
            }
            this.checkPhase();
            return real;
        }

        checkPhase() {
            if (this.hp <= 0) {
                if (this.dieT <= 0) {
                    this.dieT = 1.5;
                    SFX.death();                        // 坠落前的最后一声哀嚎
                    this.banner = '机械龙被击落！';
                    this.bannerT = 2.2;
                }
                return;
            }
            const p = this.hp / this.hpMax;
            const ph = p > 0.7 ? 1 : (p > 0.35 ? 2 : 3);
            if (ph > this.phase) {
                this.phase = ph;
                // 进第 2 阶段 = 护甲被拆（金属断裂），进第 3 阶段 = 暴怒长吼
                if (ph === 2) SFX.armor(); else SFX.roar();
                this.banner = ph === 2 ? '机械龙拆掉护甲 —— 喷吐变快，开始丢墓碑！' : '机械龙暴怒了！';
                this.bannerT = 2.2;
                this.shake = 10;
                this.sprayT = Math.min(this.sprayT, 2.8);
            }
        }

        /* ---------- 四种植物各自的规矩 ---------- */
        onPop(res) {
            const col = res.col == null ? 0 : res.col;
            if (res.popped <= 0) {
                this.combo = 0;
                this.staleIce();
                return;
            }
            const n = Math.max(1, res.size || 3);

            if (col === 0) {
                // 豌豆：3 连 5 点，4 连 10 点，之后每多一颗 +5
                const dmg = 5 * Math.max(1, n - 2);
                this.hit(dmg, n >= 4 ? '双发豌豆' : '豌豆射手');
            } else if (col === 1) {
                // 寒冰：伤害减半，换霜冻层数
                this.hit(Math.max(2, Math.round(5 * (n - 2) * 0.5)), '寒冰豌豆');
                this.addFrost(n);
                this.iceIdle = 0;
            } else if (col === 2) {
                // 菇系：固定 5 点 + 毒，消除数决定毒倍率（1/2/4/8）
                const per = [0, 1, 2, 4, 8][Math.min(4, Math.max(1, n - 2))];
                const name = n >= 5 ? '忧郁菇' : (n >= 4 ? '大喷菇' : '小喷菇');
                this.hit(5, name);
                this.applyPoison(per, name);
                if (n >= 5) this.gloomBoost();
            } else if (col === 3) {
                // 玉米：正常伤害 + 每 3 颗一次 25% 黄油骰
                this.hit(5 * Math.max(1, n - 2), '玉米投手');
                const rolls = Math.max(1, Math.floor(n / 3));
                for (let i = 0; i < rolls; i++) {
                    if (Math.random() < 0.25) { this.butterUp(); break; }
                }
            } else {
                this.hit(5 * Math.max(1, n - 2), '樱桃');
            }

            // 悬空的植物摔下去也压一下
            if (res.dropped > 0) this.hit(Math.min(10, res.dropped * 2), '坠落', true);

            this.combo++;
            if (col !== 1) this.staleIce();
            if (this.combo >= 4) { this.machineGun(); this.combo = 0; }
        }

        machineGun() {
            this.gatlingFx = 0.6;
            this.hit(40, '机枪豌豆 · 四连扫射');
            this.shake = 13;
            SFX.machine();
        }

        addFrost(n) {
            this.frost = Math.min(6, this.frost + Math.max(1, n));
            if (this.frost < 6) return;
            this.frost = 0;
            this.iceCd = 3;
            this.sprayT = Math.max(this.sprayT, 3.2);
            this.banner = '霜冻封住了机械龙的关节 —— 3 秒不能开火，受伤翻倍！';
            this.bannerT = 2.2;
            SFX.freeze();
        }

        // 连续 5 回合没人消寒冰 → 场上的寒冰融回普通豌豆
        staleIce() {
            if (++this.iceIdle < 5) return;
            this.iceIdle = 0;
            let n = 0;
            for (let r = 0; r < this.lane.rows; r++) {
                for (let c = 0; c < this.lane.colsIn(r); c++) {
                    if (this.lane.g[r][c] === 1) { this.lane.g[r][c] = 0; n++; }
                }
            }
            this.frost = 0;
            if (n > 0) {
                this.banner = '寒冰放太久化成了水 —— ' + n + ' 颗退回普通豌豆';
                this.bannerT = 2.2;
            }
        }

        applyPoison(per, name) {
            if (per <= 0) return;
            this.poison.per = Math.max(this.poison.per, per);
            this.poison.turns = 10;
            SFX.poison();
            this.fx.push({ x: 300, y: 176, s: name + ' 毒 ' + this.poison.per + '/回合', t: 1.3, c: '#c9a3ff' });
        }

        gloomBoost() {
            if (this.gloom) return;
            this.gloom = true;
            const add = 1000 - this.hpMax;
            this.hpMax = 1000;
            this.hp = Math.min(this.hpMax, this.hp + add);
            this.banner = '忧郁菇激怒了机械龙 —— 血量上限 1000，但毒伤翻了 4 倍';
            this.bannerT = 2.8;
            this.shake = 12;
            SFX.armor();
        }

        butterUp() {
            const was = this.butter > 0;
            this.butter = 10;
            if (!was) {
                this.banner = '黄油命中！机械龙被黏住 10 秒';
                this.bannerT = 2.0;
            }
            SFX.butter();
        }

        /* ---------- 回合 ---------- */
        tickTurn() {
            this.turn++;
            if (this.poison.turns > 0) {
                const d = this.poison.per;
                this.poison.turns--;
                this.hit(d, '毒', true, true);
                this.poisonFx = 0.45;
                if (this.poison.turns === 0) this.poison.per = 0;
            }
            // 霜冻会自然挥发，但比"每回合掉一层"慢得多（3 回合掉 1 层）
            if (this.frost > 0 && this.turn % 3 === 0) this.frost = Math.max(0, this.frost - 1);
        }

        sprayInterval() {
            // v4.0.157：伤害从旧版「4 点/颗」换成植物体系（3 连只有 5 点）后，同样的喷吐节奏
            // 会让玩家在打死龙之前先被压死（实测机器人 32 秒就顶到红线，只打掉 18% 血）。
            // 所以喷吐整体放慢一档，把「伤害变低」换成「你有更多回合」，节奏才跟旧版一致。
            const base = this.phase === 1 ? 8.2 : (this.phase === 2 ? 6.4 : 5.2);
            return base * (1 + this.frost * 0.12);   // 每层霜冻让喷吐慢 12%
        }

        spray() {
            if (this.butter > 0 || this.iceCd > 0) { this.sprayT = 1.0; return; }
            SFX.spray();                                // 火柱呼啸
            const n = this.phase === 1 ? 4 : (this.phase === 2 ? 5 : 6);
            this.lane.pushCeil(n, null);
            if (this.phase >= 2) {
                const k = this.phase >= 3 ? 2 : 1;
                for (let i = 0; i < k; i++) {
                    const c = (Math.random() * this.lane.colsIn(0)) | 0;
                    if (this.lane.g[0][c] >= 0) this.lane.g[0][c] = TOMB;
                }
            }
            this.lane.checkState();
            this.sprayT = this.sprayInterval();
            this.warn = 0;
            this._warnSfx = false;
            this.shake = Math.max(this.shake, 3);
        }

        update(dt) {
            this.flash = Math.max(0, this.flash - dt);
            this.shake = Math.max(0, this.shake - dt * 26);
            this.bannerT = Math.max(0, this.bannerT - dt);
            this.gatlingFx = Math.max(0, this.gatlingFx - dt);
            this.poisonFx = Math.max(0, this.poisonFx - dt);
            for (const s of this.spikes) s.t += dt;
            this.spikes = this.spikes.filter(s => s.t < s.dur + 0.35);
            for (const f of this.fx) { f.t -= dt; f.y -= dt * 34; }
            this.fx = this.fx.filter(f => f.t > 0);
            if (this.over) { this.lane.update(dt); return; }

            this.lane.update(dt);

            if (this.dieT > 0) {
                this.dieT -= dt;
                if (this.dieT <= 0) this.end(true);
                return;
            }
            // 黄油定身 / 冰封：喷吐计时完全停住（不是变慢，是停住）
            if (this.butter > 0) { this.butter = Math.max(0, this.butter - dt); return; }
            if (this.iceCd > 0) { this.iceCd = Math.max(0, this.iceCd - dt); return; }

            this.sprayT -= dt;
            this.warn = this.sprayT < 1.3 ? Math.max(0, 1 - this.sprayT / 1.3) : 0;
            // 炮口开始发光时配一声长长的吸气（每次喷吐只响一次）
            if (this.warn > 0.02 && !this._warnSfx) { this._warnSfx = true; SFX.warn(); }
            if (this.sprayT <= 0) this.spray();
        }

        /* ---------- 绘制 ---------- */
        draw() {
            // 钢铁工坊（暗铜）—— 经典泡泡龙是后院草地（墨绿），两套色系不撞
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#3d2416'); g.addColorStop(0.5, '#26170f'); g.addColorStop(1, '#0f0a07');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

            ctx.save();
            if (this.shake > 0.2) {
                ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
            }
            this.drawDragon();
            this.drawField();
            this.lane.draw();
            this.drawShooter();
            this.drawSpikes();
            ctx.restore();

            this.drawGatling();
            this.drawHud();
            if (this.poison.turns > 0 && this.poisonFx > 0) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, this.poisonFx * 2.2);
                const pg = ctx.createRadialGradient(470, 90, 10, 470, 90, 190);
                pg.addColorStop(0, 'rgba(150,80,220,0.30)');
                pg.addColorStop(1, 'rgba(90,40,150,0)');
                ctx.fillStyle = pg; ctx.fillRect(280, -20, 400, 260);
                ctx.restore();
            }
            if (this.bannerT > 0) {
                const a = Math.min(1, this.bannerT / 0.5);
                ctx.save(); ctx.globalAlpha = a;
                ctx.fillStyle = 'rgba(40,10,6,0.82)';
                rr(120, 300, 660, 54, 14); ctx.fill();
                ctx.strokeStyle = 'rgba(255,150,90,0.6)'; ctx.lineWidth = 2; ctx.stroke();
                txt(this.banner, 450, 327, 20, '#ffcf8a', 'center', 900);
                ctx.restore();
            }
            if (this.over) {
                if (this.win) this.overlay('机械龙被击落！', '伤害 ' + this.dmgDone + ' · 出手 ' + this.turn + ' 次 · 用时 ' + Math.round(this.t) + ' 秒', '#b7f06a');
                else this.overlay('泡泡压到炮口了', '差一点：机械龙还剩 ' + Math.ceil(this.hp) + ' 血', '#ff8f6b');
            }
        }

        drawDragon() {
            const bob = Math.sin(this.t * 1.5) * 5;
            const dw = 336, dh = 290, dx = 300, dy = -100 + bob;
            const dead = this.dieT > 0;
            const jx = dead ? (Math.random() - 0.5) * 10 : 0;
            spr('dragon', dx + jx, dy, dw, dh, dead ? 0.55 : 1);
            if (this.flash > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                spr('dragon', dx + jx, dy, dw, dh, Math.min(0.85, this.flash * 2.4));
                ctx.restore();
            }
            // 炮口预警光
            const mx = 374, my = 129 + bob;
            if (this.warn > 0.03) {
                const rr0 = 26 + 30 * this.warn;
                const rg = ctx.createRadialGradient(mx, my, 2, mx, my, rr0);
                rg.addColorStop(0, 'rgba(255,190,110,' + (0.75 * this.warn) + ')');
                rg.addColorStop(1, 'rgba(255,110,40,0)');
                ctx.fillStyle = rg;
                ctx.beginPath(); ctx.arc(mx, my, rr0, 0, Math.PI * 2); ctx.fill();
            }
            // 暴怒：眼睛泛红
            if (this.phase >= 3) {
                const a = 0.55 + Math.sin(this.t * 9) * 0.3;
                ctx.fillStyle = 'rgba(255,60,40,' + a + ')';
                ctx.beginPath(); ctx.arc(469, 95, 6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(506, 89, 6, 0, Math.PI * 2); ctx.fill();
            }
            // v4.0.157：黄油糊在胸口 / 关节上，会慢慢往下滴
            if (this.butter > 0) {
                ctx.save();
                const spots = [[352, 132, 38, 21], [438, 166, 31, 19], [512, 142, 26, 16]];
                for (const [sx, sy, rw, rh] of spots) {
                    ctx.fillStyle = 'rgba(242,199,74,0.72)';
                    ctx.beginPath(); ctx.ellipse(sx, sy + bob, rw, rh, -0.28, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,240,168,0.55)';
                    ctx.beginPath(); ctx.ellipse(sx - rw * 0.22, sy + bob - rh * 0.26, rw * 0.5, rh * 0.38, -0.28, 0, Math.PI * 2); ctx.fill();
                }
                const drip = (this.t * 24) % 26;
                ctx.fillStyle = 'rgba(242,199,74,0.62)';
                for (const [sx, sy] of [[358, 148], [444, 180]]) {
                    ctx.beginPath(); ctx.ellipse(sx, sy + bob + drip, 3.6, 6.5, 0, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }
            // 冰封：身上结一层菱形冰晶
            if (this.iceCd > 0) {
                ctx.save();
                ctx.globalAlpha = 0.55;
                for (let i = 0; i < 9; i++) {
                    const x = 315 + (i * 53) % 300, y = -24 + (i * 67) % 190;
                    ctx.fillStyle = i % 2 ? 'rgba(170,232,255,0.55)' : 'rgba(215,245,255,0.5)';
                    ctx.beginPath();
                    ctx.moveTo(x, y - 13); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 13); ctx.lineTo(x - 9, y);
                    ctx.closePath(); ctx.fill();
                }
                ctx.restore();
            }
        }

        drawField() {
            const l = this.lane, wl = l.wallL, wr = l.wallR, y0 = l.TOP - 16, hh = H - y0;
            // 钢板台面
            const gg = ctx.createLinearGradient(0, y0, 0, H);
            gg.addColorStop(0, 'rgba(104,76,48,0.95)');
            gg.addColorStop(0.4, 'rgba(64,46,31,0.95)');
            gg.addColorStop(1, 'rgba(24,17,12,0.97)');
            ctx.fillStyle = gg; ctx.fillRect(0, y0, W, hh);
            // 钢板接缝
            ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
            for (let x = wl; x <= wr; x += 96) {
                ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, l.sy + 26); ctx.stroke();
            }
            // 左右金属护墙 + 铆钉
            for (const x of [wl - 13, wr + 5]) {
                const wg = ctx.createLinearGradient(x, 0, x + 8, 0);
                wg.addColorStop(0, '#7a6040'); wg.addColorStop(0.55, '#4a3724'); wg.addColorStop(1, '#281c12');
                ctx.fillStyle = wg; ctx.fillRect(x, y0, 8, hh);
                ctx.fillStyle = 'rgba(255,224,160,0.32)';
                for (let y = y0 + 12; y < H; y += 34) { ctx.beginPath(); ctx.arc(x + 4, y, 1.9, 0, Math.PI * 2); ctx.fill(); }
            }
            // 炉火底光：工坊的视觉锚点，跟经典那边的「草叶 + 草地绿」正面对立
            const fg = ctx.createRadialGradient(W / 2, H + 30, 20, W / 2, H + 30, 470);
            fg.addColorStop(0, 'rgba(255,122,42,0.34)');
            fg.addColorStop(0.45, 'rgba(196,72,22,0.13)');
            fg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fg; ctx.fillRect(0, l.sy - 130, W, H - l.sy + 130);
            // 两侧厂房立柱（场地左右各留 59px，画成工坊墙壁而不是裸底色）
            for (const x0 of [14, 851]) {
                const pw = 35;
                const pg = ctx.createLinearGradient(x0, 0, x0 + pw, 0);
                pg.addColorStop(0, 'rgba(16,11,8,0.96)');
                pg.addColorStop(0.45, 'rgba(58,42,27,0.92)');
                pg.addColorStop(1, 'rgba(13,9,7,0.97)');
                ctx.fillStyle = pg; ctx.fillRect(x0, y0, pw, hh);
                ctx.fillStyle = 'rgba(198,158,100,0.085)';
                for (let y = y0 + 30; y < H; y += 110) ctx.fillRect(x0, y, pw, 7);
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(x0, y0, 2, hh); ctx.fillRect(x0 + pw - 2, y0, 2, hh);
            }
            // 顶沿警示斜纹
            ctx.save();
            ctx.beginPath(); ctx.rect(wl - 13, y0, wr - wl + 21, 9); ctx.clip();
            ctx.fillStyle = '#c9902f'; ctx.fillRect(wl - 13, y0, wr - wl + 21, 9);
            ctx.fillStyle = '#2a1c10';
            for (let x = wl - 30; x < wr + 16; x += 16) {
                ctx.beginPath();
                ctx.moveTo(x, y0 + 9); ctx.lineTo(x + 9, y0); ctx.lineTo(x + 17, y0); ctx.lineTo(x + 8, y0 + 9);
                ctx.closePath(); ctx.fill();
            }
            ctx.restore();
            ctx.strokeStyle = 'rgba(255,110,90,0.45)';
            ctx.setLineDash([9, 9]); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, l.deadline); ctx.lineTo(W, l.deadline); ctx.stroke();
            ctx.setLineDash([]);
            txt('顶到这条线就输', 20, l.deadline - 12, 11, 'rgba(255,150,140,0.55)', 'left', 600);
        }

        drawShooter() {
            const l = this.lane, a = l.shooter.ang;
            // 钢铁炮座（经典泡泡龙是直接长在草地上，这里坐在炮架上）
            ctx.fillStyle = '#4a3724';
            rr(l.sx - 30, l.sy - 6, 60, 22, 7); ctx.fill();
            ctx.fillStyle = '#6d5537';
            rr(l.sx - 30, l.sy - 6, 60, 6, 3); ctx.fill();
            ctx.fillStyle = 'rgba(255,224,160,0.28)';
            for (const dx of [-22, 22]) { ctx.beginPath(); ctx.arc(l.sx + dx, l.sy + 6, 2, 0, Math.PI * 2); ctx.fill(); }
            sprH('cattail', l.sx - 34, l.sy - 26, 62);
            ctx.save();
            ctx.translate(l.sx, l.sy - 20);
            ctx.rotate(a + Math.PI / 2);
            ctx.fillStyle = '#c9e08a';
            rr(-6, -46, 12, 42, 6); ctx.fill();
            ctx.restore();
            const px = l.sx + Math.cos(a) * 70, py = l.sy - 20 + Math.sin(a) * 70;
            if (l.curSp) l.spBall(px, py, l.curSp); else l.bub(px, py, l.cur, 0.82);
        }

        drawSpikes() {
            for (const s of this.spikes) {
                const k = Math.min(1, s.t / s.dur);
                const x = s.x + (374 - s.x) * k;
                const y = s.y + (129 - s.y) * k - Math.sin(k * Math.PI) * 26;
                ctx.save();
                ctx.globalAlpha = 1 - Math.max(0, (s.t - s.dur) / 0.35);
                ctx.translate(x, y);
                const ang = Math.atan2(129 - s.y, 374 - s.x);
                ctx.rotate(ang);
                ctx.fillStyle = '#b7f06a';
                ctx.beginPath();
                ctx.moveTo(11, 0); ctx.lineTo(-7, -5); ctx.lineTo(-3, 0); ctx.lineTo(-7, 5);
                ctx.closePath(); ctx.fill();
                ctx.restore();
            }
        }

        // 机枪扫射：七条弹道同时拉向龙，不用改龙的贴图就能读出「连射」
        drawGatling() {
            if (this.gatlingFx <= 0) return;
            const a = Math.min(1, this.gatlingFx * 2.4);
            ctx.save();
            ctx.strokeStyle = '#ffe066';
            for (let i = 0; i < 7; i++) {
                const x0 = 450 + (i - 3) * 6;
                const x1 = 374 + (i - 3) * 7;
                ctx.globalAlpha = a * (0.25 + 0.08 * ((i * 7) % 5));
                ctx.lineWidth = i === 3 ? 3 : 1.6;
                ctx.beginPath();
                ctx.moveTo(x0, 520 - i * 3);
                ctx.lineTo(x1, 129);
                ctx.stroke();
            }
            ctx.restore();
        }

        drawHud() {
            const l = this.lane;
            // v4.0.157：DOM 顶栏（回大厅 / 声音）压住画布 0~46px，血条不能再从 x=250 起 ——
            // 左端会被「回大厅」按钮吃掉，右端会顶到右上角的关卡名。缩到 330~620 只占中间。
            const x0 = 330, x1 = 580, y = 12, h = 14;
            ctx.fillStyle = 'rgba(6,9,14,0.78)';
            rr(x0 - 4, y - 4, x1 - x0 + 8, h + 8, 10); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.09)';
            rr(x0, y, x1 - x0, h, 6); ctx.fill();
            const p = Math.max(0, this.hp / this.hpMax);
            if (p > 0) {
                const grd = ctx.createLinearGradient(x0, 0, x1, 0);
                grd.addColorStop(0, '#ff4d3d'); grd.addColorStop(0.55, '#ff8f3d'); grd.addColorStop(1, '#ffd34a');
                ctx.fillStyle = grd;
                rr(x0, y, Math.max(3, (x1 - x0) * p), h, 6); ctx.fill();
            }
            // 阶段刻度：血上限变成 1000 时，三个刻度跟着重新均分，不然会指错阶段
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x0 + (x1 - x0) * 0.35, y, 2, h);
            ctx.fillRect(x0 + (x1 - x0) * 0.70, y, 2, h);

            txt('机械龙 · 第 ' + this.phase + ' 阶段', x0, 38, 12.5, 'rgba(255,214,180,0.92)', 'left', 800);
            txt(Math.ceil(this.hp) + ' / ' + this.hpMax, 455, y + h / 2, 11.5, 'rgba(255,255,255,0.9)', 'center', 800);
            txt('剩 ' + l.count() + ' 颗泡泡', 20, 62, 13, 'rgba(220,235,255,0.62)', 'left', 700);
            txt('回合 ' + this.turn, 20, 84, 12, 'rgba(220,235,255,0.42)', 'left', 700);
            txt('分数 ' + l.score, 880, 62, 13, 'rgba(220,235,255,0.62)', 'right', 700);

            this.drawStatus();
            this.drawCombo();

            for (const f of this.fx) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, f.t / 0.4);
                txt(f.s, f.x, f.y, 20, f.c, 'center', 900);
                if (f.tag) txt(f.tag, f.x, f.y + 18, 11.5, 'rgba(255,240,210,0.66)', 'center', 700);
                ctx.restore();
            }
        }

        // 四条状态线：毒 / 霜 / 黄油 / 冰封。只在有值的时候出现，不占常驻空间
        drawStatus() {
            let x = 330;
            const y = 58;
            const chip = (label, color, bg) => {
                ctx.font = '800 12px "PingFang SC","Microsoft YaHei",sans-serif';
                const w = ctx.measureText(label).width + 20;
                ctx.fillStyle = bg;
                rr(x, y, w, 21, 7); ctx.fill();
                ctx.strokeStyle = color; ctx.lineWidth = 1.3;
                rr(x, y, w, 21, 7); ctx.stroke();
                txt(label, x + w / 2, y + 11, 12, color, 'center', 800);
                x += w + 6;
            };
            if (this.poison.turns > 0) chip('毒 ' + this.poison.per + ' × ' + this.poison.turns + ' 回合', '#c9a3ff', 'rgba(56,28,86,0.78)');
            if (this.frost > 0) chip('霜冻 ' + this.frost + '/6', '#8fe4ff', 'rgba(16,52,76,0.78)');
            if (this.butter > 0) chip('黄油 ' + this.butter.toFixed(1) + 's', '#ffdf7a', 'rgba(76,56,10,0.8)');
            if (this.iceCd > 0) chip('冰封 ' + this.iceCd.toFixed(1) + 's', '#d6f2ff', 'rgba(20,60,90,0.85)');
            if (this.gloom) chip('忧郁菇 · 血上限 1000', '#e0c4ff', 'rgba(46,22,70,0.78)');
        }

        // 机枪槽：4 格，攒满下一发消除自动扫射
        drawCombo() {
            const x = 566, y = 34;
            txt('机枪连击', x - 6, y + 8, 11, 'rgba(255,220,150,0.7)', 'right', 700);
            for (let i = 0; i < 4; i++) {
                const on = this.combo > i;
                ctx.fillStyle = on ? '#ffd34a' : 'rgba(255,255,255,0.13)';
                rr(x + i * 16, y + 3, 12, 15, 3); ctx.fill();
                if (on) {
                    ctx.fillStyle = 'rgba(255,255,200,0.5)';
                    rr(x + i * 16 + 2, y + 5, 8, 4, 2); ctx.fill();
                }
            }
        }

        /* ---------- 输入 ---------- */
        onDown(x, y) {
            if (this.over) { if (this.overT > 0.45) this.reset(); return; }
            if (this.dieT > 0) return;
            this.lane.aimAt(x, y);
            if (this.lane.fire()) this.tickTurn();
        }
        onMove(x, y) {
            if (this.over || this.dieT > 0) return;
            this.lane.aimAt(x, y);
        }
        onKey(down, k) {
            if (!down || this.over) return;
            const l = this.lane;
            if (k === 'left' || k === 'a') l.nudge(-0.045);
            if (k === 'right' || k === 'd') l.nudge(0.045);
            if (k === 'space' || k === 'up') { if (l.fire()) this.tickTurn(); }
        }
    }
/* ================================================================
     * 7. 寒冰推箱（推箱子）
     * ============================================================== */
    const LEVELS = [
        ['#######', '#     #', '# @$ .#', '#     #', '#######'],
        ['#########', '#       #', '# @$ .  #', '#       #', '#  $ .  #', '#       #', '#########'],
        ['##########', '#        #', '# @$ .$ .#', '#   ##   #', '#  $  .  #', '#        #', '##########'],
        ['##########', '#        #', '#  .  $  #', '#  #  #  #', '#  $  .  #', '#   @    #', '##########'],
        ['##########', '#        #', '# $  . . #', '#  ##    #', '#  $  $  #', '#   @    #', '##########'],
        ['###########', '#         #', '#  $ . .  #', '#  # # #  #', '#  $ . $  #', '#    @    #', '###########']
    ];
    class Sokoban extends Base {
        setup() {
            this.idx = 0;
            this.load(0);
        }
        load(i) {
            this.idx = i;
            const raw = LEVELS[i];
            this.h = raw.length; this.w = Math.max.apply(null, raw.map(r => r.length));
            this.wall = []; this.target = []; this.box = [];
            this.px = 0; this.py = 0; this.steps = 0;
            for (let r = 0; r < this.h; r++) {
                this.wall.push([]); this.target.push([]); this.box.push([]);
                for (let c = 0; c < this.w; c++) {
                    const ch = raw[r][c] || ' ';
                    this.wall[r][c] = ch === '#';
                    this.target[r][c] = ch === '.' || ch === '*' || ch === '+';
                    this.box[r][c] = ch === '$' || ch === '*';
                    if (ch === '@' || ch === '+') { this.px = c; this.py = r; }
                }
            }
            // v4.0.139：地图里没有 @（或者 @ 画在墙里）时，旧代码把 px/py 留在 (0,0) ——
            // 那是左上角墙格，人物直接嵌在墙里一步都走不了（第 4 关就是这个毛病）。
            // 兜底：从最下面一行往上找，挑最靠中间的空地放人。
            if (this.wall[this.py][this.px]) {
                for (let r = this.h - 2; r >= 1; r--) {
                    const cand = [];
                    for (let c = 1; c < this.w - 1; c++) {
                        if (!this.wall[r][c] && !this.box[r][c]) cand.push(c);
                    }
                    if (cand.length) {
                        const mid = this.w / 2;
                        cand.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
                        this.px = cand[0]; this.py = r;
                        break;
                    }
                }
            }
            this.tile = Math.min(52, Math.floor(520 / this.w), Math.floor(440 / this.h));
        }
        done() {
            for (let r = 0; r < this.h; r++) for (let c = 0; c < this.w; c++) if (this.target[r][c] && !this.box[r][c]) return false;
            return true;
        }
        move(dx, dy) {
            if (this.over) return;
            const nx = this.px + dx, ny = this.py + dy;
            if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) return;
            if (this.wall[ny][nx]) return;
            let pushed = false;
            if (this.box[ny][nx]) {
                const bx = nx + dx, by = ny + dy;
                if (bx < 0 || by < 0 || bx >= this.w || by >= this.h) return;
                if (this.wall[by][bx] || this.box[by][bx]) return;
                this.box[ny][nx] = false; this.box[by][bx] = true;
                pushed = true;
            }
            this.px = nx; this.py = ny; this.steps++;
            SFX.box(pushed);                        // v4.0.156：推动冰块的摩擦声 / 空走的脚步
            if (this.done()) {
                this.score += Math.max(50, 400 - this.steps * 4);
                this.winLevel = true;
                this.end(true);                     // 走 end() 才有通关音
            }
        }
        onKey(down, k) {
            if (!down) return;
            if (this.over) return;
            if (k === 'left' || k === 'a') this.move(-1, 0);
            else if (k === 'right' || k === 'd') this.move(1, 0);
            else if (k === 'up' || k === 'w') this.move(0, -1);
            else if (k === 'down' || k === 's') this.move(0, 1);
        }
        draw() {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#16324a'); g.addColorStop(1, '#0d1f2e');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            const t = this.tile;
            const ox = (W - this.w * t) / 2 + 60, oy = (H - this.h * t) / 2 + 18;
            for (let r = 0; r < this.h; r++) for (let c = 0; c < this.w; c++) {
                const x = ox + c * t, y = oy + r * t;
                if (this.wall[r][c]) {
                    ctx.fillStyle = '#4a3a22'; rr(x + 1, y + 1, t - 2, t - 2, 6); ctx.fill();
                    ctx.fillStyle = 'rgba(160,130,70,0.35)'; rr(x + 4, y + 4, t - 8, t * 0.3, 4); ctx.fill();
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.05)'; rr(x + 1, y + 1, t - 2, t - 2, 6); ctx.fill();
                    if (this.target[r][c]) {
                        ctx.strokeStyle = this.box[r][c] ? '#7dffb0' : 'rgba(120,255,180,0.55)';
                        ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
                        ctx.strokeRect(x + t * 0.2, y + t * 0.2, t * 0.6, t * 0.6); ctx.setLineDash([]);
                    }
                }
                if (this.box[r][c]) {
                    const cx = x + t / 2, cy = y + t / 2, s = t * 0.72;
                    ctx.fillStyle = 'rgba(140,225,255,0.9)'; rr(cx - s / 2, cy - s / 2, s, s, 8); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.75)'; rr(cx - s / 2 + 5, cy - s / 2 + 5, s * 0.36, s * 0.22, 4); ctx.fill();
                    ctx.strokeStyle = 'rgba(70,150,190,0.8)'; ctx.lineWidth = 2; rr(cx - s / 2, cy - s / 2, s, s, 8); ctx.stroke();
                }
            }
            // v4.0.139：寒冰推箱的主角是寒冰射手（原来错用了普通豌豆射手）
            sprH('snowpea', ox + this.px * t + t * 0.1, oy + this.py * t + t * 0.08, t * 0.84);
            // HUD
            txt('寒冰推箱', 60, 62, 24, '#ffe9a8', 'left', 900);
            txt('第 ' + (this.idx + 1) + ' / ' + LEVELS.length + ' 关', 60, 90, 14, 'rgba(255,255,255,0.6)');
            txt('步数 ' + this.steps, 60, 114, 14, 'rgba(255,255,255,0.6)');
            txt('分数 ' + this.score, 60, 138, 14, 'rgba(255,255,255,0.6)');
            txt('方向键 / WASD 控制寒冰射手推冰块', 60, 512, 13, 'rgba(255,255,255,0.55)');
            txt('把每块冰推上绿圈', 60, 536, 13, 'rgba(255,255,255,0.55)');
            txt('R 重来本关 · ESC 回大厅', 60, 560, 13, 'rgba(255,255,255,0.4)');
            if (this.over && this.win) {
                ctx.fillStyle = 'rgba(6,14,5,0.7)'; ctx.fillRect(0, 0, W, H);
                txt('过关！用了 ' + this.steps + ' 步', W / 2, H / 2 - 30, 40, '#b7f06a', 'center', 900);
                txt(this.idx + 1 < LEVELS.length ? '按 N 或点击进入下一关' : '全部关卡完成！点击从第 1 关重来', W / 2, H / 2 + 26, 20, '#e8f5cf', 'center', 600);
            }
        }
    }

    /* ================================================================
     * 7. 泡泡对轰（v4.0.152 替换「豌豆射击场」）
     * 左右两块场地同屏：左边鼠标，右边键盘；消得多就往对面塞墓碑
     * ============================================================== */
    class BubbleDuel extends Base {
        setup() {
            const mk = (left, sx) => {
                const l = new BubLane({
                    R: 21, COLS: 9, LEFT: left, TOP: 120, rows: 10,
                    sx: sx, sy: 556, deadline: 480, nColors: 4,
                    fillRows: 4, gapEvery: 3, ceilRows: 2, missPush: true, missLimit: 9
                });
                l.owner = left < 450 ? 'A' : 'B';
                l.onLand = (ln, res) => this.onPop(ln, res);
                l.onDead = (ln) => this.end(ln.owner === 'B');
                l.onClear = (ln) => this.end(ln.owner === 'A');
                return l;
            };
            this.la = mk(22, 211);
            this.lb = mk(500, 689);
            this.lb.sfxK = 0.3;                 // v4.0.156：AI 那侧也有声，但只当背景，别跟玩家抢耳朵
            this.lb.showAim = false;
            this.aiOn = true;
            this.aiT = 2.4;
            this.pending = [];
            this.flashA = 0; this.flashB = 0;
            this.msg = ''; this.msgT = 0;
        }

        onPop(ln, res) {
            const other = ln === this.la ? this.lb : this.la;
            let n = 0;
            if (res.popped >= 8) n = 3;
            else if (res.popped >= 6) n = 2;
            else if (res.popped >= 4) n = 1;
            if (res.dropped >= 5) n += 1;
            if (n > 0) { SFX.tomb(1); this.pushGarbage(other, Math.min(4, n), ln); }
        }

        pushGarbage(to, n, from) {
            this.pending.push({ to: to, n: n, t: 0.7 });
            this.msg = (from === this.la ? '你' : '对手') + '塞过去 ' + n + ' 块墓碑';
            this.msgT = 1.5;
        }

        applyGarbage(g) {
            const l = g.to;
            l.pushCeil(6 + g.n, null);
            let done = 0;
            for (let c = 0; c < l.colsIn(0) && done < g.n; c++) {
                if (l.g[0][c] >= 0) { l.g[0][c] = TOMB; done++; }
            }
            l.checkState();
            if (l === this.la) this.flashA = 0.6; else this.flashB = 0.6;
        }

        aiTick(dt) {
            if (this.aiT > 0) { this.aiT -= dt; return; }
            const l = this.lb;
            if (l.ball || l.dead || l.cleared) return;
            // 优先打「最下面的同色球」，没有就随便挑一颗
            let best = null;
            for (let r = l.rows - 1; r >= 0 && !best; r--) {
                for (let c = 0; c < l.colsIn(r); c++) {
                    if (l.g[r][c] === l.cur) { best = [r, c]; break; }
                }
            }
            if (!best) {
                for (let r = l.rows - 1; r >= 0 && !best; r--) {
                    for (let c = 0; c < l.colsIn(r); c++) {
                        if (l.g[r][c] >= 0) { best = [r, c]; break; }
                    }
                }
            }
            if (best) {
                l.aimAt(l.cx(best[0], best[1]) + (Math.random() - 0.5) * 14, l.yOf(best[0]));
                l.fire();
            }
            this.aiT = 1.55 + Math.random() * 0.9;
        }

        update(dt) {
            this.la.update(dt);
            this.lb.update(dt);
            this.flashA = Math.max(0, this.flashA - dt);
            this.flashB = Math.max(0, this.flashB - dt);
            this.msgT = Math.max(0, this.msgT - dt);
            if (this.over) return;

            for (const g of this.pending) g.t -= dt;
            const ready = this.pending.filter(g => g.t <= 0);
            if (ready.length) {
                this.pending = this.pending.filter(g => g.t > 0);
                ready.forEach(g => this.applyGarbage(g));
            }
            if (this.aiOn) this.aiTick(dt);
        }

        /* ---------- 绘制 ---------- */
        draw() {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#1a2136'); g.addColorStop(1, '#0b111c');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

            this.drawPanel(this.la, '#5fbf35', '', this.flashA);
            this.drawPanel(this.lb, '#e0553a', '', this.flashB);

            // 中间 VS
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(450, 110); ctx.lineTo(450, 560); ctx.stroke();
            ctx.restore();
            txt('VS', 450, 150, 34, 'rgba(255,220,140,0.22)', 'center', 900);

            this.drawSide(this.la);
            this.drawSide(this.lb);

            // 墓碑飞行的箭头
            const fly = this.pending.length;
            if (fly) {
                const k = 1 - Math.max(0, this.pending[0].t) / 0.7;
                const toA = this.pending[0].to === this.la;
                const x = toA ? 560 - 220 * k : 340 + 220 * k;
                ctx.save();
                ctx.globalAlpha = 0.85;
                this.la.tomb(x, 150);
                ctx.restore();
            }

            this.drawHud();
            if (this.over) {
                if (this.win) this.overlay('对手被埋了！', '分数 ' + this.la.score, '#b7f06a');
                else this.overlay('你被泡泡埋了', '分数 ' + this.la.score + ' · 对手 ' + this.lb.score, '#ff8f6b');
            }
        }

        drawPanel(l, color, label, flash) {
            const x0 = l.LEFT - 12, w = l.COLS * l.R * 2 + 24;
            ctx.save();
            ctx.fillStyle = flash > 0 ? 'rgba(255,90,60,' + (0.10 + flash * 0.3) + ')' : 'rgba(255,255,255,0.045)';
            rr(x0, l.TOP - 12, w, H - l.TOP + 2, 14); ctx.fill();
            ctx.strokeStyle = flash > 0 ? 'rgba(255,120,80,0.7)' : 'rgba(255,255,255,0.10)';
            ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
            ctx.strokeStyle = 'rgba(255,120,110,0.4)';
            ctx.setLineDash([7, 7]); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x0, l.deadline); ctx.lineTo(x0 + w, l.deadline); ctx.stroke();
            ctx.setLineDash([]);

        }

        drawSide(l) {
            l.draw();
            const a = l.shooter.ang;
            sprH('cattail', l.sx - 30, l.sy - 24, 54);
            ctx.save();
            ctx.translate(l.sx, l.sy - 18);
            ctx.rotate(a + Math.PI / 2);
            ctx.fillStyle = '#c9e08a';
            rr(-5, -40, 10, 36, 5); ctx.fill();
            ctx.restore();
            const px = l.sx + Math.cos(a) * 62, py = l.sy - 18 + Math.sin(a) * 62;
            if (l.curSp) l.spBall(px, py, l.curSp); else l.bub(px, py, l.cur, 0.82);
            // 下一颗
            l.bub(l.sx + 96, l.sy - 6, l.next, 1, 13);
            txt('下一颗', l.sx + 116, l.sy - 6, 11.5, 'rgba(255,255,255,0.42)', 'left', 600);
        }

        drawHud() {
            txt('你  ' + this.la.score, 26, 54, 15, '#b7f06a', 'left', 800);
            txt('剩 ' + this.la.count() + ' 颗', 26, 72, 12, 'rgba(255,255,255,0.4)', 'left', 600);
            txt(this.lb.score + '  ' + (this.aiOn ? '电脑' : '对手'), 874, 54, 15, '#ff9d80', 'right', 800);
            txt('剩 ' + this.lb.count() + ' 颗', 874, 72, 12, 'rgba(255,255,255,0.4)', 'right', 600);

            txt('鼠标瞄准 · 点击发射', this.la.LEFT + 196, 94, 12, 'rgba(255,255,255,0.42)', 'center', 700);
            txt(this.aiOn ? '← → 空格 · 按一下就接管' : '← → 调角度 · 空格发射',
                this.lb.LEFT + 196, 94, 12, this.aiOn ? 'rgba(255,220,140,0.62)' : 'rgba(255,255,255,0.42)', 'center', 700);

            if (this.msgT > 0) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, this.msgT / 0.4);
                txt(this.msg, 450, 566, 15, '#ffd166', 'center', 800);
                ctx.restore();
            }
        }

        /* ---------- 输入 ---------- */
        onDown(x, y) {
            if (this.over) { if (this.overT > 0.45) this.reset(); return; }
            if (x >= 440) return;             // 右半场用键盘，别被鼠标误触
            this.la.aimAt(x, y);
            this.la.fire();
        }
        onMove(x, y) {
            if (this.over || x >= 440) return;
            this.la.aimAt(x, y);
        }
        onKey(down, k) {
            if (!down || this.over) return;
            if (k === 'left' || k === 'right' || k === 'space' || k === 'up') {
                if (this.aiOn) {
                    this.aiOn = false;
                    this.lb.showAim = true;
                    this.msg = '你已接管右侧炮台';
                    this.msgT = 1.8;
                }
            }
            if (k === 'left') this.lb.nudge(-0.05);
            if (k === 'right') this.lb.nudge(0.05);
            if (k === 'space' || k === 'up') this.lb.fire();
        }
    }
    /* ================================================================
     * 9. 花园连连看（记忆配对）
     * ============================================================== */
    const MEM_PAIRS = ['peashooter', 'sunflower', 'wallnut', 'snowpea', 'cherry', 'tallnut', 'melon', 'torchwood'];
    class Memory extends Base {
        setup() {
            const pool = MEM_PAIRS.slice(0, 8).concat(MEM_PAIRS.slice(0, 8));
            for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
            this.cards = pool.map(k => ({ k, up: false, done: false }));
            this.sel = []; this.lock = 0; this.moves = 0; this.time = 0; this.matched = 0;
        }
        pos(i) {
            const r = Math.floor(i / 4), c = i % 4;
            return { x: 258 + c * 100, y: 130 + r * 100, s: 88 };
        }
        update(dt) {
            if (this.over) return;
            this.time += dt;
            if (this.lock > 0) {
                this.lock -= dt;
                if (this.lock <= 0) {
                    this.sel.forEach(i => { if (!this.cards[i].done) this.cards[i].up = false; });
                    this.sel = [];
                }
            }
        }
        onDown(x, y) {
            if (this.over || this.lock > 0) return;
            for (let i = 0; i < this.cards.length; i++) {
                const p = this.pos(i);
                if (x < p.x || x > p.x + p.s || y < p.y || y > p.y + p.s) continue;
                const cd = this.cards[i];
                if (cd.up || cd.done) return;
                cd.up = true; this.sel.push(i);
                SFX.flip();                         // v4.0.156：翻牌
                if (this.sel.length === 2) {
                    this.moves++;
                    const [a, b] = this.sel;
                    if (this.cards[a].k === this.cards[b].k) {
                        SFX.match();
                        this.cards[a].done = this.cards[b].done = true;
                        this.matched++; this.score += 100; this.sel = [];
                        if (this.matched === 8) { this.end(true); }
                    } else {
                        this.score = Math.max(0, this.score - 10);
                        this.lock = 0.75;
                    }
                }
                return;
            }
        }
        draw() {
            bgGrass();
            const g = ctx.createLinearGradient(0, 100, 0, 560);
            g.addColorStop(0, 'rgba(20,40,14,0.2)'); g.addColorStop(1, 'rgba(20,40,14,0.45)');
            ctx.fillStyle = g; ctx.fillRect(248, 120, 404, 404);
            for (let i = 0; i < this.cards.length; i++) {
                const p = this.pos(i), cd = this.cards[i];
                ctx.save();
                ctx.translate(p.x + p.s / 2, p.y + p.s / 2);
                if (cd.done) ctx.globalAlpha = 0.42;
                if (cd.up || cd.done) {
                    ctx.fillStyle = '#f3e6c0'; rr(-p.s / 2, -p.s / 2, p.s, p.s, 12); ctx.fill();
                    ctx.strokeStyle = '#8a6a2f'; ctx.lineWidth = 3; rr(-p.s / 2, -p.s / 2, p.s, p.s, 12); ctx.stroke();
                    spr(cd.k, -p.s / 2 + 10, -p.s / 2 + 8, p.s - 20, p.s - 20);
                } else {
                    ctx.fillStyle = '#6b4a22'; rr(-p.s / 2, -p.s / 2, p.s, p.s, 12); ctx.fill();
                    ctx.fillStyle = '#8a6230'; rr(-p.s / 2 + 6, -p.s / 2 + 6, p.s - 12, p.s - 12, 9); ctx.fill();
                    txt('?', 0, 2, 34, 'rgba(255,235,190,0.8)', 'center', 900);
                }
                ctx.restore();
            }
            txt('花园连连看', 450, 62, 24, '#ffe9a8', 'center', 900);
            txt('配对 ' + this.matched + '/8 · 步数 ' + this.moves + ' · ' + this.time.toFixed(1) + 's', 450, 96, 15, 'rgba(255,255,255,0.7)', 'center', 700);
            if (this.over) this.overlay('全部配对完成！', '用时 ' + this.time.toFixed(1) + ' 秒 · 步数 ' + this.moves, '#b7f06a');
        }
    }

    /* ================================================================
     * 8. 泡泡塔（v4.0.152 替换「植物贪吃蛇」）
     * 一层一层往上打，每两层解锁一种特殊球；连击越高倍率越高
     * ============================================================== */
    class BubbleTower extends Base {
        setup() {
            this.maxFloor = 8;
            this.total = 0;
            this.bestCombo = 0;
            this.trans = 0;
            this.pendingFloor = 0;
            this.flashMsg = ''; this.flashT = 0;
            this.loadFloor(1);
        }

        loadFloor(n) {
            this.floor = n;
            const colors = Math.min(5, 4 + Math.floor((n - 1) / 4));
            const fillRows = Math.min(6, 2 + Math.ceil(n / 2));
            this.lane = new BubLane({
                R: 24, COLS: 18, LEFT: 18, TOP: 96, rows: 11,
                sx: 450, sy: 556, deadline: 532, nColors: colors,
                fillRows: fillRows, gapEvery: 2, ceilRows: 2, missPush: true, missLimit: 8
            });
            const l = this.lane;
            l.specials = [];
            if (n >= 2) l.specials.push('bomb');
            if (n >= 4) l.specials.push('rainbow');
            if (n >= 6) l.specials.push('bolt');
            const chance = Math.min(0.22, 0.10 + 0.02 * Math.max(0, n - 2));
            l.pickNext = () => {
                if (l.specials.length && Math.random() < chance) {
                    return { col: 0, sp: l.specials[(Math.random() * l.specials.length) | 0] };
                }
                return { col: (Math.random() * l.nColors) | 0, sp: null };
            };
            l.onLand = (ln, res) => this.onLand(res);
            l.onSpecial = (ln, sp, x, y) => this.onSpecial(sp, x, y);
            l.onClear = () => this.floorClear();
            l.onDead = () => this.end(false);
            this.combo = 0;
            this.floorStart = this.total;
        }

        onLand(res) {
            if (res.popped > 0) {
                this.combo++;
                if (this.combo > this.bestCombo) this.bestCombo = this.combo;
                if (this.combo >= 3) {
                    SFX.combo(this.combo);      // v4.0.156：连击越高音越高
                    this.flashMsg = '连击 x' + this.combo + '  +' + Math.round(res.popped * 10 * (this.combo - 1) * 0.25);
                    this.flashT = 0.8;
                    this.lane.score += Math.round(res.popped * 10 * (this.combo - 1) * 0.25);
                }
            } else this.combo = 0;
        }

        onSpecial(sp, x, y) {
            SFX.special(sp);                    // v4.0.156：三颗特殊球各有自己的音色
            const l = this.lane;
            let n = 0;
            if (sp === 'bomb') n = l.burst(x, y, l.R * 2.15);
            else if (sp === 'rainbow') {
                const c = l.colorNear(x, y);
                if (c >= 0) n = l.wipeColor(c);
            } else n = l.wipeRow(l.rowNear(y));
            l.score += n * 12;
            this.flashMsg = (sp === 'bomb' ? '炸弹球 · ' : sp === 'rainbow' ? '彩虹球 · ' : '闪电球 · ') + n + ' 颗';
            this.flashT = 1.0;
            this.combo = 0;
        }

        floorClear() {
            if (this.trans > 0) return;
            this.total += this.lane.score;
            this.trans = 1.6;
            this.pendingFloor = this.floor >= this.maxFloor ? 0 : this.floor + 1;
        }

        update(dt) {
            this.flashT = Math.max(0, this.flashT - dt);
            if (this.trans > 0) {
                this.trans -= dt;
                this.lane.update(dt);
                if (this.trans <= 0) {
                    if (this.pendingFloor === 0) this.end(true);
                    else this.loadFloor(this.pendingFloor);
                }
                return;
            }
            if (this.over) return;
            this.lane.update(dt);
        }

        /* ---------- 绘制 ---------- */
        draw() {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#241a36'); g.addColorStop(0.5, '#171227'); g.addColorStop(1, '#0c0a14');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

            const l = this.lane;
            ctx.fillStyle = 'rgba(10,8,20,0.55)';
            ctx.fillRect(0, l.TOP - 8, W, H - l.TOP + 8);
            ctx.fillStyle = 'rgba(180,140,255,0.035)';
            ctx.fillRect(l.wallL, l.TOP - 8, l.wallR - l.wallL, H - l.TOP + 8);
            ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(l.wallL, l.TOP - 8); ctx.lineTo(l.wallL, l.sy - 6);
            ctx.moveTo(l.wallR, l.TOP - 8); ctx.lineTo(l.wallR, l.sy - 6);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,110,90,0.42)';
            ctx.setLineDash([9, 9]); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, l.deadline); ctx.lineTo(W, l.deadline); ctx.stroke();
            ctx.setLineDash([]);

            l.draw();

            const a = l.shooter.ang;
            sprH('cattail', l.sx - 34, l.sy - 26, 62);
            ctx.save();
            ctx.translate(l.sx, l.sy - 20);
            ctx.rotate(a + Math.PI / 2);
            ctx.fillStyle = '#c9e08a';
            rr(-6, -46, 12, 42, 6); ctx.fill();
            ctx.restore();
            const px = l.sx + Math.cos(a) * 70, py = l.sy - 20 + Math.sin(a) * 70;
            if (l.curSp) l.spBall(px, py, l.curSp); else l.bub(px, py, l.cur, 0.82);

            this.drawHud();

            if (this.trans > 0) {
                ctx.save();
                const a2 = Math.min(1, this.trans / 0.4);
                ctx.globalAlpha = a2;
                ctx.fillStyle = 'rgba(16,10,26,0.86)';
                ctx.fillRect(0, 240, W, 110);
                txt(this.pendingFloor === 0 ? '全部 8 层通关！' : '第 ' + this.floor + ' 层 · 通关',
                    W / 2, 282, 34, '#ffe066', 'center', 900);
                txt(this.pendingFloor === 0 ? '总分 ' + (this.total + l.score) :
                    '本层 +' + l.score + ' · 准备进入第 ' + this.pendingFloor + ' 层',
                    W / 2, 320, 17, '#e8f5cf', 'center', 700);
                ctx.restore();
            }

            if (this.over) {
                if (this.win) this.overlay('泡泡塔通关！', '8 层全清 · 总分 ' + (this.total + this.lane.score) + ' · 最高连击 x' + this.bestCombo, '#b7f06a');
                else this.overlay('泡泡压到炮口了', '止步第 ' + this.floor + ' 层 · 总分 ' + (this.total + this.lane.score), '#ff8f6b');
            }
        }

        drawHud() {
            const l = this.lane;
            txt('第 ' + this.floor + ' / ' + this.maxFloor + ' 层', 20, 60, 17, '#ffe9a8', 'left', 900);
            // 层进度点
            for (let i = 0; i < this.maxFloor; i++) {
                const x = 20 + i * 15;
                ctx.fillStyle = i < this.floor ? '#ffd166' : 'rgba(255,255,255,0.14)';
                ctx.beginPath(); ctx.arc(x + 4, 80, 4.5, 0, Math.PI * 2); ctx.fill();
            }
            txt('分数 ' + (this.total + l.score), 450, 60, 15, 'rgba(255,255,255,0.72)', 'center', 800);
            if (this.combo >= 2) txt('连击 x' + this.combo, 450, 80, 13, '#ffb86b', 'center', 800);

            txt('剩 ' + l.count() + ' 颗', 880, 60, 14, 'rgba(255,255,255,0.55)', 'right', 700);
            const sp = l.specials || [];
            let sx = 878;
            for (let i = sp.length - 1; i >= 0; i--) {
                sx -= 28;
                l.spBall(sx, 84, sp[i], 11);
            }
            if (sp.length) txt('特殊球', 878 - sp.length * 28 - 20, 84, 11, 'rgba(255,255,255,0.35)', 'right', 600);

            if (this.flashT > 0) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, this.flashT / 0.35);
                const fw = 44 + this.flashMsg.length * 11;
                ctx.fillStyle = 'rgba(12,8,22,0.78)';
                rr(196 - fw / 2, 548, fw, 28, 14); ctx.fill();
                ctx.strokeStyle = 'rgba(255,209,102,0.32)'; ctx.lineWidth = 1; ctx.stroke();
                txt(this.flashMsg, 196, 562, 17, '#ffd166', 'center', 900);
                ctx.restore();
            }
        }

        /* ---------- 输入 ---------- */
        onDown(x, y) {
            if (this.over) { if (this.overT > 0.45) this.reset(); return; }
            if (this.trans > 0) return;
            this.lane.aimAt(x, y);
            this.lane.fire();
        }
        onMove(x, y) {
            if (this.over || this.trans > 0) return;
            this.lane.aimAt(x, y);
        }
        onKey(down, k) {
            if (!down || this.over || this.trans > 0) return;
            const l = this.lane;
            if (k === 'left' || k === 'a') l.nudge(-0.045);
            if (k === 'right' || k === 'd') l.nudge(0.045);
            if (k === 'space' || k === 'up') l.fire();
        }
    }
    /* ================= 游戏注册表 ================= */
    /* v4.0.153：泡泡系 4 个玩法从「后院游乐场」里独立出去，收进首页单独的
       「猫尾草泡泡工坊」卡（位置在砸罐子 / 我是僵尸正下方）。
       它们共用同一套 BubLane 内核，本质是一个游戏的四种规矩，不该占 4 个散位。 */
    const GAMES = [
        { id: 'tetris', name: '玉米方块', tag: 'TETRIS', icon: 'cob', tip: '落玉米块消一行齐射一轮，撑越久分越高', cls: Tetris },
        { id: 'whack', name: '僵尸地鼠', tag: 'WHACK', icon: 'bucket', tip: '僵尸探头就敲，别敲到向日葵', cls: Whack },
        { id: 'g2048', name: '花园 2048', tag: '2048', icon: 'wintermelon', tip: '同种植物滑到一起就升级融合', cls: Garden2048 },
        { id: 'breakout', name: '豌豆弹球', tag: 'BRICK', icon: 'lilypad', tip: '豌豆弹球砸砖，接住就继续', cls: Breakout },
        { id: 'sokoban', name: '寒冰推箱', tag: 'PUSH', icon: 'snowpea', tip: '把每块冰推到绿圈里', cls: Sokoban },
        { id: 'memory', name: '花园连连看', tag: 'MEMORY', icon: 'cobcannon', tip: '翻牌配对同种植物', cls: Memory }
    ];
    /* 猫尾草泡泡工坊：同一个炮台，四种规矩 */
    const BUBBLE_GAMES = [
        { id: 'farm', name: '泡泡牧场', tag: 'FARM', icon: 'kernel', tip: '消掉的植物掉进花盆，同色喂满就升级，养出西瓜投手', cls: BubbleFarm },
        { id: 'dragon', name: '机械龙攻城', tag: 'BOSS', icon: 'dragon', tip: '消泡泡充能，尖刺射向头顶的机械龙', cls: DragonRaid },
        { id: 'duel', name: '泡泡对轰', tag: 'DUEL', icon: 'repeater', tip: '左右同屏对轰，消得多就给对面塞墓碑', cls: BubbleDuel },
        { id: 'tower', name: '泡泡塔', tag: 'TOWER', icon: 'tallnut', ih: 66, tip: '一层层往上打，每层解锁特殊球', cls: BubbleTower }
    ];
    const ALL_GAMES = GAMES.concat(BUBBLE_GAMES);

    /* ================= 管理器 ================= */
    let screen = null, lobbyEl = null, gridEl = null, stageEl = null, nameEl = null, canvas = null;
    let active = null, activeMeta = null, raf = 0, last = 0, running = false;

    const CSS = [
        '#mini-screen{position:absolute;inset:0;z-index:2100;display:none;overflow:hidden;',
        'font-family:"PingFang SC","Microsoft YaHei",sans-serif;}',
        '#mini-screen *{box-sizing:border-box;}',
        '.mini-lobby{position:absolute;inset:0;padding:14px 16px 10px;display:flex;flex-direction:column;',
        'background:radial-gradient(circle at 50% 0%,#3f7a2a 0%,#25491a 55%,#152b0f 100%);}',
        '.mini-lobby::before{content:"";position:absolute;inset:0;pointer-events:none;',
        'background:repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0 2px,transparent 2px 68px);}',
        '.mini-head{position:relative;display:flex;align-items:center;gap:14px;height:56px;flex:0 0 56px;}',
        '.mini-head .mb{background:linear-gradient(180deg,#7a5a2a,#5a3f18);color:#ffe9b8;border:2px solid #c9a45c;',
        'border-radius:10px;padding:7px 16px;font-size:15px;font-weight:800;cursor:pointer;letter-spacing:1px;}',
        '.mini-head .mb:hover{filter:brightness(1.12);}',
        '.mini-head h2{font-family:"Kaiti SC","STKaiti","KaiTi",serif;font-size:30px;color:#fff3c4;letter-spacing:5px;',
        'text-shadow:2px 2px 0 #2c1a08,0 0 18px rgba(160,230,90,0.35);font-weight:900;}',
        '.mini-head .sub{color:rgba(255,255,255,0.55);font-size:13px;letter-spacing:1px;}',
        '.mini-grid{position:relative;flex:1;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(2,1fr);',
        'gap:11px;margin-top:8px;padding-bottom:2px;}',
        '.mini-card{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;',
        'padding:9px 8px 8px;border-radius:14px;cursor:pointer;overflow:hidden;text-align:center;justify-content:center;',
        'background:linear-gradient(180deg,#f6e7bd 0%,#e8d49b 100%);border:3px solid #6b4a22;',
        'box-shadow:inset 0 0 0 2px rgba(255,255,255,0.4),0 6px 14px rgba(0,0,0,0.35);',
        'transition:transform .12s ease,box-shadow .12s ease;}',
        '.mini-card:hover{transform:translateY(-4px);box-shadow:inset 0 0 0 2px rgba(255,255,255,0.5),0 12px 20px rgba(0,0,0,0.5);}',
        '.mini-card:active{transform:translateY(-1px) scale(0.99);}',
        '.mini-card .ico{height:70px;width:100%;display:flex;align-items:center;justify-content:center;',
        'background:linear-gradient(180deg,#c7ea9d,#a6d377);border:2px solid #55703a;border-radius:10px;overflow:hidden;}',
        '.mini-card .ico img{height:60px;width:auto;max-width:100%;object-fit:contain;image-rendering:auto;filter:drop-shadow(0 2px 2px rgba(20,50,10,0.45));}',
        '.mini-card h3{font-family:"Kaiti SC","STKaiti","KaiTi",serif;font-size:17px;color:#4a3414;margin-top:6px;',
        'letter-spacing:2px;font-weight:900;white-space:nowrap;}',
        '.mini-card .tg{font-size:9.5px;letter-spacing:1.5px;color:#7a5c22;background:rgba(255,255,255,0.5);',
        'border-radius:8px;padding:1px 7px;margin-top:2px;font-family:monospace;font-weight:700;}',
        '.mini-card .tp{font-size:10.5px;line-height:1.35;color:#6d5626;margin-top:5px;padding:0 2px;}',
        '.mini-card .no{position:absolute;left:7px;top:6px;font-size:10px;font-weight:800;color:#8a6a2f;opacity:.7;}',
        '.mini-foot{height:22px;flex:0 0 22px;display:flex;align-items:center;justify-content:center;',
        'color:rgba(255,255,255,0.45);font-size:12px;letter-spacing:1px;}',
        '.mini-stage{position:absolute;inset:0;display:none;background:#0b1508;}',
        '.mini-stage canvas{position:absolute;inset:0;width:900px;height:600px;display:block;}',
        '.mini-top{position:absolute;left:0;top:0;right:0;height:46px;display:flex;align-items:center;',
        'justify-content:space-between;padding:0 12px;pointer-events:none;}',
        '.mini-top .q{pointer-events:auto;background:rgba(20,12,4,0.62);border:2px solid rgba(255,225,150,0.45);',
        'color:#ffe9b8;border-radius:9px;padding:5px 13px;font-size:13.5px;font-weight:800;cursor:pointer;}',
        '.mini-top .q:hover{background:rgba(60,40,10,0.8);}',
        '.mini-top .lg{display:flex;align-items:center;gap:8px;pointer-events:none;}',
        '.mini-top .mu{pointer-events:auto;background:rgba(20,12,4,0.62);border:2px solid rgba(255,225,150,0.45);',
        'color:#ffe9b8;border-radius:9px;padding:5px 12px;font-size:13px;font-weight:800;cursor:pointer;letter-spacing:1px;}',
        '.mini-top .mu:hover{background:rgba(60,40,10,0.8);}',
        '.mini-head .mu{margin-left:auto;background:linear-gradient(180deg,#7a5a2a,#5a3f18);color:#ffe9b8;',
        'border:2px solid #c9a45c;border-radius:10px;padding:7px 14px;font-size:14px;font-weight:800;cursor:pointer;letter-spacing:1px;}',
        '.mini-head .mu:hover{filter:brightness(1.12);}',
        '.mini-head .mu.off{opacity:.62;filter:grayscale(.5);}',
        '.mini-top .nm{color:rgba(255,255,255,0.72);font-size:13px;letter-spacing:2px;}'
    ].join('');

    /* v4.0.153：两个大厅共用一套 DOM —— 只换卡片集合、标题和列数。
       6 个玩法排 3 列 × 2 行，4 个泡泡玩法排 2 列 × 2 行（卡片更大，像精选）。 */
    let lobbyKind = 'all', titleEl = null, subEl = null, muteBtn = null, muteBtn2 = null;
    // v4.0.156：静音开关（大厅 + 关卡各一个按钮，M 键也能切）
    function syncMute() {
        const on = !SFX.isMuted();
        [muteBtn, muteBtn2].forEach(b => {
            if (!b) return;
            b.textContent = on ? '声音 开' : '声音 关';
            b.classList.toggle('off', !on);
        });
    }
    function toggleMute() {
        SFX.toggle();
        syncMute();
        if (!SFX.isMuted()) SFX.click();
    }
    function renderLobby(list, cols) {
        gridEl.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
        gridEl.style.gridTemplateRows = 'repeat(' + Math.ceil(list.length / cols) + ',1fr)';
        gridEl.classList.toggle('lg', cols <= 3);
        gridEl.innerHTML = list.map((g, i) =>
            '<div class="mini-card" data-id="' + g.id + '">' +
            '<span class="no">' + (i + 1 < 10 ? '0' + (i + 1) : i + 1) + '</span>' +
            '<div class="ico"><img src="' + SPR[g.icon] + '" alt="' + g.name + '"' +
            (g.ih ? ' style="height:' + g.ih + 'px"' : '') + '></div>' +
            '<h3>' + g.name + '</h3><div class="tg">' + g.tag + '</div>' +
            '<div class="tp">' + g.tip + '</div></div>'
        ).join('');
    }

    function ensureDom() {
        if (screen) return;
        const host = document.getElementById('game-container') || document.body;
        const st = document.createElement('style');
        st.id = 'mini-style';
        st.textContent = CSS;
        document.head.appendChild(st);

        screen = document.createElement('div');
        screen.id = 'mini-screen';
        screen.innerHTML =
            '<div class="mini-lobby" id="mini-lobby">' +
            '<div class="mini-head"><button class="mb" id="mini-close">← 返回主菜单</button>' +
            '<h2 id="mini-title">后院游乐场</h2><span class="sub" id="mini-sub">6 个玩法 · 随时进来玩一局</span>' +
            '<button class="mu" id="mini-mute-lobby">声音 开</button></div>' +
            '<div class="mini-grid" id="mini-grid"></div>' +
            '<div class="mini-foot">点卡片直接开玩 · M 静音 · ESC 回主菜单</div>' +
            '</div>' +
            '<div class="mini-stage" id="mini-stage">' +
            '<canvas id="mini-canvas" width="900" height="600"></canvas>' +
            '<div class="mini-top"><button class="q" id="mini-quit">← 回大厅 (ESC)</button>' +
            '<div class="lg"><div class="nm" id="mini-name"></div>' +
            '<button class="mu" id="mini-mute">声音 开</button></div></div>' +
            '</div>';
        host.appendChild(screen);

        lobbyEl = screen.querySelector('#mini-lobby');
        gridEl = screen.querySelector('#mini-grid');
        stageEl = screen.querySelector('#mini-stage');
        canvas = screen.querySelector('#mini-canvas');
        nameEl = screen.querySelector('#mini-name');
        ctx = canvas.getContext('2d');

        titleEl = screen.querySelector('#mini-title');
        subEl = screen.querySelector('#mini-sub');
        renderLobby(GAMES, 3);

        muteBtn = screen.querySelector('#mini-mute');
        muteBtn2 = screen.querySelector('#mini-mute-lobby');
        muteBtn.addEventListener('click', toggleMute);
        muteBtn2.addEventListener('click', toggleMute);
        syncMute();

        gridEl.addEventListener('click', e => {
            const card = e.target.closest('.mini-card');
            if (!card) return;
            SFX.unlock();                    // 第一次点击才允许出声（浏览器策略）
            SFX.click();
            openGame(card.dataset.id);
        });
        screen.querySelector('#mini-close').addEventListener('click', () => { SFX.click(); quit(); });
        screen.querySelector('#mini-quit').addEventListener('click', () => { SFX.click(); backToLobby(); });

        canvas.addEventListener('mousedown', e => {
            if (!active) return;
            const p = pos(e);
            if (active.onDown) active.onDown(p.x, p.y);
        });
        canvas.addEventListener('mousemove', e => {
            if (!active) return;
            const p = pos(e);
            if (active.onMove) active.onMove(p.x, p.y);
        });
        canvas.addEventListener('mouseup', () => { if (active && active.onUp) active.onUp(); });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    function pos(e) {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    }

    function normKey(e) {
        const m = {
            ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
            Space: 'space', Escape: 'esc', KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyS: 's',
            KeyR: 'r', KeyN: 'n', KeyP: 'p', Enter: 'enter'
        };
        if (m[e.code]) return m[e.code];
        const k = (e.key || '').toLowerCase();
        if (k === ' ') return 'space';
        if (k === 'arrowleft') return 'left';
        if (k === 'arrowright') return 'right';
        if (k === 'arrowup') return 'up';
        if (k === 'arrowdown') return 'down';
        return k;
    }

    window.addEventListener('keydown', function (e) {
        if (!screen || screen.style.display === 'none') return;
        const k = normKey(e);
        if (['left', 'right', 'up', 'down', 'space'].indexOf(k) >= 0) e.preventDefault();
        e.stopPropagation();
        if (k === 'm') { toggleMute(); return; }
        if (k === 'esc') {
            if (active) backToLobby(); else quit();
            return;
        }
        if (!active) return;
        if (active.over) {
            if (active.overT > 0.45 && (k === 'r' || k === 'space' || k === 'enter')) { active.reset(); return; }
            if (activeMeta && activeMeta.id === 'sokoban' && active.win && k === 'n') {
                const next = (active.idx + 1) % LEVELS.length;
                active.over = false; active.win = false; active.load(next); return;
            }
        }
        if (active.onKey) active.onKey(true, k, e);
    }, true);
    window.addEventListener('keyup', function (e) {
        if (!active) return;
        e.stopPropagation();
        if (active.onKey) active.onKey(false, normKey(e), e);
    }, true);

    function tick(ts) {
        if (!running) return;
        const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
        last = ts;
        if (active) {
            active.t += dt;
            if (active.over) active.overT += dt;
            try { active.update(dt); } catch (err) { console.error('[mini]', (err && err.stack) || err); active.end(false); }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, W, H);
            try { active.draw(); } catch (err) { console.error('[mini draw]', (err && err.stack) || err); }
        }
        raf = requestAnimationFrame(tick);
    }

    function startLoop() {
        if (running) return;
        running = true; last = performance.now();
        raf = requestAnimationFrame(tick);
    }
    function stopLoop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
    }

    function showLobby(kind) {
        ensureDom();
        lobbyKind = kind;
        const bubble = kind === 'bubble';
        titleEl.textContent = bubble ? '猫尾草泡泡工坊' : '后院游乐场';
        subEl.textContent = bubble ? '4 种泡泡玩法 · 同一个炮台，四种规矩' : '6 个玩法 · 随时进来玩一局';
        renderLobby(bubble ? BUBBLE_GAMES : GAMES, bubble ? 2 : 3);
        screen.style.display = 'block';
        lobbyEl.style.display = 'flex';
        stageEl.style.display = 'none';
        active = null; activeMeta = null;
        startLoop();
    }
    function openLobby() { showLobby('all'); }
    function openBubble() { showLobby('bubble'); }

    function openGame(id) {
        ensureDom();
        const meta = ALL_GAMES.filter(g => g.id === id)[0];
        if (!meta) return;
        SFX.unlock();
        screen.style.display = 'block';
        lobbyEl.style.display = 'none';
        stageEl.style.display = 'block';
        nameEl.textContent = meta.name + ' · ESC 回' + (lobbyKind === 'bubble' ? '工坊' : '大厅');
        if (!active || activeMeta !== meta) {
            active = new meta.cls();
            activeMeta = meta;
            active.reset();
        } else {
            active.reset();
        }
        startLoop();
    }

    function backToLobby() {
        active = null; activeMeta = null;
        showLobby(lobbyKind);          // 从工坊进来的回工坊，从游乐场进来的回游乐场
    }

    function quit() {
        active = null; activeMeta = null;
        stopLoop();
        if (screen) screen.style.display = 'none';
    }

    function preload() {
        Object.keys(SPR).forEach(k => {
            const im = new Image();
            im.src = SPR[k];
            _im[k] = im;
        });
    }
    preload();

    window.addEventListener('resize', function () {
        const c = document.getElementById('game-container');
        GAME_SCALE = c ? (c.getBoundingClientRect().width / 900) : 1;
    });

    window.MiniGames = {
        openLobby: openLobby,
        openBubble: openBubble,
        openGame: openGame,
        backToLobby: backToLobby,
        quit: quit,
        games: ALL_GAMES.map(g => ({ id: g.id, name: g.name })),
        miniGames: GAMES.map(g => ({ id: g.id, name: g.name })),
        bubbleGames: BUBBLE_GAMES.map(g => ({ id: g.id, name: g.name })),
        levelCount: LEVELS.length,          // v4.0.139：给验收脚本遍历推箱子关卡用
        get active() { return active; },
        sfx: SFX,                               // v4.0.156：验收脚本用（合成音效无法截图，改查调用）
        get isOpen() { return !!(screen && screen.style.display === 'block'); }
    };
})();
