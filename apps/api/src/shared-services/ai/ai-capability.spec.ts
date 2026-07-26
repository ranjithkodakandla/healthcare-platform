import { AiCapability } from '@sahayak/shared-constants';

describe('AiCapability (M8)', () => {
  it('does not contain CLINICAL_DECISION (permanently disallowed)', () => {
    const values = Object.values(AiCapability);
    expect(values).not.toContain('CLINICAL_DECISION');
    expect(Object.keys(AiCapability)).not.toContain('CLINICAL_DECISION');
  });

  it('exposes only the four approved capabilities', () => {
    expect(Object.values(AiCapability).sort()).toEqual(
      [
        AiCapability.DOCUMENT_DRAFTING,
        AiCapability.MATCHING_RANKING,
        AiCapability.SCHEDULE_OPTIMIZATION,
        AiCapability.TRIAGE_INTAKE,
      ].sort(),
    );
  });
});
