/**
 * 高考语文“死磕通关”数字化作战系统 - 前端交互主引擎 (app.js)
 */

const STATE = {
  overview: null,
  selectedExamId: null,
  questions: [],
  currentBlitzQuestion: null,
  blitzTimerSeconds: 0,
  blitzTimerInterval: null,
  lastBlitzResult: null,
  progressCards: [],
  deckMetrics: null,
  trapRules: [],
  classicalData: null,
  classicalMaskAll: true,
  poetryQuestions: [],
  currentPoetryQuestion: null,
  modernReference: null,
  essayWorkspace: null,
  printBundle: null,
};

// 初始化入口
document.addEventListener("DOMContentLoaded", async () => {
  await refreshAllData();
  liveUpdateEssayRatio();
  startBlitzTimer();
});

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPost(url, payload = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error("API Error");
    err.status = res.status;
    err.detail = data.detail || data;
    throw err;
  }
  return data;
}

async function refreshAllData() {
  try {
    const [overview, qData, cardData, trapData, classicalData, modRef, essayData, printData] =
      await Promise.all([
        apiGet("/api/overview"),
        apiGet("/api/questions"),
        apiGet("/api/progress-cards"),
        apiGet("/api/trap-rules"),
        apiGet("/api/classical-words"),
        apiGet("/api/modern-reading/reference"),
        apiGet("/api/essay/workspace"),
        apiGet("/api/print-bundle"),
      ]);

    STATE.overview = overview;
    STATE.questions = qData.questions || [];
    STATE.progressCards = cardData.cards || [];
    STATE.deckMetrics = cardData.deck_metrics || {};
    STATE.trapRules = trapData.trap_rules || [];
    STATE.classicalData = classicalData;
    STATE.modernReference = modRef;
    STATE.essayWorkspace = essayData;
    STATE.printBundle = printData;

    // 默认选中真实10月月考（第2场，或最新一场）
    if (!STATE.selectedExamId && overview.exams && overview.exams.length > 0) {
      const octExam = overview.exams.find((e) => e.exam_name.includes("10月月考")) || overview.exams[overview.exams.length - 1];
      STATE.selectedExamId = octExam.id;
    }

    renderTopHeader();
    renderDashboard();
    populateBlitzSelectors();
    renderProgressBookSection();
    renderTrapRadar();
    renderClassicalSection();
    populatePoetryWorkspace();
    renderModernReadingSection();
    renderEssaySection();
    renderPrintSheet();
    renderToday();
    renderNavCounts();
  } catch (err) {
    console.error("初始化数据失败:", err);
  }
}

// ---------------------------------------------------------------------------
// 顶部状态栏与左侧 Tab 切换
// ---------------------------------------------------------------------------

const TAB_GROUP = {
  "tab-today": "today",
  "tab-dashboard": "train",
  "tab-blitz": "train",
  "tab-progress": "train",
  "tab-import": "train",
  "tab-classical": "lib",
  "tab-poetry": "lib",
  "tab-modern": "lib",
  "tab-essay": "lib",
  "tab-print": "lib",
};

function switchTab(tabId) {
  document.querySelectorAll(".workspace-pane").forEach((el) => el.classList.remove("active"));
  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");

  const group = TAB_GROUP[tabId] || "today";

  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-group") === group);
  });

  const trainNav = document.getElementById("subnav-train");
  const libNav = document.getElementById("subnav-lib");
  if (trainNav) trainNav.style.display = group === "train" ? "flex" : "none";
  if (libNav) libNav.style.display = group === "lib" ? "flex" : "none";

  document.querySelectorAll(".subnav-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-sub") === tabId);
  });

  if (tabId === "tab-today") renderToday();
  if (tabId === "tab-import" && typeof window.cbImpMount === "function") window.cbImpMount();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------------------------------------------------------------------
// ☀️ 今日任务：只回答"现在做哪三件事"
// ---------------------------------------------------------------------------

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function todayHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 99991;
  return h;
}

const TODAY_TASKS = ["due", "question", "quote"];

function todayDoneKey() {
  return "cb_today_" + todayKey();
}

function todayDone() {
  try {
    return JSON.parse(localStorage.getItem(todayDoneKey()) || "{}") || {};
  } catch (e) {
    return {};
  }
}

function todayMark(kind) {
  const d = todayDone();
  d[kind] = true;
  try {
    localStorage.setItem(todayDoneKey(), JSON.stringify(d));
  } catch (e) {}
  renderTodayBadge();
}

function renderTodayBadge() {
  const d = todayDone();
  const n = TODAY_TASKS.filter((k) => d[k]).length;
  const el = document.getElementById("today-progress-badge");
  if (!el) return;
  el.textContent = n === 3 ? "✅ 今天三件事做完了" : `已完成 ${n} / 3`;
  el.className = `badge ${n === 3 ? "badge-jade" : "badge-gold"}`;
  TODAY_TASKS.forEach((k) => {
    const card = document.getElementById("today-card-" + k);
    if (card) card.classList.toggle("done", !!d[k]);
  });
}

function todayPickQuestion() {
  const list = STATE.questions || [];
  if (!list.length) return null;
  return list[todayHash(todayKey() + "q") % list.length];
}

function renderToday() {
  renderTodayBadge();
  const m = STATE.deckMetrics || {};
  const dueEl = document.getElementById("today-due-count");
  if (dueEl) dueEl.textContent = `${m.due_today || 0} 张`;

  const q = todayPickQuestion();
  const qMod = document.getElementById("today-q-module");
  const qTitle = document.getElementById("today-q-title");
  if (qMod && qTitle) {
    if (q) {
      qMod.textContent = q.module_name;
      const stem = (q.question_stem || "").replace(/\s+/g, " ").slice(0, 68);
      qTitle.textContent = `${q.source_name} · ${q.question_no}｜${stem}…`;
      STATE.todayQuestion = q;
    } else {
      qMod.textContent = "--";
      qTitle.textContent = "题库加载中…";
    }
  }

  const quotes = STATE.essayWorkspace?.quotes || [];
  const quoteEl = document.getElementById("today-quote");
  const quoteSrc = document.getElementById("today-quote-src");
  if (quoteEl && quotes.length) {
    const idx = (todayHash(todayKey() + "s") + (STATE.todayQuoteOffset || 0)) % quotes.length;
    const item = quotes[idx];
    quoteEl.textContent = `“${item.quote_text}”　—— ${item.author_or_source || ""}`;
    if (quoteSrc) quoteSrc.textContent = item.theme_category || "素材";
  }

  const overview = STATE.overview || {};
  const exams = overview.exams || [];
  const latest = exams.length ? exams[exams.length - 1] : null;
  const box = document.getElementById("today-diagnosis");
  if (!box) return;

  if (!latest) {
    box.innerHTML = `<p style="font-size:13px;color:var(--text-secondary);">还没有录入过考试。先去「训练舱 → 诊断」录入一次月考，系统才知道该往哪里使劲。</p>`;
    return;
  }
  const mods = (latest.modules || []).slice().sort((a, b) => a.score_rate - b.score_rate);
  const weakest = mods.slice(0, 2);
  box.innerHTML = `
    <div style="display:flex;gap:26px;flex-wrap:wrap;align-items:baseline;">
      <div><span style="font-size:12px;color:var(--text-secondary);">最近一次</span>
        <div style="font-size:22px;font-weight:800;">${latest.total_actual_score ?? "--"}<span style="font-size:13px;font-weight:400;"> / ${latest.total_max_score ?? 150}</span></div></div>
      <div><span style="font-size:12px;color:var(--text-secondary);">活页本未消化</span>
        <div style="font-size:22px;font-weight:800;">${m.active_thickness || 0}<span style="font-size:13px;font-weight:400;"> 张</span></div></div>
      <div><span style="font-size:12px;color:var(--text-secondary);">红牌预警</span>
        <div style="font-size:22px;font-weight:800;color:var(--accent-red);">${m.red_alert || 0}<span style="font-size:13px;font-weight:400;"> 张</span></div></div>
    </div>
    <div style="margin-top:12px;font-size:13px;color:var(--text-secondary);">
      当前最该动的是：${weakest
        .map((x) => `<strong style="color:var(--accent-red);">${x.module_name}</strong>（得分率 ${x.score_rate}%）`)
        .join("　")}
      <br/><span style="font-size:12px;">同一时期只死磕一个模块。上面那个更低的，先打完 20 道再说下一个。</span>
    </div>
  `;
}

