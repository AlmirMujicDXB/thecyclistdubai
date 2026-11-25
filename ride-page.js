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
const POS=CFG.positions||[['Hoods',.36],['Drops / in the bunch',.32,1],['Aero bars',.27]];
const DRAFT=CFG.draft||[['Solo / on the front',1],['Sitting in (≈28% less drag)',.72,1]];
const opt=a=>a.map(o=>`<option value="${o[1]}"${o[2]?' selected':''}>${esc(o[0])}</option>`).join('');

/* ---------- markup (identical on every ride page) ---------- */
document.getElementById('app').innerHTML=`
<header class="top">
  <div class="hl"><a class="tcd-logo" href="./" title="Back to the TheCyclistDubai homepage" aria-label="Back to the TheCyclistDubai homepage"><i>‹</i><b>TheCyclist<span>Dubai</span></b><em>Homepage</em></a><div class="clock"><i></i><span id="clk">--:--</span> Dubai</div></div>
</header>
<section class="hero">
  <svg class="deco" viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 150 C120 190 220 90 330 130 S520 180 610 70" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/></svg>
  <div class="hrow">
    <div class="dtile"><span id="hDow">---</span><b id="hDay">--</b><span id="hMon">---</span></div>
    <div class="hmain">
      <div class="tags"><span class="tag l"><span class="tl">⛑️💡 ${esc(SITE.rideRule||'Lights & helmet mandatory')}</span><span class="ts">⛑️💡 Mandatory</span></span><span class="tag">${CFG.mtb?'🚵':'🚴'} ${esc(RIDE.type||'Road')}</span></div>
      <h1>${esc(RIDE.name)} · <span id="hTime">--</span> · ${esc(RIDE.place||'')}</h1>
      <div class="hsub"><span>📍 ${esc(RIDE.route||('Start '+START))}</span><span>🔁 Every ${esc(DAYN[RIDE.weekly]||'week')}</span><span id="hNext"></span></div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><small>Distance</small><b id="sDist">--</b><span class="stx" id="sDistN"></span></div>
    <div class="stat"><small>Climb</small><b id="sGain">--</b></div>
    <div class="stat"><small>${NET?'Trails':'Turn at'}</small><b id="sTurn">--</b></div>
    <div class="stat"><small>Pace</small><b id="sPace">--</b></div>
    <div class="stat"><small>Ride time</small><b id="sTime">--</b><span class="stx" id="sTimeN"></span></div>
    <div class="stat"><small>Back at</small><b id="sBack">--</b></div>
  </div>
  <div class="hbtns">
    ${RIDE.strava?`<a class="btn strava" href="${esc(RIDE.strava)}" target="_blank" rel="noopener"><svg class="slogo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>Join ride on Strava ↗</a>`:''}
    <button class="btn share" id="bShare" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>Share ride</button>
    <a class="btn ${RIDE.strava?'w wa':'join'}" href="${esc(WA)}" target="_blank" rel="noopener">TCD WhatsApp group ↗</a>
    ${RIDE.location?`<a class="btn w" href="${esc(RIDE.location)}" target="_blank" rel="noopener">Location ↗</a>`:''}
    ${CFG.gpx?`<a class="btn gpx" href="${esc(CFG.gpx)}" download="${esc(CFG.gpxName||CFG.gpx)}">⬇ Download GPX</a>`:''}
    ${CFG.stravaRoute?`<a class="btn w" href="${esc(CFG.stravaRoute)}" target="_blank" rel="noopener">Strava route ↗</a>`:''}
  </div>
</section>
<section class="sec">
  <div class="sech"><h2>🗓️ Plan for</h2><div class="sp"></div><span class="note" id="fcNote">Loading forecast…</span></div>
  <div class="secb when"><div class="chips" id="dChips"></div><label class="fld">Start <input type="time" id="tStart" value="06:30" step="300"></label></div>
