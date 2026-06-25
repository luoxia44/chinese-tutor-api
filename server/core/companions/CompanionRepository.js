// Data-driven companion loader. "新增角色 = 加一条数据，不改代码" (SPEC §2.3).
// ≙ SwiftUI Core/Companions/CompanionRepository.swift
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../../config.js';

let cache = null;

function load() {
  if (cache) return cache;
  const path = resolve(ROOT, 'data', 'companions.seed.json');
  const json = JSON.parse(readFileSync(path, 'utf8'));
  cache = json.companions;
  return cache;
}

export const CompanionRepository = {
  all() {
    return load();
  },
  byId(id) {
    return load().find((c) => c.id === id) || null;
  },
  // Lightweight projection for the list UI (no need to ship full backstory/prompt material).
  summaries() {
    return load().map((c) => ({
      id: c.id,
      name: c.name,
      role: c.identity.role,
      region: c.identity.region,
      gender: c.identity.gender,
      age: c.identity.age,
      personality: c.identity.personality,
      cefr: c.level.cefr,
      hsk: c.level.hsk,
      category: c.scenario.category,
      topic: c.scenario.topic,
      openingLine: c.scenario.openingLine,
      suggestedGoals: c.scenario.suggestedGoals,
      avatarConfig: c.avatarConfig,
      tags: c.tags,
      isPremium: c.isPremium,
    }));
  },
};
