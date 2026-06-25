// Maps the seed's PLACEHOLDER voiceIds (e.g. "minimax_female_young_warm") to real MiniMax
// system voice ids, by gender + descriptive keywords, so the 20 companions actually sound
// different. Swap any mapping by putting a real voice_id directly in companions.seed.json
// (anything not starting with "minimax_" is used verbatim).
//
// Uses MiniMax's stable system voices. Audition and refine per character later.
const MALE = {
  qingse: 'male-qn-qingse',        // 青涩青年
  daxuesheng: 'male-qn-daxuesheng',// 青年大学生
  jingying: 'male-qn-jingying',    // 精英/沉稳青年
  badao: 'male-qn-badao',          // 霸道/成熟
  presenter: 'presenter_male',     // 主持人腔
};
const FEMALE = {
  shaonv: 'female-shaonv',         // 少女
  tianmei: 'female-tianmei',       // 甜美温柔
  yujie: 'female-yujie',           // 御姐/职业
  chengshu: 'female-chengshu',     // 成熟女性
  presenter: 'presenter_female',   // 主持人腔
};

export function resolveVoiceId(voiceId) {
  if (voiceId && !voiceId.startsWith('minimax_')) return voiceId; // already a real id
  const [, gender = '', ...rest] = (voiceId || '').split('_');
  const d = rest.join('_'); // descriptor, e.g. "mature_beijing"

  if (gender === 'male') {
    if (/elder|calm|refined|jingying/.test(d)) return MALE.jingying;
    if (/mature|beijing|persuasive|badao/.test(d)) return MALE.badao;
    if (/energetic|sharp|fast|hype/.test(d)) return MALE.presenter;
    if (/casual|young|brisk|polite/.test(d)) return MALE.qingse;
    return MALE.daxuesheng;
  }
  // female / neutral
  if (/gentle|soft|warm/.test(d)) return FEMALE.tianmei;
  if (/pro|urban|clear|sharp|hype|fast/.test(d)) return FEMALE.yujie;
  if (/mature|loud|friendly|dongbei/.test(d)) return FEMALE.chengshu;
  if (/young|lively|warm/.test(d)) return FEMALE.shaonv;
  return FEMALE.shaonv;
}

// Per-character speed nudge so the level's speechRate is reflected in the real voice too.
export function speedFor(speechRate) {
  return { slow: 0.85, normal: 1.0, fast: 1.15 }[speechRate] ?? 1.0;
}
