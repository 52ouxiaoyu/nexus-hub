/* 雷霆之翼 Thunder Wing — 长线牵引：每日挑战与成就
 *
 * 每日挑战：用日期做种子，每天固定一套词条池（6 选），所有玩家当天面对同一套
 *   随机 —— 既保证公平可比，又让每天的 build 路线不一样。当天最佳分单独记录。
 * 成就：给重复游玩一个明确目标，结算时即时反馈新解锁项。
 */
(function () {
  const TW = window.TW || (window.TW = {});
  const AKEY = 'tw_ach', DKEY = 'tw_daily';

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayStr(d) {
    d = d || new Date();
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /* mulberry32：同一种子必定产出同一序列，保证「当天所有人同一套随机」 */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const ACH = [
    { id: 'clear1', name: '首捷', desc: '通关故事全部 5 关', check: (s) => s.win },
    { id: 'combo30', name: '连击大师', desc: '单局达成 30 连击', check: (s) => s.maxCombo >= 30 },
    { id: 'graze200', name: '刀尖起舞', desc: '单局擦弹 200 次', check: (s) => s.graze >= 200 },
    { id: 'lv10', name: '军火库', desc: '单局升到 10 级', check: (s) => s.level >= 10 },
    { id: 'nodeath', name: '零失误', desc: '不掉一命通关', check: (s) => s.win && s.deaths === 0 },
    { id: 'od3', name: '超载狂人', desc: '单局触发 3 次超载', check: (s) => s.odTriggers >= 3 },
    { id: 'endless10', name: '无尽勇者', desc: '无尽抵达第 10 波', check: (s) => s.wave >= 10 },
    { id: 'score500k', name: '五十万俱乐部', desc: '单局得分突破 50 万', check: (s) => s.score >= 500000 },
  ];

  function readJSON(k, dflt) {
    try { return JSON.parse(localStorage.getItem(k) || dflt); } catch (e) { return JSON.parse(dflt); }
  }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 隐私模式下忽略 */ } }

  TW.Meta = {
    ACH: ACH,
    todayStr: todayStr,

    unlocked() { return readJSON(AKEY, '{}'); },
    isUnlocked(id) { return !!this.unlocked()[id]; },

    /* 结算时调用，返回本局新解锁的成就 */
    check(st) {
      const u = this.unlocked(), fresh = [];
      for (let i = 0; i < ACH.length; i++) {
        const a = ACH[i];
        if (u[a.id]) continue;
        let pass = false;
        try { pass = !!a.check(st); } catch (e) { pass = false; }
        if (pass) { u[a.id] = 1; fresh.push(a); }
      }
      if (fresh.length) writeJSON(AKEY, u);
      return fresh;
    },

    /* 当天固定的 6 个词条（所有玩家一致） */
    dailyPool(dateStr) {
      const r = rng(hash(dateStr || todayStr()));
      const all = (TW.PERKS || []).slice();
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        const t = all[i]; all[i] = all[j]; all[j] = t;
      }
      return all.slice(0, 6).map((p) => p.id);
    },
    /* 当天固定的敌人强度档位：1.0 - 1.35 */
    dailyPower(dateStr) {
      const r = rng(hash((dateStr || todayStr()) + '#p'));
      return 1 + Math.round(r() * 7) / 20;
    },

    dailyRecord() {
      const all = readJSON(DKEY, '{}');
      return all[todayStr()] || { best: 0, wave: 0 };
    },
    submitDaily(score, wave) {
      const all = readJSON(DKEY, '{}');
      const k = todayStr();
      const cur = all[k] || { best: 0, wave: 0 };
      all[k] = { best: Math.max(cur.best, score), wave: Math.max(cur.wave, wave || 0) };
      writeJSON(DKEY, all);
      return all[k].best > cur.best;
    },
  };
})();
