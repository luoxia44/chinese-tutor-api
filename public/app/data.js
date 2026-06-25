// data.js — 20 首发角色 (HANDOFF §7) + 派生字段。挂到 window.COMPANIONS。
// 工程接入时以 companions.seed.json 为准；此处为设计稿驱动数据。

const LEVEL_COLOR = {
  A1: '#A855F7', A2: '#6366F1',
  B1: '#3B82F6', B2: '#8B5CF6',
  C1: '#F59E0B', C2: '#EC4899',
};
const LEVEL_BAND = (lv) => lv[0]; // 'A' | 'B' | 'C'

// 占位立绘配色：给每个角色一组渐变色，制造区分度（真立绘到位即弃用）
const TINTS = {
  A: [['#A855F7', '#6D28D9'], ['#C084FC', '#7C3AED'], ['#8B5CF6', '#4C1D95']],
  B: [['#38BDF8', '#6366F1'], ['#22D3EE', '#3B82F6'], ['#2DD4BF', '#0EA5E9']],
  C: [['#FB923C', '#EC4899'], ['#FB7185', '#A855F7'], ['#F59E0B', '#EF4444']],
};

const RAW = [
  { id:'barista-xiaomin', name:'小敏', pinyin:'Xiǎo Mǐn', job:'咖啡店店员', age:22, sex:'女', city:'上海', level:'A1', hsk:'HSK1', scene:'日常生活', persona:'温柔 · 耐心 · 爱笑', line:'你好！欢迎光临。要喝什么？', linePy:'Nǐ hǎo! Huānyíng guānglín. Yào hē shénme?', lineEn:'Hi! Welcome. What would you like to drink?', premium:false, tags:['22岁','上海人','咖啡控☕','爱笑','喜欢插花'] },
  { id:'store-aqiang', name:'阿强', pinyin:'Ā Qiáng', job:'便利店店员', age:25, sex:'男', city:'广州', level:'A1', hsk:'HSK1', scene:'日常生活', persona:'热情 · 直爽', line:'你好，买什么？', linePy:'Nǐ hǎo, mǎi shénme?', lineEn:'Hello, what are you buying?', premium:false, tags:['25岁','广州人','夜班族','打篮球🏀','爱聊天'] },
  { id:'waiter-xiaohua', name:'小华', pinyin:'Xiǎo Huá', job:'餐厅服务员', age:20, sex:'女', city:'成都', level:'A1', hsk:'HSK1', scene:'日常生活', persona:'活泼 · 热心', line:'你好，几位？想吃什么？', linePy:'Nǐ hǎo, jǐ wèi? Xiǎng chī shénme?', lineEn:'Hi, how many people? What would you like to eat?', premium:false, tags:['20岁','成都人','吃辣🌶️','追剧','声音甜'] },
  { id:'taxi-laowang', name:'老王', pinyin:'Lǎo Wáng', job:'出租车司机', age:52, sex:'男', city:'北京', level:'A2', hsk:'HSK2', scene:'日常生活', persona:'话痨 · 幽默 · 儿化音', line:'哎，您好嘞！上哪儿啊？', linePy:'Āi, nín hǎo lei! Shàng nǎr a?', lineEn:'Hey, hello there! Where to?', premium:false, tags:['52岁','老北京','侃大山','听相声','儿化音'] },
  { id:'vendor-zhangjie', name:'张姐', pinyin:'Zhāng Jiě', job:'菜市场水果摊主', age:45, sex:'女', city:'武汉', level:'A2', hsk:'HSK2', scene:'日常生活', persona:'爽快 · 精明 · 嗓门大', line:'来来来，看看苹果，新鲜的！', linePy:'Lái lái lái, kànkan píngguǒ, xīnxiān de!', lineEn:'Come, come, look at these apples — fresh!', premium:false, tags:['45岁','武汉人','嗓门大','会砍价','热心肠'] },
  { id:'courier-xiaoli', name:'小李', pinyin:'Xiǎo Lǐ', job:'快递员', age:28, sex:'男', city:'杭州', level:'A2', hsk:'HSK2', scene:'日常生活', persona:'勤快 · 礼貌', line:'您好，您的快递到了。', linePy:'Nín hǎo, nín de kuàidì dào le.', lineEn:'Hello, your package has arrived.', premium:false, tags:['28岁','杭州人','跑得快','爱骑行🚲','靠谱'] },
  { id:'taichi-chenbo', name:'陈伯', pinyin:'Chén Bó', job:'太极拳师傅', age:63, sex:'男', city:'西安', level:'A2', hsk:'HSK2', scene:'兴趣闲聊', persona:'沉稳 · 慈祥 · 有文化', line:'来，慢慢来，先深呼吸。', linePy:'Lái, mànman lái, xiān shēn hūxī.', lineEn:'Come, take it slow — breathe deep first.', premium:false, tags:['63岁','西安人','打太极','书法','养生茶'] },
  { id:'roommate-aming', name:'阿明', pinyin:'Ā Míng', job:'大学室友', age:21, sex:'男', city:'深圳', level:'B1', hsk:'HSK3', scene:'兴趣闲聊', persona:'随和 · 爱玩 · 网络冲浪', line:'诶你回来啦，周末有啥安排没？', linePy:'Éi nǐ huílai la, zhōumò yǒu shá ānpái méi?', lineEn:"Hey you're back — any plans this weekend?", premium:false, tags:['21岁','深圳','打游戏🎮','刷梗','熬夜'] },
  { id:'trainer-kevin', name:'凯文', pinyin:'Kǎiwén', job:'健身教练', age:30, sex:'男', city:'上海', level:'B1', hsk:'HSK3', scene:'兴趣闲聊', persona:'阳光 · 有激情', line:'今天想练哪儿？先热身！', linePy:'Jīntiān xiǎng liàn nǎr? Xiān rèshēn!', lineEn:'What are we training today? Warm up first!', premium:false, tags:['30岁','上海','撸铁💪','蛋白粉','正能量'] },
  { id:'guide-xiaoyang', name:'小杨', pinyin:'Xiǎo Yáng', job:'旅行导游', age:27, sex:'女', city:'桂林', level:'B1', hsk:'HSK3', scene:'旅行', persona:'博学 · 健谈', line:'欢迎来到桂林！我带你逛逛。', linePy:'Huānyíng lái dào Guìlín! Wǒ dài nǐ guàngguang.', lineEn:'Welcome to Guilin! Let me show you around.', premium:false, tags:['27岁','桂林','导游旗','摄影📷','故事多'] },
  { id:'milktea-azhen', name:'阿珍', pinyin:'Ā Zhēn', job:'奶茶店老板', age:34, sex:'女', city:'广州', level:'B1', hsk:'HSK3', scene:'日常生活', persona:'精明 · 亲切 · 记性好', line:'哎呀又来啦！老样子还是试新品？', linePy:'Āiyā yòu lái la! Lǎo yàngzi háishi shì xīnpǐn?', lineEn:'Oh you again! The usual, or try something new?', premium:false, tags:['34岁','广州','奶茶🧋','记熟客','会唠嗑'] },
  { id:'auntie-liayi', name:'李阿姨', pinyin:'Lǐ Āyí', job:'广场舞领队', age:58, sex:'女', city:'沈阳', level:'B1', hsk:'HSK3', scene:'情感社交', persona:'热心 · 爱张罗 · 东北口音', line:'哎呀小伙子，结婚了没？', linePy:'Āiyā xiǎohuǒzi, jiéhūn le méi?', lineEn:"Oh young man, are you married yet?", premium:false, tags:['58岁','沈阳','广场舞💃','爱张罗','唠家常'] },
  { id:'coworker-coco', name:'Coco', pinyin:'Coco', job:'公司同事', age:29, sex:'女', city:'上海', level:'B2', hsk:'HSK4', scene:'商务', persona:'职业 · 周到 · 中英混用', line:'早呀，今天的会准备得怎么样？', linePy:'Zǎo ya, jīntiān de huì zhǔnbèi de zěnmeyàng?', lineEn:"Morning — how's the prep for today's meeting?", premium:false, tags:['29岁','上海','PPT高手','中英混','拿铁'] },
  { id:'agent-wangjingli', name:'王经理', pinyin:'Wáng Jīnglǐ', job:'房产中介', age:36, sex:'男', city:'成都', level:'B2', hsk:'HSK4', scene:'商务', persona:'健谈 · 会推销', line:'这套采光特别好，您先看看？', linePy:'Zhè tào cǎiguāng tèbié hǎo, nín xiān kànkan?', lineEn:'Great natural light in this one — want a look?', premium:false, tags:['36岁','成都','看房🏠','会算账','嘴甜'] },
  { id:'nurse-linhushi', name:'林护士', pinyin:'Lín Hùshi', job:'医院护士', age:31, sex:'女', city:'南京', level:'B2', hsk:'HSK4', scene:'日常生活', persona:'温和 · 细心 · 专业', line:'您好，哪里不舒服？', linePy:'Nín hǎo, nǎlǐ bù shūfu?', lineEn:"Hello, what's bothering you?", premium:false, tags:['31岁','南京','细心','量血压','耐心'] },
  { id:'date-vivian', name:'Vivian', pinyin:'Vivian', job:'公司市场总监', age:28, sex:'女', city:'杭州', level:'B2', hsk:'HSK4', scene:'情感社交', persona:'温和 · 含蓄 · 善倾听', line:'工作认真，生活也要浪漫。', linePy:'Gōngzuò rènzhēn, shēnghuó yě yào làngmàn.', lineEn:'Serious at work, romantic in life.', premium:false, tags:['28岁','杭州人','市场营销','喜欢旅行','爱拍照','猫奴🐱'] },
  { id:'founder-laozhou', name:'老周', pinyin:'Lǎo Zhōu', job:'创业公司创始人', age:41, sex:'男', city:'北京', level:'C1', hsk:'HSK5', scene:'商务', persona:'精力充沛 · 逻辑强', line:'你最近在看什么方向？', linePy:'Nǐ zuìjìn zài kàn shénme fāngxiàng?', lineEn:'What space have you been looking at lately?', premium:true, tags:['41岁','北京','连续创业','看赛道','逻辑控'] },
  { id:'professor-qian', name:'钱教授', pinyin:'Qián Jiàoshòu', job:'大学教授', age:56, sex:'男', city:'北京', level:'C1', hsk:'HSK5', scene:'进阶挑战', persona:'儒雅 · 博学 · 措辞讲究', line:'不妨先说说你自己的看法？', linePy:'Bùfáng xiān shuōshuo nǐ zìjǐ de kànfǎ?', lineEn:'Why not start with your own view?', premium:true, tags:['56岁','北京','治学','引经据典','慢条斯理'] },
  { id:'journalist-sujizhe', name:'苏记者', pinyin:'Sū Jìzhě', job:'调查记者', age:38, sex:'女', city:'广州', level:'C2', hsk:'HSK6', scene:'进阶挑战', persona:'敏锐 · 犀利 · 追问到底', line:'我想直接切入正题——', linePy:'Wǒ xiǎng zhíjiē qiērù zhèngtí——', lineEn:'I want to get straight to the point—', premium:true, tags:['38岁','广州','深度调查','追问','一针见血'] },
  { id:'streamer-damei', name:'大美', pinyin:'Dà Měi', job:'直播带货主播', age:26, sex:'女', city:'杭州', level:'C2', hsk:'HSK6', scene:'进阶挑战', persona:'超热情 · 语速飞快', line:'家人们看过来！手慢无啊！', linePy:'Jiārénmen kàn guòlái! Shǒu màn wú a!', lineEn:'Everyone look here — blink and it\'s gone!', premium:true, tags:['26岁','杭州','直播间📱','语速快','上链接'] },
];

