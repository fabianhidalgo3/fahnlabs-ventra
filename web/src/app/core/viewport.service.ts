import { Injectable, signal } from '@angular/core';

/** Señal reactiva de viewport móvil (< 768px), para alternar tabla ↔ cards. */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private mq = window.matchMedia('(max-width: 767px)');
  readonly esMovil = signal(this.mq.matches);

  constructor() {
    this.mq.addEventListener('change', (e) => this.esMovil.set(e.matches));
  }
}
