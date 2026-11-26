'use strict';
// 关卡、回目故事与奇遇（手写）。敌人用 db/enemies.csv 里的编号。
(function(){
const ACTS=[
 {name:'第一回 · 梁山泊好汉劫法场',bg:'bg_jz',normal:[[14,14],[14,15],[15,15]],elite:[[16,14]],boss:[17],
  art:'a riverside Chinese city with a tall wine tower by a wide river, an execution ground crossroads crowded with soldiers, grey morning sky',
  intro:'宋江在浔阳楼上醉后题了反诗，被通判黄文炳告发，与戴宗一同押赴江州市曹问斩。午时三刻将到，十字路口忽然来了几伙使枪棒的、挑担的、赶车的——梁山泊的人到了。',
  outro:'黄文炳被活捉上了白龙庙。宋江叹道：「我自与他无冤无仇，只是此人心肠太毒。」江州一把火，众好汉拥着宋江，上了梁山。'},
 {name:'第二回 · 三打祝家庄',bg:'bg1',normal:[[1,1],[1,2],[2,2,1]],elite:[[3,1],[18,2]],boss:[4],
  art:'a fortified Chinese manor village on a hill surrounded by confusing winding forest paths and white poplar trees, watchtowers and banners, dusk',
  intro:'时迁在祝家店偷了一只报晓鸡，惹出一场大祸。祝家庄扬言要「填平水泊擒晁盖，踏破梁山捉宋江」。庄前盘陀路，白杨树下才是活路——走错一步，便是埋伏。',
  outro:'孙立带人诈降，里应外合，祝家庄终于破了。扈家庄的一丈青，也随林冲上了山。'},
 {name:'第三回 · 高唐州',bg:'bg_gt',normal:[[19,19],[19,20],[20,20]],elite:[[21,19]],boss:[8],
  art:'a walled Chinese prefecture city under a dark unnatural sky, black wind and swirling sand, ghostly beast shapes in the clouds above the gate',
  intro:'柴进的叔叔被高唐州知府高廉的妻舅殷天锡活活气死，李逵一顿拳脚打死了殷天锡，柴进却被下在枯井里。高廉会使妖法，手下三百飞天神兵，刀枪不入。',
  outro:'公孙胜破了高廉的妖法，李逵下到井底，把柴进背了上来。'},
 {name:'第四回 · 夜打曾头市',bg:'bg_zt',normal:[[22,22],[22,23],[23,23]],elite:[[24,22],[25,23]],boss:[26],
  art:'a northern Chinese fortress town on a snowy plain surrounded by five camps with palisades and pit traps, cold moonlight',
  intro:'段景住盗来的照夜玉狮子马，被曾头市夺了去。晁天王亲自下山，面上中了史文恭一支药箭，回山便去了。遗言只有一句：捉得史文恭者，便为梁山泊主。',
  outro:'史文恭骑着千里马也没能逃出去。聚义厅改作忠义堂，晁天王灵前，一百单八人重新排了座次。'},
 {name:'第五回 · 两赢童贯，三败高俅',bg:'bg2',normal:[[5,5],[5,6],[7,5]],elite:[[27],[28,5],[7,7]],boss:[9],
  art:'a vast marsh lake with reeds and wooden warships, imperial army camp with red banners on the far shore, a mountain fortress in the distance, morning mist',
  intro:'朝廷终于坐不住了。枢密使童贯点起十万大军，太尉高俅调来十节度使、一千五百只海鳅大船，水陆并进，直逼梁山泊。',
  outro:'海鳅船沉在了水泊里，高太尉被张顺从水里揪上了岸。宋江亲解其缚，设宴压惊——他心里想的，始终是招安。'},
 {name:'第六回 · 征方腊',bg:'bg3',normal:[[10,10],[10,11],[11,30],[11,11,10]],elite:[[12],[29],[30,30]],boss:[13],
  art:'a southern Chinese walled city by a river under siege at night, fires burning, green misty mountains, bridges and pagodas',
  intro:'方腊在江南称了帝，占了八州二十五县。这是最后一仗，也是最苦的一仗。南国山水重重，每过一关，都要有人留下。',
  outro:''},
];
// 选项可用字段：gold hp maxhp heal curse(张数) curseId upgrade(随机操练几位) removeCard(去掉一张牌) addCard(好汉编号) cost(要花的钱)
const EVENTS=[
 {id:'gang',title:'智取生辰纲',text:'黄泥冈上，一队军汉挑着十一担金珠宝贝，正在松林里歇脚。白胜挑着两桶酒，慢悠悠走了过来。',opts:[{t:'下蒙汗药，劫了它（得 70 文，山寨失去 6 点生命）',gold:70,hp:-6},{t:'只讨碗酒喝（回复 12 点生命）',hp:12}]},
 {id:'jing',title:'景阳冈下',text:'酒家挑着招旗，上书五个大字：「三碗不过冈」。',opts:[{t:'连喝十八碗（生命上限 +8）',maxhp:8},{t:'歇脚吃肉（回复 20 点生命）',hp:20}]},
 {id:'zhaoan',minAct:3,title:'招安使者',text:'朝廷的使者带着御酒和诏书上了山：只要受了招安，过往一概不究，另有金银犒赏。',opts:[{t:'受招安（得 120 文，生命回满；牌组里多两张「招安诏书」）',gold:120,heal:1,curse:2},{t:'扯了诏书，把使者打下山（随机一位好汉得到操练）',upgrade:1}]},
 {id:'wang',title:'王伦的规矩',text:'「山寨粮少房稀，恐怕日后误了足下。」白衣秀士捧出一盘银子，要送客下山。',opts:[{t:'人各有志，送一位弟兄下山（从名册里去掉一张牌）',removeCard:1},{t:'火并了他，拿他的私房钱（得 40 文）',gold:40}]},
 {id:'shanshen',title:'风雪山神庙',text:'大雪压塌了草厅，草料场的方向忽然火光冲天。庙门外，有人正得意地说着话：「这一把火，烧也烧死他了。」',opts:[{t:'提枪出门（随机两位好汉得到操练，山寨失去 5 点生命）',upgrade:2,hp:-5},{t:'取下花枪上的酒葫芦，喝一口暖暖身子（回复 15 点生命）',hp:15}]},
 {id:'liu',title:'倒拔垂杨柳',text:'大相国寺菜园里，一棵绿杨树上老鸦叫个不停。众泼皮正要搬梯子，和尚摆摆手，把直裰脱了。',opts:[{t:'连根拔起（生命上限 +6）',maxhp:6},{t:'收下泼皮们孝敬的酒钱（得 35 文）',gold:35}]},
 {id:'kuaihuo',title:'快活林',text:'施恩的酒肉店被蒋门神霸占了去。他摆下酒，欲言又止。',opts:[{t:'替他出这口气（得 55 文，山寨失去 8 点生命）',gold:55,hp:-8},{t:'天色不早，赶路要紧',}]},
 {id:'maidao',title:'汴京城卖刀',text:'一个青面汉子插着草标，立在天汉州桥下：「祖上留下的宝刀，砍铜剁铁，刀口不卷；吹毛得过；杀人不见血。」',opts:[{t:'花 40 文买下，找人琢磨刀法（随机两位好汉得到操练）',cost:40,upgrade:2},{t:'看看热闹就走'}]},
 {id:'fanshi',title:'浔阳楼',text:'独自一人，一樽蓝桥风月，几盘肥羊嫩鸡。酒涌上来，粉壁上正好有笔砚。',opts:[{t:'题诗一首：「他时若遂凌云志……」（生命上限 +12；牌组里多一张「海捕文书」）',maxhp:12,curse:1,curseId:112},{t:'结了酒钱下楼（回复 10 点生命）',hp:10}]},
 {id:'yuqilin',minAct:2,title:'智赚玉麒麟',text:'一个算命先生带着个哑道童进了大名府，口称：「知生知死，知贵知贱。若要问前程，先赐银一两。」卢员外果然把他请进了门。',opts:[{t:'在他家墙上留四句藏头诗（卢俊义上山；若已在山上，改得 50 文）',addCard:2},{t:'只收卦金（得 30 文）',gold:30}]},
 {id:'daojia',minAct:1,title:'时迁盗甲',text:'徐宁家梁上悬着一只红羊皮匣子，里面是祖传的雁翎圈金甲。时迁已经在房梁上蹲了半夜。',opts:[{t:'连甲带人一起赚上山（徐宁上山；若已在山上，改得 50 文）',addCard:18},{t:'把甲卖了（得 60 文）',gold:60}]},
 {id:'xuannv',title:'还道村',text:'追兵的火把越来越近，你躲进一座古庙的神厨里。帷幔后忽然有人说话：「星主休得迟疑，娘娘久等。」',opts:[{t:'接过三卷天书（随机三位好汉得到操练）',upgrade:3},{t:'饮下三杯仙酒（生命回满）',heal:1}]},
 {id:'yiling',title:'沂岭',text:'李逵把老娘背到岭上，去寻水的工夫，草窠里只剩下一摊血迹。洞里有四只大虫。',opts:[{t:'杀尽四虎（山寨失去 10 点生命；随机三位好汉得到操练）',hp:-10,upgrade:3},{t:'绕路下山'}]},
 {id:'paizuoci',minAct:4,title:'英雄排座次',text:'忠义堂上，一块石碣从天而降，上面蝌蚪文字，刻着一百单八个姓名。',opts:[{t:'各归其位，各司其职（随机四位好汉得到操练）',upgrade:4},{t:'大排筵宴，犒赏三军（得 80 文，回复 15 点生命）',gold:80,hp:15}]},
];
Object.assign(globalThis.SH,{ACTS,EVENTS});
})();