</section>
<section class="sec">
  <div class="sech"><h2>🗺️ ${NET?'Trails':'Route'} &amp; wind <em id="mapWhen"></em></h2><div class="sp"></div>
    <div class="seg${NET?' hide':''}" id="legSeg"><button data-l="out" class="on">Way out</button><button data-l="back">Way back</button></div></div>
  <div class="mapbox">
    <div id="map"></div><canvas id="wind"></canvas>
    <div class="mapui">
      <div class="wbadge"><div class="warr" id="wArr">↓</div><div><b id="wSpd">-- km/h</b><small id="wFrom">wind from --</small></div></div>
      <div class="legend">${NET?'<span><i style="background:var(--head)"></i>Along the wind (head one way, tail the other)</span><span><i style="background:var(--cross)"></i>Crosswind</span>':'<span><i style="background:var(--head)"></i>Headwind</span><span><i style="background:var(--tail)"></i>Tailwind</span><span><i style="background:var(--cross)"></i>Crosswind</span>'}</div>
    </div>
    <div class="mapctl"><div class="seg" id="layerSeg"><button data-t="cycle" class="on">Map</button><button data-t="sat">Satellite</button></div></div>
    <div class="mhint" id="mhint">Use two fingers to move the map</div>
  </div>
  <div class="split">
    <div><small id="spOutL">${NET?'Into the wind':`Way out · ${esc(START)} → ${esc(CFG.turnShort||'turnaround')}`}</small><b id="spOut">--</b><div class="bar" id="barOut"></div></div>
    <div><small id="spBackL">${NET?'With the wind':`Way back · ${esc(CFG.turnShort||'turnaround')} → ${esc(START)}`}</small><b id="spBack">--</b><div class="bar" id="barBack"></div></div>
    <div><small>Wind on the ${NET?'trails':'route'}</small><b id="spWind">--</b><span class="note" id="spWindN" style="display:block"></span></div>
  </div>
</section>
<section class="sec">
  <div class="sech"><h2>🌤️ Weather on the ride <em id="wxWhen"></em></h2><div class="sp"></div><span class="note">Open-Meteo forecast for ${esc(RIDE.place||'the ride')}</span></div>
  <div class="secb">
    <div class="verdict"><div class="ring" id="vRing">--</div><div><b id="vTitle">Loading…</b><div class="note" id="vText"></div></div></div>
    <div class="wgrid" id="wGrid"></div>
    <div class="tblw"><table id="wTbl"></table></div>
  </div>
</section>
<section class="sec">
  <div class="sech"><h2>⚙️ Ride planner <em>· with the forecast wind ${NET?'on the trails':'along the route'}</em></h2></div>
  <div class="secb">
    <div class="pin2">
      <div class="seg" id="modeSeg"><button data-m="speed" class="on">Set speed</button><button data-m="power">Set power</button></div>
      <label class="fld" id="fSpeed">Speed <input type="number" id="inSpeed" value="${parseFloat(RIDE.pace)||30}" min="8" max="50" step="0.5"> km/h</label>
      <label class="fld hide" id="fPower">Power <input type="number" id="inPower" value="${CFG.mtb?170:200}" min="60" max="600" step="5"> W</label>
      <label class="fld${NET?'':' hide'}">Distance <input type="number" id="inDist" value="${CFG.defaultKm||20}" min="2" max="200" step="1"> km</label>
      <label class="fld">Rider <input type="number" id="inRider" value="75" min="35" max="150" step="1"> kg</label>
      <label class="fld">Bike <input type="number" id="inBike" value="${CFG.mtb?12:8.5}" min="5" max="25" step="0.5"> kg</label>
      <label class="fld">Position <select id="inPos">${opt(POS)}</select></label>
      <label class="fld">In group <select id="inDraft">${opt(DRAFT)}</select></label>
    </div>
    <div class="res" id="res"></div>
    <div class="two">
      <div class="card2"><h3>⚡ Power vs speed <span class="note">· average over the ${NET?'ride':'route'}</span></h3><svg class="chart" id="chPow"></svg></div>
      <div class="card2"><h3>⏱️ Speed vs time</h3><div class="tblw" style="margin-top:0"><table id="tSpd"></table></div></div>
    </div>
  </div>
</section>
<section class="sec">
  <div class="sech"><h2>👕 Kit &amp; 🍌 nutrition <em id="kitWhen"></em></h2></div>
  <div class="secb kit">
    <div><h3 style="margin:0 0 8px;font-size:13.5px">What to wear</h3><ul class="list" id="kit"></ul></div>
    <div><h3 style="margin:0 0 8px;font-size:13.5px">Fuel &amp; hydration</h3><ul class="list" id="fuel"></ul></div>
  </div>
