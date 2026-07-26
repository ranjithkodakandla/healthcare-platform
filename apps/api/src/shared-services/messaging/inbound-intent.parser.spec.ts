import { BedCategory } from '@sahayak/shared-constants';
import { parseBedUpdateText, parseInboundIntent } from './inbound-intent.parser';

describe('parseInboundIntent', () => {
  it('maps ambulance keywords to EMERGENCY_CASE', () => {
    expect(parseInboundIntent('Need ambulance now').type).toBe('EMERGENCY_CASE');
    expect(parseInboundIntent('SOS accident').type).toBe('EMERGENCY_CASE');
  });

  it('maps IVR digit 1 to EMERGENCY_CASE', () => {
    expect(parseInboundIntent('1')).toEqual({ type: 'EMERGENCY_CASE', triageHint: 'ivr_digit_1' });
  });

  it('maps IVR digit 2 to BED_SEARCH', () => {
    expect(parseInboundIntent('2')).toEqual({ type: 'BED_SEARCH' });
  });

  it('maps bed search with category', () => {
    expect(parseInboundIntent('ICU beds near me')).toEqual({
      type: 'BED_SEARCH',
      category: BedCategory.ICU,
    });
  });

  it('parses provider Tier 1 bed update with hospital id', () => {
    const intent = parseInboundIntent('HOSP hosp-apollo-blr ICU 2 General 8');
    expect(intent.type).toBe('BED_UPDATE');
    if (intent.type === 'BED_UPDATE') {
      expect(intent.hospitalId).toBe('hosp-apollo-blr');
      expect(intent.updates).toEqual(
        expect.arrayContaining([
          { category: BedCategory.ICU, availableCount: 2 },
          { category: BedCategory.GENERAL, availableCount: 8 },
        ]),
      );
    }
  });

  it('maps HELP', () => {
    expect(parseInboundIntent('help').type).toBe('HELP');
    expect(parseInboundIntent('0').type).toBe('HELP');
  });

  it('maps CASE_STATUS with id', () => {
    expect(parseInboundIntent('STATUS abc12345')).toEqual({
      type: 'CASE_STATUS',
      caseId: 'abc12345',
    });
  });

  it('returns UNKNOWN for nonsense', () => {
    expect(parseInboundIntent('pizza please')).toEqual({ type: 'UNKNOWN', raw: 'pizza please' });
  });
});

describe('parseBedUpdateText', () => {
  it('parses colon and space forms', () => {
    expect(parseBedUpdateText('ICU:3, Ventilator 1')).toEqual([
      { category: BedCategory.ICU, availableCount: 3 },
      { category: BedCategory.VENTILATOR, availableCount: 1 },
    ]);
  });
});
