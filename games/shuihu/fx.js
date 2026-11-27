'use strict';
// 特效层：盖在整个画面上的一层（不随战斗画面重绘而消失）。canvas 粒子 + 黑底发光图（screen 混合）+ 几个 DOM 小件。
// game.js 只调用 SHFX.cast / hits / show / banner 等；window.__fast 时全部跳过。
(()=>{
const L=document.createElement('div');L.id='fxl';document.body.appendChild(L);
const cv=document.createElement('canvas');L.appendChild(cv);const g=cv.getContext('2d');
let W=0,H=0,P=[],raf=0,last=0;
const fit=()=>{const d=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*d;cv.height=H*d;g.setTransform(d,0,0,d,0,0);};addEventListener('resize',fit);fit();
const off=()=>!!window.__fast,R=(a,b)=>a+Math.random()*(b-a),T=(f,ms)=>setTimeout(f,ms),pickOf=a=>a[Math.floor(Math.random()*a.length)];
const add=(html,ms)=>{const d=document.createElement('div');d.innerHTML=html.trim();const e=d.firstChild;L.appendChild(e);if(ms)T(()=>e.remove(),ms);return e;};
const anim=(e,kf,ms,o)=>e.animate(kf,Object.assign({duration:ms,fill:'both',easing:'ease-out'},o||{}));

// ---- 声音（WebAudio 合成）----
const FX={audio:()=>null};
function osc(f,d,type,v,slide,delay){const A=FX.audio();if(!A)return;const t=A.currentTime+(delay||0),o=A.createOscillator(),q=A.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(25,f+slide),t+d);q.gain.setValueAtTime(v,t);q.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(q);q.connect(A.destination);o.start(t);o.stop(t+d+.02);}
let NB=null;function noise(d,v,type,f0,f1,delay){const A=FX.audio();if(!A)return;if(!NB){NB=A.createBuffer(1,A.sampleRate*2,A.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}
  const t=A.currentTime+(delay||0),s=A.createBufferSource(),fl=A.createBiquadFilter(),q=A.createGain();s.buffer=NB;s.loop=true;fl.type=type||'lowpass';fl.frequency.setValueAtTime(f0,t);if(f1)fl.frequency.exponentialRampToValueAtTime(f1,t+d);q.gain.setValueAtTime(v,t);q.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl);fl.connect(q);q.connect(A.destination);s.start(t,Math.random());s.stop(t+d+.02);}
const SND={
  thunder:()=>{noise(.9,.22,'lowpass',2400,90);osc(70,.8,'sine',.16,-35);noise(.12,.2,'highpass',3000,0);},
  whoosh:()=>noise(.32,.1,'bandpass',500,3200),
  boom:()=>{osc(95,.55,'sine',.22,-60);noise(.5,.2,'lowpass',1400,80);},
  gong:()=>[196,293.7,441,587].forEach((f,i)=>osc(f,1.3-i*.2,'sine',.07-i*.012)),
  ring:()=>{osc(1900,.3,'triangle',.05,-700);noise(.05,.1,'highpass',5000,0);},
  punch:()=>{osc(150,.16,'sine',.2,-95);noise(.07,.14,'lowpass',900,200);},
  splash:()=>noise(.5,.11,'highpass',1800,600),
  roar:()=>{osc(120,.5,'sawtooth',.07,-50);osc(87,.5,'square',.04,-30);noise(.45,.07,'bandpass',300,160);},
  chime:()=>[880,1318.5,1760].forEach((f,i)=>osc(f,.5,'sine',.045,0,i*.07)),
  drum:()=>{osc(130,.22,'sine',.2,-70);noise(.05,.08,'lowpass',700,0);},
  wind:()=>noise(.9,.09,'bandpass',300,1100),
  tick:()=>osc(1200,.05,'square',.03,-300),
};
const snd=n=>{if(!off()&&SND[n])try{SND[n]();}catch(e){}};

// ---- 粒子 ----
const KIND={
  spark:{k:'streak',sp:[220,640],life:[.3,.7],gy:900,sz:[1.5,3],col:()=>`hsl(${R(26,52)},100%,${R(60,82)}%)`},
  ember:{k:'dot',sp:[30,170],life:[.6,1.3],gy:-160,sz:[2,4.5],col:()=>`hsl(${R(10,40)},100%,${R(55,70)}%)`},
  rainbow:{k:'dot',sp:[120,560],life:[.5,1.1],gy:240,sz:[2,5],col:()=>`hsl(${R(0,360)},100%,70%)`},
  water:{k:'dot',sp:[160,520],life:[.5,.95],gy:900,sz:[2,5],col:()=>`hsl(${R(180,205)},90%,${R(62,82)}%)`},
  jade:{k:'streak',sp:[200,560],life:[.3,.7],gy:500,sz:[1.5,3],col:()=>`hsl(${R(140,170)},90%,${R(60,80)}%)`},
  frost:{k:'dot',sp:[80,360],life:[.5,1],gy:120,sz:[2,4],col:()=>`hsl(200,80%,${R(80,96)}%)`},
  gold:{k:'dot',sp:[80,380],life:[.6,1.2],gy:-40,sz:[2,4.5],col:()=>`hsl(${R(40,52)},100%,${R(62,80)}%)`},
  red:{k:'streak',sp:[240,620],life:[.3,.6],gy:700,sz:[1.5,3.2],col:()=>`hsl(${R(350,372)},95%,${R(52,68)}%)`},
  coin:{k:'dot',sp:[160,420],life:[.7,1.1],gy:1100,sz:[4,6],col:()=>'#ffd34d'},
  dust:{k:'puff',sp:[30,140],life:[.5,1],gy:-30,sz:[18,40],col:()=>'rgba(200,170,120,.35)'},
  mist:{k:'puff',sp:[20,90],life:[.9,1.7],gy:-25,sz:[26,60],col:()=>'rgba(120,210,90,.3)'},
  dark:{k:'puff',sp:[40,200],life:[.7,1.4],gy:-20,sz:[30,70],col:()=>pickOf(['rgba(40,20,60,.45)','rgba(20,15,25,.5)','rgba(150,120,70,.3)'])},
  steam:{k:'puff',sp:[30,120],life:[.7,1.3],gy:-90,sz:[24,54],col:()=>'rgba(240,240,240,.3)'},
};
function burst(kind,x,y,n,sc,o){if(off())return;const K=KIND[kind]||KIND.spark;sc=sc||1;o=o||{};for(let i=0;i<n;i++){const a=o.dir!=null?o.dir+R(-(o.spread||.5),o.spread||.5):R(0,Math.PI*2),s=R(K.sp[0],K.sp[1])*sc;
  P.push({k:K.k,x:x+R(-6,6),y:y+R(-6,6),vx:Math.cos(a)*s,vy:Math.sin(a)*s,gy:K.gy,life:R(K.life[0],K.life[1]),age:0,sz:R(K.sz[0],K.sz[1])*(K.k==='puff'?sc:1),col:K.col()});}run();}
function glyphs(chars,x,y,n,o){if(off())return;o=o||{};for(let i=0;i<n;i++)P.push({k:'glyph',ch:pickOf(chars),x:x+R(-(o.rx||40),o.rx||40),y:y+R(-(o.ry||20),o.ry||20),vx:R(-50,50),vy:R(-170,-60),gy:o.gy||0,life:R(.7,1.3),age:0,sz:R(o.s0||16,o.s1||30),col:o.col||'#ffe27a',rot:R(-.5,.5),vr:R(-2,2)});run();}
// 从上往下落的一阵（雪、雨）
function fall(kind,n,ms,o){if(off())return;o=o||{};const x0=o.x0||0,x1=o.x1||W;for(let i=0;i<n;i++)T(()=>{const snow=kind==='snow';P.push({k:snow?'dot':'streak',x:R(x0,x1),y:o.y0!=null?o.y0:-10,vx:snow?R(-80,-20):R(-60,-30),vy:snow?R(140,330):R(700,1000),gy:0,life:snow?R(1.4,2.6):R(.5,.9),age:0,sz:snow?R(1.5,4):R(1.2,2.2),col:snow?'#fff':(o.col||'hsl(46,100%,72%)'),keep:1});run();},R(0,ms));}
function bolt(x1,y1,x2,y2,hue){if(off())return;const pts=[[x1,y1]],n=9;for(let i=1;i<n;i++){const t=i/n;pts.push([x1+(x2-x1)*t+R(-34,34),y1+(y2-y1)*t+R(-8,8)]);}pts.push([x2,y2]);
  const br=[];for(let b=0;b<2;b++){const s=pts[2+Math.floor(R(0,5))];br.push([s,[s[0]+R(-90,90),s[1]+R(30,90)]]);}P.push({k:'bolt',pts,br,life:.3,age:0,hue:hue==null?200:hue});run();}
function run(){if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;g.clearRect(0,0,W,H);const keep=[];
  for(const p of P){p.age+=dt;if(p.age>=p.life)continue;const a=1-p.age/p.life;
    if(p.k==='bolt'){g.globalCompositeOperation='lighter';g.lineJoin='round';const fl=Math.random()<.25?.35:1;for(const[w,al,l]of[[9,.25,60],[3.5,.9,82],[1.4,1,97]]){g.strokeStyle=`hsla(${p.hue},100%,${l}%,${al*a*fl})`;g.lineWidth=w;g.beginPath();p.pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();for(const b of p.br){g.lineWidth=w*.5;g.beginPath();g.moveTo(b[0][0],b[0][1]);g.lineTo(b[1][0],b[1][1]);g.stroke();}}keep.push(p);continue;}
    p.vy+=p.gy*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.k==='glyph'){p.rot+=p.vr*dt;g.globalCompositeOperation='source-over';g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.globalAlpha=Math.min(1,a*1.6);g.font=`bold ${p.sz}px "Kaiti SC","STKaiti",KaiTi,serif`;g.textAlign='center';g.fillStyle=p.col;g.shadowColor='#000';g.shadowBlur=6;g.fillText(p.ch,0,0);g.restore();}
    else if(p.k==='puff'){g.globalCompositeOperation='source-over';g.globalAlpha=a;g.fillStyle=p.col;g.beginPath();g.arc(p.x,p.y,p.sz*(1.6-a*.6),0,6.3);g.fill();}
    else if(p.k==='streak'){g.globalCompositeOperation='lighter';g.globalAlpha=p.keep?.85:a;g.strokeStyle=p.col;g.lineWidth=p.sz;g.lineCap='round';g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-p.vx*.035,p.y-p.vy*.035);g.stroke();}
    else{g.globalCompositeOperation='lighter';g.globalAlpha=p.keep?Math.min(1,a*3):a;g.fillStyle=p.col;g.beginPath();g.arc(p.x,p.y,p.sz,0,6.3);g.fill();}
    keep.push(p);}
  g.globalAlpha=1;g.globalCompositeOperation='source-over';P=keep;if(P.length)raf=requestAnimationFrame(tick);else{raf=0;g.clearRect(0,0,W,H);}}

