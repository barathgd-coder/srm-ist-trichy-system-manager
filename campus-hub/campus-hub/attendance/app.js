const SECTIONS=SRM.SECTIONS;
const LOGOS={full:"assets/srm-logo.jpg",seal:"assets/srm-seal.jpg"};
document.querySelectorAll('img[data-logo]').forEach(i=>{i.src=LOGOS[i.dataset.logo]});

/* ================= constants & helpers ================= */
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOW=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
const START=[540,590,650,700,750,800,850,910,960], DUR=50;
const SEM_START=new Date(2026,6,20), SEM_END=new Date(2026,9,31);
const HOLIDAYS=new Set(['2026-10-02','2026-10-19','2026-10-20']);
const SALT='e4';
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const dateOnly=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const same=(a,b)=>ymd(a)===ymd(b);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pl=(n,a,b)=>n+' '+(n===1?a:b);
const $=s=>document.querySelector(s);
function fp(x){const r=Math.round(x*10)/10;return r%1===0?r.toFixed(0):r.toFixed(1)}
function pctParts(x){const t=fp(x);const [a,b]=t.split('.');return `${a}${b?`<small>.${b}%</small>`:'<small>%</small>'}`}
function tf(m){let h=Math.floor(m/60);const mm=m%60,ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${pad(mm)} ${ap}`}
function range(a,b){const x=tf(a),y=tf(b);return x.slice(-2)===y.slice(-2)?`${x.slice(0,-3)} – ${y}`:`${x} – ${y}`}
function longDate(d){return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ================= preferences ================= */
const P={section:'III-ECE-A',min:75,late:true,alerts:true,remind:true,weekly:false};
try{Object.assign(P,JSON.parse(localStorage.getItem('srm-att-prefs')||'{}'))}catch(e){}
if(!SECTIONS[P.section])P.section='III-ECE-A';
const savePrefs=()=>{try{localStorage.setItem('srm-att-prefs',JSON.stringify(P))}catch(e){}};

/* ================= clock ================= */
let NOW,TODAY,NOWMIN;
function tick(){
  const r=new Date();const d0=dateOnly(r);
  // Demo fallback: outside the semester window, pretend it is 28 Sep 2026 at the real time of day.
  NOW=(d0<SEM_START||d0>SEM_END)?new Date(2026,8,28,r.getHours(),r.getMinutes()):r;
  TODAY=dateOnly(NOW);NOWMIN=NOW.getHours()*60+NOW.getMinutes();
}

/* ================= data: sample attendance built on the real timetable ================= */
let D,SUBJ,ALL;
const isAtt=r=>r.s==='P'||(r.s==='L'&&P.late);
const statusOf=p=>p<P.min?'critical':(p<P.min+5?'warning':'good');
const STLABEL={good:'Good',warning:'Warning',critical:'Critical'};
function build(){
  const sec=SECTIONS[P.section],keys=Object.keys(sec.subj);
  const rates={};keys.forEach(k=>{rates[k]=0.03+0.27*Math.pow(mulberry(hash(P.section+k+SALT))(),1.7)});
  const recs=[],byDate={},rem={};keys.forEach(k=>rem[k]=0);
  for(let d=SEM_START;d<=SEM_END;d=addDays(d,1)){
    const dow=d.getDay();if(dow<1||dow>5)continue;const id=ymd(d);if(HOLIDAYS.has(id))continue;
    const rd=mulberry(hash(P.section+id+SALT));const mood=rd(); /* <.07 away all day, <.22 patchy day, else in every class */
    sec.tt[DAYS[dow]].forEach((k,i)=>{
      if(!k)return;const x=rd();
      const ended=d<TODAY||(same(d,TODAY)&&START[i]+DUR<=NOWMIN);
      if(ended){const s=mood<.07?'A':(mood<.22?(x<Math.min(.9,rates[k]*4)?'A':(x>.96?'L':'P')):(x>.985?'L':'P'));const rec={date:id,i,key:k,s};recs.push(rec);(byDate[id]=byDate[id]||[]).push(rec)}
      else rem[k]++;
    });
  }
  return {sec,keys,recs,byDate,rem,venue:sec.venue.replace(/\/.*$/,'')};
}
function calc(rs,remaining){
  const t=rs.length,a=rs.filter(isAtt).length,pct=t?a/t*100:100;
  return {t,a,m:t-a,pct,rem:remaining,st:statusOf(pct)};
}
function meta(key){
  const m=D.sec.subj[key];let name=m[0],code=m[1],fac=m[2],room=D.venue;
  const cdc=fac.match(/^CDC\s*\/\s*(.+)$/);
  if(cdc){fac='Career Development Centre';room='CDC '+cdc[1]}
  else{const lab=fac.match(/^Lab slot,\s*(.+)$/);if(lab){fac='Lab faculty';room=lab[1]}else if(/lab/i.test(name))room='Laboratory'}
  return {key,name,code,fac,room};
}
function facShort(f){const a=f.split(/\s*(?:,|\/)\s*/).filter(Boolean);return a.length>1?`${a[0]} +${a.length-1}`:a[0]}
function refresh(){
  tick();D=build();SUBJ={};
  D.keys.forEach(k=>{SUBJ[k]=calc(D.recs.filter(r=>r.key===k),D.rem[k])});
  ALL=calc(D.recs,D.keys.reduce((s,k)=>s+D.rem[k],0));
}
function outlook(a,t,rem){
  const thr=P.min/100;
  const need=Math.max(0,Math.ceil((thr*t-a)/(1-thr)-1e-9));
  const canMiss=Math.max(0,Math.floor(a+rem-thr*(t+rem)+1e-9));
  const best=(t+rem)?(a+rem)/(t+rem)*100:100;
  const after=(t+need)?(a+need)/(t+need)*100:100;
  return {need,canMiss,best,after,reachable:need<=rem||need===0};
}

/* ================= schedule helpers ================= */
function blocksFor(date){
  const dow=date.getDay(),id=ymd(date);
  if(dow<1||dow>5||HOLIDAYS.has(id)||date<SEM_START||date>SEM_END)return [];
  const out=[];
  D.sec.tt[DAYS[dow]].forEach((k,i)=>{
    if(!k)return;const last=out[out.length-1];
    if(last&&last.key===k&&last.idx[last.idx.length-1]===i-1){last.idx.push(i);last.end=START[i]+DUR}
    else out.push({key:k,idx:[i],start:START[i],end:START[i]+DUR});
  });
  return out;
}
function blockState(date,b){
  const id=ymd(date);
  if(date>TODAY)return 'upcoming';
  if(same(date,TODAY)){if(b.start>NOWMIN)return 'upcoming';if(b.end>NOWMIN)return 'now'}
  const rs=b.idx.map(i=>(D.byDate[id]||[]).find(r=>r.i===i)).filter(Boolean);
  if(!rs.length)return 'upcoming';
  const A=rs.filter(r=>r.s==='A').length,L=rs.filter(r=>r.s==='L').length;
  if(A===rs.length)return 'absent';if(A>0)return 'partial';if(L>0)return 'late';return 'present';
}
const SLABEL={present:'Present',absent:'Absent',late:'Late',partial:'Partial',now:'In class',upcoming:'Upcoming'};
function dayState(date){
  if(date<SEM_START||date>SEM_END)return 'out';
  if(!blocksFor(date).length)return 'none';
  const rs=D.byDate[ymd(date)]||[];
  if(date>TODAY||!rs.length)return 'future';
  const A=rs.filter(r=>r.s==='A').length,L=rs.filter(r=>r.s==='L').length;
  if(A===rs.length)return 'absent';if(A>0||L>0)return 'partial';return 'present';
}
function nextTeachingDay(){
  for(let d=addDays(TODAY,1);d<=SEM_END;d=addDays(d,1)){const b=blocksFor(d);if(b.length)return {d,b}}
  return null;
}

/* ================= view fragments ================= */
const pill=(cls,text,dot=true)=>`<span class="pill ${cls}">${dot?'<i></i>':''}${text}</span>`;
const stPill=s=>pill(s,STLABEL[s]);
const sPill=k=>pill('s-'+k,SLABEL[k],k==='now');
const bar=p=>`<div class="bar" role="img" aria-label="${fp(p)} percent attended, minimum ${P.min} percent"><i style="width:${Math.min(100,p)}%"></i><b style="left:${P.min}%"></b></div>`;

function subjCard(k){
  const s=SUBJ[k],m=meta(k);
  return `<a class="subj" href="#/subject/${k}" aria-label="${esc(m.name)}, ${fp(s.pct)} percent, ${STLABEL[s.st]}. Open details">
    <div class="subj-top"><div style="min-width:0"><div class="subj-name" title="${esc(m.name)}">${esc(m.name)}</div><div class="subj-fac">${esc(facShort(m.fac))}</div></div>${stPill(s.st)}</div>
    <div class="subj-mid"><span class="subj-pct">${pctParts(s.pct)}</span><span class="subj-count">${s.a} / ${s.t} classes</span></div>
    ${bar(s.pct)}
  </a>`;
}

function ring(pct,animate){
  const r=104,c=2*Math.PI*r,cx=150,cy=150;
  const ang=P.min/100*2*Math.PI-Math.PI/2,co=Math.cos(ang),si=Math.sin(ang);
  const off=c*(1-Math.min(100,pct)/100);
  return `<div class="ring"><svg viewBox="0 0 300 300" role="img" aria-label="Overall attendance ${fp(pct)} percent, minimum ${P.min} percent">
    <circle class="track" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="16"/>
    <circle class="fg ${animate?'anim':''}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="16" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="--c:${c}"/>
    <line class="tick" x1="${cx+(r-15)*co}" y1="${cy+(r-15)*si}" x2="${cx+(r+15)*co}" y2="${cy+(r+15)*si}" stroke-width="2.5" stroke-linecap="round"/>
    <text class="tlabel" x="${cx+(r+30)*co}" y="${cy+(r+30)*si+4.5}" text-anchor="middle">${P.min}%</text>
  </svg><div class="ring-c"><div class="n">${pctParts(pct)}</div><div class="l">Overall attendance</div></div></div>`;
}

function timeline(date,opts={}){
  const bl=blocksFor(date);let html='',firstUp=-1;
  const states=bl.map(b=>blockState(date,b));
  if(same(date,TODAY))firstUp=states.findIndex(s=>s==='upcoming');
  bl.forEach((b,n)=>{
    if(n>0){const gap=b.start-bl[n-1].end;if(gap>=45)html+=`<li class="tl-gap"><span></span><span class="rail"></span><span class="g">Free until ${tf(b.start)}</span></li>`}
    const m=meta(b.key),st=states[n];
    const cls=st==='now'?'now':(n===firstUp?'next':(st==='upcoming'?'':'done'));
    const when=(st==='upcoming'&&n===firstUp)?`<span class="when">in ${b.start-NOWMIN>=60?Math.floor((b.start-NOWMIN)/60)+' hr '+((b.start-NOWMIN)%60)+' min':(b.start-NOWMIN)+' min'}</span>`:'';
    html+=`<li class="tl-item ${cls}">
      <div class="tl-time"><b>${tf(b.start).replace(/ (AM|PM)/,'')}</b>${tf(b.end)}</div><span class="rail"><i></i></span>
      <div class="tl-main"><div class="t">${esc(m.name)}</div><div class="m">${esc(facShort(m.fac))}, ${esc(m.room)}${b.idx.length>1?`, ${b.idx.length} periods`:''}</div></div>
      <div class="tl-side">${sPill(st)}${when}</div></li>`;
  });
  return `<ol class="tl">${html}</ol>`;
}

/* ================= views ================= */
function greet(){const h=NOW.getHours();return h<12?'Good Morning':(h<17?'Good Afternoon':'Good Evening')}
function heroMessage(){
  const o=outlook(ALL.a,ALL.t,ALL.rem),diff=Math.abs(ALL.pct-P.min);
  if(ALL.pct>=P.min)return {h:`You're ${fp(diff)} points above the ${P.min}% minimum.`,p:o.canMiss>0?`You can miss up to ${pl(o.canMiss,'class','classes')} of the ${ALL.rem} left this semester and still finish at ${P.min}% or above.`:`Attend every remaining class to stay above ${P.min}%.`};
  if(o.reachable)return {h:`You're ${fp(diff)} points below the ${P.min}% minimum.`,p:`Attend the next ${pl(o.need,'class','classes')} in a row to get back to ${P.min}%.`};
  return {h:`You're ${fp(diff)} points below the ${P.min}% minimum.`,p:`Reaching ${P.min}% by the end of the semester isn't possible from here. Talk to your class advisor about your options.`};
}
const HEROLABEL={good:'Good attendance',warning:'Attendance warning',critical:'Critical attendance'};
let ringPlayed=false;
function vDashboard(){
  const hm=heroMessage(),anim=!ringPlayed;ringPlayed=true;
  const bl=blocksFor(TODAY);
  const watch=D.keys.slice().sort((a,b)=>SUBJ[a].pct-SUBJ[b].pct).slice(0,3);
  const below=D.keys.filter(k=>SUBJ[k].st!=='good').length;
  let today;
  if(bl.length){
    const allDone=bl.every(b=>blockState(TODAY,b)!=='upcoming'&&blockState(TODAY,b)!=='now');
    today=timeline(TODAY)+(allDone?`<p class="muted small" style="padding:10px 14px 0">That's all your classes for today.</p>`:'');
  }else{
    const n=nextTeachingDay();
    today=`<div class="empty"><b>No classes today</b><p class="muted">${n?`Next up: ${DOW[n.d.getDay()]} at ${tf(n.b[0].start)}, ${esc(meta(n.b[0].key).name)}.`:'The semester has ended.'}</p></div>`;
  }
  return `
  <header class="page-head"><div><h1 id="h1" tabindex="-1">${greet()}, Student</h1><p class="sub">${DOW[NOW.getDay()]}, ${NOW.getDate()} ${MON[NOW.getMonth()]} ${NOW.getFullYear()}</p></div><span class="tag">${esc(D.sec.label)}, ${esc(D.sec.sem)}</span></header>
  <div class="stack">
    <section class="card hero" aria-label="Overall attendance">
      ${ring(ALL.pct,anim)}
      <div class="hero-r">
        <div class="hero-copy">${pill(ALL.st,HEROLABEL[ALL.st])}<h2>${hm.h}</h2><p>${hm.p}</p></div>
        <dl class="stats">
          <div><dt>Total classes</dt><dd>${ALL.t}</dd></div>
          <div><dt>Classes attended</dt><dd>${ALL.a}</dd></div>
          <div><dt>Classes missed</dt><dd>${ALL.m}</dd></div>
          <div><dt>Attendance</dt><dd>${fp(ALL.pct)}%</dd></div>
        </dl>
      </div>
    </section>
    <div class="cols a">
      <section class="card" aria-labelledby="todayH">
        <div class="card-head"><h2 id="todayH">Today's schedule</h2><a href="#/schedule">Full week<svg class="i" style="width:18px;height:18px"><use href="#i-right"/></svg></a></div>
        ${today}
      </section>
      ${P.alerts?`<section aria-labelledby="watchH">
        <div class="card-head" style="padding:0 4px"><div><h2 id="watchH">Subjects to watch</h2><p class="muted small" style="margin-top:2px">${below?`${pl(below,'subject needs','subjects need')} attention`:'Every subject is in good shape'}</p></div><a href="#/subjects">See all<svg class="i" style="width:18px;height:18px"><use href="#i-right"/></svg></a></div>
        <div class="subj-list">${watch.map(subjCard).join('')}</div></section>`:''}
    </div>
  </div>`;
}

