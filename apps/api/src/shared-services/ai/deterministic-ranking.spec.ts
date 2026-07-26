import { BedInventoryStatus, CaseSeverity } from '@sahayak/shared-constants';
import {
  applyOrderedKeys,
  bedRankKey,
  classifyTriage,
  rankBeds,
} from './deterministic-ranking';

describe('rankBeds', () => {
  it('orders by distance, then freshness, then availableCount', () => {
    const ranked = rankBeds([
      {
        hospitalId: 'far-fresh',
        category: 'ICU',
        distanceKm: 10,
        availableCount: 5,
        stalenessStatus: BedInventoryStatus.FRESH,
      },
      {
        hospitalId: 'near-stale',
        category: 'ICU',
        distanceKm: 2,
        availableCount: 1,
        stalenessStatus: BedInventoryStatus.STALE,
      },
      {
        hospitalId: 'near-fresh-more',
        category: 'ICU',
        distanceKm: 2,
        availableCount: 8,
        stalenessStatus: BedInventoryStatus.FRESH,
      },
      {
        hospitalId: 'near-fresh-less',
        category: 'ICU',
        distanceKm: 2,
        availableCount: 3,
        stalenessStatus: BedInventoryStatus.FRESH,
      },
    ]);

    expect(ranked.map((r) => r.hospitalId)).toEqual([
      'near-fresh-more',
      'near-fresh-less',
      'near-stale',
      'far-fresh',
    ]);
  });
});

describe('applyOrderedKeys', () => {
  it('reorders and appends missing candidates', () => {
    const candidates = [
      { hospitalId: 'a', category: 'ICU', availableCount: 1, stalenessStatus: 'FRESH', distanceKm: 1 },
      { hospitalId: 'b', category: 'ICU', availableCount: 2, stalenessStatus: 'FRESH', distanceKm: 2 },
      { hospitalId: 'c', category: 'ICU', availableCount: 3, stalenessStatus: 'FRESH', distanceKm: 3 },
    ];
    const out = applyOrderedKeys(candidates, [bedRankKey(candidates[2]), bedRankKey(candidates[0])]);
    expect(out.map((c) => c.hospitalId)).toEqual(['c', 'a', 'b']);
  });
});

describe('classifyTriage', () => {
  it('maps critical and urgent keywords', () => {
    expect(classifyTriage('chest pain cardiac arrest')).toBe(CaseSeverity.CRITICAL);
    expect(classifyTriage('Need ambulance SOS')).toBe(CaseSeverity.URGENT);
    expect(classifyTriage('mild fever')).toBe(CaseSeverity.MODERATE);
    expect(classifyTriage('routine checkup')).toBe(CaseSeverity.ROUTINE);
  });
});
