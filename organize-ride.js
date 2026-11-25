/* TheCyclistDubai · ride organizer (organize-ride.html)
   Visitors fill in their ride; the page draws the same ride card as TheCyclistDubai's own rides (share-core.js)
   plus a weather card for the ride window (Open-Meteo), and shares both images with a WhatsApp-ready message
   that links to thecyclistdubai.com and lists the recommended events from site-data.js. */
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
const COLORS=[['org','linear-gradient(135deg,#13233f,#6b9a80)'],['green','linear-gradient(135deg,#052e16,#16a34a)'],['purple','linear-gradient(135deg,#2e1065,#a855f7)'],['orange','linear-gradient(135deg,#7c2d12,#fb923c)'],['blue','linear-gradient(135deg,#0c2d48,#0ea5e9)']];
const IMG_TH={org:'org',green:'green',purple:'purple',orange:'rorange',blue:'sky'};

/* ---------- form ---------- */
$('fTrack').innerHTML=TRACKS.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
$('fColor').innerHTML=COLORS.map(c=>`<button type="button" data-c="${c[0]}" style="background:${c[1]}" aria-label="${c[0]} card"></button>`).join('');
const dubai=()=>new Date(Date.now()+4*3600e3);
const ymd=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
function nextSat(){const d=dubai();let k=(6-d.getUTCDay()+7)%7;if(k===0&&d.getUTCHours()>=6)k=7;return ymd(new Date(d.getTime()+k*864e5))}
const FIELDS=['fName','fDate','fTime','fTrack','fStart','fRoute','fType','fDist','fPace','fOrg','fJoin','fNotes'];
let color='org';
try{const sv=JSON.parse(localStorage.getItem('tcd_org')||'null');if(sv){FIELDS.forEach(k=>{if(sv[k]!=null)$(k).value=sv[k]});$('fRule').checked=sv.fRule!==false;color=sv.color||color}}catch(e){}
if(!$('fName').value)$('fName').value='Saturday Coffee Ride';
if(!$('fDate').value||$('fDate').value<ymd(dubai()))$('fDate').value=nextSat();
$('fDate').min=ymd(dubai());
if(!$('fStart').value)$('fStart').value=TRACKS[0].start;
const TR=()=>TRACKS.find(t=>t.id===$('fTrack').value)||TRACKS[0];
function setColor(c){color=c;document.querySelectorAll('#fColor button').forEach(b=>b.classList.toggle('on',b.dataset.c===c))}
setColor(color);
document.querySelectorAll('#fColor button').forEach(b=>b.onclick=()=>{setColor(b.dataset.c);update()});
let lastTrack=$('fTrack').value;
$('fTrack').addEventListener('change',()=>{const old=TRACKS.find(t=>t.id===lastTrack);if(!$('fStart').value||(old&&$('fStart').value===old.start))$('fStart').value=TR().start;lastTrack=$('fTrack').value;loadWx().then(update)});
FIELDS.concat(['fRule']).forEach(k=>$(k).addEventListener('input',()=>{clearTimeout(window._u);window._u=setTimeout(update,180)}));
$('fDate').addEventListener('change',update);$('fTime').addEventListener('change',update);

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

/* ---------- ride + message ---------- */
function ride(){const t=TR(),dist=parseFloat($('fDist').value);
  return{name:($('fName').value||'Group Ride').trim(),occ:$('fDate').value,time:$('fTime').value||'06:30',theme:color,type:$('fType').value,
    distance:dist?`${dist} km`:'',pace:$('fPace').value.trim(),start:$('fStart').value.trim(),route:$('fRoute').value.trim(),place:t.id==='other'?($('fStart').value.trim()||'Dubai'):t.place,
    rule:$('fRule').checked?(SITE.rideRule||'Lights & helmet mandatory'):'',org:$('fOrg').value.trim(),join:$('fJoin').value.trim(),notes:$('fNotes').value.trim().replace(/\s+/g,' '),
    joinLine:$('fOrg').value.trim()?`🙋 Organised by ${$('fOrg').value.trim()}`:$('fJoin').value.trim()?'✅ Join: link in the message':'👋 Everyone welcome'}}