function monthCounts(y,m){
  const c={present:0,partial:0,absent:0};
  for(let d=new Date(y,m,1);d.getMonth()===m;d=addDays(d,1)){const s=dayState(d);if(c[s]!==undefined)c[s]++}
  return c;
}
function calendar(){
  const {y,m}=S.cal,first=new Date(y,m,1),lead=(first.getDay()+6)%7,dim=new Date(y,m+1,0).getDate();
  const idx=y*12+m,minI=SEM_START.getFullYear()*12+SEM_START.getMonth(),maxI=SEM_END.getFullYear()*12+SEM_END.getMonth();
  let cells='';for(let i=0;i<lead;i++)cells+='<span class="day blank"></span>';
  for(let n=1;n<=dim;n++){
    const d=new Date(y,m,n),id=ymd(d),st=dayState(d);
    const label={present:'present',partial:'partly present or late',absent:'absent',none:'no class',future:'upcoming classes',out:'outside the semester'}[st];
    cells+=`<button type="button" class="day d-${st}${same(d,TODAY)?' is-today':''}${S.sel===id?' is-sel':''}" data-act="date" data-v="${id}" aria-pressed="${S.sel===id}" aria-label="${DOW[d.getDay()]} ${n} ${MON[m]}, ${label}"><span class="dn">${n}</span></button>`;
  }
  const c=monthCounts(y,m);
  return `<div class="cal-head"><h2>${MON[m]} ${y}</h2><div class="cal-nav">
      <button class="icon-btn" data-act="cal" data-v="-1" aria-label="Previous month" ${idx<=minI?'disabled':''}><svg class="i"><use href="#i-left"/></svg></button>
      <button class="icon-btn" data-act="cal" data-v="1" aria-label="Next month" ${idx>=maxI?'disabled':''}><svg class="i"><use href="#i-right"/></svg></button></div></div>
    <div class="cal-dow" aria-hidden="true">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<span>${x}</span>`).join('')}</div>
    <div class="cal">${cells}</div>
    <div class="legend"><span><i class="sw-present"></i>Present <b>${c.present}</b></span><span><i class="sw-partial"></i>Partial or late <b>${c.partial}</b></span><span><i class="sw-absent"></i>Absent <b>${c.absent}</b></span><span><i class="sw-none"></i>No class</span></div>`;
}
function dayDetail(){
  const d=parse(S.sel),bl=blocksFor(d),st=dayState(d);
  const head=(extra)=>`<div class="card-head" style="align-items:center"><div><h2 class="day-title" id="dayH">${longDate(d)}</h2><p class="muted small" style="margin-top:2px">${d.getFullYear()}</p></div>${extra||''}</div>`;
  if(!bl.length){
    const why=d<SEM_START||d>SEM_END?'This date is outside the semester.':(HOLIDAYS.has(S.sel)?'Holiday.':(d.getDay()%6===0?'Weekend.':'No classes are scheduled.'));
    return head()+`<div class="empty" style="padding-top:8px"><b>No classes</b><p class="muted">${why}</p></div>`;
  }
  const overall={present:'present',partial:'partial',absent:'absent',future:'upcoming'}[st];
  const rows=bl.map(b=>{const m=meta(b.key),s=blockState(d,b);
    return `<li><div class="tm muted small" style="padding-top:2px">${range(b.start,b.end)}</div><div><div class="t">${esc(m.name)}</div><div class="m">${esc(facShort(m.fac))}, ${esc(m.room)}</div></div>${sPill(s)}</li>`}).join('');
  const att=bl.filter(b=>['present','late'].includes(blockState(d,b))).length;
  return head(sPill(overall||'upcoming'))+`<p class="muted">${d>TODAY?`${pl(bl.length,'class','classes')} scheduled.`:`Attended ${att} of ${pl(bl.length,'class','classes')}.`}</p><ul class="rows">${rows}</ul>`;
}
function vAttendance(){
  return `<header class="page-head"><div><h1 id="h1" tabindex="-1">Attendance</h1><p class="sub">Select a date to see what happened that day.</p></div></header>
  <div class="cols b"><section class="card" id="calCard" aria-label="Attendance calendar">${calendar()}</section>
  <section class="card" id="dayDetail" aria-labelledby="dayH" style="align-self:start">${dayDetail()}</section></div>`;
}

function weekDays(){
  let base=TODAY;const dow=base.getDay();
  base=dow===6?addDays(base,2):(dow===0?addDays(base,1):addDays(base,-(dow-1)));
  return [0,1,2,3,4].map(i=>addDays(base,i));
}
function vSchedule(){
  const wk=weekDays();if(!S.sday||!wk.some(d=>ymd(d)===S.sday))S.sday=wk.find(d=>same(d,TODAY))?ymd(TODAY):ymd(wk[0]);
  const d=parse(S.sday),bl=blocksFor(d);
  const tabs=wk.map(x=>`<button type="button" class="${same(x,TODAY)?'today':''}" data-act="sday" data-v="${ymd(x)}" aria-pressed="${S.sday===ymd(x)}"><span>${DAYS[x.getDay()]}</span><b>${x.getDate()}</b></button>`).join('');
  const sum=bl.length?`${pl(bl.reduce((s,b)=>s+b.idx.length,0),'class','classes')}, ${range(bl[0].start,bl[bl.length-1].end)}`:'No classes';
  const week=wk.map(x=>{const b=blocksFor(x),n=b.reduce((s,q)=>s+q.idx.length,0);
    return `<li><button type="button" class="wk ${S.sday===ymd(x)?'on':''}" data-act="sday" data-v="${ymd(x)}"><span class="wkd">${DOW[x.getDay()]}<small class="muted">${x.getDate()} ${MON[x.getMonth()].slice(0,3)}</small></span><span class="wkn">${b.length?pl(n,'class','classes'):(HOLIDAYS.has(ymd(x))?'Holiday':'None')}</span><span class="wkb"><i style="width:${n/9*100}%"></i></span></button></li>`}).join('');
  const first=wk[0],last=wk[4];
  return `<header class="page-head"><div><h1 id="h1" tabindex="-1">Schedule</h1><p class="sub">${first.getDate()} ${MON[first.getMonth()]} to ${last.getDate()} ${MON[last.getMonth()]}, ${esc(D.sec.label)}</p></div></header>
  <div class="stack"><div class="seg wide" role="group" aria-label="Day of the week">${tabs}</div>
  <div class="cols a"><section class="card" aria-labelledby="sdH"><div class="card-head"><h2 id="sdH">${longDate(d)}</h2><span class="muted small">${sum}</span></div>
    ${bl.length?timeline(d):`<div class="empty"><b>No classes</b><p class="muted">${HOLIDAYS.has(S.sday)?'Holiday.':'Nothing is scheduled for this day.'}</p></div>`}</section>
  <section class="card" style="align-self:start"><div class="card-head"><h2>This week</h2></div><ul class="wklist">${week}</ul></section></div></div>`;
}

function vSubjects(){
  const keys=D.keys.slice();
  if(S.sort==='low')keys.sort((a,b)=>SUBJ[a].pct-SUBJ[b].pct);else keys.sort((a,b)=>meta(a).name.localeCompare(meta(b).name));
  return `<header class="page-head"><div><h1 id="h1" tabindex="-1">Subjects</h1><p class="sub">${pl(keys.length,'subject','subjects')} this semester</p></div>
    <div class="seg" role="group" aria-label="Sort subjects"><button type="button" data-act="sort" data-v="low" aria-pressed="${S.sort==='low'}">Lowest first</button><button type="button" data-act="sort" data-v="az" aria-pressed="${S.sort==='az'}">A to Z</button></div></header>
  <div class="subj-grid">${keys.map(subjCard).join('')}</div>`;
}

function trend(key){
  const by={};D.recs.filter(r=>r.key===key).forEach(r=>{const m=r.date.slice(0,7);(by[m]=by[m]||[]).push(r)});
  const ms=Object.keys(by).sort();const W=420,H=250,pL=8,pR=8,pT=34,pB=52,n=ms.length||1;
  const band=(W-pL-pR)/n,bw=Math.min(76,band*.56),y=v=>pT+(H-pT-pB)*(1-v/100);
  let g=`<line x1="${pL}" x2="${W-pR}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line-strong)"/>`;
  ms.forEach((mk,i)=>{
    const rs=by[mk],a=rs.filter(isAtt).length,p=a/rs.length*100,cx=pL+band*i+band/2,mi=+mk.slice(5)-1;
    const cur=i===ms.length-1;
    g+=`<rect x="${cx-bw/2}" y="${y(p)}" width="${bw}" height="${y(0)-y(p)}" rx="10" fill="${cur?'var(--blue)':'var(--blue-soft)'}"/>
      <text x="${cx}" y="${y(p)-9}" text-anchor="middle" font-size="15" font-weight="600" fill="${p<P.min?'var(--red)':'var(--ink)'}">${fp(p)}%</text>
      <text x="${cx}" y="${H-pB+22}" text-anchor="middle" font-size="14" font-weight="500" fill="var(--ink)">${MON[mi].slice(0,3)}</text>
      <text x="${cx}" y="${H-pB+40}" text-anchor="middle" font-size="12" fill="var(--ink-2)">${a} / ${rs.length}</text>`;
  });
  g+=`<line x1="${pL}" x2="${W-pR}" y1="${y(P.min)}" y2="${y(P.min)}" stroke="var(--ink)" stroke-dasharray="4 5" opacity=".5"/><text x="${pL}" y="${y(P.min)-8}" font-size="12" font-weight="500" fill="var(--ink-2)" stroke="var(--surface)" stroke-width="4" paint-order="stroke">${P.min}% minimum</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly attendance for this subject">${g}</svg>`;
}
function vSubject(key){
  if(!SUBJ[key])return vSubjects();
  const s=SUBJ[key],m=meta(key),o=outlook(s.a,s.t,s.rem);
  let needP,needN=o.need;
  if(o.need===0)needP=`You've reached ${P.min}%. ${o.canMiss>0?`You can miss up to ${pl(o.canMiss,'class','classes')} of the ${s.rem} left and still finish at ${P.min}% or above.`:`Keep attending every class to stay above it.`}`;
  else if(o.reachable)needP=`Attend the next ${pl(o.need,'class','classes')} in a row to reach ${P.min}%.`;
  else needP=`Reaching ${P.min}% takes ${o.need} more classes in a row, but only ${s.rem} are left. Talk to your class advisor about your options.`;
  const all=D.recs.filter(r=>r.key===key).sort((a,b)=>a.date===b.date?a.i-b.i:a.date<b.date?-1:1);
  const heat=all.map(r=>`<i class="${r.s}" title="${parse(r.date).getDate()} ${MON[parse(r.date).getMonth()].slice(0,3)}, ${r.s==='P'?'Present':r.s==='L'?'Late':'Absent'}"></i>`).join('');
  let list=all.slice().reverse();
  if(S.hist==='absent')list=list.filter(r=>r.s==='A');if(S.hist==='late')list=list.filter(r=>r.s==='L');
  const shown=list.slice(0,S.histN);
  const rows=shown.map(r=>{const d=parse(r.date);return `<li><div><div class="d">${DAYS[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()].slice(0,3)}</div><div class="t">${tf(START[r.i])}</div></div>${sPill(r.s==='P'?'present':r.s==='L'?'late':'absent')}</li>`}).join('');
  return `<a class="back" href="#/subjects"><svg class="i" style="width:20px;height:20px"><use href="#i-left"/></svg>Subjects</a>
  <header class="page-head"><div style="min-width:0;max-width:760px"><h1 id="h1" tabindex="-1">${esc(m.name)}</h1><p class="sub">${esc(m.code)}, ${esc(m.fac)}</p></div>${stPill(s.st)}</header>
  <div class="stack">
    <div class="cols b">
      <section class="card" aria-label="Current attendance">
        <p class="muted" style="margin-bottom:10px">Current attendance</p>
        <div class="big-pct" style="margin-bottom:22px">${pctParts(s.pct)}</div>
        ${bar(s.pct)}<p class="muted small" style="margin-top:12px">The mark on the bar is the ${P.min}% minimum.</p>
        <dl class="trio"><div><dt>Classes attended</dt><dd>${s.a}</dd></div><div><dt>Classes missed</dt><dd>${s.m}</dd></div><div><dt>Total so far</dt><dd>${s.t}</dd></div></dl>
      </section>
      <section class="card need" aria-label="Classes needed to reach ${P.min} percent">
        <h2>Classes needed to reach ${P.min}%</h2><div class="n">${needN}</div><p>${needP}</p>
        <ul class="facts"><li>Classes left this semester<b>${s.rem}</b></li>${o.need>0&&o.reachable?`<li>Attendance after those ${o.need}<b>${fp(o.after)}%</b></li>`:''}<li>Best possible finish<b>${fp(o.best)}%</b></li></ul>
      </section>
    </div>
    <div class="cols b">
      <section class="card trend" aria-labelledby="trH" style="align-self:start"><div class="card-head"><h2 id="trH">Monthly trend</h2></div>${trend(key)}</section>
      <section class="card" aria-labelledby="hiH"><div class="card-head"><h2 id="hiH">Attendance history</h2><span class="muted small">${all.length} classes</span></div>
        <div class="heat" role="img" aria-label="${s.a} attended, ${s.m} missed">${heat}</div>
        <div class="legend" style="margin:8px 0 14px;padding:0;border:0;font-size:13px"><span><i class="sw-present" style="width:11px;height:11px;border-radius:3px"></i>Present</span><span><i class="sw-partial" style="width:11px;height:11px;border-radius:3px"></i>Late</span><span><i class="sw-absent" style="width:11px;height:11px;border-radius:3px"></i>Absent</span></div>
        <div class="seg" role="group" aria-label="Filter history"><button type="button" data-act="hist" data-v="all" aria-pressed="${S.hist==='all'}">All</button><button type="button" data-act="hist" data-v="absent" aria-pressed="${S.hist==='absent'}">Absent</button><button type="button" data-act="hist" data-v="late" aria-pressed="${S.hist==='late'}">Late</button></div>
        ${rows?`<ul class="hist">${rows}</ul>`:`<p class="muted" style="padding:16px 0 4px">${S.hist==='absent'?'No absences. Nice work.':'No late arrivals recorded.'}</p>`}
        ${list.length>shown.length?`<button class="btn ghost block" style="margin-top:12px" type="button" data-act="more">Show more</button>`:''}
      </section>
    </div>
  </div>`;
}

