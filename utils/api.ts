import { APIRequestContext, expect } from '@playwright/test';
import { env } from './env';

export async function assertApiHealthy(request: APIRequestContext): Promise<void> {
  const res = await request.get(`${env.apiUrl}/health`);
  expect(res.ok(), `API /health failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe('ok');
  expect(body.checks?.postgres).toBe('up');
  expect(body.checks?.redis).toBe('up');
}

export async function createGuestEmergencyCase(
  request: APIRequestContext,
  deviceId = `e2e-${Date.now()}`,
): Promise<{ caseId: string; caseNumber: string; severity: string }> {
  const res = await request.post(`${env.apiUrl}/v1/citizen/cases/guest`, {
    data: {
      deviceId,
      location: { lat: 12.9716, lng: 77.5946 },
      triage: { isConscious: false, isBreathing: false, hasVisibleBleeding: false },
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const json = await res.json();
  return {
    caseId: json.data.id,
    caseNumber: json.data.caseNumber,
    severity: json.data.severity ?? json.meta?.severity,
  };
}