</section>
<div class="rtoast" id="rToast"></div>
<div class="foot">Forecast: Open-Meteo · Map: © OpenStreetMap contributors, CyclOSM, Esri · Estimates use standard bike physics and are a guide only. <a href="disclaimer.html">Disclaimer</a> · <a href="./">← Back to TheCyclistDubai</a></div>`;

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
$('tStart').value=ST.start;

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
const routeKm=()=>NET?(+$('inDist').value||CFG.defaultKm||20):CUM[CUM.length-1]/1000;

/* ---------- weather ---------- */
const HV='temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,precipitation_probability,precipitation,cloud_cover,visibility,surface_pressure';
let LAT=CFG.lat,LON=CFG.lon;
async function loadWx(){const u=`https://api.open-meteo.com/v1/forecast?latitude=${LAT.toFixed(4)}&longitude=${LON.toFixed(4)}&hourly=${HV}&daily=sunrise,sunset&timezone=Asia%2FDubai&forecast_days=16&wind_speed_unit=kmh`;
  const j=await (await fetch(u)).json();if(!j.hourly)throw new Error('no data');const H={};j.hourly.time.forEach((t,i)=>{const o={};for(const k in j.hourly)o[k]=j.hourly[k][i];H[t]=o});
  const D={};(j.daily.time||[]).forEach((t,i)=>D[t]={sunrise:j.daily.sunrise[i],sunset:j.daily.sunset[i]});return{H,D}}
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
function rider(){return{m:(+$('inRider').value||75)+(+$('inBike').value||8.5),mr:+$('inRider').value||75,cda:(+$('inPos').value||.32)*(+$('inDraft').value||1)}}
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
function renderChips(){$('dChips').innerHTML=DATES.map(d=>`<button class="chip${d===ST.date?' on':''}" data-d="${d}">${relLabel(d)}<small>${ST.wx&&ST.wx.H[d+'T06:00']?'forecast ready':'forecast later'}</small></button>`).join('');
  $('dChips').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{ST.date=b.dataset.d;ST.start=timeFor(ST.date);$('tStart').value=ST.start;renderAll()})}
function kindBar(X){const t=X.len||1;return['head','tail','cross'].map(k=>`<i style="width:${X.k[k]/t*100}%;background:${KCOL[k]}"></i>`).join('')}
function score(w){if(!w)return null;let s=100;const f=w.apparent_temperature,ws=w.wind_speed_10m,g=w.wind_gusts_10m;
  s-=Math.max(0,ws-12)*1.6;s-=Math.max(0,g-30)*.8;s-=Math.max(0,f-30)*3;s-=Math.max(0,16-f)*2.5;s-=(w.precipitation_probability||0)*.4;s-=Math.max(0,(w.relative_humidity_2m||0)-80)*.4;return Math.max(5,Math.min(100,Math.round(s)))}
