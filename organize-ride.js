/* TheCyclistDubai · ride organizer (organize-ride.html)
   Visitors fill in their ride; the page draws the same ride card as TheCyclistDubai's own rides (share-core.js)
   plus a weather card for the ride window (Open-Meteo), and shares both images with a WhatsApp-ready message
   that links to thecyclistdubai.com and lists the recommended events from site-data.js.
   Ready routes (route-presets.js, the owner's Strava GPX routes): a swipe/arrow carousel; picking one fills the form,
   draws the route on the map coloured by the forecast wind (head/tail/cross at the time you reach each part),
   and adds a third share image (route card) + Strava/GPX links to the message. */
(function(){
const $=id=>document.getElementById(id);
const SITE=window.SITE||{};
const pad=n=>String(n).padStart(2,'0');
const rad=Math.PI/180;
const CARD=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const card=d=>CARD[Math.round(((d%360)+360)%360/22.5)%16];
const TRACKS=[
  {id:'alqudra',name:'Al Qudra Cycle Track',place:'Al Qudra',start:'BOTS',lat:24.93,lon:55.33,elev:55},
  {id:'meydan',name:'Meydan · Nad Al Sheba Cycle Park',place:'Meydan',start:'Nad Al Sheba Cycle Park',lat:25.1487,lon:55.2864,elev:10},
  {id:'mushrif',name:'Mushrif National Park',place:'Mushrif Park',start:'MTB Park entrance',lat:25.219,lon:55.456,elev:25},
  {id:'kite',name:'Kite Beach · Jumeirah',place:'Kite Beach',start:'Kite Beach',lat:25.1626,lon:55.207,elev:3},
  {id:'hatta',name:'Hatta MTB Trail Centre',place:'Hatta',start:'Hatta Wadi Hub',lat:24.803,lon:56.126,elev:330},
  {id:'other',name:'Other place in Dubai',place:'Dubai',start:'',lat:25.20,lon:55.27,elev:10},
];
const COLORS=[['jaune','#ffe100','Maillot jaune · Tour de France'],['vert','#00a650','Maillot vert · Tour de France'],['pois','radial-gradient(circle,#e2001a 0 3px,transparent 3.6px) 0 0/12px 12px,radial-gradient(circle,#e2001a 0 3px,transparent 3.6px) 6px 6px/12px 12px,#fff','Maillot à pois · Tour de France'],['blanc','linear-gradient(135deg,#fff,#e9edf2)','Maillot blanc · Tour de France'],['rosa','linear-gradient(135deg,#ffd9e8,#f472b6)','Maglia rosa · Giro d\'Italia'],['roja','linear-gradient(135deg,#9e001d,#ff2d55)','La Roja · La Vuelta']];
const KCOL={head:'#dc2626',tail:'#16a34a',cross:'#eab308'};
const hav=(a,b)=>{const p1=a[0]*rad,p2=b[0]*rad,dp=p2-p1,dl=(b[1]-a[1])*rad;return 2*6371e3*Math.asin(Math.sqrt(Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2))};
const brg=(a,b)=>{const p1=a[0]*rad,p2=b[0]*rad,dl=(b[1]-a[1])*rad;return(Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))/rad+360)%360};
// loops come in both directions: the GPX's own direction (Strava route) + the reversed one (own GPX, no Strava link)
const DIRN={cw:'Clockwise',ccw:'Anticlockwise'},DIRI={cw:'↻',ccw:'↺'};
const mkRoute=(p,pts)=>{const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+hav(pts[i-1],pts[i]));
  let ti=0;if(p.turn){let best=0;pts.forEach((q,i)=>{const d=hav(pts[0],q);if(d>best){best=d;ti=i}})}return Object.assign({},p,{pts,cum,ti})};
const PRE=(window.ROUTE_PRESETS||[]).map(p=>{const a=mkRoute(p,p.pts);if(p.dir){a.alt=Object.assign(mkRoute(p,p.pts.slice().reverse()),{dir:p.dir==='cw'?'ccw':'cw',gpx:p.gpxAlt,strava:null,alt:a})}return a});
let DIRP={};try{DIRP=(JSON.parse(localStorage.getItem('tcd_org')||'null')||{}).dirPref||{}}catch(e){}
const variant=p=>p.dir&&DIRP[p.id]&&DIRP[p.id]!==p.dir?p.alt:p;
// positions (point index, bearing) at given fractions of the route, for direction arrows
function arrowsAt(p,fr){const L=p.cum[p.cum.length-1];return fr.map(f=>{let i=p.cum.findIndex(c=>c>=f*L);i=Math.max(1,Math.min(p.pts.length-1,i));return[i,brg(p.pts[i-1],p.pts[i])]})}
// fit lat/lon points into a box (keeps the shape: longitude scaled by cos(latitude))
function fitter(pts,x,y,w,h,pd){const k=Math.cos(pts[0][0]*rad);let a=1e9,b=-1e9,c=1e9,d=-1e9;pts.forEach(q=>{const X=q[1]*k,Y=q[0];a=Math.min(a,X);b=Math.max(b,X);c=Math.min(c,Y);d=Math.max(d,Y)});
  const sc=Math.min((w-2*pd)/((b-a)||1e-6),(h-2*pd)/((d-c)||1e-6)),ox=x+(w-(b-a)*sc)/2,oy=y+(h-(d-c)*sc)/2;return q=>[ox+(q[1]*k-a)*sc,oy+(d-q[0])*sc]}
