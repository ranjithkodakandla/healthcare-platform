import { ConsoleRole } from '@sahayak/shared-constants';

export class UpdateConsoleUserDto {
  role?: ConsoleRole;
  status?: 'ACTIVE' | 'DEACTIVATED';
}