function message(r,f){const ev=TCDS.eventLines();
  const build=(nEv,notes)=>`🚴‍♂️ *${r.name}* · group ride\n🗓️ ${TCDS.occLabel(r.occ)} · ${TCDS.fmtTime(r.time)}\n📍 ${r.start&&r.start!==r.place?`Start: ${r.start} · `:''}${r.place}\n`+
    (r.route?`🛣️ ${r.route}\n`:'')+(TCDS.rideKind(r)?`${TCDS.rideKind(r)}\n`:'')+(r.pace?`⚡ ${r.pace}\n`:'')+(r.rule?`⛑️💡 ${r.rule}\n`:'')+
    (f?`🌤️ Forecast: ${f.txt}\n`:'')+(r.org?`🙋 Organised by ${r.org}\n`:'')+(notes&&r.notes?`📝 ${r.notes}\n`:'')+(r.join?`✅ Join: ${r.join}\n`:'')+
    (nEv?`\n📅 *Recommended events*\n${ev.slice(0,nEv).join('\n')}\n`:'')+`\n📲 Ride weather & planner: ${TCDS.root()}\n🧭 Organize your ride: ${TCDS.root()}organize-ride.html`;
  let t=build(ev.length,true);for(let n=ev.length;t.length>1010&&n>0;n--)t=build(n-1,true);if(t.length>1010)t=build(0,false);return t}

/* ---------- weather card image ---------- */
function weatherCard(r,f){const S=1080,cv=document.createElement('canvas');cv.width=S;cv.height=S;const c=cv.getContext('2d'),T3=TCDS.THEMES[IMG_TH[r.theme]||'org'],rr=TCDS.rr;
  const g=c.createLinearGradient(0,0,S,S);g.addColorStop(0,T3[0]);g.addColorStop(.6,T3[1]);g.addColorStop(1,T3[2]);c.fillStyle=g;c.fillRect(0,0,S,S);
  const rg=c.createRadialGradient(S,0,0,S,0,760);rg.addColorStop(0,T3[3]+'55');rg.addColorStop(1,T3[3]+'00');c.fillStyle=rg;c.fillRect(0,0,S,S);
  const txt=(s,x,y,size,w,col,al='left')=>{c.font=`${w} ${size}px Sora,sans-serif`;c.fillStyle=col;c.textAlign=al;c.fillText(s,x,y)};
  txt('RIDE FORECAST',80,120,30,800,T3[3]);
  const nm=r.name.length>26?r.name.slice(0,25)+'…':r.name;txt(nm,80,196,62,800,'#fff');
  const dp=TCDS.dayParts(r.occ);txt(`${dp.day} ${dp.date} ${dp.mon} · ${TCDS.fmtTime(r.time)} · ${r.place}`,80,252,34,600,'#ffffffd9');
  if(!f){rr(c,80,330,920,300,36);c.fillStyle='#ffffff1f';c.fill();txt('🌤️',140,500,90,400,'#fff');
    txt('Forecast available',280,470,50,800,'#fff');txt('closer to the day',280,530,50,800,'#fff');txt('(up to 16 days ahead)',280,580,30,600,'#ffffffb3')}
  else{
    // score ring
    const cx=200,cy=430,R=104,col=f.sc>=80?'#22c55e':f.sc>=65?'#84cc16':f.sc>=50?'#eab308':'#ef4444';
    c.lineWidth=26;c.strokeStyle='#ffffff26';c.beginPath();c.arc(cx,cy,R,0,7);c.stroke();
    c.strokeStyle=col;c.lineCap='round';c.beginPath();c.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+f.sc/100*Math.PI*2);c.stroke();
    txt(String(f.sc),cx,cy+22,84,800,'#fff','center');txt(f.lab.toUpperCase(),cx,cy+R+50,28,800,'#fff','center');
    txt(f.tr,400,420,96,800,'#fff');txt(`feels up to ${f.feels}°C`,404,476,34,600,'#ffffffcc');
    // wind arrow
    const wx0=760,wy0=560;c.save();c.translate(wx0,wy0);c.rotate((f.mid.wind_direction_10m+180)*rad);c.fillStyle='#fff';c.beginPath();c.moveTo(0,-34);c.lineTo(20,12);c.lineTo(6,6);c.lineTo(6,34);c.lineTo(-6,34);c.lineTo(-6,6);c.lineTo(-20,12);c.closePath();c.fill();c.restore();
    txt(`${Math.round(f.w)} km/h ${f.dir}`,404,574,44,800,'#fff');
    const tiles=[['Gusts',`${f.gust} km/h`],['Humidity',`${f.hum}%`],['Rain',`${f.rain}%`],['UV',`${f.uv.toFixed(0)}`],['Sunrise',f.sunrise?f.sunrise.slice(11,16):'--']];
    tiles.forEach((t,i)=>{const x=80+i*188,y=640;rr(c,x,y,172,120,22);c.fillStyle='#ffffff1f';c.fill();txt(t[0].toUpperCase(),x+20,y+42,22,800,T3[3]);txt(t[1],x+20,y+94,36,800,'#fff')});
    // hourly strip
    const hs=f.hs.slice(0,5),cw=920/hs.length;rr(c,80,790,920,150,26);c.fillStyle='#00000026';c.fill();
    hs.forEach((x,i)=>{const X=80+cw*i+cw/2;txt(`${pad(x.hour)}:00`,X,836,26,700,'#ffffffcc','center');txt(`${Math.round(x.temperature_2m)}°`,X,884,40,800,'#fff','center');
      c.font='700 24px Sora,sans-serif';const lw=c.measureText(`${Math.round(x.wind_speed_10m)} km/h`).width;c.save();c.translate(X-lw/2-8,918);c.rotate((x.wind_direction_10m+180)*rad);c.fillStyle='#fff';c.beginPath();c.moveTo(0,-11);c.lineTo(7,5);c.lineTo(0,2);c.lineTo(-7,5);c.closePath();c.fill();c.restore();
      txt(`${Math.round(x.wind_speed_10m)} km/h`,X+10,926,24,700,'#ffffffcc','center')});
  }
  txt('Open-Meteo forecast for the ride time',80,1010,24,600,'#ffffff99');
  txt('thecyclistdubai.com',S-80,1010,26,700,'#ffffffcc','right');
  return cv}

