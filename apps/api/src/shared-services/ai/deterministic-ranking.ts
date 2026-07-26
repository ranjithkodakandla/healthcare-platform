import { BedInventoryStatus, CaseSeverity } from '@sahayak/shared-constants';

/** Minimal shape for bed ranking fallback (distance + capacity + freshness). */
export interface RankableBed {
  hospitalId: string;
  category: string;
  availableCount: number;
  stalenessStatus: string;
  distanceKm: number | null;
}

export function bedRankKey(b: Pick<RankableBed, 'hospitalId' | 'category'>): string {
  return `${b.hospitalId}::${b.category}`;
}

// GT-11 deterministic fallback: nearer → fresher → more available. No ML.
export function rankBeds<T extends RankableBed>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => {
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;

    const fa = a.stalenessStatus === BedInventoryStatus.FRESH ? 0 : 1;
    const fb = b.stalenessStatus === BedInventoryStatus.FRESH ? 0 : 1;
    if (fa !== fb) return fa - fb;

    if (a.availableCount !== b.availableCount) return b.availableCount - a.availableCount;

    return bedRankKey(a).localeCompare(bedRankKey(b));
  });
}

/** Reorder candidates by AI-provided keys; append any missing in original relative order. */
export function applyOrderedKeys<T extends RankableBed>(candidates: T[], orderedKeys: string[]): T[] {
  const byKey = new Map(candidates.map((c) => [bedRankKey(c), c]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const key of orderedKeys) {
    const hit = byKey.get(key);
    if (hit && !seen.has(key)) {
      out.push(hit);
      seen.add(key);
    }
  }
  for (const c of candidates) {
    const key = bedRankKey(c);
    if (!seen.has(key)) out.push(c);
  }
  return out;
}

// Keyword triage fallback when AI is down (C-05 / TRIAGE_INTAKE).
export function classifyTriage(text: string): CaseSeverity {
  const t = text.toLowerCase();
  if (
    /\b(cardiac|chest pain|unconscious|not breathing|stroke|severe bleeding|trauma)\b/.test(t) ||
    /\bcritical\b/.test(t)
  ) {
    return CaseSeverity.CRITICAL;
  }
  if (/\b(urgent|ambulance|emergency|accident|fracture|seizure)\b/.test(t) || /\bsos\b/.test(t)) {
    return CaseSeverity.URGENT;
  }
  if (/\b(moderate|fever|pain)\b/.test(t)) {
    return CaseSeverity.MODERATE;
  }
  return CaseSeverity.ROUTINE;
}
