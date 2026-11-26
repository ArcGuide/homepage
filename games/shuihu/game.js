'use strict';
(()=>{
const {FAC,ART,CARDS,ROSTER,ENEMIES,ACTS,EVENTS,JOIN}=SH;
const HEROES=Object.values(CARDS).filter(c=>c.id<=108),p3=n=>String(n).padStart(3,'0');
// 图片按编号取：挂载了本地图库且里面有同名图就用本地的，否则用自带的（jpg 没有再试 png，都没有就留空）
const LOCAL={};
const imgTag=(kind,id)=>{const l=LOCAL[kind+'/'+p3(id)];return l?`<img src="${l}">`:`<img src="${ART[kind]}${p3(id)}.jpg" onerror="if(!this.dataset.t){this.dataset.t=1;this.src=this.src.replace(/\\.jpg$/,'.png')}else this.style.display='none'">`;};
const $=s=>document.querySelector(s),app=$('#app'),modal=$('#modal');
const rnd=n=>Math.floor(Math.random()*n),pick=a=>a[rnd(a.length)],sleep=ms=>new Promise(r=>setTimeout(r,window.__fast?0:ms)),later=(f,ms)=>setTimeout(f,window.__fast?0:ms);
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const KEY='shuihu_run_v6';
// 每一回的六步：头尾固定，中间每次随机，所以同一回每次走法也不一样
const genSteps=()=>[['battle'],shuffle(['battle','event','shop']).slice(0,2),['elite',pick(['shop','rest','event'])],['battle',pick(['event','elite'])],['rest','shop'],['boss']];
const NODE={battle:['战','遭遇战','打赢后可请一位好汉上山'],elite:['劲','劲敌','更难打，赏钱更多，还有一位好汉得到操练'],event:['奇','奇遇','路上总会碰到点什么'],rest:['义','聚义厅','歇息回血，或操练好汉，或请一位下山'],shop:['酒','朱贵酒店','花钱请好汉、操练、请人下山、吃包子'],boss:['首','','这一回的正主']};
const SNAME={vuln:'破绽',weak:'虚弱',poison:'蒙汗药',str:'蓄力'};
let R=null,B=null;
const COARSE=matchMedia('(pointer:coarse)').matches;
// 布局：牌和敌人的大小跟着屏幕走；立绘比例取各目录 001 号图的实际宽高比
const AR={liangshan:.8,enemy:.8};
function layout(){const W=innerWidth,H=innerHeight,port=W<760||W<H*.85,rs=document.documentElement.style;document.body.classList.toggle('port',port);
  const k=13/AR.liangshan+9.4;let em=(port?.36:.44)*H/k;em=Math.max(7.5,Math.min(em,port?W*.95/(13*3.4):(W-500)/(13*5.2),24));
  let fh=port?Math.min(H*.25,W*.3/AR.enemy):Math.min(H*.34,(W*.24)/AR.enemy);
  // 敌人区不能压到手牌上：扣掉顶栏、手牌（竖屏还有状态栏那一行）和敌人自己的名字血条后，剩多少用多少
  const room=H-46-em*k-(port?92:16)-134;fh=Math.max(60,Math.min(fh,room/1.16));
  rs.setProperty('--cem',em+'px');rs.setProperty('--fh',fh+'px');rs.setProperty('--ar-l',AR.liangshan);rs.setProperty('--ar-e',AR.enemy);}
function detectAR(){for(const kind of['liangshan','enemy']){const im=new Image();im.onload=()=>{const a=Math.max(.45,Math.min(1.7,im.naturalWidth/im.naturalHeight));if(Math.abs(a-AR[kind])>.01){AR[kind]=a;layout();if(B&&!B.busy)render();}};
  im.onerror=()=>{if(!im.dataset.t){im.dataset.t=1;im.src=ART[kind]+'001.png';}};im.src=LOCAL[kind+'/001']||ART[kind]+'001.jpg';}}
addEventListener('resize',()=>{layout();if(B&&!B.busy)render();});layout();detectAR();

// ---- 声音 ----
let AC=null;function tone(f,d,type,v,slide,delay){if(!AC)return;const t=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);g.gain.setValueAtTime(v||.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.02);}
const SFX={card:()=>tone(520,.07,'triangle',.05,200),hit:()=>tone(150,.12,'square',.05,-90),blk:()=>tone(300,.1,'sine',.05,-100),hurt:()=>tone(110,.2,'sawtooth',.07,-60),win:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.25,'triangle',.06,0,i*.1)),ui:()=>tone(660,.05,'sine',.04),lose:()=>tone(220,.8,'sawtooth',.06,-170),gold:()=>{tone(990,.07,'sine',.05);tone(1480,.1,'sine',.05,0,.06);}};
const sfx=n=>SFX[n]&&SFX[n]();

// ---- 存档 ----
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(R));}catch(e){}};
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY));}catch(e){return null;}};
const clearSave=()=>{try{localStorage.removeItem(KEY);}catch(e){}};
function newRun(){R={hp:75,maxhp:75,gold:40,act:0,slot:0,step:0,seen:[],fights:0,deck:[1,23,6,113,82,83,92,106].map(id=>({id}))};showFork();}

const def=c=>CARDS[c.id],fxOf=c=>c.up?def(c).up:def(c).fx;
function cardHTML(c,o){o=o||{};const d=def(c),cost=d.cost==='X'?'X':o.battle?costOf(c):Math.max(0,d.cost-(c.cut||0)),cheap=cost<d.cost,txt=c.up?d.descUp:d.desc;
  return `<div class="card f-${d.fac} ${o.cls||''}" style="${o.style||''}" data-i="${o.i==null?'':o.i}" data-id="${c.id}"><div class="art">${imgTag('liangshan',c.id)}</div><div class="cost ${cheap?'cheap':''}" data-tip="${d.unplayable?'这张牌打不出去':cheap?'有减费生效（结义或这张牌自己的条件）':'打出这张牌要花的义气'}">${d.unplayable?'✕':cost}</div><div class="fac" data-tip="阵营：${FAC[d.fac]}。有些好汉会因同阵营的人先出手而变强">${FAC[d.fac]}</div><div class="no">${d.id<=108?p3(d.id):''}</div><div class="nm"><span class="nick">${d.nick}</span>${d.name}${c.up?'<b>＋</b>':''}</div><div class="ds ${txt.length>52?'xl':txt.length>36?'lg':''}">${txt}</div>${d.bond.length?`<div class="bd ${cheap?'on':''}" data-tip="结义：同一回合里先打出过其中任何一位，这张牌少花 2 点义气">结义 ${d.bond.map(b=>CARDS[b].name).join('·')}</div>`:''}</div>`;}
function topBar(extra){const a=ACTS[R.act];return `<div class="top"><span class="ttl">${a.name}</span><span class="sp"></span>${extra||''}<span class="hp">山寨 ${R.hp} / ${R.maxhp}</span><span class="gd">${R.gold} 文</span><button class="btn" data-act="deck">山寨名册（${R.deck.length}）</button><button class="btn" data-act="roster">图鉴</button></div>`;}
function setBg(name){app.dataset.bg=name;app.style.backgroundImage=`url(${LOCAL['scene/'+name]||ART.scene+name+'.jpg'})`;}
const owned=()=>new Set(R.deck.map(c=>c.id));
// 来投的好汉：第一位尽量是山上某位好汉的结义兄弟（引荐），其余随机
function heroOffers(n){const o=owned(),bonds=new Set(),out=[];for(const c of R.deck)for(const b of def(c).bond)if(!o.has(b)&&b<=108)bonds.add(b);if(bonds.size)out.push(CARDS[pick([...bonds])]);for(const h of shuffle(HEROES.filter(h=>!o.has(h.id))))if(out.length<n&&!out.includes(h))out.push(h);return shuffle(out);}
function upgradeRandom(){const l=R.deck.filter(c=>!c.up&&!def(c).unplayable);if(!l.length)return null;const c=pick(l);c.up=1;return c;}

