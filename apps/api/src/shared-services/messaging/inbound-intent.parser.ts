import { BedCategory } from '@sahayak/shared-constants';

// M14: inbound WhatsApp/SMS/IVR text → same DTOs as REST controllers.
// Intent detection is deliberately keyword/DTMF based for the stub — NLP is Phase 9+.

export type InboundIntent =
  | { type: 'EMERGENCY_CASE'; triageHint?: string }
  | { type: 'BED_SEARCH'; category?: BedCategory }
  | { type: 'BED_UPDATE'; hospitalId: string; updates: Array<{ category: BedCategory; availableCount: number }> }
  | { type: 'CASE_STATUS'; caseId?: string }
  | { type: 'HELP' }
  | { type: 'UNKNOWN'; raw: string };

const CATEGORY_ALIASES: Record<string, BedCategory> = {
  icu: BedCategory.ICU,
  ventilator: BedCategory.VENTILATOR,
  vent: BedCategory.VENTILATOR,
  general: BedCategory.GENERAL,
  nicu: BedCategory.NICU,
  maternity: BedCategory.MATERNITY,
  isolation: BedCategory.ISOLATION,
};

/** Parse "ICU 2, General 8" / "ICU:2 GENERAL:8" style provider replies (L6 Tier 1). */
export function parseBedUpdateText(body: string): Array<{ category: BedCategory; availableCount: number }> {
  const updates: Array<{ category: BedCategory; availableCount: number }> = [];
  const re = /\b(icu|ventilator|vent|general|nicu|maternity|isolation)\s*[:=-]?\s*(\d+)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const cat = CATEGORY_ALIASES[match[1].toLowerCase()];
    if (cat) updates.push({ category: cat, availableCount: Number(match[2]) });
  }
  return updates;
}

export function parseInboundIntent(body: string): InboundIntent {
  const text = body.trim();
  const lower = text.toLowerCase();

  // IVR digit map (Exotel menu stub)
  if (/^\d+$/.test(text)) {
    if (text === '1') return { type: 'EMERGENCY_CASE', triageHint: 'ivr_digit_1' };
    if (text === '2') return { type: 'BED_SEARCH' };
    if (text === '3') return { type: 'CASE_STATUS' };
    if (text === '0' || text === '9') return { type: 'HELP' };
  }

  if (/\b(help|menu|start)\b/i.test(lower)) return { type: 'HELP' };

  if (
    /\b(ambulance|emergency|help me|sos|critical|accident)\b/i.test(lower) ||
    lower === 'ambulance'
  ) {
    return { type: 'EMERGENCY_CASE' };
  }

  // Provider Tier 1 bed update — requires hospital token prefix: "HOSP hosp-apollo-blr ICU 2"
  const hospMatch = lower.match(/\bhosp(?:ital)?[:\s]+([a-z0-9-]+)\b/i);
  const bedUpdates = parseBedUpdateText(text);
  if (hospMatch && bedUpdates.length > 0) {
    return { type: 'BED_UPDATE', hospitalId: hospMatch[1], updates: bedUpdates };
  }

  if (/\b(bed|beds|hospital|icu|ventilator)\b/i.test(lower)) {
    let category: BedCategory | undefined;
    for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
      if (lower.includes(alias)) {
        category = cat;
        break;
      }
    }
    return { type: 'BED_SEARCH', category };
  }

  const statusMatch = lower.match(/\b(?:status|case)\s+([a-z0-9-]+)\b/i);
  if (statusMatch || /\bstatus\b/i.test(lower)) {
    return { type: 'CASE_STATUS', caseId: statusMatch?.[1] };
  }

  return { type: 'UNKNOWN', raw: text };
}