// 角色职业英文
const JOB_EN = {
  'barista-xiaomin':'Barista','store-aqiang':'Store clerk','waiter-xiaohua':'Waitress','taxi-laowang':'Taxi driver',
  'vendor-zhangjie':'Fruit vendor','courier-xiaoli':'Courier','taichi-chenbo':'Tai Chi master','roommate-aming':'College roommate',
  'trainer-kevin':'Fitness coach','guide-xiaoyang':'Tour guide','milktea-azhen':'Bubble-tea owner','auntie-liayi':'Square-dance leader',
  'coworker-coco':'Coworker','agent-wangjingli':'Real-estate agent','nurse-linhushi':'Nurse','date-vivian':'Marketing director',
  'founder-laozhou':'Startup founder','professor-qian':'Professor','journalist-sujizhe':'Investigative journalist','streamer-damei':'Livestream host',
};

// 派生：等级色、画风色、在线状态、故事数据
const COMPANIONS = RAW.map((c, i) => {
  const band = LEVEL_BAND(c.level);
  const tintSet = TINTS[band];
  const tint = tintSet[i % tintSet.length];
  return {
    ...c,
    band,
    jobEn: JOB_EN[c.id] || c.job,
    levelColor: LEVEL_COLOR[c.level],
    tint,                          // [from, to] 占位立绘渐变
    online: i % 4 !== 2,           // 多数在线
    story: {
      days: [3, 12, 1, 27, 6, 18, 2, 9, 14, 4, 21, 7, 11, 33, 5, 16, 1, 8, 24, 2][i],
      chats: [5, 23, 1, 41, 9, 30, 2, 12, 19, 6, 38, 8, 15, 52, 7, 22, 1, 14, 44, 3][i],
      minutes: [38, 156, 4, 320, 62, 210, 11, 88, 140, 33, 270, 51, 102, 410, 49, 175, 6, 96, 380, 18][i],
    },
  };
});

