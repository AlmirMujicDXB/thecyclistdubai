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
function canvasFile(cv,name){const d=cv.toDataURL('image/png'),b=atob(d.split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new File([u],name,{type:'image/png'})}
window.TCDS={giroLines,polka,root,eventLines,dayParts,fmtTime,occLabel,upcomingEvents,sameLink,rideRule,rideKind,scoreLabel,footerText,sponsorsShort,eventsShort,rideText,THEMES,RIDE_TH,LIGHT,rr,wrapLines,drawCard,rideCard,canvasFile};
})();
