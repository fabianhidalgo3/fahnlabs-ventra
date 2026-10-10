import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Encabezado estándar de página: título + descripción a la izquierda, acciones a la derecha. */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{{ title }}</h1>
        @if (subtitle) {
          <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ subtitle }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
}