const fmtDur=m=>`${Math.floor(m/60)}h ${pad(Math.round(m%60))}m`;
const paceKmh=()=>{const v=parseFloat($('fPace').value);return v>5&&v<60?v:28};

/* ---------- form ---------- */
$('fTrack').innerHTML=TRACKS.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
$('fColor').innerHTML=COLORS.map(c=>`<button type="button" data-c="${c[0]}" style="background:${c[1]}" title="${c[2]}" aria-label="${c[2]}"></button>`).join('');
const dubai=()=>new Date(Date.now()+4*3600e3);
const ymd=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
function nextSat(){const d=dubai();let k=(6-d.getUTCDay()+7)%7;if(k===0&&d.getUTCHours()>=6)k=7;return ymd(new Date(d.getTime()+k*864e5))}
const FIELDS=['fName','fDate','fTime','fTrack','fStart','fRoute','fType','fDist','fPace','fOrg','fJoin','fNotes'];
let color='jaune';
try{const sv=JSON.parse(localStorage.getItem('tcd_org')||'null');if(sv){FIELDS.forEach(k=>{if(sv[k]!=null)$(k).value=sv[k]});$('fRule').checked=sv.fRule!==false;color=sv.colorPicked&&COLORS.some(x=>x[0]===sv.color)?sv.color:color}}catch(e){}
if(!$('fName').value)$('fName').value='Saturday Coffee Ride';
if(!$('fDate').value||$('fDate').value<ymd(dubai()))$('fDate').value=nextSat();
$('fDate').min=ymd(dubai());
if(!$('fStart').value)$('fStart').value=TRACKS[0].start;
const TR=()=>TRACKS.find(t=>t.id===$('fTrack').value)||TRACKS[0];
function setColor(c){color=c;document.querySelectorAll('#fColor button').forEach(b=>b.classList.toggle('on',b.dataset.c===c))}
setColor(color);
let colorPicked=false;try{colorPicked=!!(JSON.parse(localStorage.getItem('tcd_org')||'null')||{}).colorPicked}catch(e){}
document.querySelectorAll('#fColor button').forEach(b=>b.onclick=()=>{colorPicked=true;setColor(b.dataset.c);update()});
let lastTrack=$('fTrack').value;
$('fTrack').addEventListener('change',()=>{const old=TRACKS.find(t=>t.id===lastTrack);if(!$('fStart').value||(old&&$('fStart').value===old.start))$('fStart').value=TR().start;lastTrack=$('fTrack').value;loadWx().then(update)});
FIELDS.concat(['fRule']).forEach(k=>$(k).addEventListener('input',()=>{clearTimeout(window._u);window._u=setTimeout(update,180)}));
$('fDate').addEventListener('change',update);$('fTime').addEventListener('change',update);

/* ---------- ready routes carousel ---------- */
let preset=null,nameAuto=true,curSlide=-1,fitFor=null;
try{const sv=JSON.parse(localStorage.getItem('tcd_org')||'null');if(sv&&sv.nameAuto===false)nameAuto=false}catch(e){}
function shapeSvg(p,W,H){const P=fitter(p.pts,0,0,W,H,18),xy=p.pts.map(P),d='M'+xy.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L'),s=xy[0];
  const t=p.turn?xy[p.ti]:null,arr=p.dir?arrowsAt(p,[.22,.5,.78]).map(([i,b])=>`<path d="M0 -7L6 5L-6 5Z" transform="translate(${xy[i][0].toFixed(1)} ${xy[i][1].toFixed(1)}) rotate(${b.toFixed(0)})" fill="#242428" stroke="#fff" stroke-width="1.5"/>`).join(''):'';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${d}" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fc4c02" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>`+
    arr+(t?`<circle cx="${t[0]}" cy="${t[1]}" r="7" fill="#13233f" stroke="#fff" stroke-width="2.5"/>`:'')+`<circle cx="${s[0]}" cy="${s[1]}" r="8" fill="#16a34a" stroke="#fff" stroke-width="3"/></svg>`}
function elevSvg(p){const W=400,H=34,e=p.pts.map(q=>q[2]),lo=Math.min(...e)-3,hi=Math.max(...e)+3,L=p.cum[p.cum.length-1];
  const xy=p.pts.map((q,i)=>[(p.cum[i]/L*W).toFixed(1),(H-(q[2]-lo)/(hi-lo)*H).toFixed(1)]);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 ${H}L${xy.map(q=>q.join(' ')).join('L')}L${W} ${H}Z" fill="#fc4c021f"/><path d="M${xy.map(q=>q.join(' ')).join('L')}" fill="none" stroke="#fc4c02" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`}
