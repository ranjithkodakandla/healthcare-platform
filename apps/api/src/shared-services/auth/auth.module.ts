import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AUTH_PROVIDER } from './auth-provider.interface';
import { FirebaseAuthProvider } from './firebase-auth-provider';
import { NotConfiguredAuthProvider } from './not-configured-auth-provider';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RolesGuard } from './roles.guard';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    FirebaseAuthProvider,
    NotConfiguredAuthProvider,
    {
      provide: AUTH_PROVIDER,
      inject: [ConfigService, FirebaseAuthProvider, NotConfiguredAuthProvider],
      useFactory: (
        config: ConfigService,
        firebase: FirebaseAuthProvider,
        notConfigured: NotConfiguredAuthProvider,
      ) => {
        // FIREBASE_PROJECT_ID alone is enough when using ADC (FIREBASE_SERVICE_ACCOUNT_JSON=ADC
        // or unset with ADC available). Explicit JSON still supported.
        const configured = Boolean(config.get<string>('FIREBASE_PROJECT_ID'));
        return configured ? firebase : notConfigured;
      },
    },
    AuthService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [AUTH_PROVIDER, AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