const groupPace=()=>parseFloat(RIDE.pace)||30;
function renderAll(){
  const p=dateParts(ST.date),sm=startMins(),has=hasWx(),pace=groupPace();
  $('hDow').textContent=p.dow;$('hDay').textContent=p.day;$('hMon').textContent=p.mon;
  $('hTime').textContent=clock(sm);const rl=relLabel(ST.date);$('hNext').textContent=/^(Today|Tomorrow)/.test(rl)?'📅 '+rl.split(' ')[0]:'';$('hNext').style.display=$('hNext').textContent?'':'none';
  $('sPace').textContent=pace+' km/h';
  if(NET){$('sDist').textContent=RIDE.distance||`${routeKm()} km`;$('sDistN').textContent=RIDE.distance?'':'set in the planner';$('sGain').textContent=CFG.gainText||'Rolling';$('sTurn').textContent=`${(NETLEN/1000).toFixed(1)} km`}
  else{$('sDist').textContent=(CUM[CUM.length-1]/1000).toFixed(1)+' km';$('sGain').textContent=Math.round(GAIN)+' m';$('sTurn').textContent=`${CFG.turnShort||'km'} · ${(CUM[TURN]/1000).toFixed(1)}`}
  renderChips();
  $('fcNote').textContent=has?'Forecast loaded for this ride':ST.wx?'Forecast not out yet for this date (16 days ahead): planner uses still air':'Forecast unavailable right now: planner uses still air';
  const g=sim('speed',pace,has),fin=sm+g.t/60+STOP;
  $('sTime').textContent=hm(g.t/60+STOP);$('sTimeN').textContent=STOP?`incl. ${STOP} min stop`:'';$('sBack').textContent=clock(fin).replace(/ (AM|PM)/,m=>m.toLowerCase());
  const when=`· ${relLabel(ST.date)} ${clock(sm)}`;$('mapWhen').textContent=when;$('wxWhen').textContent=when;$('kitWhen').textContent=when;
  drawRoute(g);
  const w0=wxAt(sm);
  if(w0){$('wSpd').textContent=`${Math.round(w0.wind_speed_10m)} km/h`;$('wFrom').textContent=`from ${card(w0.wind_direction_10m)} · gusts ${Math.round(w0.wind_gusts_10m)} km/h`;$('wArr').style.transform=`rotate(${w0.wind_direction_10m}deg)`;setParticles(w0.wind_direction_10m,w0.wind_speed_10m)}
  else{$('wSpd').textContent='-- km/h';$('wFrom').textContent='forecast closer to the day';PT.length=0}
  const leg=X=>X.t?(has?`${Math.round(X.E/X.t)} W at ${pace} km/h · ${hm(X.t/60)}`:`${hm(X.t/60)} at ${pace} km/h`):'--';
  $('spOut').textContent=leg(g.out);$('spBack').textContent=leg(g.back);$('barOut').innerHTML=has?kindBar(g.out):'';$('barBack').innerHTML=has?kindBar(g.back):'';
  if(has){const tot=g.out.len+g.back.len,hd=(g.out.k.head+g.back.k.head)/tot*100,tl=(g.out.k.tail+g.back.k.tail)/tot*100;
    $('spWind').textContent=`${Math.round(hd)}% head · ${Math.round(tl)}% tail`;
    const harder=g.out.t&&g.back.t&&g.out.E/g.out.t>g.back.E/g.back.t?(NET?'into-the-wind sections':'way out'):(NET?'with-the-wind sections':'way back');
    $('spWindN').textContent=NET?`Wind ${Math.round(w0.wind_speed_10m)} km/h from ${card(w0.wind_direction_10m)}: the ${harder} cost the most. Trees shelter parts of the trails.`:`The ${harder} is harder: save energy for it and take shorter turns on the front.`}
  else{$('spWind').textContent='--';$('spWindN').textContent='Wind shows when the forecast is out.'}
  renderWx(g);renderPlan();renderKit(g);
}
function renderWx(g){const sm=startMins(),em=sm+g.t/60+STOP,w=wxAt(sm),wm=wxAt((sm+em)/2),we=wxAt(em);
  if(!w){$('vRing').textContent='--';$('vRing').style.background='#eee';$('vTitle').textContent='Forecast comes closer to the day';$('vText').textContent='Open-Meteo forecasts 16 days ahead. Pick an earlier date or check back later.';$('wGrid').innerHTML='';$('wTbl').innerHTML='';return}
  const sc=score(wm||w),col=sc>=80?'#16a34a':sc>=60?'#65a30d':sc>=40?'#eab308':'#dc2626';
  $('vRing').textContent=sc;$('vRing').style.background=`conic-gradient(${col} ${sc*3.6}deg,var(--bd) 0)`;$('vRing').style.boxShadow='inset 0 0 0 7px #fff';
  $('vTitle').textContent=sc>=80?`Great morning for the ${RIDE.name}`:sc>=60?'Good conditions, a bit of work in the wind':sc>=40?'Tough: wind or heat will bite':'Hard conditions: ride safe, consider a shorter route';
  const day=ST.wx.D[ST.date]||{},sr=day.sunrise?day.sunrise.slice(11,16):'--';
  $('vText').textContent=`Wind ${Math.round(w.wind_speed_10m)}→${Math.round(we?we.wind_speed_10m:w.wind_speed_10m)} km/h from ${card(w.wind_direction_10m)} · ${Math.round(w.temperature_2m)}→${Math.round(we?we.temperature_2m:w.temperature_2m)}°C during the ride · sunrise ${sr}`+(sr!=='--'&&ST.start<sr?' (you start before sunrise: lights on)':'');
  const maxOf=k=>{let m=-1e9;for(let t=sm;t<=em;t+=15){const x=wxAt(t);if(x&&x[k]>m)m=x[k]}return m};
  const cells=[['Temperature',`${Math.round(w.temperature_2m)}°C`,`→ ${Math.round(we?we.temperature_2m:w.temperature_2m)}°C at the finish`],
    ['Feels like',`${Math.round(w.apparent_temperature)}°C`,`max ${Math.round(maxOf('apparent_temperature'))}°C`],
    ['Wind',`${Math.round(w.wind_speed_10m)} km/h`,`from ${card(w.wind_direction_10m)} (${Math.round(w.wind_direction_10m)}°)`],
    ['Gusts',`${Math.round(maxOf('wind_gusts_10m'))} km/h`,'max during the ride'],
    ['Humidity',`${Math.round(w.relative_humidity_2m)}%`,`dew point ${Math.round(w.dew_point_2m)}°C`],
    ['UV index',`${maxOf('uv_index').toFixed(1)}`,'max during the ride'],
    ['Rain chance',`${Math.round(maxOf('precipitation_probability'))}%`,`${(w.precipitation||0).toFixed(1)} mm/h`],
    ['Cloud',`${Math.round(w.cloud_cover)}%`,w.cloud_cover<20?'clear sky':w.cloud_cover<60?'partly cloudy':'cloudy'],
    ['Visibility',`${(w.visibility/1000).toFixed(1)} km`,w.visibility<5000?'hazy: be visible':'good'],
    ['Pressure',`${Math.round(w.surface_pressure)} hPa`,'at ground level'],
    ['Sunrise',sr,`sunset ${day.sunset?day.sunset.slice(11,16):'--'}`],
    ['Air density',`${(101325*Math.exp(-(CFG.elev||60)/8434)/(287.05*(w.temperature_2m+273.15))).toFixed(3)}`,'kg/m³ (lower = faster)']];
  $('wGrid').innerHTML=cells.map(c=>`<div class="wc"><small>${c[0]}</small><b>${c[1]}</b><span>${c[2]}</span></div>`).join('');
  const h0=Math.floor(sm/60)-1,h1=Math.ceil(em/60)+1;let rows='';
  for(let h=h0;h<=h1;h++){const x=wxAt(h*60);if(!x)continue;const on=h*60>=Math.floor(sm/60)*60&&h*60<=em;
    rows+=`<tr class="${on?'on':''}"><td><b>${pad(h)}:00</b>${on?(CFG.mtb?' 🚵':' 🚴'):''}</td><td>${x.temperature_2m.toFixed(1)}°</td><td>${Math.round(x.apparent_temperature)}°</td><td>${Math.round(x.relative_humidity_2m)}%</td><td>${Math.round(x.dew_point_2m)}°</td><td><span class="da" style="display:inline-block;transform:rotate(${x.wind_direction_10m+180}deg)">↑</span> ${card(x.wind_direction_10m)}</td><td><b>${Math.round(x.wind_speed_10m)}</b></td><td>${Math.round(x.wind_gusts_10m)}</td><td>${Math.round(x.precipitation_probability||0)}%</td><td>${x.uv_index.toFixed(1)}</td><td>${Math.round(x.cloud_cover)}%</td><td>${(x.visibility/1000).toFixed(0)} km</td><td>${Math.round(x.surface_pressure)}</td></tr>`}
  $('wTbl').innerHTML=`<thead><tr><th>Time</th><th>Temp</th><th>Feels</th><th>Hum.</th><th>Dew</th><th>Wind from</th><th>km/h</th><th>Gust</th><th>Rain</th><th>UV</th><th>Cloud</th><th>Vis.</th><th>hPa</th></tr></thead><tbody>${rows}</tbody>`}