const estTime=km=>fmtDur(km/paceKmh()*60);
const slideInner=(p,i)=>`<div class="rshape">${shapeSvg(p,300,184)}</div><div class="rinfo">
    <div class="rtags"><span class="k">${p.kind}</span><span>Al Qudra</span><span>Start: ${p.start}</span>${i===0?'<span>TCD Ride route</span>':p.id==='mosque'?'<span>Purple Ride route</span>':''}</div>
    <h3>${p.name}</h3><p>${p.desc}</p>
    <div class="rfacts"><div><small>Distance</small><b>${p.km} km</b></div><div><small>Climb</small><b>${p.gain} m</b></div><div><small>${p.turn?'Turn at':'Direction'}</small><b>${p.turn?`${p.turn} · ${p.turnKm}`:`${DIRI[p.dir]} ${DIRN[p.dir]}`}</b></div><div><small>Ride time</small><b class="et" data-km="${p.km}">${estTime(p.km)}</b></div></div>
    ${p.dir?`<div class="dirseg" role="group" aria-label="Loop direction">${['cw','ccw'].map(d=>`<button type="button" data-d="${d}" class="${d===p.dir?'on':''}">${DIRI[d]} ${DIRN[d]}</button>`).join('')}</div>`:`<div class="relev">${elevSvg(p)}</div>`}</div>`;
$('rcView').innerHTML=PRE.map((p,i)=>`<div class="rslide" data-i="${i}">${slideInner(variant(p),i)}</div>`).join('')+
  `<div class="rslide custom" data-i="${PRE.length}"><div class="rshape">✏️</div><div class="rinfo"><div class="rtags"><span class="k">Custom</span><span>Any track in Dubai</span></div>
    <h3>Your own route</h3><p>Al Qudra, Meydan, Mushrif, Kite Beach, Hatta or anywhere else: pick the track, start point, route and distance yourself in the form below.</p>
    <div class="rfacts"><div><small>Tracks</small><b>5 + other</b></div><div><small>Forecast</small><b>16 days</b></div><div><small>Share</small><b>1 image</b></div><div><small>Time</small><b>1 minute</b></div></div></div></div>`;
$('rcDots').innerHTML=PRE.concat([0]).map(()=>'<i></i>').join('');
const NS=PRE.length+1,view=$('rcView');
view.addEventListener('click',e=>{const b=e.target.closest('.dirseg button');if(!b)return;const sl=b.closest('.rslide'),i=+sl.dataset.i,p=PRE[i];DIRP[p.id]=b.dataset.d;
  sl.innerHTML=slideInner(variant(p),i);if(i===curSlide){curSlide=-1;selectSlide(i)}});
function goSlide(i,smooth=true){i=Math.max(0,Math.min(NS-1,i));view.style.scrollBehavior=smooth?'smooth':'auto';view.scrollLeft=i*view.clientWidth;if(!smooth)setTimeout(()=>view.style.scrollBehavior='',0);selectSlide(i)}
function selectSlide(i){if(i===curSlide)return;curSlide=i;
  document.querySelectorAll('#rcDots i').forEach((d,k)=>d.classList.toggle('on',k===i));$('rcPrev').disabled=i===0;$('rcNext').disabled=i===NS-1;
  $('rcCount').textContent=i<PRE.length?`Route ${i+1} of ${PRE.length} · swipe or use the arrows`:'Custom route';
  preset=i<PRE.length?variant(PRE[i]):null;
  if(preset){$('fTrack').value='alqudra';lastTrack='alqudra';$('fStart').value=preset.start;$('fRoute').value=preset.dir?`${preset.name} · ${DIRN[preset.dir].toLowerCase()}`:preset.name;$('fDist').value=preset.km;$('fType').value='Road';
    if(nameAuto)$('fName').value=`${preset.short} Ride`;
    $('autoNote').innerHTML=`✨ Auto-filled from <b>${preset.name}</b>${preset.dir?` (${DIRN[preset.dir].toLowerCase()})`:''}: Al Qudra · start ${preset.start} · ${preset.km} km · ${preset.gain} m climb. Just set the date &amp; time (edit anything below if you like).`}
  else $('autoNote').innerHTML='';
  loadWx().then(update)}
let scT;view.addEventListener('scroll',()=>{clearTimeout(scT);scT=setTimeout(()=>selectSlide(Math.round(view.scrollLeft/Math.max(1,view.clientWidth))),110)},{passive:true});
$('fTrack').addEventListener('change',()=>{if(preset&&$('fTrack').value!=='alqudra')goSlide(NS-1)});
$('rcPrev').onclick=()=>goSlide(curSlide-1);$('rcNext').onclick=()=>goSlide(curSlide+1);
addEventListener('resize',()=>{view.style.scrollBehavior='auto';view.scrollLeft=curSlide*view.clientWidth;view.style.scrollBehavior=''});
$('fName').addEventListener('input',()=>{nameAuto=!$('fName').value.trim()});
$('fPace').addEventListener('input',()=>document.querySelectorAll('.rslide .et').forEach(b=>b.textContent=estTime(+b.dataset.km)));

/* ---------- map ---------- */
let map=null,lay=null;
try{if(window.L&&L.map){map=L.map('map',{zoomControl:true,attributionControl:true});
  L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',{maxZoom:20,attribution:'CyclOSM · © OpenStreetMap contributors'}).addTo(map);lay=L.layerGroup().addTo(map);
  if(matchMedia('(pointer:coarse)').matches){map.dragging.disable();if(map.tap)map.tap.disable();let tm;$('map').addEventListener('touchmove',e=>{const h=$('mhint');if(e.touches.length===1){h.classList.add('on');clearTimeout(tm);tm=setTimeout(()=>h.classList.remove('on'),1200)}else h.classList.remove('on')},{passive:true})}}}catch(e){map=null}
