import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../../core/confirm.service';

/** Modal global de confirmación — se monta una sola vez en el layout. */
@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (svc.estado().abierto) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" (click)="svc.responder(false)"></div>
        <div class="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-3 flex items-start gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              [class]="svc.estado().tono === 'peligro'
                ? 'bg-error-50 text-error-500 dark:bg-error-500/15'
                : 'bg-brand-50 text-brand-500 dark:bg-brand-500/15'">
              @if (svc.estado().tono === 'peligro') {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>
                </svg>
              } @else {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
              }
            </span>
            <div class="min-w-0">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ svc.estado().titulo }}</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ svc.estado().mensaje }}</p>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button (click)="svc.responder(false)"
              class="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
              Cancelar
            </button>
            <button (click)="svc.responder(true)" autofocus
              class="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white shadow-theme-xs"
              [class]="svc.estado().tono === 'peligro' ? 'bg-error-500 hover:bg-error-600' : 'bg-brand-500 hover:bg-brand-600'">
              {{ svc.estado().accion }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmModalComponent {
  constructor(public svc: ConfirmService) {}

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.svc.estado().abierto) this.svc.responder(false);
  }
}
