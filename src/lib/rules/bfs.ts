import { type RuleNode, childrenOf, rootsOf } from "./tree";

export interface SimRow {
  ruleId: string;
  level: string;
  score: number;
}

export interface BfsResult {
  /** one representative node per level actually compared, highest-score survivor (or best-effort fallback) */
  path: RuleNode[];
  /** ranked candidates at the deepest level BFS reached, used for top-k accuracy */
  finalCandidates: { node: RuleNode; score: number }[];
  /** every rule id whose similarity was actually compared, across all levels visited */
  visitedRuleIds: string[];
  nodesVisited: number;
  totalNodes: number;
}

/**
 * BFS rule search for one text: starting from the source's root rules, keep only
 * nodes whose similarity to the text is >= tau and descend into their children.
 * If nothing survives at a level, fall back to the single best-scoring node there
 * so there's always a "found rule" to compare against the gold path, and stop.
 */
export function runBfs(
  simRows: SimRow[],
  allRules: RuleNode[],
  source: "dna" | "jigsaw",
  tau: number,
): BfsResult {
  const scoreOf = new Map(simRows.map((r) => [r.ruleId, r.score]));
  const totalNodes = allRules.filter((r) => r.source === source).length;

  let frontier = rootsOf(allRules, source);
  const path: RuleNode[] = [];
  const visitedRuleIds: string[] = [];
  let nodesVisited = 0;
  let finalCandidates: { node: RuleNode; score: number }[] = [];

  while (frontier.length > 0) {
    nodesVisited += frontier.length;
    visitedRuleIds.push(...frontier.map((n) => n.id));
    const scored = frontier
      .map((node) => ({ node, score: scoreOf.get(node.id) ?? -Infinity }))
      .sort((a, b) => b.score - a.score);

    const survivors = scored.filter((s) => s.score >= tau);

    if (survivors.length === 0) {
      path.push(scored[0].node);
      finalCandidates = scored;
      break;
    }

    path.push(survivors[0].node);
    const children = survivors.flatMap((s) => childrenOf(allRules, s.node.id));

    if (children.length === 0) {
      finalCandidates = survivors;
      break;
    }

    finalCandidates = survivors; // overwritten if we go deeper; final value used only if loop ends here
    frontier = children;
  }

  return { path, finalCandidates, visitedRuleIds, nodesVisited, totalNodes };
}

export interface DivergeInfo {
  divergeLevel: "major" | "mid" | "minor" | null; // null = matched gold exactly
}

export function findDivergence(bfsPath: RuleNode[], goldPath: RuleNode[]): DivergeInfo {
  for (let i = 0; i < Math.max(bfsPath.length, goldPath.length); i++) {
    const a = bfsPath[i];
    const b = goldPath[i];
    if (!a || !b || a.id !== b.id) {
      return { divergeLevel: (b?.level ?? a?.level ?? null) as DivergeInfo["divergeLevel"] };
    }
  }
  return { divergeLevel: null };
}

export function topKAccuracy(
  finalCandidates: { node: RuleNode; score: number }[],
  goldLeafId: string,
  k: number,
): boolean {
  return finalCandidates
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .some((c) => c.node.id === goldLeafId);
}