function grow(id,title,desc,ctl){return `<div class="grow"><div><div class="rt" id="l-${id}">${title}</div>${desc?`<div class="rd">${desc}</div>`:''}</div>${ctl}</div>`}
const sw=(id)=>`<button type="button" class="switch" role="switch" aria-checked="${P[id]}" aria-labelledby="l-${id}" data-act="pref" data-v="${id}"></button>`;
function vProfile(){
  return `<header class="page-head"><div><h1 id="h1" tabindex="-1">Profile</h1><p class="sub">Your class and how attendance is counted.</p></div></header>
  <div class="narrow">
    <section class="card pcard"><span class="avatar" aria-hidden="true">S</span><div><h2>Student</h2><p class="muted">${esc(D.sec.label)}, ${esc(D.sec.sem)}</p><p class="muted small">SRM Institute of Science and Technology, Tiruchirappalli</p></div></section>
    <h2 class="group-title">Class</h2>
    <div class="group">
      ${grow('section','Class section','',`<select id="secSel" aria-labelledby="l-section">${Object.entries(SECTIONS).map(([k,v])=>`<option value="${k}" ${k===P.section?'selected':''}>${esc(v.label)}</option>`).join('')}</select>`)}
      ${grow('min','Minimum attendance','Subjects below this show as Critical.',`<div class="seg" role="group" aria-labelledby="l-min">${[70,75,80].map(v=>`<button type="button" data-act="min" data-v="${v}" aria-pressed="${P.min===v}">${v}%</button>`).join('')}</div>`)}
      ${grow('late','Count late arrivals as present','Turn off to count them as missed.',sw('late'))}
    </div>
    <h2 class="group-title">Notifications</h2>
    <div class="group">
      ${grow('alerts','Low-attendance alerts','Show subjects that need attention on your dashboard.',sw('alerts'))}
      ${grow('remind','Class reminders','A nudge 10 minutes before each class.',sw('remind'))}
      ${grow('weekly','Weekly summary','A recap of your attendance every Sunday.',sw('weekly'))}
    </div>
    <p class="muted small" style="margin:22px 4px 0">Attendance figures in this preview are sample data, generated on the real ${esc(D.sec.label)} timetable.</p>
  </div>`;
}