function renderPlan(){const has=hasWx(),r=rider(),sm=startMins(),pace=groupPace();
  const cur=still=>ST.mode==='speed'?sim('speed',+$('inSpeed').value||pace,!still&&has,r):sim('power',+$('inPower').value||200,!still&&has,r);
  const res=cur(false),fin=sm+res.t/60+STOP,kcal=res.E/1000/(4.184*.24);
  const legs=NET?['into wind','with wind']:['out','back'];
  $('res').innerHTML=`<div><small>Back at ${NET?'the start':esc(START)}</small><b>${clock(fin)}</b><span>${hm(res.t/60)} riding${STOP?` + ${STOP} min stop at ${esc(TURN_NAME)}`:''} · ${res.km.toFixed(1)} km</span></div>
    <div><small>Average speed</small><b>${res.v.toFixed(1)} <small style="display:inline">km/h</small></b><span>${ST.mode==='power'?'from the power you set':'speed you set'}</span></div>
    <div><small>Average power</small><b>${Math.round(res.P)} W</b><span>${(res.P/r.mr).toFixed(2)} W/kg</span></div>
    <div><small>${NET?'Into / with the wind':'Way out / back'}</small><b>${res.out.t&&res.back.t?`${Math.round(res.out.E/res.out.t)} / ${Math.round(res.back.E/res.back.t)} W`:'--'}</b><span>${legs.join(' / ')}</span></div>
    <div><small>Energy</small><b>${Math.round(kcal/10)*10} kcal</b><span>${Math.round(res.E/1000)} kJ of work</span></div>
    <div><small>Wind cost</small><b>${has?(()=>{const s=cur(true);return ST.mode==='speed'?`${res.P-s.P>=0?'+':''}${Math.round(res.P-s.P)} W`:`${res.t-s.t>=0?'+':''}${Math.round((res.t-s.t)/60)} min`})():'--'}</b><span>vs. still air</span></div>`;
  let rows='';const lo=Math.max(8,Math.round(pace)-6),hi=Math.round(pace)+6;
  for(let v=lo;v<=hi;v+=1){const s=sim('speed',v,has,r),f=sm+s.t/60+STOP;
    rows+=`<tr class="${v===Math.round(pace)?'on':''}"><td><b>${v} km/h</b>${v===Math.round(pace)?' · group':''}</td><td>${hm(s.t/60)}</td><td>${clock(f)}</td><td>${Math.round(s.P)} W</td><td>${(s.P/r.mr).toFixed(1)}</td><td>${Math.round(s.E/1000/(4.184*.24)/10)*10}</td></tr>`}
  $('tSpd').innerHTML=`<thead><tr><th>Avg speed</th><th>Riding</th><th>Back at${STOP?` (+${STOP} min stop)`:''}</th><th>Power</th><th>W/kg</th><th>kcal</th></tr></thead><tbody>${rows}</tbody>`;
  drawChart(r,has,res)}
