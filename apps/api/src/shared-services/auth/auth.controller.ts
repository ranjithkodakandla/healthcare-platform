import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

class LoginDto {
  idToken!: string;
}

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Citizen OTP and provider/admin MFA both terminate in a Firebase ID token on the
  // client (Firebase Auth handles OTP/MFA UX directly); this endpoint verifies that
  // token server-side and establishes the platform-side audited login.
  @Post('session')
  async createSession(@Body() body: LoginDto) {
    const principal = await this.authService.login(body.idToken);
    return { data: principal, meta: {}, errors: [] };
  }
}
