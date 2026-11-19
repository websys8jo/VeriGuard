export type RuleLevel = "major" | "mid" | "minor";

export interface RuleNode {
  id: string;
  source: "dna" | "jigsaw";
  level: RuleLevel;
  parentId: string | null;
  ruleText: string;
}

export function childrenOf(rules: RuleNode[], parentId: string | null): RuleNode[] {
  return rules.filter((r) => r.parentId === parentId);
}

export function ancestorsOf(rules: RuleNode[], ruleId: string): RuleNode[] {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const path: RuleNode[] = [];
  let current = byId.get(ruleId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

/** Root nodes for a source: DNA has 5 majors, Jigsaw has 2 flat "major" rules. */
export function rootsOf(rules: RuleNode[], source: "dna" | "jigsaw"): RuleNode[] {
  return rules.filter((r) => r.source === source && r.parentId === null);
}
