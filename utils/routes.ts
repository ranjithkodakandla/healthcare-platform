/**
 * Canonical screen inventory for Sahayak / Rakshak.
 * Extend this file when a new screen ships — discovery + smoke tests read from here.
 */

export type AppId = 'citizen' | 'provider' | 'admin';

export interface ScreenDef {
  id: string;
  path: string;
  titleHint?: string | RegExp;
  requiresAuth?: boolean;
  tags?: string[];
}

export const CITIZEN_SCREENS: ScreenDef[] = [
  { id: 'C-00', path: '/', tags: ['nav'] },
  {
    id: 'C-01',
    path: '/onboarding/splash',
    titleHint: /Sahayak|language/i,
    tags: ['auth', 'onboarding'],
  },
  { id: 'C-02', path: '/onboarding/guest', titleHint: /Emergency/i, tags: ['auth', 'guest'] },
  { id: 'C-03', path: '/onboarding/otp', titleHint: /OTP|mobile|Register|Login/i, tags: ['auth'] },
  { id: 'C-04', path: '/home/dashboard', tags: ['home'] },
  {
    id: 'C-05',
    path: '/home/triage',
    titleHint: /conscious|breathing|Emergency|triage/i,
    tags: ['emergency', 'ai'],
  },
  { id: 'C-06', path: '/home/searching', tags: ['emergency', 'ambulance'] },
  { id: 'C-07', path: '/home/tracking', tags: ['ambulance', 'case'] },
  { id: 'C-08', path: '/home/arrival', tags: ['ambulance'] },
  { id: 'C-09', path: '/case/dashboard', tags: ['case'] },
  { id: 'C-10', path: '/case/timeline', tags: ['case'] },
  { id: 'C-11', path: '/case/coordinator', tags: ['case', 'support'] },
  { id: 'C-12', path: '/search', tags: ['search'] },
  { id: 'C-13', path: '/search/beds', tags: ['beds', 'search'] },
  { id: 'C-14', path: '/search/bed-detail', tags: ['beds'] },
  { id: 'C-15', path: '/search/bed-hold', tags: ['beds', 'case'] },
  { id: 'C-16', path: '/search/doctors', tags: ['doctors'] },
  { id: 'C-17', path: '/search/doctor-detail', tags: ['doctors'] },
  { id: 'C-18', path: '/search/hospitals', tags: ['hospitals'] },
  { id: 'C-19', path: '/search/hospital-detail', tags: ['hospitals'] },
  { id: 'C-20', path: '/search/pharmacy', tags: ['pharmacy'] },
  { id: 'C-21', path: '/search/pharmacy-hold', tags: ['pharmacy'] },
  { id: 'C-22', path: '/search/blood-bank', tags: ['blood'] },
  { id: 'C-23', path: '/search/blood-request', tags: ['blood'] },
  { id: 'C-24', path: '/search/diagnostics', tags: ['diagnostics'] },
  { id: 'C-25', path: '/search/diagnostic-result', tags: ['diagnostics'] },
  { id: 'C-26', path: '/search/insurance', tags: ['insurance'] },
  { id: 'C-27', path: '/search/cancer', tags: ['cancer'] },
  { id: 'C-28', path: '/search/teleconsult', tags: ['doctors'] },
  { id: 'C-29', path: '/account/profile', tags: ['profile'] },
  { id: 'C-30', path: '/account/consent', tags: ['profile'] },
  { id: 'C-31', path: '/account/chronic', tags: ['profile'] },
  { id: 'C-32', path: '/driver/dispatch', tags: ['driver'] },
  { id: 'C-33', path: '/driver/navigate', tags: ['driver'] },
];