/* ================= router & state ================= */
const S={route:'dashboard',subject:null,cal:{y:2026,m:8},sel:null,sday:null,sort:'low',hist:'all',histN:6};
const TITLES={dashboard:'Dashboard',attendance:'Attendance',schedule:'Schedule',subjects:'Subjects',profile:'Profile'};
function parseHash(){
  const h=(location.hash||'').replace(/^#\/?/,'').split('/');
  const r=h[0]||'dashboard';
  if(r==='subject'&&h[1])return {route:'subject',subject:h[1]};
  return {route:TITLES[r]?r:'dashboard',subject:null};
}
function draw(){
  refresh();
  const v={dashboard:vDashboard,attendance:vAttendance,schedule:vSchedule,subjects:vSubjects,profile:vProfile}[S.route]||(()=>vSubject(S.subject));
  $('#view').innerHTML=S.route==='subject'?vSubject(S.subject):v();
  const navKey=S.route==='subject'?'subjects':S.route;
  document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===navKey)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  $('#footSec').textContent=D.sec.label;
  $('#fab').hidden=S.route!=='attendance';
  const h1=$('#h1');document.title=(S.route==='subject'&&SUBJ[S.subject]?meta(S.subject).name:TITLES[S.route])+' · SRM Attendance';
  return h1;
}
function route(){
  const p=parseHash();S.route=p.route;S.subject=p.subject;
  refresh();
  if(S.route==='attendance'){if(!S.sel){S.sel=ymd(TODAY);S.cal={y:TODAY.getFullYear(),m:TODAY.getMonth()}}}
  if(S.route==='subject'){S.hist='all';S.histN=6}
  const h1=draw();window.scrollTo(0,0);if(h1)h1.focus({preventScroll:true});
}
function redraw(focusSel){
  const y=window.scrollY;draw();window.scrollTo(0,y);
  if(focusSel){const el=document.querySelector(focusSel);if(el)el.focus({preventScroll:true})}
}
window.addEventListener('hashchange',route);

