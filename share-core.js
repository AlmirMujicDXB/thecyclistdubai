/* TheCyclistDubai · shared ride-share code (homepage + ride pages)
   One place for the ride share message, the compact sponsor/event lines and the share images,
   so a ride shared from its card on the homepage or from its own ride page is identical.
   Needs site-data.js (window.SITE). Exposes window.TCDS. */
(function(){
const SITE=window.SITE||{links:{},sponsors:[],events:[],rides:[]};
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pad=n=>String(n).padStart(2,'0');
const dubaiToday=()=>{const d=new Date(Date.now()+4*3600e3);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`};
const tsOf=(d,t)=>Date.parse(`${d}T${t||'00:00'}:00+04:00`);
// site root (homepage) URL, also when called from a ride page
function root(){return /^https?:/.test(location.protocol)?location.origin+location.pathname.replace(/[^/]*$/,''):'https://thecyclistdubai.com/'}
function fmtTime(t){const [h,m]=t.split(':').map(Number);return `${(h%12)||12}:${pad(m)} ${h<12?'AM':'PM'}`}
function dayParts(d){const x=new Date(d+'T00:00Z');return{day:DAYS[x.getUTCDay()],date:x.getUTCDate(),mon:MONTHS[x.getUTCMonth()]}}
function occLabel(d){const l=dayParts(d),diff=Math.round((Date.parse(d+'T00:00Z')-Date.parse(dubaiToday()+'T00:00Z'))/864e5);
  return (diff===0?'Today '+l.day:diff===1?'Tomorrow '+l.day:l.day)+` ${l.date} ${l.mon}`}
function upcomingEvents(){return (SITE.events||[]).filter(e=>e.date&&Date.now()<tsOf(e.date,e.time)+12*36e5).sort((a,b)=>tsOf(a.date,a.time)-tsOf(b.date,b.time))}
const sameLink=(a,b)=>!!a&&!!b&&a.split('?')[0].replace(/\/$/,'')===b.split('?')[0].replace(/\/$/,'');
function rideRule(r){return 'rule' in r?(r.rule||''):(SITE.rideRule||'')}
function rideKind(r){const t=[r.type,r.distance].filter(Boolean).join(' · ');return t?`${/mtb|gravel/i.test(r.type||'')?'🚵':'🚴'} ${t}`:''}
function scoreLabel(s){return s>=80?'Excellent':s>=65?'Good':s>=50?'Fair':'Tough'}
function footerText(){return `\n📲 Live ride weather & forecast: ${root()}`+(SITE.links&&SITE.links.whatsappGroup?`\n👥 Join our WhatsApp group: ${SITE.links.whatsappGroup}`:'')}
// Ride shares go out with an image: WhatsApp keeps only 1,024 characters of text with a photo,
// so the promotions in ride shares use this compact format (all sponsors + all events, one line each).
function sponsorsShort(){const evU=new Set(upcomingEvents().map(e=>(e.url||'').replace(/\/$/,'')));const sp=(SITE.sponsors||[]).filter(x=>!evU.has((x.url||'').replace(/\/$/,'')));if(!sp.length)return'';
  return '\n🎁 *Sponsor codes*\n'+sp.map(x=>`• *${x.name}*: ${x.kind||'code'} *${x.code}*${x.discount?` ${x.discount}`:''} ${x.url}`).join('\n')+'\n'}
function eventLines(){return upcomingEvents().map(e=>`• *${e.short||e.name}* ${occLabel(e.date).replace(/^(Today|Tomorrow) /,'')}${e.distance?` · ${e.distance}`:''}${e.code?` · code *${e.code}*${e.discount?` ${e.discount}`:''}`:''} ${e.url}`)}
function eventsShort(){const ev=eventLines();if(!ev.length)return'';return '\n📅 *Events* · we ride 💪\n'+ev.join('\n')+'\n'}
// r = ride from site-data.js with r.occ (YYYY-MM-DD) and any one-off change merged in; f = forecast {txt} or null
function rideText(r,f){
  const t=`🚴‍♂️ *${r.name}* · group ride\n🗓️ ${occLabel(r.occ)} · ${fmtTime(r.time)}\n📍 ${r.start?`Start: ${r.start} · `:''}${r.place}\n`+(r.route?`🛣️ ${r.route}\n`:'')+(rideKind(r)?`${rideKind(r)}\n`:'')+(r.pace?`⚡ ${r.pace}\n`:'')+(rideRule(r)?`⛑️💡 ${rideRule(r)}\n`:'')+
    (f?`🌤️ Forecast: ${f.txt}\n`:'')+(r.join&&!sameLink(r.join,SITE.links&&SITE.links.whatsappGroup)?`✅ Join: ${r.join}\n`:'')+(r.location?`🗺️ Location: ${r.location}\n`:'')+(r.page?`📊 Ride page (map, wind, GPX): ${root()}${r.page}\n`:'')+sponsorsShort()+eventsShort()+footerText();
  return t.length>1010?t.replace('📲 Live ride weather & forecast: ','📲 ').replace('👥 Join our WhatsApp group: ','👥 ').replace(/\n🌤️ Forecast: [^\n]*/,''):t}

/* ---------- share images ---------- */
const THEMES={blue:['#0b1f4b','#123a8a','#1d4ed8','#38bdf8','#fbbf24'],green:['#052e16','#14532d','#16a34a','#bef264','#bef264'],strava:['#4a1500','#b33600','#fc4c02','#ffb080','#fff1e6'],orange:['#7c2d12','#c2410c','#f59e0b','#fde68a','#fde68a'],yellow:['#ffcf00','#ffe100','#fff16a','#ffffff','#d0001a'],lime:['#f2f2dc','#e4efcf','#c4d24c','#ffffff','#00482a'],purple:['#2e1065','#5b21b6','#a855f7','#e9d5ff','#f5d0fe'],rorange:['#7c2d12','#c2410c','#fb923c','#fed7aa','#fde68a'],sky:['#0c2d48','#0e5a8a','#0ea5e9','#bae6fd','#e0f2fe'],org:['#ffffff','#fffafa','#fff1f2','#ffffff','#e2001a'],giro:['#fff3f8','#ffd9e8','#f9aecd','#ffffff','#e6007e']};
const RIDE_TH={green:'green',purple:'purple',orange:'rorange',blue:'sky',org:'org',giro:'giro'};
const LIGHT={yellow:{ink:'#1f1a00',line:'rgba(31,26,0,.9)',route:'rgba(122,98,0,.25)',dot:'rgba(226,0,26,.3)',dow:'#e2001a',day:'#e2001a',mon:'#7a6200',t1:'#fff',chip:'rgba(255,255,255,.55)',chipT:'#3d3300'},
  giro:{ink:'#3b0a2a',line:'rgba(59,10,42,.92)',route:'rgba(230,0,126,.28)',dot:'rgba(230,0,126,.35)',dow:'#e6007e',day:'#3b0a2a',mon:'#e6007e',t1:'#fff',chip:'rgba(255,255,255,.8)',chipT:'#a1005a'},
  org:{ink:'#13233f',line:'rgba(19,35,63,.9)',route:'rgba(226,0,26,.25)',dot:'rgba(226,0,26,.35)',dow:'#e2001a',day:'#13233f',mon:'#e2001a',t1:'#fff',chip:'rgba(255,255,255,.92)',chipT:'#b00016'},
  lime:{ink:'#00482a',line:'rgba(0,72,42,.92)',route:'rgba(0,72,42,.2)',dot:'rgba(0,72,42,.22)',dow:'#6b8a12',day:'#00482a',mon:'#6b8a12',t1:'#e9f5a8',chip:'rgba(0,72,42,.1)',chipT:'#00482a'}};
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function wrapLines(c,t,max){const w=t.split(' ');const out=[];let line='';w.forEach(x=>{const tt=line?line+' '+x:x;if(c.measureText(tt).width>max&&line){out.push(line);line=x}else line=tt});if(line)out.push(line);return out}
// Tour de France King of the Mountains jersey: staggered red dots, fading out to the left so text stays readable
function polka(c,W,H,x0=260,a=.95){const g=c.createLinearGradient(x0,0,W,0);g.addColorStop(0,'rgba(226,0,26,0)');g.addColorStop(.5,`rgba(226,0,26,${a*.45})`);g.addColorStop(1,`rgba(226,0,26,${a})`);c.save();c.fillStyle=g;
  for(let r=0,y=20;y<H;y+=46,r++)for(let x=(r%2?23:0);x<W+30;x+=46){c.beginPath();c.arc(x,y,11,0,7);c.fill()}c.restore()}
// Giro d'Italia: maglia rosa with fine white pinstripes sweeping in from the right
function giroLines(c,W,H,x0=420){c.save();const g=c.createLinearGradient(x0,0,W,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.75)');c.strokeStyle=g;c.lineWidth=5;
  for(let x=x0-H;x<W+40;x+=34){c.beginPath();c.moveTo(x,H);c.lineTo(x+H*.75,0);c.stroke()}
  const g2=c.createLinearGradient(x0,0,W,0);g2.addColorStop(0,'rgba(230,0,126,0)');g2.addColorStop(1,'rgba(230,0,126,.35)');c.strokeStyle=g2;c.lineWidth=3;for(let x=x0-H+17;x<W+40;x+=68){c.beginPath();c.moveTo(x,H);c.lineTo(x+H*.75,0);c.stroke()}c.restore()}
function drawCard({theme,dow,day,mon,tags,title,lines}){
  const S2=1080,c0=document.createElement('canvas');c0.width=S2;c0.height=S2;const c=c0.getContext('2d'),T3=THEMES[theme],dk=LIGHT[theme],ink=dk?dk.ink:'#fff';
  const g=c.createLinearGradient(0,0,S2,S2);g.addColorStop(0,T3[0]);g.addColorStop(.55,T3[1]);g.addColorStop(1,T3[2]);c.fillStyle=g;c.fillRect(0,0,S2,S2);
  const rg=c.createRadialGradient(S2,0,0,S2,0,700);rg.addColorStop(0,T3[3]+'55');rg.addColorStop(1,T3[3]+'00');c.fillStyle=rg;c.fillRect(0,0,S2,S2);
  if(theme==='yellow'){c.save();const g=c.createLinearGradient(360,0,1080,0);g.addColorStop(0,'rgba(226,0,26,0)');g.addColorStop(.75,'rgba(226,0,26,.95)');c.fillStyle=g;for(let r=0,y=186;y<=322;y+=34,r++)for(let x=360+(r%2?17:0);x<1070;x+=34){c.beginPath();c.arc(x,y,8,0,7);c.fill()}c.restore()}
  if(theme==='org')polka(c,S2,S2-110,600,.85);
  if(theme==='giro')giroLines(c,S2,S2-110,560);
  if(theme==='lime'){c.save();[[760,60,'rgba(181,204,74,.75)'],[836,30,'rgba(0,72,42,.9)'],[882,84,'rgba(196,210,76,.85)'],[982,24,'rgba(12,75,62,.75)'],[1022,58,'rgba(181,204,74,.6)']].forEach(([x,w,col])=>{c.fillStyle=col;c.beginPath();c.moveTo(x,970);c.lineTo(x+w,970);c.lineTo(x+w+300,600);c.lineTo(x+300,600);c.closePath();c.fill()});c.restore()}
  c.strokeStyle=dk?dk.route:'rgba(255,255,255,.18)';c.lineWidth=8;c.setLineDash([4,22]);c.lineCap='round';c.beginPath();c.moveTo(-20,860);c.bezierCurveTo(260,620,520,900,760,700);c.bezierCurveTo(900,590,1000,620,1100,560);c.stroke();c.setLineDash([]);
  [[-20,860],[760,700],[1100,560]].forEach(([x,y])=>{c.fillStyle=dk?dk.dot:'rgba(255,255,255,.35)';c.beginPath();c.arc(x,y,14,0,7);c.fill()});
  c.fillStyle='#fff';rr(c,80,90,220,240,34);c.fill();if(theme==='org'||theme==='giro'){c.strokeStyle=theme==='giro'?'#e6007e':'#e2001a';c.lineWidth=6;c.stroke()}c.textAlign='center';
  c.fillStyle=dk?dk.dow:'#dc2626';c.font='800 34px Sora,sans-serif';c.fillText(dow,190,150);
  c.fillStyle=dk?dk.day:T3[0];c.font='800 104px Sora,sans-serif';c.fillText(day,190,258);c.fillStyle=dk?dk.mon:'#64748b';c.font='800 32px Sora,sans-serif';c.fillText(mon,190,305);c.textAlign='left';
  let tx=340,ty=130;c.font='800 28px Sora,sans-serif';tags.forEach((t,k)=>{const w=c.measureText(t).width+36;if(tx+w>1010){tx=340;ty+=62}
    c.fillStyle=k===0?T3[4]:dk?dk.chip:'rgba(255,255,255,.16)';rr(c,tx,ty-38,w,52,12);c.fill();c.fillStyle=k===0?(dk?dk.t1:T3[0]):dk?dk.chipT:ink;c.fillText(t,tx+18,ty-2);tx+=w+14});
  c.fillStyle=ink;c.font='800 72px Sora,sans-serif';let y=420;wrapLines(c,title,920).slice(0,3).forEach(l=>{c.fillText(l,80,y);y+=86});
  y+=20;c.font='600 40px Sora,sans-serif';lines.filter(Boolean).forEach(l=>{wrapLines(c,l,920).slice(0,2).forEach(x=>{c.fillStyle=dk?dk.line:'rgba(255,255,255,.92)';c.fillText(x,80,y);y+=58});y+=6});
  const bg=c.createLinearGradient(0,0,S2,0);if(theme==='strava'){bg.addColorStop(0,'#2a0c00');bg.addColorStop(.5,'#4a1500');bg.addColorStop(1,'#7a2400')}else if(theme==='giro'){bg.addColorStop(0,'#8a0049');bg.addColorStop(.5,'#d4006f');bg.addColorStop(1,'#ff4fa3')}else if(theme==='org'){bg.addColorStop(0,'#9f0014');bg.addColorStop(.5,'#d0001a');bg.addColorStop(1,'#ff2d45')}else if(theme==='purple'||theme==='rorange'||theme==='sky'){bg.addColorStop(0,T3[0]);bg.addColorStop(.5,T3[1]);bg.addColorStop(1,T3[2])}else{bg.addColorStop(0,'#052e16');bg.addColorStop(.5,'#14532d');bg.addColorStop(1,'#16a34a')}c.fillStyle=bg;c.fillRect(0,S2-110,S2,110);
  c.fillStyle='#fff';c.font='800 44px Sora,sans-serif';c.fillText('TheCyclist',60,S2-42);const w2=c.measureText('TheCyclist').width;c.fillStyle=theme==='strava'?'#ffd2b8':theme==='org'?'#ffd6da':theme==='giro'?'#ffd1e3':(theme==='purple'||theme==='rorange'||theme==='sky')?T3[3]:'#bef264';c.fillText('Dubai',60+w2,S2-42);
  c.fillStyle=theme==='org'?'#ffe4e6':theme==='giro'?'#ffe1ee':'#dcfce7';c.font='600 28px Sora,sans-serif';const rt=root().replace(/^https?:\/\//,'').replace(/\/$/,'');c.fillText(rt,S2-60-c.measureText(rt).width,S2-46);
  return c0}
// share image of a ride; wind(w) formats the forecast wind (homepage: the visitor's unit; ride pages: km/h)
function rideCard(r,f,wind){const l=dayParts(r.occ);
  return drawCard({theme:RIDE_TH[r.theme]||'green',dow:l.day.toUpperCase(),day:String(l.date),mon:l.mon.toUpperCase(),tags:['★ Group ride',rideKind(r),r.pace?'⚡ '+r.pace:''].filter(Boolean),title:`${r.name} · ${fmtTime(r.time)}`,
    lines:[r.start&&`📍 Start: ${r.start}`,r.route&&`🛣️ ${r.route}`,`🗺️ ${r.place}`,f&&`🌤️ ${f.tr} · ${wind(f.w)} ${f.dir} · score ${f.sc}`,rideRule(r)&&`⛑️💡 ${rideRule(r)}`,r.joinLine||'👥 Join via the WhatsApp group']})}

/* ---------- big ride image (1080×1350): ride + forecast + track shape coloured by wind ---------- */
const rad=Math.PI/180,pad2=n=>String(n).padStart(2,'0'),KCOL={head:'#dc2626',tail:'#16a34a',cross:'#eab308'},DIRN={cw:'Clockwise',ccw:'Anticlockwise'};
const CARD16=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'],card16=d=>CARD16[Math.round(((d%360)+360)%360/22.5)%16];
const hav=(a,b)=>{const p1=a[0]*rad,p2=b[0]*rad,dp=p2-p1,dl=(b[1]-a[1])*rad;return 2*6371e3*Math.asin(Math.sqrt(Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2))};
const brg=(a,b)=>{const p1=a[0]*rad,p2=b[0]*rad,dl=(b[1]-a[1])*rad;return(Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))/rad+360)%360};
function fitter(pts,x,y,w,h,pd){const k=Math.cos(pts[0][0]*rad);let a=1e9,b=-1e9,c=1e9,d=-1e9;pts.forEach(q=>{const X=q[1]*k,Y=q[0];a=Math.min(a,X);b=Math.max(b,X);c=Math.min(c,Y);d=Math.max(d,Y)});
  const sc=Math.min((w-2*pd)/((b-a)||1e-6),(h-2*pd)/((d-c)||1e-6)),ox=x+(w-(b-a)*sc)/2,oy=y+(h-(d-c)*sc)/2;return q=>[ox+(q[1]*k-a)*sc,oy+(d-q[0])*sc]}
function arrowsAt(p,fr){const L=p.cum[p.cum.length-1];return fr.map(f=>{let i=p.cum.findIndex(c=>c>=f*L);i=Math.max(1,Math.min(p.pts.length-1,i));return[i,brg(p.pts[i-1],p.pts[i])]})}
const fmtDur=m=>`${Math.floor(m/60)}h ${pad2(Math.round(m%60))}m`;
function mkRoute(p,pts){pts=pts||p.pts;const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+hav(pts[i-1],pts[i]));
  let ti=0;if(p.turn){let best=0;pts.forEach((q,i)=>{const d=hav(pts[0],q);if(d>best){best=d;ti=i}})}return Object.assign({},p,{pts,cum,ti})}
function wxScore(w){let s=100;s-=Math.max(0,w.wind_speed_10m-12)*1.6;s-=Math.max(0,w.wind_gusts_10m-30)*.8;s-=Math.max(0,w.apparent_temperature-30)*3;s-=Math.max(0,16-w.apparent_temperature)*2.5;s-=(w.precipitation_probability||0)*.4;s-=Math.max(0,(w.relative_humidity_2m||0)-80)*.4;return Math.max(5,Math.min(100,Math.round(s)))}
// forecast for the ride window from an hourly map H['YYYY-MM-DDTHH:00'] (Open-Meteo field names)
function windowForecast(H,D,occ,time,km,pace){const h=+time.slice(0,2),hrs=Math.max(2,Math.min(6,Math.ceil(km/(pace||25)+.25))),hs=[];
  for(let k=0;k<=hrs;k++){const hh=h+k;if(hh>23)break;const x=H[`${occ}T${pad2(hh)}:00`];if(x)hs.push(Object.assign({hour:hh},x))}
  if(!hs.length)return null;const temps=hs.map(x=>x.temperature_2m),lo=Math.round(Math.min(...temps)),hi=Math.round(Math.max(...temps)),w=hs.reduce((a,x)=>a+x.wind_speed_10m,0)/hs.length;
  const sc=Math.round(hs.reduce((a,x)=>a+wxScore(x),0)/hs.length),mid=hs[Math.floor(hs.length/2)],dir=card16(mid.wind_direction_10m),lab=scoreLabel(sc),tr=lo===hi?`${lo}°C`:`${lo}–${hi}°C`;
  return{tr,w,dir,sc,lab,hs,mid,gust:Math.round(Math.max(...hs.map(x=>x.wind_gusts_10m))),hum:Math.round(hs.reduce((a,x)=>a+x.relative_humidity_2m,0)/hs.length),
    rain:Math.round(Math.max(...hs.map(x=>x.precipitation_probability||0))),uv:Math.max(...hs.map(x=>x.uv_index||0)),feels:Math.round(Math.max(...hs.map(x=>x.apparent_temperature))),
    sunrise:((D||{})[occ]||{}).sunrise,txt:`${tr}, wind ${Math.round(w)} km/h ${dir}, ride score ${sc} (${lab})`}}
// head/tail/cross wind for each part of a route, at the time the group gets there (start + distance / pace, + stop at the turnaround)
function windKinds(p,H,occ,time,pace,stopMin=0){const h=+time.slice(0,2),m=+time.slice(3,5),kinds=[],acc={head:0,tail:0,cross:0};let first=null;
  for(let i=1;i<p.pts.length;i++){const mins=h*60+m+p.cum[i-1]/1000/pace*60+(p.turn&&i>p.ti?stopMin:0),hh=Math.min(23,Math.floor(mins/60)),w=H[`${occ}T${pad2(hh)}:00`];if(!w)return null;if(!first)first=w;
    const a=Math.abs(((w.wind_direction_10m-brg(p.pts[i-1],p.pts[i]))%360+540)%360-180),k=a<=60?'head':a>=120?'tail':'cross';kinds.push(k);acc[k]+=p.cum[i]-p.cum[i-1]}
  const L=p.cum[p.cum.length-1],pc=k=>Math.round(acc[k]/L*100);return{kinds,head:pc('head'),tail:pc('tail'),cross:pc('cross'),start:first}}
// Al Qudra hourly forecast, fetched once per page so a share can draw synchronously (keeps the tap's share permission)
let WXA=null,WXP=null;
function loadWx(lat=24.93,lon=55.33){if(WXP)return WXP;WXP=fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,precipitation_probability&daily=sunrise,sunset&timezone=Asia%2FDubai&forecast_days=16&wind_speed_unit=kmh`)
  .then(r=>r.json()).then(j=>{const H={};j.hourly.time.forEach((tm,i)=>{const o={};for(const k in j.hourly)o[k]=j.hourly[k][i];H[tm]=o});const D={};(j.daily.time||[]).forEach((d,i)=>D[d]={sunrise:j.daily.sunrise[i]});WXA={H,D};return WXA}).catch(()=>null);return WXP}
// the big share image for a group ride from site-data.js (homepage + ride pages): track from route-presets.js (r.preset), wind-coloured
function rideImage(r,fPage,wxIn){const pace=parseFloat(r.pace)||28,km=parseFloat(r.distance)||0,wx=wxIn||WXA,P=(window.ROUTE_PRESETS||[]).find(x=>x.id===r.preset),route=P?mkRoute(P):null;
  let f=wx?windowForecast(wx.H,wx.D,r.occ,r.time,km,pace):null;if(f&&fPage)Object.assign(f,{tr:fPage.tr,sc:fPage.sc,lab:fPage.lab});
  const wi=route&&wx?windKinds(route,wx.H,r.occ,r.time,pace,r.stopMin||0):null;
  return shareCard(Object.assign({},r,{theme:r.theme||'green',rule:rideRule(r),joinLine:r.joinLine||'👥 Join via the WhatsApp group'}),f,wi,route,pace,r.stopMin||0)}
/* ---------- ONE share image (1080×1350): ride card + forecast + route in one picture ---------- */
// jersey colours: Tour de France (yellow, green, polka dots, white), Giro (maglia rosa), Vuelta (la roja)
const JERSEY={
  green:{name:'TCD green',bg:['#052e16','#14532d','#16a34a'],ink:'#fff',sub:'#ffffffd9',acc:'#bef264',bar:['#031d0e','#052e16','#14532d'],dubai:'#bef264'},
  purple:{name:'Purple',bg:['#2e1065','#5b21b6','#a855f7'],ink:'#fff',sub:'#ffffffd9',acc:'#e9d5ff',bar:['#1e0a45','#2e1065','#4c1d95'],dubai:'#e9d5ff'},
  orange:{name:'Orange',bg:['#7c2d12','#c2410c','#fb923c'],ink:'#fff',sub:'#ffffffd9',acc:'#fed7aa',bar:['#4a1a0a','#7c2d12','#9a3412'],dubai:'#fed7aa'},
  jaune:{name:'Maillot jaune',bg:['#ffd400','#ffe100','#fff16a'],light:1,ink:'#1f1a00',sub:'#5c4a00',acc:'#8a6d00',bar:['#2b2200','#3d3200','#5a4700'],dubai:'#ffe100'},
  vert:{name:'Maillot vert',bg:['#00843d','#00a650','#3cc46e'],ink:'#fff',sub:'#ffffffd9',acc:'#d9ffe6',bar:['#004d25','#00622f','#00843d'],dubai:'#b9f5cf'},
  pois:{name:'Maillot à pois',bg:['#ffffff','#fffafa','#fff1f2'],light:1,ink:'#13233f',sub:'#3b4a60',acc:'#e2001a',bar:['#9f0014','#d0001a','#ff2d45'],dubai:'#ffd6da',pat:'polka'},
  blanc:{name:'Maillot blanc',bg:['#ffffff','#f6f7f9','#e9edf2'],light:1,ink:'#13233f',sub:'#475569',acc:'#64748b',bar:['#13233f','#24365a','#3a4f78'],dubai:'#cfd8e6'},
  rosa:{name:'Maglia rosa',bg:['#fff3f8','#ffd9e8','#f9aecd'],light:1,ink:'#3b0a2a',sub:'#6b2a52',acc:'#e6007e',bar:['#8a0049','#d4006f','#ff4fa3'],dubai:'#ffd1e3',pat:'giro'},
  roja:{name:'La Roja',bg:['#9e001d','#d50032','#ff2d55'],ink:'#fff',sub:'#ffffffd9',acc:'#ffd1da',bar:['#5e0011','#7f0018','#a8001f'],dubai:'#ffc2cc'}};
function shareCard(r,f,wi,p,pace,stopMin=0,net=null){const W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d'),J=JERSEY[r.theme]||JERSEY.jaune;
  const txt=(s,x,y,size,w,col,al='left',max)=>{c.font=`${w} ${size}px Sora,sans-serif`;c.fillStyle=col;c.textAlign=al;if(max)while(c.measureText(s).width>max&&s.length>4)s=s.slice(0,-2).trimEnd()+'…';c.fillText(s,x,y)};
  const PANEL=J.light?'rgba(255,255,255,.9)':'rgba(255,255,255,.14)',STROKE=J.light?'rgba(19,35,63,.12)':'rgba(255,255,255,.28)';
  const panel=(x,y,w,h,rad,fill=PANEL,st=STROKE)=>{rr(c,x,y,w,h,rad);c.fillStyle=fill;c.fill();c.strokeStyle=st;c.lineWidth=2;c.stroke()};
  // background + jersey pattern
  const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,J.bg[0]);g.addColorStop(.55,J.bg[1]);g.addColorStop(1,J.bg[2]);c.fillStyle=g;c.fillRect(0,0,W,H);
  if(J.pat==='polka')polka(c,W,420,560,.85);else if(J.pat==='giro')giroLines(c,W,420,520);
  else{c.save();c.strokeStyle=J.light?'rgba(255,255,255,.55)':'rgba(255,255,255,.08)';c.lineWidth=4;for(let x=380;x<W+400;x+=40){c.beginPath();c.moveTo(x,420);c.lineTo(x+300,0);c.stroke()}c.restore()}
  // date tile
  const dp=dayParts(r.occ);rr(c,64,64,200,214,30);c.fillStyle='#fff';c.fill();c.strokeStyle=J.light&&J.acc!=='#64748b'?J.acc:'rgba(19,35,63,.15)';c.lineWidth=5;c.stroke();
  txt(dp.day.toUpperCase(),164,118,32,800,'#e2001a','center');txt(String(dp.date),164,214,94,800,'#13233f','center');txt(dp.mon.toUpperCase(),164,258,30,800,'#64748b','center');
  // chips
  let cx=296;c.font='800 26px Sora,sans-serif';['★ Group ride',rideKind(r),r.pace?'⚡ '+r.pace:''].filter(Boolean).forEach((t,k)=>{const w=c.measureText(t).width+34;
    rr(c,cx,70,w,48,12);c.fillStyle=k===0?(J.light?J.ink:'#fff'):(J.light?'rgba(255,255,255,.8)':'rgba(255,255,255,.18)');c.fill();txt(t,cx+17,103,26,800,k===0?(J.light?'#fff':J.bg[1]):J.ink);cx+=w+12});
  // title
  c.font='800 62px Sora,sans-serif';const tl=wrapLines(c,r.name,720).slice(0,2);tl.forEach((l,i)=>txt(l,296,186+i*68,62,800,J.ink));
  txt(`${fmtTime(r.time)} · ${r.place}`,296,186+tl.length*68+(tl.length>1?-8:0),40,700,J.sub);
  const info=[r.start&&`📍 Start: ${r.start}`,r.route&&`🛣️ ${r.route}`].filter(Boolean).join('   ');txt(info,64,340,30,700,J.ink,'left',952);
  // middle: map (ready route) or facts (own route) | weather
  const km=parseFloat(r.distance)||0,mins=km/pace*60,[hh,mm]=r.time.split(':').map(Number),back=hh*60+mm+mins+stopMin,backT=km?fmtTime(`${pad(Math.floor(back/60)%24)}:${pad(Math.round(back%60)%60)}`):'--';
  const MY=380,MH=520;
  if(p){panel(64,MY,600,MH,28,'#ffffff',STROKE);const P=fitter(p.pts,64,MY,600,MH-70,44),xy=p.pts.map(P);c.lineJoin=c.lineCap='round';
    c.strokeStyle='#e5e7eb';c.lineWidth=20;c.beginPath();xy.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();
    // out & back: draw each direction in its own lane (offset to the right of travel) so the way out and the way back both show their wind
    const off=p.turn?7:0;for(let i=1;i<xy.length;i++){const A=xy[i-1],B=xy[i],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1,ox=-dy/L*off,oy=dx/L*off;
      c.strokeStyle=wi?KCOL[wi.kinds[i-1]]:'#fc4c02';c.lineWidth=off?8:10;c.beginPath();c.moveTo(A[0]-ox,A[1]-oy);c.lineTo(B[0]-ox,B[1]-oy);c.stroke()}
    if(p.dir)arrowsAt(p,[.2,.45,.7,.88]).forEach(([i,b])=>{const q=xy[i];c.save();c.translate(q[0],q[1]);c.rotate(b*rad);c.fillStyle='#13233f';c.strokeStyle='#fff';c.lineWidth=4;c.beginPath();c.moveTo(0,-16);c.lineTo(12,10);c.lineTo(-12,10);c.closePath();c.stroke();c.fill();c.restore()});
    const dot=(q,col,t)=>{c.fillStyle=col;c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.arc(q[0],q[1],18,0,7);c.fill();c.stroke();txt(t,q[0],q[1]+8,22,800,'#fff','center')};
    if(p.turn)dot(xy[p.ti],'#13233f','T');dot(xy[0],'#16a34a','S');
    // wind-on-route legend (or ride facts if no forecast yet)
    const ly=MY+MH-28;if(wi)[['head','Head',wi.head],['tail','Tail',wi.tail],['cross','Cross',wi.cross]].forEach(([k,l,v],i)=>{const x=92+i*186;c.fillStyle=KCOL[k];rr(c,x,ly-16,26,13,6);c.fill();txt(`${l} ${v}%`,x+34,ly-3,22,800,'#13233f')});
    else txt(p.dir?`${DIRN[p.dir]} · ${p.km} km · ${p.gain} m`:`${p.km} km · ${p.gain} m climb`,92,ly-3,22,800,'#13233f')}
  else if(net&&net.lines&&net.lines.length){panel(64,MY,600,MH,28,'#ffffff',STROKE);const all=[].concat(...net.lines),P=fitter(all,64,MY,600,MH-70,40);c.lineJoin=c.lineCap='round';
    c.strokeStyle='#e5e7eb';c.lineWidth=12;net.lines.forEach(l=>{c.beginPath();l.forEach((q,i)=>{const z=P(q);i?c.lineTo(z[0],z[1]):c.moveTo(z[0],z[1])});c.stroke()});
    const wd=net.windDir;net.lines.forEach(l=>{for(let i=1;i<l.length;i++){const A=P(l[i-1]),B=P(l[i]);let col='#fc4c02';if(wd!=null){const a=Math.abs(((wd-brg(l[i-1],l[i]))%360+540)%360-180);col=a<45||a>135?KCOL.head:KCOL.cross}
      c.strokeStyle=col;c.lineWidth=6;c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.stroke()}});
    if(net.start){const z=P(net.start);c.fillStyle='#16a34a';c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.arc(z[0],z[1],18,0,7);c.fill();c.stroke();txt('S',z[0],z[1]+8,22,800,'#fff','center')}
    const ly=MY+MH-28;if(wd!=null)[['head','Along the wind'],['cross','Crosswind']].forEach(([k,l],i)=>{const x=92+i*250;c.fillStyle=KCOL[k];rr(c,x,ly-16,26,13,6);c.fill();txt(l,x+34,ly-3,22,800,'#13233f')});
    else txt(net.name||r.place,92,ly-3,22,800,'#13233f')}
  else{[['Distance',km?`${km} km`:'--'],['Pace',`${pace} km/h`],['Ride time',km?fmtDur(mins):'--'],['Back at',backT]].forEach(([l,v],i)=>{const x=64+(i%2)*306,y=MY+Math.floor(i/2)*266;panel(x,y,294,250,26);
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
  if(f){const hs=f.hs.slice(0,6),cw=952/hs.length;hs.forEach((x,i)=>{const X=64+cw*i+cw/2;txt(fmtTime(`${pad(x.hour)}:00`).replace(':00',''),X,SY+40,22,800,J.acc,'center');txt(`${Math.round(x.temperature_2m)}°`,X,SY+86,36,800,J.ink,'center');
      c.save();c.translate(X-46,SY+113);c.rotate((x.wind_direction_10m+180)*rad);c.fillStyle=J.ink;c.beginPath();c.moveTo(0,-9);c.lineTo(6,5);c.lineTo(0,2);c.lineTo(-6,5);c.closePath();c.fill();c.restore();txt(`${Math.round(x.wind_speed_10m)} km/h`,X+8,SY+121,21,700,J.sub,'center')})}
  else txt('Hour-by-hour forecast appears up to 16 days before the ride',540,SY+80,24,700,J.sub,'center');
  // ride facts row (ready route)
  const FY=SY+160,facts=p?[['Distance',`${p.km} km`],['Climb',`${p.gain} m`],['Ride time',fmtDur(mins)],['Back at',backT]]:net&&net.lines&&net.lines.length?[['Distance',km?`${km} km`:'--'],['Avg speed',`${pace} km/h`],['Ride time',km?fmtDur(mins):'--'],['Back at',backT]]:[['Type',r.type||'Ride'],['Start',r.start||r.place],['Organiser',r.org||'Open ride'],['Ride score',f?`${f.sc} / 100`:'--']];
  facts.forEach(([l,v],i)=>{const x=64+i*242;panel(x,FY,226,100,22);txt(l.toUpperCase(),x+22,FY+38,20,800,J.acc);txt(v,x+22,FY+80,30,800,J.ink,'left',190)});
  // rule + who line
  txt([r.rule&&`⛑️💡 ${r.rule}`,r.joinLine].filter(Boolean).join('   '),64,FY+150,26,700,J.ink,'left',952);
  // brand bar
  const bg=c.createLinearGradient(0,0,W,0);bg.addColorStop(0,J.bar[0]);bg.addColorStop(.5,J.bar[1]);bg.addColorStop(1,J.bar[2]);c.fillStyle=bg;c.fillRect(0,H-90,W,90);
  c.font='800 38px Sora,sans-serif';c.textAlign='left';c.fillStyle='#fff';c.fillText('TheCyclist',56,H-32);const w2=c.measureText('TheCyclist').width;c.fillStyle=J.dubai;c.fillText('Dubai',56+w2,H-32);
  txt('thecyclistdubai.com',W-56,H-34,28,700,'#fff','right');
  return cv}

// ONE share flow for every page: share sheet with the image + text where the device supports files (phones),
// otherwise (laptops) a dialog with the SAME image and text: Copy image · Copy text · Download · WhatsApp
function copyTxt(t){try{navigator.clipboard.writeText(t).catch(()=>{})}catch(e){}}
function share(file,text,title,toast=()=>{}){copyTxt(text);
  try{if(file&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],text,title}).then(()=>toast('Shared ✔ Text also copied, paste it if the app drops it')).catch(e=>{if(e.name!=='AbortError')shareDialog(file,text,toast)});return}}catch(e){}
  shareDialog(file,text,toast)}
