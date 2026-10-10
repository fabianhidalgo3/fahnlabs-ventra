import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';
import { AssistantService } from '../assistant/assistant.service';

export type WaStatus =
  | 'DESHABILITADO'
  | 'INICIANDO'
  | 'ESPERANDO_QR'
  | 'CONECTADO'
  | 'DESCONECTADO'
  | 'ERROR';

const BOT_PREFIX = '🤖';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('WhatsApp');
  private client?: Client;
  private qr?: string;
  status: WaStatus = 'DESHABILITADO';
  lastError?: string;

  constructor(private assistant: AssistantService) {}

  onModuleInit() {
    if (process.env.WHATSAPP_ENABLED === 'false') return;
    this.init();
  }

  async onModuleDestroy() {
    await this.client?.destroy().catch(() => undefined);
  }

  /**
   * Los reinicios bruscos de la API dejan el Chromium de WhatsApp huérfano y el
   * perfil bloqueado ("The browser is already running"). Antes de iniciar, se
   * mata cualquier huérfano de ese perfil y se borran sus archivos de lock.
   */
  private limpiarSesionBloqueada() {
    try {
      // [s] evita que pkill mate a su propia shell (el patrón no se matchea a sí mismo)
      execSync('pkill -f "wwebjs_auth/[s]ession" || true', { stdio: 'ignore' });
    } catch {}
    for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
      try {
        rmSync(join('.wwebjs_auth', 'session', lock), { force: true });
      } catch {}
    }
  }

  private init(reintento = false) {
    this.status = 'INICIANDO';
    this.lastError = undefined;
    this.limpiarSesionBloqueada();
    try {
      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      });

      this.client.on('qr', (qr) => {
        this.qr = qr;
        this.status = 'ESPERANDO_QR';
        this.logger.log('QR listo para escanear (ver panel web → Asistente IA)');
      });
      this.client.on('ready', () => {
        this.qr = undefined;
        this.status = 'CONECTADO';
        this.logger.log('WhatsApp conectado');
      });
      this.client.on('disconnected', (reason) => {
        this.status = 'DESCONECTADO';
        this.lastError = String(reason);
        this.logger.warn(`WhatsApp desconectado: ${reason}`);
      });
      this.client.on('auth_failure', (msg) => {
        this.status = 'ERROR';
        this.lastError = String(msg);
      });
      this.client.on('message_create', (msg) => {
        void this.handle(msg);
      });

      void this.client.initialize().catch((e) => {
        if (!reintento && String(e).includes('already running')) {
          this.logger.warn('Perfil bloqueado por un proceso huérfano; limpiando y reintentando…');
          setTimeout(() => this.init(true), 2000);
          return;
        }
        this.status = 'ERROR';
        this.lastError = String(e);
        this.logger.error(`No se pudo iniciar WhatsApp: ${e}`);
      });
    } catch (e) {
      this.status = 'ERROR';
      this.lastError = String(e);
    }
  }

  /** Responde en el chat "Tú" (mensaje a ti mismo) y a números autorizados. */
  private async handle(msg: Message) {
    try {
      const body = msg.body?.trim();
      if (!body || body.startsWith(BOT_PREFIX)) return; // ignora respuestas del propio bot
      if (msg.from.includes('@g.us')) return; // ignora grupos

      const me = this.client?.info?.wid?._serialized;
      const selfChat = msg.fromMe && msg.to === me;

      const allowed = (process.env.WHATSAPP_ALLOWED ?? '')
        .split(',')
        .map((n) => n.replace(/\D/g, ''))
        .filter(Boolean);
      const fromNumber = msg.from.replace(/\D/g, '');
      const authorized =
        selfChat || (!msg.fromMe && allowed.some((n) => fromNumber.endsWith(n)));
      if (!authorized) return;

      this.logger.log(`Pregunta por WhatsApp: ${body.slice(0, 80)}`);
      const { answer } = await this.assistant.ask(body);
      await msg.reply(`${BOT_PREFIX} ${answer}`);
    } catch (e) {
      this.logger.error(`Error respondiendo por WhatsApp: ${e}`);
      await msg
        .reply(`${BOT_PREFIX} No pude responder (¿Ollama corriendo?). Intenta de nuevo.`)
        .catch(() => undefined);
    }
  }

  async getStatus() {
    return {
      status: this.status,
      lastError: this.lastError ?? null,
      qrDataUrl: this.qr ? await QRCode.toDataURL(this.qr, { width: 280 }) : null,
      numero: this.client?.info?.wid?.user ?? null,
    };
  }

  async restart() {
    await this.client?.destroy().catch(() => undefined);
    this.client = undefined;
    this.qr = undefined;
    this.init();
    return { restarting: true };
  }
}
