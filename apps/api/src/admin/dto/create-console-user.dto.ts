import { ConsoleRole } from '@sahayak/shared-constants';

export class CreateConsoleUserDto {
  email!: string;
  role!: ConsoleRole;
  /** Optional — provisions/resets a real Firebase login for this console user in the same step. */
  password?: string;
}