// ---- 名册 / 选牌 ----
function showDeck(title,filter,cb){const list=R.deck.map((c,i)=>({c,i})).filter(x=>!filter||filter(x.c));
  modal.innerHTML=`<h3>${title||'山寨名册'}</h3><div class="grid">${list.map(x=>cardHTML(x.c,{i:x.i})).join('')||'<p>没有合适的牌。</p>'}</div><button class="btn" data-act="close">${cb?'算了':'合上名册'}</button>`;
  modal.classList.remove('hide');modal.onclick=e=>{if(e.target.closest('[data-act=close]')){modal.classList.add('hide');return;}const el=e.target.closest('.card');if(el&&cb){modal.classList.add('hide');cb(+el.dataset.i);}};}

// ---- 一百单八将图鉴 ----
function showRoster(){const have=R?owned():new Set();
  modal.innerHTML=`<h3>一百单八将　已到 ${ROSTER.filter(r=>r.ready).length} 位</h3><div class="grid roster">${ROSTER.map(r=>`<div class="tile ${r.ready?'':'wait'} ${have.has(r.id)?'have':''}" data-id="${r.id}"><div class="pic">${r.ready?imgTag('liangshan',r.id):''}</div><div class="n">${p3(r.id)} ${r.star}</div><div class="nk">${r.nick}</div><div class="nm2">${r.name}</div></div>`).join('')}</div><div id="rosterCard"></div><button class="btn" data-act="close">合上</button>`;
  modal.classList.remove('hide');modal.onclick=e=>{if(e.target.closest('[data-act=close]')){modal.classList.add('hide');return;}const t=e.target.closest('.tile'),box=modal.querySelector('#rosterCard');if(t&&CARDS[+t.dataset.id]){box.innerHTML=cardHTML({id:+t.dataset.id},{cls:'big'});box.classList.add('on');}else if(box){box.classList.remove('on');box.innerHTML='';}};}

// ---- 本地图库 ----
// 选一个文件夹，里面按 liangshan/001.png、enemy/001.png、scene/bg1.jpg、icon/atk.png 命名（文件夹名也可以写 梁山、敌人、场景、图标；
// 直接放在最外层的纯数字文件当作好汉）。同名的用本地图，缺的用自带图。支持的浏览器会记住文件夹，下次自动挂上。
const KIND={liangshan:'liangshan',梁山:'liangshan',好汉:'liangshan',enemy:'enemy',敌人:'enemy',scene:'scene',场景:'scene',icon:'icon',图标:'icon'},IMG_RE=/\.(png|jpe?g|webp|gif|avif)$/i;
let localInfo=null,savedDir=null;
function mountFiles(list,name){for(const k in LOCAL){URL.revokeObjectURL(LOCAL[k]);delete LOCAL[k];}const cnt={liangshan:0,enemy:0,scene:0,icon:0};
  for(const[path,file]of list){if(!IMG_RE.test(path))continue;const seg=path.split('/'),base=seg.pop().replace(IMG_RE,''),dir=seg.pop();const kind=dir===undefined?(/^\d+$/.test(base)?'liangshan':null):KIND[dir.toLowerCase()];if(!kind)continue;
    const key=kind+'/'+(/^\d+$/.test(base)?p3(+base):base.toLowerCase());if(LOCAL[key])continue;LOCAL[key]=URL.createObjectURL(file);cnt[kind]++;}
  localInfo={name,cnt,total:cnt.liangshan+cnt.enemy+cnt.scene+cnt.icon};refreshArt();return localInfo;}
function unmount(){for(const k in LOCAL){URL.revokeObjectURL(LOCAL[k]);delete LOCAL[k];}localInfo=null;savedDir=null;idb('del');refreshArt();}
function refreshArt(){detectAR();layout();if(app.dataset.bg)setBg(app.dataset.bg);if(B){if(!B.busy)render();}else if(app.querySelector('.title'))showTitle();}
async function mountHandle(h){const out=[];async function walk(d,pre,depth){for await(const[name,x]of d.entries()){if(x.kind==='directory'){if(depth<2)await walk(x,pre+name+'/',depth+1);}else if(IMG_RE.test(name))out.push([pre+name,await x.getFile()]);}}
  await walk(h,'',0);savedDir=h;return mountFiles(out,h.name);}
function idb(op,val){return new Promise(res=>{try{const rq=indexedDB.open('shuihu',1);rq.onupgradeneeded=()=>rq.result.createObjectStore('kv');rq.onerror=()=>res(null);
  rq.onsuccess=()=>{try{const st=rq.result.transaction('kv',op==='get'?'readonly':'readwrite').objectStore('kv'),r=op==='get'?st.get('dir'):op==='set'?st.put(val,'dir'):st.delete('dir');r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);}catch(e){res(null);}};}catch(e){res(null);}});}
async function pickDir(){if(window.showDirectoryPicker){try{const h=await window.showDirectoryPicker({mode:'read'});await mountHandle(h);idb('set',h);return;}catch(e){if(e&&e.name==='AbortError')return;}}$('#dirInput').click();}
async function remount(){if(!savedDir)return;try{if(await savedDir.requestPermission({mode:'read'})==='granted')await mountHandle(savedDir);}catch(e){}}
$('#dirInput').addEventListener('change',e=>{const fs=[...e.target.files];if(!fs.length)return;const root=(fs[0].webkitRelativePath||'').split('/')[0]||'本地图库';mountFiles(fs.map(f=>[(f.webkitRelativePath||f.name).split('/').slice(1).join('/')||f.name,f]),root);e.target.value='';});
idb('get').then(async h=>{if(!h||!h.queryPermission)return;savedDir=h;try{if(await h.queryPermission({mode:'read'})==='granted')await mountHandle(h);else refreshArt();}catch(e){}});
function galleryHTML(){if(localInfo){const c=localInfo.cnt;return `<div class="gal">已挂载本地图库「${localInfo.name}」：好汉 ${c.liangshan} 张，敌人 ${c.enemy} 张，场景 ${c.scene} 张，图标 ${c.icon} 张；其余用自带的图。<br><button class="btn" data-act="mount">换一个文件夹</button> <button class="btn" data-act="unmount">卸载</button></div>`;}
  if(savedDir)return `<div class="gal">上次挂载过「${savedDir.name}」，浏览器需要你点一下重新授权。<br><button class="btn" data-act="remount">重新挂载</button> <button class="btn" data-act="unmount">不用了</button></div>`;
  return `<div class="gal"><button class="btn" data-act="mount">挂载本地图库</button><br>选一个文件夹，图片按 liangshan/001.png、enemy/001.png 这样命名。同名的用你的图，缺的用自带的图。</div>`;}

// ---- 标题 ----
function showTitle(){B=null;setBg('cover');const s=load();
  app.innerHTML=`<div class="title"><h1>梁山聚义</h1><div class="sub">一百单八将 · 替天行道</div><button class="btn big" data-act="new">上梁山</button>${s&&s.deck?'<button class="btn big" data-act="cont">接着打</button>':''}<button class="btn" data-act="roster">一百单八将图鉴</button>${galleryHTML()}
  <div class="rules">每回合有 9 点义气，抽 5 张牌，派好汉出手；回合结束时敌人按头顶的招式行动。天罡星又贵又猛，地煞星便宜而各有奇招；标着「驻场」的好汉打出后会留在场上持续生效。<br>打赢一场，可以请一位好汉上山；每一回开头可以二选一，走不同的故事。<b>酒</b>：0 费，喝一碗本回合每次攻击多打 1 点；<b>埋伏</b>：先布下，等敌人出对应的招式时发动；有些牌会<b>留在手里</b>越等越强。<b>结义</b>：同一回合里先打出过结义兄弟，这张牌少花 2 点义气。<br>山寨生命归零则前功尽弃，从头再来。一百单八将俱已到齐。</div></div>`;}

// ---- 路线 ----
function showMap(){B=null;const a=ACTS[R.act];setBg(a.bg);R.intro=R.intro||{};save();
  if(R.step===0&&!R.intro[R.act]&&a.intro){app.innerHTML=topBar()+`<div class="panel story"><h2>${a.name}</h2><p>${a.intro}</p><button class="btn big" data-act="go">出征</button></div>`;return;}
  const STEPS=R.steps,opts=STEPS[R.step];
  app.innerHTML=topBar()+`<div class="map"><h2>${a.name}</h2><div class="dots">${STEPS.map((s,i)=>`<i class="${i<R.step?'done':i===R.step?'cur':''} ${s[0]==='boss'?'boss':''}"></i>`).join('')}</div>
  <div class="opts">${opts.map(k=>{const n=NODE[k],nm=k==='boss'?ENEMIES[a.boss[0]].name:n[1];return `<div class="node ${k}" data-node="${k}"><div class="ic">${n[0]}</div><b>${nm}</b><span>${n[2]}</span></div>`;}).join('')}</div></div>`;}