function drawChart(r,has,res){const svg=$('chPow'),W=svg.clientWidth||520,H=240,pl=44,pr=12,pt=12,pb=32;svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const P0=CFG.mtb?80:100,P1=CFG.mtb?320:360,Ps=[];for(let P=P0;P<=P1;P+=20)Ps.push(P);
  const wv=Ps.map(P=>sim('power',P,has,r).v),sv=Ps.map(P=>sim('power',P,false,r).v);
  const vmin=Math.floor(Math.min(...wv,...sv)-1),vmax=Math.ceil(Math.max(...wv,...sv)+1);
  const X=P=>pl+(P-P0)/(P1-P0)*(W-pl-pr),Y=v=>pt+(vmax-v)/(vmax-vmin)*(H-pt-pb);
  let g='';for(let v=Math.ceil(vmin/2)*2;v<=vmax;v+=2)g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${PC('--bd2')}"/><text x="${pl-6}" y="${Y(v)+4}" font-size="10.5" text-anchor="end" fill="#5b6b80">${v}</text>`;
  for(let P=P0;P<=P1;P+=40)g+=`<text x="${X(P)}" y="${H-12}" font-size="10.5" text-anchor="middle" fill="#5b6b80">${P} W</text>`;
  const line=(a,c,dash)=>`<polyline fill="none" stroke="${c}" stroke-width="2.6" ${dash?'stroke-dasharray="5 5"':''} points="${Ps.map((P,i)=>X(P)+','+Y(a[i])).join(' ')}"/>`;
  g+=line(sv,'#94a3b8',true)+line(wv,PC('--p2'));
  const pace=groupPace();if(pace>vmin&&pace<vmax)g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(pace)}" y2="${Y(pace)}" stroke="#e11d48" stroke-dasharray="3 4"/><text x="${W-pr}" y="${Y(pace)-5}" font-size="10.5" text-anchor="end" fill="#e11d48" font-weight="700">group pace ${pace} km/h</text>`;
  if(res&&res.P>=P0&&res.P<=P1)g+=`<circle cx="${X(res.P)}" cy="${Y(res.v)}" r="5.5" fill="#fff" stroke="${PC('--p1')}" stroke-width="3"/>`;
  g+=`<text x="${pl}" y="${pt+2}" font-size="10.5" fill="#5b6b80" dy="8">km/h</text><g font-size="11" font-weight="700"><rect x="${pl+40}" y="${pt}" width="12" height="3" fill="${PC('--p2')}" rx="1.5"/><text x="${pl+56}" y="${pt+5}" fill="#13233f">${has?'with forecast wind':'still air (no forecast yet)'}</text>${has?`<rect x="${pl+200}" y="${pt}" width="12" height="3" fill="#94a3b8" rx="1.5"/><text x="${pl+216}" y="${pt+5}" fill="#13233f">still air</text>`:''}</g>`;
  svg.innerHTML=g}

