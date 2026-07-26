import { Role } from '@sahayak/shared-constants';

export interface AuthenticatedPrincipal {
  uid: string;
  phoneNumber?: string;
  email?: string;
  role: Role;
  orgId?: string; // provider/admin org scoping (I7 ABAC)
}

// I7: one shared Authentication service behind this interface — Firebase Auth today
// (DL-001), swappable later without touching callers, same discipline as EventPublisher
// (M6). `verifyToken` is the only thing every caller needs; provider-specific concerns
// (MFA enrollment, custom-claims assignment) live inside the concrete implementation.
export interface AuthProvider {
  verifyToken(idToken: string): Promise<AuthenticatedPrincipal>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