function todayGo(kind) {
  if (kind === "due") {
    switchTab("tab-progress");
    const sel = document.getElementById("progress-stage-filter");
    if (sel) {
      sel.value = "DUE";
      loadProgressCards();
    }
    return;
  }
  if (kind === "question") {
    const q = STATE.todayQuestion || todayPickQuestion();
    if (!q) return;
    switchTab("tab-blitz");
    const modSel = document.getElementById("blitz-module-filter");
    if (modSel) modSel.value = q.module_code;
    loadBlitzQuestions();
    const qSel = document.getElementById("blitz-question-selector");
    if (qSel) {
      qSel.value = String(q.id);
      renderCurrentBlitzQuestion();
    }
    document.getElementById("blitz-student-answer").value = "";
    return;
  }
  if (kind === "quote") {
    STATE.todayQuoteOffset = (STATE.todayQuoteOffset || 0) + 1;
    renderToday();
    return;
  }
  if (kind === "quoteDone") {
    todayMark("quote");
  }
}

// 侧边栏徽标用真实数字（不再写死 3场/12题/120词）
function renderNavCounts() {
  const stats = typeof window.cbBankStats === "function" ? window.cbBankStats() : null;
  const m = STATE.deckMetrics || {};
  const due = document.getElementById("nav-badge-due");
  if (due) due.textContent = `${m.due_today || 0} 张`;
  const qb = document.getElementById("nav-badge-questions");
  if (qb) qb.textContent = `${stats ? stats.total : 0} 题`;
  const wb = document.getElementById("nav-badge-words");
  if (wb) wb.textContent = `${stats ? stats.words : 0} 词`;
}

function renderTopHeader() {
  const ov = STATE.overview;
  if (!ov) return;

  const activeCamp = ov.active_campaign;
  const lockEl = document.getElementById("header-locked-target");
  if (activeCamp) {
    lockEl.innerHTML = `🎯 锁定靶心：<strong>${activeCamp.module_name}</strong> ${activeCamp.completed_question_count}/${activeCamp.target_question_count} 题 · ${activeCamp.current_score_rate}% → 目标 ${activeCamp.target_score_rate}%`;
  }

  const stats = ov.progress_book_stats;
  const bookEl = document.getElementById("header-book-thickness");
  if (stats) {
    bookEl.innerHTML = `📒 活页本 <strong>${stats.active_thickness} 张</strong> · 已划掉 ${stats.struck_out_thinned} · 今日待复盘 ${stats.due_today_count}`;
  }

  const dueBadge = document.getElementById("nav-badge-due");
  if (dueBadge && stats) {
    dueBadge.textContent = stats.due_today_count > 0 ? `待复盘 ${stats.due_today_count}` : "已清零";
  }
}

// ---------------------------------------------------------------------------
// 模块 1: 📊 成绩病历本 & 靶心决策中心
// ---------------------------------------------------------------------------

function renderDashboard() {
  const ov = STATE.overview;
  if (!ov || !ov.exams) return;

  const selector = document.getElementById("exam-selector");
  selector.innerHTML = ov.exams
    .map(
      (ex) =>
        `<option value="${ex.id}" ${ex.id === STATE.selectedExamId ? "selected" : ""}>${ex.exam_date} | ${ex.exam_name} (${ex.total_actual_score}/${ex.total_max_score}分)</option>`
    )
    .join("");

  const currentExam = ov.exams.find((e) => e.id === Number(STATE.selectedExamId)) || ov.exams[0];
  if (!currentExam) return;

  const lostTotal = (currentExam.total_max_score - currentExam.total_actual_score).toFixed(1);
  const scoreRate = ((currentExam.total_actual_score / currentExam.total_max_score) * 100).toFixed(1);
  const lowestMod = currentExam.modules && currentExam.modules.length > 0 ? currentExam.modules[0] : null;

  // 顶部 4 个 KPI 卡片
  document.getElementById("dashboard-kpi-row").innerHTML = `
    <div class="kpi-card" style="border-top:4px solid var(--accent-red);">
      <div class="kpi-label">当前诊断试卷总分 / 满分</div>
      <div class="kpi-value">${currentExam.total_actual_score} <span style="font-size:15px;color:var(--text-muted);">/ ${currentExam.total_max_score}分</span></div>
      <div class="kpi-sub">总得分率 <strong>${scoreRate}%</strong> · 共失分 <strong style="color:var(--accent-red);">${lostTotal}分</strong></div>
    </div>
    <div class="kpi-card" style="border-top:4px solid var(--accent-gold);">
      <div class="kpi-label">头号出血点（得分率最低板块）</div>
      <div class="kpi-value" style="color:var(--accent-red);font-size:21px;">${lowestMod ? lowestMod.module_name : "--"}</div>
      <div class="kpi-sub">得分率仅 <strong>${lowestMod ? lowestMod.score_rate : 0}%</strong>（${lowestMod ? lowestMod.actual_score : 0}/${lowestMod ? lowestMod.max_score : 0}分）</div>
    </div>
    <div class="kpi-card" style="border-top:4px solid var(--accent-indigo);">
      <div class="kpi-label">A类+B类可快速追回失分池</div>
      <div class="kpi-value" style="color:var(--accent-indigo);">+${(currentExam.loss_type_a_score + currentExam.loss_type_b_score).toFixed(1)} <span style="font-size:14px;">分</span></div>
      <div class="kpi-sub">A类必拿分失 ${currentExam.loss_type_a_score}分 · B类套路题失 ${currentExam.loss_type_b_score}分</div>
    </div>
    <div class="kpi-card" style="border-top:4px solid var(--accent-jade);">
      <div class="kpi-label">活页进步本“读薄”内化率</div>
      <div class="kpi-value" style="color:var(--accent-jade);">${ov.progress_book_stats.struck_out_thinned} <span style="font-size:14px;">张已划掉</span></div>
      <div class="kpi-sub">当前活跃待死磕 <strong>${ov.progress_book_stats.active_thickness}</strong> 张 · 红牌预警 ${ov.progress_book_stats.red_alert_count} 张</div>
    </div>
  `;

  // 左：7 大模块得分率与 ROI 排序表
  const modRows = (currentExam.modules || [])
    .map((m, idx) => {
      const barColor =
        m.score_rate < 52
          ? "var(--accent-red)"
          : m.score_rate < 68
          ? "#d97706"
          : "var(--accent-jade)";
      return `
        <tr>
          <td><span class="badge ${idx < 2 ? "badge-red" : "badge-indigo"}">NO.${idx + 1}</span> <strong>${m.module_name}</strong></td>
          <td><strong>${m.actual_score}</strong> / ${m.max_score}分 <span style="color:var(--accent-red);font-size:12px;">(-${m.lost_score})</span></td>
          <td style="width:170px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
              <strong>${m.score_rate}%</strong>
              <span style="color:var(--text-muted);">ROI指数 ${m.roi_index}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${Math.min(100, m.score_rate)}%;background:${barColor};"></div>
            </div>
          </td>
          <td style="font-size:12px;color:var(--text-secondary);">${m.roi_difficulty}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="jumpToModuleBlitz('${m.module_code}')">🎯 去刷母题</button>
          </td>
        </tr>
      `;
    })
    .join("");

  document.getElementById("module-roi-table-container").innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>板块名称</th>
          <th>得分 / 满分</th>
          <th>得分率 & 提分ROI</th>
          <th>死磕见效评级</th>
          <th>战术动作</th>
        </tr>
      </thead>
      <tbody>${modRows}</tbody>
    </table>
    <div style="margin-top:10px;font-size:12.5px;color:var(--text-secondary);background:#faf8f3;padding:8px 12px;border-radius:6px;">
      💡 <strong>CT 诊断结论：</strong>${currentExam.notes || ""}
    </div>
  `;

  // 右上：单点爆破战役状态机
  const campHtml = (ov.campaigns || [])
    .map((c) => {
      const isLocked = c.is_primary_lock === 1;
      const isDone = c.status === "5_COMPLETED";
      const pct = Math.min(100, Math.round((c.completed_question_count / c.target_question_count) * 100));
      return `
        <div style="border:1.5px solid ${isLocked ? "var(--accent-red)" : "var(--border-color)"};background:${isLocked ? "#fffafa" : "#fff"};border-radius:8px;padding:12px 14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div>
              <span class="badge ${isLocked ? "badge-red" : isDone ? "badge-jade" : "badge-indigo"}">
                ${isLocked ? "🔒 当前唯一主锁" : isDone ? "✅ 已通关归档" : "⏳ 候补待命"}
              </span>
              <strong style="font-size:14px;margin-left:6px;">${c.module_name} · ${c.sub_topic || ""}</strong>
            </div>
            ${
              !isLocked
                ? `<button class="btn btn-sm btn-outline" onclick="lockCampaign(${c.id})">切换为主锁靶心</button>`
                : `<button class="btn btn-sm btn-primary" onclick="jumpToModuleBlitz('${c.module_code}')">⚡ 进入训练舱</button>`
            }
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">
            得分率演进：基准 <strong>${c.baseline_score_rate}%</strong> ➔ 当前 <strong>${c.current_score_rate}%</strong>（通关红线：<strong>${c.target_score_rate}%</strong>） | 限时母题进度：<strong>${c.completed_question_count}/${c.target_question_count}题 (${pct}%)</strong>
          </div>
          <div class="progress-track" style="height:8px;margin-bottom:6px;">
            <div class="progress-fill" style="width:${pct}%;background:${isDone ? "var(--accent-jade)" : "var(--accent-red)"};"></div>
          </div>
          <div style="font-size:11.5px;color:var(--text-muted);">📅 每日配额：${c.daily_schedule_str || "每日限时2篇+三维复盘"}</div>
        </div>
      `;
    })
    .join("");
  document.getElementById("campaigns-list-container").innerHTML = campHtml;

  // 右下：考后 ABC 三层失分复盘对账
  const lossA = currentExam.loss_type_a_score || 0;
  const lossB = currentExam.loss_type_b_score || 0;
  const lossC = currentExam.loss_type_c_score || 0;
  document.getElementById("abc-loss-breakdown-container").innerHTML = `
    <div class="grid-3" style="gap:10px;margin-bottom:10px;">
      <div style="background:#fdf2f0;border:1px solid #f5c2bc;border-radius:8px;padding:10px;">
        <div style="font-size:12px;font-weight:700;color:var(--accent-red);">A类：低级与记忆失分</div>
        <div style="font-size:20px;font-weight:800;color:var(--accent-red);margin:3px 0;">-${lossA} 分</div>
        <div style="font-size:11.5px;color:var(--text-secondary);">名句默写错字、看错“不正确”题干、文言课内实词遗忘（必须100%清零！）</div>
      </div>
      <div style="background:#fcf8ec;border:1px solid #ebd79a;border-radius:8px;padding:10px;">
        <div style="font-size:12px;font-weight:700;color:#b45309;">B类：高频题型套路失分</div>
        <div style="font-size:20px;font-weight:800;color:#b45309;margin:3px 0;">-${lossB} 分</div>
        <div style="font-size:11.5px;color:var(--text-secondary);">信息类9大设误未识破、古诗漏答深层情感、作文叙议失衡（单点爆破主战场！）</div>
      </div>
      <div style="background:#f0f4fc;border:1px solid #c2d4f8;border-radius:8px;padding:10px;">
        <div style="font-size:12px;font-weight:700;color:var(--accent-indigo);">C类：高阶素养与审美失分</div>
        <div style="font-size:20px;font-weight:800;color:var(--accent-indigo);margin:3px 0;">-${lossC} 分</div>
        <div style="font-size:11.5px;color:var(--text-secondary);">文学类深层哲思意蕴、作文深刻度与文采升华（靠北大11元素与思辨金句拔高）</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-secondary);">
      ✅ <strong>数学勾稽校验通过：</strong>卷面满分(${currentExam.total_max_score}) - 实际得分(${currentExam.total_actual_score}) = <strong>${lostTotal}分</strong> == A类(${lossA}) + B类(${lossB}) + C类(${lossC})。
    </div>
  `;

  // 底部：历次大考轨迹对比表
  const trajRows = ov.exams
    .map((ex) => {
      const getModStr = (code) => {
        const found = (ex.modules || []).find((m) => m.module_code === code);
        return found ? `${found.actual_score}/${found.max_score} (${found.score_rate}%)` : "--";
      };
      return `
        <tr>
          <td><strong>${ex.exam_date}</strong></td>
          <td><strong>${ex.exam_name}</strong></td>
          <td><span class="badge ${ex.total_actual_score >= 95 ? "badge-jade" : "badge-red"}" style="font-size:13px;">${ex.total_actual_score} / ${ex.total_max_score}</span></td>
          <td>${getModStr("INFO_READ")}</td>
          <td>${getModStr("DICTATION")}</td>
          <td>${getModStr("POETRY")}</td>
          <td>${getModStr("LIT_READ")}</td>
          <td>${getModStr("CLASSICAL")}</td>
          <td>${getModStr("ESSAY")}</td>
        </tr>
      `;
    })
    .join("");

  document.getElementById("exam-trajectory-container").innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>考试日期</th>
          <th>考试名称</th>
          <th>总分</th>
          <th>信息类阅读</th>
          <th>名句默写</th>
          <th>古诗鉴赏</th>
          <th>文学类阅读</th>
          <th>文言文阅读</th>
          <th>作文(含书写)</th>
        </tr>
      </thead>
      <tbody>${trajRows}</tbody>
    </table>
  `;
}