function renderKit(g){const sm=startMins(),em=sm+g.t/60+STOP,w=wxAt(sm),we=wxAt(em);const K=[],F=[];
  const fs=w?w.apparent_temperature:24,fe=we?we.apparent_temperature:fs,ws=w?w.wind_speed_10m:10,uv=w?Math.max(w.uv_index,we?we.uv_index:0):5,rain=w?w.precipitation_probability:0,hum=w?w.relative_humidity_2m:60;
  const day=ST.wx&&ST.wx.D[ST.date],sr=day&&day.sunrise?day.sunrise.slice(11,16):null;
  const add=(Lst,i,b,s)=>Lst.push(`<li><i>${i}</i><div><b>${b}</b><span>${s}</span></div></li>`);
  if(!w)add(K,'ℹ️','Forecast comes closer to the day','Guide below is for a typical Dubai winter morning (~24°C).');
  if(fs<16)add(K,'🧥','Long-sleeve thermal jersey + gilet',`Feels ${Math.round(fs)}°C at the start. Full gloves, knee warmers.`);
  else if(fs<20)add(K,'🧤','Short sleeves + arm warmers + gilet',`Feels ${Math.round(fs)}°C at the start, ${Math.round(fe)}°C at the finish: pocket them ${NET?'once warm':'after the turnaround'}.`);
  else if(fs<27)add(K,'👕',CFG.mtb?'Short-sleeve jersey + padded shorts':'Short-sleeve jersey + bib shorts',`Feels ${Math.round(fs)}→${Math.round(fe)}°C.${ws>20&&!CFG.mtb?' A light gilet for the windy way out.':''}`);
  else if(fs<32)add(K,'🌬️','Light, breathable kit',`Feels ${Math.round(fs)}→${Math.round(fe)}°C. Mesh base layer, sweat cap under the helmet.`);
  else add(K,'🔥','Lightest kit, light colours',`Feels up to ${Math.round(fe)}°C. Ice sock / cooling sleeves, start well hydrated.`);
  add(K,'💡',CFG.mtb?'Helmet, front + rear lights':'Front + rear lights, helmet',sr&&ST.start<sr?`Mandatory, and you start before sunrise (${sr}).`:'Mandatory on every TheCyclistDubai ride.');
  if(CFG.mtb)add(K,'🧤','Full-finger MTB gloves + clear/tinted glasses','Sand, branches and dust on the trails.');
  if(uv>=6)add(K,'🧴','Sunscreen SPF 50 + tinted lenses',`UV reaches ${uv.toFixed(0)} before you finish.`);else if(!CFG.mtb)add(K,'🕶️',sr&&ST.start<sr?'Clear or photochromic lenses':'Tinted lenses','Desert dust and low sun.');
  if(!CFG.mtb&&(ws>=25||(w&&w.wind_gusts_10m>=35)))add(K,'🛞','Shallower wheels if you have them',`Gusts to ${Math.round(w.wind_gusts_10m)} km/h across open desert.`);
  if(rain>=40)add(K,'🌧️','Packable rain cape',`${Math.round(rain)}% chance of rain.`);
  add(K,'🧰',CFG.mtb?'Tubeless plugs, pump, multi-tool, phone':'Spare tube, CO₂/pump, levers, ID, phone',CFG.toolsNote||'Be self-sufficient on the ride.');
  const h=g.t/3600,kcal=g.E/1000/(4.184*.24),T=w?(w.temperature_2m+(we?we.temperature_2m:w.temperature_2m))/2:24;
  const carbs=h<1.25?30:h<2?50:h<2.5?60:75,fl=T<22?0.5:T<27?0.65:T<32?0.85:1.05,flH=hum>70?fl+0.1:fl,Lt=flH*h,bottles=Math.max(1,Math.ceil(Lt/0.75));
  add(F,'🥣','Breakfast 1.5–2 h before',`By about ${clock(sm-105)}: oats, toast + honey, banana (1–2 g carbs per kg). Up early? A banana or bar 30 min before works too.`);
  add(F,'🍌',`${carbs} g carbs per hour · ≈ ${Math.max(5,Math.round(carbs*h/5)*5)} g in total`,`${hm(h*60)} at the group pace, ≈ ${Math.round(kcal/10)*10} kcal burned. ${h<1.25?'A gel or bar is enough.':'Bars, gels or chews: start eating after 30–40 min.'}`);
  add(F,'💧',`${bottles} × 750 ml bottle${bottles>1?'s':''} (≈ ${Lt.toFixed(1)} L)`,`≈ ${flH.toFixed(2)} L per hour at ${Math.round(T)}°C${hum>70?` and ${Math.round(hum)}% humidity`:''}. Sip every 10–15 min.`);
  add(F,'🧂',T>=27||hum>=70?'Electrolytes in every bottle':'Electrolytes in one bottle',T>=27||hum>=70?'500–800 mg sodium per litre: humid, sweaty morning.':'300–500 mg sodium per litre is enough.');
  if(!NET)add(F,TURN_ICON,`${STOP?STOP+'-min break':'Turnaround'} at ${TURN_NAME}`,`km ${(CUM[TURN]/1000).toFixed(1)}${STOP?`, ≈ ${clock(sm+g.out.t/60)}`:''}: regroup, eat something and drink before the way back.`);
  add(F,'🥤','After the ride',`Within 30 min: carbs + 20–30 g protein (chocolate milk, a sandwich, a smoothie${CFG.cafe?` at ${CFG.cafe}`:''}).`);
  $('kit').innerHTML=K.join('');$('fuel').innerHTML=F.join('')}

