/* TheCyclistDubai · ride page (one template for every group ride page)
   Each page sets window.RIDE_PAGE = { name, theme, gpx | track, ... } and loads site-data.js, Leaflet and this file.
   Ride facts (time, pace, distance, start, links, stopMin, strava) come from site-data.js, so the homepage card,
   the shares and this page always match. */
(function(){
const CFG=window.RIDE_PAGE||{};
const SITE=window.SITE||{rides:[],links:{}};
const RIDE=(SITE.rides||[]).find(r=>r.name===CFG.name)||{name:CFG.name,time:'06:30',pace:'30 km/h avg',weekly:'Tue'};
const LINKS=SITE.links||{};
const WA=LINKS.whatsappGroup||RIDE.join||'#';
document.body.classList.add('th-'+(CFG.theme||RIDE.theme||'green'));
const DAYN={Sun:'Sunday',Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday'};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const NET=!CFG.gpx; // trail-network mode (no GPX): map shows the trails, distance is set in the planner
const TURN_NAME=CFG.turnName||'the turnaround',TURN_ICON=CFG.turnIcon||'↩️';
const START=RIDE.start||'the start';

/* ---------- markup (identical on every ride page) ---------- */
const linkBits=[];
if(CFG.gpx)linkBits.push(`<a href="${esc(CFG.gpx)}" download="${esc(CFG.gpxName||CFG.gpx)}">Download GPX</a>`);
if(CFG.stravaRoute)linkBits.push(`<a href="${esc(CFG.stravaRoute)}" target="_blank" rel="noopener">Strava route</a>`);
if(RIDE.location)linkBits.push(`<a href="${esc(RIDE.location)}" target="_blank" rel="noopener">Meeting point on Maps</a>`);
if(WA&&WA!=='#')linkBits.push(`<a href="${esc(WA)}" target="_blank" rel="noopener">WhatsApp group</a>`);
document.getElementById('app').innerHTML=`
<header class="top">
  <div class="hl"><a class="tcd-logo" href="./" title="Back to the TheCyclistDubai homepage" aria-label="Back to the TheCyclistDubai homepage"><i>‹</i><b>TheCyclist<span>Dubai</span></b><em>Homepage</em></a></div>
</header>
<section class="hero slim">
  <div class="hrow">
    <div class="dtile"><span id="hDow">---</span><b id="hDay">--</b><span id="hMon">---</span></div>
    <div class="hmain">
      <h1>${esc(RIDE.name)}</h1>
      <p class="whenline" id="hWhen">--</p>
      <p class="meet">Meet at <b>${esc(START)}</b>${RIDE.place?` · ${esc(RIDE.place)}`:''}${RIDE.weekly?` · Every ${esc(DAYN[RIDE.weekly]||'week')}`:''}</p>
      <p class="rule">⛑️💡 ${esc(SITE.rideRule||'Lights & helmet mandatory')}</p>
    </div>
  </div>
  <div class="stats three">
    <div class="stat"><small>Distance</small><b id="sDist">--</b></div>
    <div class="stat"><small>Pace</small><b id="sPace">--</b></div>
    <div class="stat"><small>Level</small><b>${esc(RIDE.type||'Road')}</b></div>
  </div>
  ${RIDE.strava?`<div class="hbtns"><a class="btn strava" href="${esc(RIDE.strava)}" target="_blank" rel="noopener"><svg class="slogo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>Join ride on Strava ↗</a></div>`:''}
</section>
<section class="sec">
  <div class="sech"><h2>🗺️ Route</h2><div class="sp"></div>
    <div class="seg${NET?' hide':''}" id="legSeg"><button data-l="out" class="on">Way out</button><button data-l="back">Way back</button></div></div>
  <div class="mapbox">
    <div id="map"></div><canvas id="wind"></canvas>
    <div class="mapui">
      <div class="wbadge"><div class="warr" id="wArr">↓</div><div><b id="wSpd">-- km/h</b><small id="wFrom">wind from --</small></div></div>
      <div class="legend">${NET?'<span><i style="background:var(--head)"></i>Along the wind</span><span><i style="background:var(--cross)"></i>Crosswind</span>':'<span><i style="background:var(--head)"></i>Headwind</span><span><i style="background:var(--tail)"></i>Tailwind</span><span><i style="background:var(--cross)"></i>Crosswind</span>'}</div>
    </div>
    <div class="mapctl"><div class="seg" id="layerSeg"><button data-t="cycle" class="on">Map</button><button data-t="sat">Satellite</button></div></div>
    <div class="mhint" id="mhint">Use two fingers to move the map</div>
  </div>
  <p class="maperr" id="mapErr" hidden>The route could not be loaded.</p>
  ${linkBits.length?`<p class="quiet">${linkBits.join('')}</p>`:''}
</section>
<div class="foot">Map: © OpenStreetMap contributors, CyclOSM, Esri · <a href="disclaimer.html">Disclaimer</a> · <a href="./">TheCyclistDubai</a></div>`;

const $=id=>document.getElementById(id);
const TZ=4*3600e3; // Dubai, UTC+4, no DST
const DOW=['SUN','MON','TUE','WED','THU','FRI','SAT'],MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const pad=n=>String(n).padStart(2,'0');
const dubaiNow=()=>new Date(Date.now()+TZ);
const ymd=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const fmt12=(h,m)=>{m=Math.round(m);if(m===60){h++;m=0}h=((h%24)+24)%24;return `${(h%12)||12}:${pad(m)} ${h<12?'AM':'PM'}`};
const clock=mins=>fmt12(Math.floor(mins/60),mins%60);
const hm=mins=>{mins=Math.round(mins);return `${Math.floor(mins/60)}:${pad(mins%60)}`};
const CARD=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const card=d=>CARD[Math.round(((d%360)+360)%360/22.5)%16];

/* ---------- ride dates (weekly, from site-data.js) ---------- */
const [RH,RM]=(RIDE.time||'06:30').split(':').map(Number);
const DOWI={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[RIDE.weekly||'Tue'];
function nextRides(n){const out=[],now=dubaiNow();let d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),RH,RM));
  for(let k=0;k<120&&out.length<n;k++){if(d.getUTCDay()===DOWI&&d>now&&(!RIDE.until||ymd(d)<=RIDE.until)){const ch=RIDE.changes&&RIDE.changes[ymd(d)];if(!(ch&&ch.cancelled))out.push(ymd(d))}d=new Date(d.getTime()+864e5)}
  return out}
const DATES=nextRides(4);if(!DATES.length)DATES.push(ymd(dubaiNow()));
const timeFor=d=>(RIDE.changes&&RIDE.changes[d]&&RIDE.changes[d].time)||RIDE.time||'06:30';
const ST={date:DATES[0],start:timeFor(DATES[0]),leg:'out',mode:'speed',wx:null,layer:'cycle'};

/* ---------- route ---------- */
let PTS=[],CUM=[],TURN=0,GAIN=0,SEG=[],LINES=[],NETLEN=0;
const R=6371008.8,rad=Math.PI/180;
function hav(a,b){const dLa=(b[0]-a[0])*rad,dLo=(b[1]-a[1])*rad,s=Math.sin(dLa/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(s))}
function brg(a,b){const y=Math.sin((b[1]-a[1])*rad)*Math.cos(b[0]*rad),x=Math.cos(a[0]*rad)*Math.sin(b[0]*rad)-Math.sin(a[0]*rad)*Math.cos(b[0]*rad)*Math.cos((b[1]-a[1])*rad);return(Math.atan2(y,x)/rad+360)%360}
function buildRoute(pts){PTS=pts;CUM=[0];for(let i=1;i<pts.length;i++)CUM.push(CUM[i-1]+hav(pts[i-1],pts[i]));
  let far=0,fd=0;pts.forEach((p,i)=>{const d=hav(pts[0],p);if(d>fd){fd=d;far=i}});TURN=far;
  GAIN=0;for(let i=1;i<pts.length;i++)GAIN+=Math.max(0,pts[i][2]-pts[i-1][2]);
  let a=0,b=0;const gr=pts.map((p,i)=>{while(CUM[i]-CUM[a]>120)a++;while(b<pts.length-1&&CUM[b]-CUM[i]<120)b++;const d=CUM[b]-CUM[a];return d>30?Math.max(-.08,Math.min(.08,(pts[b][2]-pts[a][2])/d)):0});
  SEG=[];for(let i=1;i<pts.length;i++){const len=CUM[i]-CUM[i-1];if(len<=0)continue;SEG.push({a:pts[i-1],b:pts[i],len,brg:brg(pts[i-1],pts[i]),gr:(gr[i]+gr[i-1])/2,leg:i<=TURN?'out':'back',elev:pts[i][2]||0})}}
// trail network: every segment ridden both ways (half the distance each), flat
function buildNet(lines){LINES=lines;SEG=[];NETLEN=0;const all=[];
  lines.forEach(l=>{all.push(...l);for(let i=1;i<l.length;i++){const len=hav(l[i-1],l[i]);if(len<=0)continue;NETLEN+=len;const b=brg(l[i-1],l[i]);
    SEG.push({a:l[i-1],b:l[i],len:len/2,brg:b,gr:0,leg:'out',elev:CFG.elev||20,draw:true});SEG.push({a:l[i],b:l[i-1],len:len/2,brg:(b+180)%360,gr:0,leg:'back',elev:CFG.elev||20})}});
  PTS=all.map(p=>[p[0],p[1],0])}
async function loadGpx(){const t=await (await fetch(CFG.gpx)).text();const x=new DOMParser().parseFromString(t,'application/xml');
  return [...x.getElementsByTagName('trkpt')].map(p=>[+p.getAttribute('lat'),+p.getAttribute('lon'),+((p.getElementsByTagName('ele')[0]||{}).textContent||0)])}
async function loadNet(){const j=await (await fetch(CFG.track)).json();return(j.lines||[]).map(l=>Array.isArray(l)?l:l.pts||[]).filter(l=>l.length>1)}
const routeKm=()=>NET?(CFG.defaultKm||20):CUM[CUM.length-1]/1000;

/* ---------- weather ---------- */
const HV='temperature_2m,wind_speed_10m,wind_direction_10m';
let LAT=CFG.lat,LON=CFG.lon;
async function loadWx(){const u=`https://api.open-meteo.com/v1/forecast?latitude=${LAT.toFixed(4)}&longitude=${LON.toFixed(4)}&hourly=${HV}&timezone=Asia%2FDubai&forecast_days=16&wind_speed_unit=kmh`;
  const j=await (await fetch(u)).json();if(!j.hourly)throw new Error('no data');const H={};j.hourly.time.forEach((t,i)=>{const o={};for(const k in j.hourly)if(k!=='time')o[k]=j.hourly[k][i];H[t]=o});
  return{H}}
function wxAt(mins){if(!ST.wx)return null;const h0=Math.floor(mins/60),f=mins/60-h0;
  const key=h=>{const p=ST.date.split('-').map(Number);const d=new Date(Date.UTC(p[0],p[1]-1,p[2])+h*3600e3);return `${ymd(d)}T${pad(d.getUTCHours())}:00`};
  const A=ST.wx.H[key(h0)],B=ST.wx.H[key(h0+1)]||A;if(!A)return null;const o={};
  for(const k in A){if(typeof A[k]==='number'&&typeof B[k]==='number')o[k]=A[k]+(B[k]-A[k])*f;else o[k]=A[k]}
  const u=v=>[Math.sin(v.wind_direction_10m*rad)*v.wind_speed_10m,Math.cos(v.wind_direction_10m*rad)*v.wind_speed_10m];
  const ua=u(A),ub=u(B),ux=ua[0]+(ub[0]-ua[0])*f,uy=ua[1]+(ub[1]-ua[1])*f;o.wind_direction_10m=(Math.atan2(ux,uy)/rad+360)%360;o.wind_speed_10m=Math.hypot(ux,uy);return o}
const STOP=+RIDE.stopMin||0;
const startMins=()=>{const [h,m]=ST.start.split(':').map(Number);return h*60+m};
const hasWx=()=>!!(ST.wx&&wxAt(startMins()));

/* ---------- physics (same model as the Al Qudra simulator) ---------- */
const G=9.81,CRR=CFG.crr||.0036,EFF=.975,HEIGHT=CFG.windFactor||.75;
function rider(){return{m:83.5,mr:75,cda:.32*.72}}
function env(seg,mins){const w=wxAt(mins);const T=w?w.temperature_2m:24,ws=w?w.wind_speed_10m:0,wd=w?w.wind_direction_10m:0;
  const rel=(wd-seg.brg)*rad,hw=HEIGHT*ws/3.6*Math.cos(rel);const rho=101325*Math.exp(-seg.elev/8434)/(287.05*(T+273.15));
  const a=Math.abs(((wd-seg.brg)%360+540)%360-180);return{hw,rho,th:Math.atan(seg.gr),kind:a<60?'head':a>120?'tail':'cross',T}}
const powAt=(v,e,r)=>Math.max(0,(0.5*e.rho*r.cda*(v+e.hw)*Math.abs(v+e.hw)*v+CRR*r.m*G*Math.cos(e.th)*v+r.m*G*Math.sin(e.th)*v)/EFF);
function vAt(P,e,r){let lo=.5,hi=30;for(let k=0;k<40;k++){const m=(lo+hi)/2;if(powAt(m,e,r)>P)hi=m;else lo=m}return(lo+hi)/2}
function sim(mode,val,wind=true,r=rider()){let t=0,E=0;const T={out:{t:0,E:0,len:0,k:{head:0,tail:0,cross:0}},back:{t:0,E:0,len:0,k:{head:0,tail:0,cross:0}}};const t0=startMins(),kinds=[];
  const sc=NET?routeKm()*1000/NETLEN:1;
  for(const s of SEG){const L=s.len*sc,clk=t0+t/60+(!NET&&s.leg==='back'?STOP:0);const e=wind?env(s,clk):Object.assign(env(s,clk),{hw:0});let v,P;
    if(mode==='speed'){v=val/3.6;P=powAt(v,e,r)}else{P=val;v=vAt(P,e,r)}
    const dt=L/v;t+=dt;E+=P*dt;
    // network: split by wind side (into vs with the wind) rather than out/back
    const key=NET?(e.hw>=0?'out':'back'):s.leg;const X=T[key];X.t+=dt;X.E+=P*dt;X.len+=L;X.k[e.kind]+=L;kinds.push(e.kind)}
  const km=routeKm();return{t,E,km,v:km/(t/3600),P:E/t,out:T.out,back:T.back,kinds,r}}

/* ---------- map ---------- */
let map,routeLayer,arrowLayer,pinLayer;
const KCOL={head:'#dc2626',tail:'#16a34a',cross:'#eab308'};
const PC=n=>getComputedStyle(document.body).getPropertyValue(n).trim();
const TILES={cycle:L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',{maxZoom:20,attribution:'CyclOSM · © OpenStreetMap contributors'}),
  sat:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics'})};
function initMap(){map=L.map('map',{zoomControl:true});TILES.cycle.addTo(map);
  routeLayer=L.layerGroup().addTo(map);arrowLayer=L.layerGroup().addTo(map);pinLayer=L.layerGroup().addTo(map);
  map.fitBounds(L.latLngBounds(PTS.map(p=>[p[0],p[1]])),{padding:[30,30]});
  const pin=(ll,bg,txt,tip)=>L.marker(ll,{icon:L.divIcon({className:'',html:`<div class="pin" style="background:${bg}">${txt}</div>`,iconSize:[30,30],iconAnchor:[15,15]})}).bindTooltip(tip).addTo(pinLayer);
  if(NET){if(CFG.startLL)pin(CFG.startLL,'#16a34a',CFG.mtb?'🚵':'🚴',`Start: ${START}`)}
  else{pin([PTS[0][0],PTS[0][1]],'#16a34a','🚴',`Start & finish: ${START}`);pin([PTS[TURN][0],PTS[TURN][1]],'var(--p1)',TURN_ICON,`Turnaround: ${TURN_NAME} · km ${(CUM[TURN]/1000).toFixed(1)}`)}
  if(matchMedia('(pointer:coarse)').matches){map.dragging.disable();if(map.tap)map.tap.disable();let tm;const el=$('map');
    el.addEventListener('touchmove',e=>{if(e.touches.length===1){$('mhint').classList.add('on');clearTimeout(tm);tm=setTimeout(()=>$('mhint').classList.remove('on'),1200)}else $('mhint').classList.remove('on')},{passive:true})}
  document.querySelectorAll('#layerSeg button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#layerSeg button').forEach(x=>x.classList.toggle('on',x===b));
    map.removeLayer(TILES[ST.layer]);ST.layer=b.dataset.t;TILES[ST.layer].addTo(map)})}
function drawRoute(res){routeLayer.clearLayers();arrowLayer.clearLayers();const has=hasWx();
  if(NET){const w=wxAt(startMins());
    LINES.forEach(l=>{L.polyline(l,{color:'#fff',weight:9,opacity:.9,interactive:false}).addTo(routeLayer);
      for(let i=1;i<l.length;i++){let c=PC('--p2')||'#c2410c';if(w){const a=Math.abs(((w.wind_direction_10m-brg(l[i-1],l[i]))%360+540)%360-180);c=a<60||a>120?KCOL.head:KCOL.cross}
        L.polyline([l[i-1],l[i]],{color:c,weight:5,lineCap:'round'}).addTo(routeLayer)}});return}
  const idx=SEG.map((s,i)=>i).filter(i=>SEG[i].leg===ST.leg),other=SEG.map((s,i)=>i).filter(i=>SEG[i].leg!==ST.leg);
  L.polyline(other.map(i=>[SEG[i].a[0],SEG[i].a[1]]),{color:'#ffffff',weight:9,opacity:.55,interactive:false}).addTo(routeLayer);
  L.polyline(idx.map(i=>[SEG[i].a[0],SEG[i].a[1]]),{color:'#fff',weight:10,opacity:.95,interactive:false}).addTo(routeLayer);
  let run=[],k=null;const flush=()=>{if(run.length>1)L.polyline(run,{color:KCOL[k]||PC('--p2')||'#7c3aed',weight:5.5,lineCap:'round'}).addTo(routeLayer)};
  idx.forEach(i=>{const kk=res&&has?res.kinds[i]:'none';if(kk!==k){flush();run=run.length?[run[run.length-1]]:[];k=kk}run.push([SEG[i].a[0],SEG[i].a[1]]);run.push([SEG[i].b[0],SEG[i].b[1]])});flush();
  let acc=0;const gap=Math.max(800,CUM[CUM.length-1]/24);idx.forEach(i=>{acc+=SEG[i].len;if(acc<gap)return;acc=0;const s=SEG[i];
    L.marker([s.b[0],s.b[1]],{interactive:false,icon:L.divIcon({className:'',html:`<div class="darr" style="transform:rotate(${s.brg-90}deg)">➤</div>`,iconSize:[18,18],iconAnchor:[9,9]})}).addTo(arrowLayer)})}

/* wind particles */
const cv=$('wind'),cx=cv.getContext('2d');let PT=[],vx=0,vy=0,pA=.5;
function sizeCv(){const r=cv.getBoundingClientRect();cv.width=r.width*devicePixelRatio;cv.height=r.height*devicePixelRatio;cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
new ResizeObserver(sizeCv).observe(cv);
function setParticles(dir,k){const to=(dir+180)*rad,sp=.4+k/9;vx=Math.sin(to)*sp;vy=-Math.cos(to)*sp;pA=Math.min(.75,.25+k/50);
  const n=Math.round(60+k*7),w=cv.clientWidth,h=cv.clientHeight;while(PT.length<n)PT.push({x:Math.random()*w,y:Math.random()*h,a:Math.random()*80});PT.length=n}
(function step(){const w=cv.clientWidth,h=cv.clientHeight;cx.clearRect(0,0,w,h);cx.lineCap='round';const sat=ST.layer==='sat';
  for(const p of PT){const ox=p.x,oy=p.y;p.x+=vx*(.85+Math.random()*.3);p.y+=vy*(.85+Math.random()*.3);p.a++;
    if(p.x<0||p.x>w||p.y<0||p.y>h||p.a>90){p.x=Math.random()*w;p.y=Math.random()*h;p.a=0;continue}
    const life=Math.sin(p.a/90*Math.PI);cx.strokeStyle=sat?`rgba(255,255,255,${pA*life})`:`rgba(19,35,63,${pA*life*.7})`;cx.lineWidth=1.4;
    cx.beginPath();cx.moveTo(ox-vx*6,oy-vy*6);cx.lineTo(p.x,p.y);cx.stroke()}
  requestAnimationFrame(step)})();

/* ---------- render ---------- */
function dateParts(d){const x=new Date(d+'T00:00:00Z');return{dow:DOW[x.getUTCDay()],day:x.getUTCDate(),mon:MON[x.getUTCMonth()]}}
function relLabel(d){const t=ymd(dubaiNow()),tm=ymd(new Date(dubaiNow().getTime()+864e5));const p=dateParts(d);
  return(d===t?'Today ':d===tm?'Tomorrow ':'')+`${p.dow[0]+p.dow.slice(1).toLowerCase()} ${p.day} ${p.mon[0]+p.mon.slice(1).toLowerCase()}`}
const groupPace=()=>parseFloat(RIDE.pace)||30;
function renderAll(){
  const p=dateParts(ST.date),sm=startMins(),has=hasWx(),pace=groupPace();
  $('hDow').textContent=p.dow;$('hDay').textContent=p.day;$('hMon').textContent=p.mon;
  const rl=relLabel(ST.date),soon=/^(Today|Tomorrow)/.test(rl)?rl.split(' ')[0]:'';
  $('hWhen').textContent=`${soon?soon+' · ':''}${clock(sm)}`;
  $('sPace').textContent=pace+' km/h';
  $('sDist').textContent=NET?(RIDE.distance||`${routeKm().toFixed(1)} km`):(CUM[CUM.length-1]/1000).toFixed(1)+' km';
  document.body.setAttribute('data-ride-date',ST.date);
  const rsvp=document.getElementById('rsvp');if(rsvp)rsvp.setAttribute('data-ride-date',ST.date);
  const g=sim('speed',pace,has);
  drawRoute(g);
  const w0=wxAt(sm);
  if(w0){$('wSpd').textContent=`${Math.round(w0.wind_speed_10m)} km/h`;$('wFrom').textContent=`from ${card(w0.wind_direction_10m)}`;$('wArr').style.transform=`rotate(${w0.wind_direction_10m}deg)`;setParticles(w0.wind_direction_10m,w0.wind_speed_10m)}
  else{$('wSpd').textContent='-- km/h';$('wFrom').textContent='forecast closer to the day';PT.length=0}
}
/* ---------- wire up ---------- */
document.querySelectorAll('#legSeg button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#legSeg button').forEach(x=>x.classList.toggle('on',x===b));ST.leg=b.dataset.l;if(SEG.length)drawRoute(sim('speed',groupPace(),hasWx()))});

(async function main(){
  try{if(NET)buildNet(await loadNet());else buildRoute(await loadGpx())}catch(e){const n=$('mapErr');if(n)n.hidden=false;return}
  if(LAT==null){const n=PTS.length;LAT=PTS.reduce((s,p)=>s+p[0],0)/n;LON=PTS.reduce((s,p)=>s+p[1],0)/n}
  initMap();renderAll();
  const fit=()=>{if(map)map.invalidateSize()};
  requestAnimationFrame(fit);window.addEventListener('load',fit);
  try{ST.wx=await loadWx()}catch(e){ST.wx=null}
  renderAll();
})();
})();