// 记忆页示例数据（事实带副文案；时间线）
const MEMORIES = {
  'barista-xiaomin': {
    facts: [
      { icon:'cat', text:'你养了一只叫 Miumiu 的猫', textEn:'You have a cat named Miumiu', sub:'你给她看过照片', subEn:'You showed her a photo' },
      { icon:'coffee', text:'你喜欢喝美式，不加糖', textEn:'You like americanos, no sugar', sub:'上次你点的咖啡', subEn:'What you ordered last time' },
      { icon:'pin', text:'你最近在学做红烧肉', textEn:"You're learning to cook hongshao pork", sub:'你说下次要做给朋友吃', subEn:"You'll cook it for friends" },
      { icon:'globe', text:'你计划下个月去日本旅行', textEn:'You plan to visit Japan next month', sub:'想去东京和京都', subEn:'Tokyo and Kyoto' },
    ],
    timeline: [
      { date:'今天', dateEn:'Today', summary:'聊到周末想去咖啡展，约你一起', summaryEn:'Talked about the weekend coffee expo' },
      { date:'5月28日', dateEn:'May 28', summary:'你点了新品桂花拿铁，说很好喝', summaryEn:'You tried the new osmanthus latte' },
      { date:'5月20日', dateEn:'May 20', summary:'第一次见面，教你点单的句子', summaryEn:'First met; she taught you how to order' },
    ],
  },
  'date-vivian': {
    facts: [
      { icon:'globe', text:'你在计划东京旅行', textEn:"You're planning a Tokyo trip", sub:'问过她浅草和镰仓', subEn:'You asked about Asakusa & Kamakura' },
      { icon:'heart', text:'你最近工作压力有点大', textEn:"Work's been stressful lately", sub:'她记得你在带新项目', subEn:"You're leading a new project" },
      { icon:'cat', text:'你也养猫，叫橘座', textEn:'You have a cat too, named Juzuo', sub:'你们交换过猫的照片', subEn:'You swapped cat photos' },
    ],
    timeline: [
      { date:'昨天', dateEn:'Yesterday', summary:'聊了养猫和周末计划', summaryEn:'Talked about cats and weekend plans' },
      { date:'5月18日', dateEn:'May 18', summary:'聊了工作压力和成长', summaryEn:'Talked about work stress and growth' },
      { date:'5月12日', dateEn:'May 12', summary:'第一次聊天，聊了东京旅行和美食', summaryEn:'First chat: Tokyo travel and food' },
    ],
  },
  'taxi-laowang': {
    facts: [
      { icon:'pin', text:'你住在三里屯附近', textEn:'You live near Sanlitun', sub:'他知道怎么绕开晚高峰', subEn:'He knows how to dodge rush hour' },
      { icon:'music', text:'你也爱听相声', textEn:'You enjoy xiangsheng comedy too', sub:'问过他郭德纲的段子', subEn:'You asked about Guo Degang' },
      { icon:'globe', text:'你是英国人，在北京工作', textEn:"You're British, working in Beijing", sub:'他爱问你伦敦的事', subEn:'He loves asking about London' },
    ],
    timeline: [
      { date:'昨天', dateEn:'Yesterday', summary:'路上聊堵车，他教你「添堵」怎么用', summaryEn:'He taught you the slang "tiandu"' },
      { date:'5月25日', dateEn:'May 25', summary:'第一次打车，听他侃了一路胡同', summaryEn:'First ride; hutong stories all the way' },
    ],
  },
  'roommate-aming': {
    facts: [
      { icon:'game', text:'你俩都玩《原神》', textEn:'You both play Genshin Impact', sub:'他主氪金、你主肝', subEn:'He pays, you grind' },
      { icon:'pin', text:'你周末常去深圳湾跑步', textEn:'You run at Shenzhen Bay on weekends', sub:'约过你一起', subEn:'He asked to join you' },
    ],
    timeline: [
      { date:'今天', dateEn:'Today', summary:'约你周末开黑，顺便练口语', summaryEn:'Invited you to game and practice' },
      { date:'5月30日', dateEn:'May 30', summary:'吐槽期末，他教你「卷」和「躺平」', summaryEn:'Taught you "juan" and "tangping"' },
    ],
  },
};