function onSelectExamChange() {
  const sel = document.getElementById("exam-selector");
  STATE.selectedExamId = Number(sel.value);
  renderDashboard();
}

async function lockCampaign(campaignId) {
  try {
    await apiPost(`/api/campaigns/${campaignId}/lock`, {});
    await refreshAllData();
  } catch (err) {
    alert("切换主锁靶心失败：" + err.message);
  }
}

function jumpToModuleBlitz(moduleCode) {
  switchTab("tab-blitz");
  const filterEl = document.getElementById("blitz-module-filter");
  if (filterEl) {
    filterEl.value = moduleCode;
    loadBlitzQuestions();
  }
}

// ---------------------------------------------------------------------------
// 模块 2: 🎯 单点爆破沉浸式训练舱
// ---------------------------------------------------------------------------

function startBlitzTimer() {
  if (STATE.blitzTimerInterval) clearInterval(STATE.blitzTimerInterval);
  STATE.blitzTimerInterval = setInterval(() => {
    STATE.blitzTimerSeconds += 1;
    const mins = String(Math.floor(STATE.blitzTimerSeconds / 60)).padStart(2, "0");
    const secs = String(STATE.blitzTimerSeconds % 60).padStart(2, "0");
    const disp = document.getElementById("blitz-timer-display");
    if (disp) disp.textContent = `⏱️ ${mins}:${secs}`;
  }, 1000);
}

function resetBlitzTimer() {
  STATE.blitzTimerSeconds = 0;
  const disp = document.getElementById("blitz-timer-display");
  if (disp) disp.textContent = "⏱️ 00:00";
}

function populateBlitzSelectors() {
  loadBlitzQuestions();
}

function loadBlitzQuestions() {
  const modFilter = document.getElementById("blitz-module-filter").value;
  const filtered =
    modFilter === "ALL"
      ? STATE.questions
      : STATE.questions.filter((q) => q.module_code === modFilter);

  const qSel = document.getElementById("blitz-question-selector");
  qSel.innerHTML = filtered
    .map(
      (q, i) =>
        `<option value="${q.id}">[${q.module_name}] ${i + 1}. ${q.source_name} · ${q.question_no}</option>`
    )
    .join("");

  renderCurrentBlitzQuestion();
}

function renderCurrentBlitzQuestion() {
  const qId = Number(document.getElementById("blitz-question-selector").value);
  const q = STATE.questions.find((item) => item.id === qId) || STATE.questions[0];
  if (!q) return;

  STATE.currentBlitzQuestion = q;
  resetBlitzTimer();
  document.getElementById("blitz-3d-result-card").style.display = "none";
  document.getElementById("blitz-student-answer").value = "";

  document.getElementById("blitz-q-header").textContent = `📄 ${q.source_name} · ${q.question_no}（建议限时 ${q.recommended_minutes || 6} 分钟）`;
  document.getElementById("blitz-q-score-badge").textContent = `满分 ${q.max_score} 分`;

  const passageHtml = `
    <div style="font-weight:700;font-size:15px;margin-bottom:6px;color:var(--accent-indigo);">
      ${q.passage_title || q.module_name} ${q.passage_author ? `· ${q.passage_author}` : ""}
    </div>
    <div style="white-space:pre-wrap;">${q.passage_content || "（无独立长文背景，请直接审读下方题干）"}</div>
    ${
      q.passage_notes
        ? `<div style="margin-top:10px;padding-top:8px;border-top:1px dashed #ccc;font-size:12.5px;color:var(--text-secondary);"><strong>【注释与破题线索】</strong>${q.passage_notes}</div>`
        : ""
    }
  `;
  document.getElementById("blitz-passage-box").innerHTML = passageHtml;
  document.getElementById("blitz-stem-box").innerHTML = `【题干设问】${q.question_stem}`;

  // 如果是选择题，渲染可点击选项
  const optBox = document.getElementById("blitz-options-container");
  if (q.options && Array.isArray(q.options) && q.options.length > 0) {
    optBox.innerHTML = q.options
      .map(
        (opt) => `
        <div style="padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:6px;cursor:pointer;background:#faf8f3;"
             onclick="selectObjectiveOption('${opt.slice(0, 1)}')">
          ${opt}
        </div>
      `
      )
      .join("");
  } else {
    optBox.innerHTML = "";
  }
}

function selectObjectiveOption(letter) {
  document.getElementById("blitz-student-answer").value = letter;
}

async function submitBlitzAnswer() {
  const q = STATE.currentBlitzQuestion;
  if (!q) return;
  const stuAns = document.getElementById("blitz-student-answer").value.trim();
  if (!stuAns) {
    alert("请先输入你的作答内容或选择选项！");
    return;
  }

  try {
    const res = await apiPost("/api/blitz/submit", {
      question_id: q.id,
      student_answer: stuAns,
      time_spent_seconds: STATE.blitzTimerSeconds,
    });
    STATE.lastBlitzResult = { question: q, student_answer: stuAns, result: res };
    renderBlitz3DResult(q, stuAns, res);
    todayMark("question");
  } catch (err) {
    alert("判分失败：" + err.message);
  }
}

