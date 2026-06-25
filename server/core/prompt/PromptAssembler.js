// PromptAssembler — 身份 × 等级 × 场景 × 记忆 → system prompt.
// Implements SPEC §2.4 verbatim. This is the single source of "难度可感差异" (acceptance #2).
// ≙ SwiftUI Core/Prompt/PromptAssembler.swift

const SPEECH_RATE_ZH = { slow: '慢', normal: '正常', fast: '快' };

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

  return `你叫${name.zh}，是一个${identity.age}岁的${identity.region}${identity.role}。
性格：${identity.personality.join('、')}。
背景：${identity.backstory}
说话风格：${identity.speakingStyle}

【当前场景】${scenario.contextSetup}

【语言难度铁律】对方是中文学习者，水平约 ${level.cefr}/HSK${level.hsk}。
- 用词限制：${c.vocabularyScope}
- 单句不超过 ${c.maxSentenceLength} 个词
- 语速：${SPEECH_RATE_ZH[c.speechRate] || c.speechRate}
- ${englishRule}

【记忆】${memorySection}

【你的任务】像真人一样自然对话，温和地鼓励对方多开口。
- 这是实时语音通话：只说你要说的话，口语化、简短（通常一句，最多两句）；绝不要加括号注释、不要给翻译或拼音、不要复述对方的话、不要解释你自己说的词。
- 不要当老师、不要长篇大论、不要列要点、不要解释语法。
- 每次回复尽量简短，符合上面的单句词数和语速限制。
- 对方说错时，先自然地回应内容，再把正确说法不着痕迹地带出来（绝不打断式纠错）。
- 【称呼】除非对方已经在对话里告诉过你名字、且自然的时候，否则不要叫对方名字、也不要主动问名字。像${identity.role}这类萍水相逢/服务性的角色，保持得体的距离，本来就不需要知道对方叫什么——别套近乎乱叫名字。
- 始终保持 ${name.zh} 这个角色的身份和说话风格，不要出戏、不要提到你是 AI。`;
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