function enterNode(k){sfx('ui');if(k==='battle'||k==='elite'||k==='boss')startBattle(k);else if(k==='rest')showRest();else if(k==='shop')showShop();else showEvent();}
function nextStep(){R.step++;if(R.step>=R.steps.length){R.step=0;R.slot++;showFork();return;}showMap();}
// 每一回开头随机定走哪一段故事（不让玩家选）
function showFork(){B=null;setBg('cover');R.fork=1;
  if(R.slot===3&&R.deck.some(c=>c.id===113)){R.deck=R.deck.filter(c=>c.id!==113);R.will=1;save();app.innerHTML=topBar()+`<div class="panel story"><h2>晁天王归天</h2><p>晁天王亲自领兵下山，面上中了一支药箭，抬回山寨，当夜便去了。<br>临终只留下一句话：「下一仗，谁亲手拿下敌酋，谁便是梁山泊主。」<br><br>晁盖从名册里去掉了。下一回亲手击倒首领的那位好汉，会得到操练，并且永久少花 1 点义气。</p><button class="btn big" data-act="fork">举哀，再议出兵</button></div>`;return;}
  const l=ACTS.map((a,i)=>i).filter(i=>ACTS[i].slot===R.slot);pickFork(l[Math.floor(Math.random()*l.length)]);}
function pickFork(i){sfx('ui');R.act=i;R.step=0;R.fork=0;R.steps=genSteps();showMap();}

// ---- 战斗 ----
const alive=()=>B.enemies.filter(e=>!e.dead);
const BASE_ENERGY=9,BOND_CUT=2;
function startBattle(kind){const a=ACTS[R.act],grp=kind==='boss'?a.boss:pick(kind==='elite'?a.elite:a.normal);R.fights++;
  B={kind,enemies:grp.map(id=>{const d=ENEMIES[id],hp=d.hp[0]+rnd(d.hp[1]-d.hp[0]+1);return{id,d,name:d.name,hp,maxhp:hp,block:0,str:0,vuln:0,weak:0,poison:0,mi:d.boss?0:rnd(d.moves.length),dead:false,stun:0,cap:d.boss?24:d.elite?16:10,turncoat:0};}),
    draw:shuffle(R.deck.map(c=>({id:c.id,up:c.up,cut:c.cut,src:c}))),hand:[],disc:[],field:[],traps:[],tstr:0,drunk:0,ward:0,wardUsed:0,bank:0,firstCut:0,hitsLast:0,hitsNow:0,cur:null,last:null,opt:null,energy:0,block:0,str:0,vuln:0,weak:0,played:new Set(),count:0,nextEnergy:0,nextDraw:0,turn:0,sel:null,busy:false,fx:[],over:false};
  startTurn();}
function drawCards(n){for(let i=0;i<n;i++){if(!B.draw.length){if(!B.disc.length)return;B.draw=shuffle(B.disc);B.disc=[];}if(B.hand.length>=10)return;B.hand.push(B.draw.pop());}}
// 驻场好汉的触发：turn 每回合开始 / end 回合结束 / play 每打出一张牌 / fac 每打出一位同阵营 / hit 每次被攻击
function fire(trig,ctx){ctx=ctx||{};for(const it of B.field.slice()){if(it.c===ctx.src)continue;if(trig==='fac'&&ctx.fac!==def(it.c).fac)continue;for(const f of it.fx)if(f.trig===trig&&alive().length){it.pop=1;execFx(f,{card:it.c,auto:true,target:ctx.target,x:0});}}}
function startTurn(){B.turn++;B.deal=true;B.block=0;B.energy=Math.max(0,BASE_ENERGY+B.nextEnergy);B.nextEnergy=0;B.played.clear();B.count=0;B.tstr=0;B.drunk=0;B.firstCut=0;B.hitsLast=B.hitsNow;B.hitsNow=0;drawCards(5+B.nextDraw);B.nextDraw=0;
  for(const it of B.field.slice())if(it.left){it.left--;it.pop=1;if(!it.left){B.field.splice(B.field.indexOf(it),1);for(const f of it.dfx)if(alive().length)execFx(f,{card:it.c,auto:true,x:0});if(!it.c.temp)B.disc.push(it.c);}}
  fire('turn');B.busy=false;B.sel=null;B.opt=null;render();checkEnd();}
function costOf(c){const d=def(c);if(d.unplayable)return 99;if(d.cost==='X')return B?Math.max(1,B.energy):0;let k=d.cost-(c.cut||0);if(B){if(d.bond.some(b=>B.played.has(b)))k-=BOND_CUT;k+=c.re||0;for(const f of fxOf(c))if(f.t==='cut')k-=f.n*cutN(f.k);if(B.count===0)k-=B.firstCut;}return Math.max(0,k);}
const cutN=k=>k==='first'?(B.count===0?1:0):k==='play'?B.count:k==='drink'?B.drunk:k==='foes'?alive().length:k==='lost'?Math.floor((R.maxhp-R.hp)/10):k==='hit'?B.hitsLast:0;
const passive=f=>f.trig||f.on||f.trap||f.delay;
const TARGETED={detonate:1,strip:1,stun:1,sap:1,execute:1,steal:1,turncoat:1,release:1,unbuff:1},aimed=f=>!passive(f)&&!f.aoe&&((f.t==='dmg'&&!f.random)||f.t==='apply'||TARGETED[f.t]);
const activeFx=(c,opt)=>{const out=[];for(const f of fxOf(c)){if(f.t==='choose')out.push(...f.opts[opt||0]);else out.push(f);}return out;};
const needsTargetFx=l=>l.some(aimed)&&alive().length>1,needsTarget=c=>needsTargetFx(activeFx(c,B.opt));
const move=e=>e.d.moves[e.mi];
const intentAtk=e=>{if(e.stun)return false;const m=move(e);return m.k==='atk'||(m.k==='debuff'&&m.atk>0);};
const intentK=(e,k)=>!e.stun&&move(e).k===k,anyOr=(ctx,fn)=>ctx.target&&!ctx.target.dead?fn(ctx.target):alive().some(fn);
const nextHit=e=>{if(!intentAtk(e))return 0;const m=move(e);return enemyDmg(e,m.k==='atk'?m.n:m.atk)*(m.times||1);};
function koCheck(t){if(!t.dead&&t.poison>=t.cap){t.stun=1;t.cap=Math.ceil(t.cap*1.5);fxAt(B.enemies.indexOf(t),'麻翻！','g','debuff');}}
const enemyDmg=(e,n)=>{let d=Math.max(0,n+e.str);if(e.weak>0)d=Math.floor(d*.75);if(B.vuln>0)d=Math.floor(d*1.5);return d;};
function fxAt(who,txt,cls,anim){B.fx.push({who,txt,cls,anim});}
function hitEnemy(e,n,pierce){if(e.dead)return 0;let d=Math.max(0,n+B.str+B.tstr);if(e.vuln>0)d=Math.floor(d*1.5);if(B.weak>0)d=Math.floor(d*.75);let dealt=d;if(!pierce){const ab=Math.min(e.block,d);e.block-=ab;dealt=d-ab;}
  e.hp-=dealt;fxAt(B.enemies.indexOf(e),dealt?'-'+dealt:'挡住',dealt?'':'g',dealt?'slash':'guard');if(e.hp<=0){e.hp=0;e.dead=true;e.killer=B.cur;}return dealt;}