// ---- DOM 小件 ----
const appEl=()=>document.getElementById('app');
function shake(px,ms){if(off())return;const k=[];for(let i=0;i<8;i++)k.push({transform:`translate(${R(-px,px)}px,${R(-px,px)}px)`});k.push({transform:'none'});appEl().animate(k,{duration:ms||350});}
function tint(bg,ms){if(off())return;const e=add(`<div class="fx-tint" style="background:${bg}"></div>`,ms+50);anim(e,[{opacity:0},{opacity:1,offset:.18},{opacity:1,offset:.72},{opacity:0}],ms);}
function flash(col,ms){if(off())return;const e=add(`<div class="fx-tint" style="background:${col}"></div>`,ms+50);anim(e,[{opacity:.6},{opacity:0}],ms);}
function img(name,x,y,w,kf,ms,o){if(off())return null;const e=add(`<img class="fxi" src="assets/fx/${name}.jpg" style="left:${x}px;top:${y}px;width:${w}px">`,ms+60);anim(e,kf,ms,o);return e;}
function ring(x,y,col,size,ms,delay){if(off())return;T(()=>{const e=add(`<div class="fx-ring" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-color:${col};box-shadow:0 0 18px ${col},inset 0 0 18px ${col}"></div>`,ms+50);anim(e,[{transform:'translate(-50%,-50%) scale(.1)',opacity:1},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],ms);},delay||0);}
// 一道从 (x1,y1) 刺到 (x2,y2) 的光
function line(x1,y1,x2,y2,col,w,ms,delay){if(off())return;T(()=>{const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),e=add(`<div class="fx-line" style="left:${x1}px;top:${y1}px;width:${len}px;height:${w}px;margin-top:${-w/2}px;background:linear-gradient(90deg,transparent,${col} 35%,#fff 92%,transparent);box-shadow:0 0 ${w*2}px ${col};rotate:${Math.atan2(dy,dx)}rad"></div>`,ms+50);
  anim(e,[{transform:'scaleX(0)',opacity:1},{transform:'scaleX(1)',opacity:1,offset:.45},{transform:'scaleX(1)',opacity:0}],ms);},delay||0);}
