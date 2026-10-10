import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  @Post('ask')
  ask(@Body('question') question: string) {
    if (!question?.trim()) throw new BadRequestException('question requerida');
    if (question.length > 500) throw new BadRequestException('Pregunta demasiado larga');
    return this.service.ask(question.trim());
  }

  @Get('daily-brief')
  dailyBrief() {
    return this.service.dailyBrief();
  }
}