// 故事数据覆盖（参考图 Vivian = 43天 / 17次 / 6小时）
const STORY_OVERRIDE = {
  'date-vivian': { days:43, chats:17, minutes:360 },
};

// Explore by vibe（6 个心情入口）
const VIBES = [
  { key:'city',   label:'城市生活', labelEn:'City life',      icon:'vibeCity',   color:'#38BDF8', scene:'日常生活' },
  { key:'social', label:'情感社交', labelEn:'Dating & social', icon:'vibeHeart',  color:'#EC4899', scene:'情感社交' },
  { key:'health', label:'运动健康', labelEn:'Fitness',        icon:'vibeRun',    color:'#34D399', scene:'兴趣闲聊' },
  { key:'career', label:'职场成长', labelEn:'Career',         icon:'vibeWork',   color:'#FB923C', scene:'商务' },
  { key:'deep',   label:'深度对话', labelEn:'Deep talk',      icon:'vibeChat',   color:'#A855F7', scene:'进阶挑战' },
  { key:'travel', label:'旅行探索', labelEn:'Travel',         icon:'vibePlane',  color:'#6366F1', scene:'旅行' },
];

// 首页“继续上次”
const RECENTS = [
  { id:'date-vivian',      summary:'你的东京旅行计划 ✈️', summaryEn:'Your Tokyo trip plan ✈️', when:'3天前', whenEn:'3d ago' },
  { id:'barista-xiaomin',  summary:'周末的咖啡展约定 ☕',  summaryEn:'The weekend coffee expo ☕',  when:'昨天', whenEn:'Yesterday' },
  { id:'taxi-laowang',     summary:'胡同里的那些故事',     summaryEn:'Stories from the old hutongs',  when:'2天前', whenEn:'2d ago' },
];

const SCENES = ['全部','日常生活','商务','旅行','情感社交','兴趣闲聊','进阶挑战'];
const FILTERS = ['推荐','最新','最受欢迎','A1~A2','B1~B2','C1~C2'];

// 应用故事覆盖
COMPANIONS.forEach(c => { if (STORY_OVERRIDE[c.id]) c.story = { ...c.story, ...STORY_OVERRIDE[c.id] }; });

window.COMPANIONS = COMPANIONS;
window.MEMORIES = MEMORIES;
window.SCENES = SCENES;
window.FILTERS = FILTERS;
window.VIBES = VIBES;
window.RECENTS = RECENTS;
window.LEVEL_COLOR = LEVEL_COLOR;