function renderBlitz3DResult(q, stuAns, res) {
  const card = document.getElementById("blitz-3d-result-card");
  card.style.display = "block";

  const analysis = res.analysis || {};
  const rubric =
    res.rubric && res.rubric.length
      ? res.rubric
      : (analysis.dim1_scoring_points || []).map((p) => ({ point: p.point, score: p.score }));
  STATE.lastRubric = rubric;
  STATE.selfEval = null;

  document.getElementById("blitz-earned-badge").textContent = `自评：0 / ${res.max_score || q.max_score} 分`;
  document.getElementById("blitz-earned-badge").className = "badge badge-gold";

  const rubricHtml = rubric
    .map(
      (r, i) => `
      <label class="rubric-item" id="rubric-item-${i}" for="rubric-cb-${i}">
        <input type="checkbox" id="rubric-cb-${i}" class="rubric-cb" data-idx="${i}"
               data-score="${r.score}" onchange="onRubricToggle()" />
        <span style="flex:1;">
          <strong style="color:var(--accent-indigo);">第 ${i + 1} 条</strong>
          ${r.point}
        </span>
        <span class="rubric-score">${r.score} 分</span>
      </label>`
    )
    .join("");

  const dirHtml =
    analysis.dim2_direction_warnings && analysis.dim2_direction_warnings.length > 0
      ? analysis.dim2_direction_warnings.map((w) => `<li>${w}</li>`).join("")
      : "<li>作答结构与分点方向良好。</li>";

  const upgHtml = (analysis.dim3_term_upgrades || [])
    .map(
      (u) =>
        `<li>将【${u.original}】改成阅卷更认的说法：<strong style="color:var(--accent-indigo);">${u.upgrade}</strong></li>`
    )
    .join("");

  document.getElementById("blitz-3d-result-body").innerHTML = `
    <div style="background:#faf8f3;padding:10px 12px;border-radius:6px;margin-bottom:14px;font-size:13px;line-height:1.8;">
      <strong>【参考答案】</strong><br/>${res.standard_answer}
    </div>

    <div style="background:#f0f4fc;padding:8px 12px;border-radius:6px;margin-bottom:10px;font-size:12.5px;color:#3d4a7a;">
      <strong>现在由你自己判分。</strong>对照参考答案，逐条勾选"这条我确实答到了"。
      机器不会替你判断对错——它只会数关键词，数得准不准，你比我清楚。
    </div>

    ${rubricHtml}

    <div class="self-eval-bar">
      <div>
        <div style="font-size:12px;color:var(--text-secondary);">我这条答到了吗？勾完自动算分</div>
        <div><span class="self-eval-score" id="self-eval-score">0</span>
          <span style="font-size:13px;color:var(--text-secondary);"> / ${res.max_score || q.max_score} 分</span></div>
      </div>
      <button class="btn btn-primary" onclick="prefillProgressCardFromBlitz()">
        📒 带着这个分数，存入进步本
      </button>
    </div>

    <details style="margin-top:14px;">
      <summary style="cursor:pointer;font-size:12.5px;color:var(--text-secondary);">
        机器初判与提示（仅作参考，不计入你的得分）点开查看
      </summary>
      <div style="margin-top:10px;">
        <h4 style="font-size:13px;margin-bottom:6px;color:#b45309;">形式自查</h4>
        <ul style="padding-left:18px;font-size:12.5px;margin-bottom:10px;">${dirHtml}</ul>
        ${
          upgHtml
            ? `<h4 style="font-size:13px;margin:8px 0 6px;color:var(--accent-indigo);">可换的术语</h4>
               <ul style="padding-left:18px;font-size:12.5px;">${upgHtml}</ul>`
            : ""
        }
      </div>
    </details>
  `;
}

// 自评勾选：实时算分
function onRubricToggle() {
  const boxes = Array.from(document.querySelectorAll(".rubric-cb"));
  let earned = 0;
  boxes.forEach((cb, i) => {
    const item = document.getElementById(`rubric-item-${i}`);
    const on = cb.checked;
    if (item) item.classList.toggle("checked", on);
    if (on) earned += Number(cb.dataset.score || 0);
  });
  earned = Math.round(earned * 10) / 10;

  const rubric = STATE.lastRubric || [];
  const total = rubric.reduce((sum, r) => sum + Number(r.score || 0), 0);
  const missing = rubric.filter((r, i) => !(boxes[i] && boxes[i].checked)).map((r) => r.point);

  STATE.selfEval = { earned, total, missing };

  const scoreEl = document.getElementById("self-eval-score");
  if (scoreEl) scoreEl.textContent = earned;
  const badge = document.getElementById("blitz-earned-badge");
  if (badge) {
    badge.textContent = `自评：${earned} / ${total} 分`;
    badge.className = `badge ${total > 0 && earned / total >= 0.75 ? "badge-jade" : "badge-red"}`;
  }
}

function prefillProgressCardFromBlitz() {
  if (!STATE.lastBlitzResult) return;
  const { question, student_answer, result } = STATE.lastBlitzResult;

  switchTab("tab-progress");
  const drawer = document.getElementById("new-card-drawer");
  drawer.style.display = "block";

  document.getElementById("nc-module").value = `${question.module_code}|${question.module_name}`;
  document.getElementById("nc-source").value = `${question.source_name} · ${question.question_no}`;
  document.getElementById("nc-max-score").value = question.max_score;
  document.getElementById("nc-stem").value = `[${question.question_no}] ${(question.question_stem || "").slice(0, 72)}`;
  document.getElementById("nc-wrong").value = student_answer;
  document.getElementById("nc-right").value = result.standard_answer;
  document.getElementById("nc-reflection").value = "";
  document.getElementById("nc-warning").value = "只要看到题干设问……，先圈……，必答表层+深层……";

  // 自评未答到的条款写入题干摘要下方，提醒自己漏在哪
  const hint = document.getElementById("new-card-hint");
  if (hint) {
    const self = STATE.selfEval;
    if (self && self.missing && self.missing.length) {
      hint.style.display = "block";
      hint.innerHTML = `<strong>自评 ${self.earned} / ${self.total} 分。</strong>没答到的：${self.missing
        .map((m) => "「" + String(m).slice(0, 26) + "」")
        .join("　")}<br/>把这些写进下面的"错因深挖"里，不要写"粗心"。`;
    } else {
      hint.style.display = "none";
    }
  }
  document.getElementById("nc-reflection").focus();
}

// ---------------------------------------------------------------------------
// 模块 3: 📒 会“变薄”的活页进步本 & 1-2-7-15 遮罩抗遗忘复盘
// ---------------------------------------------------------------------------

function toggleNewCardDrawer() {
  const drawer = document.getElementById("new-card-drawer");
  drawer.style.display = drawer.style.display === "none" ? "block" : "none";
}

async function loadProgressCards() {
  const filterVal = document.getElementById("progress-stage-filter").value;
  let url = "/api/progress-cards";
  if (filterVal === "DUE") url += "?due_only=true";
  else if (filterVal === "ACTIVE") url += "?stage_filter=ACTIVE";
  else if (filterVal === "STRUCK_OUT") url += "?stage_filter=STRUCK_OUT";
  else if (filterVal === "RED_ALERT") url += "?stage_filter=RED_ALERT";

  const data = await apiGet(url);
  STATE.progressCards = data.cards || [];
  STATE.deckMetrics = data.deck_metrics || {};
  renderProgressBookSection();
}

