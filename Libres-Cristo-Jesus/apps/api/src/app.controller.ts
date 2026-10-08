import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/security/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Phase 2 registers JwtAuthGuard globally (main.ts) — the health-check
  // endpoint must stay reachable without a token, so it's explicitly
  // marked @Public().
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
