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
const FIELDS=['fName','fDate','fTime','fTrack','fStart','fLoc','fRoute','fType','fDist','fPace','fOrg','fJoin','fNotes'];
let color='jaune';
try{const sv=JSON.parse(localStorage.getItem('tcd_org')||'null');if(sv){FIELDS.forEach(k=>{if(sv[k]!=null)$(k).value=sv[k]});$('fRule').checked=sv.fRule!==false;color=sv.colorPicked&&COLORS.some(x=>x[0]===sv.color)?sv.color:color}}catch(e){}
if(!$('fName').value)$('fName').value='Saturday Coffee Ride';
if(!(parseFloat($('fPace').value)>0))$('fPace').value=28;
$('bFind').onclick=()=>{const q=[$('fStart').value.trim(),TR().id==='other'?'':TR().name,'Dubai'].filter(Boolean).join(', ');window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q),'_blank','noopener');toast('Find the place, tap Share → Copy link, paste it here')};
$('fLoc').addEventListener('input',()=>{locAuto=''});
if(!$('fDate').value||$('fDate').value<ymd(dubai()))$('fDate').value=nextSat();
$('fDate').min=ymd(dubai());
if(!$('fStart').value)$('fStart').value=TRACKS[0].start;
const TR=()=>TRACKS.find(t=>t.id===$('fTrack').value)||TRACKS[0];
function setColor(c){color=c;const k=COLORS.find(x=>x[0]===c);$('colName').textContent=k?k[2]:'';document.querySelectorAll('#fColor button').forEach(b=>b.classList.toggle('on',b.dataset.c===c))}
setColor(color);
let colorPicked=false;try{colorPicked=!!(JSON.parse(localStorage.getItem('tcd_org')||'null')||{}).colorPicked}catch(e){}
document.querySelectorAll('#fColor button').forEach(b=>b.onclick=()=>{colorPicked=true;setColor(b.dataset.c);update()});
let lastTrack=$('fTrack').value;
$('fTrack').addEventListener('change',()=>{const old=TRACKS.find(t=>t.id===lastTrack);if(!$('fStart').value||(old&&$('fStart').value===old.start))$('fStart').value=TR().start;lastTrack=$('fTrack').value;loadWx().then(update)});
FIELDS.concat(['fRule']).forEach(k=>$(k).addEventListener('input',()=>{clearTimeout(window._u);window._u=setTimeout(update,180)}));
$('fDate').addEventListener('change',update);$('fTime').addEventListener('change',update);

/* ---------- ready routes carousel ---------- */
let preset=null,nameAuto=true,curSlide=-1,fitFor=null,locAuto='',first0=true;
try{const sv=JSON.parse(localStorage.getItem('tcd_org')||'null');if(sv&&sv.nameAuto===false)nameAuto=false}catch(e){}
function elevSvg(p){const W=400,H=34,e=p.pts.map(q=>q[2]),lo=Math.min(...e)-3,hi=Math.max(...e)+3,L=p.cum[p.cum.length-1];
  const xy=p.pts.map((q,i)=>[(p.cum[i]/L*W).toFixed(1),(H-(q[2]-lo)/(hi-lo)*H).toFixed(1)]);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 ${H}L${xy.map(q=>q.join(' ')).join('L')}L${W} ${H}Z" fill="#fc4c021f"/><path d="M${xy.map(q=>q.join(' ')).join('L')}" fill="none" stroke="#fc4c02" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`}
const estTime=km=>fmtDur(km/paceKmh()*60);
const slideInner=(p,i)=>`<div class="rinfo">
    <div class="rtags"><span class="k">${p.kind}</span><span>Al Qudra</span><span>Start: ${p.start}</span>${i===0?'<span>TCD Ride route</span>':p.id==='mosque'?'<span>Purple Ride route</span>':''}</div>
    <h3>${p.name}</h3><p>${p.desc}</p>
    <div class="rfacts"><div><small>Distance</small><b>${p.km} km</b></div><div><small>Climb</small><b>${p.gain} m</b></div><div><small>${p.turn?'Turn at':'Direction'}</small><b>${p.turn?`${p.turn} · ${p.turnKm}`:`${DIRI[p.dir]} ${DIRN[p.dir]}`}</b></div><div><small>Ride time</small><b class="et" data-km="${p.km}">${estTime(p.km)}</b></div></div>
    ${p.dir?`<div class="dirseg" role="group" aria-label="Loop direction">${['cw','ccw'].map(d=>`<button type="button" data-d="${d}" class="${d===p.dir?'on':''}">${DIRI[d]} ${DIRN[d]}</button>`).join('')}</div>`:`<div class="relev">${elevSvg(p)}</div>`}</div>`;
$('rcView').innerHTML=PRE.map((p,i)=>`<div class="rslide" data-i="${i}">${slideInner(variant(p),i)}</div>`).join('')+
  `<div class="rslide custom" data-i="${PRE.length}"><div class="rinfo"><div class="rtags"><span class="k">Custom</span><span>Any track in Dubai</span></div>
    <h3>✏️ Your own route</h3><p>Al Qudra, Meydan, Mushrif, Kite Beach, Hatta or anywhere else: set the track, start location, route and distance in “Add details manually” below.</p>
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
    const ql=`https://www.google.com/maps/search/?api=1&query=${preset.pts[0][0]},${preset.pts[0][1]}`;if(!$('fLoc').value||$('fLoc').value===locAuto)$('fLoc').value=ql;locAuto=ql;
    $('autoNote').innerHTML=`✨ Auto-filled from <b>${preset.name}</b>${preset.dir?` (${DIRN[preset.dir].toLowerCase()})`:''}: Al Qudra · start ${preset.start} · ${preset.km} km · ${preset.gain} m climb. Just set the date &amp; time under the routes (edit anything below if you like).`}
  else{$('autoNote').innerHTML='';if(curSlide>=0&&!first0)$('more').open=true}first0=false;
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