/* ---------- share (same message + image as the ride's card on the homepage; share-core.js) ---------- */
function toast(m){const t=$('rToast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),3200)}
function shareForecast(r){if(!ST.wx)return null;const sh=+r.time.slice(0,2),hs=[];
  for(let h=sh;h<=sh+3;h++){const k=`${r.occ}T${pad(h)}:00`,x=ST.wx.H[k];if(x)hs.push(x)}
  if(!hs.length)return null;
  const lo=Math.round(Math.min(...hs.map(h=>h.temperature_2m))),hi=Math.round(Math.max(...hs.map(h=>h.temperature_2m))),w=hs.reduce((a,h)=>a+h.wind_speed_10m,0)/hs.length,
    sc=Math.round(hs.reduce((a,h)=>a+score(h),0)/hs.length),dir=card(hs[Math.floor(hs.length/2)].wind_direction_10m),lab=TCDS.scoreLabel(sc),tr=lo===hi?`${lo}°C`:`${lo}–${hi}°C`;
  return{tr,w,dir,sc,lab,txt:`${tr}, wind ${Math.round(w)} km/h ${dir}, ride score ${sc} (${lab})`}}
async function shareRide(){if(!window.TCDS){toast('Sharing is not available right now');return}
  const ov=(RIDE.changes&&RIDE.changes[ST.date])||{},r={...RIDE,...ov,occ:ST.date,time:ov.time||RIDE.time};
  const f=shareForecast(r),text=TCDS.rideText(r,f),file=TCDS.canvasFile(TCDS.rideImage(r,f,ST.wx&&ST.wx.H?ST.wx:null),'thecyclistdubai-ride.png');
  try{navigator.clipboard.writeText(text).catch(()=>{})}catch(e){}
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text,title:r.name});toast('Shared ✔ Text also copied, paste it if WhatsApp drops it');return}
    if(navigator.share){await navigator.share({text,title:r.name});return}}
  catch(e){if(e.name==='AbortError')return}
  window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');toast('Opening WhatsApp · text copied')}
$('bShare').onclick=shareRide;

/* ---------- wire up ---------- */
document.querySelectorAll('#legSeg button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#legSeg button').forEach(x=>x.classList.toggle('on',x===b));ST.leg=b.dataset.l;drawRoute(sim('speed',groupPace(),hasWx()))});
document.querySelectorAll('#modeSeg button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#modeSeg button').forEach(x=>x.classList.toggle('on',x===b));ST.mode=b.dataset.m;
  $('fSpeed').classList.toggle('hide',ST.mode!=='speed');$('fPower').classList.toggle('hide',ST.mode!=='power');renderPlan()});
['inSpeed','inPower','inRider','inBike','inPos','inDraft'].forEach(id=>$(id).addEventListener('input',()=>{if(SEG.length)renderPlan()}));
$('inDist').addEventListener('input',()=>{if(SEG.length)renderAll()});
$('tStart').addEventListener('change',()=>{if(/^\d\d:\d\d$/.test($('tStart').value)){ST.start=$('tStart').value;renderAll()}});
(function tick(){const n=dubaiNow();$('clk').textContent=`${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}`;setTimeout(tick,15000)})();
window.addEventListener('resize',()=>{if(SEG.length)drawChart(rider(),hasWx(),null)});

(async function main(){
  try{if(NET)buildNet(await loadNet());else buildRoute(await loadGpx())}catch(e){$('fcNote').textContent='Route could not be loaded.';return}
  if(LAT==null){const n=PTS.length;LAT=PTS.reduce((s,p)=>s+p[0],0)/n;LON=PTS.reduce((s,p)=>s+p[1],0)/n}
  initMap();renderAll();
  try{ST.wx=await loadWx()}catch(e){ST.wx=null}
  renderAll();
})();
})();
