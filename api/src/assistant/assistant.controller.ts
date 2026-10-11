import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { CurrentUser } from '../auth/auth.decorators';
import type { JwtUser } from '../auth/auth.decorators';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  @Post('ask')
  ask(@CurrentUser() user: JwtUser, @Body('question') question: string) {
    if (!question?.trim()) throw new BadRequestException('question requerida');
    if (question.length > 500) throw new BadRequestException('Pregunta demasiado larga');
    return this.service.ask(user.businessId, question.trim());
  }

  @Get('daily-brief')
  dailyBrief(@CurrentUser() user: JwtUser) {
    return this.service.dailyBrief(user.businessId);
  }
}