/* ---------- wind particles over the map (as on the homepage / ride pages) ---------- */
const wcv=$('wind'),wcx=wcv.getContext('2d');let WPT=[],wvx=0,wvy=0,wpA=.5;
function sizeW(){const r=wcv.getBoundingClientRect();wcv.width=r.width*devicePixelRatio;wcv.height=r.height*devicePixelRatio;wcx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
try{new ResizeObserver(sizeW).observe(wcv)}catch(e){sizeW()}
function setParticles(dir,k){if(dir==null){WPT.length=0;return}const to=(dir+180)*rad,sp=.4+k/9;wvx=Math.sin(to)*sp;wvy=-Math.cos(to)*sp;wpA=Math.min(.75,.25+k/50);
  const n=Math.round(60+k*7),w=wcv.clientWidth,h=wcv.clientHeight;while(WPT.length<n)WPT.push({x:Math.random()*w,y:Math.random()*h,a:Math.random()*80});WPT.length=n}
(function step(){const w=wcv.clientWidth,h=wcv.clientHeight;wcx.clearRect(0,0,w,h);wcx.lineCap='round';
  for(const p of WPT){const ox=p.x,oy=p.y;p.x+=wvx*(.85+Math.random()*.3);p.y+=wvy*(.85+Math.random()*.3);p.a++;
    if(p.x<0||p.x>w||p.y<0||p.y>h||p.a>90){p.x=Math.random()*w;p.y=Math.random()*h;p.a=0;continue}
    const life=Math.sin(p.a/90*Math.PI);wcx.strokeStyle=`rgba(36,36,40,${wpA*life*.7})`;wcx.lineWidth=1.4;wcx.beginPath();wcx.moveTo(ox-wvx*6,oy-wvy*6);wcx.lineTo(p.x,p.y);wcx.stroke()}
  requestAnimationFrame(step)})();

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
  const w=wi?wi.start:f?f.hs[0]:null;
  if(w){$('wArr').style.transform=`rotate(${w.wind_direction_10m}deg)`;$('wSpd').textContent=`${Math.round(w.wind_speed_10m)} km/h ${card(w.wind_direction_10m)}`;$('wTxt').textContent=`Wind at ${TCDS.fmtTime(r.time)} · gusts ${Math.round(w.wind_gusts_10m)}`;setParticles(w.wind_direction_10m,w.wind_speed_10m)}
  else{$('wArr').style.transform='';$('wSpd').textContent='--';$('wTxt').textContent=WX[TR().id]===null?'Forecast unavailable':'Forecast closer to the day';setParticles(null)}
  $('legend').style.display=preset&&wi?'':'none';
  $('whenTxt').innerHTML=`${km?`${km} km · ${fmtDur(mins)} · back ${backT}`:TCDS.occLabel(r.occ)}${wi?` · <b class="h">${wi.head}% head</b> · <b class="t">${wi.tail}% tail</b>`:f?` · ${f.tr}`:''}`;if(map)setTimeout(()=>map.invalidateSize(),0)}

