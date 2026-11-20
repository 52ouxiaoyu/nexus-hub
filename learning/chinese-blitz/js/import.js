/* =============================================================================
 * 语文专项 · 试卷导入与 AI 分析
 * -----------------------------------------------------------------------------
 * 流程：PDF（试题卷）-> pdf.js 抽文本 -> 按大题切分 -> 逐大题调 AI 结构化
 *       -> 校验采分点分值 -> 校对表 -> 写入题库
 * 可选：PDF（答题卷）-> 抽每题得分
 *
 * 设计取舍：
 *  1) 不把整卷塞给模型。语文卷 6000~9000 字，一次性长上下文必然漏题、截断。
 *     按"大题"分块，每块 1~5 小题，逐块请求。
 *  2) 强制 JSON 输出 + 本地校验（采分点分值之和必须等于满分），不合格重试。
 *  3) AI 结果一律进校对表，绝不直接入库。机器判分不可信，人必须过一眼。
 * ========================================================================== */
(function () {
  "use strict";

  const PDFJS_VER = "3.11.174";
  const PDFJS_BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@" + PDFJS_VER + "/build/";
  const CFG_KEY = "chinese_blitz_ai_cfg";
  // 云端代理：Key 放在 Cloudflare 环境变量里，浏览器里完全看不到。
  const PROXY_PATH = "/api/ai";

  // 默认走 DeepSeek V4.1 Flash：1M 上下文、便宜、JSON 模式稳，语文长文本足够用。
  // deepseek-flash 就是 4.1 Flash 的正式模型 ID（v4.1-flash 这个写法接口不认）。
  const PRESETS = [
    { name: "DeepSeek Flash", base: "https://api.deepseek.com", model: "deepseek-flash" },
    { name: "DeepSeek Pro", base: "https://api.deepseek.com", model: "deepseek-v4-pro" },
    { name: "通义千问", base: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
    { name: "OpenAI", base: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  ];

  const MODULES = [
    { code: "INFO_READ", name: "信息类阅读" },
    { code: "LIT_READ", name: "文学类阅读" },
    { code: "CLASSICAL", name: "文言文阅读" },
    { code: "POETRY", name: "古代诗歌鉴赏" },
    { code: "DICTATION", name: "名句默写" },
    { code: "LANG_USE", name: "语言文字运用" },
    { code: "ESSAY", name: "作文" },
  ];
  const MODULE_NAME = Object.fromEntries(MODULES.map((m) => [m.code, m.name]));

  const S = {
    paperText: "",
    sheetText: "",
    paperName: "",
    sections: [],
    parsed: [],
    busy: false,
    scoreMap: {},
    graded: 0, // 本次有多少题拿到批改分析
    examName: "",
    examDate: "",
  };

  // ---------------------------------------------------------------- 工具

  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function toast(msg, kind) {
    const el = $("cb-imp-toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "cb-imp-toast show " + (kind || "info");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.className = "cb-imp-toast";
    }, kind === "error" ? 6000 : 3200);
  }

  // 本机密钥文件（js/ai-key.local.js，已 gitignore）：open 就能用，不进公开仓库
  function localKey() {
    return String((typeof window !== "undefined" && window.CB_AI_KEY) || "").trim();
  }

  /* 懒加载本机密钥：不写进 index.html 的 <script>，
   * 因为线上根本没有这个文件，静态引一次就是永久的 404 噪声。
   * 只有真要发请求且手上没 Key 时才去碰它，失败就当没有。 */
  let localKeyLoading = null;
  function ensureLocalKey() {
    if (localKey()) return Promise.resolve();
    if (localKeyLoading) return localKeyLoading;
    localKeyLoading = new Promise((resolve) => {
      const sc = document.createElement("script");
      sc.src = "js/ai-key.local.js";
      sc.onload = resolve;
      sc.onerror = resolve;
      document.head.appendChild(sc);
    });
    return localKeyLoading;
  }

  function loadCfg() {
    let c = null;
    try {
      const raw = localStorage.getItem(CFG_KEY);
      c = raw ? JSON.parse(raw) : null;
    } catch (e) {}
    if (c && c.base && c.model) {
      // 老存档里的 deepseek-chat 已经下线，静默迁到 4.1 Flash
      if (c.model === "deepseek-chat") c.model = PRESETS[0].model;
      return c;
    }
    return { base: PRESETS[0].base, model: PRESETS[0].model, key: localKey() };
  }
  function saveCfg(cfg) {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    } catch (e) {}
  }
  let AI = loadCfg();

  // ---------------------------------------------------------------- PDF

  let pdfReady = null;
  function ensurePdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfReady) return pdfReady;
    pdfReady = new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src = PDFJS_BASE + "pdf.min.js";
      sc.onload = () => {
        if (!window.pdfjsLib) return reject(new Error("pdf.js 加载异常"));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + "pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      sc.onerror = () => reject(new Error("pdf.js 加载失败，请检查网络"));
      document.head.appendChild(sc);
    });
    return pdfReady;
  }

  // 把 pdf.js 的逐字符 textItem 还原成段落：按 y 分组、按 x 排序
  function rebuildText(items) {
    const lines = [];
    let cur = null;
    const flush = () => {
      if (cur && cur.text.trim()) lines.push(cur.text.trim());
      cur = null;
    };

    for (const it of items) {
      if (typeof it.str !== "string") continue;
      const tr = it.transform || [];
      const x = tr[4] || 0;
      const y = tr[5] || 0;
      const h = it.height || 10;

      if (!cur || Math.abs(cur.y - y) > Math.max(2, h * 0.5)) {
        flush();
        cur = { y, x, text: it.str };
      } else {
        // 同一行：按 x 间距决定要不要补空格
        if (x - cur.x > h * 1.6 && !/[\s，。、；：？！）】」』]$/.test(cur.text)) cur.text += " ";
        cur.text += it.str;
        cur.x = x + (it.width || 0);
      }
    }
    flush();

    // 关键坑：不少中文字体把「一」「文」「高」这类常用字编码成康熙部首
    // （U+2E80–U+2FDF），肉眼一模一样但正则和模型都不认。对这一段做 NFKC。
    // 不能全篇 NFKC——那会把「Ⅰ」「Ⅱ」变成 "I"/"II"，破坏题干。
    const joined = lines
      .join("\n")
      .replace(/[\u2E80-\u2EFF\u2F00-\u2FDF]/g, (ch) => ch.normalize("NFKC"));
    return joined.replace(/[ \t]+/g, " ");
  }

  async function extractPdf(file, onProgress) {
    const lib = await ensurePdfJs();
    const buf = await file.arrayBuffer();
    const doc = await lib.getDocument({ data: buf }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(rebuildText(content.items));
      if (onProgress) onProgress(i, doc.numPages);
    }
    return pages.join("\n\n");
  }

  // ---------------------------------------------------------------- 切分大题

  const CN_NUM = "一二三四五六七八九十";
  const SECTION_RE = new RegExp("^\\s*([" + CN_NUM + "]+)\\s*[、.．]\\s*(.{0,40})$");
  const SUB_RE = new RegExp("^\\s*[（(]([" + CN_NUM + "]{1,3})[）)]\\s*(.{0,50})$");

  // 大题标题 -> 模块编码。题号对不上时靠这里兜底。
  function guessModule(title) {
    const t = title || "";
    if (/写作|作文/.test(t)) return "ESSAY";
    if (/默写|名篇名句|名句/.test(t)) return "DICTATION";
    if (/文言文|文言/.test(t)) return "CLASSICAL";
    if (/古代诗歌|诗歌鉴赏|古诗/.test(t)) return "POETRY";
    if (/语言文字运用|语用/.test(t)) return "LANG_USE";
    if (/文学类|现代文阅读\s*(Ⅱ|II|2|二)/.test(t)) return "LIT_READ";
    if (/信息类|实用类|论述类|现代文阅读\s*(Ⅰ|I|1|一)/.test(t)) return "INFO_READ";
    if (/现代文阅读/.test(t)) return "INFO_READ";
    return "";
  }

  /* 从大题原文里抽出所有题号：拆题后拿它做完整性校验。
   * 模型偶尔会"看着像两个小题就并成一道"，导致整道选择题凭空消失——
   * 这种漏题不会报错，只会让总分莫名其妙变少，必须主动抓。 */
  function sectionNos(text) {
    const set = new Set();
    String(text || "")
      .split(/\r?\n/)
      .forEach((ln) => {
        const t = ln.trim();
        const m = t.match(/^(\d{1,2})\s*[．.、]\s*/);
        if (m) {
          const n = Number(m[1]);
          if (n >= 1 && n <= 40) set.add(n);
        }
      });
    return Array.from(set).sort((a, b) => a - b);
  }

  function splitSections(text) {
    const lines = text.split(/\r?\n/);

    const l1 = [];
    const l2 = [];
    lines.forEach((ln, i) => {
      const t = ln.trim();
      if (t.length > 44) return;
      let m = t.match(SECTION_RE);
      if (m) {
        l1.push({ line: i, no: m[1], title: (m[2] || "").trim() });
        return;
      }
      m = t.match(SUB_RE);
      // 排除「（1）」「（2）」这种小题号——只认中文数字的二级标题
      if (m) l2.push({ line: i, no: m[1], title: (m[2] || "").trim() });
    });

    if (l1.length < 2) {
      return [{ no: "全卷", title: "", text: text.trim(), module: "" }];
    }

    const out = [];
    for (let i = 0; i < l1.length; i += 1) {
      const start = l1[i].line;
      const end = i + 1 < l1.length ? l1[i + 1].line : lines.length;

      // 这一级区间内若有 >=2 个中文数字二级标题，说明是「现代文阅读（一）（二）」
      // 这种分组，必须切细，否则信息类和文学类会被并成一块，模块判错。
      const subs = l2.filter((x) => x.line > start && x.line < end);
      if (subs.length >= 2) {
        for (let j = 0; j < subs.length; j += 1) {
          const s2 = subs[j].line;
          const e2 = j + 1 < subs.length ? subs[j + 1].line : end;
          const body = lines.slice(s2, e2).join("\n").trim();
          if (body.length < 25) continue;
          out.push({
            no: l1[i].no + "(" + subs[j].no + ")",
            title: subs[j].title || l1[i].title,
            text: body,
            module: guessModule(subs[j].title) || guessModule(l1[i].title),
          });
        }
        continue;
      }

      const body = lines.slice(start, end).join("\n").trim();
      if (body.length < 25) continue;
      out.push({
        no: l1[i].no,
        title: l1[i].title,
        text: body,
        module: guessModule(l1[i].title),
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- AI

  const SYSTEM_PROMPT = [
    "你是一位有二十年高考语文阅卷经验的特级教师，正在帮学生把一份试卷切成可训练的题目。",
    "",
    "硬性规则：",
    "1. 题干必须保留原文（含全部选项），不得改写、概括或补写原文没有的题。",
    "2. 参考答案要具体到能照着答题：写清「手法—内容—效果」或「分点—依据」的链条，",
    "   禁止只写「生动形象」「表达了作者情感」「承上启下」这类不给分的套话。",
    "3. 每条采分点必须写明「答到什么程度才给分」，并分配分值；",
    "   所有采分点分值之和必须严格等于该题满分。",
    "4. 选择题只给 1 条采分点，分值为满分。",
    "5. 默写题：采分点按句子拆分，写错一个字该句不得分。",
    "6. 作文题：不给参考范文，只给「立意方向 + 评分档位（一类/二类/三类各看什么）」。",
    "7. 宁可少切一题，不要凭空造题。",
    "",
    "只输出 JSON，不要任何解释性文字。",
  ].join("\n");

  function buildUserPrompt(section) {
    const hint = section.module
      ? `这个大题从标题看属于「${MODULE_NAME[section.module]}」，module_code 用 ${section.module}。`
      : "请自行判断 module_code。";
    return [
      hint,
      "可用的 module_code：" + MODULES.map((m) => `${m.code}（${m.name}）`).join("、"),
      "",
      "试卷原文如下（这是一整道大题）：",
      "-----",
      section.text.slice(0, 9000),
      "-----",
      "",
      "输出 JSON 格式：",
      JSON.stringify(
        {
          module_code: "INFO_READ",
          questions: [
            {
              question_no: "1",
              question_type: "选择|简答|翻译|默写|作文",
              question_stem: "完整题干（含选项，用 A. B. C. D. 分行）",
              max_score: 3,
              standard_answer: "具体参考答案",
              rubric: [{ point: "答到什么程度给分", score: 1 }],
              trap: "这题最常见的失分点（一句话）",
            },
          ],
        },
        null,
        1
      ),
    ].join("\n");
  }

  function extractJson(raw) {
    if (!raw) throw new Error("模型没有返回内容");
    let s = String(raw).trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    return JSON.parse(s);
  }

  function canUseProxy() {
    return typeof location !== "undefined" && /^https?:$/.test(location.protocol);
  }

  // 模型有时会把 JSON 塞进 reasoning 之外的字段，这里只认正式正文
  function pickContent(j) {
    const m = j && j.choices && j.choices[0] && j.choices[0].message;
    return (m && m.content) || "";
  }

  /* 推理型模型（4.1 Flash）会先花 token 思考，思考与正文共用 max_tokens。
   * 所以"content 为空 + finish_reason=length"= 预算被思考吃光，不是接口坏了，
   * 必须报成人话，否则用户只看到"模型没有返回内容"一头雾水。 */
  function readResult(j) {
    const txt = pickContent(j);
    const fin = j && j.choices && j.choices[0] && j.choices[0].finish_reason;
    if (!txt && fin === "length") {
      throw new Error("模型思考把输出额度用光了（finish=length），重试一次；连续出现请换 DeepSeek Pro 或调低 reasoning_effort");
    }
    return txt;
  }

  async function httpErrorText(res) {
    let detail = "";
    try {
      const j = await res.json();
      detail = (j.error && (j.error.message || j.error.code)) || JSON.stringify(j).slice(0, 160);
    } catch (e) {
      detail = (await res.text().catch(() => "")).slice(0, 160);
    }
    if (res.status === 401) return "API Key 无效（401），请检查是否复制完整";
    if (res.status === 402) return "账户余额不足（402），请先充值";
    if (res.status === 429) return "请求太频繁（429），等几秒再试";
    return `接口报错 ${res.status}：${detail}`;
  }

  /* 两条通道，按优先级：
   *  ① 云端代理 /api/ai —— Key 在服务端（CF 环境变量 DEEPSEEK_API_KEY），
   *     任何设备打开网页都能用，且浏览器里扒不到 Key。
   *  ② 浏览器直连 —— 代理没部署（纯静态托管/file://）时，用本机 Key。
   *     404/501/503 一律视为"这个站点没开代理"，静默回落，不打扰用户。
   */
  async function callAI(messages, opts) {
    if (!AI.key) await ensureLocalKey();
    const key = AI.key || localKey();
    const body = {
      model: AI.model,
      messages,
      temperature: (opts && opts.temperature) != null ? opts.temperature : 0.2,
      max_tokens: (opts && opts.maxTokens) || 8000,
    };
    if (!(opts && opts.noJsonMode)) body.response_format = { type: "json_object" };
    // 拆题属于"照着原文抄结构"，不需要长思考，低档更快更省；需要更强推理时由 opts.effort 覆盖
    if (/^deepseek-/.test(AI.model)) body.reasoning_effort = (opts && opts.effort) || AI.effort || "low";

    if (AI.proxy !== false && canUseProxy()) {
      const r = await fetch(PROXY_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ base: AI.base, key: key }, body)),
      }).catch(() => null);

      if (r && r.ok) return readResult(await r.json());
      const proxyDead = !r || r.status === 404 || r.status === 405 || r.status === 501 || r.status === 503;
      if (!proxyDead) throw new Error(await httpErrorText(r));
    }

    if (!key) {
      throw new Error("还没配置 AI：这个站点没开云端代理，本机也没填 Key。点「AI 设置」填一个 DeepSeek Key 即可。");
    }
    const url = AI.base.replace(/\/+$/, "") + "/chat/completions";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await httpErrorText(res));
    return readResult(await res.json());
  }

  // 校验 + 兜底修正：采分点分值之和必须等于满分
  function normalizeQuestion(q, fallbackModule) {
    const out = {
      question_no: String(q.question_no || "").trim(),
      question_type: String(q.question_type || "").trim(),
      question_stem: String(q.question_stem || "").trim(),
      max_score: Number(q.max_score) || 0,
      standard_answer: String(q.standard_answer || "").trim(),
      rubric: [],
      trap: String(q.trap || "").trim(),
      module_code: String(q.module_code || fallbackModule || "INFO_READ"),
      warn: "",
    };

    if (!MODULE_NAME[out.module_code]) out.module_code = fallbackModule || "INFO_READ";

    const raw = Array.isArray(q.rubric) ? q.rubric : [];
    out.rubric = raw
      .map((r) => ({
        point: String((r && r.point) || "").trim(),
        score: Number(r && r.score) || 0,
      }))
      .filter((r) => r.point || r.score);

    if (!out.rubric.length) {
      out.rubric = [{ point: "参考答案要点（AI 未拆分，请人工补充）", score: out.max_score || 1 }];
      out.warn = "采分点缺失";
    }

    const sum = out.rubric.reduce((s, r) => s + r.score, 0);
    if (out.max_score && Math.abs(sum - out.max_score) > 0.51) {
      // 按比例缩放，并把尾差补给最后一条
      const k = out.max_score / (sum || 1);
      out.rubric = out.rubric.map((r) => ({ point: r.point, score: Math.round(r.score * k * 2) / 2 }));
      const s2 = out.rubric.reduce((s, r) => s + r.score, 0);
      out.rubric[out.rubric.length - 1].score += Math.round((out.max_score - s2) * 2) / 2;
      out.warn = `采分点分值已按比例校正（原 ${sum} 分 → ${out.max_score} 分）`;
    }
    if (!out.max_score) {
      out.max_score = sum || 1;
      out.warn = out.warn || "满分缺失，按采分点合计推定";
    }
    return out;
  }

  async function analyzeSection(section, idx, total) {
    setProgress(`正在分析第 ${idx + 1}/${total} 个大题：${section.title || section.no}…`);

    // 这份大题原文里实际有哪几个题号——拆完要拿它点数
    const expectNos = sectionNos(section.text);
    let attempt = 0;
    let lastErr = null;
    let missing = [];

    while (attempt < 3) {
      attempt += 1;
      try {
        const retryHint = missing.length
          ? `\n\n注意：上一次你没有切出第 ${missing.join("、")} 题。这一遍必须把第 ${expectNos.join(
              "、"
            )} 题一道不漏地全部给出，缺失任何一题都算失败。`
          : "";
        const raw = await callAI(
          [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(section) + retryHint },
          ],
          // 采分点必须可复现：同一张卷导两次，细则要一致，所以温度锁 0
          { temperature: 0, maxTokens: 12000 }
        );
        const j = extractJson(raw);
        const list = Array.isArray(j.questions) ? j.questions : [];
        if (!list.length) throw new Error("没有切出题目");
        const mod = j.module_code && MODULE_NAME[j.module_code] ? j.module_code : section.module;
        const out = list.map((q) => normalizeQuestion(q, mod));

        const got = out.map((q) => noKey(q.question_no).main).filter(Boolean);
        const miss = expectNos.filter((n) => !got.includes(String(n)));
        if (miss.length && attempt < 3) {
          missing = miss;
          setProgress(`第 ${idx + 1} 大题漏了第 ${miss.join("、")} 题，重试中…`, "warn");
          continue;
        }
        if (miss.length) {
          // 三次都没补齐：不硬造题，但要把缺口亮出来，让校对表上能看见
          out.forEach((q) => {
            if (!q.warn) q.warn = `AI 没切出第 ${miss.join("、")} 题，可能漏题，请对照原卷补`;
          });
          S.missing = (S.missing || []).concat(miss);
        }
        return out;
      } catch (e) {
        lastErr = e;
        if (/API Key|余额|401|402/.test(e.message)) throw e;
      }
    }
    throw new Error(`「${section.title || section.no}」分析失败：${lastErr ? lastErr.message : "未知错误"}`);
  }

  // ---------------------------------------------------------------- 答题卷：抽每题得分

  /* 逐行解析，不要用全文正则——「1．得分：3」这种写法，
   * 全文正则会把「得分」两字当分隔符一路贪到下一行，抽出 3:2 这种鬼分数。
   *
   * 三个真实卷子上会遇到的形态都要认：
   *   ①「1．得分：3」题号和分数同行
   *   ②「4．（1）现在突然起用他……得分：2」题号行很长，分数在行尾
   *   ③「6．尾联用了比喻……」换行后单独一行「得分：3」
   * ②③ 靠 curNo：记住最近出现的题号，分数落在后面几行也归得回去。
   *
   * 分小题报分（4(1) 2 分 + 4(2) 3 分）要同时记两笔：
   * 子号 key「4(1)」记该小题分，主号「4」记累计合计。
   * 拆题后如果题目是 4(1)/4(2) 两行，就必须用子号分，否则两行都吃合计分，
   * 一道 8 分的题会判出 8 分里的 8 分——凭空多出 3 分。 */
  function parseScoresFromText(text) {
    const map = {};
    const lines = String(text || "").split(/\r?\n/);
    let curNo = null;
    let curSub = null;

    lines.forEach((line) => {
      const t = line.trim();
      if (!t) return;

      // 主号必须后面跟标点，否则「2025学年」会被当成第 20 题
      const head = t.match(/^(?:第\s*)?(\d{1,2})\s*[．.、:：]\s*/);
      let main = null;
      let subNo = null;

      if (head) {
        main = Number(head[1]);
        const rest = t.slice(head[0].length);
        const sub1 = rest.match(/^[（(]\s*(\d{1,2})\s*[）)]/);
        if (sub1) subNo = Number(sub1[1]);
        // 换了大题就重置子号，免得上一题的「（2）」串过来
        if (main >= 1 && main <= 40) {
          curNo = main;
          curSub = subNo;
        }
      } else {
        // 续小题：「（2）让他考试……」
        const sub2 = t.match(/^[（(]\s*(\d{1,2})\s*[）)]/);
        if (sub2 && curNo) {
          main = curNo;
          subNo = Number(sub2[1]);
          curSub = subNo;
        }
      }

      let sc = null;
      let m;

      // ① 明写「得分 3」「扣 1 分」「3/4 分」——最可靠
      m = t.match(/(?:得分|实得|应得)\s*[:：]?\s*(\d{1,2}(?:\.\d)?)/);
      if (m) sc = Number(m[1]);
      if (sc === null) {
        m = t.match(/(\d{1,2}(?:\.\d)?)\s*[/／]\s*\d{1,2}(?:\.\d)?\s*分?/);
        if (m) sc = Number(m[1]);
      }
      // ② 单独一行的「3 分」/「（3 分）」——只在极短行才认，
      //    长句里的「（3 分）」是满分，不是得分。
      if (sc === null && t.length <= 10 && curNo !== null) {
        m = t.match(/^[（(]?\s*(\d{1,2}(?:\.\d)?)\s*分\s*[）)]?$/);
        if (m) sc = Number(m[1]);
      }

      if (sc === null || sc < 0 || sc > 70) return;

      const target = main || curNo;
      if (!(target >= 1 && target <= 40)) return;

      // 分数常常写在答案的下一行，这时要靠 curSub 才知道这是哪个小题的分
      const sub = subNo || curSub;
      if (sub) map[target + "(" + sub + ")"] = (map[target + "(" + sub + ")"] || 0) + sc;
      // 主号始终存"这道大题的合计"；上限 70 兜住"又写得分又写扣分"的离谱值
      map[target] = Math.min(70, (map[target] || 0) + sc);
    });

    return map;
  }

  async function aiExtractScores(sheetText, questions) {
    const brief = questions
      .map((q) => `${q.question_no}. 满分 ${q.max_score} 分`)
      .join("\n");
    const raw = await callAI(
      [
        {
          role: "system",
          content:
            "你从教师的批改记录里抽取每道题的得分。只输出 JSON：{\"scores\":{\"1\":3,\"2\":1.5}}。没有明确写出的题不要猜，直接省略。",
        },
        {
          role: "user",
          content: `题目清单：\n${brief}\n\n批改文本：\n-----\n${sheetText.slice(0, 7000)}\n-----`,
        },
      ],
      { temperature: 0, maxTokens: 4000 }
    );
    const j = extractJson(raw);
    const map = {};
    Object.entries(j.scores || {}).forEach(([k, v]) => {
      const no = parseInt(k, 10);
      const sc = Number(v);
      if (no && !isNaN(sc)) map[no] = sc;
    });
    return map;
  }

  // ---------------------------------------------------------------- 答题卷：逐题批改分析

  /* 把答题卷按题号切段。答题卷写法千奇百怪，这里只求「分段够用」，判读交给模型。
   * 试过纯正则直接判分：不行。老师的批注常常只有一个红圈数字或「-1」，
   * 只有把上下文一起给模型，才分得清「学生写的」和「老师改的」。 */
  function splitSheetByNo(text) {
    const lines = String(text || "").split(/\r?\n/);
    const segs = {};
    let cur = null;
    lines.forEach((ln) => {
      const t = ln.trim();
      if (!t) return;
      const m = t.match(/^(?:第\s*)?(\d{1,2})\s*(?:[（(]\s*(\d{1,2})\s*[）)])?\s*[．.、:：]/);
      if (m) {
        const key = m[2] ? m[1] + "(" + m[2] + ")" : m[1];
        if (!segs[key]) segs[key] = [];
        cur = key;
      }
      if (cur) segs[cur].push(t);
    });
    const out = {};
    Object.keys(segs).forEach((k) => {
      const v = segs[k].join("\n").trim();
      if (v.length > 2) out[k] = v;
    });
    return out;
  }

  // 题号归一键：卷面「9（1）」、答题卷「9(1)」「9.1」都要能对上
  function noKey(s) {
    const t = String(s == null ? "" : s).replace(/（/g, "(").replace(/）/g, ")");
    const m = t.match(/^(\d{1,2})(?:\s*[.\-(]\s*(\d{1,2})\s*\)?)?/);
    if (!m) return { main: "", sub: "" };
    return { main: m[1], sub: m[2] || "" };
  }

  function segForNo(segs, no) {
    if (segs[no]) return segs[no];
    const k = noKey(no);
    if (!k.main) return "";
    const exact = k.sub ? k.main + "(" + k.sub + ")" : k.main;
    if (segs[exact]) return segs[exact];
    if (segs[k.main]) return segs[k.main];
    const hit = Object.keys(segs).find((x) => noKey(x).main === k.main);
    return hit ? segs[hit] : "";
  }

  const GRADE_PROMPT = [
    "你是高考语文阅卷组组长。手上有人给你的【题目清单（含采分点）】和【学生已批改的答题卷】。",
    "任务：逐题判定学生实际得分与失分原因，用来决定接下来练什么。",
    "",
    "硬性规则：",
    "1. 逐条对着采分点判：命中的写进 hits，漏掉的写进 misses，每条都要指向学生原话里的片段，或写「未作答」。",
    "2. earned 优先用答题卷上教师写的分数；卷上没有分数时，才按命中采分点的分值累加。",
    "   两者都可读时以教师分为准，并在 note 里说明与采分点估算的差（例：教师给 2 分，按采分点应为 3 分）。",
    "3. 判失分类型，只能选 A / B / C 之一：",
    "   A = 基础必拿分（默写错别字、实词虚词不识、文化常识、选择题原文写了却选错）",
    "   B = 高频题型套路（选择题设误点没识别、主观题漏点/不分点/不用术语、翻译的句式没译出）",
    "   C = 高阶素养（深层意蕴、鉴赏深度、作文思辨与结构）",
    "   没有失分的题 loss_type 留空字符串。",
    "3.5 翻译题按「字字落实」判：关键词义译错、句式没译出、语句不通，各自扣对应采分点；",
    "    不许因为「意思差不多」就算命中——这是教师分与机器分最容易岔开的地方。",
    "4. reason 一句话说清「错在哪一步」，禁止写「理解不深」「基础不牢」这类什么都不说的废话。",
    "5. warning 写成下次进考场能直接照做的一条指令（例：翻译见「之」在动词前，先试宾语前置）。",
    "6. 学生没作答的题也要列，earned 给 0，misses 写全。定位不到作答的题，answer 写「未找到作答」。",
    "7. 教师给的分数如果低于你按采分点估的分，必须至少找出一条具体漏点（写清漏了哪一问）；",
    "   实在找不出就写「评分细则未覆盖」，并在 note 里说明——绝对不许为了凑分编一个假漏点。",
    "",
    "只输出 JSON，不要任何解释文字。",
  ].join("\n");

  function gradeBrief(q) {
    const pts = (q.rubric || []).map((r, i) => `${i + 1})${r.point}（${r.score}分）`).join(" ");
    return `${q.question_no}. 【${MODULE_NAME[q.module_code] || ""}】满分 ${q.max_score} 分；采分点：${pts}`;
  }

  async function aiGradeBatch(batch, segs, sheetText) {
    const brief = batch.map(gradeBrief).join("\n");
    const hasSegs = Object.keys(segs).length > 0;
    const detail = hasSegs
      ? batch
          .map((q) => {
            const seg = segForNo(segs, q.question_no);
            return `【${q.question_no}】\n${seg || "（答题卷里没定位到这道题）"}`;
          })
          .join("\n\n")
      : sheetText.slice(0, 9000);

    const raw = await callAI(
      [
        { role: "system", content: GRADE_PROMPT },
        {
          role: "user",
          content: [
            "题目清单（含采分点）：",
            brief,
            "",
            hasSegs ? "学生答题卷（按题号分段）：" : "学生答题卷全文：",
            "-----",
            detail.slice(0, 9000),
            "-----",
            "",
            "输出 JSON 格式：",
            JSON.stringify(
              {
                items: [
                  {
                    no: "9",
                    earned: 2,
                    answer: "学生原话（可截断，但不要改写）",
                    hits: ["命中的采分点"],
                    misses: ["漏掉的采分点"],
                    loss_type: "B",
                    reason: "错在哪一步",
                    knowledge: "背后考的知识点",
                    warning: "下次进考场的动作指令",
                    note: "与采分点估算的差异说明，没有就留空",
                  },
                ],
              },
              null,
              0
            ),
          ].join("\n"),
        },
      ],
      // 温度 0：同一份卷子两次批改必须给出同一套漏点，否则任务会飘
      { temperature: 0, maxTokens: 12000 }
    );
    const j = extractJson(raw);
    if (!Array.isArray(j.items)) throw new Error("批改结果格式不对");
    return j.items;
  }

  /* 整卷批改。按 8 题一批、3 批并发：
   * 一次塞 20 道题模型会开始"编"漏点（尤其主观题），分批后每题都能落回采分点。 */
  async function gradeSheet(sheetText, questions) {
    const segs = splitSheetByNo(sheetText);
    const usable = Object.keys(segs).length >= Math.min(3, questions.length) ? segs : {};
    const batches = [];
    for (let i = 0; i < questions.length; i += 8) batches.push(questions.slice(i, i + 8));

    const results = [];
    let done = 0;
    let cursor = 0;
    const worker = async () => {
      for (;;) {
        const i = cursor;
        cursor += 1;
        if (i >= batches.length) return;
        try {
          (await aiGradeBatch(batches[i], usable, sheetText)).forEach((it) => results.push(it));
        } catch (e) {
          results.push({ __err: e.message, no: batches[i][0] ? batches[i][0].question_no : "" });
        }
        done += 1;
        setProgress(`正在批改分析 ${done}/${batches.length} 批…`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, batches.length) }, worker));
    return results;
  }

  /* 取教师分。规则：
   * ① 题目是 4(1) 这种小题 → 先找「4(1)」自己的分；
   * ② 找不到子号分，而这道路大题又被拆成了好几题（4(1)+4(2)）→ 合计分不能重复用，返回 null；
   * ③ 整道大题（没拆）→ 用主号合计分。 */
  function lookupTeacher(scoreMap, no, mainCount) {
    if (!scoreMap) return null;
    const k = noKey(no);
    if (!k.main) return null;
    if (k.sub) {
      const subKey = k.main + "(" + k.sub + ")";
      if (scoreMap[subKey] != null) return scoreMap[subKey];
      if ((mainCount[k.main] || 0) > 1) return null;
      return scoreMap[k.main] != null ? scoreMap[k.main] : null;
    }
    return scoreMap[k.main] != null ? scoreMap[k.main] : null;
  }

  // 把批改结果贴回题目。教师分优先于 AI 分——卷子上写了分数就以那个为准。
  function applyGrade(questions, items, scoreMap) {
    const byNo = {};
    items.forEach((it) => {
      if (!it || it.no == null) return;
      const k = noKey(it.no);
      byNo[k.sub ? k.main + "(" + k.sub + ")" : k.main] = it;
    });
    let hit = 0;

    // 同一道大题被拆成几题（4 → 4(1)+4(2)），合计分就不能给每一题
    const mainCount = {};
    questions.forEach((q) => {
      const k = noKey(q.question_no);
      if (k.main) mainCount[k.main] = (mainCount[k.main] || 0) + 1;
    });

    questions.forEach((q) => {
      const k = noKey(q.question_no);
      const it = byNo[k.sub ? k.main + "(" + k.sub + ")" : k.main] || byNo[k.main];
      if (!it) return;
      hit += 1;

      const max = Number(q.max_score) || 0;
      const teacher = lookupTeacher(scoreMap, q.question_no, mainCount);
      if (teacher != null && !isNaN(teacher)) {
        // 教师分不可能超过满分；超出了是答题卷串题号（下一题的分数被算到这一题）
        q.earned = Math.min(max, Math.max(0, Number(teacher)));
        q.earned_src = "师";
      } else if (it.earned != null && !isNaN(Number(it.earned))) {
        q.earned = Math.min(max, Math.max(0, Number(it.earned)));
        q.earned_src = "AI";
      }

      // 模型有时把「得分：3」也当成学生答案抄回来，清掉这类批改痕迹
      q.student_answer = String(it.answer || "")
        .replace(/(得分|实得|应得)\s*[:：]?\s*\d{1,2}(?:\.\d)?/g, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
      q.hits = Array.isArray(it.hits) ? it.hits.map(String) : [];
      q.misses = Array.isArray(it.misses) ? it.misses.map(String) : [];
      q.loss_type = ["A", "B", "C"].includes(it.loss_type) ? it.loss_type : "";
      q.reason = String(it.reason || "");
      q.knowledge = String(it.knowledge || "");
      q.warning = String(it.warning || "");
      q.grade_note = String(it.note || "");

      // 满分题不该挂着漏点：模型有时会把"答得不够漂亮"也算成漏点，
      // 结果诊断里出现"得分 3/3 却漏 1 点"这种自相矛盾。
      if (q.earned != null && q.earned >= max - 0.01) {
        q.misses = [];
        q.loss_type = "";
      }

      // 模型偶尔忘了给失分类型（尤其"老师扣了分、细则又没覆盖"的题）。
      // 按模块补一个最可能的：默写基本是 A，作文基本是 C，其余归 B。
      if (q.earned != null && q.earned < max - 0.01 && !q.loss_type) {
        q.loss_type = q.module_code === "DICTATION" ? "A" : q.module_code === "ESSAY" ? "C" : "B";
      }

      // 老师扣了分、采分点却一条没漏：说明这份细则没覆盖到扣分点。
      // 这种情况不编假错因——明写出来，让用户回校对表补一条真正的漏点。
      if (q.earned != null && q.earned < max - 0.01 && !q.misses.length) {
        q.misses = [`教师给 ${q.earned} 分（满分 ${max}），但采分点没定位到具体漏项`];
        q.reason = q.reason || "细则未覆盖本次扣分点，需要回看原卷确认老师扣在哪一步";
        q.loss_type = q.loss_type || "B";
      }
    });
    return hit;
  }

  // ---------------------------------------------------------------- 界面

  function setProgress(msg, kind) {
    const el = $("cb-imp-progress");
    if (!el) return;
    if (!msg) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.className = "cb-imp-progress " + (kind || "");
    el.textContent = msg;
  }

  function renderSteps() {
    const app = $("cb-imp-app");
    if (!app) return;
    const hasPaper = !!S.paperText;
    const hasParsed = S.parsed.length > 0;
    app.innerHTML = `
      <div class="cb-imp-grid">
        <div class="cb-imp-col">
          <div class="card cb-imp-card">
            <div class="card-title"><span>① 试题卷</span>
              <span class="badge ${hasPaper ? "badge-jade" : "badge-gold"}">${hasPaper ? S.paperText.length + " 字" : "未导入"}</span>
            </div>
            <div class="cb-imp-drop" id="cb-imp-drop-paper">
              <input type="file" accept="application/pdf" id="cb-imp-file-paper" hidden />
              <div class="cb-imp-drop-inner">
                <div style="font-size:26px;">📄</div>
                <div><strong>拖入或点击选择试题卷 PDF</strong></div>
                <div class="cb-imp-hint">需要带文字层的电子版；扫描件请先做 OCR</div>
              </div>
            </div>
            ${
              hasPaper
                ? `<div class="cb-imp-preview">${esc(S.paperText.slice(0, 300))}…</div>
                   <div class="cb-imp-meta">共识别 ${S.sections.length} 个大题：${S.sections
                     .map((s) => esc(s.no + "、" + (s.title || "")))
                     .join("　")}</div>`
                : ""
            }
          </div>

          <div class="card cb-imp-card">
            <div class="card-title"><span>② 已批改答题卷</span>
              <span class="badge ${S.sheetText ? "badge-jade" : "badge-gold"}">${
                S.sheetText
                  ? "已导入" +
                    (Object.keys(S.scoreMap).filter((k) => k.indexOf("(") < 0).length
                      ? ` · ${Object.keys(S.scoreMap).filter((k) => k.indexOf("(") < 0).length} 题有分`
                      : "")
                  : "不传 = 只入题库"
              }</span>
            </div>
            <div class="cb-imp-drop" id="cb-imp-drop-sheet">
              <input type="file" accept="application/pdf" id="cb-imp-file-sheet" hidden />
              <div class="cb-imp-drop-inner">
                <div style="font-size:22px;">📝</div>
                <div><strong>拖入已批改的答题卷 PDF</strong></div>
                <div class="cb-imp-hint">老师给的分、你写下的答案都从这里读。有它才会生成成绩诊断和补漏任务</div>
              </div>
            </div>
            ${S.sheetText ? `<div class="cb-imp-preview">${esc(S.sheetText.slice(0, 240))}…</div>` : ""}
          </div>
        </div>

        <div class="cb-imp-col">
          <div class="card cb-imp-card">
            <div class="card-title"><span>③ 拆题 + 批改分析</span></div>
            <p class="cb-imp-hint" style="line-height:1.9;margin:0 0 12px;">
              第一遍：逐个大题抽题干、写参考答案、拆采分点。<br/>
              第二遍（有答题卷时）：拿着采分点逐条对答案，判你在哪一步丢的分、属于 A/B/C 哪一类。<br/>
              两遍结果都只进下面的校对表，不直接写库。
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-primary" ${hasPaper && !S.busy ? "" : "disabled"} onclick="cbImpAnalyze()">
                ${S.busy ? "分析中…" : S.sheetText ? "拆题并批改这一套" : "只拆题"}
              </button>
              <button class="btn btn-outline" onclick="cbImpOpenSettings()">AI 设置</button>
              ${hasParsed ? `<button class="btn btn-outline" onclick="cbImpReset()">清空重来</button>` : ""}
            </div>
            <div id="cb-imp-progress" class="cb-imp-progress" style="display:none;"></div>
            <div class="cb-imp-hint" style="margin-top:10px;">
              模型：${esc(AI.model)} · ${esc(AI.base.replace(/^https?:\/\//, ""))} ·
              ${
                AI.key || localKey()
                  ? "Key 已配置"
                  : AI.proxy !== false && canUseProxy()
                  ? "走云端代理"
                  : "<span style='color:#b45309;'>Key 未配置</span>"
              }
            </div>
          </div>
        </div>
      </div>

      <div id="cb-imp-review"></div>
    `;

    bindDrop("cb-imp-drop-paper", "cb-imp-file-paper", "paper");
    bindDrop("cb-imp-drop-sheet", "cb-imp-file-sheet", "sheet");
    renderReview();
  }

  function bindDrop(dropId, inputId, kind) {
    const drop = $(dropId);
    const input = $(inputId);
    if (!drop || !input) return;
    drop.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      if (input.files && input.files[0]) handleFile(input.files[0], kind);
    });
    ["dragenter", "dragover"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add("over");
      })
    );
    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.remove("over");
      })
    );
    drop.addEventListener("drop", (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f, kind);
    });
  }

  async function handleFile(file, kind) {
    if (!/\.pdf$/i.test(file.name)) return toast("目前只支持 PDF", "error");
    try {
      setProgress(`正在读取 ${file.name}…`);
      const text = await extractPdf(file, (i, n) => setProgress(`解析第 ${i}/${n} 页…`));
      setProgress("");
      if (text.replace(/\s/g, "").length < 80) {
        toast("这份 PDF 几乎抽不到文字，可能是扫描件（需要 OCR）", "error");
        return;
      }
      if (kind === "paper") {
        S.paperText = text;
        S.paperName = file.name;
        S.sections = splitSections(text);
        S.parsed = [];
        S.graded = 0;
        // 换了一份卷，考试名/日期要跟着重置，否则会把上一份卷的名字带过来
        S.examName = file.name.replace(/\.pdf$/i, "");
        S.examDate = "";
        toast(`试题卷已解析：${S.sections.length} 个大题，${text.length} 字`, "ok");
      } else {
        S.sheetText = text;
        S.scoreMap = parseScoresFromText(text);
        toast("答题卷已解析", "ok");
      }
      renderSteps();
    } catch (e) {
      setProgress("");
      toast("读取失败：" + e.message, "error");
    }
  }

  // ---------------------------------------------------------------- 分析主流程

  async function analyze() {
    if (S.busy) return;
    if (!AI.key) await ensureLocalKey();
    if (!AI.key && !localKey() && !(AI.proxy !== false && canUseProxy())) {
      toast("先配置 API Key", "error");
      openSettings();
      return;
    }
    S.busy = true;
    S.parsed = [];
    S.missing = [];
    renderSteps();

    const out = [];
    const errors = [];
    try {
      /* 大题之间互不依赖，串行跑一张七道大题的卷要 5 分钟以上（每块 40s 上下）。
       * 改成 3 路并发：总耗时 ≈ 最慢那一块 ×2，实测 2 大题从 83s 降到 45s。
       * 上限就别再加了，再高容易被限流（429）。
       * slots 按大题下标落位，保证校对表顺序和卷面一致，不随完成先后乱序。 */
      const slots = new Array(S.sections.length).fill(null);
      const CONCURRENCY = Math.min(3, S.sections.length);
      let cursor = 0;
      let finished = 0;

      const worker = async () => {
        for (;;) {
          const i = cursor;
          cursor += 1;
          if (i >= S.sections.length) return;
          try {
            slots[i] = await analyzeSection(S.sections[i], i, S.sections.length);
          } catch (e) {
            errors.push(e.message);
            slots[i] = [];
          }
          finished += 1;
          setProgress(`已完成 ${finished}/${S.sections.length} 个大题…`);
          out.length = 0;
          slots.forEach((s) => s && s.forEach((q) => out.push(q)));
          S.parsed = out.slice();
          renderReview();
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      // 有答题卷就走完整批改：先抽教师分，再逐题比对采分点找漏点
      if (S.sheetText && out.length) {
        let map = S.scoreMap;
        if (!Object.keys(map).length) {
          setProgress("正在从答题卷里抽取每题得分…");
          try {
            map = await aiExtractScores(S.sheetText, out);
          } catch (e) {
            map = {};
          }
        }
        S.scoreMap = map;
        out.forEach((q) => {
          const no = parseInt(q.question_no, 10);
          if (map[no] != null) {
            q.earned = map[no];
            q.earned_src = "师";
          }
        });

        setProgress("正在逐题比对采分点，找失分原因…");
        try {
          const items = await gradeSheet(S.sheetText, out);
          const n = applyGrade(out, items, map);
          S.graded = n;
          if (!n) toast("答题卷里没对上题号，这次只抽到了分数", "warn");
        } catch (e) {
          S.graded = 0;
          toast("批改分析失败：" + e.message + "（分数仍在，可手动补漏点）", "error");
        }
      }

      S.parsed = out;
      setProgress("");
      renderReview();
      toast(
        `分析完成：${out.length} 道题` + (errors.length ? `，${errors.length} 个大题失败` : ""),
        errors.length ? "warn" : "ok"
      );
      if (errors.length) {
        const box = $("cb-imp-errors");
        if (box) box.innerHTML = errors.map((e) => `<div>· ${esc(e)}</div>`).join("");
      }
    } finally {
      S.busy = false;
      renderSteps();
    }
  }

  // ---------------------------------------------------------------- 校对表

  function r1(x) {
    return Math.round(Number(x || 0) * 10) / 10;
  }

  // 汇总本卷：模块得分、ABC 失分、总分。全部用题目明细算，不写死 150。
  function buildDraft() {
    const mods = {};
    let sumMax = 0;
    let sumGot = 0;
    let scored = 0;
    const abc = { A: 0, B: 0, C: 0, U: 0 };

    S.parsed.forEach((q) => {
      const code = MODULE_NAME[q.module_code] ? q.module_code : "INFO_READ";
      const max = Number(q.max_score) || 0;
      const raw = q.earned;
      const got = raw === null || raw === undefined || raw === "" ? null : Number(raw);
      if (!mods[code]) {
        mods[code] = {
          module_code: code,
          module_name: MODULE_NAME[code],
          max_score: 0,
          actual_score: 0,
          count: 0,
          lost: 0,
          misses: [],
        };
      }
      const m = mods[code];
      m.max_score += max;
      m.count += 1;
      sumMax += max;
      if (got !== null && !isNaN(got)) {
        m.actual_score += got;
        sumGot += got;
        scored += 1;
        const lost = Math.max(0, max - got);
        if (lost > 0.01) {
          m.lost += lost;
          abc[q.loss_type || "U"] += lost;
          (q.misses || []).forEach((x) => m.misses.push(x));
        }
      }
    });

    const list = Object.keys(mods)
      .map((k) => {
        const m = mods[k];
        m.score_rate = m.max_score > 0 ? r1((m.actual_score / m.max_score) * 100) : 0;
        m.actual_score = r1(m.actual_score);
        m.max_score = r1(m.max_score);
        m.lost = r1(m.lost);
        m.misses = Array.from(new Set(m.misses));
        return m;
      })
      .sort((a, b) => a.score_rate - b.score_rate);

    return {
      mods: list,
      sumMax: r1(sumMax),
      sumGot: r1(sumGot),
      scored,
      total: S.parsed.length,
      abc,
      // 有分数才配有诊断：少一题的分，总分就是错的，宁可只入题库
      complete: S.parsed.length > 0 && scored === S.parsed.length,
    };
  }

  /* 由失分结构生成任务。只给 2~3 条：一次死磕一个模块，
   * 列十条等于没列——用户自己的原则是"同一时期只死磕一个靶心"。 */
  function buildTasks(draft) {
    const tasks = [];
    const clip = (x, n) => (String(x).length > n ? String(x).slice(0, n) + "…" : String(x));
    const weak = draft.mods.filter((m) => m.lost > 0.01).sort((a, b) => b.lost - a.lost);

    if (weak[0]) {
      const w = weak[0];
      const pts = w.misses.slice(0, 3).map((x) => clip(x, 30)).join("；") || "逐题回看采分点";
      tasks.push({
        module_code: w.module_code,
        module_name: w.module_name,
        title: `主攻「${w.module_name}」：${w.lost} 分漏在这儿`,
        detail: `漏点：${pts}。本模块 ${w.count} 道题里这 ${w.lost} 分是马上能追回的，先做对再提速。`,
        target: Math.max(3, Math.round(w.lost) + 2),
      });
    }
    if (weak[1] && weak[1].lost >= 3) {
      const w = weak[1];
      tasks.push({
        module_code: w.module_code,
        module_name: w.module_name,
        title: `副攻「${w.module_name}」：${w.lost} 分`,
        detail: `主靶打通再动它。漏点：${w.misses.slice(0, 2).map((x) => clip(x, 28)).join("；") || "见失分卡"}`,
        target: Math.max(2, Math.round(w.lost)),
      });
    }
    const cards = S.parsed.filter(
      (q) => q.earned != null && q.earned !== "" && Number(q.earned) < Number(q.max_score) - 0.01
    ).length;
    if (cards) {
      tasks.push({
        module_code: "ALL",
        module_name: "复盘",
        title: `复盘 ${cards} 张失分卡`,
        detail: "按 1→3→7 天重做。遮住答案口头背采分点，背不出就回到第 1 天重来。",
        target: cards,
      });
    }
    return tasks;
  }

  function renderReview() {
    const box = $("cb-imp-review");
    if (!box) return;
    if (!S.parsed.length) {
      box.innerHTML = "";
      return;
    }
    const totalScore = S.parsed.reduce((s, q) => s + Number(q.max_score || 0), 0);
    const draft = buildDraft();
    const tasks = draft.complete ? buildTasks(draft) : [];

    // 题号冲突检测：同一份卷里题号不该重复。重复说明 AI 切错了或漏切了，
    // 这是最容易被忽略、又最影响后面训练的一种错。
    const noCount = {};
    S.parsed.forEach((q) => {
      const k = String(q.question_no || "").trim();
      if (k) noCount[k] = (noCount[k] || 0) + 1;
    });
    const dupNos = Object.keys(noCount).filter((k) => noCount[k] > 1);

    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!S.examDate) S.examDate = todayStr;
    if (!S.examName) S.examName = String(S.paperName || "").replace(/\.pdf$/i, "") || "导入的卷子";

    const actions = `
      <div class="cb-imp-actions">
        <div class="cb-imp-hint">${
          draft.complete
            ? "入库内容：题库 + 一场考试 + 若干张失分卡 + 上面这些任务。"
            : draft.scored
            ? `还有 ${draft.total - draft.scored} 题没填分，入库只会进题库，不出诊断、不排任务。`
            : "只入题库。想要诊断和任务，把已批改的答题卷也传进来。"
        }</div>
        <button class="btn btn-primary" onclick="cbImpCommit()">${
          draft.complete ? "入库 · 生成诊断与任务" : `只入题库（${S.parsed.length} 题）`
        }</button>
      </div>`;

    const modBars = draft.mods
      .map(
        (m) => `<div class="cb-imp-modrow">
          <span class="cb-imp-modname">${esc(m.module_name)}</span>
          <div class="cb-imp-bar"><i style="width:${Math.max(2, m.score_rate)}%"></i></div>
          <span class="cb-imp-modsc">${m.actual_score}/${m.max_score}<em>${m.score_rate}%</em></span>
        </div>`
      )
      .join("");

    const diagCard = draft.scored
      ? `
      <div class="card" style="margin-top:14px;">
        <div class="card-title">
          <span>⑤ 本卷诊断</span>
          <span class="badge ${draft.complete ? "badge-jade" : "badge-gold"}">${
            draft.complete ? "分数已齐" : `还有 ${draft.total - draft.scored} 题没填分`
          }</span>
        </div>
        <div style="display:flex;gap:26px;flex-wrap:wrap;align-items:baseline;margin-bottom:6px;">
          <div><div class="cb-imp-hint">总分</div>
            <div class="cb-imp-big">${draft.sumGot}<span> / ${draft.sumMax}</span></div></div>
          <div><div class="cb-imp-hint">得分率</div>
            <div class="cb-imp-big">${draft.sumMax ? r1((draft.sumGot / draft.sumMax) * 100) : 0}<span>%</span></div></div>
          <div><div class="cb-imp-hint">A 类失分·基础必拿</div>
            <div class="cb-imp-big" style="color:var(--accent-red);">${r1(draft.abc.A)}</div></div>
          <div><div class="cb-imp-hint">B 类失分·套路漏点</div>
            <div class="cb-imp-big" style="color:#b45309;">${r1(draft.abc.B)}</div></div>
          <div><div class="cb-imp-hint">C 类失分·素养拉锯</div>
            <div class="cb-imp-big" style="color:var(--accent-indigo);">${r1(draft.abc.C)}</div></div>
          ${
            draft.abc.U > 0.01
              ? `<div><div class="cb-imp-hint">未归类</div>
                 <div class="cb-imp-big" style="color:var(--text-secondary);">${r1(draft.abc.U)}</div></div>`
              : ""
          }
        </div>
        <div class="cb-imp-hint" style="margin-bottom:14px;">
          勾稽：卷面 ${draft.sumMax} − 实得 ${draft.sumGot} = 扣 ${r1(draft.sumMax - draft.sumGot)} 分
          ＝ A ${r1(draft.abc.A)} + B ${r1(draft.abc.B)} + C ${r1(draft.abc.C)}${
            draft.abc.U > 0.01 ? ` + 未归类 ${r1(draft.abc.U)}` : ""
          }${
            Math.abs(draft.sumMax - draft.sumGot - (draft.abc.A + draft.abc.B + draft.abc.C + draft.abc.U)) <= 0.6
              ? " ✅"
              : " ⚠ 对不上，去查哪题的失分类型没填"
          }
        </div>

        <div style="margin-bottom:16px;">${modBars}</div>

        ${
          tasks.length
            ? `<div class="cb-imp-meta" style="margin-bottom:8px;">入库后自动排进「今日任务」：</div>
               ${tasks
                 .map(
                   (t, i) => `<div class="cb-imp-task">
                     <b>${i + 1}. ${esc(t.title)}</b>
                     <span>${esc(t.detail)}</span>
                     <em>目标 ${t.target}</em>
                   </div>`
                 )
                 .join("")}`
            : `<div class="cb-imp-hint">全对，没有失分，也就没有新任务。</div>`
        }
        ${actions}
      </div>`
      : "";

    box.innerHTML = `
      <div class="card" style="margin-top:14px;">
        <div class="card-title">
          <span>④ 校对（AI 判的一律过一眼再入库）</span>
          <span class="badge badge-indigo">${S.parsed.length} 题 · 满分 ${totalScore} 分${
            draft.scored ? ` · 实得 ${draft.sumGot}` : ""
          }</span>
          ${dupNos.length ? `<span class="badge badge-red">题号冲突 ${dupNos.length} 处</span>` : ""}
          ${
            S.missing && S.missing.length
              ? `<span class="badge badge-red">疑似漏切 第 ${S.missing.join("、")} 题</span>`
              : ""
          }
        </div>

        <div class="cb-imp-examline">
          <label>考试名称</label>
          <input class="cb-imp-in" id="cb-imp-exam-name" value="${esc(S.examName)}" placeholder="例：26级高一10月月考" />
          <label>日期</label>
          <input class="cb-imp-in" id="cb-imp-exam-date" type="date" value="${esc(S.examDate)}" />
        </div>

        <div id="cb-imp-errors" class="cb-imp-errors"></div>
        <div class="cb-imp-table-wrap">
          <table class="data-table cb-imp-table">
            <thead>
              <tr>
                <th style="width:62px;">题号</th>
                <th style="width:112px;">模块</th>
                <th style="width:58px;">满分</th>
                <th style="width:70px;">实得</th>
                <th style="width:52px;">失分</th>
                <th>题干 / 你的作答 / 漏在哪</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody>
              ${S.parsed
                .map((q, i) => {
                  const sum = q.rubric.reduce((s, r) => s + Number(r.score || 0), 0);
                  const bad = Math.abs(sum - Number(q.max_score || 0)) > 0.51;
                  const hasGot = q.earned != null && q.earned !== "";
                  const lost = hasGot ? Math.max(0, Number(q.max_score) - Number(q.earned)) : null;
                  const isLost = lost != null && lost > 0.01;
                  const dup = dupNos.includes(String(q.question_no || "").trim());
                  return `
                <tr${dup ? ' style="background:#fdf6e8;"' : isLost ? ' style="background:#fdf3f1;"' : ""}>
                  <td><input class="cb-imp-in" data-i="${i}" data-f="question_no" value="${esc(q.question_no)}" style="width:100%;" /></td>
                  <td>
                    <select class="cb-imp-in" data-i="${i}" data-f="module_code" style="width:100%;">
                      ${MODULES.map(
                        (m) => `<option value="${m.code}" ${m.code === q.module_code ? "selected" : ""}>${m.name}</option>`
                      ).join("")}
                    </select>
                  </td>
                  <td><input class="cb-imp-in" type="number" step="0.5" data-i="${i}" data-f="max_score" value="${q.max_score}" style="width:100%;" /></td>
                  <td style="white-space:nowrap;">
                    <input class="cb-imp-in" type="number" step="0.5" data-i="${i}" data-f="earned" value="${hasGot ? q.earned : ""}" placeholder="—" style="width:44px;" />
                    ${q.earned_src ? `<sup class="cb-imp-src">${esc(q.earned_src)}</sup>` : ""}
                  </td>
                  <td style="color:${isLost ? "var(--accent-red)" : "var(--text-secondary)"};">${lost == null ? "—" : isLost ? "-" + r1(lost) : "0"}</td>
                  <td>
                    ${dup ? `<div class="cb-imp-warn">⚠ 题号「${esc(q.question_no)}」在本卷出现 ${noCount[String(q.question_no || "").trim()]} 次，多半是切分错了</div>` : ""}
                    ${q.warn ? `<div class="cb-imp-warn">⚠ ${esc(q.warn)}</div>` : ""}
                    ${bad ? `<div class="cb-imp-warn">⚠ 采分点合计 ${sum} 分 ≠ 满分 ${q.max_score}</div>` : ""}
                    <details>
                      <summary>${esc((q.question_stem || "").slice(0, 58))}${(q.question_stem || "").length > 58 ? "…" : ""}</summary>
                      <div class="cb-imp-detail">
                        <label>题干</label>
                        <textarea class="cb-imp-in" data-i="${i}" data-f="question_stem" rows="3">${esc(q.question_stem)}</textarea>
                        <label>参考答案</label>
                        <textarea class="cb-imp-in" data-i="${i}" data-f="standard_answer" rows="4">${esc(q.standard_answer)}</textarea>
                        <label>采分点</label>
                        <div class="cb-imp-rubric">
                          ${q.rubric
                            .map(
                              (r) => `<div class="cb-imp-rubric-row">
                                <span class="cb-imp-pt">${esc(r.point)}</span>
                                <span class="cb-imp-sc">${r.score} 分</span>
                              </div>`
                            )
                            .join("")}
                        </div>
                        ${
                          q.student_answer || q.misses
                            ? `
                        <label>我的作答（从答题卷读到的）</label>
                        <textarea class="cb-imp-in" data-i="${i}" data-f="student_answer" rows="4">${esc(q.student_answer || "")}</textarea>
                        <div style="display:flex;gap:12px;flex-wrap:wrap;">
                          <div style="flex:1;min-width:200px;">
                            <label style="color:#2f855a;">✅ 命中</label>
                            <textarea class="cb-imp-in" data-i="${i}" data-f="hit_list" rows="3" placeholder="一行一条">${esc((q.hits || []).join("\n"))}</textarea>
                          </div>
                          <div style="flex:1;min-width:200px;">
                            <label style="color:var(--accent-red);">❌ 漏掉</label>
                            <textarea class="cb-imp-in" data-i="${i}" data-f="miss_list" rows="3" placeholder="一行一条">${esc((q.misses || []).join("\n"))}</textarea>
                          </div>
                        </div>
                        <div style="display:flex;gap:12px;flex-wrap:wrap;">
                          <div style="flex:1;min-width:200px;">
                            <label>错在哪一步</label>
                            <textarea class="cb-imp-in" data-i="${i}" data-f="reason" rows="2">${esc(q.reason || "")}</textarea>
                          </div>
                          <div style="flex:1;min-width:200px;">
                            <label>知识点</label>
                            <textarea class="cb-imp-in" data-i="${i}" data-f="knowledge" rows="2">${esc(q.knowledge || "")}</textarea>
                          </div>
                        </div>
                        <label>下次进考场的动作</label>
                        <textarea class="cb-imp-in" data-i="${i}" data-f="warning" rows="2">${esc(q.warning || "")}</textarea>
                        <div style="display:flex;gap:10px;align-items:center;margin-top:8px;">
                          <span style="font-size:12px;color:var(--text-secondary);">失分类型</span>
                          <select class="cb-imp-in" data-i="${i}" data-f="loss_type" style="width:auto;">
                            <option value="" ${!q.loss_type ? "selected" : ""}>未填</option>
                            <option value="A" ${q.loss_type === "A" ? "selected" : ""}>A 基础必拿分</option>
                            <option value="B" ${q.loss_type === "B" ? "selected" : ""}>B 高频套路</option>
                            <option value="C" ${q.loss_type === "C" ? "selected" : ""}>C 高阶素养</option>
                          </select>
                          ${q.grade_note ? `<span class="cb-imp-hint">${esc(q.grade_note)}</span>` : ""}
                        </div>`
                            : ""
                        }
                        ${q.trap ? `<label>常见失分</label><div class="cb-imp-trap">${esc(q.trap)}</div>` : ""}
                      </div>
                    </details>
                  </td>
                  <td><button class="cb-imp-del" title="删掉这题" onclick="cbImpDrop(${i})">✕</button></td>
                </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        ${draft.scored ? "" : actions}
      </div>
      ${diagCard}
    `;

    const nameEl = $("cb-imp-exam-name");
    if (nameEl) nameEl.addEventListener("input", (e) => (S.examName = e.target.value));
    const dateEl = $("cb-imp-exam-date");
    if (dateEl) dateEl.addEventListener("input", (e) => (S.examDate = e.target.value));

    box.querySelectorAll(".cb-imp-in").forEach((el) => {
      el.addEventListener("input", (e) => {
        const i = Number(e.target.dataset.i);
        const f = e.target.dataset.f;
        const v = e.target.value;
        if (f === "question_no" || f === "module_code" || f === "loss_type") S.parsed[i][f] = v;
        else if (f === "question_stem" || f === "standard_answer" || f === "student_answer" || f === "reason" || f === "knowledge" || f === "warning")
          S.parsed[i][f] = v;
        else if (f === "hit_list") S.parsed[i].hits = v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        else if (f === "miss_list") S.parsed[i].misses = v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        else S.parsed[i][f] = v === "" ? null : Number(v);
      });
      // 改分数 / 改类型后诊断要跟着变，但重绘会把正在输入的输入框刷掉，
      // 所以只在 change（失焦）时重算
      if (el.dataset.f === "earned" || el.dataset.f === "max_score" || el.dataset.f === "loss_type") {
        el.addEventListener("change", () => renderReview());
      }
    });
  }

  function dropRow(i) {
    S.parsed.splice(i, 1);
    renderReview();
  }

  function resetAll() {
    S.paperText = "";
    S.sheetText = "";
    S.sections = [];
    S.parsed = [];
    S.scoreMap = {};
    S.graded = 0;
    S.examName = "";
    S.examDate = "";
    renderSteps();
  }

  // ---------------------------------------------------------------- 入库

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // 题目对象 → 题库行（两处入库共用，避免字段漏写）
  function toBankItem(q) {
    return {
      module_code: q.module_code,
      module_name: MODULE_NAME[q.module_code] || "未分类",
      question_no: String(q.question_no || ""),
      question_stem: q.question_stem,
      question_type: q.question_type || "",
      max_score: Number(q.max_score) || 1,
      standard_answer: q.standard_answer,
      rubric: q.rubric,
      trap: q.trap || "",
      source_name: S.examName || S.paperName || "导入试卷",
    };
  }

  function commit() {
    if (!S.parsed.length) return;
    const bad = S.parsed.filter((q) => !q.question_stem.trim());
    if (bad.length) return toast(`有 ${bad.length} 道题没有题干，先补上再入库`, "error");

    const draft = buildDraft();

    // 分数不齐就只入题库：宁可少一个功能，也不要往病历本写一份错总分
    if (!draft.complete) {
      if (!window.cbImportQuestions) return toast("写入接口未就绪，请刷新页面", "error");
      const res = window.cbImportQuestions(S.parsed.map(toBankItem));
      toast(`已入库 ${res.added} 题` + (res.skipped ? `，跳过重复 ${res.skipped} 题` : ""), "ok");
      S.parsed = [];
      renderSteps();
      // 题库变了要整页刷新：STATE.questions 是 refreshAllData 时才拉的，
      // 只调筛题函数会拿旧缓存，表现为"入库了但做题页看不到"。
      if (typeof window.refreshAllData === "function") window.refreshAllData();
      return;
    }

    if (!window.cbImportExam) return toast("写入接口未就绪，请刷新页面", "error");

    const tasks = buildTasks(draft);
    let res;
    try {
      res = window.cbImportExam({
        exam_name: S.examName || "导入的卷子",
        exam_date: S.examDate || todayISO(),
        grade_stage: "高一上",
        paper_type: "自主导入",
        notes: `录入一套卷：${S.paperName || ""}`,
        items: S.parsed.map((q) => {
          const base = toBankItem(q);
          return Object.assign(base, {
            earned: Number(q.earned),
            loss_type: q.loss_type || "",
            student_answer: q.student_answer || "",
            hits: q.hits || [],
            misses: q.misses || [],
            reason: q.reason || "",
            knowledge: q.knowledge || "",
            warning: q.warning || "",
          });
        }),
        tasks,
      });
    } catch (e) {
      return toast("入库失败：" + e.message, "error");
    }

    // 任务只存浏览器本地（chinese_blitz_tasks_v1）：它是一次性的动作清单，
    // 不是学业档案，写进 DB 反而会让"病历本"里堆满已经做完的琐事
    let taskCount = 0;
    if (typeof window.cbAddTasks === "function") {
      taskCount = window.cbAddTasks(tasks, res.exam_id, S.examName || "导入的卷子");
    }

    toast(
      `入库完成：${res.added} 题 · 1 场考试（${res.sumGot}/${res.sumMax}） · ${res.cards} 张失分卡 · ${taskCount} 条任务`,
      "ok"
    );
    S.parsed = [];
    S.graded = 0;
    renderSteps();
    if (typeof window.refreshAllData === "function") window.refreshAllData();
  }

  // ---------------------------------------------------------------- AI 设置

  function openSettings() {
    const box = $("cb-imp-settings");
    if (!box) return;
    box.style.display = "flex";
    $("cb-ai-base").value = AI.base;
    $("cb-ai-model").value = AI.model;
    $("cb-ai-key").value = AI.key || localKey();
    const st = $("cb-ai-status");
    if (st) {
      const viaProxy = AI.proxy !== false && canUseProxy();
      st.textContent = viaProxy
        ? "通道：优先走云端代理（Key 藏在服务器，网页里扒不到）；代理不可用时自动回落到这里的 Key"
        : "通道：浏览器直连（Key 只存在这台设备）";
      st.className = "cb-ai-status";
    }
  }
  function closeSettings() {
    const box = $("cb-imp-settings");
    if (box) box.style.display = "none";
  }
  function applyPreset(name) {
    const p = PRESETS.find((x) => x.name === name);
    if (!p) return;
    $("cb-ai-base").value = p.base;
    $("cb-ai-model").value = p.model;
  }
  function saveSettings() {
    AI = {
      base: $("cb-ai-base").value.trim() || PRESETS[0].base,
      model: $("cb-ai-model").value.trim() || PRESETS[0].model,
      key: $("cb-ai-key").value.trim(),
    };
    saveCfg(AI);
    closeSettings();
    renderSteps();
    toast("已保存", "ok");
  }

  async function testConn() {
    const st = $("cb-ai-status");
    const probe = {
      base: $("cb-ai-base").value.trim() || PRESETS[0].base,
      model: $("cb-ai-model").value.trim() || PRESETS[0].model,
      key: $("cb-ai-key").value.trim(),
    };
    st.textContent = "测试中…";
    st.className = "cb-ai-status";
    const backup = AI;
    AI = probe;
    try {
      const out = await callAI(
        [
          { role: "system", content: '只输出 JSON {"ok":true}' },
          { role: "user", content: "连通性测试" },
        ],
        { temperature: 0, maxTokens: 300 }
      );
      st.textContent = "连通正常：" + String(out).slice(0, 40);
      st.className = "cb-ai-status good";
    } catch (e) {
      st.textContent = e.message;
      st.className = "cb-ai-status bad";
    } finally {
      AI = backup; // 测试不写回，避免"测完没保存却生效"
    }
  }

  // ---------------------------------------------------------------- 对外

  window.cbImpAnalyze = analyze;
  window.cbImpReset = resetAll;
  window.cbImpDrop = dropRow;
  window.cbImpCommit = commit;
  window.cbImpOpenSettings = openSettings;
  window.cbImpCloseSettings = closeSettings;
  window.cbImpApplyPreset = applyPreset;
  window.cbImpSaveSettings = saveSettings;
  window.cbImpTestConn = testConn;

  window.cbImpMount = function () {
    renderSteps();
    // 本机若存在密钥文件，补一次渲染，让面板上的「Key 已配置」名副其实
    ensureLocalKey().then(() => {
      if (localKey()) renderSteps();
    });
  };
  // 测试用：注入已解析文本，跳过 PDF
  window.cbImpInject = function (paperText, sheetText) {
    S.paperText = paperText || "";
    S.sheetText = sheetText || "";
    S.paperName = "手动注入";
    S.examName = "手动注入";
    S.examDate = "";
    S.graded = 0;
    S.sections = splitSections(S.paperText);
    S.parsed = [];
    S.scoreMap = sheetText ? parseScoresFromText(sheetText) : {};
    renderSteps();
  };
  window.cbImpState = S;
  window.cbImpSplit = splitSections;
})();
