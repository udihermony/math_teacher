/**
 * Skill graph traversal and prerequisite tracking.
 *
 * Uses the Skill model's self-referential prerequisites relation
 * to build a dependency graph, check mastery prerequisites,
 * find gaps, and recommend next skills to work on.
 */

import { prisma } from "@/lib/db";

export interface SkillNode {
  id: string;
  name: string;
  topicId: string;
  mastery: number; // 0-100, from Progress table
  prerequisiteIds: string[];
  dependentIds: string[];
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  mastery: number;
  requiredBy: string[]; // skill names that depend on this
}

/** Build the full skill graph for a user, including mastery data. */
export async function buildSkillGraph(userId: string): Promise<Map<string, SkillNode>> {
  const [skills, progressRecords] = await Promise.all([
    prisma.skill.findMany({
      include: {
        prerequisites: { select: { id: true } },
        dependents: { select: { id: true } },
      },
    }),
    prisma.progress.findMany({
      where: { userId },
      select: { skillId: true, mastery: true },
    }),
  ]);

  const masteryMap = new Map(progressRecords.map((p) => [p.skillId, p.mastery]));
  const graph = new Map<string, SkillNode>();

  for (const skill of skills) {
    graph.set(skill.id, {
      id: skill.id,
      name: skill.name,
      topicId: skill.topicId,
      mastery: masteryMap.get(skill.id) ?? 0,
      prerequisiteIds: skill.prerequisites.map((p) => p.id),
      dependentIds: skill.dependents.map((d) => d.id),
    });
  }

  return graph;
}

/** Check if all prerequisites for a skill are sufficiently mastered. */
export function arePrerequisitesMet(
  graph: Map<string, SkillNode>,
  skillId: string,
  threshold = 60
): boolean {
  const skill = graph.get(skillId);
  if (!skill) return false;
  if (skill.prerequisiteIds.length === 0) return true;

  return skill.prerequisiteIds.every((preId) => {
    const pre = graph.get(preId);
    return pre && pre.mastery >= threshold;
  });
}

/** Find skill gaps — prerequisites that aren't sufficiently mastered. */
export function findSkillGaps(
  graph: Map<string, SkillNode>,
  targetSkillId: string,
  threshold = 60
): SkillGap[] {
  const gaps: SkillGap[] = [];
  const visited = new Set<string>();

  function traverse(skillId: string, requiredByName: string) {
    if (visited.has(skillId)) return;
    visited.add(skillId);

    const skill = graph.get(skillId);
    if (!skill) return;

    for (const preId of skill.prerequisiteIds) {
      const pre = graph.get(preId);
      if (!pre) continue;

      if (pre.mastery < threshold) {
        const existing = gaps.find((g) => g.skillId === preId);
        if (existing) {
          if (!existing.requiredBy.includes(requiredByName)) {
            existing.requiredBy.push(requiredByName);
          }
        } else {
          gaps.push({
            skillId: preId,
            skillName: pre.name,
            mastery: pre.mastery,
            requiredBy: [requiredByName],
          });
        }
      }

      // Recursively check deeper prerequisites
      traverse(preId, pre.name);
    }
  }

  const targetSkill = graph.get(targetSkillId);
  if (targetSkill) {
    traverse(targetSkillId, targetSkill.name);
  }

  // Sort by mastery ascending — worst gaps first
  return gaps.sort((a, b) => a.mastery - b.mastery);
}

/** Get recommended next skills based on current mastery state. */
export function getRecommendedSkills(
  graph: Map<string, SkillNode>,
  limit = 5
): SkillNode[] {
  const candidates: SkillNode[] = [];

  for (const skill of graph.values()) {
    // Skip already mastered skills
    if (skill.mastery >= 90) continue;

    // Only recommend skills whose prerequisites are met
    if (!arePrerequisitesMet(graph, skill.id)) continue;

    candidates.push(skill);
  }

  // Prioritize:
  // 1. In-progress skills (some mastery but not complete)
  // 2. Available skills (no mastery but prerequisites met)
  // Sort by mastery descending within in-progress, then ascending for new
  return candidates
    .sort((a, b) => {
      const aInProgress = a.mastery > 0 && a.mastery < 90;
      const bInProgress = b.mastery > 0 && b.mastery < 90;

      if (aInProgress && !bInProgress) return -1;
      if (!aInProgress && bInProgress) return 1;
      if (aInProgress && bInProgress) return b.mastery - a.mastery;
      return 0;
    })
    .slice(0, limit);
}

/** Find the prerequisite chain for rerouting — what should a student study first. */
export function getPrerequisiteChain(
  graph: Map<string, SkillNode>,
  skillId: string,
  threshold = 60
): SkillNode[] {
  const chain: SkillNode[] = [];
  const visited = new Set<string>();

  function collect(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const skill = graph.get(id);
    if (!skill) return;

    // Traverse prerequisites first (depth-first)
    for (const preId of skill.prerequisiteIds) {
      collect(preId);
    }

    // Add this skill if it needs work
    if (skill.mastery < threshold) {
      chain.push(skill);
    }
  }

  collect(skillId);
  return chain;
}
