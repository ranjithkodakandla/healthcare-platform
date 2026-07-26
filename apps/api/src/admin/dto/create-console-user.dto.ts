import { ConsoleRole } from '@sahayak/shared-constants';

export class CreateConsoleUserDto {
  email!: string;
  role!: ConsoleRole;
}
