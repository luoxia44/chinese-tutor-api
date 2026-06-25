// Memory data shapes (SPEC §4). JS has no interfaces — these factories document the schema
// and give safe defaults. ≙ SwiftUI Core/Memory/Models.swift

/** @typedef {{ text: string, learnedAt: string, sourceSessionId?: string }} Fact */

export function newUserProfile(userId) {
  return {
    userId,
    preferredName: '',          // AI 怎么称呼用户
    interests: [],
    facts: /** @type {Fact[]} */ ([]),
    chineseLevel: { estimatedHsk: 0, estimatedCefr: '', confidence: 0 },
    persistentErrors: [],
    updatedAt: new Date().toISOString(),
  };
}

export function newCompanionRelationship(userId, companionId) {
  return {
    userId,
    companionId,
    sessionSummaries: [],       // SessionSummary[]
    rapportNotes: '',           // "聊过3次，关系熟络"
    lastSessionDate: '',
  };
}

/**
 * @param {object} partial
 * @returns SessionSummary (SPEC §4.2 Layer 1)
 */
export function newSessionSummary(partial) {
  return {
    sessionId: partial.sessionId,
    userId: partial.userId,
    companionId: partial.companionId,
    date: partial.date || new Date().toISOString(),
    durationSec: partial.durationSec || 0,
    topicsCovered: partial.topicsCovered || [],
    newFactsLearned: partial.newFactsLearned || [],
    languageNotes: partial.languageNotes || {
      recurringErrors: [],
      vocabUserStruggled: [],
      levelObservation: '',
    },
    oneLineSummary: partial.oneLineSummary || '',
  };
}
