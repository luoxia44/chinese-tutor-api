// PromptAssembler — 身份 × 等级 × 场景 × 记忆 → system prompt.
// Implements SPEC §2.4 verbatim. This is the single source of "难度可感差异" (acceptance #2).
// ≙ SwiftUI Core/Prompt/PromptAssembler.swift

// slow 档措辞要够狠：qwen 实时语音对"慢"不敏感，必须具体到"一半语速/逐字/停顿"才可感（用户反馈初学者听不懂）
const SPEECH_RATE_ZH = {
  slow: '非常慢。像对完全零基础的初学者说话：语速压到正常人的一半，一个字一个字咬清楚，句子说完停顿一下再继续',
  normal: '正常',
  fast: '快，像本地人日常聊天的语速',
};

/**
 * @param {object} companion  full companion record from the seed
 * @param {string} memoryBlock  pre-compressed memory string (may be empty) — see MemoryStore.buildInjection
 * @returns {string} system prompt for the dialogue brain / voice model
 */
export function assembleSystemPrompt(companion, memoryBlock = '') {
  const { name, identity, level, scenario } = companion;
  const c = level.constraints;
  const englishRule = c.allowEnglishFallback
    ? '对方卡住时，可以用一句英文提示，然后立刻回到中文。'
    : '全程只说中文，绝不使用英文。';

  const memorySection = memoryBlock?.trim()
    ? memoryBlock.trim()
    : '这是你和这位学习者的第一次对话，你还不认识 ta。';

  // 【你此刻想做的事】——角色的"目标"。代入感来自角色有事求你，不是来自长篇背景故事：
  // 背景故事模型看得到、用户看不到；而一个有所求的角色，第一句话就能把人拉进情境。
  // 这也是"主动引导"的实现方式——不是加一句"要主动"，而是给它一件真的想办成的事。
  const hookSection = companion.hook
    ? `\n【你此刻想做的事】${companion.hook}\n自然地把话题往这件事上带，别干等对方开口。`
    : '';

  return `你叫${name.zh}，是一个${identity.age}岁的${identity.region}${identity.role}。
性格：${identity.personality.join('、')}。
背景：${identity.backstory}
说话风格：${identity.speakingStyle}

【当前场景】${scenario.contextSetup}${hookSection}

【难度铁律】对方是中文学习者，约 ${level.cefr}/HSK${level.hsk}。
- 用词：${c.vocabularyScope}
- 单句不超过 ${c.maxSentenceLength} 个词
- 语速：${SPEECH_RATE_ZH[c.speechRate] || c.speechRate}
- ${englishRule}

【记忆】${memorySection}

【怎么说】口语、简短，一次一两句；不加括号注释、不给翻译或拼音、不复述对方的话。
不当老师、不讲语法、不列要点。对方说错时先自然接话，再把正确说法不着痕迹地带出来，绝不打断纠错。
除非对方主动说过名字，否则不叫名字也不问名字。
始终是${name.zh}，不出戏、不提 AI。`;
}

/**
 * Compact, model-readable summary of the level constraints — handy for the UI to show
 * "why this character is harder/easier" and for debugging the perceptible-difference criterion.
 */
export function describeLevel(companion) {
  const { level } = companion;
  const c = level.constraints;
  return {
    cefr: level.cefr,
    hsk: level.hsk,
    maxSentenceLength: c.maxSentenceLength,
    speechRate: c.speechRate,
    allowEnglishFallback: c.allowEnglishFallback,
    vocabularyScope: c.vocabularyScope,
  };
}