/* ---------- ride + message ---------- */
function ride(){const t=TR(),dist=parseFloat($('fDist').value);
  return{name:($('fName').value||'Group Ride').trim(),occ:$('fDate').value,time:$('fTime').value||'06:30',theme:color,type:$('fType').value,
    distance:dist?`${dist} km`:'',pace:`${paceKmh()} km/h avg`,loc:$('fLoc').value.trim(),start:$('fStart').value.trim(),route:$('fRoute').value.trim(),place:t.id==='other'?($('fStart').value.trim()||'Dubai'):t.place,
    rule:$('fRule').checked?(SITE.rideRule||'Lights & helmet mandatory'):'',org:$('fOrg').value.trim(),join:$('fJoin').value.trim(),notes:$('fNotes').value.trim().replace(/\s+/g,' '),
    joinLine:$('fOrg').value.trim()?`🙋 Organised by ${$('fOrg').value.trim()}`:$('fJoin').value.trim()?'✅ Join: link in the message':'👋 Everyone welcome'}}
function message(r,f,wi){const ev=TCDS.upcomingEvents().map(e=>`• ${e.name}: ${e.url}`),p=preset;
  const build=(nEv,notes,gpx=true)=>`🚴‍♂️ *${r.name}* · group ride\n🗓️ ${TCDS.occLabel(r.occ)} · ${TCDS.fmtTime(r.time)}\n📍 ${r.start&&r.start!==r.place?`Start: ${r.start} · `:''}${r.place}\n`+
    (r.route?`🛣️ ${r.route}${p?` · ${p.gain} m climb`:''}\n`:'')+(TCDS.rideKind(r)?`${TCDS.rideKind(r)}\n`:'')+(r.pace?`⚡ ${r.pace}\n`:'')+(r.rule?`⛑️💡 ${r.rule}\n`:'')+
    (f?`🌤️ Forecast: ${f.txt}\n`:'')+(wi?`💨 Wind on route: ${wi.head}% headwind · ${wi.tail}% tailwind\n`:'')+(r.org?`🙋 Organised by ${r.org}\n`:'')+(notes&&r.notes?`📝 ${r.notes}\n`:'')+(r.loc?`📌 Start location: ${r.loc}\n`:'')+(r.join?`✅ Join: ${r.join}\n`:'')+(p?(p.strava?`🗺️ Strava route: ${p.strava}\n`:'')+(gpx?`⬇️ GPX: ${TCDS.root()}${p.gpx}\n`:''):'')+
    (nEv?`\n📅 *Recommended events*\n${ev.slice(0,nEv).join('\n')}\n`:'')+`\n📲 Ride weather & planner: ${TCDS.root()}\n🧭 Organize your ride: ${TCDS.root()}organize-ride.html`;
  let t=build(ev.length,true);for(let n=ev.length;t.length>1010&&n>0;n--)t=build(n-1,true);if(t.length>1010)t=build(0,false);if(t.length>1010)t=build(0,false,false);return t}

/* the ONE share image is drawn by share-core.js (TCDS.shareCard), the same drawer as the homepage + ride page ride shares */
/* ---------- render + share ---------- */
let CUR={};
function update(){const r=ride(),f=forecast(r),wi=windInfo(r);
  try{localStorage.setItem('tcd_org',JSON.stringify(Object.assign(Object.fromEntries(FIELDS.map(k=>[k,$(k).value])),{fRule:$('fRule').checked,color,colorPicked,dirPref:DIRP,preset:preset?preset.id:'custom',nameAuto})))}catch(e){}
  const sc=TCDS.shareCard(r,f,wi,preset,paceKmh());const t=$('cvShare');t.getContext('2d').drawImage(sc,0,0);const text=message(r,f,wi);$('txt').textContent=text;
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
