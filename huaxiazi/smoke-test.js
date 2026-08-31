/* 冒烟测试：在 jsdom 中真实运行话匣子页面 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/Users/wujohn/.workbuddy/binaries/node/workspace/node_modules/jsdom');

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const topics = fs.readFileSync(path.join(dir, 'topics.js'), 'utf8');
const app = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;
window.confirm = () => true;
window.navigator.clipboard = { writeText: (t) => Promise.resolve() };

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name); }
}

window.eval(topics);
window.eval(app);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

const $ = (s) => window.document.querySelector(s);
const $$ = (s) => Array.from(window.document.querySelectorAll(s));

// 1. 话题库已生成并显示数量
const bank = window.buildTopicBank();
check('话题库 >850 条 (' + bank.length + ')', bank.length > 850);
check('poolHint 显示当前数量', /当前话题库：\d+ 条/.test($('#poolHint').textContent));

// 1.5 年龄四档细分（3-6 / 7-10 / 11-12 / 13-14）
check('年龄四档 chip 存在', !!$('#ageRow .chip[data-age="11"]') && !!$('#ageRow .chip[data-age="13"]'));
const teen11 = bank.filter(b => b.ages.indexOf(11) > -1).length;
const teen13 = bank.filter(b => b.ages.indexOf(13) > -1).length;
check('11-12岁档话题充足 (' + teen11 + ')', teen11 > 100);
check('13-14岁档话题充足 (' + teen13 + ')', teen13 > 100);
check('11-14岁无「玩一天」低幼模板', bank.filter(b => (b.ages.indexOf(11) > -1 || b.ages.indexOf(13) > -1) && b.t.indexOf('玩一天') > -1).length === 0);

// 1.6 高中档（15-18岁，v4 新增）
check('15-18岁档 chip 存在', !!$('#ageRow .chip[data-age="15"]'));
check('价值观维度 chip 存在', !!$('#dimRow .chip[data-dim="价值观"]'));
check('高中场景 chip 存在', !!$('#sceneRow .chip[data-scene="车里"]') && !!$('#sceneRow .chip[data-scene="夜宵"]') && !!$('#sceneRow .chip[data-scene="散步"]'));
const hs = bank.filter(b => b.ages.indexOf(15) > -1);
check('15-18岁档话题充足 (' + hs.length + ')', hs.length > 100);
check('15档无「玩一天」低幼模板', hs.filter(b => b.t.indexOf('玩一天') > -1).length === 0);
check('15档无怀旧煽情句式（XX那天…先想起谁）', hs.filter(b => b.t.indexOf('你会先想起谁') > -1).length === 0);
check('15档无「爷爷跟你讲TA遇到」句式', hs.filter(b => b.t.indexOf('跟你讲TA遇到了') > -1).length === 0);
const hsDims = {};
hs.forEach(b => hsDims[b.dim] = (hsDims[b.dim] || 0) + 1);
const hsDimMin = Math.min.apply(null, Object.keys(hsDims).map(d => hsDims[d]));
check('15档每维度≥8条 (最少 ' + hsDimMin + ')', hsDimMin >= 8);
const pain = {
  '高考/选科/志愿': hs.filter(b => /高考|选科|志愿|模考|专业/.test(b.t)).length,
  '亲子和解': hs.filter(b => /我们|爸爸|妈妈|吵架|对不起/.test(b.t)).length,
  '社会价值观': hs.filter(b => b.dim === '价值观').length,
};
check('15档高考/选科话题 ' + pain['高考/选科/志愿'] + ' 条', pain['高考/选科/志愿'] > 15);
check('15档价值观话题 ' + pain['社会价值观'] + ' 条', pain['社会价值观'] > 15);
check('15档引导语为高中口吻', hs.every(b => b.guide && b.guide.indexOf('孩子') === -1));

// 1.7 小学档（7-10岁，v5 新增）：痛点覆盖 + 注水清除
const primary = bank.filter(b => b.ages.indexOf(7) > -1);
check('7-10岁档话题充足 (' + primary.length + ')', primary.length > 300);
check('7-10岁档无「玩一天」注水句式', primary.filter(b => b.t.indexOf('玩一天') > -1).length === 0);
const pPain = {
  '作业拖延': primary.filter(b => /作业|磨蹭|拖延/.test(b.t)).length,
  '专注力': primary.filter(b => /走神|专注|专心/.test(b.t)).length,
  '撒谎': primary.filter(b => /撒谎|说谎|真话|假话/.test(b.t)).length,
  '兴趣班': primary.filter(b => /兴趣班|学琴|不学了|坚持|放弃|兴趣/.test(b.t)).length,
  '屏幕': primary.filter(b => /屏幕|平板|动画/.test(b.t)).length,
  '被欺负': primary.filter(b => /欺负|告状|抢|推/.test(b.t)).length,
};
check('7-10岁小学痛点覆盖（作业' + pPain['作业拖延'] + '/专注' + pPain['专注力'] + '/撒谎' + pPain['撒谎'] + '/兴趣班' + pPain['兴趣班'] + '/屏幕' + pPain['屏幕'] + '/欺负' + pPain['被欺负'] + '）',
  pPain['作业拖延'] >= 8 && pPain['专注力'] >= 8 && pPain['撒谎'] >= 8 && pPain['兴趣班'] >= 8 && pPain['屏幕'] >= 8 && pPain['被欺负'] >= 8);

// 1.8 低龄档（3-6岁，v5 新增）：小学概念清零 + 稀缺维度补足
const pre = bank.filter(b => b.ages.indexOf(3) > -1);
check('3-6岁档话题充足 (' + pre.length + ')', pre.length > 200);
const schoolConcepts = /班长|同桌|发小|老师|作业|点名|上课|班级|学校|考试/;
check('3-6岁档无小学概念混入', pre.filter(b => schoolConcepts.test(b.t)).length === 0);
check('3-6岁档无乱码文本', pre.filter(b => /\"\+/.test(b.t)).length === 0);
const preDims = {};
pre.forEach(b => preDims[b.dim] = (preDims[b.dim] || 0) + 1);
const thinDims = ['抗挫力', '情绪管理', '感恩心', '亲子关系', '趣味梗', '价值观'];
check('3-6岁稀缺维度均≥15条', thinDims.every(d => (preDims[d] || 0) >= 15));
check('3-6岁学龄前痛点覆盖（入园/抢玩具/怕黑）',
  pre.filter(b => /幼儿园|想妈妈/.test(b.t)).length >= 5 &&
  pre.filter(b => /抢|打人/.test(b.t)).length >= 5 &&
  pre.filter(b => /怕黑|害怕/.test(b.t)).length >= 5);

// 1.9 弹窗默认隐藏（防一打开就弹设置页）
check('弹窗初始默认隐藏', $('#modalMask').classList.contains('mask-hidden'));

// 2. 初始抽卡已显示
const t0 = $('#topicText').textContent;
check('初始话题非空', t0.length > 4);
check('引导语非空', $('#guideText').textContent.length > 4);
check('追问1非空', $('#follow1').textContent.length > 2);
check('追问2非空', $('#follow2').textContent.length > 2);

// 3. 抽卡动画流程（点击抽卡按钮，模拟 setTimeout 完成）
const btn = $('#drawBtn');
btn.click();
// 直接调用内部 draw 不可达，模拟动画后的结果：等待异步
const card = $('#topicCard');
check('抽卡时进入 drawing 状态', card.classList.contains('drawing'));

// 4. 打卡
$('#btnDone').click();
check('打卡后按钮变为 done', $('#btnDone').classList.contains('done'));
check('打卡 toast 出现', !$('#toast').classList.contains('hidden'));
check('连续天数 >=1', $('#streakNum').textContent >= '1');

// 5. 收藏
$('#btnFav').click();
check('收藏符号变 ★', $('#favSym').textContent === '★');

// 6. 筛选切换：点 3-6岁
const ageChip = window.document.querySelector('#ageRow .chip[data-age="3"]');
ageChip.click();
const poolText = $('#poolHint').textContent;
check('筛选后话题库数量更新', poolText.indexOf('条') > -1);

// 7. 视图切换
$$('.tab').forEach(t => { if (t.getAttribute('data-view') === 'today') t.click(); });
check('今日视图激活', $('#view-today').classList.contains('active'));
check('今日列表有记录', $('#todayList').children.length >= 1);
$$('.tab').forEach(t => { if (t.getAttribute('data-view') === 'favs') t.click(); });
check('收藏视图有记录', $('#favList').children.length >= 1);

// 8. 统计弹层
$('#btnStats').click();
check('弹层打开', !$('#modalMask').classList.contains('mask-hidden'));
check('弹层话题库总数', $('#mBank').textContent === String(bank.length));

// 9. 本地存储持久化
const stored = window.localStorage.getItem('llb_history');
check('history 已持久化', stored && JSON.parse(stored).length >= 1);
const storedFavs = window.localStorage.getItem('llb_favs');
check('favs 已持久化', storedFavs && JSON.parse(storedFavs).length >= 1);

// 9.5 清空数据两步确认（防误触）
const histBefore = JSON.parse(window.localStorage.getItem('llb_history')).length;
const clearBtn = $('#btnClear');
clearBtn.click();
check('第一次点击：数据未清空', JSON.parse(window.localStorage.getItem('llb_history')).length === histBefore);
check('第一次点击：按钮变为确认态', clearBtn.textContent === '再点一次确认清空' && clearBtn.classList.contains('arming'));
clearBtn.click();
check('第二次点击：数据已清空', JSON.parse(window.localStorage.getItem('llb_history')).length === 0);
check('第二次点击：按钮恢复', clearBtn.textContent === '清空全部数据' && !clearBtn.classList.contains('arming'));

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