// 执行一条效果。ctx：card 这张牌，target 选中的敌人，x 耗尽的义气（X 费牌），auto 驻场触发（没有目标时随机打）
function execFx(f,ctx){const c=ctx.card,cd=def(c);
  if(f.cond==='combo'&&B.count===0)return;if(f.cond==='low'&&R.hp>=R.maxhp/2)return;if(f.cond==='eatk'&&!anyOr(ctx,intentAtk))return;if(f.cond==='ebuff'&&!anyOr(ctx,e=>intentK(e,'buff')))return;if(f.cond==='eblk'&&!anyOr(ctx,e=>intentK(e,'blk')))return;if(f.cond==='ko'&&!anyOr(ctx,e=>e.stun>0))return;
  if(f.cond==='full'&&!((c.kept||0)>=3))return;if(f.cond==='re'&&!((c.re||0)>=2))return;if(f.cond==='drunk'&&B.drunk<3)return;if(f.cond==='alone'&&B.hand.length>0)return;
  const T=()=>ctx.target&&!ctx.target.dead?ctx.target:(ctx.auto?pick(alive()):alive()[0]),n=f.n*(f.perEnergy?ctx.x:1);
  if(f.t==='dmg'){let base=f.blockVal?B.block:n;if(f.grow)base+=c.grow||0;if(f.store)base+=f.store*(c.kept||0);if(f.drunk)base+=f.drunk*B.drunk;if(f.wealth)base+=f.wealth*Math.min(6,Math.floor(R.gold/50));if(f.dice){const r=1+rnd(f.dice);base*=r;fxAt('me','掷出 '+r+' 点','g','spark');}if(f.lowHp&&R.hp<R.maxhp/2)base=f.lowHp;if(f.vanguard&&B.count===0)base+=f.vanguard;if(f.combo)base+=f.combo*B.count;if(f.perHand)base+=f.perHand*B.hand.length;
    if(f.sameFac)base+=f.sameFac*[...B.played].filter(id=>CARDS[id].fac===cd.fac).length;let total=0;const fixed=f.random||f.aoe?null:T();
    const one=t=>{if(!t||t.dead)return;let v=base+(f.judo?Math.min(30,nextHit(t)):0);if(f.poisonX)v+=f.poisonX*t.poison;if(f.half&&t.hp<t.maxhp/2)v+=f.half;if(f.x2IfAtk&&intentAtk(t))v*=2;const was=t.dead;total+=hitEnemy(t,v,f.pierce);if(f.repeatIfVuln&&t.vuln>0)total+=hitEnemy(t,v,f.pierce);if(f.killGold&&t.dead&&!was){R.gold+=f.killGold;fxAt('me','+'+f.killGold+' 文','g','spark');sfx('gold');}};
    const tms=(f.times||1)+(f.storeTimes?f.storeTimes*(c.kept||0):0)+(f.drunkTimes?Math.floor(B.drunk/f.drunkTimes):0);for(let k=0;k<tms;k++){if(f.random)one(pick(alive()));else if(f.aoe)alive().forEach(one);else one(fixed&&!fixed.dead?fixed:(ctx.auto?null:alive()[0]));}
    if(f.lifesteal&&total>0){R.hp=Math.min(R.maxhp,R.hp+total);fxAt('me','+'+total,'g','spark');}if(f.grow)c.grow=(c.grow||0)+f.grow;sfx('hit');}
  else if(f.t==='apply'){const ts=f.aoe?alive():[T()];for(const t of ts)if(t&&!t.dead){t[f.s]+=n;fxAt(B.enemies.indexOf(t),SNAME[f.s]+' +'+n,'g',f.s==='poison'?'poison':'debuff');if(f.s==='poison')koCheck(t);}}
  else if(f.t==='block'){B.block+=n;fxAt('me','+'+n+' 护甲','g','shield');sfx('blk');}
  else if(f.t==='draw')drawCards(f.n);
  else if(f.t==='energy'){B.energy+=f.n;fxAt('me','+'+f.n+' 义气','g','spark');}
  else if(f.t==='nextEnergy')B.nextEnergy+=f.n;
  else if(f.t==='overload'){B.nextEnergy-=f.n;fxAt('me','下回合义气 -'+f.n,'r');}
  else if(f.t==='selfdmg'){R.hp-=f.n;fxAt('me','-'+f.n,'r','hurt');}
  else if(f.t==='gold'){R.gold+=f.n;fxAt('me','+'+f.n+' 文','g','spark');sfx('gold');}
  else if(f.t==='heal'){const h=Math.min(f.n,R.maxhp-R.hp);R.hp+=h;if(h)fxAt('me','+'+h,'g','spark');}
  else if(f.t==='pstr'){B.str+=f.n;fxAt('me','士气 +'+f.n,'g','spark');}
  else if(f.t==='nextDraw')B.nextDraw+=f.n;
  else if(f.t==='dblBlock'){B.block*=2;fxAt('me','护甲翻倍','g','shield');sfx('blk');}
  else if(f.t==='cleanse'){if(B.vuln||B.weak)fxAt('me','解除','g','spark');B.vuln=0;B.weak=0;}
  else if(f.t==='recruit'){for(let k=0;k<f.n;k++)if(B.hand.length<10)B.hand.push({id:109,temp:1});}
  else if(f.t==='copy'){if(B.last&&B.hand.length<10){B.hand.push({id:B.last.id,up:B.last.up,temp:1});fxAt('me','复制 '+def(B.last).name,'g','spark');}}
  else if(f.t==='discard'){for(let k=0;k<f.n;k++){const l=B.hand.filter(h=>!h.wine);if(!l.length)break;const d=pick(l);B.hand.splice(B.hand.indexOf(d),1);if(!d.temp)B.disc.push(d);fxAt('me','弃 '+def(d).name,'r');for(const g of fxOf(d))if(g.on==='disc'&&alive().length)execFx(g,{card:d,auto:true,x:0});}}
  else if(f.t==='wine'){for(let k=0;k<f.n;k++)if(B.hand.length<10)B.hand.push({id:114,temp:1,wine:1});fxAt('me','上酒 '+f.n+' 碗','g','spark');}
  else if(f.t==='drink'){B.drunk++;B.tstr++;fxAt('me','醉意 '+B.drunk,'g','spark');fire('drink');}
  else if(f.t==='bank'){B.bank=1;fxAt('me','养精蓄锐','g','spark');}
  else if(f.t==='drawTo')drawCards(Math.max(0,f.n-B.hand.length));
  else if(f.t==='ward'){if(!B.wardUsed){B.ward=1;fxAt('me','丹书铁券','g','shield');}}
  else if(f.t==='firstCut')B.firstCut=Math.max(B.firstCut,f.n);
  else if(f.t==='spring'){for(const tr of B.traps)for(const g of tr.fx)if(alive().length)execFx(g,{card:tr.c,target:T(),auto:true,x:0});if(B.traps.length)fxAt('me','收网','g','spark');}
  else if(f.t==='turncoat'&&f.aoe){alive().forEach(t=>{t.turncoat=1;fxAt(B.enemies.indexOf(t),'反间','g','debuff');});}
  else if(f.t==='forge'){const l=shuffle(B.hand.filter(h=>!h.up&&!def(h).unplayable)).slice(0,f.n);for(const h of l)h.up=1;if(l.length)fxAt('me','强化 '+l.map(h=>def(h).name).join('、'),'g','spark');}
  else if(TARGETED[f.t]){for(const t of(f.aoe?alive():[T()]))if(t){const ti=B.enemies.indexOf(t);
    if(f.t==='detonate'){if(t.poison>0){const d=t.poison*f.n;t.hp-=d;fxAt(ti,'-'+d,'g','poison');if(t.hp<=0){t.hp=0;t.dead=true;}}}
    else if(f.t==='strip'){if(t.block>0)fxAt(ti,'破甲','g','debuff');t.block=0;}
    else if(f.t==='stun'){t.stun=1;fxAt(ti,'眩晕','g','debuff');}
    else if(f.t==='sap'){t.str-=f.n;fxAt(ti,'泄劲 -'+f.n,'g','debuff');}
    else if(f.t==='execute'){if(t.hp<=f.n){t.hp=0;t.dead=true;t.killer=B.cur;fxAt(ti,'斩！','','slash');}}
    else if(f.t==='steal'){if(t.block>0){B.block+=t.block;fxAt('me','偷来 '+t.block+' 护甲','g','shield');t.block=0;}else if(t.str>0){B.str+=t.str;fxAt('me','偷来士气 +'+t.str,'g','spark');t.str=0;}else{R.gold+=12;fxAt('me','+12 文','g','spark');sfx('gold');}}
    else if(f.t==='turncoat'){t.turncoat=1;fxAt(ti,'反间','g','debuff');}
    else if(f.t==='unbuff'){if(t.str>0){t.str=0;fxAt(ti,'蓄力清空','g','debuff');}}
    else if(f.t==='release'){if(!t.d.boss&&t.hp<t.maxhp/2){t.hp=0;t.dead=true;t.freed=1;fxAt(ti,'放它走了','g','debuff');drawCards(f.n);B.str+=1;fxAt('me','士气 +1','g','spark');}else fxAt(ti,'不肯走','r');}}}
}
// 出牌动画：打人的牌飞向目标（群体飞向战场中央），不打人的牌飞向自己
function flyCard(i,target,self){const el=app.querySelector(`.hand .card[data-i="${i}"]`);if(!el||window.__fast)return Promise.resolve();
  const host=self?app.querySelector('[data-me]'):target?app.querySelector(`[data-foe="${B.enemies.indexOf(target)}"] .pic`):app.querySelector('.foes');if(!host)return Promise.resolve();
  const r=el.getBoundingClientRect(),t=host.getBoundingClientRect(),gh=el.cloneNode(true);gh.classList.remove('sel','no');
  Object.assign(gh.style,{position:'fixed',left:r.left+'px',top:r.top+'px',margin:'0',zIndex:50,pointerEvents:'none',transition:'transform .27s cubic-bezier(.3,.7,.3,1),opacity .27s',animation:'none'});
  document.body.appendChild(gh);el.style.visibility='hidden';const pv=app.querySelector('.preview');if(pv)pv.remove();
  const dx=t.left+t.width/2-(r.left+r.width/2),dy=t.top+t.height/2-(r.top+r.height/2);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{gh.style.transform=`translate(${dx}px,${dy}px) scale(${self?.25:.5}) rotate(${self?0:dx>0?9:-9}deg)`;gh.style.opacity='.1';}));
  return new Promise(res=>setTimeout(()=>{gh.remove();res();},290));}
