import { ApiProperty } from '@nestjs/swagger';
import { HospitalPortalRole } from '@sahayak/shared-constants';

// P-10 User Management "+ Add user" (F3.6). Provisions a real Firebase account scoped
// to the caller's org via custom claims — same claims-based identity model as the rest
// of auth (no separate Membership table exists yet; see IMPLEMENTATION_MASTER_PLAN.md
// technical debt on that gap).
export class InviteProviderUserDto {
  @ApiProperty({ description: 'Full name of the new staff member' })
  name: string;

  @ApiProperty({ description: 'Work email — becomes the Firebase Auth login identity' })
  email: string;

  @ApiProperty({ enum: HospitalPortalRole })
  role: HospitalPortalRole;
}
