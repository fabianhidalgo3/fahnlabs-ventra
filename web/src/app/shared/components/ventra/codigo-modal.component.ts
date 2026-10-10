import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Modal para mostrar el código de barras o QR de un producto, con impresión. */
@Component({
  selector: 'app-codigo-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (abierto) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" (click)="cerrar.emit()"></div>
        <div class="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <button (click)="cerrar.emit()" aria-label="Cerrar"
            class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
            ✕
          </button>
          <h3 class="mb-1 pr-8 text-base font-semibold text-gray-900 dark:text-white">{{ titulo }}</h3>
          @if (subtitulo) { <p class="mb-4 text-sm text-gray-500">{{ subtitulo }}</p> }
          <div class="flex items-center justify-center rounded-xl bg-white p-4">
            <img [src]="url" [alt]="titulo" class="max-h-72 w-auto max-w-full" />
          </div>
          <div class="mt-4 flex gap-2">
            <button (click)="imprimir()"
              class="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600">
              🖨 Imprimir etiqueta
            </button>
            <a [href]="url" target="_blank" download
              class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Descargar
            </a>
          </div>
        </div>
      </div>
    }
  `,
})
export class CodigoModalComponent {
  @Input() abierto = false;
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() url = '';
  @Output() cerrar = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.abierto) this.cerrar.emit();
  }

  imprimir() {
    const w = window.open('', '_blank', 'width=420,height=360');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${this.titulo}</title>
      <style>body{font-family:sans-serif;text-align:center;margin:24px}img{max-width:100%}p{font-size:12px;margin:6px 0}</style>
      </head><body>
      <p><strong>${this.titulo}</strong></p>
      <img src="${this.url}" onload="window.print();window.close()" />
      </body></html>`);
    w.document.close();
  }
}