function renderProgressBookSection() {
  const m = STATE.deckMetrics || {};
  document.getElementById("progress-book-kpi-row").innerHTML = `
    <div class="kpi-card" style="border-top:4px solid var(--accent-indigo);">
      <div class="kpi-label">活页本当前剩余厚度（未划掉）</div>
      <div class="kpi-value">${m.active_thickness || 0} <span style="font-size:14px;">张</span></div>
      <div class="kpi-sub">目标：期末前将存量卡片全部吃透清零</div>
    </div>
    <div class="kpi-card" style="border-top:4px solid var(--accent-jade);">
      <div class="kpi-label">🖍️ 已红笔划掉（把厚书读薄成果）</div>
      <div class="kpi-value" style="color:var(--accent-jade);">${m.struck_out_thinned || 0} <span style="font-size:14px;">张</span></div>
      <div class="kpi-sub">通过第 1-2-7-15 天四轮遮罩大考正式归档</div>
    </div>
    <div class="kpi-card" style="border-top:4px solid var(--accent-gold);">
      <div class="kpi-label">🔔 今日到期必须遮罩复盘</div>
      <div class="kpi-value" style="color:#b45309;">${m.due_today || 0} <span style="font-size:14px;">张</span></div>
      <div class="kpi-sub">遮住标答口述或默写采分词，不准光用眼看</div>
    </div>
    <div class="kpi-card" style="border-top:4px solid var(--accent-red);">
      <div class="kpi-label">🚨 红牌认知预警（累计卡壳≥3次）</div>
      <div class="kpi-value" style="color:var(--accent-red);">${m.red_alert || 0} <span style="font-size:14px;">张</span></div>
      <div class="kpi-sub">存在深层思维盲区，需重做3道同类变式题</div>
    </div>
  `;

  const container = document.getElementById("progress-cards-container");
  if (!STATE.progressCards || STATE.progressCards.length === 0) {
    const totalCards = (m.active_thickness || 0) + (m.struck_out_thinned || 0);
    container.innerHTML =
      totalCards === 0
        ? `<div class="card" style="text-align:center;padding:36px 20px;">
             <div style="font-size:15px;font-weight:700;margin-bottom:8px;">活页本还是空的</div>
             <p style="font-size:13px;color:var(--text-secondary);line-height:1.9;margin-bottom:16px;">
               错题卡不是抄答案。去训练舱做一题 → 对照参考答案自评 →<br/>
               把「没答到的采分点」写进错因，卡片才会长出来。
             </p>
             <button class="btn btn-primary" onclick="switchTab('tab-blitz')">去训练舱做第一题</button>
           </div>`
        : `<div class="card">当前筛选条件下没有卡片，换个筛选试试。</div>`;
    return;
  }

  container.innerHTML = STATE.progressCards
    .map((c) => {
      const isStruck = c.review_stage === "5_STRUCK_OUT_MASTERED";
      const isRed = c.review_stage === "9_COGNITIVE_ALERT" || c.fail_count >= 3;
      const cls = isStruck ? "struck-out" : isRed ? "red-alert" : "";

      return `
        <div class="progress-card-item ${cls}" id="pcard-${c.id}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <div>
              <span class="badge ${isRed ? "badge-red" : isStruck ? "badge-jade" : "badge-indigo"}">${c.stage_label}</span>
              <span class="badge badge-gold">${c.loss_category}类失分 · -${c.lost_score}分</span>
              <strong style="margin-left:6px;font-size:13.5px;">[${c.module_name}] ${c.source_label} ${c.question_no || ""}</strong>
            </div>
            <div style="font-size:12px;color:var(--text-muted);">
              下次复盘：<strong>${c.next_review_date}</strong> | 通关 ${c.pass_count} 次 / 卡壳 ${c.fail_count} 次
            </div>
          </div>

          <div class="card-stem-title" style="font-weight:700;font-size:14px;margin-bottom:6px;">
            📌 关键题干摘要：${c.key_stem_snippet}
          </div>

          <div style="font-size:13px;color:var(--accent-red);margin-bottom:6px;">
            ❌ <strong>当时错答：</strong>${c.student_wrong_answer}
          </div>

          <!-- 1-2-7-15 遮罩区（点击揭开遮罩核对） -->
          <div class="masked-box">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:12px;font-weight:700;color:var(--accent-indigo);">🔒 遮罩自测区（请先在脑中背出采分点与警戒令，再点击右侧揭开遮罩）</span>
              <button class="btn btn-sm btn-outline" onclick="toggleCardMask(${c.id})">👁️ 揭开/合上遮罩</button>
            </div>
            <div id="mask-content-${c.id}" class="masked-content ${isStruck ? "" : "is-blurred"}">
              <div style="font-size:13px;margin-bottom:4px;">✅ <strong>标准答案采分点：</strong>${c.standard_right_answer}</div>
              <div style="font-size:13px;margin-bottom:4px;">🧠 <strong>深层错因反思：</strong>${c.error_reason_reflection}</div>
              <div style="font-size:13px;margin-bottom:4px;">🔑 <strong>核心知识点浓缩：</strong>${c.knowledge_point_summary}</div>
              ${
                c.similar_examples
                  ? `<div style="font-size:12.5px;color:var(--text-secondary);">🔗 <strong>同类印证：</strong>${c.similar_examples}</div>`
                  : ""
              }
            </div>
          </div>

          <div class="warning-banner">
            ⚡ 下次考场警戒指令：${c.next_time_warning}
          </div>

          ${
            !isStruck
              ? `
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
              <button class="btn btn-sm btn-outline" style="color:var(--accent-red);border-color:#f5c2bc;" onclick="submitCardReview(${c.id}, false)">
                ❌ 遮罩复盘仍有卡壳（重置回第1天）
              </button>
              <button class="btn btn-sm btn-jade" onclick="submitCardReview(${c.id}, true)">
                ✅ 遮罩默写全对（晋级下一轮 / 第15天直接红笔划掉！）
              </button>
            </div>
          `
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function toggleCardMask(cardId) {
  const el = document.getElementById(`mask-content-${cardId}`);
  if (el) el.classList.toggle("is-blurred");
}

async function submitCardReview(cardId, isPassed) {
  try {
    const res = await apiPost(`/api/progress-cards/${cardId}/review`, {
      is_passed: isPassed,
      student_recall_note: isPassed ? "遮罩口述采分点全部命中" : "部分采分词回忆不完整",
      time_spent_seconds: 40,
    });
    todayMark("due");
    alert(res.transition.message);
    await refreshAllData();
  } catch (err) {
    alert("复盘提交失败：" + err.message);
  }
}

async function submitNewProgressCard() {
  const modParts = document.getElementById("nc-module").value.split("|");
  const payload = {
    module_code: modParts[0],
    module_name: modParts[1],
    source_label: document.getElementById("nc-source").value.trim(),
    loss_category: document.getElementById("nc-loss-cat").value,
    max_score: Number(document.getElementById("nc-max-score").value || 3),
    actual_score: STATE.selfEval ? Number(STATE.selfEval.earned || 0) : 0,
    key_stem_snippet: document.getElementById("nc-stem").value.trim(),
    student_wrong_answer: document.getElementById("nc-wrong").value.trim(),
    standard_right_answer: document.getElementById("nc-right").value.trim(),
    error_reason_reflection: document.getElementById("nc-reflection").value.trim(),
    knowledge_point_summary: (STATE.selfEval && STATE.selfEval.missing && STATE.selfEval.missing.length)
      ? "本题未答到的采分点：" + STATE.selfEval.missing.slice(0, 3).join("；")
      : "",
    next_time_warning: document.getElementById("nc-warning").value.trim(),
    sync_to_excel: false,
  };

  const errBox = document.getElementById("gate-error-alert");
  errBox.style.display = "none";

  try {
    const res = await apiPost("/api/progress-cards", payload);
    alert(res.message);
    document.getElementById("new-card-drawer").style.display = "none";
    await refreshAllData();
  } catch (err) {
    errBox.style.display = "block";
    const detail = err.detail || {};
    const errList = detail.errors || [typeof detail === "string" ? detail : "提交未通过认知门禁校验"];
    errBox.innerHTML = `
      <div style="background:#fdf2f0;border:1.5px solid var(--accent-red);padding:10px 14px;border-radius:6px;color:#8a1f14;">
        <strong>🛑 认知反思门禁拦截（拒绝假努力与浅层归因）：</strong>
        <ul style="padding-left:18px;margin-top:4px;">
          ${errList.map((e) => `<li>${e}</li>`).join("")}
        </ul>
      </div>
    `;
  }
}

function renderTrapRadar() {
  const container = document.getElementById("trap-radar-list");
  if (!STATE.trapRules) return;

  container.innerHTML = STATE.trapRules
    .map(
      (r, idx) => `
      <div style="padding:10px 12px;border:1px solid var(--border-color);border-left:4px solid ${idx < 5 ? "var(--accent-red)" : "var(--accent-gold)"};border-radius:6px;margin-bottom:8px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span class="badge ${idx < 5 ? "badge-red" : "badge-indigo"}">${r.module_name} · ${r.trap_category}</span>
          <button class="btn btn-sm btn-outline" onclick="hitTrapRule(${r.id})">🔥 已踩坑 ${r.hit_count} 次 (+1)</button>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--text-main);">${r.warning_instruction}</div>
      </div>
    `
    )
    .join("");
}

async function hitTrapRule(ruleId) {
  await apiPost(`/api/trap-rules/${ruleId}/hit`, {});
  const trapData = await apiGet("/api/trap-rules");
  STATE.trapRules = trapData.trap_rules || [];
  renderTrapRadar();
}

// ---------------------------------------------------------------------------
// 模块 4: 🏛️ 文言文“考频通关地图”工作台
// ---------------------------------------------------------------------------

function renderClassicalSection() {
  const data = STATE.classicalData;
  if (!data) return;

  renderClassicalWords();

  // 右侧：推断七法与六字诀
  const sevenHtml = (data.scaffolds.seven_inference_methods || [])
    .map(
      (m) => `
      <div style="padding:7px 10px;border-bottom:1px solid var(--border-color);font-size:12.5px;">
        <strong style="color:var(--accent-indigo);">${m.method}：</strong>${m.tip}
      </div>
    `
    )
    .join("");
  document.getElementById("classical-seven-methods").innerHTML = sevenHtml;

  const sixHtml = (data.scaffolds.six_char_translation || [])
    .map(
      (c) => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid var(--border-color);font-size:12.5px;">
        <span class="badge badge-red" style="font-size:13px;min-width:28px;justify-content:center;">${c.char}</span>
        <span>${c.desc}</span>
      </div>
    `
    )
    .join("");
  document.getElementById("classical-six-chars").innerHTML = sixHtml;
}

