import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, whatsappUrl } from '../../core/api.service';

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-ventra-asistente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div class="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Asistente IA</h3>
        <p class="mb-4 text-sm text-gray-500">Pregunta sobre tus ventas, stock y vencimientos. Corre gratis en este Mac (Ollama · llama3.1).</p>

        <div class="mb-4 max-h-[50vh] min-h-40 space-y-3 overflow-y-auto pr-1">
          @for (m of messages; track $index) {
            <div [class]="m.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
              <div class="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm"
                [class]="m.role === 'user'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90'">
                {{ m.text }}
              </div>
            </div>
          } @empty {
            <div class="py-8 text-center text-sm text-gray-400">
              Prueba: “¿cómo van las ventas de la semana?” · “¿qué debo reponer?” · “¿qué se vence pronto?”
            </div>
          }
          @if (thinking) {
            <div class="flex justify-start">
              <div class="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-400 dark:bg-gray-800">Pensando…</div>
            </div>
          }
        </div>

        <div class="flex gap-2">
          <input [(ngModel)]="question" (keydown.enter)="send()" [disabled]="thinking"
            placeholder="Escribe tu pregunta…"
            class="h-11 flex-1 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:text-white/90" />
          <button (click)="send()" [disabled]="thinking || !question.trim()"
            class="h-11 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
            Preguntar
          </button>
        </div>
        @if (error) { <p class="mt-2 text-sm text-error-600">{{ error }}</p> }
      </div>

      <div class="h-fit rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Resumen diario → WhatsApp</h3>
        <p class="mb-4 text-sm text-gray-500">La IA redacta el resumen del día y se abre WhatsApp con el mensaje listo para enviarlo a quien elijas.</p>
        <button (click)="brief()" [disabled]="briefing"
          class="w-full rounded-lg bg-success-500 py-3 font-medium text-white hover:bg-success-600 disabled:opacity-40">
          {{ briefing ? 'Redactando…' : '📲 Generar y enviar por WhatsApp' }}
        </button>
        @if (briefText) {
          <div class="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{{ briefText }}</div>
          <a [href]="waUrl(briefText)" target="_blank"
            class="mt-2 block rounded-lg border border-success-500 py-2.5 text-center text-sm font-medium text-success-600">
            Reabrir en WhatsApp
          </a>
        }

        <div class="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
          <h3 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">🤖 Bot de WhatsApp</h3>
          @switch (wa?.status) {
            @case ('CONECTADO') {
              <p class="text-sm text-success-600">✓ Conectado{{ wa?.numero ? ' (+' + wa?.numero + ')' : '' }}</p>
              <p class="mt-1 text-sm text-gray-500">Escríbele al chat <strong>"Tú" (mensaje a ti mismo)</strong> en WhatsApp y el asistente te responde con los datos del negocio.</p>
            }
            @case ('ESPERANDO_QR') {
              <p class="mb-2 text-sm text-gray-500">Vincula tu WhatsApp: en el teléfono abre <strong>WhatsApp → Dispositivos vinculados → Vincular dispositivo</strong> y escanea:</p>
              @if (wa?.qrDataUrl) {
                <img [src]="wa?.qrDataUrl" alt="QR WhatsApp" class="mx-auto h-56 w-56 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700" />
              }
            }
            @case ('ERROR') {
              <p class="text-sm text-error-600">Error: {{ wa?.lastError }}</p>
            }
            @default {
              <p class="text-sm text-gray-400">{{ wa?.status ?? 'Consultando…' }}</p>
            }
          }
          <button (click)="waRestart()" class="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">Reiniciar conexión</button>
        </div>
      </div>
    </div>
  `,
})
export class VentraAsistenteComponent implements OnInit, OnDestroy {
  messages: ChatMsg[] = [];
  question = '';
  thinking = false;
  error = '';
  briefing = false;
  briefText = '';
  wa?: { status: string; qrDataUrl: string | null; numero: string | null; lastError: string | null };
  private waTimer?: ReturnType<typeof setInterval>;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.pollWa();
    this.waTimer = setInterval(() => this.pollWa(), 5000);
  }

  ngOnDestroy() {
    if (this.waTimer) clearInterval(this.waTimer);
  }

  pollWa() {
    this.api.whatsappStatus().subscribe({
      next: (s) => (this.wa = s),
      error: () => undefined,
    });
  }

  waRestart() {
    this.api.whatsappRestart().subscribe(() => this.pollWa());
  }

  waUrl(text: string) {
    return whatsappUrl(text);
  }

  send() {
    const q = this.question.trim();
    if (!q || this.thinking) return;
    this.messages.push({ role: 'user', text: q });
    this.question = '';
    this.thinking = true;
    this.error = '';
    this.api.ask(q).subscribe({
      next: (r) => {
        this.messages.push({ role: 'assistant', text: r.answer });
        this.thinking = false;
      },
      error: (e) => {
        this.error = e?.error?.message ?? 'El asistente no respondió';
        this.thinking = false;
      },
    });
  }

  brief() {
    this.briefing = true;
    this.briefText = '';
    this.api.dailyBrief().subscribe({
      next: (r) => {
        this.briefText = r.text;
        this.briefing = false;
        window.open(whatsappUrl(r.text), '_blank');
      },
      error: () => (this.briefing = false),
    });
  }
}