export const PROVIDER_SCREENS: ScreenDef[] = [
  { id: 'P-01', path: '/login', titleHint: /Provider Portal/i, tags: ['auth'] },
  { id: 'P-02', path: '/hospital/dashboard', requiresAuth: true, tags: ['dashboard'] },
  { id: 'P-03', path: '/hospital/beds', requiresAuth: true, tags: ['beds'] },
  { id: 'P-04', path: '/hospital/queue', requiresAuth: true, tags: ['queue', 'case'] },
  { id: 'P-05', path: '/hospital/clinical-ack', requiresAuth: true, tags: ['clinical'] },
  { id: 'P-06', path: '/hospital/cases', requiresAuth: true, tags: ['case'] },
  { id: 'P-07', path: '/hospital/reports', requiresAuth: true, tags: ['reports'] },
  { id: 'P-08', path: '/hospital/analytics', requiresAuth: true, tags: ['analytics'] },
  { id: 'P-09', path: '/hospital/ai-assistant', requiresAuth: true, tags: ['ai'] },
  { id: 'P-10', path: '/hospital/users', requiresAuth: true, tags: ['users'] },
  { id: 'P-11', path: '/hospital/config', requiresAuth: true, tags: ['config'] },
  { id: 'P-12', path: '/hospital/audit', requiresAuth: true, tags: ['audit'] },
  { id: 'P-13', path: '/doctor/availability', requiresAuth: true, tags: ['doctors'] },
  { id: 'P-14', path: '/ambulance/fleet', requiresAuth: true, tags: ['ambulance'] },
  { id: 'P-15', path: '/pharmacy/stock', requiresAuth: true, tags: ['pharmacy'] },
  { id: 'P-16', path: '/blood-bank/pre-alerts', requiresAuth: true, tags: ['blood'] },
  { id: 'P-17', path: '/diagnostics/results', requiresAuth: true, tags: ['diagnostics'] },
  { id: 'P-18', path: '/insurance/pre-auth', requiresAuth: true, tags: ['insurance'] },
  { id: 'P-19', path: '/insurance/network', requiresAuth: true, tags: ['insurance'] },
];

export const ADMIN_SCREENS: ScreenDef[] = [
  { id: 'A-01', path: '/login', titleHint: /Admin Console/i, tags: ['auth'] },
  { id: 'A-02', path: '/dashboard', requiresAuth: true, tags: ['dashboard'] },
  { id: 'A-03', path: '/onboarding/citizen', requiresAuth: true, tags: ['onboarding'] },
  { id: 'A-04', path: '/onboarding/provider', requiresAuth: true, tags: ['onboarding'] },
  { id: 'A-05', path: '/onboarding/provider/verify', requiresAuth: true, tags: ['onboarding'] },
  { id: 'A-06', path: '/support/tickets', requiresAuth: true, tags: ['support'] },
  { id: 'A-07', path: '/support/tickets/detail', requiresAuth: true, tags: ['support'] },
  { id: 'A-08', path: '/support/remote-assist', requiresAuth: true, tags: ['support'] },
  { id: 'A-09', path: '/issues/board', requiresAuth: true, tags: ['issues'] },
  { id: 'A-10', path: '/issues/sla', requiresAuth: true, tags: ['monitoring'] },
  { id: 'A-11', path: '/knowledge-base', requiresAuth: true, tags: ['kb'] },
  { id: 'A-12', path: '/users', requiresAuth: true, tags: ['users'] },
  { id: 'A-13', path: '/workflows', requiresAuth: true, tags: ['config'] },
  { id: 'A-14', path: '/monitoring', requiresAuth: true, tags: ['monitoring'] },
  { id: 'A-15', path: '/analytics', requiresAuth: true, tags: ['analytics'] },
  { id: 'A-16', path: '/communications', requiresAuth: true, tags: ['comms'] },
  { id: 'A-17', path: '/ai-assistant', requiresAuth: true, tags: ['ai'] },
  { id: 'A-18', path: '/governance', requiresAuth: true, tags: ['config', 'audit'] },
  { id: 'A-19', path: '/support/provider-tickets', requiresAuth: true, tags: ['support'] },
];

export const SCREENS_BY_APP: Record<AppId, ScreenDef[]> = {
  citizen: CITIZEN_SCREENS,
  provider: PROVIDER_SCREENS,
  admin: ADMIN_SCREENS,
};
