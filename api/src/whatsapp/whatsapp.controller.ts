import { Controller, Get, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly service: WhatsappService) {}

  @Get('status')
  status() {
    return this.service.getStatus();
  }

  @Post('restart')
  restart() {
    return this.service.restart();
  }
}
