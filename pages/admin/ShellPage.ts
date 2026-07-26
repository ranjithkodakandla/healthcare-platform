import { BasePage } from '../BasePage';

export class AdminShellPage extends BasePage {
  async open(path: string): Promise<void> {
    await this.goto(path);
    await this.expectAlive();
  }
}