const pinI=(bg,t)=>L.divIcon({className:'',html:`<div class="pin" style="background:${bg}">${t}</div>`,iconSize:[30,30],iconAnchor:[15,15]});
function drawMap(r,wi){if(!map)return;try{lay.clearLayers();
  if(preset){const ll=preset.pts.map(q=>[q[0],q[1]]);L.polyline(ll,{color:'#fff',weight:10,opacity:.95,interactive:false}).addTo(lay);
    if(wi){let run=[ll[0]],k=wi.kinds[0];for(let i=1;i<ll.length;i++){const kk=wi.kinds[i-1];if(kk!==k){L.polyline(run,{color:KCOL[k],weight:5.5,lineCap:'round'}).addTo(lay);run=[ll[i-1]];k=kk}run.push(ll[i])}L.polyline(run,{color:KCOL[k],weight:5.5,lineCap:'round'}).addTo(lay)}
    else L.polyline(ll,{color:'#fc4c02',weight:5.5,lineCap:'round'}).addTo(lay);
    if(preset.turn)L.marker(ll[preset.ti],{icon:pinI('#242428',preset.turnIcon)}).bindTooltip(`Turnaround: ${preset.turn} · km ${preset.turnKm}`).addTo(lay);
    if(preset.dir)arrowsAt(preset,[.12,.3,.48,.66,.84]).forEach(([i,b])=>L.marker(ll[i],{interactive:false,icon:L.divIcon({className:'',html:`<div class="darrow" style="transform:rotate(${b}deg)">▲</div>`,iconSize:[22,22],iconAnchor:[11,11]})}).addTo(lay));
    L.marker(ll[0],{icon:pinI('#16a34a','🚴')}).bindTooltip(`Start & finish: ${preset.start}`).addTo(lay);
    if(fitFor!==preset.id){map.fitBounds(L.latLngBounds(ll),{padding:[28,28]});fitFor=preset.id}}
  else{const t=TR();L.marker([t.lat,t.lon],{icon:pinI('#fc4c02','🚴')}).bindTooltip(t.name).addTo(lay);if(fitFor!=='c-'+t.id){map.setView([t.lat,t.lon],t.id==='alqudra'?11:13);fitFor='c-'+t.id}}}catch(e){}}