function shareDialog(file,text,toast){let m=document.getElementById('tcdShare');
  if(!m){m=document.createElement('div');m.id='tcdShare';m.innerHTML=`<style>#tcdShare{position:fixed;inset:0;z-index:5000;background:#13233f99;display:none;place-items:center;padding:14px;font-family:Sora,system-ui,sans-serif}
#tcdShare .bx{background:#fff;border-radius:18px;max-width:760px;width:100%;max-height:calc(100vh - 28px);overflow:auto;display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:16px;padding:16px;box-shadow:0 20px 50px #0005;position:relative}
#tcdShare img{width:100%;border-radius:12px;box-shadow:0 6px 18px #0002}#tcdShare h3{margin:0 0 6px;font-size:17px;color:#13233f}#tcdShare p{margin:0 0 10px;font-size:12.5px;color:#5b6b80}
#tcdShare pre{white-space:pre-wrap;font:500 11.5px/1.45 'JetBrains Mono',monospace;background:#f6f7f9;border-radius:10px;padding:9px;max-height:210px;overflow:auto;margin:0 0 10px;color:#13233f}
#tcdShare .bs{display:grid;grid-template-columns:1fr 1fr;gap:8px}#tcdShare .bs a,#tcdShare .bs button{height:40px;border-radius:10px;border:1px solid #e2e5ea;background:#fff;font:800 13px Sora,sans-serif;color:#13233f;cursor:pointer;display:flex;align-items:center;justify-content:center;text-decoration:none}
#tcdShare .bs .wa{background:#25d366;border-color:#25d366;color:#fff;grid-column:1/-1}#tcdShare .x{position:absolute;right:10px;top:8px;border:0;background:#f1f3f5;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer}
@media(max-width:620px){#tcdShare .bx{grid-template-columns:1fr}#tcdShare img{max-width:260px;margin:0 auto;display:block}}</style>
<div class="bx"><button class="x" aria-label="Close">×</button><div><img alt="Share image"></div><div><h3>Share this ride</h3><p>Same image and text as on the phone. Copy the image and paste it in WhatsApp Web, then paste the text, or download the image.</p><pre></pre>
<div class="bs"><button class="ci">🖼️ Copy image</button><button class="ct">📋 Copy text</button><a class="dl">⬇️ Download image</a><button class="ns">↗ Share…</button><a class="wa" target="_blank" rel="noopener">Open WhatsApp with the text</a></div></div></div>`;
    document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.classList.contains('x'))m.style.display='none'})}
  const u=file?URL.createObjectURL(file):'';m.querySelector('img').src=u;m.querySelector('img').style.display=file?'':'none';m.querySelector('pre').textContent=text;
  const dl=m.querySelector('.dl');dl.href=u;dl.download=file?file.name:'';dl.style.display=file?'':'none';
  m.querySelector('.wa').href='https://wa.me/?text='+encodeURIComponent(text);
  m.querySelector('.ct').onclick=()=>{copyTxt(text);toast('Text copied ✔')};
  const ci=m.querySelector('.ci');ci.style.display=file&&window.ClipboardItem?'':'none';ci.onclick=()=>{navigator.clipboard.write([new ClipboardItem({[file.type]:file})]).then(()=>toast('Image copied ✔ Paste it in the chat'),()=>toast('Copy not allowed here: download the image'))};
  const ns=m.querySelector('.ns');ns.style.display=navigator.share?'':'none';ns.onclick=()=>navigator.share({text}).catch(()=>{});
  m.style.display='grid'}
function canvasFile(cv,name){const d=cv.toDataURL('image/png'),b=atob(d.split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new File([u],name,{type:'image/png'})}
window.TCDS={share,shareDialog,shareCard,rideImage,loadWx,windowForecast,windKinds,mkRoute,JERSEY,giroLines,polka,root,eventLines,dayParts,fmtTime,occLabel,upcomingEvents,sameLink,rideRule,rideKind,scoreLabel,footerText,sponsorsShort,eventsShort,rideText,THEMES,RIDE_TH,LIGHT,rr,wrapLines,drawCard,rideCard,canvasFile};
})();
// prefetch the forecast for the big ride image (not on the organizer page, which loads its own)
if(!/organize-ride/.test(location.pathname))setTimeout(()=>window.TCDS&&TCDS.loadWx(),400);
