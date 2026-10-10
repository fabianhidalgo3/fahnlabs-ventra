import { Injectable, signal } from '@angular/core';

/** Señal reactiva del modo oscuro (observa la clase `dark` del <html>). */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(this.read());

  constructor() {
    new MutationObserver(() => this.isDark.set(this.read())).observe(
      document.documentElement,
      { attributes: true, attributeFilter: ['class'] },
    );
  }

  private read(): boolean {
    return document.documentElement.classList.contains('dark');
  }
}