// 一个飞过去的小东西（石子、飞刀、箭）
function shot(x1,y1,x2,y2,html,ms,delay,spin){if(off())return;T(()=>{const e=add(`<div class="fx-shot" style="left:${x1}px;top:${y1}px">${html}</div>`,ms+30);anim(e,[{transform:`translate(-50%,-50%) rotate(0deg)`},{transform:`translate(calc(-50% + ${x2-x1}px),calc(-50% + ${y2-y1}px)) rotate(${spin||0}deg)`}],ms,{easing:'cubic-bezier(.4,0,.9,.6)'});},delay||0);}
// 大字（斩、伏、醉……）
function banner(text,x,y,o){if(off())return;o=o||{};const ms=o.ms||900,e=add(`<div class="fx-word ${o.cls||''}" style="left:${x}px;top:${y}px;font-size:${o.size||120}px;color:${o.col||'#fff'}">${text}</div>`,ms+50);
  anim(e,[{transform:'translate(-50%,-50%) scale(2.6) rotate(-8deg)',opacity:0},{transform:'translate(-50%,-50%) scale(1) rotate(-4deg)',opacity:1,offset:.16},{transform:'translate(-50%,-50%) scale(1.04) rotate(-4deg)',opacity:1,offset:.7},{transform:'translate(-50%,-56%) scale(1.1) rotate(-4deg)',opacity:0}],ms,{easing:'cubic-bezier(.2,.9,.3,1)'});}
// 把一张牌亮出来一下（驻场触发、埋伏发动）
function show(src,name,x,y,o){if(off())return;o=o||{};const ms=o.ms||850,w=o.w||Math.max(74,Math.min(118,W*.085)),e=add(`<div class="fx-thumb" style="left:${x}px;top:${y}px;width:${w}px;--c:${o.col||'#ffd34d'}"><img src="${src}"><b>${name}</b>${o.tag?`<i>${o.tag}</i>`:''}</div>`,ms+50);
  anim(e,[{transform:'translate(-50%,-20%) scale(.3)',opacity:0},{transform:'translate(-50%,-100%) scale(1.12)',opacity:1,offset:.22},{transform:'translate(-50%,-104%) scale(1)',opacity:1,offset:.75},{transform:'translate(-50%,-130%) scale(.9)',opacity:0}],ms,{easing:'cubic-bezier(.2,.9,.3,1)'});}
// 多段攻击：牌自己凑到敌人跟前，一下一下戳。times：每一下的时刻（毫秒）
function jab(src,r,times){if(off()||!times.length)return;const w=Math.max(46,Math.min(78,r.w*.34)),end=times[times.length-1]+260,e=add(`<div class="fx-jab" style="left:${r.cx-w/2}px;top:${r.y+r.h-w*.5}px;width:${w}px"><img src="${src}"></div>`,end+60);
  const kf=[{transform:'translateY(60px) scale(.6)',opacity:0,offset:0}],o=t=>Math.max(0,Math.min(1,t/end));let prev=0;
  times.forEach((t,i)=>{const big=i===times.length-1&&times.length>2,a=Math.max(prev+1,t-45);kf.push({transform:'translateY(0) scale(1)',opacity:1,offset:o(a)});kf.push({transform:`translateY(${big?-58:-36}px) scale(${big?1.2:1.06})`,opacity:1,offset:o(t)});prev=t;});
  kf.push({transform:'translateY(0) scale(1)',opacity:1,offset:o(prev+90)});kf.push({transform:'translateY(40px) scale(.7)',opacity:0,offset:1});
  for(let i=1;i<kf.length;i++)if(kf[i].offset<=kf[i-1].offset)kf[i].offset=Math.min(1,kf[i-1].offset+.001);e.animate(kf,{duration:end,fill:'both',easing:'linear'});}