function discover(pool){const ok=h=>pool==='任意'||(pool==='天罡'?h.id<=36:pool==='地煞'?h.id>36:FAC[h.fac]===pool),three=shuffle(HEROES.filter(ok)).slice(0,3);
  const take=id=>{if(B&&B.hand.length<10)B.hand.push({id,temp:1});};if(window.__fast||!three.length){if(three.length)take(three[0].id);return Promise.resolve();}
  return new Promise(res=>{modal.innerHTML=`<h3>挑一位好汉加入手牌（只在这一场）</h3><div class="grid">${three.map(h=>cardHTML({id:h.id})).join('')}</div>`;modal.classList.remove('hide');
    modal.onclick=e=>{const el=e.target.closest('.card');if(!el)return;modal.classList.add('hide');take(+el.dataset.id);sfx('win');res();};});}
function openChoice(i,ch){const c=B.hand[i];modal.innerHTML=`<h3>${def(c).name} · 抉择</h3><div class="choice">${ch.txt.map((t,k)=>`<button class="btn big" data-opt="${k}">${t}</button>`).join('')}</div><button class="btn" data-act="close">再想想</button>`;modal.classList.remove('hide');
  modal.onclick=e=>{if(e.target.closest('[data-act=close]')){modal.classList.add('hide');return;}const b=e.target.closest('[data-opt]');if(!b)return;modal.classList.add('hide');B.opt=+b.dataset.opt;
    if(needsTargetFx(activeFx(c,B.opt))){B.sel=i;render();}else play(i,null,B.opt);};}
async function play(i,target,opt,free){const c=B.hand[i];if(!c)return;const cd=def(c),cost=free?0:costOf(c);if((B.busy&&!free)||B.over||cd.unplayable||cost>B.energy)return;B.busy=true;sfx('card');
  const all=activeFx(c,opt),fxs=all.filter(f=>!passive(f)),trigs=all.filter(f=>f.trig),traps=all.filter(f=>f.trap),delays=all.filter(f=>f.delay),tg=fxs.some(aimed)?(target&&!target.dead?target:alive()[0]):null;
  await flyCard(i,tg,!fxs.some(f=>f.t==='dmg'||f.t==='apply'||TARGETED[f.t]));if(!B||B.over)return;
  const x=B.energy;B.energy-=cost;B.hand.splice(B.hand.indexOf(c),1);B.sel=null;B.opt=null;B.cur=c;const ctx={card:c,target:tg,x:cd.cost==='X'?x:0};
  for(const f of fxs){if(f.t==='discover'){render();await discover(f.pool);if(!B)return;}else if(f.t==='tutor'){render();await tutor(f.pool,c);if(!B)return;}else execFx(f,ctx);}
  B.played.add(c.id);B.count++;if(!c.wine)B.last=c;c.kept=0;
  if(c.wine){}else if(fxs.some(f=>f.t==='rehand')){c.re=(c.re||0)+1;B.hand.push(c);}
  else if(trigs.length)B.field.push({c,fx:trigs,pop:1});
  else if(traps.length){if(B.traps.length>=3){const o=B.traps.shift();if(!o.c.temp)B.disc.push(o.c);}B.traps.push({c,fx:traps,kind:traps[0].trap,pop:1});}
  else if(delays.length)B.field.push({c,fx:[],dfx:delays,left:delays[0].delay,pop:1});
  else if(!fxs.some(f=>f.t==='exhaust')&&!c.temp)B.disc.push(c);
  fire('play',{src:c});fire('fac',{src:c,fac:cd.fac});
  if(!free&&fxs.some(f=>f.t==='follow'))for(const b of cd.bond){const j=B.hand.findIndex(h=>h.id===b);if(j>=0&&alive().length&&!B.over){render();await sleep(200);await play(j,tg,null,true);if(!B)return;}}
  B.busy=false;render();checkEnd();}
// 点将：从自己的牌堆（没有就从弃牌堆）里亮出三张符合条件的，挑一张到手牌
function tutor(pool,card){const ok=h=>{const d=def(h);if(d.unplayable||d.id>113)return false;return pool==='任意'||(pool==='结义'?def(card).bond.includes(h.id):pool==='天罡'?h.id<=36:pool==='地煞'?h.id>36&&h.id<=108:FAC[d.fac]===pool);};
  let pile=B.draw,l=pile.filter(ok);if(!l.length){pile=B.disc;l=pile.filter(ok);}if(!l.length){drawCards(1);return Promise.resolve();}const three=shuffle(l).slice(0,3);
  const take=h=>{pile.splice(pile.indexOf(h),1);if(B.hand.length<10)B.hand.push(h);else B.disc.push(h);};if(window.__fast){take(three[0]);return Promise.resolve();}
  return new Promise(res=>{modal.innerHTML=`<h3>点将：请哪一位到手牌？</h3><div class="grid">${three.map((h,k)=>cardHTML(h,{i:k})).join('')}</div>`;modal.classList.remove('hide');
    modal.onclick=e=>{const el=e.target.closest('.card');if(!el)return;modal.classList.add('hide');take(three[+el.dataset.i]);sfx('win');res();};});}