let toastT;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2600)}

/* sheet */
let lastFocus;
function openSheet(){
  const d=parse(S.sel),bl=blocksFor(d);
  if(!bl.length||d>TODAY){toast('Select a past class day on the calendar first');return}
  const done=bl.filter(b=>!['upcoming','now'].includes(blockState(d,b)));
  $('#sheetDate').textContent=longDate(d)+' '+d.getFullYear();
  const firstAbs=done.findIndex(b=>blockState(d,b)==='absent');
  $('#sheetClass').innerHTML=done.map((b,i)=>`<option value="${i}" ${i===(firstAbs<0?0:firstAbs)?'selected':''}>${esc(meta(b.key).name)}, ${tf(b.start)}, ${SLABEL[blockState(d,b)]}</option>`).join('');
  $('#sheetWhy').value='';lastFocus=document.activeElement;$('#scrim').hidden=false;$('#sheetWhy').focus();
}
function closeSheet(){$('#scrim').hidden=true;if(lastFocus)lastFocus.focus()}
$('#sheet').addEventListener('submit',e=>{e.preventDefault();closeSheet();toast('Request sent. Your class advisor will review it.')});
$('#scrim').addEventListener('click',e=>{if(e.target.id==='scrim')closeSheet()});
document.addEventListener('keydown',e=>{
  if($('#scrim').hidden)return;
  if(e.key==='Escape')closeSheet();
  if(e.key==='Tab'){const f=[...$('#sheet').querySelectorAll('button,select,textarea')].filter(x=>!x.disabled);const a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
});

document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');if(!t)return;
  const a=t.dataset.act,v=t.dataset.v,keep=`[data-act="${a}"]${v!==undefined?`[data-v="${v}"]`:''}`;
  if(a==='date'){S.sel=v;const d=parse(v);S.cal={y:d.getFullYear(),m:d.getMonth()};redraw(keep);
    if(window.innerWidth<1100)$('#dayDetail').scrollIntoView({behavior:'smooth',block:'nearest'})}
  else if(a==='cal'){let m=S.cal.m+ +v,y=S.cal.y;if(m<0){m=11;y--}if(m>11){m=0;y++}S.cal={y,m};redraw(keep)}
  else if(a==='sday'){S.sday=v;redraw(keep)}
  else if(a==='sort'){S.sort=v;redraw(keep)}
  else if(a==='hist'){S.hist=v;S.histN=6;redraw(keep)}
  else if(a==='more'){S.histN+=8;redraw()}
  else if(a==='min'){P.min=+v;savePrefs();redraw(keep)}
  else if(a==='pref'){P[v]=!P[v];savePrefs();redraw(keep);
    if(v==='remind')toast(P.remind?'Class reminders on':'Class reminders off');
    if(v==='weekly')toast(P.weekly?'Weekly summary on':'Weekly summary off')}
  else if(a==='sheet')openSheet();
  else if(a==='close')closeSheet();
});
document.addEventListener('change',e=>{
  if(e.target.id==='secSel'){P.section=e.target.value;savePrefs();S.sel=null;S.sday=null;refresh();S.sel=ymd(TODAY);redraw('#secSel');toast('Switched to '+SECTIONS[P.section].label)}
});

route();