// 大招前的人物横幅
function cutin(c,col,ms){const e=add(`<div class="fx-cut" style="--c:${col}"><div class="band"><img src="${c.src}"><div class="tx"><small>${c.nick}</small><b>${c.name}</b><em>${c.sk||''}</em></div></div></div>`,ms+60);
  anim(e.firstChild,[{transform:'translateX(-110%) skewX(-12deg)',opacity:0},{transform:'translateX(0) skewX(-12deg)',opacity:1,offset:.22},{transform:'translateX(3%) skewX(-12deg)',opacity:1,offset:.8},{transform:'translateX(120%) skewX(-12deg)',opacity:0}],ms,{easing:'cubic-bezier(.2,.8,.3,1)'});}
// 八卦阵
function bagua(x,y,size,ms){if(off())return;const ch='☰☱☲☳☴☵☶☷',e=add(`<div class="fx-bagua" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px">${[...ch].map((s,i)=>`<span style="transform:rotate(${i*45}deg) translateY(${-size/2}px)">${s}</span>`).join('')}<u>☯</u></div>`,ms+50);
  anim(e,[{transform:'translate(-50%,-50%) scale(.2) rotate(0deg)',opacity:0,filter:'hue-rotate(0deg)'},{opacity:1,offset:.2},{opacity:1,offset:.8},{transform:'translate(-50%,-50%) scale(1.15) rotate(300deg)',opacity:0,filter:'hue-rotate(360deg)'}],ms,{easing:'linear'});}
const C='translate(-50%,-50%)';