function checkEnd(){if(B.over)return true;if(R.hp<=0){B.over=true;R.hp=0;later(showLose,900);return true;}if(!alive().length){B.over=true;later(showReward,900);return true;}return false;}
async function endTurn(){if(B.busy||B.over)return;B.busy=true;B.sel=null;B.opt=null;fire('end');if(B.bank){B.nextEnergy+=B.energy;B.bank=0;}
  {const keep=[];for(const c of B.hand){c.re=0;const fl=fxOf(c),st=fl.some(f=>f.store||f.storeTimes);if(c.wine||st||fl.some(f=>f.t==='retain')){if(st)c.kept=Math.min(3,(c.kept||0)+1);keep.push(c);}else if(!c.temp)B.disc.push(c);}B.hand=keep;}render();if(checkEnd())return;
  for(const e of B.enemies){if(e.dead)continue;await sleep(480);if(e.dead)continue;e.block=0;const ei=B.enemies.indexOf(e);
    if(e.poison>0){e.hp-=e.poison;fxAt(ei,'-'+e.poison,'g','poison');e.poison--;if(e.hp<=0){e.hp=0;e.dead=true;render();continue;}}
    if(!e.stun){const m0=move(e),kind=m0.k==='atk'||(m0.k==='debuff'&&m0.atk)?'atk':m0.k;for(const tr of B.traps.slice())if(tr.kind===kind&&!e.dead){B.traps.splice(B.traps.indexOf(tr),1);fxAt(ei,'中了埋伏','g','debuff');for(const g of tr.fx)execFx(g,{card:tr.c,target:e,auto:true,x:0});if(!tr.c.temp)B.disc.push(tr.c);render();await sleep(380);}if(e.dead){render();continue;}}
    if(e.stun){e.stun=0;e.turncoat=0;fxAt(ei,'眩晕中','g','debuff');if(e.vuln>0)e.vuln--;if(e.weak>0)e.weak--;e.act='pulse';render();e.act=0;continue;}
    const m=move(e),strike=(n,times)=>{if(e.turncoat){const others=alive().filter(x=>x!==e);for(let k=0;k<(times||1);k++){let d=Math.max(0,n+e.str);if(e.weak>0)d=Math.floor(d*.75);if(!others.length||e.d.boss)d=Math.floor(d/2);const t=others.filter(x=>!x.dead).length?pick(others.filter(x=>!x.dead)):e,ab=Math.min(t.block,d);t.block-=ab;t.hp-=d-ab;fxAt(B.enemies.indexOf(t),'-'+(d-ab),'g','slash');if(t.hp<=0){t.hp=0;t.dead=true;}}sfx('hit');return;}
      for(let k=0;k<(times||1);k++){const d=enemyDmg(e,n),ab=Math.min(B.block,d);B.block-=ab;R.hp-=d-ab;B.hitsNow++;fxAt('me',d-ab?'-'+(d-ab):'挡住',d-ab?'r':'g',d-ab?'hurt':'shield');if(R.hp<=0&&B.ward){R.hp=1;B.ward=0;B.wardUsed=1;B.block+=20;fxAt('me','丹书铁券！','g','shield');}}sfx(R.hp>0?'hurt':'lose');fire('hit',{target:e});};
    e.act='pulse';
    if(m.k==='atk'){strike(m.n,m.times);e.act='lunge';}else if(m.k==='blk'){e.block+=m.n;fxAt(ei,'护甲 +'+m.n,'g','guard');sfx('blk');}else if(m.k==='buff'){e.str+=m.n;fxAt(ei,'蓄力 +'+m.n,'r','buff');}
    else if(m.k==='debuff'){if(m.atk){strike(m.atk,1);e.act='lunge';}B[m.s]+=m.n;fxAt('me',SNAME[m.s]+' +'+m.n,'r');}
    e.turncoat=0;if(e.dead){render();continue;}e.mi=(e.mi+1)%e.d.moves.length;if(e.vuln>0)e.vuln--;if(e.weak>0)e.weak--;render();e.act=0;if(R.hp<=0)break;}
  await sleep(450);if(B.vuln>0)B.vuln--;if(B.weak>0)B.weak--;if(checkEnd())return;startTurn();}
const ICON=k=>`<img class="ic" src="${LOCAL['icon/'+k]||ART.icon+k+'.jpg'}" onerror="this.style.display='none'">`;
const SLBL={block:'护甲',str:'蓄力（士气）',vuln:'破绽',weak:'虚弱',poison:'蒙汗药'};
const SDESC={block:'抵消等量伤害，到自己下次行动时清零。',str:'每次攻击多打这么多点；负数则少打。',vuln:'受到的伤害 +50%，每回合减 1。',weak:'造成的伤害 -25%，每回合减 1。',poison:'每回合行动前先掉这么多生命，然后减 1 层。'};
const chip=(k,n)=>`<span class="st ${k}" data-tip="${SLBL[k]} ${n}。${SDESC[k]}">${ICON(k)}<b>${n}</b></span>`;
const xchip=(t,n,tip)=>`<span class="st x" data-tip="${tip}"><i>${t}</i><b>${n}</b></span>`;
const stHTML=o=>['block','str','vuln','weak','poison'].filter(k=>k==='str'?o[k]:o[k]>0).map(k=>k==='poison'&&o.cap?`<span class="st poison" data-tip="蒙汗药 ${o.poison}。${SDESC.poison}叠到 ${o.cap} 层就被麻翻，跳过一次行动。">${ICON('poison')}<b>${o.poison}/${o.cap}</b></span>`:chip(k,o[k])).join('')
  +(o.turncoat?xchip('间','','中了反间计：它的下一次攻击会打在同伙身上。'):'')+(o===B&&B.drunk?xchip('醉',B.drunk,'醉意：本回合喝过的酒。每碗让你本回合每次攻击多打 1 点。'):'')+(o===B&&B.ward?xchip('券','','丹书铁券：受到致命伤害时留住 1 点生命并得 20 护甲。'):'')+(o===B&&B.bank?xchip('蓄','','没花完的义气会留到下回合。'):'');
function intentHTML(e){if(e.stun)return '<b class="buf" data-tip="眩晕中：这回合它什么也做不了。">晕</b>';const m=move(e),a=(n,t)=>`${ICON('atk')}${enemyDmg(e,n)}${t>1?'×'+t:''}`,note='数字已算上它的蓄力、虚弱和你的破绽；你的护甲会先抵掉伤害。';
  if(m.k==='atk')return `<b data-tip="${e.name}准备攻击：打你 ${enemyDmg(e,m.n)} 点${m.times>1?'，连打 '+m.times+' 次':''}。${note}">${a(m.n,m.times)}</b>`;
  if(m.k==='blk')return `<b class="blk" data-tip="${e.name}准备防守：给自己加 ${m.n} 点护甲，这回合不打你。">${ICON('block')}${m.n}</b>`;
  if(m.k==='buff')return `<b class="buf" data-tip="${e.name}准备蓄力：之后它每次攻击多打 ${m.n} 点，这回合不打你。">${ICON('str')}+${m.n}</b>`;
  const eff=m.s==='vuln'?'露出破绽（受到的伤害 +50%）':'虚弱（造成的伤害 -25%）';
  return `<b data-tip="${e.name}准备${m.atk?'攻击：打你 '+enemyDmg(e,m.atk)+' 点，并':''}让你${eff} ${m.n} 回合。">${m.atk?a(m.atk,1):''}${ICON(m.s)}</b>`;}
