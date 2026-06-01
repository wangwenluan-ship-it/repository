/* ===== ReelShort Luna 看板 · 共享逻辑 (index.html 与 admin.html 共用) ===== */
(function(){
const BASE = { 'W2A':0.38, 'Install':0.33, '其他':0.33 };
const ALL_DRAMA = '全部剧集';
// 默认纳入所有剧（按表结构解析）。如只想公开部分剧，填关键词（小写），如 ["luna's second choice","carter reed"]
const DRAMA_WHITELIST = [];

let RAW=[], META={}, SOURCE='—', INITIAL_DRAMA='';
const state = { group:'优化师', drama:'', filters:{'媒体':'全部','类型':'全部','事件':'全部','优化师':'全部'}, sortKey:'spend', sortDir:-1 };

const $=id=>document.getElementById(id);
const money=n=> (n>=1e6? '$'+(n/1e6).toFixed(2)+'M' : n>=1e3? '$'+(n/1e3).toFixed(1)+'K' : '$'+Math.round(n));
const moneyFull=n=>'$'+Math.round(n).toLocaleString('en-US');
const pct=n=>(n*100).toFixed(1)+'%';
const num=n=>Math.round(n).toLocaleString('en-US');
const uniq=arr=>[...new Set(arr)].filter(x=>x!==undefined&&x!==null&&x!=='');
const GROUP_LABEL={'优化师':'优化师','媒体':'媒体','类型':'类型','事件':'投放事件'};

const COLS=[
  {k:'name', label:g=>GROUP_LABEL[g]},
  {k:'spend', label:()=>'花费', fmt:v=>moneyFull(v.spend)},
  {k:'share', label:()=>'占比', fmt:(v,tot)=>shareCell(v.spend/tot)},
  {k:'roas', label:()=>'ROAS', fmt:v=>roasCell(v)},
  {k:'cpi', label:()=>'CPI', fmt:v=>'$'+(v.act?(v.spend/v.act):0).toFixed(2)},
  {k:'cpp', label:()=>'CPP', fmt:v=>'$'+(v.pay?(v.spend/v.pay):0).toFixed(2)},
  {k:'payrate', label:()=>'付费率', fmt:v=>pct(v.act?v.pay/v.act:0)},
  {k:'act', label:()=>'激活数', fmt:v=>num(v.act)},
  {k:'pay', label:()=>'付费数', fmt:v=>num(v.pay)},
];
function sortVal(v,key,tot){ switch(key){
  case 'name':return v.name; case 'spend':return v.spend; case 'share':return v.spend/tot;
  case 'roas':return v.spend?v.rev/v.spend:0; case 'cpi':return v.act?v.spend/v.act:1e9;
  case 'cpp':return v.pay?v.spend/v.pay:1e9; case 'payrate':return v.act?v.pay/v.act:0;
  case 'act':return v.act; case 'pay':return v.pay; } }
function shareCell(s){ return `<span class="share-cell"><span class="bar"><i style="width:${Math.min(100,s*100).toFixed(1)}%"></i></span><span>${(s*100).toFixed(1)}%</span></span>`; }
function roasCell(v){ const roas=v.spend?v.rev/v.spend:0,tgt=v._tgt; let cls='mid'; if(roas>=tgt)cls='ok'; else if(roas<tgt-0.05)cls='bad'; return `<span class="pill ${cls}">${(roas*100).toFixed(1)}%</span>`; }

function currentRows(){ return RAW.filter(r=>{
  if(state.drama && state.drama!==ALL_DRAMA && r.drama && r.drama!==state.drama) return false;
  for(const dim of ['媒体','类型','事件','优化师']){ const f=state.filters[dim]; if(f&&f!=='全部'&&r[dim]!==f) return false; }
  return true; }); }
function aggregate(rows,dim){ const m=new Map();
  for(const r of rows){ if(!m.has(r[dim])) m.set(r[dim],{name:r[dim],spend:0,rev:0,act:0,pay:0,_tn:0,_td:0});
    const o=m.get(r[dim]); o.spend+=r.spend;o.rev+=r.rev;o.act+=r.act;o.pay+=r.pay; const b=BASE[r['类型']]??0.33; o._tn+=b*r.spend;o._td+=r.spend; }
  for(const o of m.values()) o._tgt=o._td?o._tn/o._td:0.33; return [...m.values()]; }

function render(){
  if(!RAW.length){ const tb=$('tbody'); if(tb) tb.innerHTML=`<tr><td colspan="9"><div class="empty">暂无数据</div></td></tr>`; return; }
  const rows=currentRows();
  const tot=rows.reduce((s,r)=>s+r.spend,0), rev=rows.reduce((s,r)=>s+r.rev,0), act=rows.reduce((s,r)=>s+r.act,0), pay=rows.reduce((s,r)=>s+r.pay,0);
  const nopt=new Set(rows.map(r=>r['优化师'])).size;
  if($('stats')) $('stats').innerHTML=[
    {k:'总花费',v:money(tot),m:moneyFull(tot)},
    {k:'整体 ROAS (D0)',v:(tot?rev/tot*100:0).toFixed(1)+'%',m:'营收 '+moneyFull(rev)},
    {k:'激活数 · CPI',v:num(act),m:'CPI $'+(act?tot/act:0).toFixed(2)},
    {k:'优化师数 · 付费率',v:nopt,m:'付费率 '+pct(act?pay/act:0)},
  ].map(s=>`<div class="stat"><div class="k">${s.k}</div><div class="v">${s.v}</div><div class="meta">${s.m}</div></div>`).join('');

  let agg=aggregate(rows,state.group); const dir=state.sortDir;
  agg.sort((a,b)=>{ const va=sortVal(a,state.sortKey,tot),vb=sortVal(b,state.sortKey,tot); if(typeof va==='string') return dir*va.localeCompare(vb); return dir*(va-vb); });

  $('thead').innerHTML=COLS.map(c=>{ const sorted=c.k===state.sortKey?'sorted':''; const arr=c.k===state.sortKey?(dir<0?'▾':'▴'):'⇅'; return `<th data-k="${c.k}" class="${sorted}">${c.label(state.group)}<span class="arr">${arr}</span></th>`; }).join('');
  $('thead').querySelectorAll('th').forEach(th=>th.onclick=()=>{ const k=th.dataset.k; if(state.sortKey===k) state.sortDir*=-1; else{state.sortKey=k;state.sortDir=(k==='name'?1:-1);} render(); });

  const tb=$('tbody');
  if(!agg.length){ tb.innerHTML=`<tr><td colspan="${COLS.length}"><div class="empty">没有符合当前筛选条件的数据</div></td></tr>`; }
  else{
    let html=agg.map((v,i)=>'<tr>'+COLS.map(c=>{ if(c.k==='name'){ const rk=(state.sortKey==='spend'&&dir<0)?`<span class="rank">${i+1}</span>`:''; return `<td>${rk}${v.name}</td>`; } return `<td>${c.fmt(v,tot)}</td>`; }).join('')+'</tr>').join('');
    const totObj={name:'合计',spend:tot,rev,act,pay,_tgt:0}; let tn=0,td=0; rows.forEach(r=>{tn+=(BASE[r['类型']]??.33)*r.spend;td+=r.spend;}); totObj._tgt=td?tn/td:.33;
    html+='<tr class="total">'+COLS.map(c=>{ if(c.k==='name') return `<td>合计 (${agg.length})</td>`; if(c.k==='share') return `<td>100%</td>`; if(c.k==='roas') return `<td>${(tot?rev/tot*100:0).toFixed(1)}%</td>`; return `<td>${c.fmt(totObj,tot)}</td>`; }).join('')+'</tr>';
    tb.innerHTML=html;
  }
  $('rowCount').textContent=agg.length; $('filteredSpend').textContent=moneyFull(tot);
  const chips=[]; if(state.drama&&state.drama!==ALL_DRAMA) chips.push(state.drama);
  for(const dim of ['媒体','类型','事件','优化师']){ if(state.filters[dim]!=='全部') chips.push(state.filters[dim]); }
  $('chiprow').innerHTML=chips.map(c=>`<span class="chip">${c}</span>`).join('');
}

/* combos */
function dramaCounts(){ const m=new Map(); for(const r of RAW){ m.set(r.drama,(m.get(r.drama)||0)+r.spend); } return m; }
function renderDramaList(filter){ const m=dramaCounts(),all=[...m.keys()].sort((a,b)=>m.get(b)-m.get(a)); const f=(filter||'').toLowerCase(),matched=all.filter(d=>!f||d.toLowerCase().includes(f)); let html='';
  if(!f||ALL_DRAMA.includes(f)||'全部'.includes(f)) html+=`<div class="combo-opt allopt ${state.drama===ALL_DRAMA?'sel':''}" data-v="${ALL_DRAMA}">全部剧集 <span class="cnt">${all.length} 部</span></div>`;
  if(!matched.length&&f&&!ALL_DRAMA.includes(f)) html+='<div class="combo-empty">无匹配剧目</div>';
  html+=matched.map(d=>`<div class="combo-opt ${d===state.drama?'sel':''}" data-v="${d.replace(/"/g,'&quot;')}" title="${d.replace(/"/g,'&quot;')}">${d} <span class="cnt">$${Math.round(m.get(d)).toLocaleString()}</span></div>`).join('');
  $('dramaList').innerHTML=html; $('dramaList').querySelectorAll('.combo-opt').forEach(el=>el.onclick=()=>selectDrama(el.dataset.v)); }
function selectDrama(v){ state.drama=v; $('f_drama').value=(v===ALL_DRAMA?'全部剧集':v); closeCombo(); populateFilters(); render(); }
function openCombo(){ $('dramaCombo').classList.add('open'); renderDramaList(''); }
function closeCombo(){ $('dramaCombo').classList.remove('open'); $('f_drama').value=(state.drama===ALL_DRAMA?'全部剧集':state.drama); }
function optScope(){ return (state.drama===ALL_DRAMA)?RAW:RAW.filter(r=>r.drama===state.drama); }
function renderOptList(filter){ const m=new Map(); for(const r of optScope()){ m.set(r['优化师'],(m.get(r['优化师'])||0)+r.spend); } const all=[...m.keys()].sort((a,b)=>m.get(b)-m.get(a)); const f=(filter||'').toLowerCase(),matched=all.filter(o=>!f||(''+o).toLowerCase().includes(f)); let html='';
  if(!f||'全部'.includes(f)) html+=`<div class="combo-opt allopt ${state.filters['优化师']==='全部'?'sel':''}" data-v="全部">全部优化师 <span class="cnt">${all.length} 人</span></div>`;
  if(!matched.length&&f) html+='<div class="combo-empty">无匹配优化师</div>';
  html+=matched.map(o=>`<div class="combo-opt ${o===state.filters['优化师']?'sel':''}" data-v="${(''+o).replace(/"/g,'&quot;')}">${o} <span class="cnt">$${Math.round(m.get(o)).toLocaleString()}</span></div>`).join('');
  $('optList').innerHTML=html; $('optList').querySelectorAll('.combo-opt').forEach(el=>el.onclick=()=>selectOpt(el.dataset.v)); }
function selectOpt(v){ state.filters['优化师']=v; $('f_优化师').value=(v==='全部'?'全部':v); closeOptCombo(); render(); }
function openOptCombo(){ $('optCombo').classList.add('open'); renderOptList(''); }
function closeOptCombo(){ $('optCombo').classList.remove('open'); $('f_优化师').value=(state.filters['优化师']==='全部'?'全部':state.filters['优化师']); }

function populateFilters(){
  $('f_drama').value=(state.drama===ALL_DRAMA?'全部剧集':state.drama);
  const scope=(state.drama===ALL_DRAMA)?RAW:RAW.filter(r=>r.drama===state.drama);
  for(const dim of ['媒体','类型','事件']){ const sel=$('f_'+dim); const vals=uniq(scope.map(r=>r[dim])).sort((a,b)=>(''+a).localeCompare(b)); const cur=state.filters[dim];
    sel.innerHTML='<option>全部</option>'+vals.map(v=>`<option ${v===cur?'selected':''}>${v}</option>`).join(''); if(cur!=='全部'&&!vals.includes(cur)){ state.filters[dim]='全部'; sel.value='全部'; } }
  const optVals=uniq(scope.map(r=>r['优化师'])); if(state.filters['优化师']!=='全部'&&!optVals.includes(state.filters['优化师'])) state.filters['优化师']='全部';
  $('f_优化师').value=(state.filters['优化师']==='全部'?'全部':state.filters['优化师']);
  if($('dramaTitle')) $('dramaTitle').textContent=(state.drama===ALL_DRAMA?'全部剧集':state.drama);
  if($('dateLabel')) $('dateLabel').textContent=META.updated||META.date||'—';
  if($('srcLabel')) $('srcLabel').textContent=SOURCE;
}

let tt; function toast(msg,err){ const t=$('toast'); if(!t) return; t.textContent=msg; t.className='toast show'+(err?' err':''); clearTimeout(tt); tt=setTimeout(()=>t.className='toast',err?4000:2400); }

function mount(){
  $('groupSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{ $('groupSeg').querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); state.group=b.dataset.g; state.sortKey='spend'; state.sortDir=-1; render(); });
  $('f_drama').onfocus=openCombo; $('f_drama').onclick=openCombo;
  $('f_drama').oninput=e=>{ $('dramaCombo').classList.add('open'); renderDramaList(e.target.value); };
  $('f_drama').onkeydown=e=>{ if(e.key==='Enter'){ const x=$('dramaList').querySelector('.combo-opt'); if(x) selectDrama(x.dataset.v); e.preventDefault(); } else if(e.key==='Escape') closeCombo(); };
  $('f_优化师').onfocus=openOptCombo; $('f_优化师').onclick=openOptCombo;
  $('f_优化师').oninput=e=>{ $('optCombo').classList.add('open'); renderOptList(e.target.value); };
  $('f_优化师').onkeydown=e=>{ if(e.key==='Enter'){ const x=$('optList').querySelector('.combo-opt'); if(x) selectOpt(x.dataset.v); e.preventDefault(); } else if(e.key==='Escape') closeOptCombo(); };
  document.addEventListener('click',e=>{ if(!$('dramaCombo').contains(e.target)) closeCombo(); if(!$('optCombo').contains(e.target)) closeOptCombo(); });
  ['媒体','类型','事件'].forEach(dim=>{ $('f_'+dim).onchange=e=>{ state.filters[dim]=e.target.value; render(); }; });
  $('resetBtn').onclick=()=>{ state.group='优化师'; state.sortKey='spend'; state.sortDir=-1; state.drama=INITIAL_DRAMA;
    state.filters={'媒体':'全部','类型':'全部','事件':'全部','优化师':'全部'};
    $('groupSeg').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.g==='优化师'));
    closeCombo(); closeOptCombo(); populateFilters(); render(); toast('已重置到初始界面'); };
}

function load(dataObj){
  RAW=(dataObj.rows||[]).map(r=>({...r})); RAW.forEach(r=>{ if(!r.drama) r.drama=(dataObj.meta&&dataObj.meta.drama)||''; });
  META={...(dataObj.meta||{})};
  SOURCE=META.source||'快照';
  const dramas=uniq(RAW.map(r=>r.drama));
  INITIAL_DRAMA=(META.drama&&dramas.includes(META.drama))?META.drama:(dramas.sort()[0]||'');
  state.group='优化师'; state.sortKey='spend'; state.sortDir=-1; state.drama=INITIAL_DRAMA;
  state.filters={'媒体':'全部','类型':'全部','事件':'全部','优化师':'全部'};
  populateFilters(); render();
}

/* ---- Excel/CSV -> aggregated data.json ---- */
const RX_TYPE=/_(W2A|Install)_/i, RX_EVENT=/_(VO|AEO)_/i;
const parseType=s=>{const m=(''+s).match(RX_TYPE); return !m?'其他':(m[1].toLowerCase()==='w2a'?'W2A':'Install');};
const parseEvent=s=>{const m=(''+s).match(RX_EVENT); return !m?'其他':m[1].toUpperCase();};
const cleanDrama=s=>(''+s).replace(/\([0-9a-fA-F]+\)\s*$/,'').trim();
const mediaMap=s=>{s=(''+s).toLowerCase(); return s==='fb'?'Facebook':s==='tt'?'TikTok':(s||'其他');};
function resolveHeaders(cols){ const find=(...c)=>{ for(const x of cols) for(const y of c) if(x===y) return x; for(const x of cols) for(const y of c) if((''+x).includes(y)) return x; return null; };
  return { book:find('对应英语书籍名称','书籍名称(书籍ID)','书籍名称'), ch:find('渠道名称'), media:find('媒体类型'), spend:find('投放花费'), d0:find('d0','revenue(生命周期)'), act:find('应用设备激活数'), pay:find('付费用户数(首日)') }; }
function nowStamp(){ const d=new Date(),p=n=>(''+n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }

/* 内置 CSV 解析（零外部依赖，支持引号内逗号/换行/转义引号、BOM） */
function parseCSV(text){
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
  const rows=[]; let field='',row=[],inQ=false; const n=text.length;
  for(let i=0;i<n;i++){ const c=text[i];
    if(inQ){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else inQ=false; } else field+=c; }
    else{ if(c==='"') inQ=true; else if(c===','){ row.push(field); field=''; }
      else if(c==='\n'){ row.push(field); field=''; rows.push(row); row=[]; }
      else if(c==='\r'){} else field+=c; } }
  if(field.length||row.length){ row.push(field); rows.push(row); }
  return rows;
}
function csvToObjects(text){ const rows=parseCSV(text); if(!rows.length) return [];
  const head=rows[0].map(h=>(''+h).trim()); const out=[];
  for(let i=1;i<rows.length;i++){ const r=rows[i]; if(r.length===1&&r[0]==='') continue;
    const o={}; for(let j=0;j<head.length;j++) o[head[j]]=r[j]!==undefined?r[j]:''; out.push(o); }
  return out; }

function accumulate(map, row, H){
  const drama=cleanDrama(row[H.book]); if(!drama) return 0;
  if(DRAMA_WHITELIST.length && !DRAMA_WHITELIST.some(k=>drama.toLowerCase().includes(k))) return 0;
  const ch=row[H.ch]||'', opt=(''+ch).split('_')[0].trim()||'未知';
  const key=drama+'|'+opt+'|'+mediaMap(row[H.media])+'|'+parseType(ch)+'|'+parseEvent(ch);
  if(!map.has(key)) map.set(key,{drama,'优化师':opt,'媒体':mediaMap(row[H.media]),'类型':parseType(ch),'事件':parseEvent(ch),spend:0,rev:0,act:0,pay:0});
  const o=map.get(key); o.spend+=(+row[H.spend]||0); o.rev+=(+row[H.d0]||0); o.act+=(+row[H.act]||0); o.pay+=(+row[H.pay]||0); return 1;
}
function finalize(map, count, dateGuess){
  const rows=[...map.values()].map(r=>({...r, spend:+r.spend.toFixed(2), rev:+r.rev.toFixed(2)}));
  const ds={}; rows.forEach(r=>{ ds[r.drama]=(ds[r.drama]||0)+r.spend; });
  const drama=Object.keys(ds).sort((a,b)=>ds[b]-ds[a])[0] || '';
  const tot=rows.reduce((a,r)=>({s:a.s+r.spend,v:a.v+r.rev,c:a.c+r.act,p:a.p+r.pay}),{s:0,v:0,c:0,p:0});
  return { meta:{drama, date:dateGuess||'', updated:nowStamp(), total_spend:+tot.s.toFixed(2), total_rev:+tot.v.toFixed(2), total_act:tot.c, total_pay:tot.p}, rows };
}
function parseFile(file){
  return new Promise((resolve,reject)=>{
    const dateGuess=(file.name.match(/20\d{2}-\d{2}-\d{2}/)||[])[0];
    const reader=new FileReader();
    reader.onerror=()=>reject('读取文件失败');
    reader.onload=ev=>{
      const buf=ev.target.result, bytes=new Uint8Array(buf).subarray(0,8);
      const isZip=bytes[0]===0x50&&bytes[1]===0x4B, isOle=bytes[0]===0xD0&&bytes[1]===0xCF;
      try{
        if(isZip||isOle){
          const wb=XLSX.read(buf,{type:'array'}), ws=wb.Sheets[wb.SheetNames[0]];
          const json=XLSX.utils.sheet_to_json(ws,{defval:''});
          if(!json.length) return reject('文件为空');
          const H=resolveHeaders(Object.keys(json[0])); if(!H.book||!H.ch) return reject('未识别到「对应英语书籍名称 / 渠道名称」列');
          const map=new Map(); let n=0; for(const row of json) n+=accumulate(map,row,H);
          if(!map.size) return reject('未解析到任何剧目数据（请确认是 Campaign 回收导出文件）'); resolve(finalize(map,n,dateGuess));
        }else{
          const text=new TextDecoder('utf-8').decode(buf);
          const json=csvToObjects(text);
          if(!json.length) return reject('文件为空');
          const H=resolveHeaders(Object.keys(json[0])); if(!H.book||!H.ch) return reject('未识别到「对应英语书籍名称 / 渠道名称」列');
          const map=new Map(); let n=0; for(const row of json) n+=accumulate(map,row,H);
          if(!map.size) return reject('未解析到任何剧目数据（请确认是 Campaign 回收导出文件）'); resolve(finalize(map,n,dateGuess));
        }
      }catch(err){ if(err!=='stop') reject('解析出错：'+err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

window.Dashboard={ mount, load, parseFile, toast, setSource:s=>{SOURCE=s;}, nowStamp };
})();