// ---- 每位好汉的演出。c：{src,nick,name,sk,ts 目标框[],me 山寨框,foes 全体框,kept,drunk,x,short}，返回「打中」的时刻（毫秒）----
const mid=c=>{const a=c.ts.length?c.ts:[{cx:W/2,cy:H*.3,w:200,h:200}];return {cx:a.reduce((s,r)=>s+r.cx,0)/a.length,cy:a.reduce((s,r)=>s+r.cy,0)/a.length,w:a[0].w,h:a[0].h};};
const E={
  // 公孙胜 · 五雷天罡正法：天色全暗，八卦阵转起来，雷电彩龙横贯，每个敌人挨几道彩雷
  dragon(c){const m=mid(c),n=2+Math.min(4,Math.floor((c.x||0)/2));tint('radial-gradient(ellipse at 50% 30%,#2a0f5acc,#05010ff0)',1650);bagua(W/2,m.cy,Math.min(W,H)*.62,1500);snd('wind');
    T(()=>{snd('roar');img('dragon',W/2,m.cy,Math.min(W*1.15,1500),[{transform:'translate(-95%,-50%) scale(.75)',opacity:0,filter:'hue-rotate(0deg) brightness(1.1)'},{opacity:1,offset:.22},{transform:'translate(-50%,-50%) scale(1.05)',opacity:1,filter:'hue-rotate(160deg) brightness(1.5)',offset:.6},{transform:'translate(-8%,-50%) scale(1.2)',opacity:0,filter:'hue-rotate(360deg) brightness(2.2)'}],1150,{easing:'ease-in-out'});},250);
    glyphs('雷霆風雲敕令',W/2,m.cy,10,{rx:W*.35,ry:H*.2,col:'#d9c2ff'});
    T(()=>{flash('#fff',260);shake(16,480);snd('thunder');c.ts.forEach((r,i)=>{for(let k=0;k<n;k++)T(()=>{bolt(r.cx+R(-110,110),-10,r.cx+R(-14,14),r.cy+R(-20,30),R(0,360));burst('rainbow',r.cx,r.cy,18,1.1);if(k%2)snd('thunder');},k*95+i*35);});},1000);return 1010;},
  // 武松 · 景阳冈：猛虎虚影扑来；有醉意时歪歪斜斜带着酒字
  tiger(c){const m=mid(c),s=Math.min(H*.75,560);tint('radial-gradient(#3a1c00aa,#000c)',900);snd('roar');
    img('tiger',m.cx,m.cy,s,[{transform:C+' scale(.25) rotate(-10deg)',opacity:0},{transform:C+' scale(1) rotate(0deg)',opacity:1,offset:.45},{transform:C+' scale(1.25)',opacity:1,offset:.62},{transform:C+' scale(1.7)',opacity:0}],820,{easing:'cubic-bezier(.5,0,.3,1)'});
    if(c.drunk){glyphs('醉酒',m.cx,m.cy,4+c.drunk*2,{rx:160,ry:90,col:'#ffd98a',s0:26,s1:46});banner('三碗不过冈',W*.5,H*.14,{size:Math.min(64,W*.06),col:'#ffd98a',ms:1000});}
    T(()=>{shake(13,380);snd('punch');for(let k=0;k<3;k++)line(m.cx-90+k*45,m.cy-110,m.cx-150+k*45,m.cy+120,'#ffb347',9,300,k*40);burst('spark',m.cx,m.cy,40,1.2);ring(m.cx,m.cy,'#ffb347',380,420);},500);return 510;},
  // 关胜 · 拖刀计：青龙偃月刀一道大弧
  crescent(c){const m=mid(c),k=1+(c.kept||0)*.18,w=Math.min(W*1.05,1100)*k;tint('linear-gradient(#001a12aa,#000a)',800);snd('whoosh');
    img('crescent',m.cx,m.cy,w,[{transform:'translate(-110%,-50%) scaleX(.5) rotate(-8deg)',opacity:0},{transform:C+' rotate(-4deg)',opacity:1,offset:.45},{transform:'translate(-35%,-50%) rotate(0deg)',opacity:1,offset:.65},{transform:'translate(-5%,-50%) scale(1.1)',opacity:0}],700,{easing:'cubic-bezier(.6,0,.2,1)'});
    T(()=>{shake(11,340);snd('ring');line(m.cx-m.w*1.2,m.cy+30,m.cx+m.w*1.2,m.cy-30,'#5dffc0',14,380);burst('jade',m.cx,m.cy,46,1.2);},420);return 430;},
  // 林冲 · 风雪山神庙：大雪，豹影一现，一枪穿屏。没忍满时只是雪里一枪
  leopard(c){const m=mid(c),full=(c.kept||0)>=3;fall('snow',full?150:50,full?900:500);snd('wind');
    if(!full){line(m.cx-W*.3,m.cy+H*.28,m.cx+30,m.cy-10,'#dff3ff',8,330,180);T(()=>{burst('frost',m.cx,m.cy,22);snd('ring');},330);return 340;}
    tint('linear-gradient(#0b1626dd,#1a0f08cc)',1500);add(`<div class="fx-fire"></div>`,1500);
    T(()=>{snd('roar');img('leopard',m.cx,m.cy-20,Math.min(H*.8,600),[{transform:C+' scale(.6)',opacity:0},{transform:C+' scale(1.05)',opacity:1,offset:.3},{transform:C+' scale(1.1)',opacity:1,offset:.7},{transform:C+' scale(1.35)',opacity:0}],800);},260);
    T(()=>{snd('ring');line(-40,H*.92,m.cx+60,m.cy-20,'#ffffff',16,420);},820);
    T(()=>{flash('#eaf6ff',200);shake(15,420);burst('frost',m.cx,m.cy,60,1.5);burst('spark',m.cx,m.cy,26,1.2);ring(m.cx,m.cy,'#dff3ff',460,480);},1000);return 1010;},
  // 鲁智深 · 三拳：油酱铺、彩帛铺、水陆道场
  monk(c){const m=mid(c),s=Math.min(H*.62,440),col=['#b5651d','#ff5fa2','#ffd34d'],pk=['dust','rainbow','gold'];tint('radial-gradient(#3a2a00aa,#000b)',1000);
    for(let k=0;k<3;k++)T(()=>{snd(k<2?'punch':'gong');if(k===2)snd('punch');img('monk',m.cx+(k-1)*46,m.cy,s*(1+k*.14),[{transform:C+' scale(.2)',opacity:0,filter:`hue-rotate(${[-25,280,0][k]}deg)`},{transform:C+' scale(1)',opacity:1,offset:.4,filter:`hue-rotate(${[-25,280,0][k]}deg)`},{transform:C+' scale(1.25)',opacity:0,filter:`hue-rotate(${[-25,280,0][k]}deg)`}],300);
      T(()=>{shake(6+k*5,240);ring(m.cx,m.cy,col[k],260+k*130,380);burst(pk[k],m.cx,m.cy,k===1?46:26,1.1);if(k===1)burst('red',m.cx,m.cy,24);if(k===2){glyphs('磬钹铙',m.cx,m.cy,7,{rx:150,ry:60,col:'#ffe27a',s0:26,s1:44});ring(m.cx,m.cy,'#ffe27a',620,560,90);}},120);},k*230);return 130;},
  // 秦明 · 霹雳火：狼牙棒砸地，炸雷
  thunderfire(c){const m=mid(c),s=Math.min(H*.75,540);tint('radial-gradient(#4a0c00aa,#000c)',850);snd('whoosh');
    img('thunderfire',m.cx,m.cy,s,[{transform:'translate(-50%,-125%) scale(.8) rotate(-25deg)',opacity:0},{transform:C+' scale(1.05) rotate(0deg)',opacity:1,offset:.5},{transform:C+' scale(1.1)',opacity:1,offset:.7},{transform:C+' scale(1.4)',opacity:0}],780,{easing:'cubic-bezier(.7,0,.3,1)'});
    T(()=>{flash('#ffd9a0',180);shake(18,460);snd('thunder');snd('boom');c.ts.forEach(r=>{bolt(r.cx+R(-60,60),-10,r.cx,r.cy,R(35,55));bolt(r.cx+R(-90,90),-10,r.cx,r.cy,R(0,20));burst('ember',r.cx,r.cy+r.h*.3,34,1.5);burst('spark',r.cx,r.cy,34,1.3);});},420);return 430;},
  // 李逵 · 黑旋风：卷着两把板斧转过全屏
  whirl(c,dark){const m=mid(c),s=Math.min(H*.8,580),x0=c.foes.x-s*.3,x1=c.foes.x+c.foes.w+s*.3,f=dark?'hue-rotate(250deg) brightness(.9)':'none';tint(dark?'radial-gradient(#1a0826cc,#000e)':'radial-gradient(#2a0505aa,#000c)',dark?1300:1000);snd('wind');
    const e=img('whirl',x0,m.cy,s,[{transform:C+' rotate(0deg) scale(.7)',opacity:0,filter:f},{opacity:1,offset:.15,filter:f},{opacity:1,offset:.85,filter:f},{transform:`translate(calc(-50% + ${x1-x0}px),-50%) rotate(${dark?540:900}deg) scale(1.1)`,opacity:0,filter:f}],dark?1150:900,{easing:'linear'});
    const n=dark?16:10;for(let k=0;k<n;k++)T(()=>{const x=x0+(x1-x0)*(k/n);burst(dark?'dark':'red',x,m.cy+R(-60,60),dark?7:9,1.1);if(dark)glyphs('沙石',x,m.cy,1,{col:'#c9b27a',s0:14,s1:22});else if(k%3===0)snd('ring');},k*(dark?70:80));
    T(()=>{shake(12,420);snd(dark?'thunder':'boom');c.ts.forEach(r=>burst(dark?'dark':'spark',r.cx,r.cy,24,1.2));},dark?640:520);return dark?650:530;},
  // 樊瑞 · 芒砀山妖法：黑风飞沙走石
  darkwind(c){return E.whirl(c,true);},
  // 卢俊义 · 玉麒麟踏阵
  qilin(c){const m=mid(c),s=Math.min(H*.8,560);tint('radial-gradient(#0d2a1caa,#000c)',1050);snd('chime');
    img('qilin',c.me.cx,c.me.cy-s*.35,s*.8,[{transform:C+' scale(.3)',opacity:0},{transform:C+' scale(1)',opacity:1,offset:.3},{transform:`translate(calc(-50% + ${(m.cx-c.me.cx)*.5}px),calc(-50% + ${(m.cy-c.me.cy+s*.35)*.5}px)) scale(1.1)`,opacity:1,offset:.62},{transform:`translate(calc(-50% + ${m.cx-c.me.cx}px),calc(-50% + ${m.cy-c.me.cy+s*.35}px)) scale(1.35)`,opacity:0}],950,{easing:'cubic-bezier(.5,0,.4,1)'});
    burst('jade',c.me.cx,c.me.cy,24);ring(c.me.cx,c.me.cy,'#ffe27a',300,500);
    T(()=>{shake(12,380);snd('boom');line(m.cx-m.w,m.cy-60,m.cx+m.w,m.cy+60,'#eafff2',13,340);burst('jade',m.cx,m.cy,44,1.3);burst('gold',m.cx,m.cy,24);},760);return 770;},
  // ---- 亮相一档 ----
  rain(c){fall('rain',70,650,{x0:c.me.x-60,x1:c.me.x+c.me.w+140});snd('chime');T(()=>{ring(c.me.cx,c.me.cy,'#ffe27a',260,500);burst('gold',c.me.cx,c.me.cy,18);},320);return 330;},
  fan(c){const m=mid(c),s=Math.min(H*.5,360);snd('whoosh');img('fan',W/2,H*.42,s,[{transform:C+' scale(.4) rotate(-30deg)',opacity:0},{transform:C+' scale(1) rotate(8deg)',opacity:1,offset:.4},{transform:C+' scale(1.05) rotate(-6deg)',opacity:1,offset:.7},{transform:C+' scale(1.2) rotate(0deg)',opacity:0}],720);
    T(()=>{c.ts.forEach(r=>{burst('dark',r.cx,r.cy-r.h*.3,6);glyphs('？',r.cx,r.cy-r.h*.45,1,{col:'#e7c9ff',s0:44,s1:52,rx:4,ry:4});});if(c.ts.length>1)line(c.ts[0].cx,c.ts[0].cy,c.ts[c.ts.length-1].cx,c.ts[c.ts.length-1].cy,'#c9a56b',5,420);snd('chime');},430);return 440;},
  horses(c){const m=mid(c),w=Math.min(W*.95,980);snd('drum');T(()=>snd('drum'),130);T(()=>snd('drum'),260);
    img('horses',W/2,m.cy+m.h*.1,w,[{transform:'translate(-140%,-50%)',opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.75},{transform:'translate(40%,-50%)',opacity:0}],760,{easing:'linear'});
    for(let k=0;k<8;k++)T(()=>burst('dust',c.foes.x+c.foes.w*(k/8),m.cy+m.h*.45,5),k*70);T(()=>{shake(10,360);snd('boom');c.ts.forEach(r=>burst('spark',r.cx,r.cy,18));},420);return 430;},
  arrows(c){const m=mid(c),w=Math.min(W*.8,760);snd('whoosh');img('arrows',m.cx,m.cy,w,[{transform:'translate(-110%,20%) scale(.8)',opacity:0},{transform:'translate(-62%,-38%)',opacity:1,offset:.55},{transform:'translate(-40%,-62%) scale(1.05)',opacity:0}],520,{easing:'cubic-bezier(.4,0,.6,1)'});T(()=>{snd('ring');c.ts.forEach(r=>burst('spark',r.cx,r.cy,14));},300);return 310;},
  hawk(c){const m=mid(c),s=Math.min(H*.6,420);snd('whoosh');img('hawk',m.cx,m.cy,s,[{transform:'translate(-140%,-150%) scale(.5)',opacity:0},{transform:C+' scale(1.05)',opacity:1,offset:.6},{transform:'translate(-20%,-20%) scale(1.2)',opacity:0}],560,{easing:'cubic-bezier(.5,0,.5,1)'});T(()=>{burst('gold',m.cx,m.cy,18);snd('ring');},330);return 340;},
  wave(c){const m=mid(c),w=Math.min(W*1.1,1200);snd('splash');img('wave',W/2,m.cy+m.h*.15,w,[{transform:'translate(-130%,-40%) scale(.9)',opacity:0},{opacity:1,offset:.25},{transform:'translate(-45%,-50%) scale(1.05)',opacity:1,offset:.65},{transform:'translate(10%,-50%) scale(1.1)',opacity:0}],820,{easing:'ease-in-out'});
    T(()=>{shake(8,300);(c.ts.length?c.ts:[m]).forEach(r=>burst('water',r.cx,r.cy,26,1.1,{dir:-Math.PI/2,spread:1.2}));},430);return 440;},
  // 张顺 · 浪里白条：水幕落在自己身上
  wave2(c){snd('splash');img('wave',c.me.cx,c.me.cy-40,Math.min(W*.6,520),[{transform:'translate(-50%,30%) scale(.5)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.5},{transform:'translate(-50%,-70%) scale(1.1)',opacity:0}],620);T(()=>{burst('water',c.me.cx,c.me.cy,30,1,{dir:-Math.PI/2,spread:.9});ring(c.me.cx,c.me.cy,'#8fe6ff',280,480);},260);return 270;},
  boom(c){const m=mid(c),s=Math.min(H*.85,620);flash('#ffe6b0',160);snd('boom');snd('thunder');img('boom',m.cx,m.cy,s,[{transform:C+' scale(.15)',opacity:0},{transform:C+' scale(1)',opacity:1,offset:.3},{transform:C+' scale(1.25)',opacity:0}],650);shake(16,460);(c.ts.length?c.ts:[m]).forEach(r=>{burst('ember',r.cx,r.cy,30,1.6);burst('spark',r.cx,r.cy,30,1.3);burst('steam',r.cx,r.cy,6);});return 120;},
  fire(c){const m=mid(c);snd('whoosh');(c.ts.length?c.ts:[m]).forEach((r,i)=>T(()=>{burst('ember',r.cx,r.cy+r.h*.3,40,1.6);burst('spark',r.cx,r.cy,16);},i*70));tint('radial-gradient(#5a1400aa,transparent 70%)',600);T(()=>snd('boom'),200);return 210;},
  flood(c){E.wave(c);T(()=>(c.ts||[]).forEach(r=>burst('steam',r.cx,r.cy,5)),480);return 440;},
  shield(c,col){col=col||'#ffd34d';snd('gong');for(let k=0;k<3;k++)ring(c.me.cx,c.me.cy,col,220+k*120,620,k*110);burst('gold',c.me.cx,c.me.cy,26);return 260;},
  ward(c){const e=add(`<div class="fx-plaque" style="left:${c.me.cx}px;top:${c.me.cy-70}px">丹书铁券</div>`,1000);anim(e,[{transform:'translate(-50%,-90%) scale(.4)',opacity:0},{transform:C+' scale(1.1)',opacity:1,offset:.3},{transform:C+' scale(1)',opacity:1,offset:.8},{transform:'translate(-50%,-30%) scale(.9)',opacity:0}],950);return E.shield(c,'#d6a6ff');},
  pagoda(c){snd('gong');glyphs('塔',c.me.cx,c.me.cy-60,1,{col:'#ffe9a8',s0:64,s1:70,rx:2,ry:2});return E.shield(c);},
  speed(c){snd('whoosh');for(let k=0;k<14;k++)line(-40,R(H*.15,H*.9),W+40,R(H*.15,H*.9),'#ffe9a8',R(2,5),R(260,420),k*28);glyphs('神行',W*.5,H*.5,4,{rx:W*.3,ry:60,col:'#ffcf6a',s0:30,s1:48});burst('dust',c.me.cx,c.me.cy,10);return 250;},
  mist(c){snd('wind');const a=c.ts.length?c.ts:[mid(c)];a.forEach((r,i)=>T(()=>{burst('mist',r.cx,r.cy-r.h*.2,10,1.2);burst('steam',r.cx,r.cy+r.h*.2,4);},i*80));return 260;},
  leap(c){const m=mid(c);snd('whoosh');line(m.cx-40,-30,m.cx,m.cy,'#fff',12,320);T(()=>{shake(9,300);snd('ring');burst('spark',m.cx,m.cy,26);},300);banner('梁山泊好汉全伙在此！',W/2,H*.16,{size:Math.min(c.low?62:44,W*.055),col:'#ffb37a',ms:1100});return 310;},
  release(c){const m=mid(c);snd('chime');banner('去罢',m.cx,m.cy-m.h*.3,{size:70,col:'#ffe0a8',ms:900});burst('gold',m.cx,m.cy,14);return 250;},
  dash(c){const m=mid(c);snd('whoosh');line(c.me.cx,c.me.cy,m.cx,m.cy,'#ffcf6a',12,260);burst('dust',c.me.cx,c.me.cy,8);T(()=>{snd('ring');burst('spark',m.cx,m.cy,22);},200);return 210;},
  thief(c){const m=mid(c);snd('tick');line(W+20,H*.06,-20,H*.06,'#222',10,420);T(()=>{burst('coin',m.cx,m.cy-m.h*.3,10);snd('chime');},260);return 270;},
  stone(c){const m=mid(c);shot(c.me.cx+60,c.me.cy-40,m.cx,m.cy,'<i style="display:block;width:16px;height:16px;border-radius:50%;background:radial-gradient(#fff,#9aa);box-shadow:0 0 10px #dfe"></i>',150,0,360);line(c.me.cx+60,c.me.cy-40,m.cx,m.cy,'#dfe',2,200);T(()=>{snd('tick');burst('frost',m.cx,m.cy,8);if((c.re||0)>=2)glyphs('✦',m.cx,m.cy-m.h*.4,5,{col:'#ffe27a',rx:50});},150);return 150;},
  lasso(c){const m=mid(c);snd('whoosh');ring(m.cx,m.cy,'#ff4d4d',m.w*1.3,420);line(c.me.cx,c.me.cy,m.cx,m.cy,'#ff4d4d',5,380);return 260;},
};

// 好汉 → 演出。t：A 全屏大招（先出人物横幅）；B 亮相；hit：普通打击的形态
const BY={
  公孙胜:{t:'A',fx:'dragon',sk:'五雷天罡正法',col:'#8a5cff',hit:'bolt'},武松:{t:'A',fx:'tiger',sk:'景阳冈上',col:'#ff9d2e',hit:'fist'},关胜:{t:'A',fx:'crescent',sk:'青龙偃月 · 拖刀计',col:'#2fd49a',hit:'slash'},
  林冲:{t:'A',fx:'leopard',sk:'风雪山神庙',col:'#bfe6ff',hit:'spear',when:c=>(c.kept||0)>=3},鲁智深:{t:'A',fx:'monk',sk:'三拳打死镇关西',col:'#ffd34d',hit:'fist',own:1},秦明:{t:'A',fx:'thunderfire',sk:'霹雳火',col:'#ff5a2e',hit:'staff'},
  李逵:{t:'A',fx:'whirl',sk:'黑旋风',col:'#d33',hit:'axe'},樊瑞:{t:'A',fx:'darkwind',sk:'芒砀山妖法',col:'#7a4ad6'},卢俊义:{t:'A',fx:'qilin',sk:'玉麒麟踏阵',col:'#7ff0b8',hit:'staff'},
  宋江:{t:'B',fx:'rain'},吴用:{t:'B',fx:'fan'},朱武:{t:'B',fx:'fan'},呼延灼:{t:'B',fx:'horses',hit:'staff'},花荣:{t:'B',fx:'arrows',hit:'arrow'},柴进:{t:'B',fx:'ward'},晁盖:{t:'B',fx:'pagoda'},
  李应:{t:'B',fx:'hawk',hit:'knife'},李俊:{t:'B',fx:'wave',hit:'wave'},张顺:{t:'B',fx:'wave2'},戴宗:{t:'B',fx:'speed'},石秀:{t:'B',fx:'leap',hit:'slash'},朱仝:{t:'B',fx:'release'},索超:{t:'B',fx:'dash',hit:'axe'},
  凌振:{t:'B',fx:'fire'},魏定国:{t:'B',fx:'fire',hit:'fire'},单廷珪:{t:'B',fx:'flood',hit:'wave'},孙二娘:{t:'B',fx:'mist'},李立:{t:'B',fx:'mist'},时迁:{t:'B',fx:'thief'},扈三娘:{t:'B',fx:'lasso'},徐宁:{t:'B',fx:'shield',hit:'hook'},欧鹏:{t:'B',fx:'hawk'},
  张清:{t:'B',fx:'stone',hit:'stone'},董平:{hit:'spear2'},史进:{hit:'staff'},杨志:{hit:'slash'},刘唐:{hit:'fire'},穆弘:{hit:'slash'},雷横:{hit:'claw'},阮小二:{hit:'wave'},阮小五:{hit:'wave'},阮小七:{hit:'spear'},张横:{hit:'slash'},杨雄:{hit:'slash'},
  解珍:{hit:'spear'},解宝:{hit:'spear'},燕青:{hit:'arrow'},王英:{hit:'spear'},宣赞:{hit:'slash'},郝思文:{hit:'spear'},韩滔:{hit:'spear'},彭玘:{hit:'slash'},黄信:{hit:'slash'},孙立:{hit:'staff'},邓飞:{hit:'staff'},燕顺:{hit:'slash'},
  项充:{hit:'knife'},李衮:{hit:'knife'},鲍旭:{hit:'slash'},邹渊:{hit:'fist'},邹润:{hit:'fist'},童威:{hit:'wave'},童猛:{hit:'wave'},薛永:{hit:'fist'},焦挺:{hit:'fist'},石勇:{hit:'fist'},龚旺:{hit:'spear'},丁得孙:{hit:'spear'},周通:{hit:'spear'},李忠:{hit:'staff'},王定六:{hit:'fist'},
};
const SIG={};for(const d of Object.values((globalThis.SH||{}).CARDS||{}))if(BY[d.name])SIG[d.id]=BY[d.name];
const seen={};
Object.assign(FX,{off,snd,burst,glyphs,fall,bolt,shake,tint,flash,ring,line,shot,banner,show,jab,bagua,E,
  sig:id=>SIG[id]||null,hitKind:id=>(SIG[id]&&SIG[id].hit)||'slash',reset(){for(const k in seen)delete seen[k];},
  // 出牌演出。返回一个在「打中」那一刻兑现的 Promise；点一下画面可以跳过等待
  cast(id,c){const s=SIG[id];if(off()||!s||!s.fx)return Promise.resolve(false);
    const big=s.t==='A'&&!(s.when&&!s.when(c)),again=seen[id];seen[id]=(seen[id]||0)+1;let lead=0;
    if(big&&!again){lead=560;c.sk=s.sk;tint('#000a',620);cutin(c,s.col||'#ffd34d',760);snd('gong');}
    return new Promise(res=>{let done=false;const fin=()=>{if(done)return;done=true;removeEventListener('pointerdown',skip,true);res(true);},skip=()=>fin();
      T(()=>{const at=E[s.fx](c);T(fin,at);},lead);addEventListener('pointerdown',skip,true);T(fin,lead+1400);});},
});
globalThis.SHFX=FX;
})();