function render(){if(!B)return;hideTip();const sel=B.sel!=null&&B.hand[B.sel],selC=sel?B.hand[B.sel]:null;
  const tip=sel?(needsTarget(selC)?'点一个敌人作为目标':(COARSE?'再点一次这张牌打出':'')):'';
  app.innerHTML=topBar(`<span>第 ${B.turn} 回合</span>`)+`<div class="battle">${tip?`<div class="tip">${tip}</div>`:''}
  <div class="foes">${B.enemies.map((e,i)=>`<div class="foe ${e.dead?'dead':''} ${e.d.boss?'boss':''} ${sel&&!e.dead?'pick':''} ${e.act||''}" data-foe="${i}"><div class="intent">${e.dead?'':intentHTML(e)}</div><div class="pic">${imgTag('enemy',e.id)}</div><div class="nm">${e.name}</div><div class="bar"><i style="width:${e.hp/e.maxhp*100}%"></i><b>${e.hp} / ${e.maxhp}</b></div><div class="sts">${stHTML(e)}</div></div>`).join('')}</div>
  ${COARSE&&sel?`<div class="preview">${cardHTML(selC,{battle:1})}</div>`:''}
  <div class="me"><div class="left"><div class="field">${B.field.map(it=>`<span class="tok ${it.pop?'pop':''}" data-tip="${def(it.c).name}（${it.left?'还有 '+it.left+' 回合发动':'驻场'}）：${it.c.up?def(it.c).descUp:def(it.c).desc}">${imgTag('liangshan',it.c.id)}${it.left?`<b>${it.left}</b>`:''}</span>`).join('')}${B.traps.map(it=>`<span class="tok trap ${it.pop?'pop':''}" data-tip="${def(it.c).name}（埋伏中）：${it.c.up?def(it.c).descUp:def(it.c).desc}">${imgTag('liangshan',it.c.id)}<b>伏</b></span>`).join('')}</div>
   <div class="plate" data-me="1"><div class="emb">${ICON('emblem')}<div class="orb" data-tip="义气：出牌要花的点数，每回合回到 ${BASE_ENERGY} 点。">${B.energy}</div></div>
    <div class="pinfo"><div class="pname">梁山泊<span>义气 ${B.energy} / ${BASE_ENERGY}</span></div><div class="bar hpbar ${B.block>0?'blk':''}" data-tip="山寨生命：归零则这一趟到此为止。蓝边表示现在有护甲。"><i style="width:${Math.max(0,R.hp)/R.maxhp*100}%"></i><b>${Math.max(0,R.hp)} / ${R.maxhp}</b></div><div class="sts">${stHTML(B)}</div></div></div></div>
  <div class="hand ${B.deal?'deal':''}">${B.hand.map((c,i)=>cardHTML(c,{i,battle:1,style:'--i:'+i,cls:(costOf(c)>B.energy?'no ':'')+(B.sel===i?'sel':'')})).join('')}</div>
  <div class="endcol"><div class="lbl" data-tip="牌堆是还没抽到的牌；弃牌是用过的牌。牌堆抽完后，弃牌洗回牌堆。">牌堆 ${B.draw.length}　弃牌 ${B.disc.length}</div><button class="btn red big" data-act="end" ${B.busy||B.over?'disabled':''}>收兵</button></div></div></div>`;
  B.deal=false;B.field.forEach(it=>it.pop=0);B.traps.forEach(it=>it.pop=0);let meHurt=false;
  for(const f of B.fx){const me=f.who==='me',host=me?app.querySelector('[data-me]'):app.querySelector(`[data-foe="${f.who}"]`);if(!host)continue;
    const n=host.querySelectorAll('.float').length,el=document.createElement('div');el.className='float '+(f.cls||'');el.textContent=f.txt;el.style.top=(me?-34:60)-n*30+'px';el.style.animationDelay=n*.09+'s';host.appendChild(el);
    if(!f.anim)continue;if(me){if(f.anim==='hurt'){meHurt=true;host.classList.add('shake');}else host.classList.add('fx-'+f.anim);}
    else{const pic=host.querySelector('.pic'),v=document.createElement('div'),k=pic.querySelectorAll('.vfx').length;v.className='vfx '+f.anim;v.style.setProperty('--r',(-38+k*55)+'deg');v.style.animationDelay=k*.09+'s';pic.appendChild(v);if(f.anim==='slash')host.classList.add('hit');}}
  if(meHurt){const fl=document.createElement('div');fl.className='hurtflash';app.appendChild(fl);}
  B.fx=[];const hd=app.querySelector('.hand'),n=B.hand.length;if(hd&&n){const cw=hd.querySelector('.card').offsetWidth,m=Math.min(6,(hd.clientWidth-n*cw-8)/(2*Math.max(1,n-1)));hd.querySelectorAll('.card').forEach((c,j)=>{c.style.marginLeft=(j?m:0)+'px';c.style.marginRight=(j<n-1?m:0)+'px';});}}
function clickCard(i){if(B.busy||B.over)return;const c=B.hand[i];if(!c)return;
  if(COARSE&&B.sel!==i){B.sel=i;B.opt=null;sfx('ui');render();return;}
  if(def(c).unplayable||costOf(c)>B.energy){sfx('blk');return;}
  const ch=fxOf(c).find(f=>f.t==='choose');if(ch&&(B.sel!==i||B.opt==null)){openChoice(i,ch);return;}
  if(needsTargetFx(activeFx(c,B.opt))){if(!COARSE){if(B.sel===i&&!ch){B.sel=null;B.opt=null;}else B.sel=i;render();}}else play(i,null,B.opt);}

// ---- 战后 ----
function showReward(){const boss=B.kind==='boss',elite=B.kind==='elite',g=boss?60+rnd(11):elite?35+rnd(11):15+rnd(11);R.gold+=g;sfx('win');let extra='';
  if(elite){const c=upgradeRandom();if(c)extra+=`${def(c).name}在恶战中得到了操练。`;}
  if(boss){if(R.slot>=5){B=null;showWin();return;}if(R.will){const be=B.enemies.find(e=>e.d.boss),k=be&&be.killer&&be.killer.src;let src=k&&R.deck.includes(k)&&k.id<=108?k:null;if(!src){const l=R.deck.filter(c=>c.id<=108);src=l.length?pick(l):null;}if(src){src.up=1;src.cut=(src.cut||0)+1;extra+=`${def(src).name}亲手拿下了敌酋，应了晁天王的遗言：得到操练，从此少花 1 点义气。<br>`;}R.will=0;}const h=Math.round(R.maxhp*.3);R.hp=Math.min(R.maxhp,R.hp+h);extra+=`大胜之后杀牛宰马，山寨回复 ${h} 点生命。`;if(ACTS[R.act].outro)extra=`<span class="outro">${ACTS[R.act].outro}</span><br>`+extra;}
  for(const e of B.enemies)if(JOIN[e.id]&&!e.freed&&!owned().has(JOIN[e.id])){R.deck.push({id:JOIN[e.id]});extra+=`<br><b>${CARDS[JOIN[e.id]].name}</b>被打服了，归顺上山。`;}
  const offers=heroOffers(3);B=null;
  app.innerHTML=topBar()+`<div class="panel"><h2>得胜</h2><p>缴获 ${g} 文钱。${extra}${offers.length?'<br>有好汉闻名来投，请一位上山：':'<br>名册上的好汉都已到齐。'}</p><div class="row">${offers.map(h=>cardHTML({id:h.id},{cls:'offer'})).join('')}</div><button class="btn" data-act="skip">${offers.length?'一位也不请':'继续赶路'}</button></div>`;}
function showLose(){sfx('lose');clearSave();const n=R.deck.filter(c=>def(c).fac!=='lou'&&def(c).fac!=='fei').length;B=null;
  app.innerHTML=`<div class="panel"><h2>山寨失守</h2><p>${ACTS[R.act].name}，梁山泊的杏黄旗倒了。<br>这一趟聚起了 ${n} 位好汉，打了 ${R.fights} 仗。</p><button class="btn big" data-act="title">重整旗鼓</button></div>`;}
function showWin(){sfx('win');clearSave();setBg('cover');const n=R.deck.filter(c=>def(c).fac!=='lou'&&def(c).fac!=='fei').length;
  app.innerHTML=`<div class="panel"><h2>替天行道</h2><p>${/征辽/.test(ACTS[R.act].name)?'大辽递了降表，一百单八人一个不少。':'方腊已平。'}聚义厅前，${n} 位好汉把酒言欢，杏黄旗在水泊上空猎猎作响。<br>打了 ${R.fights} 仗，山寨尚余 ${R.hp} 点生命。</p><div class="row">${R.deck.filter(c=>def(c).fac!=='lou'&&def(c).fac!=='fei').slice(0,8).map(c=>cardHTML(c)).join('')}</div><button class="btn big" data-act="title">再聚一回</button></div>`;}

// ---- 聚义厅 / 酒店 / 奇遇 ----
function showRest(){const h=Math.round(R.maxhp*.3);
  app.innerHTML=topBar()+`<div class="panel"><h2>聚义厅</h2><p>弟兄们难得喘口气。只能做一件事：</p><div class="opts">
  <div class="node rest" data-rest="heal"><div class="ic">歇</div><b>大碗喝酒</b><span>回复 ${h} 点生命</span></div>
  <div class="node rest" data-rest="up"><div class="ic">练</div><b>操练</b><span>挑一位好汉，强化他的牌</span></div>
  <div class="node rest" data-rest="rm"><div class="ic">散</div><b>下山</b><span>请一位好汉下山，从名册里去掉一张牌</span></div></div></div>`;}
function doRest(k){if(k==='heal'){R.hp=Math.min(R.maxhp,R.hp+Math.round(R.maxhp*.3));sfx('win');nextStep();}
  else if(k==='up')showDeck('操练哪一位？',c=>!c.up&&!def(c).unplayable,i=>{R.deck[i].up=1;sfx('win');nextStep();});
  else showDeck('请哪一位下山？',null,i=>{R.deck.splice(i,1);sfx('ui');nextStep();});}
