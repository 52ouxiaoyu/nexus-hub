/* =============================================================================
 * 语文专项学习 · 纯静态本地 API 层（api-shim.js）
 * -----------------------------------------------------------------------------
 * 原项目 Chinese_study 是 FastAPI + SQLite 全栈应用。
 * 这里把 21 个 REST 接口与 backend/app/core/engine.py 的全部算法移植到浏览器：
 *   - 数据源：data/seed.js（由 chinese_blitz.db 导出的初始快照）
 *   - 存储：localStorage（换设备/清缓存会回到初始快照）
 *   - 拦截方式：覆写 window.fetch，遇到 /api/* 就地计算并返回 Response
 * 前端 app.js 无需任何改动即可运行。
 * ========================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "chinese_blitz_state_v1";
  const SEED = window.__CB_SEED__;
  if (!SEED || !SEED.tables) {
    console.error("[语文专项] 未找到种子数据 data/seed.js");
    return;
  }

  // ---------------------------------------------------------------------------
  // 通用工具
  // ---------------------------------------------------------------------------

  const clone = (o) => JSON.parse(JSON.stringify(o));

  // 模拟 Python 的 round()（银行家舍入），保证分值精度与原版一致
  function pyRound(x, nd = 0) {
    const m = Math.pow(10, nd);
    const scaled = Number(x) * m;
    const f = Math.floor(scaled);
    const diff = scaled - f;
    let r;
    if (Math.abs(diff - 0.5) < 1e-9) r = f % 2 === 0 ? f : f + 1;
    else r = Math.round(scaled);
    return r / m;
  }

  const pad2 = (n) => String(n).padStart(2, "0");

  function fmtDate(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function todayStr() {
    return fmtDate(new Date());
  }

  function nowStamp() {
    const d = new Date();
    return `${fmtDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }

  function addDays(base, days) {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + days);
    return fmtDate(d);
  }

  // 稳定排序：keys = [[field, dir], ...]，dir: 1 升 / -1 降
  function sortRows(rows, keys) {
    return rows
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        for (const [field, dir] of keys) {
          let av = a.r[field];
          let bv = b.r[field];
          if (av === null || av === undefined) av = "";
          if (bv === null || bv === undefined) bv = "";
          if (typeof av === "number" && typeof bv === "number") {
            if (av !== bv) return (av - bv) * dir;
          } else {
            const as = String(av);
            const bs = String(bv);
            if (as !== bs) return (as < bs ? -1 : 1) * dir;
          }
        }
        return a.i - b.i;
      })
      .map((x) => x.r);
  }

  const num = (v, dflt = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
  };

  function safeJson(text, dflt) {
    try {
      return text ? JSON.parse(text) : dflt;
    } catch (e) {
      return dflt;
    }
  }

  // ---------------------------------------------------------------------------
  // 数据仓库（localStorage 持久化）
  // ---------------------------------------------------------------------------

  const DB = { tables: null, seq: null, savedAt: null };

  function freshState() {
    return { tables: clone(SEED.tables), seq: clone(SEED.seq), savedAt: null };
  }

  // v2.0.1 之前写进 localStorage 的存档里带着姓名/校名/本地路径。
  // 已经在旧版打开过页面的人，存档还在浏览器里，所以读取时先做一次清洗再解析。
  // 旧存档清洗表：规则用 \uXXXX 转义书写，避免真实姓名/校名以明文形式留在源码里
  const LEGACY_SCRUB = [
    [/\uff0826-1\)26\u7ea7\u897f\u6eaa\+\u6587\u6e0a\u9ad8\u4e0010\u6708\u6708\u8003/g, "\u9ad8\u4e0010\u6708\u6708\u8003"],
    [/26\u7ea7\u897f\u6eaa\+\u6587\u6e0a\u9ad8\u4e00\u6708\u8003/g, "\u9ad8\u4e0010\u6708\u6708\u8003"],
    [/26\u7ea7\u5b66\u519b\u9ad8\u4e00\u6708\u8003\u771f\u9898/g, "\u9ad8\u4e0010\u6708\u6708\u8003\u771f\u9898"],
    [/2511\u5b66\u519b\u4e2d\u5b66\u9ad8\u4e00\u671f\u4e2d\u6a21\u62df\u81ea\u6d4b\u5377/g, "\u9ad8\u4e00\u671f\u4e2d\u6a21\u62df\u81ea\u6d4b\u5377"],
    [/\u5b66\u519b\u897f\u6eaa\+\u6587\u6e0a\u8054\u8003/g, "\u7701\u91cd\u70b9\u6821\u9645\u8054\u8003"],
    [/\u5b66\u519b\u671f\u4e2d\u6a21\u62df\u5377/g, "\u671f\u4e2d\u6a21\u62df\u81ea\u6d4b\u5377"],
    [/\u676d\u5dde\u5b66\u519b\u4e2d\u5b6626\u7ea7\u9ad8\u4e00\u5165\u5b66\u6478\u5e95\u6d4b/g, "\u9ad8\u4e00\u5165\u5b66\u6478\u5e95\u6d4b"],
    [/\u676d\u5dde\u5b66\u519b\u4e2d\u5b66/g, "\u67d0\u7701\u91cd\u70b9\u4e2d\u5b66"],
    [/\uff08\u897f\u6eaa\/\u6587\u6e0a\u8054\u8003\uff09/g, ""],
    [/\u897f\u6eaa\+\u6587\u6e0a/g, "10\u6708\u6708\u8003"],
    [/\u5434\u60a0\uff08\u597d\u5927\u513f\uff09/g, "\u5907\u8003\u8005"],
    [/\u597d\u5927\u513f\uff08\u5434\u60a0\uff09\u00b7 /g, ""],
    [/\u597d\u5927\u513f\u00b7/g, ""],
    [/\u8003\u751f\uff1a\u5434\u60a0\uff0818\u73ed\uff09\u3002/g, "\u8003\u751f\uff1a\u672c\u4eba\u3002"],
    [/\u5434\u60a0/g, "\u8003\u751f"],
    [/2026\u7ea7\u9ad8\u4e00\uff0818\uff09\u73ed/g, "2026\u7ea7\u9ad8\u4e00"],
    [/2026\u7ea7\u9ad8\u4e00\(18\)\u73ed/g, "2026\u7ea7\u9ad8\u4e00"],
    [/26\u7ea7\u9ad8\u4e00\(18\)\u73ed/g, "2026\u7ea7\u9ad8\u4e00"],
    [/26\u7ea7\u9ad8\u4e0018\u73ed/g, "2026\u7ea7\u9ad8\u4e00"],
    [/"(source_file_path|source_pdf_path|answer_pdf_path)":\s*"[^"]*"/g, '"$1": null'],
  ];

  function scrubLegacy(raw) {
    let out = raw;
    for (let i = 0; i < LEGACY_SCRUB.length; i += 1) {
      out = out.replace(LEGACY_SCRUB[i][0], LEGACY_SCRUB[i][1]);
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // v2.1.0 数据校正：上游 demo 里有两场根本没考过的"试卷"，以及 12 张空壳错题卡。
  // 老用户存档里同样有，进页面时一次性清掉（用完打标记，不会再跑第二遍）。
  // ---------------------------------------------------------------------------
  const DEMO_EXAM_NAMES = ["高一入学摸底测", "高一期中模拟自测卷"];
  const MIGRATE_FLAG = "chinese_blitz_migrate_v210";

  function isShellCard(c) {
    return !String(c.question_stem || "").trim() && !String(c.error_reflection || "").trim();
  }

  function migratePruneDemo() {
    let done = null;
    try {
      done = localStorage.getItem(MIGRATE_FLAG);
    } catch (e) {}
    if (done) return false;

    const tables = DB.tables || {};
    const exams = tables.exams || [];
    const dropIds = exams
      .filter((e) => DEMO_EXAM_NAMES.includes(String(e.exam_name || "").trim()))
      .map((e) => e.id);

    if (dropIds.length) {
      tables.exams = exams.filter((e) => !dropIds.includes(e.id));
      tables.exam_module_scores = (tables.exam_module_scores || []).filter(
        (m) => !dropIds.includes(m.exam_id)
      );
    }

    const cards = tables.progress_cards || [];
    const realCards = cards.filter((c) => !isShellCard(c));
    if (realCards.length !== cards.length) tables.progress_cards = realCards;

    // 爆破战役的得分率改为真卷实测值
    const rate = {};
    (tables.exam_module_scores || []).forEach((m) => {
      rate[m.module_code] = m.score_rate;
    });
    (tables.blitz_campaigns || []).forEach((c) => {
      if (rate[c.module_code] !== undefined) c.current_score_rate = rate[c.module_code];
    });

    try {
      localStorage.setItem(MIGRATE_FLAG, "1");
    } catch (e) {}
    return dropIds.length > 0 || realCards.length !== cards.length;
  }

  // ---------------------------------------------------------------------------
  // v2.4.2 数据校正：旧存档里每一行的「实际耗时」都是上游编的（19/18/16/9/2/16/50），
  // 全项目从来没有哪个界面让用户填过这个数——它不该存在。实测值只能来自真实记录，
  // 没有就是 0。这里一次性清零；将来真加「记时」功能，用户填的数不会被这条规则再碰。
  // ---------------------------------------------------------------------------
  const PACE_FLAG = "chinese_blitz_migrate_v242";

  function migrateDropFakePace() {
    let done = null;
    try {
      done = localStorage.getItem(PACE_FLAG);
    } catch (e) {}
    if (done) return false;

    let changed = false;
    ((DB.tables || {}).exam_module_scores || []).forEach((m) => {
      if (num(m.actual_minutes) > 0) {
        m.actual_minutes = 0;
        changed = true;
      }
    });
    try {
      localStorage.setItem(PACE_FLAG, "1");
    } catch (e) {}
    return changed;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const clean = scrubLegacy(raw);
        const parsed = JSON.parse(clean);
        if (parsed && parsed.tables && parsed.seq) {
          Object.assign(DB, parsed);
          const migrated = migratePruneDemo();
          const paceFixed = migrateDropFakePace();
          if (clean !== raw || migrated || paceFixed) saveState(); // 清洗/校正过就立刻写回
          return;
        }
      }
    } catch (e) {
      console.warn("[语文专项] 读取本地存档失败，使用初始快照：", e);
    }
    Object.assign(DB, freshState());
    migratePruneDemo();
    migrateDropFakePace();
  }

  let persistWarned = false;
  function saveState() {
    DB.savedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
    } catch (e) {
      if (!persistWarned) {
        persistWarned = true;
        console.warn("[语文专项] 本地存档写入失败（可能为隐私模式），本次改动仅保存在内存中。", e);
      }
    }
  }

  const T = (name) => DB.tables[name] || (DB.tables[name] = []);

  // ---------------------------------------------------------------------------
  // 精编题库（data/bank.js）合并入 questions 表
  // 幂等：按 id 去重；旧存档升级到新版时也会自动补齐，不需要清缓存
  // ---------------------------------------------------------------------------
  function bankToQuestion(b) {
    return {
      id: b.id,
      source_name: b.source || "精编题库",
      year: null,
      module_code: b.module_code,
      module_name: b.module_name,
      sub_type: b.sub_type || "",
      passage_title: b.passage_title || "",
      passage_author: b.passage_author || "",
      passage_content: b.passage_content || "",
      passage_notes: b.passage_notes || "",
      question_no: b.question_no || "",
      question_stem: b.question_stem,
      options_json: b.options && b.options.length ? JSON.stringify(b.options) : null,
      max_score: b.max_score,
      standard_answer: b.standard_answer,
      scoring_points_json: JSON.stringify(b.rubric || []),
      poetry_10keys_json: null,
      trap_types_json: JSON.stringify(b.trap_types || []),
      recommended_minutes: b.recommended_minutes || 5,
      source_file_path: null,
      is_bank: 1,
    };
  }

  function mergeBank() {
    const bank = window.__CB_BANK__ || [];
    if (!bank.length) return;
    const existing = new Set(T("questions").map((q) => q.id));
    let added = 0;
    let maxId = num(DB.seq.questions);
    for (const b of bank) {
      if (existing.has(b.id)) continue;
      T("questions").push(bankToQuestion(b));
      maxId = Math.max(maxId, b.id);
      added += 1;
    }
    if (added) {
      DB.seq.questions = maxId;
      saveState();
    }
  }

  function nextId(name) {
    DB.seq[name] = (DB.seq[name] || 0) + 1;
    return DB.seq[name];
  }

  // 对外：重置为初始快照
  window.cbResetAll = function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    Object.assign(DB, freshState());
    saveState();
    location.reload();
  };

  // ---------------------------------------------------------------------------
  // 引擎常量（原样移植自 engine.py / main.py）
  // ---------------------------------------------------------------------------

  const STAGE_LABELS = {
    "0_NEW": "新建待首刷",
    "1_REVIEW_DAY_1": "第1天·首轮遮罩重做",
    "2_REVIEW_DAY_2": "第2天·二轮遮罩巩固",
    "3_REVIEW_DAY_7": "第7天·周度抗遗忘抽检",
    "4_REVIEW_DAY_15": "第15天·满月终审大考",
    "5_STRUCK_OUT_MASTERED": "红笔划掉·已彻底内化（本子变薄）",
    "9_COGNITIVE_ALERT": "红牌预警·连续3次卡壳（需专项重塑）",
  };

  const BANNED_SHALLOW_EXCUSES = [
    "粗心", "马虎", "大意", "没看清", "看错了", "看漏了",
    "手滑", "不小心", "涂错", "忘写了", "没注意", "运气不好",
    "状态不好", "太困了", "没发挥好", "差不多", "不知道", "随便选",
  ];

  const EXECUTABLE_WARNING_TRIGGERS = [
    "只要", "凡是", "遇到", "看到", "先圈", "先看", "先拆",
    "必须", "必答", "切记", "严禁", "警惕", "一旦", "若题干", "第一步",
  ];

  const COLLOQUIAL_TO_ACADEMIC_MAP = [
    { colloquial: "很有气势", academic: "雄浑豪放 / 气势磅礴，极具艺术感染力" },
    { colloquial: "对比了一下", academic: "运用反衬/今昔对比手法，鲜明凸显……" },
    { colloquial: "写得很细", academic: "采用白描与细节刻画，工笔勾勒出……" },
    { colloquial: "表达了难过", academic: "抒发了壮志难酬的孤愤与深沉的家国忧思" },
    { colloquial: "表达了开心", academic: "流露出闲适旷达、超然物外的愉悦心境" },
    { colloquial: "承上启下", academic: "总结上文……的伏笔，引出下文……的叙事主线" },
    { colloquial: "吸引读者", academic: "制造叙事悬念，激发读者阅读张力，避免平铺直叙" },
    { colloquial: "环境很好看", academic: "渲染清幽孤寂/雄奇苍凉的意境氛围，烘托人物心境" },
    { colloquial: "说得很有道理", academic: "论证严密，体现辩证唯物的思辨深度与现实针对性" },
    { colloquial: "首尾呼应", academic: "首尾圆合，使情感脉络形成闭环，深化主旨意蕴" },
  ];

  const ESSAY_BANNED_CLICHES = [
    { phrase: "随着时代的发展", reason: "阅卷场一号烂大街废话开头，直接拉低起评档次，请改用具体场景或矛盾切入" },
    { phrase: "随着社会的进步", reason: "空洞套话，毫无信息增量，建议直奔核心论点" },
    { phrase: "众所周知", reason: "伪论证连接词，显得说理武断且平庸" },
    { phrase: "俗话说得好", reason: "口语化严重，破坏议论文庄重典雅的文风" },
    { phrase: "究其原因主要有以下三点", reason: "公文报告腔，缺乏文学性与思辨张力" },
    { phrase: "总而言之", reason: "机械结尾词，建议用回扣材料关键词的升华句替代" },
    { phrase: "综上所述", reason: "调查报告体，不宜作为文学性议论文收束" },
  ];

  const HISTORICAL_FACT_TRAPS = [
    { keywords: ["史记", "编年体"], warning: "【史实硬伤】《史记》是我国第一部“纪传体通史”！《资治通鉴》才是编年体通史。" },
    { keywords: ["蔡伦", "发明造纸"], warning: "【史实硬伤】西汉早已有麻纸，东汉蔡伦是“改进造纸术”（蔡侯纸），切勿写成“发明造纸术”！" },
    { keywords: ["瓦特", "发明蒸汽机"], warning: "【史实硬伤】瓦特是“改良蒸汽机”（纽科门早先发明），且瓦特父亲是造船与科学仪器商，非贫苦木工！" },
    { keywords: ["司马迁", "流放"], warning: "【史实硬伤】司马迁因李陵之祸遭受的是“腐刑（宫刑）”与下狱，而非流放！" },
    { keywords: ["苏轼", "岳阳楼记"], warning: "【史实硬伤】《岳阳楼记》作者是北宋范仲淹！苏轼在黄州写的是《前/后赤壁赋》《念奴娇·赤壁怀古》。" },
    { keywords: ["屈原", "黄河"], warning: "【史实硬伤】屈原放逐后自沉于湖南“汨罗江”，非黄河！" },
  ];

  const INFO_READING_9_TRAPS = [
    { code: "T1", name: "偷换概念", trigger: "选项主语/宾语与原文核心词有1字之差", counter: "圈出选项主语与原文逐字比对，警惕代词指代移位" },
    { code: "T2", name: "以偏概全", trigger: "原文为“部分/大多/有时”，选项变为“全部/所有/总是”", counter: "对范围词与频率词画双横线，绝对化表述90%有诈" },
    { code: "T3", name: "或然变必然", trigger: "原文为“可能/或许/有望/趋势”，选项变为“必定/已经/势必”", counter: "把情态副词框起来，核对推断是否超前" },
    { code: "T4", name: "未然变已然", trigger: "原文为“将要/正在探索/尚待”，选项变为“已实现/已经完成”", counter: "严格区分时态助词（将、正、已、曾）" },
    { code: "T5", name: "强加因果/因果倒置", trigger: "选项出现“因此/之所以/导致/使得”", counter: "回原文定位前后分句，看原本是并列关系还是真因果" },
    { code: "T6", name: "混淆充分必要条件", trigger: "选项出现“只要…就…”“只有…才…”“除非…否则…”", counter: "核对原文条件逻辑词，绝不轻易放过逻辑关联词改写" },
    { code: "T7", name: "无中生有/于文无据", trigger: "选项表述看似符合常识，但原文只字未提", counter: "坚持“原文主义”，哪怕选项在现实中正确，原文没交集也判错" },
    { code: "T8", name: "曲解文意/断章取义", trigger: "掐头去尾漏掉原文的前提限定状语", counter: "回到原文看整句及前一句的限定条件" },
    { code: "T9", name: "张冠李戴/时空错位", trigger: "把甲学者的观点或A朝代的特征安到乙身上", counter: "在草稿纸或卷面上用斜线切分不同陈述对象" },
  ];

  const LITERARY_11_HIGH_ELEMENTS = [
    { id: 1, element: "叙述视角与人称转换", sub_types: "第一人称（有限视角：真实亲切、制造悬念）/ 第三人称（全知视角：自由宏阔）/ 儿童视角（纯真反衬成人世界复杂残酷）", answer_template: "文本采用【……视角】，从【表层情节】拉近叙述距离、增强真实感；在【中层人物】上侧面烘托主人公……形象；在【深层主旨】上以纯真/冷静语调反衬出……的时代悲欢。" },
    { id: 2, element: "叙事节奏（加速与延缓/摇摆）", sub_types: "叙事延缓（插入环境描写/往事回忆，拉长审美期待）/ 叙事摇摆（情节一波三折，在希望与绝望间震荡）", answer_template: "此处插入【……内容】并非闲笔，而是构成了【叙事延缓】，暂时阻断紧张的主线冲突，既蓄积了读者的心理期待，又为下文……的高潮爆发蓄势。" },
    { id: 3, element: "历史/回忆与现实交织", sub_types: "双时空穿插 / 历史典故映射现实", answer_template: "通过【历史/回忆】与【当下现实】的跨时空交织，拓展了小说的叙事疆域与历史纵深感，避免平铺直叙，在古今对照中凸显……的永恒精神。" },
    { id: 4, element: "物象/核心道具意蕴", sub_types: "线索物象 / 象征物象（如《百合花》的被子、老物件、风雪）", answer_template: "①结构上作为贯穿全文的线索，串联起……情节；②人物上见证并外化了主人公从……到……的心理蜕变；③主旨上凝聚着……的文化品格与生命哲思。" },
    { id: 5, element: "环境描写的四重张力", sub_types: "自然景物描写 / 社会风俗白描 / 诗化风景", answer_template: "【环境本身】交代时令地域特征，渲染……氛围；【指向人物】烘托人物……的心境；【指向情节】为下文……埋下伏笔；【指向主题】构建诗意/苍凉的审美意境。" },
    { id: 6, element: "留白艺术与冰山理论", sub_types: "言有尽而意无穷 / 略写高潮结局 / 开放式结尾", answer_template: "作者运用“冰山理论”刻意对……作留白处理，将汹涌的情感克制在平静克制的叙述之下，赋予读者广阔的审美想象空间，收到余音绕梁之效。" },
    { id: 7, element: "诗化小说/散文化笔法", sub_types: "淡化激烈戏剧冲突 / 重意境营造 / 节奏舒缓如散文诗", answer_template: "本文突破传统小说重强情节的模式，呈现鲜明的【散文化/诗化小说】特征：淡化戏剧冲突，以心境流动统摄全篇，语言清丽隽永，富于抒情张力。" },
    { id: 8, element: "场景（圆形舞台 vs 流动镜头）", sub_types: "固定空间群像浓缩（如茶馆、渡口）/ 空间转换移步换景", answer_template: "将【……空间】作为浓缩人生百态的微缩舞台，通过各色人物的言行碰撞，于方寸之间折射出广阔的社会历史风貌。" },
    { id: 9, element: "次要人物/群像烘托", sub_types: "对比反衬 / 见证叙述人 / 群体环境烘托", answer_template: "次要人物【……】既是故事的亲历见证者，增强叙事客观性；又与主人公形成【对比/正衬】，立体丰满地凸显出主人公……的精神光辉。" },
    { id: 10, element: "语言风格与语体杂糅", sub_types: "方言地域味 / 文白相间典雅风 / 幽默反讽 / 短句铿锵", answer_template: "全文语言兼具【质朴醇厚的地域方言色彩】与【灵动凝练的文学张力】，句式长短交错，极具生活气息与现场还原感。" },
    { id: 11, element: "荒诞变形与魔幻现实", sub_types: "夸张变形 / 超现实梦境 / 物我互化", answer_template: "以看似荒诞不经的超现实笔法包裹最深沉的现实思考，打破日常经验的麻木感，尖锐揭示出……的人性困境或生存悖论。" },
  ];

  const THREE_LAYER_SCAFFOLD = {
    layer1_surface: {
      title: "第一层：表层（情节与文本事实）",
      guide: "用原文词句概括“写了什么事 / 景物有什么外在特点 / 在结构上起什么过渡铺垫作用”。",
      starter: "在情节与内容上，写出了……，交代了……背景，为下文……作铺垫。",
    },
    layer2_middle: {
      title: "第二层：中层（人物形象与艺术手法）",
      guide: "指出运用了什么叙事视角/描写手法，折射出人物怎样的心理波澜或性格侧面。",
      starter: "在人物与手法上，运用了……（细节/对比/有限视角/叙事延缓），生动刻画出主人公……的心境与……形象。",
    },
    layer3_deep: {
      title: "第三层：深层（时代主旨与审美意蕴）",
      guide: "上升到人性的光辉、时代历史沧桑、文化哲思或读者的阅读审美张力。",
      starter: "在主旨与审美上，深化了……的生命哲思/家国情怀，赋予文本隽永的诗化意蕴，引发读者对……的深思。",
    },
  };

  // 词条枚举的中文展示名（数据里存的是英文枚举）
  const WORD_TYPE_LABELS = { REAL_WORD: "120 高频实词", FUNC_WORD: "18 核心虚词", ANCIENT_MODERN: "古今异义" };
  const FREQ_TIER_LABELS = { T0: "T0 必考级", TEXTBOOK: "课内母句" };

  const CLASSICAL_SCAFFOLDS = {
    six_char_translation: [
      { char: "留", desc: "国号、年号、地名、人名、官名、器物名原样保留，切勿硬译" },
      { char: "替", desc: "用现代汉语双音节词替换单音节古汉语实词（如“妻子”→“妻子儿女”）" },
      { char: "调", desc: "调整倒装语序（宾语前置、状语后置、定语后置、谓语前置）" },
      { char: "补", desc: "补充文言省略成分（省略主语、省略谓语、省略介词“于/以”或宾语“之”）" },
      { char: "删", desc: "删去偏义复词中陪衬字或纯粹凑音节/起连接作用的发语词、助词（如“夫、盖、之”）" },
      { char: "贯", desc: "结合上下文语境疏通句意，确保合乎事理逻辑" },
    ],
    seven_inference_methods: [
      { method: "1. 字形推断法", tip: "禾旁关庄稼、贝旁关钱财、目旁关眼看、月(肉)旁关躯体、言旁关言语" },
      { method: "2. 对称结构互文法", tip: "文言文好骈偶对仗，上下句相同位置的字往往同义或反义（如“亡国破家”：亡=破）" },
      { method: "3. 语法成分定位法", tip: "处于主宾位置必为名词/代词；处于谓语位置必为动词/形容词；紧贴动词前必为状语" },
      { method: "4. 成语联想迁移法", tip: "用熟知成语反推（如“势拔五岳掩赤城”联想“出类拔萃”，拔=超出）" },
      { method: "5. 教材母句迁移法", tip: "高考课外文言实词 85% 源自课内必修篇目（如《劝学》《师说》《赤壁赋》《鸿门宴》）" },
      { method: "6. 语境事理推断法", tip: "结合传主品行与前后因果推断褒贬与行为走向" },
      { method: "7. 通假音近推断法", tip: "本字按字面讲不通时，优先考虑同音或声旁相同的通假字" },
    ],
  };

  const ROI_COEFFICIENTS = {
    MOD_DICTATION: { roi_weight: 1.45, difficulty: "极易见效（死磕必拿满分）", recommended_days: 7 },
    MOD_INFO_READ: { roi_weight: 1.38, difficulty: "高性价比（9大设误套路极固定）", recommended_days: 14 },
    MOD_CLASSICAL: { roi_weight: 1.25, difficulty: "中高性价比（120实词+六字翻译法）", recommended_days: 14 },
    MOD_LANG_USE: { roi_weight: 1.22, difficulty: "高性价比（成语/病句/补写题型固定）", recommended_days: 10 },
    MOD_POETRY: { roi_weight: 1.18, difficulty: "中等（十把钥匙+表深双层答题）", recommended_days: 12 },
    MOD_LIT_READ: { roi_weight: 1.10, difficulty: "中高（需掌握表-中-深三层与11大元素）", recommended_days: 14 },
    MOD_ESSAY: { roi_weight: 1.30, difficulty: "保底48+见效快（卷面+四步法主体段）", recommended_days: 15 },
  };

  // ---------------------------------------------------------------------------
  // 引擎 1：认知反思门禁
  // ---------------------------------------------------------------------------

  function charNgrams(text, n) {
    const cleaned = String(text || "").replace(/\s+|[^\u4e00-\u9fa5a-zA-Z0-9]/g, "");
    if (cleaned.length < n) return cleaned ? new Set([cleaned]) : new Set();
    const out = new Set();
    for (let i = 0; i <= cleaned.length - n; i++) out.add(cleaned.slice(i, i + n));
    return out;
  }

  function computeTextSimilarity(a, b) {
    const sa = charNgrams(a, 3);
    const sb = charNgrams(b, 3);
    if (sa.size === 0 || sb.size === 0) return 0;
    let inter = 0;
    sa.forEach((g) => {
      if (sb.has(g)) inter++;
    });
    const union = sa.size + sb.size - inter;
    return union > 0 ? pyRound(inter / union, 3) : 0;
  }

  function validateProgressCardSubmission(p) {
    const errors = [];
    const warnings = [];

    const hits = BANNED_SHALLOW_EXCUSES.filter((w) => (p.error_reason_reflection || "").includes(w));
    if (hits.length) {
      errors.push(
        `【认知门禁拦截】错因反思中检测到禁词：${hits.join(", ")}！` +
          "世界上没有“粗心”，只有“概念边界不清/审题未圈限定词/采分维度缺失”。请具体写出你当时哪一步思维断链。"
      );
    }

    if ((p.error_reason_reflection || "").trim().length < 10) {
      errors.push("【认知门禁拦截】错因反思过短（需 ≥10 字），请写明：当时为什么这样想？漏掉了题干哪个词或哪个答题角度？");
    }

    if ((p.key_stem_snippet || "").trim().length > 90) {
      warnings.push("【防罚抄提醒】关键题干摘要超过 90 字！活页进步本严禁抄写大段原文，只需摘录“题干设问词+陷阱原句”即可。");
    }

    const sim = computeTextSimilarity(p.standard_right_answer, p.knowledge_point_summary);
    if ((p.standard_right_answer || "").length > 20 && sim > 0.78) {
      errors.push(
        `【防机械抄写拦截】你的“核心知识点总结”与标准答案重合度高达 ${Math.trunc(sim * 100)}%！` +
          "请勿当文字搬运工，用自己的话把通用做题规律浓缩在 35 字以内。"
      );
    }

    const hasTrigger = EXECUTABLE_WARNING_TRIGGERS.some((t) => (p.next_time_warning || "").includes(t));
    if (!hasTrigger && (p.next_time_warning || "").trim().length < 8) {
      warnings.push("【警戒指令升级建议】建议使用“只要看到……先圈……必答……”的条件反射句式，考前 15 分钟扫读才最具杀伤力。");
    }

    return { passed: errors.length === 0, errors, warnings, similarity_with_standard: sim };
  }

  // ---------------------------------------------------------------------------
  // 引擎 2：1-2-7-15 遮罩复盘状态机
  // ---------------------------------------------------------------------------

  function computeNextReviewState(currentStage, isPassed, failCount, passCount, today) {
    const baseDate = today ? new Date(today + "T00:00:00") : new Date();
    let fc = num(failCount);
    let pc = num(passCount);
    let nextStage;
    let nextDate;
    let struckOut = false;
    let message;

    if (isPassed) {
      pc += 1;
      const transitions = {
        "0_NEW": ["1_REVIEW_DAY_1", 1],
        "1_REVIEW_DAY_1": ["2_REVIEW_DAY_2", 2],
        "2_REVIEW_DAY_2": ["3_REVIEW_DAY_7", 5],
        "3_REVIEW_DAY_7": ["4_REVIEW_DAY_15", 8],
        "4_REVIEW_DAY_15": ["5_STRUCK_OUT_MASTERED", 3650],
        "9_COGNITIVE_ALERT": ["2_REVIEW_DAY_2", 2],
        "5_STRUCK_OUT_MASTERED": ["5_STRUCK_OUT_MASTERED", 3650],
      };
      const tr = transitions[currentStage] || ["2_REVIEW_DAY_2", 2];
      nextStage = tr[0];
      nextDate = nextStage === "5_STRUCK_OUT_MASTERED" ? "2099-12-31" : addDays(baseDate, tr[1]);
      struckOut = nextStage === "5_STRUCK_OUT_MASTERED";
      message = struckOut
        ? "🎉 恭喜！该卡已完成 1-2-7-15 四轮抗遗忘闭环，正式【红笔划掉】，活页本厚度 -1！"
        : `✅ 遮罩复盘通关！已晋级至【${STAGE_LABELS[nextStage] || nextStage}】，下次抽检日期：${nextDate}。`;
    } else {
      fc += 1;
      nextStage = fc >= 3 ? "9_COGNITIVE_ALERT" : "1_REVIEW_DAY_1";
      nextDate = addDays(baseDate, 1);
      struckOut = false;
      message =
        nextStage === "9_COGNITIVE_ALERT"
          ? `🚨 红牌认知预警！该题已累计复盘失败 ${fc} 次，说明底层概念仍未打通，已列入【红牌重灾区】，明日必须重做 3 道同类母题！`
          : `⚠️ 本次复盘未完全命中采分点，进度重置回【第1天·首轮遮罩重做】（明日 ${nextDate} 再战）。`;
    }

    return {
      stage_before: currentStage,
      stage_after: nextStage,
      stage_after_label: STAGE_LABELS[nextStage] || nextStage,
      next_review_date: nextDate,
      fail_count: fc,
      pass_count: pc,
      struck_out: struckOut,
      is_red_alert: nextStage === "9_COGNITIVE_ALERT",
      message,
    };
  }

  // ---------------------------------------------------------------------------
  // 引擎 3：三维采分点对标
  // ---------------------------------------------------------------------------

  function analyze3dAnswerDiff(studentAnswer, standardAnswer, scoringPointsJson, maxScore) {
    const scoringPoints = safeJson(scoringPointsJson, []) || [];
    const max_score = num(maxScore);
    const studentClean = String(studentAnswer || "").trim();

    const pointResults = [];
    let earned = 0;
    const missingPoints = [];
    const hitPoints = [];

    const stdRaw = String(standardAnswer || "").trim().toUpperCase();
    if (max_score <= 3 && /^[A-D]$/.test(stdRaw)) {
      const stdLetter = stdRaw;
      const m = studentClean.toUpperCase().match(/[A-D]/);
      const stuLetter = m ? m[0] : "";
      const isRight = stuLetter === stdLetter;
      earned = isRight ? max_score : 0;
      for (const sp of scoringPoints) {
        pointResults.push({
          point: sp.point || "",
          score: sp.score !== undefined ? sp.score : max_score,
          hit: isRight,
          matched_keywords: isRight ? [stdLetter] : [],
          missing_keywords: isRight ? [] : sp.keywords || [stdLetter],
        });
      }
      if (!isRight) {
        missingPoints.push(`正确选项应为 ${stdLetter}（你的选择：${stuLetter || "未作答"}）`);
      }
    } else {
      for (const sp of scoringPoints) {
        const ptText = sp.point || "";
        const ptScore = num(sp.score, 2);
        const keywords = sp.keywords || [];
        const matchedKw = keywords.filter((kw) => kw && studentClean.includes(kw));
        const isHit = matchedKw.length > 0;
        let ptEarned = 0;
        if (isHit) {
          if (keywords.length <= 1 || matchedKw.length >= 2) ptEarned = ptScore;
          else ptEarned = pyRound(ptScore * 0.75, 1);
          earned += ptEarned;
          hitPoints.push(ptText);
        } else {
          missingPoints.push(ptText);
        }
        pointResults.push({
          point: ptText,
          score: ptScore,
          earned: ptEarned,
          hit: isHit,
          matched_keywords: matchedKw,
          missing_keywords: keywords.filter((kw) => !matchedKw.includes(kw)),
        });
      }
    }

    earned = Math.min(pyRound(earned, 1), max_score);

    const directionWarnings = [];
    if (studentClean.length < 15 && max_score >= 4) {
      directionWarnings.push("【作答过于单薄】主观题按点给分（通常4分2点、6分3点），你的字数严重不足，缺少“文本分析+深层主旨”展开。");
    }
    if (
      !studentClean.includes("①") &&
      !studentClean.includes("1.") &&
      !studentClean.includes("首先") &&
      max_score >= 4
    ) {
      directionWarnings.push("【排版扣分预警】未实行序号分点作答（①②③）！阅卷老师3秒扫读，不分点极易导致采分点被漏判。");
    }
    if (missingPoints.length > 0 && hitPoints.length > 0) {
      directionWarnings.push("【思维维度单一】你已答出表层情节/表层手法，但漏掉了“深层家国情怀/读者审美效果/结构主线”维度。");
    }

    const termUpgrades = [];
    for (const item of COLLOQUIAL_TO_ACADEMIC_MAP) {
      if (studentClean.includes(item.colloquial)) {
        termUpgrades.push({ original: item.colloquial, upgrade: item.academic });
      }
    }
    if (!termUpgrades.length) {
      const allKws = [];
      for (const sp of scoringPoints) allKws.push(...(sp.keywords || []));
      if (allKws.length) {
        termUpgrades.push({
          original: "日常大白话概述",
          upgrade: "阅卷采分高频母词：" + allKws.slice(0, 6).join(" / "),
        });
      }
    }

    return {
      max_score,
      earned_score: earned,
      lost_score: pyRound(max_score - earned, 1),
      score_rate: max_score > 0 ? pyRound((earned / max_score) * 100, 1) : 0,
      dim1_scoring_points: pointResults,
      dim1_missing_summary: missingPoints,
      dim2_direction_warnings: directionWarnings,
      dim3_term_upgrades: termUpgrades,
    };
  }

  // ---------------------------------------------------------------------------
  // 引擎 4：作文主体段四步法 Linter
  // ---------------------------------------------------------------------------

  function lintEssayParagraph(topicPrompt, s1Raw, s2Raw, s3Raw, s4Raw) {
    const s1 = String(s1Raw || "").trim();
    const s2 = String(s2Raw || "").trim();
    const s3 = String(s3Raw || "").trim();
    const s4 = String(s4Raw || "").trim();

    const fullText = `${s1}${s2}${s3}${s4}`;
    const totalLen = Math.max(fullText.length, 1);
    const narrativeLen = s2.length;
    const analysisLen = s1.length + s3.length + s4.length;
    const narrativeRatio = pyRound((narrativeLen / totalLen) * 100, 1);
    const analysisRatio = pyRound((analysisLen / totalLen) * 100, 1);

    const bannedHits = ESSAY_BANNED_CLICHES.filter((item) => fullText.includes(item.phrase)).map((i) => ({ ...i }));

    if ((fullText.includes("首先") && fullText.includes("其次")) || (fullText.includes("第一，") && fullText.includes("第二，"))) {
      bannedHits.push({
        phrase: "首先/其次/最后 机械套排",
        reason: "单段内部滥用序数词会割裂文气，建议改用“诚然……然而……更进一步看……”递进关联词",
      });
    }

    const clauses = fullText.split(/[，。；！？、：,.;!?]/);
    const longClauses = clauses.map((c) => c.trim()).filter((c) => c.length > 28);
    if (longClauses.length) {
      bannedHits.push({
        phrase: `超长分句（${longClauses[0].length}字未断句）`,
        reason: `“${longClauses[0].slice(0, 18)}…”一口气超过28字不加标点，请遵循《D.进阶版》短句节奏原则，长短句交错！`,
      });
    }

    const factErrors = [];
    for (const trap of HISTORICAL_FACT_TRAPS) {
      if (trap.keywords.every((kw) => fullText.includes(kw))) factErrors.push(trap.warning);
    }

    const dialecticalMarkers = ["正因为", "倘若", "诚然", "然而", "不仅", "更在", "非但", "反而", "固然", "实则", "绝非", "而是"];
    const usedMarkers = dialecticalMarkers.filter((m) => s3.includes(m) || s4.includes(m));

    let score60 = 46.0;
    const critiques = [];

    if (narrativeRatio <= 33.0 && analysisRatio >= 67.0) {
      score60 += 4.5;
      critiques.push(`✅ 【黄金叙议比】叙例占 ${narrativeRatio}% / 议论占 ${analysisRatio}%，完美契合 3:7 黄金分割，绝无“以叙代议”之嫌！`);
    } else if (narrativeRatio <= 42.0) {
      score60 += 1.5;
      critiques.push(`⚠️ 【叙议比偏高】当前叙例占 ${narrativeRatio}%（目标 ≤30%），建议把第2步人物背景砍掉15字，扩充第3步因果/假设分析。`);
    } else {
      score60 -= 5.0;
      critiques.push(`🚨 【以叙代议警告】叙例占比高达 ${narrativeRatio}%！高考议论文忌讳把素材写成人物传记故事，请用一句话勾勒高光镜头即可。`);
    }

    if (usedMarkers.length >= 2) {
      score60 += 3.5;
      critiques.push(`✅ 【思辨链条严密】第3步熟练运用了“${usedMarkers.join(" / ")}”等因果/退一步辩证句式，说理极具穿透力。`);
    } else {
      critiques.push("💡 【说理升级建议】第3步扣题分析略显平铺直叙，建议加入“正因为……倘若当时……又岂能……”的正反假设对比。");
    }

    if (totalLen >= 170 && totalLen <= 260) {
      score60 += 2.0;
      critiques.push(`✅ 【字数节奏极佳】全段共 ${totalLen} 字，符合高考考场主体段 200~240 字的最佳视觉块体量。`);
    } else if (totalLen < 130) {
      score60 -= 3.0;
      critiques.push(`⚠️ 【论证单薄】全段仅 ${totalLen} 字，不足以支撑一个饱满的分论点段落（建议扩充至 200 字左右）。`);
    }

    if (bannedHits.length) score60 -= bannedHits.length * 2.0;
    if (factErrors.length) score60 -= factErrors.length * 4.0;

    score60 = Math.max(32.0, Math.min(58.0, pyRound(score60, 1)));

    return {
      total_chars: totalLen,
      step_lengths: {
        step1_point: s1.length,
        step2_material: s2.length,
        step3_analysis: s3.length,
        step4_callback: s4.length,
      },
      narrative_ratio: narrativeRatio,
      analysis_ratio: analysisRatio,
      is_golden_ratio: narrativeRatio <= 33.0,
      used_dialectical_markers: usedMarkers,
      banned_phrases_hit: bannedHits,
      fact_errors: factErrors,
      critiques,
      estimated_score_60: score60,
      combined_paragraph: fullText,
    };
  }

  // ---------------------------------------------------------------------------
  // HTTP 错误辅助
  // ---------------------------------------------------------------------------

  function HttpError(status, detail) {
    const e = new Error(typeof detail === "string" ? detail : "API Error");
    e.__http = true;
    e.status = status;
    e.detail = detail;
    return e;
  }

  // ---------------------------------------------------------------------------
  // 接口实现
  // ---------------------------------------------------------------------------

  function apiOverview() {
    const exams = sortRows(clone(T("exams")), [["exam_date", 1], ["id", 1]]);
    for (const ex of exams) {
      const mods = sortRows(
        T("exam_module_scores").filter((m) => m.exam_id === ex.id).map((m) => ({ ...m })),
        [["score_rate", 1]]
      );
      for (const m of mods) {
        // 数据里的 module_code 为裸编码（DICTATION），ROI 表键名带 MOD_ 前缀，两种都认
        const meta =
          ROI_COEFFICIENTS[m.module_code] ||
          ROI_COEFFICIENTS["MOD_" + m.module_code] ||
          { roi_weight: 1.0, difficulty: "常规", recommended_days: 14 };
        const lost = pyRound(num(m.max_score) - num(m.actual_score), 1);
        m.lost_score = lost;
        m.roi_index = pyRound((100.0 - num(m.score_rate)) * meta.roi_weight * (lost / 10.0), 1);
        m.roi_difficulty = meta.difficulty;
      }
      ex.modules = mods;
    }

    const campaigns = sortRows(clone(T("blitz_campaigns")), [["is_primary_lock", -1], ["id", 1]]);

    const today = todayStr();
    const cards = T("progress_cards");
    const totalCards = cards.length;
    const struckOut = cards.filter((c) => c.review_stage === "5_STRUCK_OUT_MASTERED").length;
    const redAlert = cards.filter((c) => c.review_stage === "9_COGNITIVE_ALERT" || num(c.fail_count) >= 3).length;
    const dueToday = cards.filter(
      (c) => c.review_stage !== "5_STRUCK_OUT_MASTERED" && (c.next_review_date || "") <= today
    ).length;

    const words = T("classical_words");
    const mastered = words.filter((w) => w.mastery_status === "MASTERED").length;

    return {
      student: {
        name: "备考者",
        school: "某省重点中学",
        grade_class: "2026级高一",
        baseline_score: 82.0,
        target_score_term: 112.0,
        target_score_gaokao: 130.0,
        motto: "拒绝战术性勤奋掩盖战略性懒惰 · 活页本越读越薄 · 每次只死磕一个靶心",
      },
      exams,
      latest_exam: exams.length ? exams[exams.length - 1] : null,
      campaigns,
      active_campaign: campaigns.find((c) => c.is_primary_lock === 1) || (campaigns.length ? campaigns[0] : null),
      progress_book_stats: {
        total_historical_cards: totalCards,
        active_thickness: totalCards - struckOut,
        struck_out_thinned: struckOut,
        red_alert_count: redAlert,
        due_today_count: dueToday,
      },
      classical_stats: { total_words: words.length, mastered_words: mastered },
    };
  }

  function apiLockCampaign(id) {
    const target = T("blitz_campaigns").find((c) => c.id === id);
    if (!target) throw HttpError(404, "未找到该爆破战役");
    for (const c of T("blitz_campaigns")) {
      c.is_primary_lock = 0;
      c.status = c.status === "5_COMPLETED" ? "5_COMPLETED" : "STANDBY";
    }
    target.is_primary_lock = 1;
    target.status = "PHASE_3_TIMED_BLITZ";
    saveState();
    return { status: "ok", locked_campaign: { ...target } };
  }

  function apiCreateExam(p) {
    const mods = p.modules || [];
    const sumModMax = pyRound(mods.reduce((s, m) => s + num(m.max_score), 0), 1);
    const sumModActual = pyRound(mods.reduce((s, m) => s + num(m.actual_score), 0), 1);
    const totalMax = num(p.total_max_score, 150);
    const totalActual = num(p.total_actual_score);
    const totalLost = pyRound(totalMax - totalActual, 1);
    const sumAbc = pyRound(num(p.loss_type_a_score) + num(p.loss_type_b_score) + num(p.loss_type_c_score), 1);

    if (Math.abs(sumModMax - totalMax) > 0.5) {
      throw HttpError(422, `【成绩对账拦截】七大板块满分之和（${sumModMax}分）不等于卷面总分（${totalMax}分）！`);
    }
    if (Math.abs(sumModActual - totalActual) > 0.5) {
      throw HttpError(422, `【成绩对账拦截】七大板块实际得分之和（${sumModActual}分）不等于总得分（${totalActual}分）！`);
    }
    if (Math.abs(sumAbc - totalLost) > 0.5) {
      throw HttpError(
        422,
        `【ABC失分对账拦截】A类(${num(p.loss_type_a_score)}) + B类(${num(p.loss_type_b_score)}) + C类(${num(
          p.loss_type_c_score
        )}) = ${sumAbc}分，不等于总扣分（${totalLost}分）！`
      );
    }

    const examId = nextId("exams");
    T("exams").push({
      id: examId,
      exam_name: p.exam_name,
      exam_date: p.exam_date,
      grade_stage: p.grade_stage || "高一上",
      paper_type: p.paper_type || "浙江名校联考",
      total_max_score: totalMax,
      total_actual_score: totalActual,
      loss_type_a_score: num(p.loss_type_a_score),
      loss_type_b_score: num(p.loss_type_b_score),
      loss_type_c_score: num(p.loss_type_c_score),
      source_pdf_path: null,
      answer_pdf_path: null,
      notes: p.notes || "",
      created_at: nowStamp(),
    });

    for (const m of mods) {
      T("exam_module_scores").push({
        id: nextId("exam_module_scores"),
        exam_id: examId,
        module_code: m.module_code,
        module_name: m.module_name,
        max_score: num(m.max_score),
        actual_score: num(m.actual_score),
        score_rate: num(m.max_score) > 0 ? pyRound((num(m.actual_score) / num(m.max_score)) * 100, 1) : 0,
        // 原本缺省给 15 分钟 + 「正常节奏」，等于凭空造一份配速记录。
        // 时间这类主观数据没有就是没有，一律留 0 / 空，由用户自己填。
        planned_minutes: num(m.planned_minutes, 0),
        actual_minutes: num(m.actual_minutes, 0),
        time_deviation_reason: m.time_deviation_reason || "",
      });
    }

    saveState();
    return { status: "ok", exam_id: examId, message: "✅ 考试病历单与ABC失分账本已精准入库！" };
  }

  function apiQuestions(query) {
    const moduleCode = query.get("module_code");
    let rows = clone(T("questions"));
    if (moduleCode && moduleCode !== "ALL") rows = rows.filter((q) => q.module_code === moduleCode);
    rows = sortRows(rows, [["id", 1]]);

    const result = rows.map((d) => {
      for (const col of ["options_json", "scoring_points_json", "poetry_10keys_json", "trap_types_json"]) {
        d[col.replace("_json", "")] = d[col] ? safeJson(d[col], null) : null;
      }
      return d;
    });
    return { questions: result };
  }

  function apiBlitzSubmit(p) {
    const q = T("questions").find((x) => x.id === num(p.question_id));
    if (!q) throw HttpError(404, "题目不存在");

    const diff = analyze3dAnswerDiff(p.student_answer, q.standard_answer, q.scoring_points_json, q.max_score);

    for (const c of T("blitz_campaigns")) {
      if (c.module_code === q.module_code) {
        c.completed_question_count = Math.min(num(c.target_question_count), num(c.completed_question_count) + 1);
      }
    }
    saveState();

    return {
      question_id: q.id,
      module_code: q.module_code,
      module_name: q.module_name,
      question_no: q.question_no,
      source_name: q.source_name,
      standard_answer: q.standard_answer,
      // 评分细则：前端据此让学生逐条自评（机器初判只作参考，不作评分依据）
      rubric: safeJson(q.scoring_points_json, []) || [],
      max_score: num(q.max_score),
      self_eval_mode: !(safeJson(q.scoring_points_json, []) || []).some((sp) => sp.keywords && sp.keywords.length),
      time_spent_seconds: num(p.time_spent_seconds, 180),
      analysis: diff,
    };
  }

  function apiProgressCards(query) {
    const moduleCode = query.get("module_code");
    const stageFilter = query.get("stage_filter");
    const dueOnly = ["true", "1", "True"].includes(query.get("due_only"));

    const allRows = sortRows(clone(T("progress_cards")), [["fail_count", -1], ["next_review_date", 1], ["id", -1]]);
    const today = todayStr();

    const deckAll = allRows.map((d) => {
      const isDue = d.review_stage !== "5_STRUCK_OUT_MASTERED" && (d.next_review_date || "") <= today;
      return { ...d, is_due: isDue };
    });

    const cards = [];
    for (const d of deckAll) {
      if (moduleCode && moduleCode !== "ALL" && d.module_code !== moduleCode) continue;
      if (stageFilter === "ACTIVE" && d.review_stage === "5_STRUCK_OUT_MASTERED") continue;
      if (stageFilter === "STRUCK_OUT" && d.review_stage !== "5_STRUCK_OUT_MASTERED") continue;
      if (stageFilter === "RED_ALERT" && d.review_stage !== "9_COGNITIVE_ALERT" && num(d.fail_count) < 3) continue;
      if (dueOnly && !d.is_due) continue;

      const out = { ...d };
      out.stage_label = STAGE_LABELS[out.review_stage] || out.review_stage;
      out.error_tags = safeJson(out.error_tags_json, []) || [];
      cards.push(out);
    }

    const struckCount = deckAll.filter((c) => c.review_stage === "5_STRUCK_OUT_MASTERED").length;
    const dueCount = deckAll.filter((c) => c.review_stage !== "5_STRUCK_OUT_MASTERED" && (c.next_review_date || "") <= today).length;
    const redCount = deckAll.filter((c) => c.review_stage === "9_COGNITIVE_ALERT" || num(c.fail_count) >= 3).length;

    return {
      cards,
      deck_metrics: {
        total: deckAll.length,
        active_thickness: deckAll.length - struckCount,
        struck_out_thinned: struckCount,
        due_today: dueCount,
        red_alert: redCount,
      },
    };
  }

  function apiCreateProgressCard(p) {
    const gate = validateProgressCardSubmission({
      key_stem_snippet: p.key_stem_snippet,
      student_wrong_answer: p.student_wrong_answer,
      standard_right_answer: p.standard_right_answer,
      error_reason_reflection: p.error_reason_reflection,
      knowledge_point_summary: p.knowledge_point_summary,
      next_time_warning: p.next_time_warning,
    });

    if (!gate.passed) {
      throw HttpError(422, {
        gate_blocked: true,
        errors: gate.errors,
        warnings: gate.warnings,
        similarity: gate.similarity_with_standard,
      });
    }

    const today = todayStr();
    const maxScore = num(p.max_score, 3);
    const actualScore = num(p.actual_score, 0);
    const lostScore = pyRound(Math.max(0, maxScore - actualScore), 1);
    const cardId = nextId("progress_cards");

    const card = {
      id: cardId,
      question_id: p.question_id !== undefined && p.question_id !== null ? num(p.question_id) : null,
      exam_id: p.exam_id !== undefined && p.exam_id !== null ? num(p.exam_id) : null,
      module_code: p.module_code,
      module_name: p.module_name,
      card_date: today,
      source_label: p.source_label || "单点爆破训练",
      question_no: p.question_no || "",
      max_score: maxScore,
      actual_score: actualScore,
      lost_score: lostScore,
      key_stem_snippet: String(p.key_stem_snippet || "").trim(),
      student_wrong_answer: String(p.student_wrong_answer || "").trim(),
      standard_right_answer: String(p.standard_right_answer || "").trim(),
      error_reason_reflection: String(p.error_reason_reflection || "").trim(),
      knowledge_point_summary: String(p.knowledge_point_summary || "").trim(),
      similar_examples: String(p.similar_examples || "").trim(),
      next_time_warning: String(p.next_time_warning || "").trim(),
      loss_category: p.loss_category || "B",
      error_tags_json: JSON.stringify([`${p.loss_category || "B"}类失分`, p.module_name]),
      review_stage: "1_REVIEW_DAY_1",
      next_review_date: today,
      fail_count: 0,
      pass_count: 0,
      created_at: nowStamp(),
      updated_at: nowStamp(),
    };
    T("progress_cards").push(card);

    T("trap_rules").push({
      id: nextId("trap_rules"),
      module_code: p.module_code,
      module_name: p.module_name,
      trap_category: `${p.loss_category || "B"}类高频失分点`,
      warning_instruction: String(p.next_time_warning || "").trim(),
      hit_count: 1,
      is_system_preset: 0,
      source_card_id: cardId,
      created_at: nowStamp(),
    });

    saveState();

    return {
      status: "ok",
      card: { ...card },
      gate_check: gate,
      excel_sync: { synced: false, reason: "静态离线版不写入本地 Excel，请在进步本页面直接查看/打印" },
      message: "✅ 九栏进步卡已生成，下次警戒指令已自动汇入【专属坑库雷达】！",
    };
  }

  function apiReviewCard(cardId, p) {
    const card = T("progress_cards").find((c) => c.id === cardId);
    if (!card) throw HttpError(404, "未找到该进步卡");

    const today = todayStr();
    const transition = computeNextReviewState(card.review_stage, !!p.is_passed, card.fail_count, card.pass_count, today);

    card.review_stage = transition.stage_after;
    card.next_review_date = transition.next_review_date;
    card.fail_count = transition.fail_count;
    card.pass_count = transition.pass_count;
    card.updated_at = nowStamp();

    T("review_logs").push({
      id: nextId("review_logs"),
      card_id: cardId,
      review_date: today,
      stage_before: transition.stage_before,
      stage_after: transition.stage_after,
      is_passed: p.is_passed ? 1 : 0,
      time_spent_seconds: num(p.time_spent_seconds, 45),
      student_recall_note: p.student_recall_note || "",
      created_at: nowStamp(),
    });

    if (!p.is_passed) {
      for (const r of T("trap_rules")) {
        if (r.source_card_id === cardId) r.hit_count = num(r.hit_count) + 1;
      }
    }

    saveState();
    return { status: "ok", transition, card: { ...card } };
  }

  function apiTrapRules(query) {
    const moduleCode = query.get("module_code");
    let rows = clone(T("trap_rules"));
    if (moduleCode && moduleCode !== "ALL") rows = rows.filter((r) => r.module_code === moduleCode);
    return { trap_rules: sortRows(rows, [["hit_count", -1], ["id", 1]]) };
  }

  function apiTrapHit(ruleId) {
    const rule = T("trap_rules").find((r) => r.id === ruleId);
    if (!rule) throw HttpError(404, "未找到该坑库规则");
    rule.hit_count = num(rule.hit_count) + 1;
    saveState();
    return { status: "ok", rule: { ...rule } };
  }

  /* 义项归一：上游数据写的是 meaning，早期前端读 gloss。
   * 这里把常见别名都收一遍，并且丢掉空壳义项（没有释义、只剩一个例子的那种），
   * 免得界面上出现「例：xxx」却不知道在解释什么。 */
  function normalizeMeanings(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter((m) => m && typeof m === "object")
      .map((m) => ({
        pos: String(m.pos || m.type || m.label || "").trim(),
        gloss: String(m.gloss || m.meaning || m.def || m.definition || "").trim(),
        example: String(m.example || m.example_text || "").trim(),
      }))
      .filter((m) => m.gloss);
  }

  function apiClassicalWords(query) {
    const wordType = query.get("word_type");
    let rows = clone(T("classical_words"));
    if (wordType && wordType !== "ALL") rows = rows.filter((w) => w.word_type === wordType);
    rows = sortRows(rows, [["review_fail_count", -1], ["id", 1]]);
    const words = rows.map((d) => ({
      ...d,
      // 种子数据里义项字段叫 meaning（沿自上游），而渲染层早期按 gloss 取，
      // 直接取值就成了「【义项】undefined」。这里统一规范一次：
      // 对外只暴露 { pos, gloss, example }，渲染层和将来任何消费方都不会再踩。
      meanings: normalizeMeanings(safeJson(d.meanings_json, [])),
      word_type_label: WORD_TYPE_LABELS[d.word_type] || d.word_type,
      freq_tier_label: FREQ_TIER_LABELS[d.freq_tier] || d.freq_tier,
    }));
    return { words, scaffolds: clone(CLASSICAL_SCAFFOLDS) };
  }

  function apiReviewWord(wordId, p) {
    const w = T("classical_words").find((x) => x.id === wordId);
    if (!w) throw HttpError(404, "未找到该文言词条");

    if (p.is_passed) {
      const newPass = num(w.review_pass_count) + 1;
      w.review_pass_count = newPass;
      w.mastery_status = newPass >= 2 ? "MASTERED" : "FAMILIAR";
    } else {
      w.review_fail_count = num(w.review_fail_count) + 1;
      w.mastery_status = "LEARNING";
    }
    saveState();
    return { status: "ok", word: { ...w } };
  }

  function apiModernReading() {
    return {
      info_reading_9_traps: clone(INFO_READING_9_TRAPS),
      literary_11_high_elements: clone(LITERARY_11_HIGH_ELEMENTS),
      three_layer_scaffold: clone(THREE_LAYER_SCAFFOLD),
    };
  }

  function apiEssayWorkspace() {
    const materials = sortRows(clone(T("essay_materials")), [["id", 1]]).map((d) => ({
      ...d,
      theme_tags: safeJson(d.theme_tags_json, []) || [],
    }));
    const quotes = sortRows(clone(T("dialectical_quotes")), [["id", 1]]);
    const drills = sortRows(clone(T("essay_drills")), [["id", -1]]);
    return { materials, quotes, drills };
  }

  function apiEssayLint(p) {
    const report = lintEssayParagraph(
      p.topic_prompt,
      p.step1_point_sentence,
      p.step2_material_sentence,
      p.step3_analysis_sentences,
      p.step4_callback_sentence
    );

    let drillId = null;
    if (p.save_record) {
      drillId = nextId("essay_drills");
      T("essay_drills").push({
        id: drillId,
        topic_prompt: p.topic_prompt,
        step1_point_sentence: p.step1_point_sentence,
        step2_material_sentence: p.step2_material_sentence,
        step3_analysis_sentences: p.step3_analysis_sentences,
        step4_callback_sentence: p.step4_callback_sentence,
        narrative_ratio: report.narrative_ratio,
        analysis_ratio: report.analysis_ratio,
        banned_phrases_hit_json: JSON.stringify(report.banned_phrases_hit),
        fact_errors_json: JSON.stringify(report.fact_errors),
        ai_critique_and_upgrade: report.critiques.join("\n"),
        total_score_estimate: report.estimated_score_60,
        created_at: nowStamp(),
      });
      saveState();
    }

    return { status: "ok", drill_id: drillId, report };
  }

  function apiPrintBundle() {
    const topTraps = sortRows(clone(T("trap_rules")), [["hit_count", -1], ["id", 1]]).slice(0, 15);
    const activeCards = sortRows(
      T("progress_cards").filter((c) => c.review_stage !== "5_STRUCK_OUT_MASTERED").map((c) => ({ ...c })),
      [["fail_count", -1], ["id", 1]]
    );
    const dictationCards = T("progress_cards").filter((c) => c.module_code === "MOD_DICTATION").map((c) => ({ ...c }));
    const zhejiang = sortRows(clone(T("essay_materials")), [["id", 1]]).slice(0, 8);
    const topQuotes = sortRows(clone(T("dialectical_quotes")), [["id", 1]]).slice(0, 8);

    const d = new Date();
    return {
      generated_at: `${todayStr()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
      student_info: "考生（某省重点中学 2026级高一）",
      top_traps: topTraps,
      active_cards: activeCards,
      dictation_cards: dictationCards,
      zhejiang_materials: zhejiang,
      top_quotes: topQuotes,
    };
  }

  // ---------------------------------------------------------------------------
  // 路由
  // ---------------------------------------------------------------------------

  function route(path, method, query, body) {
    let m;

    if (path === "/api/overview" && method === "GET") return apiOverview();
    if ((m = path.match(/^\/api\/campaigns\/(\d+)\/lock$/)) && method === "POST") return apiLockCampaign(Number(m[1]));
    if (path === "/api/exams" && method === "POST") return apiCreateExam(body);
    if (path === "/api/questions" && method === "GET") return apiQuestions(query);
    if (path === "/api/blitz/submit" && method === "POST") return apiBlitzSubmit(body);

    if (path === "/api/progress-cards" && method === "GET") return apiProgressCards(query);
    if (path === "/api/progress-cards" && method === "POST") return apiCreateProgressCard(body);
    if ((m = path.match(/^\/api\/progress-cards\/(\d+)\/review$/)) && method === "POST") return apiReviewCard(Number(m[1]), body);

    if (path === "/api/trap-rules" && method === "GET") return apiTrapRules(query);
    if ((m = path.match(/^\/api\/trap-rules\/(\d+)\/hit$/)) && method === "POST") return apiTrapHit(Number(m[1]));

    if (path === "/api/classical-words" && method === "GET") return apiClassicalWords(query);
    if ((m = path.match(/^\/api\/classical-words\/(\d+)\/review$/)) && method === "POST") return apiReviewWord(Number(m[1]), body);

    if (path === "/api/modern-reading/reference" && method === "GET") return apiModernReading();
    if (path === "/api/essay/workspace" && method === "GET") return apiEssayWorkspace();
    if (path === "/api/essay/lint-and-save" && method === "POST") return apiEssayLint(body);

    if (path === "/api/print-bundle" && method === "GET") return apiPrintBundle();

    throw HttpError(404, `Not Found: ${method} ${path}`);
  }

  // ---------------------------------------------------------------------------
  // 覆写 fetch，拦截 /api/*
  // ---------------------------------------------------------------------------

  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = function (input, init) {
    let url = "";
    if (typeof input === "string") url = input;
    else if (input && input.url) url = input.url;

    const idx = url.indexOf("/api/");
    const isApi = url.startsWith("/api/") || url.startsWith("api/") || (idx > 0 && url.slice(idx).startsWith("/api/"));

    if (!isApi) {
      if (nativeFetch) return nativeFetch(input, init);
      return Promise.reject(new Error("fetch unavailable"));
    }

    const apiPath = url.slice(url.indexOf("/api/"));
    const qIndex = apiPath.indexOf("?");
    const path = qIndex >= 0 ? apiPath.slice(0, qIndex) : apiPath;
    const query = new URLSearchParams(qIndex >= 0 ? apiPath.slice(qIndex + 1) : "");
    const method = String((init && init.method) || "GET").toUpperCase();

    let body = {};
    if (init && init.body) {
      try {
        body = JSON.parse(init.body);
      } catch (e) {
        body = {};
      }
    }

    let status = 200;
    let payload;
    try {
      payload = route(path, method, query, body);
    } catch (err) {
      if (err && err.__http) {
        status = err.status;
        payload = { detail: err.detail };
      } else {
        console.error("[语文专项] API 执行异常", path, err);
        status = 500;
        payload = { detail: String((err && err.message) || err) };
      }
    }

    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      })
    );
  };

  // ---------------------------------------------------------------------------
  // 启动
  // ---------------------------------------------------------------------------

  loadState();
  mergeBank();

  // 对外：题库统计（前端徽标用真实数字，不再写死）
  window.cbBankStats = function () {
    const rows = T("questions");
    const byModule = {};
    for (const q of rows) byModule[q.module_code] = (byModule[q.module_code] || 0) + 1;
    return { total: rows.length, byModule, words: T("classical_words").length };
  };

  // 对外：导入试卷写入题库
  // 只做「写」，不做「判断该不该写」——质量把关在校对表那一关，由人负责。
  window.cbImportQuestions = function (items) {
    const rows = T("questions");
    let maxId = num(DB.seq.questions);
    const seen = new Set(rows.map((q) => String(q.question_stem || "").trim().slice(0, 60)));
    let added = 0;
    let skipped = 0;

    (items || []).forEach((it) => {
      const stem = String(it.question_stem || "").trim();
      if (!stem) return;
      const key = stem.slice(0, 60);
      if (seen.has(key)) {
        skipped += 1;
        return;
      }
      maxId += 1;
      rows.push({
        id: maxId,
        source_name: it.source_name || "导入试卷",
        year: null,
        module_code: it.module_code || "INFO_READ",
        module_name: it.module_name || "",
        sub_type: it.question_type || "",
        passage_title: "",
        passage_author: "",
        passage_content: "",
        passage_notes: "",
        question_no: String(it.question_no || ""),
        question_stem: stem,
        options_json: null,
        max_score: Number(it.max_score) || 1,
        standard_answer: String(it.standard_answer || ""),
        scoring_points_json: JSON.stringify(it.rubric || []),
        poetry_10keys_json: null,
        trap_types_json: JSON.stringify(it.trap ? [it.trap] : []),
        recommended_minutes: 5,
        source_file_path: null,
        is_bank: 1,
        is_imported: 1,
      });
      seen.add(key);
      added += 1;
    });

    if (added) {
      DB.seq.questions = maxId;
      saveState();
    }
    return { added, skipped };
  };

  /* 对外：录入一整套卷（试题卷 + 已批改答题卷）—— 一次写齐题库 / 考试 / 模块分 / 失分卡 / 坑库。
   *
   * 为什么不用 apiCreateExam：那个把「七模块满分合计 = 150」写死在校验里，
   * 而真实卷子结构各不相同（有的不考默写、作文 50 或 60），对账永远过不去。
   * 这里的每个数字都由题目明细推出，天然自洽，只校验「模块得分和 = 总分」与「ABC = 扣分」。 */
  window.cbImportExam = function (p) {
    const items = Array.isArray(p && p.items) ? p.items : [];
    if (!items.length) throw new Error("没有可入库的题目");

    // 1) 题库：复用 cbImportQuestions（去重口径一致），再按题干前 60 字反查 id
    const bank = window.cbImportQuestions(
      items.map((it) => ({
        module_code: it.module_code,
        module_name: it.module_name,
        question_no: it.question_no,
        question_stem: it.question_stem,
        question_type: it.question_type,
        max_score: it.max_score,
        standard_answer: it.standard_answer,
        rubric: it.rubric,
        trap: it.trap,
        source_name: it.source_name || p.exam_name,
      }))
    );

    const idByStem = {};
    T("questions").forEach((q) => {
      idByStem[String(q.question_stem || "").trim().slice(0, 60)] = q.id;
    });

    // 2) 按模块汇总 + ABC 归类。没填类型的失分归 B：B 是「套路/漏点」，
    //    比硬塞 C（素养）更接近实情，也提醒用户回校对表补类型。
    const mods = {};
    const abc = { A: 0, B: 0, C: 0 };
    let sumMax = 0;
    let sumGot = 0;

    items.forEach((it) => {
      const code = it.module_code || "INFO_READ";
      const max = num(it.max_score, 1);
      const got = Math.min(max, Math.max(0, num(it.earned)));
      if (!mods[code]) {
        mods[code] = {
          module_code: code,
          module_name: it.module_name || code,
          max_score: 0,
          actual_score: 0,
          count: 0,
        };
      }
      mods[code].max_score += max;
      mods[code].actual_score += got;
      mods[code].count += 1;
      sumMax += max;
      sumGot += got;
      const lost = max - got;
      if (lost > 0.01) abc[["A", "B", "C"].includes(it.loss_type) ? it.loss_type : "B"] += lost;
    });

    sumMax = pyRound(sumMax, 1);
    sumGot = pyRound(sumGot, 1);
    abc.A = pyRound(abc.A, 1);
    abc.B = pyRound(abc.B, 1);
    abc.C = pyRound(abc.C, 1);

    const sumModMax = pyRound(Object.values(mods).reduce((s, m) => s + m.max_score, 0), 1);
    const sumModGot = pyRound(Object.values(mods).reduce((s, m) => s + m.actual_score, 0), 1);
    const totalLost = pyRound(sumMax - sumGot, 1);
    const sumAbc = pyRound(abc.A + abc.B + abc.C, 1);

    if (Math.abs(sumModMax - sumMax) > 0.6 || Math.abs(sumModGot - sumGot) > 0.6) {
      throw new Error(`模块汇总对不上：题目合计 ${sumMax}/${sumGot}，模块合计 ${sumModMax}/${sumModGot}`);
    }
    if (Math.abs(sumAbc - totalLost) > 0.6) {
      throw new Error(`失分对不上：扣 ${totalLost} 分，但 A${abc.A}+B${abc.B}+C${abc.C}=${sumAbc} 分`);
    }

    // 3) 考试
    const examId = nextId("exams");
    T("exams").push({
      id: examId,
      exam_name: String(p.exam_name || "导入的卷子"),
      exam_date: String(p.exam_date || todayStr()),
      grade_stage: String(p.grade_stage || "高一上"),
      paper_type: String(p.paper_type || "自主导入"),
      total_max_score: sumMax,
      total_actual_score: sumGot,
      loss_type_a_score: abc.A,
      loss_type_b_score: abc.B,
      loss_type_c_score: abc.C,
      source_pdf_path: null,
      answer_pdf_path: null,
      notes: String(p.notes || ""),
      created_at: nowStamp(),
    });

    Object.values(mods).forEach((m) => {
      const max = pyRound(m.max_score, 1);
      const got = pyRound(m.actual_score, 1);
      T("exam_module_scores").push({
        id: nextId("exam_module_scores"),
        exam_id: examId,
        module_code: m.module_code,
        module_name: m.module_name,
        max_score: max,
        actual_score: got,
        score_rate: max > 0 ? pyRound((got / max) * 100, 1) : 0,
        planned_minutes: 0,
        actual_minutes: 0,
        time_deviation_reason: "导入生成",
      });
    });

    // 4) 失分卡：每题失分一张，九栏全部来自批改结果，不用二次手填
    const today = todayStr();
    let cards = 0;
    items.forEach((it) => {
      const max = num(it.max_score, 1);
      const got = Math.min(max, Math.max(0, num(it.earned)));
      const lost = pyRound(max - got, 1);
      if (lost <= 0.01) return;

      const cat = ["A", "B", "C"].includes(it.loss_type) ? it.loss_type : "B";
      const stem = String(it.question_stem || "").trim();
      const cardId = nextId("progress_cards");
      const warning = String(it.warning || it.trap || "").trim();

      T("progress_cards").push({
        id: cardId,
        question_id: idByStem[stem.slice(0, 60)] || null,
        exam_id: examId,
        module_code: it.module_code || "INFO_READ",
        module_name: it.module_name || "",
        card_date: today,
        source_label: String(p.exam_name || "导入的卷子"),
        question_no: String(it.question_no || ""),
        max_score: max,
        actual_score: got,
        lost_score: lost,
        key_stem_snippet: stem.slice(0, 60),
        student_wrong_answer: String(it.student_answer || "").trim(),
        standard_right_answer: String(it.standard_answer || "").trim(),
        error_reason_reflection: String(it.reason || "").trim(),
        knowledge_point_summary: String(it.knowledge || "").trim(),
        similar_examples: "",
        next_time_warning: warning,
        loss_category: cat,
        error_tags_json: JSON.stringify(
          [`${cat}类失分`, it.module_name || ""].concat((it.misses || []).slice(0, 3)).filter(Boolean)
        ),
        review_stage: "1_REVIEW_DAY_1",
        next_review_date: today,
        fail_count: 0,
        pass_count: 0,
        created_at: nowStamp(),
        updated_at: nowStamp(),
      });

      if (warning) {
        T("trap_rules").push({
          id: nextId("trap_rules"),
          module_code: it.module_code || "INFO_READ",
          module_name: it.module_name || "",
          trap_category: `${cat}类高频失分点`,
          warning_instruction: warning,
          hit_count: 1,
          is_system_preset: 0,
          source_card_id: cardId,
          created_at: nowStamp(),
        });
      }
      cards += 1;
    });

    saveState();
    return {
      exam_id: examId,
      added: bank.added,
      skipped: bank.skipped,
      cards,
      sumMax,
      sumGot,
      modules: Object.keys(mods).length,
    };
  };

  window.__CB_DB__ = DB;
  window.__CB_ENGINE__ = {
    computeTextSimilarity,
    validateProgressCardSubmission,
    computeNextReviewState,
    analyze3dAnswerDiff,
    lintEssayParagraph,
    STAGE_LABELS,
  };
})();
