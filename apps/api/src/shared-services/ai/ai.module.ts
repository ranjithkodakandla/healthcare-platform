import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiPlatformClient } from './ai-platform.client';
import { AI_PROVIDER } from './ai-provider.interface';
import { CompositeAiProvider } from './composite-ai.provider';
import { HttpAiProvider } from './http-ai.provider';
import { NimAiProvider } from './nim-ai.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    HttpAiProvider,
    NimAiProvider,
    CompositeAiProvider,
    { provide: AI_PROVIDER, useExisting: CompositeAiProvider },
    AiPlatformClient,
  ],
  exports: [AiPlatformClient, AI_PROVIDER, HttpAiProvider, NimAiProvider],
})
export class AiModule {}