function renderClassicalWords() {
  const data = STATE.classicalData;
  if (!data || !data.words) return;

  const filterType = document.getElementById("classical-type-filter").value;
  const words =
    filterType === "ALL" ? data.words : data.words.filter((w) => w.word_type === filterType);

  document.getElementById("classical-words-grid").innerHTML = words
    .map((w) => {
      const statusBadge =
        w.mastery_status === "MASTERED"
          ? `<span class="badge badge-jade">已通关</span>`
          : w.mastery_status === "FAMILIAR"
          ? `<span class="badge badge-gold">眼熟巩固</span>`
          : `<span class="badge badge-red">重点死磕</span>`;

      const meaningsList = (w.meanings || [])
        .map(
          (m) =>
            `<li style="margin-bottom:4px;"><strong>【${m.pos || "义项"}】${m.gloss}</strong><br/><span style="color:var(--text-secondary);font-size:12px;">例：${m.example}</span></li>`
        )
        .join("");

      return `
        <div class="card" style="margin-bottom:0;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div>
                <span style="font-size:22px;font-weight:800;color:var(--accent-indigo);margin-right:6px;">${w.word}</span>
                <span class="badge badge-indigo">${w.word_type_label || w.word_type} · ${w.freq_tier_label || w.freq_tier}</span>
              </div>
              ${statusBadge}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">
              课文溯源：${w.source_lesson || "高考核心母词"}
            </div>
            <div id="cword-mask-${w.id}" class="masked-content ${STATE.classicalMaskAll ? "is-blurred" : ""}" style="background:#faf8f3;padding:8px 12px;border-radius:6px;border:1px dashed #d5cbb8;">
              <ul style="padding-left:16px;font-size:12.5px;">${meaningsList}</ul>
              <div style="margin-top:6px;font-size:12px;color:#8a1f14;font-weight:600;">💡 推断锦囊：${w.inference_tip || ""}</div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid var(--border-color);">
            <button class="btn btn-sm btn-outline" onclick="toggleSingleWordMask(${w.id})">👁️ 显隐义项</button>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-sm btn-outline" style="color:var(--accent-red);" onclick="markClassicalWord(${w.id}, false)">卡壳</button>
              <button class="btn btn-sm btn-jade" onclick="markClassicalWord(${w.id}, true)">秒答通关</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function toggleClassicalMaskAll() {
  STATE.classicalMaskAll = !STATE.classicalMaskAll;
  renderClassicalWords();
}

function toggleSingleWordMask(wordId) {
  const el = document.getElementById(`cword-mask-${wordId}`);
  if (el) el.classList.toggle("is-blurred");
}

async function markClassicalWord(wordId, isPassed) {
  await apiPost(`/api/classical-words/${wordId}/review`, { is_passed: isPassed });
  const classicalData = await apiGet("/api/classical-words");
  STATE.classicalData = classicalData;
  renderClassicalWords();
}

// ---------------------------------------------------------------------------
// 模块 5: 🌙 古诗鉴赏“十把钥匙开锁”工作台
// ---------------------------------------------------------------------------

function populatePoetryWorkspace() {
  STATE.poetryQuestions = STATE.questions.filter((q) => q.module_code === "POETRY");
  const sel = document.getElementById("poetry-question-selector");
  sel.innerHTML = STATE.poetryQuestions
    .map((q) => `<option value="${q.id}">${q.source_name} · 《${q.passage_title}》(${q.passage_author})</option>`)
    .join("");
  renderPoetryWorkspace();
}

function renderPoetryWorkspace() {
  const qId = Number(document.getElementById("poetry-question-selector").value);
  const q = STATE.poetryQuestions.find((item) => item.id === qId) || STATE.poetryQuestions[0];
  if (!q) return;

  STATE.currentPoetryQuestion = q;
  document.getElementById("poetry-eval-result").style.display = "none";

  document.getElementById("poetry-poem-display").innerHTML = `
    <div style="font-size:18px;font-weight:800;color:var(--text-main);">${q.passage_title}</div>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">${q.passage_author || ""}</div>
    <div style="white-space:pre-wrap;font-family:'Songti SC','Noto Serif SC',serif;font-size:16px;">${q.passage_content}</div>
    ${
      q.passage_notes
        ? `<div style="margin-top:10px;font-size:12.5px;color:var(--text-secondary);text-align:left;border-top:1px dashed #d5cbb8;padding-top:6px;">${q.passage_notes}</div>`
        : ""
    }
  `;

  document.getElementById("poetry-stem-display").textContent = `【主观设问】${q.question_stem}（满分 ${q.max_score} 分）`;

  // v2：十把钥匙收敛为四把——记不住的清单等于没有清单
  const k = q.poetry_10keys || {};
  const keys = [
    ["① 看题与尾联", [k.key1_title, k.key3_tail], "题目定题材，尾联多是翻底牌的地方，先看它。"],
    ["② 知人看注", [k.key2_author_bg, k.key6_style], "注释没有闲笔：贬谪地、典故、生卒，都要用上。"],
    ["③ 圈意象辨冷暖", [k.key4_emotion_words, k.key5_cold_warm], "冷色（孤月、寒江、落木）定凄清，暖色定欢愉或反衬。"],
    ["④ 定手法再落笔", [k.key7_relation, k.key8_route, k.key9_detail, k.key10_mood], "先问清问的是什么：炼字、意境、手法还是情感，别答偏。"],
  ];

  document.getElementById("poetry-10keys-container").innerHTML = keys
    .map(([title, details, fallback]) => {
      const body = details.filter(Boolean).join(" ");
      return `
      <div class="key-box">
        <strong>🔑 ${title}</strong>
        <span>${body || fallback}</span>
      </div>
    `;
    })
    .join("");
}

async function evaluatePoetryDualAnswer() {
  const q = STATE.currentPoetryQuestion;
  if (!q) return;
  const surface = document.getElementById("poetry-layer-surface").value.trim();
  const deep = document.getElementById("poetry-layer-deep").value.trim();

  if (!surface || !deep) {
    alert("【双轨强制门禁】古诗鉴赏严禁只写单层！请同时填满【第一轨：表层意涵】与【第二轨：深层意蕴】！");
    return;
  }

  const combined = `①表层：${surface}\n②深层：${deep}`;
  const res = await apiPost("/api/blitz/submit", {
    question_id: q.id,
    student_answer: combined,
    time_spent_seconds: 240,
  });

  const box = document.getElementById("poetry-eval-result");
  box.style.display = "block";
  box.innerHTML = `
    <div style="background:#eef8f3;border:1px solid #b7e4cf;padding:12px;border-radius:8px;">
      <div style="font-weight:700;color:var(--accent-jade);margin-bottom:6px;">
        ✅ 双层答案合成完毕！模拟赋分：${res.analysis.earned_score} / ${res.analysis.max_score} 分
      </div>
      <div style="font-size:12.5px;margin-bottom:6px;"><strong>【你的合成答案】</strong><br/>${combined.replace(/\n/g, "<br/>")}</div>
      <div style="font-size:12.5px;background:#fff;padding:8px;border-radius:4px;"><strong>【高考阅卷标准答案】</strong><br/>${res.standard_answer}</div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// 模块 6: 📖 现代文阅读精读沙盒
// ---------------------------------------------------------------------------

function renderModernReadingSection() {
  const ref = STATE.modernReference;
  if (!ref) return;

  document.getElementById("modern-info-9traps-list").innerHTML = (ref.info_reading_9_traps || [])
    .map(
      (t) => `
      <div style="padding:9px 12px;border:1px solid var(--border-color);border-left:4px solid var(--accent-red);border-radius:6px;margin-bottom:8px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="color:var(--accent-red);">${t.code} · ${t.name}</strong>
          <span class="badge badge-red">高频设误</span>
        </div>
        <div style="font-size:12.5px;margin-top:3px;"><strong>⚡ 盘面特征：</strong>${t.trigger}</div>
        <div style="font-size:12.5px;color:var(--accent-indigo);margin-top:2px;"><strong>🛡️ 拆雷反制：</strong>${t.counter}</div>
      </div>
    `
    )
    .join("");

  const CORE_5 = ["叙述视角与人称转换", "物象/核心道具意蕴", "环境描写的四重张力", "留白艺术与冰山理论", "语言风格与语体杂糅"];
  const coreElements = (ref.literary_11_high_elements || []).filter((el) => CORE_5.includes(el.element));

  document.getElementById("modern-lit-11elements-list").innerHTML = coreElements
    .map(
      (el) => `
      <div style="padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:8px;background:#faf8f3;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong style="color:var(--accent-indigo);">元素 ${el.id}：${el.element}</strong>
          <button class="btn btn-sm btn-outline" onclick="applyLiteraryElementTemplate(${el.id})">填入下方沙盒</button>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">细分维度：${el.sub_types}</div>
        <div style="font-size:12px;background:#fff;padding:6px 8px;border-radius:4px;border:1px dashed #ccc;">
          <strong>满分套用模板：</strong>${el.answer_template}
        </div>
      </div>
    `
    )
    .join("");
}

function applyLiteraryElementTemplate(elementId) {
  const ref = STATE.modernReference;
  if (!ref) return;
  const found = (ref.literary_11_high_elements || []).find((e) => e.id === elementId);
  if (!found) return;
  document.getElementById("mod-sandbox-l2").value = `【调用北大笔记·${found.element}】${found.answer_template}`;
}

// ---------------------------------------------------------------------------
// 模块 7: ✍️ 高考作文“心中有人·微格训练”工作台
// ---------------------------------------------------------------------------

function renderEssaySection() {
  renderEssayMaterials();
  const ws = STATE.essayWorkspace;
  if (!ws) return;

  document.getElementById("essay-quotes-container").innerHTML = (ws.quotes || [])
    .map(
      (q) => `
      <div style="padding:8px 10px;border-bottom:1px solid var(--border-color);font-size:12.5px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
          <span class="badge badge-gold">${q.theme_category}</span>
          <button class="btn btn-sm btn-outline" onclick="insertDialecticalQuote('${encodeURIComponent(q.quote_text)}')">➕ 插入第3步</button>
        </div>
        <div style="font-weight:600;color:var(--text-main);">“${q.quote_text}”</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px;">—— ${q.author_or_source || "思辨金句"} | 适用：${q.usage_tip || ""}</div>
      </div>
    `
    )
    .join("");
}

function renderEssayMaterials() {
  const ws = STATE.essayWorkspace;
  if (!ws || !ws.materials) return;

  const filterLayer = document.getElementById("essay-material-filter").value;
  const list =
    filterLayer === "ALL"
      ? ws.materials
      : ws.materials.filter((m) => m.category_layer === filterLayer);

  document.getElementById("essay-materials-container").innerHTML = list
    .map(
      (m) => `
      <div style="border:1px solid var(--border-color);border-left:4px solid var(--accent-indigo);border-radius:8px;padding:12px;margin-bottom:10px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div>
            <strong style="font-size:14.5px;color:var(--accent-indigo);">${m.person_or_concept}</strong>
            <span class="badge badge-indigo" style="margin-left:6px;">${m.sub_group || m.category_layer}</span>
          </div>
          <button class="btn btn-sm btn-primary" onclick="loadMaterialIntoTrainer(${m.id})">⚡ 填入微格训练器</button>
        </div>
        <div style="margin-bottom:4px;">
          ${(m.theme_tags || []).map((t) => `<span class="badge badge-gold" style="margin-right:4px;">#${t}</span>`).join("")}
        </div>
        <div style="font-size:12.5px;margin-bottom:4px;"><strong>🎬 要素一（高光镜头）：</strong>${m.core_scene}</div>
        <div style="font-size:12.5px;margin-bottom:4px;color:#8a1f14;"><strong>💬 要素二（原声名言）：</strong>${m.classic_quote}</div>
        <div style="font-size:12.5px;color:var(--text-secondary);"><strong>🧭 要素三（一材多用切角）：</strong>${m.core_angle_analysis}</div>
        ${
          m.fact_check_warning
            ? `<div style="margin-top:6px;padding:4px 8px;background:#fdf2f0;border-radius:4px;font-size:11.5px;color:var(--accent-red);font-weight:600;">⚠️ 史实防雷：${m.fact_check_warning}</div>`
            : ""
        }
      </div>
    `
    )
    .join("");
}

function loadMaterialIntoTrainer(matId) {
  const ws = STATE.essayWorkspace;
  if (!ws) return;
  const m = (ws.materials || []).find((x) => x.id === matId);
  if (!m) return;

  document.getElementById("essay-step2").value = `${m.core_scene}`;
  document.getElementById("essay-step3").value = `正因为${m.person_or_concept}秉持着“${m.classic_quote.slice(0, 28)}”的信念，才在沧桑考验前立定脚跟；倘若当时随波逐流、畏惧艰难，又岂能成就今日之精神坐标？诚然，境遇或有顺逆，然而唯有这种深入骨髓的坚守，方能跨越时代山海。`;
  liveUpdateEssayRatio();
}

function insertDialecticalQuote(encodedQuote) {
  const quote = decodeURIComponent(encodedQuote);
  const s3 = document.getElementById("essay-step3");
  s3.value = `${s3.value.trim()} 诚如所言：“${quote}”`;
  liveUpdateEssayRatio();
}

function liveUpdateEssayRatio() {
  const s1 = (document.getElementById("essay-step1")?.value || "").trim();
  const s2 = (document.getElementById("essay-step2")?.value || "").trim();
  const s3 = (document.getElementById("essay-step3")?.value || "").trim();
  const s4 = (document.getElementById("essay-step4")?.value || "").trim();

  const total = Math.max(1, s1.length + s2.length + s3.length + s4.length);
  const narRatio = ((s2.length / total) * 100).toFixed(1);
  const anaRatio = (100 - Number(narRatio)).toFixed(1);

  const leftLbl = document.getElementById("ratio-label-left");
  const rightLbl = document.getElementById("ratio-label-right");
  const totalLbl = document.getElementById("ratio-label-total");
  const barNar = document.getElementById("ratio-bar-narrative");
  const barAna = document.getElementById("ratio-bar-analysis");

  if (leftLbl) leftLbl.textContent = `叙例占比（第2步）：${narRatio}%（目标 ≤33%）`;
  if (rightLbl) rightLbl.textContent = `议论说理占比（第1+3+4步）：${anaRatio}%（目标 ≥67%）`;
  if (totalLbl) totalLbl.textContent = `全段总字数：${total} 字（黄金区间 180~250 字）`;

  if (barNar && barAna) {
    barNar.style.width = `${narRatio}%`;
    barNar.textContent = `叙 ${narRatio}%`;
    barNar.style.background = Number(narRatio) > 38 ? "var(--accent-red)" : "#d97706";
    barAna.style.width = `${anaRatio}%`;
    barAna.textContent = `议 ${anaRatio}%`;
  }
}

async function runEssayLinter(saveRecord = true) {
  const payload = {
    topic_prompt: document.getElementById("essay-topic-input").value.trim(),
    step1_point_sentence: document.getElementById("essay-step1").value.trim(),
    step2_material_sentence: document.getElementById("essay-step2").value.trim(),
    step3_analysis_sentences: document.getElementById("essay-step3").value.trim(),
    step4_callback_sentence: document.getElementById("essay-step4").value.trim(),
    save_record: saveRecord,
  };

  try {
    const res = await apiPost("/api/essay/lint-and-save", payload);
    const rep = res.report;

    const scoreBadge = document.getElementById("essay-score-badge");
    scoreBadge.textContent = `预估折算分：${rep.estimated_score_60} / 60 分（一类文基准）`;

    const critiquesHtml = (rep.critiques || []).map((c) => `<li style="margin-bottom:4px;">${c}</li>`).join("");
    const bannedHtml =
      rep.banned_phrases_hit && rep.banned_phrases_hit.length > 0
        ? rep.banned_phrases_hit
            .map((b) => `<div style="color:var(--accent-red);font-size:12.5px;">🚫 检测到套话/长句【${b.phrase}】：${b.reason}</div>`)
            .join("")
        : `<div style="color:var(--accent-jade);font-size:12.5px;">✅ 零陈词滥调！未检测到“随着时代的发展/众所周知”等七不要废话。</div>`;

    const factHtml =
      rep.fact_errors && rep.fact_errors.length > 0
        ? rep.fact_errors.map((f) => `<div style="color:var(--accent-red);font-weight:700;font-size:13px;">🚨 ${f}</div>`).join("")
        : `<div style="color:var(--accent-jade);font-size:12.5px;">✅ 史实雷达扫描通过，无张冠李戴硬伤。</div>`;

    document.getElementById("essay-lint-result").innerHTML = `
      <div style="background:#faf8f3;border:1px solid #d8d0c0;border-radius:8px;padding:14px;">
        <h4 style="font-size:14px;color:var(--accent-indigo);margin-bottom:8px;">📋 微格段落合成预览（共 ${rep.total_chars} 字）：</h4>
        <div style="background:#fff;padding:12px;border-radius:6px;line-height:1.8;font-size:14px;margin-bottom:10px;border-left:4px solid var(--accent-jade);">
          ${rep.combined_paragraph}
        </div>
        <ul style="padding-left:18px;font-size:13px;margin-bottom:8px;">${critiquesHtml}</ul>
        ${bannedHtml}
        ${factHtml}
      </div>
    `;
  } catch (err) {
    alert("作文微格批改失败：" + err.message);
  }
}

// ---------------------------------------------------------------------------
// 模块 8: 🖨️ A4 纸质闭环打印中心
// ---------------------------------------------------------------------------

function renderPrintSheet() {
  const bundle = STATE.printBundle;
  if (!bundle) return;
  const tpl = document.getElementById("print-template-selector").value;
  const container = document.getElementById("print-sheet-container");

  if (tpl === "TPL_1_STRATEGY") {
    const cardRows = (bundle.active_cards || [])
      .map(
        (c, i) => `
        <tr>
          <td><strong>${i + 1}. ${c.module_name}</strong><br/><span style="font-size:11px;color:#555;">${c.source_label}</span></td>
          <td>${c.key_stem_snippet}</td>
          <td style="color:#a01c1c;"><strong>错因：</strong>${c.error_reason_reflection}</td>
          <td><strong>规律：</strong>${c.knowledge_point_summary}<br/><strong style="color:#165c3e;">⚡警戒：${c.next_time_warning}</strong></td>
        </tr>
      `
      )
      .join("");

    container.innerHTML = `
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px;">
        <h2 style="font-size:19px;">《高考语文错题改进策略单页背诵清单》</h2>
        <p style="font-size:12px;color:#444;">班级：某省重点中学 2026级高一 | 生成时间：${bundle.generated_at} | 铁律：每周日遮罩复盘，连过4轮即用红笔划掉！</p>
      </div>
      <table class="data-table" style="font-size:12px;">
        <thead>
          <tr>
            <th style="width:15%;">板块与来源</th>
            <th style="width:26%;">关键题干与设误陷阱</th>
            <th style="width:26%;">深层思维断点（禁写粗心）</th>
            <th style="width:33%;">核心浓缩规律 & 考场条件反射指令</th>
          </tr>
        </thead>
        <tbody>${cardRows}</tbody>
      </table>
    `;
  } else if (tpl === "TPL_2_EMERGENCY") {
    const trapsHtml = (bundle.top_traps || [])
      .slice(0, 10)
      .map(
        (t, idx) =>
          `<div style="margin-bottom:5px;font-size:12.5px;"><strong>${idx + 1}. [${t.module_name}]</strong> ${t.warning_instruction} <span style="font-size:11px;color:#888;">(历史踩坑${t.hit_count}次)</span></div>`
      )
      .join("");

    const quotesHtml = (bundle.top_quotes || [])
      .slice(0, 6)
      .map(
        (q) =>
          `<div style="margin-bottom:5px;font-size:12px;">• <strong>【${q.theme_category}】</strong>“${q.quote_text}”（${q.author_or_source}）</div>`
      )
      .join("");

    const zjHtml = (bundle.zhejiang_materials || [])
      .slice(0, 5)
      .map(
        (m) =>
          `<div style="margin-bottom:6px;font-size:12px;">• <strong>${m.person_or_concept}：</strong>${m.core_scene} ➔ <em>名言：${m.classic_quote}</em></div>`
      )
      .join("");

    container.innerHTML = `
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px;">
        <h2 style="font-size:19px;">⚡《考前 15 分钟 · D-1 语文天眼急救包（一页纸终极浓缩）》</h2>
        <p style="font-size:12px;color:#444;">考生：${bundle.student_info} | 进考场发卷前 15 分钟唯一指定阅读材料</p>
      </div>

      <h3 style="font-size:14px;background:#eee;padding:4px 8px;margin-bottom:8px;">一、Top 10 高频踩坑条件反射警戒令（审题动笔前默念）</h3>
      <div style="margin-bottom:12px;">${trapsHtml}</div>

      <h3 style="font-size:14px;background:#eee;padding:4px 8px;margin-bottom:8px;">二、名篇名句默写易错字笔下生根（写完必查偏旁）</h3>
      <div style="margin-bottom:12px;font-size:12.5px;line-height:1.7;">
        1. 赢得<strong>仓皇</strong>北顾（勿写“苍黄”） &nbsp;|&nbsp;
        2. <strong>酾</strong>酒临江，横槊赋诗（酉字旁） &nbsp;|&nbsp;
        3. 君子生非异也，善<strong>假</strong>于物也 &nbsp;|&nbsp;
        4. 故不积<strong>跬</strong>步（足字旁+圭） &nbsp;|&nbsp;
        5. 金戈铁马，气吞万里如虎 &nbsp;|&nbsp;
        6. 人生如梦，一<strong>尊</strong>还<strong>酹</strong>江月（勿写“樽”）
      </div>

      <h3 style="font-size:14px;background:#eee;padding:4px 8px;margin-bottom:8px;">三、考场作文保底一类文核心人物卡 & 万能思辨金句</h3>
      <div style="margin-bottom:8px;">${zjHtml}</div>
      <div style="border-top:1px dashed #999;padding-top:6px;">${quotesHtml}</div>
    `;
  } else {
    const qList = STATE.questions.slice(0, 6);
    const clipRows = qList
      .map(
        (q, i) => `
        <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:14px;border-bottom:1.5px dashed #aaa;padding:12px 0;">
          <div>
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">【母题 ${i + 1}】${q.source_name} · ${q.question_no} (${q.module_name})</div>
            <div style="font-size:12px;white-space:pre-wrap;margin-bottom:6px;">${(q.passage_content || "").slice(0, 220)}${(q.passage_content || "").length > 220 ? "..." : ""}</div>
            <div style="font-size:12.5px;font-weight:600;">设问：${q.question_stem}</div>
          </div>
          <div style="border:1px solid #bbb;border-radius:6px;padding:8px;min-height:120px;font-size:11.5px;color:#666;">
            <div>✍️ <strong>纸上三刷重做区 & 红笔三维批注（找漏点/找错点/术语升级）：</strong></div>
          </div>
        </div>
      `
      )
      .join("");

    container.innerHTML = `
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px;">
        <h2 style="font-size:18px;">✂️《单点爆破母题剪贴本（左题右空 · 供纸上红笔三刷）》</h2>
        <p style="font-size:12px;color:#444;">源于《2026全国卷I语文141分经验分享》剪贴本工作流 · 刷透一道胜过盲刷十套</p>
      </div>
      ${clipRows}
    `;
  }
}

// ---------------------------------------------------------------------------
// 模态弹窗 2: ➕ 录入新考试与 ABC 失分对账
// ---------------------------------------------------------------------------

function openExamModal() {
  document.getElementById("exam-create-modal").classList.add("open");
  recalcExamModalTotals();
}

function closeExamModal() {
  document.getElementById("exam-create-modal").classList.remove("open");
}

function recalcExamModalTotals() {
  let sumActual = 0;
  document.querySelectorAll(".ex-mod-input").forEach((inp) => {
    sumActual += Number(inp.value || 0);
  });
  document.getElementById("ex-total-actual").value = sumActual;
  const lost = Math.max(0, 150 - sumActual);
  document.getElementById("ex-total-lost-span").textContent = lost;
}

async function submitNewExamRecord() {
  const modules = [];
  document.querySelectorAll(".ex-mod-input").forEach((inp) => {
    modules.push({
      module_code: inp.getAttribute("data-code"),
      module_name: inp.getAttribute("data-name"),
      max_score: Number(inp.getAttribute("data-max")),
      actual_score: Number(inp.value || 0),
      planned_minutes: Number(inp.getAttribute("data-plan")),
      actual_minutes: Number(inp.getAttribute("data-plan")),
      time_deviation_reason: "正常配速",
    });
  });

  const payload = {
    exam_name: document.getElementById("ex-name").value.trim(),
    exam_date: document.getElementById("ex-date").value,
    total_max_score: 150,
    total_actual_score: Number(document.getElementById("ex-total-actual").value),
    loss_type_a_score: Number(document.getElementById("ex-loss-a").value || 0),
    loss_type_b_score: Number(document.getElementById("ex-loss-b").value || 0),
    loss_type_c_score: Number(document.getElementById("ex-loss-c").value || 0),
    notes: document.getElementById("ex-notes").value.trim(),
    modules,
  };

  const errEl = document.getElementById("exam-create-error");
  errEl.style.display = "none";

  try {
    const res = await apiPost("/api/exams", payload);
    alert(res.message);
    closeExamModal();
    STATE.selectedExamId = res.exam_id;
    await refreshAllData();
  } catch (err) {
    errEl.style.display = "block";
    errEl.innerHTML = `<div style="background:#fdf2f0;border:1px solid var(--accent-red);color:#8a1f14;padding:8px 12px;border-radius:6px;font-size:12.5px;">${err.detail || err.message}</div>`;
  }
}
