import { Injectable, signal } from '@angular/core';

export interface ConfirmOpts {
  titulo: string;
  mensaje: string;
  /** Texto del botón de acción (default "Confirmar"). */
  accion?: string;
  /** 'peligro' pinta la acción en rojo (eliminar/anular); 'normal' en azul. */
  tono?: 'peligro' | 'normal';
}

interface Estado extends ConfirmOpts {
  abierto: boolean;
}

/**
 * Confirmaciones estándar en modal (reemplazo de confirm() nativo).
 * Uso: `if (await this.confirm.confirmar({ titulo, mensaje, tono: 'peligro' })) { … }`
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly estado = signal<Estado>({ abierto: false, titulo: '', mensaje: '' });
  private resolver?: (ok: boolean) => void;

  confirmar(opts: ConfirmOpts): Promise<boolean> {
    this.estado.set({ abierto: true, tono: 'normal', accion: 'Confirmar', ...opts });
    return new Promise((resolve) => (this.resolver = resolve));
  }

  responder(ok: boolean) {
    this.estado.update((e) => ({ ...e, abierto: false }));
    this.resolver?.(ok);
    this.resolver = undefined;
  }
}
