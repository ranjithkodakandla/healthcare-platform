import { InboundMessageHandler } from './inbound-message.handler';

describe('InboundMessageHandler (unit)', () => {
  function build() {
    const cases = { createGuestCase: jest.fn().mockResolvedValue({ id: 'c-abcdef12', caseNumber: 'HCC-1' }) };
    const bedSearch = {
      searchBeds: jest.fn().mockResolvedValue([
        {
          hospitalId: 'h1',
          hospitalName: 'City',
          availableCount: 2,
          category: 'ICU',
          distanceKm: 1.2,
          stalenessStatus: 'FRESH',
        },
      ]),
    };
    const bedInventory = {
      getBedInventory: jest.fn().mockResolvedValue([
        { category: 'ICU', occupiedCount: 1, totalCount: 3 },
      ]),
      updateBedCounts: jest.fn().mockResolvedValue([{ category: 'ICU' }]),
    };
    const prisma = {
      case: { findFirst: jest.fn() },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const adapter = { send: jest.fn().mockResolvedValue({ ok: true, externalId: 'x1' }) };
    const handler = new InboundMessageHandler(
      cases as never,
      bedSearch as never,
      bedInventory as never,
      prisma as never,
      audit as never,
    );
    return { handler, cases, bedSearch, bedInventory, prisma, audit, adapter };
  }

  const base = { channel: 'whatsapp' as const, from: '+9198', body: '', externalId: 'e1' };

  it('handles EMERGENCY_CASE', async () => {
    const { handler, cases, adapter } = build();
    const result = await handler.handle({ ...base, body: 'AMBULANCE chest pain' }, adapter as never);
    expect(cases.createGuestCase).toHaveBeenCalled();
    expect(result.intent).toBe('EMERGENCY_CASE');
    expect(adapter.send).toHaveBeenCalled();
  });

  it('handles BED_SEARCH empty and non-empty', async () => {
    const ctx = build();
    let result = await ctx.handler.handle({ ...base, body: 'BEDS ICU' }, ctx.adapter as never);
    expect(result.reply).toMatch(/Nearest beds/);
    ctx.bedSearch.searchBeds.mockResolvedValueOnce([]);
    result = await ctx.handler.handle({ ...base, body: 'BEDS' }, ctx.adapter as never);
    expect(result.reply).toMatch(/No beds found/);
  });

  it('handles BED_UPDATE with merge', async () => {
    const { handler, bedInventory, adapter } = build();
    const result = await handler.handle(
      { ...base, body: 'HOSP hosp-1 ICU 2' },
      adapter as never,
    );
    expect(bedInventory.updateBedCounts).toHaveBeenCalled();
    expect(result.intent).toBe('BED_UPDATE');
  });

  it('handles CASE_STATUS branches', async () => {
    const { handler, prisma, adapter } = build();
    let result = await handler.handle({ ...base, body: 'STATUS' }, adapter as never);
    expect(result.reply).toMatch(/STATUS followed/);
    prisma.case.findFirst.mockResolvedValueOnce({
      id: 'c1',
      status: 'INITIATED',
      caseNumber: 'HCC-1',
    });
    result = await handler.handle({ ...base, body: 'STATUS c1' }, adapter as never);
    expect(result.reply).toMatch(/Case HCC-1/);
    prisma.case.findFirst.mockResolvedValueOnce(null);
    result = await handler.handle({ ...base, body: 'STATUS nope' }, adapter as never);
    expect(result.reply).toMatch(/No case found/);
  });

  it('handles HELP and UNKNOWN for whatsapp and ivr', async () => {
    const { handler, adapter } = build();
    let result = await handler.handle({ ...base, body: 'HELP' }, adapter as never);
    expect(result.reply).toMatch(/Sahayak commands/);
    result = await handler.handle(
      { channel: 'ivr', from: '1', body: 'HELP', externalId: 'i1' },
      adapter as never,
    );
    expect(result.reply).toMatch(/Press 1/);
    result = await handler.handle({ ...base, body: 'zzzz' }, adapter as never);
    expect(result.reply).toMatch(/didn't understand/);
    result = await handler.handle(
      { channel: 'ivr', from: '1', body: 'zzzz', externalId: 'i2' },
      adapter as never,
    );
    expect(result.reply).toMatch(/Invalid option/);
  });
});