let SHOP=null;
function showShop(fresh){if(fresh!==false||!SHOP)SHOP={heroes:heroOffers(3).map(h=>({id:h.id,price:50+rnd(21)})),up:1,rm:1,bun:1};
  const it=(k,ic,nm,ds,price)=>`<div class="col ${SHOP[k]?'':'sold'}"><div class="node shop" data-shop="${k}" style="width:170px;padding:14px 10px"><div class="ic">${ic}</div><b>${nm}</b><span>${ds}</span></div><div class="price">${price} 文</div></div>`;
  app.innerHTML=topBar()+`<div class="panel"><h2>朱贵酒店</h2><p>「客官打哪儿来？小店有酒有肉，也有消息。」</p><div class="row">${SHOP.heroes.map((h,i)=>`<div class="col ${h.sold?'sold':''}">${cardHTML({id:h.id},{cls:'buy',i})}<div class="price">${h.price} 文</div></div>`).join('')}
  ${it('up','练','操练','强化一张牌',60)}${it('rm','散','下山','去掉任意一张牌',50)}${it('bun','包','肉包子','回复 15 点生命',25)}</div><button class="btn" data-act="leave">结账赶路</button></div>`;}
function pay(n){if(R.gold<n){sfx('blk');return false;}R.gold-=n;sfx('gold');return true;}
function doShop(k){if(!SHOP[k])return;if(k==='bun'){if(pay(25)){R.hp=Math.min(R.maxhp,R.hp+15);SHOP.bun=0;showShop(false);}}
  else if(k==='up'){if(R.gold<60){sfx('blk');return;}showDeck('操练哪一位？',c=>!c.up&&!def(c).unplayable,i=>{pay(60);R.deck[i].up=1;SHOP.up=0;showShop(false);});}
  else if(k==='rm'){if(R.gold<50){sfx('blk');return;}showDeck('请哪一位下山？',null,i=>{pay(50);R.deck.splice(i,1);SHOP.rm=0;showShop(false);});}}
let EV=null;
function showEvent(){const ok=e=>!R.seen.includes(e.id)&&R.slot>=(e.minAct||0);let pool=EVENTS.filter(ok);if(!pool.length)pool=EVENTS.filter(e=>e.id==='jing');EV=pick(pool);R.seen.push(EV.id);
  app.innerHTML=topBar()+`<div class="panel story"><h2>${EV.title}</h2><p>${EV.text}</p><div class="col">${EV.opts.map((o,i)=>`<button class="btn" data-ev="${i}" ${o.cost&&R.gold<o.cost?'disabled':''}>${o.t}</button>`).join('')}</div></div>`;}
function doEvent(i){const o=EV.opts[i],msg=[];if(o.cost){if(R.gold<o.cost)return;R.gold-=o.cost;msg.push(`花去 ${o.cost} 文。`);}sfx('ui');
  if(o.gold){R.gold+=o.gold;msg.push(`得 ${o.gold} 文钱。`);}if(o.maxhp){R.maxhp+=o.maxhp;R.hp+=o.maxhp;msg.push(`生命上限 +${o.maxhp}。`);}
  if(o.hp){const b=R.hp;R.hp=Math.max(1,Math.min(R.maxhp,R.hp+o.hp));msg.push(o.hp>0?`回复 ${R.hp-b} 点生命。`:`山寨失去 ${b-R.hp} 点生命。`);}if(o.heal){R.hp=R.maxhp;msg.push('生命回满。');}
  if(o.curse){for(let k=0;k<o.curse;k++)R.deck.push({id:o.curseId||111});msg.push(`牌组里多了 ${o.curse} 张「${CARDS[o.curseId||111].name}」。`);}
  if(o.upgrade){const ns=[];for(let k=0;k<o.upgrade;k++){const c=upgradeRandom();if(c)ns.push(def(c).name);}msg.push(ns.length?`${ns.join('、')}得到了操练。`:'已经没有可操练的牌了。');}
  if(o.addCard){if(owned().has(o.addCard)){R.gold+=50;msg.push(`${CARDS[o.addCard].name}早已在山上，改得 50 文。`);}else{R.deck.push({id:o.addCard});msg.push(`${CARDS[o.addCard].name}上了梁山。`);}}
  if(o.removeCard){showDeck('请哪一位下山？',null,j=>{R.deck.splice(j,1);nextStep();});return;}
  if(!msg.length){nextStep();return;}
  app.innerHTML=topBar()+`<div class="panel story"><h2>${EV.title}</h2><p>${msg.join('<br>')}</p><button class="btn" data-act="skip">继续赶路</button></div>`;}

// ---- 悬浮说明：带 data-tip 的元素，鼠标移上去立刻显示；手机上点一下显示 ----
const tipEl=$('#tip');let tipT=0;
function showTip(el){tipEl.textContent=el.dataset.tip;tipEl.classList.add('on');const r=el.getBoundingClientRect(),w=tipEl.offsetWidth,h=tipEl.offsetHeight;let x=r.left+r.width/2-w/2,y=r.top-h-9;if(y<4)y=r.bottom+9;tipEl.style.left=Math.max(6,Math.min(innerWidth-w-6,x))+'px';tipEl.style.top=y+'px';}
const hideTip=()=>tipEl.classList.remove('on');
document.addEventListener('mouseover',e=>{if(COARSE)return;const el=e.target.closest&&e.target.closest('[data-tip]');if(el)showTip(el);else hideTip();});
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');if(COARSE&&el){showTip(el);clearTimeout(tipT);tipT=setTimeout(hideTip,2800);}else hideTip();},true);

// ---- 输入 ----
app.addEventListener('click',e=>{if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(x){}}
  const t=e.target,a=t.closest('[data-act]');
  if(a){const k=a.dataset.act;if(k==='new')newRun();else if(k==='cont'){R=load();R.fork?showFork():showMap();}else if(k==='fork')showFork();else if(k==='deck')showDeck();else if(k==='roster')showRoster();else if(k==='go'){R.intro[R.act]=1;sfx('ui');showMap();}else if(k==='mount')pickDir();else if(k==='unmount')unmount();else if(k==='remount')remount();else if(k==='end')endTurn();else if(k==='skip'||k==='leave'){sfx('ui');nextStep();}else if(k==='title')showTitle();return;}
  const fk=t.closest('[data-fork]');if(fk){pickFork(+fk.dataset.fork);return;}
  const nd=t.closest('[data-node]');if(nd){enterNode(nd.dataset.node);return;}
  const rs=t.closest('[data-rest]');if(rs){doRest(rs.dataset.rest);return;}
  const sh=t.closest('[data-shop]');if(sh){doShop(sh.dataset.shop);return;}
  const ev=t.closest('[data-ev]');if(ev){doEvent(+ev.dataset.ev);return;}
  const cd=t.closest('.card');
  if(cd&&cd.classList.contains('offer')){R.deck.push({id:+cd.dataset.id});sfx('win');nextStep();return;}
  if(cd&&cd.classList.contains('buy')){const h=SHOP.heroes[+cd.dataset.i];if(!h.sold&&pay(h.price)){R.deck.push({id:h.id});h.sold=1;showShop(false);}return;}
  if(B&&cd&&cd.parentElement.classList.contains('hand')){clickCard(+cd.dataset.i);return;}
  const fo=t.closest('[data-foe]');if(B&&fo&&B.sel!=null){const en=B.enemies[+fo.dataset.foe];if(!en.dead)play(B.sel,en,B.opt);return;}
});
addEventListener('keydown',e=>{if(!B||B.busy)return;if(e.key==='e'||e.key==='E'||e.key===' '){e.preventDefault();endTurn();}else if(e.key>='1'&&e.key<='9')clickCard(+e.key-1);else if(e.key==='0')clickCard(9);else if(e.key==='Escape'){B.sel=null;B.opt=null;render();}});
showTitle();
window.__sh={mountFiles,unmount,LOCAL,get R(){return R;},get B(){return B;},play,endTurn,startBattle,showMap,showShop,showRest,showEvent,nextStep,clickCard};
})();
