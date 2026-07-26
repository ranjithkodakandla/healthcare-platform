import * as constants from './index';

describe('@sahayak/shared-constants', () => {
  it('exports all enums with stable string values', () => {
    expect(constants.CaseType.EMERGENCY).toBe('EMERGENCY');
    expect(constants.CaseStatus.INITIATED).toBe('INITIATED');
    expect(constants.CaseSeverity.CRITICAL).toBe('CRITICAL');
    expect(constants.ResourceType.AMBULANCE).toBe('AMBULANCE');
    expect(constants.ResourceHoldStatus.PENDING).toBe('PENDING');
    expect(constants.DomainEvent.CASE_CREATED).toBe('case.created');
    expect(constants.AiCapability.TRIAGE_INTAKE).toBe('TRIAGE_INTAKE');
    expect(Object.values(constants.AiCapability)).not.toContain('CLINICAL_DECISION');
    expect(constants.Role.ADMIN).toBe('ADMIN');
    expect(constants.ProviderType.HOSPITAL).toBe('HOSPITAL');
    expect(constants.OnboardingStage.APPLICATION_INTAKE).toBe('APPLICATION_INTAKE');
    expect(constants.OnboardingStageStatus.COMPLETE).toBe('COMPLETE');
    expect(constants.ConsoleRole.CONSOLE_ADMINISTRATOR).toBe('CONSOLE_ADMINISTRATOR');
    expect(constants.HospitalPortalRole.HOSPITAL_CLINICAL_LEAD).toBe('HOSPITAL_CLINICAL_LEAD');
    expect(constants.BedCategory.ICU).toBe('ICU');
    expect(constants.BedInventoryStatus.FRESH).toBe('FRESH');
  });

  it('ERROR_CODES is a complete frozen catalogue of string codes', () => {
    const codes = Object.values(constants.ERROR_CODES);
    expect(codes.length).toBeGreaterThan(10);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(3);
    }
    expect(constants.ERROR_CODES.RESOURCE_HOLD_CAPACITY_EXCEEDED).toBe(
      'RESOURCE_HOLD_CAPACITY_EXCEEDED',
    );
  });

  it('enum membership covers every key', () => {
    const enums = [
      constants.CaseType,
      constants.CaseStatus,
      constants.CaseSeverity,
      constants.ResourceType,
      constants.ResourceHoldStatus,
      constants.DomainEvent,
      constants.AiCapability,
      constants.Role,
      constants.ProviderType,
      constants.OnboardingStage,
      constants.OnboardingStageStatus,
      constants.ConsoleRole,
      constants.HospitalPortalRole,
      constants.BedCategory,
      constants.BedInventoryStatus,
    ];
    for (const e of enums) {
      const values = Object.values(e);
      expect(values.length).toBeGreaterThan(0);
      for (const v of values) expect(typeof v).toBe('string');
    }
  });
});