/* ---------- render + share ---------- */
let CUR={};
function draw(target,src){const t=$(target),x=t.getContext('2d');x.clearRect(0,0,1080,1080);x.drawImage(src,0,0)}
function update(){const r=ride(),f=forecast(r);
  try{localStorage.setItem('tcd_org',JSON.stringify(Object.assign(Object.fromEntries(FIELDS.map(k=>[k,$(k).value])),{fRule:$('fRule').checked,color})))}catch(e){}
  const rc=TCDS.rideCard(Object.assign({},r,{theme:color==='org'?'org':color}),f,w=>`${Math.round(w)} km/h`),wc=weatherCard(r,f);
  draw('cvRide',rc);draw('cvWx',wc);const text=message(r,f);$('txt').textContent=text;
  $('fcNote').textContent=WX[TR().id]===null?'Forecast unavailable right now':f?`Forecast loaded · ride score ${f.sc}`:'Forecast comes closer to the day';
  CUR={r,f,rc,wc,text}}
function toast(m){const t=$('rToast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),3200)}
const fileName=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'ride';
$('bShare').onclick=async()=>{update();const {r,rc,wc,text}=CUR,base=fileName(r.name);
  const files=[TCDS.canvasFile(rc,`${base}-ride-card.png`),TCDS.canvasFile(wc,`${base}-weather.png`)];
  try{navigator.clipboard.writeText(text).catch(()=>{})}catch(e){}
  try{if(navigator.canShare&&navigator.canShare({files})){await navigator.share({files,text,title:r.name});toast('Shared ✔ Text also copied');return}
    if(navigator.share){await navigator.share({text,title:r.name});return}}catch(e){if(e.name==='AbortError')return}
  window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');toast('Opening WhatsApp · download the images to attach them')};
$('bCopy').onclick=()=>{update();try{navigator.clipboard.writeText(CUR.text).then(()=>toast('Text copied ✔'),()=>toast('Select the text below to copy'))}catch(e){toast('Select the text below to copy')}};
$('bSave').onclick=()=>{update();const base=fileName(CUR.r.name);[[CUR.rc,'ride-card'],[CUR.wc,'weather']].forEach(([cv,n],i)=>setTimeout(()=>{const a=document.createElement('a');a.href=cv.toDataURL('image/jpeg',.93);a.download=`${base}-${n}.jpg`;document.body.appendChild(a);a.click();a.remove()},i*400));toast('Downloading 2 images')};
(function tick(){const n=dubai();$('clk').textContent=`${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}`;setTimeout(tick,15000)})();
update();loadWx().then(update);
})();
