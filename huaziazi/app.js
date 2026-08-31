/* ============================================================
 * 话匣子 · 亲子版 —— 交互逻辑
 * 纯前端 + localStorage，双击 index.html 即可运行
 * ============================================================ */
(function(){
'use strict';

var BANK = window.buildTopicBank ? buildTopicBank() : [];

/* ---------- 状态 ---------- */
var state = {
  age: 'all', scene: 'all', dim: 'all',
  current: null,
  todayDone: false
};

/* ---------- 本地存储 ---------- */
var LS = {
  get: function(k, d){ try{ var v = JSON.parse(localStorage.getItem('llb_'+k)); return v==null?d:v; }catch(e){ return d; } },
  set: function(k, v){ try{ localStorage.setItem('llb_'+k, JSON.stringify(v)); }catch(e){} }
};
var history = LS.get('history', []);   // [{i,t,dim,scene,age,date}]
var favs    = LS.get('favs', []);      // [index]
var checkins= LS.get('checkins', []);  // ['YYYY-MM-DD']

/* ---------- 工具 ---------- */
function $(s){ return document.querySelector(s); }
function $$(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
function fmtDate(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function todayStr(){ return fmtDate(new Date()); }
function ageLabel(a){ return a===3?'3-6岁':a===7?'7-10岁':a===11?'11-12岁':a===13?'13-14岁':a===15?'15-18岁':''; }
function ageKeyToArr(k){ return k==='all'?null:(+k); }

function save(){ LS.set('history', history); LS.set('favs', favs); LS.set('checkins', checkins); }

function toast(msg){
  var el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(function(){ el.classList.add('hidden'); }, 1800);
}

function streak(){
  var days = {};
  checkins.forEach(function(d){ days[d]=1; });
  var n=0, d=new Date();
  while(days[fmtDate(d)]){ n++; d.setDate(d.getDate()-1); }
  return n;
}

/* ---------- 筛选 ---------- */
function pool(){
  var ak = ageKeyToArr(state.age);
  return BANK.filter(function(b){
    if(ak && b.ages.indexOf(ak)===-1) return false;
    if(state.scene!=='all' && b.scene!==state.scene) return false;
    if(state.dim!=='all' && b.dim!==state.dim) return false;
    return true;
  });
}

/* ---------- 抽卡 ---------- */
function draw(){
  var candidates = pool();
  if(!candidates.length){ toast('这个组合下没有话题，换个筛选试试'); return; }
  var recent = new Set();
  history.slice(-60).forEach(function(h){ recent.add(h.i); });
  var fresh = candidates.filter(function(c){ return !recent.has(c.i); });
  var src = fresh.length ? fresh : candidates;
  var c = src[Math.floor(Math.random()*src.length)];
  showCard(c);
}

function showCard(c){
  state.current = c;
  state.todayDone = history.some(function(h){ return h.i===c.i && h.date===todayStr(); });
  $('#topicText').textContent = c.t;
  $('#tagScene').textContent = c.scene;
  $('#tagAge').textContent = c.ages.map(ageLabel).join(' / ');
  var dims = $$('.dim-tag');
  dims.forEach(function(el, i){
    if(i===0){ el.textContent = c.dim; el.style.display=''; }
    else if(i===1){ el.textContent = '适合 '+c.ages.map(ageLabel).join('/'); el.style.display=''; }
    else { el.style.display='none'; }
  });
  $('#guideText').textContent = c.guide || '';
  $('#follow1').textContent = c.follows && c.follows[0] ? c.follows[0] : '顺着孩子的回答，继续问"为什么呢？"';
  $('#follow2').textContent = c.follows && c.follows[1] ? c.follows[1] : '让孩子当"小记者"，反过来考考你。';
  $('#favSym').textContent = favs.indexOf(c.i)>-1 ? '★' : '☆';
  $('#btnFav').classList.toggle('faved', favs.indexOf(c.i)>-1);
  $('#btnDone').classList.toggle('done', state.todayDone);
}

function sceneAlias(s){
  var m = {'睡前':'睡前聊','饭桌':'饭桌聊','出行':'路上聊','居家':'在家聊','户外':'户外聊','车里':'车上聊','夜宵':'夜宵聊','散步':'散步聊'};
  return m[s] || s;
}

/* ---------- 抽卡动画 ---------- */
function animateDraw(){
  var btn = $('#drawBtn');
  btn.disabled = true;
  btn.classList.add('loading');
  $('#topicCard').classList.add('drawing');
  setTimeout(function(){
    draw();
    $('#topicCard').classList.remove('drawing');
    btn.classList.remove('loading');
    btn.disabled = false;
  }, 420);
}

/* ---------- 打卡 / 收藏 / 跳过 / 分享 ---------- */
function markDone(){
  var c = state.current; if(!c) return;
  var t = todayStr();
  if(history.some(function(h){ return h.i===c.i && h.date===t; })){
    toast('这个话题今天已经打卡过啦，换一张吧');
    return;
  }
  if(checkins.indexOf(t)===-1) checkins.push(t);
  state.todayDone = true;
  history.unshift({i:c.i, t:c.t, dim:c.dim, scene:c.scene, age:c.ages[0], date:t});
  save();
  syncTopStats();
  $('#btnDone').classList.add('done');
  toast('已打卡，连续 '+streak()+' 天，太棒了');
}

function toggleFav(){
  var c = state.current; if(!c) return;
  var idx = favs.indexOf(c.i);
  if(idx>-1){ favs.splice(idx,1); $('#favSym').textContent='☆'; $('#btnFav').classList.remove('faved'); toast('已取消收藏'); }
  else { favs.unshift(c.i); $('#favSym').textContent='★'; $('#btnFav').classList.add('faved'); toast('已收藏'); }
  save();
}

function share(){
  var c = state.current; if(!c) return;
  var txt = '【话匣子·亲子版】今天和娃聊什么？\n'+
    '话题：'+c.t+'\n'+
    '怎么聊：'+(c.guide||'')+'\n'+
    '试试追问：'+((c.follows&&c.follows[0])||'')+' / '+((c.follows&&c.follows[1])||'')+'\n'+
    '—— 每天一抽，跟娃聊出好口才';
  copyText(txt, function(){ toast('已复制，快发给另一半一起聊'); }, function(){ toast('复制失败，长按手动复制吧'); });
}

function copyText(txt, ok, fail){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(ok, function(){
      legacyCopy(txt, ok, fail);
    });
  } else legacyCopy(txt, ok, fail);
}
function legacyCopy(txt, ok, fail){
  var ta = document.createElement('textarea');
  ta.value = txt; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); ok(); }catch(e){ fail(); }
  document.body.removeChild(ta);
}

/* ---------- 筛选 UI ---------- */
function bindChips(){
  $$('#ageRow .chip').forEach(function(b){
    b.addEventListener('click', function(){
      $$('#ageRow .chip').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      state.age = b.getAttribute('data-age');
      refreshAfterFilter();
    });
  });
  $$('#sceneRow .chip').forEach(function(b){
    b.addEventListener('click', function(){
      $$('#sceneRow .chip').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      state.scene = b.getAttribute('data-scene');
      refreshAfterFilter();
    });
  });
  $$('#dimRow .chip').forEach(function(b){
    b.addEventListener('click', function(){
      $$('#dimRow .chip').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      state.dim = b.getAttribute('data-dim');
      refreshAfterFilter();
    });
  });
}

function refreshAfterFilter(){
  var p = pool();
  $('#poolHint').textContent = '当前话题库：'+p.length+' 条';
  var c = state.current;
  var still = c && p.some(function(x){ return x.i===c.i; });
  if(still){ showCard(c); }
  else { draw(); }
  syncTopStats();
}

/* ---------- 视图切换 ---------- */
function switchView(name){
  $$('.view').forEach(function(v){ v.classList.toggle('active', v.id==='view-'+name); });
  $$('.tab').forEach(function(t){ t.classList.toggle('active', t.getAttribute('data-view')===name); });
  if(name==='today') renderToday();
  if(name==='favs') renderFavs();
}

/* ---------- 今日视图 ---------- */
function renderToday(){
  var t = todayStr();
  var list = history.filter(function(h){ return h.date===t; });
  $('#todayCount').textContent = list.length;
  $('#streakNum2').textContent = streak();
  $('#totalCount').textContent = history.length;
  $('#favCount').textContent = favs.length;
  var ul = $('#todayList');
  ul.innerHTML = '';
  list.forEach(function(h){
    var li = document.createElement('li');
    li.className = 'his-item';
    li.innerHTML = '<div class="h-text">'+esc(h.t)+'<br><span class="h-dim">'+esc(h.dim)+' · '+esc(ageLabel(h.age))+' · '+esc(h.scene)+'</span></div>'+
      '<button class="h-del" data-i="'+h.i+'" title="删除记录">×</button>';
    li.querySelector('.h-del').addEventListener('click', function(){
      var idx = history.indexOf(h);
      if(idx>-1){ history.splice(idx,1); save(); renderToday(); syncTopStats(); }
    });
    ul.appendChild(li);
  });
  $('#todayEmpty').classList.toggle('show', list.length===0);
}

function esc(s){ return String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }

/* ---------- 收藏视图 ---------- */
function renderFavs(){
  var ul = $('#favList');
  ul.innerHTML = '';
  favs.forEach(function(i){
    var b = BANK[i]; if(!b) return;
    var li = document.createElement('li');
    li.className = 'his-item';
    li.innerHTML = '<div class="h-text">'+esc(b.t)+'<br><span class="h-dim">'+esc(b.dim)+' · '+esc(b.ages.map(ageLabel).join('/'))+' · '+esc(b.scene)+'</span></div>'+
      '<button class="h-del" data-i="'+i+'" title="取消收藏">×</button>';
    li.querySelector('.h-del').addEventListener('click', function(){
      var idx = favs.indexOf(i);
      if(idx>-1){ favs.splice(idx,1); save(); renderFavs(); syncTopStats(); }
    });
    ul.appendChild(li);
  });
  $('#favEmpty').classList.toggle('show', favs.length===0);
}

/* ---------- 顶部统计 ---------- */
function syncTopStats(){
  $('#streakNum').textContent = streak();
  $('#streakChip').style.display = streak()>0 ? 'flex' : 'none';
}

/* ---------- 统计弹层 ---------- */
function openModal(){
  $('#mBank').textContent = BANK.length;
  $('#mCheckins').textContent = checkins.length;
  $('#mHistory').textContent = history.length;
  $('#mFavs').textContent = favs.length;
  $('#modalMask').classList.remove('mask-hidden');
}
function closeModal(){
  $('#modalMask').classList.add('mask-hidden');
}

/* ---------- 初始化 ---------- */
function init(){
  bindChips();
  $('#drawBtn').addEventListener('click', animateDraw);
  $('#btnDone').addEventListener('click', markDone);
  $('#btnFav').addEventListener('click', toggleFav);
  $('#btnSkip').addEventListener('click', animateDraw);
  $('#btnShare').addEventListener('click', share);
  $('#btnStats').addEventListener('click', openModal);
  $('#btnCloseModal').addEventListener('click', closeModal);
  $('#modalMask').addEventListener('click', function(e){ if(e.target.id==='modalMask') closeModal(); });
  $('#btnClear').addEventListener('click', function(){
    if(confirm('确定清空全部打卡、记录和收藏吗？此操作不可恢复。')){
      history=[]; favs=[]; checkins=[];
      save(); renderToday(); renderFavs(); syncTopStats();
      toast('已清空');
    }
  });
  $('#gbClose').addEventListener('click', function(){
    $('#guideBanner').style.display='none';
    LS.set('guide_done', 1);
  });
  $$('.tab').forEach(function(t){
    t.addEventListener('click', function(){ switchView(t.getAttribute('data-view')); });
  });

  if(LS.get('guide_done',0)) $('#guideBanner').style.display='none';

  refreshAfterFilter();
  syncTopStats();
}

document.addEventListener('DOMContentLoaded', init);
})();