/* ---------- weather ---------- */
const WX={};
async function loadWx(){const t=TR();if(WX[t.id])return WX[t.id];
  try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${t.lat}&longitude=${t.lon}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,precipitation_probability&daily=sunrise,sunset&timezone=Asia%2FDubai&forecast_days=16&wind_speed_unit=kmh`;
    const j=await (await fetch(u)).json();const H={};j.hourly.time.forEach((tm,i)=>{const o={};for(const k in j.hourly)o[k]=j.hourly[k][i];H[tm]=o});
    const D={};(j.daily.time||[]).forEach((d,i)=>D[d]={sunrise:j.daily.sunrise[i],sunset:j.daily.sunset[i]});WX[t.id]={H,D}}catch(e){WX[t.id]=null}
  return WX[t.id]}
function score(w){let s=100;s-=Math.max(0,w.wind_speed_10m-12)*1.6;s-=Math.max(0,w.wind_gusts_10m-30)*.8;s-=Math.max(0,w.apparent_temperature-30)*3;s-=Math.max(0,16-w.apparent_temperature)*2.5;s-=(w.precipitation_probability||0)*.4;s-=Math.max(0,(w.relative_humidity_2m||0)-80)*.4;return Math.max(5,Math.min(100,Math.round(s)))}
// forecast for the ride window (start hour .. start + ride time, at least 2 h)
function forecast(r){const wx=WX[TR().id];if(!wx)return null;const [h,m]=r.time.split(':').map(Number);
  const km=parseFloat(r.distance)||0,sp=parseFloat(r.pace)||25,hrs=Math.max(2,Math.min(6,Math.ceil(km/sp+.25)));
  const hs=[];for(let k=0;k<=hrs;k++){const hh=h+k;if(hh>23)break;const x=wx.H[`${r.occ}T${pad(hh)}:00`];if(x)hs.push(Object.assign({hour:hh},x))}
  if(!hs.length)return null;
  const temps=hs.map(x=>x.temperature_2m),lo=Math.round(Math.min(...temps)),hi=Math.round(Math.max(...temps)),w=hs.reduce((a,x)=>a+x.wind_speed_10m,0)/hs.length;
  const sc=Math.round(hs.reduce((a,x)=>a+score(x),0)/hs.length),mid=hs[Math.floor(hs.length/2)],dir=card(mid.wind_direction_10m),lab=TCDS.scoreLabel(sc),tr=lo===hi?`${lo}°C`:`${lo}–${hi}°C`;
  return{tr,w,dir,sc,lab,hs,mid,gust:Math.round(Math.max(...hs.map(x=>x.wind_gusts_10m))),hum:Math.round(hs.reduce((a,x)=>a+x.relative_humidity_2m,0)/hs.length),
    rain:Math.round(Math.max(...hs.map(x=>x.precipitation_probability||0))),uv:Math.max(...hs.map(x=>x.uv_index||0)),feels:Math.round(Math.max(...hs.map(x=>x.apparent_temperature))),
    sunrise:(wx.D[r.occ]||{}).sunrise,txt:`${tr}, wind ${Math.round(w)} km/h ${dir}, ride score ${sc} (${lab})`}}

// wind along a ready route: for each part, the forecast wind at the time the group gets there (start time + distance / pace)
function windInfo(r){const wx=WX.alqudra;if(!preset||!wx)return null;const [h,m]=r.time.split(':').map(Number),sp=paceKmh(),p=preset;
  const kinds=[],acc={head:0,tail:0,cross:0};let first=null;
  for(let i=1;i<p.pts.length;i++){const mins=h*60+m+p.cum[i-1]/1000/sp*60,hh=Math.min(23,Math.floor(mins/60)),w=wx.H[`${r.occ}T${pad(hh)}:00`];if(!w)return null;if(!first)first=w;
    const a=Math.abs(((w.wind_direction_10m-brg(p.pts[i-1],p.pts[i]))%360+540)%360-180),k=a<=60?'head':a>=120?'tail':'cross';kinds.push(k);acc[k]+=p.cum[i]-p.cum[i-1]}
  const L=p.cum[p.cum.length-1],pc=k=>Math.round(acc[k]/L*100);return{kinds,head:pc('head'),tail:pc('tail'),cross:pc('cross'),start:first}}
function stats(r,f,wi){const km=parseFloat($('fDist').value)||0,mins=km/paceKmh()*60,[h,m]=r.time.split(':').map(Number),back=h*60+m+mins;
  const backT=km?TCDS.fmtTime(`${pad(Math.floor(back/60)%24)}:${pad(Math.round(back%60)%60)}`):'--';
  const box=(l,v,c='')=>`<div class="${c}"><small>${l}</small><b>${v}</b></div>`;
  $('rStats').innerHTML=preset?box('Distance',`${preset.km} km`)+box('Climb',`${preset.gain} m`)+box('Ride time',fmtDur(mins))+box('Back at',backT)+box('Headwind',wi?`${wi.head}%`:'--','h')+box('Tailwind',wi?`${wi.tail}%`:'--','t')
    :box('Distance',km?`${km} km`:'--')+box('Pace',`${paceKmh()} km/h`)+box('Ride time',km?fmtDur(mins):'--')+box('Back at',backT)+box('Temp',f?f.tr:'--')+box('Wind',f?`${Math.round(f.w)} km/h ${f.dir}`:'--');
  const w=wi?wi.start:f?f.hs[0]:null;
  if(w){$('wArr').style.transform=`rotate(${w.wind_direction_10m}deg)`;$('wSpd').textContent=`${Math.round(w.wind_speed_10m)} km/h ${card(w.wind_direction_10m)}`;$('wTxt').textContent=`Wind at ${TCDS.fmtTime(r.time)} · gusts ${Math.round(w.wind_gusts_10m)}`}
  else{$('wArr').style.transform='';$('wSpd').textContent='--';$('wTxt').textContent=WX[TR().id]===null?'Forecast unavailable':'Forecast closer to the day'}
  $('legend').style.display=preset&&wi?'':'none'}

/* ---------- ride + message ---------- */
function ride(){const t=TR(),dist=parseFloat($('fDist').value);
  return{name:($('fName').value||'Group Ride').trim(),occ:$('fDate').value,time:$('fTime').value||'06:30',theme:color,type:$('fType').value,
    distance:dist?`${dist} km`:'',pace:$('fPace').value.trim(),start:$('fStart').value.trim(),route:$('fRoute').value.trim(),place:t.id==='other'?($('fStart').value.trim()||'Dubai'):t.place,
    rule:$('fRule').checked?(SITE.rideRule||'Lights & helmet mandatory'):'',org:$('fOrg').value.trim(),join:$('fJoin').value.trim(),notes:$('fNotes').value.trim().replace(/\s+/g,' '),
    joinLine:$('fOrg').value.trim()?`🙋 Organised by ${$('fOrg').value.trim()}`:$('fJoin').value.trim()?'✅ Join: link in the message':'👋 Everyone welcome'}}
function message(r,f,wi){const ev=TCDS.upcomingEvents().map(e=>`• ${e.name}: ${e.url}`),p=preset;
  const build=(nEv,notes,gpx=true)=>`🚴‍♂️ *${r.name}* · group ride\n🗓️ ${TCDS.occLabel(r.occ)} · ${TCDS.fmtTime(r.time)}\n📍 ${r.start&&r.start!==r.place?`Start: ${r.start} · `:''}${r.place}\n`+
    (r.route?`🛣️ ${r.route}${p?` · ${p.gain} m climb`:''}\n`:'')+(TCDS.rideKind(r)?`${TCDS.rideKind(r)}\n`:'')+(r.pace?`⚡ ${r.pace}\n`:'')+(r.rule?`⛑️💡 ${r.rule}\n`:'')+
    (f?`🌤️ Forecast: ${f.txt}\n`:'')+(wi?`💨 Wind on route: ${wi.head}% headwind · ${wi.tail}% tailwind\n`:'')+(r.org?`🙋 Organised by ${r.org}\n`:'')+(notes&&r.notes?`📝 ${r.notes}\n`:'')+(r.join?`✅ Join: ${r.join}\n`:'')+(p?(p.strava?`🗺️ Strava route: ${p.strava}\n`:'')+(gpx?`⬇️ GPX: ${TCDS.root()}${p.gpx}\n`:''):'')+
    (nEv?`\n📅 *Recommended events*\n${ev.slice(0,nEv).join('\n')}\n`:'')+`\n📲 Ride weather & planner: ${TCDS.root()}\n🧭 Organize your ride: ${TCDS.root()}organize-ride.html`;
  let t=build(ev.length,true);for(let n=ev.length;t.length>1010&&n>0;n--)t=build(n-1,true);if(t.length>1010)t=build(0,false);if(t.length>1010)t=build(0,false,false);return t}

/* ---------- ONE share image (1080×1350): ride card + forecast + route in one picture ---------- */
// jersey colours: Tour de France (yellow, green, polka dots, white), Giro (maglia rosa), Vuelta (la roja)
const JERSEY={
  jaune:{name:'Maillot jaune',bg:['#ffd400','#ffe100','#fff16a'],light:1,ink:'#1f1a00',sub:'#5c4a00',acc:'#8a6d00',bar:['#2b2200','#3d3200','#5a4700'],dubai:'#ffe100'},
  vert:{name:'Maillot vert',bg:['#00843d','#00a650','#3cc46e'],ink:'#fff',sub:'#ffffffd9',acc:'#d9ffe6',bar:['#004d25','#00622f','#00843d'],dubai:'#b9f5cf'},
  pois:{name:'Maillot à pois',bg:['#ffffff','#fffafa','#fff1f2'],light:1,ink:'#13233f',sub:'#3b4a60',acc:'#e2001a',bar:['#9f0014','#d0001a','#ff2d45'],dubai:'#ffd6da',pat:'polka'},
  blanc:{name:'Maillot blanc',bg:['#ffffff','#f6f7f9','#e9edf2'],light:1,ink:'#13233f',sub:'#475569',acc:'#64748b',bar:['#13233f','#24365a','#3a4f78'],dubai:'#cfd8e6'},
  rosa:{name:'Maglia rosa',bg:['#fff3f8','#ffd9e8','#f9aecd'],light:1,ink:'#3b0a2a',sub:'#6b2a52',acc:'#e6007e',bar:['#8a0049','#d4006f','#ff4fa3'],dubai:'#ffd1e3',pat:'giro'},
  roja:{name:'La Roja',bg:['#9e001d','#d50032','#ff2d55'],ink:'#fff',sub:'#ffffffd9',acc:'#ffd1da',bar:['#5e0011','#7f0018','#a8001f'],dubai:'#ffc2cc'}};
function shareCard(r,f,wi){const W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d'),J=JERSEY[r.theme]||JERSEY.jaune,rr=TCDS.rr,p=preset;
  const txt=(s,x,y,size,w,col,al='left',max)=>{c.font=`${w} ${size}px Sora,sans-serif`;c.fillStyle=col;c.textAlign=al;if(max)while(c.measureText(s).width>max&&s.length>4)s=s.slice(0,-2).trimEnd()+'…';c.fillText(s,x,y)};
  const PANEL=J.light?'rgba(255,255,255,.9)':'rgba(255,255,255,.14)',STROKE=J.light?'rgba(19,35,63,.12)':'rgba(255,255,255,.28)';
  const panel=(x,y,w,h,rad,fill=PANEL,st=STROKE)=>{rr(c,x,y,w,h,rad);c.fillStyle=fill;c.fill();c.strokeStyle=st;c.lineWidth=2;c.stroke()};
  // background + jersey pattern
  const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,J.bg[0]);g.addColorStop(.55,J.bg[1]);g.addColorStop(1,J.bg[2]);c.fillStyle=g;c.fillRect(0,0,W,H);
  if(J.pat==='polka')TCDS.polka(c,W,420,560,.85);else if(J.pat==='giro')TCDS.giroLines(c,W,420,520);
  else{c.save();c.strokeStyle=J.light?'rgba(255,255,255,.55)':'rgba(255,255,255,.08)';c.lineWidth=4;for(let x=380;x<W+400;x+=40){c.beginPath();c.moveTo(x,420);c.lineTo(x+300,0);c.stroke()}c.restore()}
  // date tile
  const dp=TCDS.dayParts(r.occ);rr(c,64,64,200,214,30);c.fillStyle='#fff';c.fill();c.strokeStyle=J.light&&J.acc!=='#64748b'?J.acc:'rgba(19,35,63,.15)';c.lineWidth=5;c.stroke();
  txt(dp.day.toUpperCase(),164,118,32,800,'#e2001a','center');txt(String(dp.date),164,214,94,800,'#13233f','center');txt(dp.mon.toUpperCase(),164,258,30,800,'#64748b','center');
  // chips
  let cx=296;c.font='800 26px Sora,sans-serif';['★ Group ride',TCDS.rideKind(r),r.pace?'⚡ '+r.pace:''].filter(Boolean).forEach((t,k)=>{const w=c.measureText(t).width+34;
    rr(c,cx,70,w,48,12);c.fillStyle=k===0?(J.light?J.ink:'#fff'):(J.light?'rgba(255,255,255,.8)':'rgba(255,255,255,.18)');c.fill();txt(t,cx+17,103,26,800,k===0?(J.light?'#fff':J.bg[1]):J.ink);cx+=w+12});
  // title
  c.font='800 62px Sora,sans-serif';const tl=TCDS.wrapLines(c,r.name,720).slice(0,2);tl.forEach((l,i)=>txt(l,296,186+i*68,62,800,J.ink));
  txt(`${TCDS.fmtTime(r.time)} · ${r.place}`,296,186+tl.length*68+(tl.length>1?-8:0),40,700,J.sub);
  const info=[r.start&&`📍 Start: ${r.start}`,r.route&&`🛣️ ${r.route}`].filter(Boolean).join('   ');txt(info,64,340,30,700,J.ink,'left',952);
  // middle: map (ready route) or facts (own route) | weather
  const km=parseFloat(r.distance)||0,mins=km/paceKmh()*60,[hh,mm]=r.time.split(':').map(Number),back=hh*60+mm+mins,backT=km?TCDS.fmtTime(`${pad(Math.floor(back/60)%24)}:${pad(Math.round(back%60)%60)}`):'--';
  const MY=380,MH=520;
  if(p){panel(64,MY,600,MH,28,'#ffffff',STROKE);const P=fitter(p.pts,64,MY,600,MH-70,44),xy=p.pts.map(P);c.lineJoin=c.lineCap='round';
    c.strokeStyle='#e5e7eb';c.lineWidth=20;c.beginPath();xy.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();
    for(let i=1;i<xy.length;i++){c.strokeStyle=wi?KCOL[wi.kinds[i-1]]:'#fc4c02';c.lineWidth=10;c.beginPath();c.moveTo(xy[i-1][0],xy[i-1][1]);c.lineTo(xy[i][0],xy[i][1]);c.stroke()}
    if(p.dir)arrowsAt(p,[.2,.45,.7,.88]).forEach(([i,b])=>{const q=xy[i];c.save();c.translate(q[0],q[1]);c.rotate(b*rad);c.fillStyle='#13233f';c.strokeStyle='#fff';c.lineWidth=4;c.beginPath();c.moveTo(0,-16);c.lineTo(12,10);c.lineTo(-12,10);c.closePath();c.stroke();c.fill();c.restore()});
    const dot=(q,col,t)=>{c.fillStyle=col;c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.arc(q[0],q[1],18,0,7);c.fill();c.stroke();txt(t,q[0],q[1]+8,22,800,'#fff','center')};
    if(p.turn)dot(xy[p.ti],'#13233f','T');dot(xy[0],'#16a34a','S');
    // wind-on-route legend (or ride facts if no forecast yet)
    const ly=MY+MH-28;if(wi)[['head','Head',wi.head],['tail','Tail',wi.tail],['cross','Cross',wi.cross]].forEach(([k,l,v],i)=>{const x=92+i*186;c.fillStyle=KCOL[k];rr(c,x,ly-16,26,13,6);c.fill();txt(`${l} ${v}%`,x+34,ly-3,22,800,'#13233f')});
    else txt(p.dir?`${DIRN[p.dir]} · ${p.km} km · ${p.gain} m`:`${p.km} km · ${p.gain} m climb`,92,ly-3,22,800,'#13233f')}
  else{[['Distance',km?`${km} km`:'--'],['Pace',`${paceKmh()} km/h`],['Ride time',km?fmtDur(mins):'--'],['Back at',backT]].forEach(([l,v],i)=>{const x=64+(i%2)*306,y=MY+Math.floor(i/2)*266;panel(x,y,294,250,26);
      txt(l.toUpperCase(),x+28,y+64,24,800,J.acc);txt(v,x+28,y+150,54,800,J.ink,'left',250)})}
  // weather column
  const WX0=684,WW=332;panel(WX0,MY,WW,MH,28);
  if(!f){txt('🌤️',WX0+WW/2,MY+200,80,400,J.ink,'center');txt('Forecast',WX0+WW/2,MY+290,40,800,J.ink,'center');txt('closer to the day',WX0+WW/2,MY+338,28,700,J.sub,'center');txt('(16 days ahead)',WX0+WW/2,MY+378,24,600,J.sub,'center')}
  else{const ccx=WX0+WW/2,ccy=MY+118,R=72,col=f.sc>=80?'#22c55e':f.sc>=65?'#84cc16':f.sc>=50?'#eab308':'#ef4444';
    c.lineWidth=20;c.strokeStyle=J.light?'#eef0f3':'rgba(255,255,255,.2)';c.beginPath();c.arc(ccx,ccy,R,0,7);c.stroke();c.strokeStyle=col;c.lineCap='round';c.beginPath();c.arc(ccx,ccy,R,-Math.PI/2,-Math.PI/2+f.sc/100*Math.PI*2);c.stroke();
    txt(String(f.sc),ccx,ccy+20,60,800,J.ink,'center');txt(`${f.lab.toUpperCase()} RIDE`,ccx,ccy+R+44,22,800,J.acc,'center');
    txt(f.tr,ccx,MY+318,58,800,J.ink,'center');txt(`feels up to ${f.feels}°C`,ccx,MY+352,24,700,J.sub,'center');
    c.save();c.translate(WX0+64,MY+400);c.rotate((f.mid.wind_direction_10m+180)*rad);c.fillStyle=J.light?J.acc==='#64748b'?'#13233f':J.acc:'#fff';c.beginPath();c.moveTo(0,-22);c.lineTo(14,8);c.lineTo(4,4);c.lineTo(4,22);c.lineTo(-4,22);c.lineTo(-4,4);c.lineTo(-14,8);c.closePath();c.fill();c.restore();
    txt(`${Math.round(f.w)} km/h ${f.dir}`,WX0+98,MY+412,32,800,J.ink);
    txt(`Gusts ${f.gust} · Rain ${f.rain}%`,ccx,MY+460,23,700,J.sub,'center');txt(`Humidity ${f.hum}% · UV ${f.uv.toFixed(0)}`,ccx,MY+492,23,700,J.sub,'center')}
  // hourly strip (forecast) or route facts
  const SY=MY+MH+20;panel(64,SY,952,140,26);
  if(f){const hs=f.hs.slice(0,6),cw=952/hs.length;hs.forEach((x,i)=>{const X=64+cw*i+cw/2;txt(TCDS.fmtTime(`${pad(x.hour)}:00`).replace(':00',''),X,SY+40,22,800,J.acc,'center');txt(`${Math.round(x.temperature_2m)}°`,X,SY+86,36,800,J.ink,'center');
      c.save();c.translate(X-46,SY+113);c.rotate((x.wind_direction_10m+180)*rad);c.fillStyle=J.ink;c.beginPath();c.moveTo(0,-9);c.lineTo(6,5);c.lineTo(0,2);c.lineTo(-6,5);c.closePath();c.fill();c.restore();txt(`${Math.round(x.wind_speed_10m)} km/h`,X+8,SY+121,21,700,J.sub,'center')})}
  else txt('Hour-by-hour forecast appears up to 16 days before the ride',540,SY+80,24,700,J.sub,'center');
  // ride facts row (ready route)
  const FY=SY+160,facts=p?[['Distance',`${p.km} km`],['Climb',`${p.gain} m`],['Ride time',fmtDur(mins)],['Back at',backT]]:[['Type',r.type||'Ride'],['Start',r.start||r.place],['Organiser',r.org||'Open ride'],['Ride score',f?`${f.sc} / 100`:'--']];
  facts.forEach(([l,v],i)=>{const x=64+i*242;panel(x,FY,226,100,22);txt(l.toUpperCase(),x+22,FY+38,20,800,J.acc);txt(v,x+22,FY+80,30,800,J.ink,'left',190)});
  // rule + who line
  txt([r.rule&&`⛑️💡 ${r.rule}`,r.joinLine].filter(Boolean).join('   '),64,FY+150,26,700,J.ink,'left',952);
  // brand bar
  const bg=c.createLinearGradient(0,0,W,0);bg.addColorStop(0,J.bar[0]);bg.addColorStop(.5,J.bar[1]);bg.addColorStop(1,J.bar[2]);c.fillStyle=bg;c.fillRect(0,H-90,W,90);
  c.font='800 38px Sora,sans-serif';c.textAlign='left';c.fillStyle='#fff';c.fillText('TheCyclist',56,H-32);const w2=c.measureText('TheCyclist').width;c.fillStyle=J.dubai;c.fillText('Dubai',56+w2,H-32);
  txt('thecyclistdubai.com',W-56,H-34,28,700,'#fff','right');
  return cv}

/* ---------- render + share ---------- */
let CUR={};
function update(){const r=ride(),f=forecast(r),wi=windInfo(r);
  try{localStorage.setItem('tcd_org',JSON.stringify(Object.assign(Object.fromEntries(FIELDS.map(k=>[k,$(k).value])),{fRule:$('fRule').checked,color,colorPicked,dirPref:DIRP,preset:preset?preset.id:'custom',nameAuto})))}catch(e){}
  const sc=shareCard(r,f,wi);const t=$('cvShare');t.getContext('2d').drawImage(sc,0,0);const text=message(r,f,wi);$('txt').textContent=text;
  stats(r,f,wi);drawMap(r,wi);
  $('fcNote').textContent=WX[TR().id]===null?'Forecast unavailable right now':f?`Forecast loaded · ride score ${f.sc}`:'Forecast comes closer to the day';
  CUR={r,f,sc,text}}
function toast(m){const t=$('rToast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),3200)}
const fileName=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'ride';
$('bShare').onclick=async()=>{update();const {r,sc,text}=CUR,base=fileName(r.name);
  const files=[TCDS.canvasFile(sc,`${base}.png`)];
  try{navigator.clipboard.writeText(text).catch(()=>{})}catch(e){}
  try{if(navigator.canShare&&navigator.canShare({files})){await navigator.share({files,text,title:r.name});toast('Shared ✔ Text also copied');return}
    if(navigator.share){await navigator.share({text,title:r.name});return}}catch(e){if(e.name==='AbortError')return}
  window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');toast('Opening WhatsApp · download the image to attach it')};
$('bCopy').onclick=()=>{update();try{navigator.clipboard.writeText(CUR.text).then(()=>toast('Text copied ✔'),()=>toast('Select the text below to copy'))}catch(e){toast('Select the text below to copy')}};
$('bSave').onclick=()=>{update();const a=document.createElement('a');a.href=CUR.sc.toDataURL('image/jpeg',.93);a.download=`${fileName(CUR.r.name)}.jpg`;document.body.appendChild(a);a.click();a.remove();toast('Downloading the ride image')};
(function tick(){const n=dubai();$('clk').textContent=`${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}`;setTimeout(tick,15000)})();
let startI=0;try{const sv=JSON.parse(localStorage.getItem('tcd_org')||'null');if(sv&&sv.preset){const k=sv.preset==='custom'?PRE.length:PRE.findIndex(p=>p.id===sv.preset);if(k>=0)startI=k}}catch(e){}
const qp=new URLSearchParams(location.search).get('route');if(qp){const k=PRE.findIndex(p=>p.id===qp);if(k>=0)startI=k}
requestAnimationFrame(()=>goSlide(startI,false));
})();
