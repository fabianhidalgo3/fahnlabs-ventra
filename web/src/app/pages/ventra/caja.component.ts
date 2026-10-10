import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, CashSummary, CashSession } from '../../core/api.service';

@Component({
  selector: 'app-ventra-caja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div class="xl:col-span-2">
        @if (!summary?.session) {
          <!-- Caja cerrada: abrir turno -->
          <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">🔓 Abrir caja</h3>
            <p class="mb-4 text-sm text-gray-500">Ingresa el fondo inicial (sencillo) con el que parte el turno.</p>
            <div class="flex items-end gap-3">
              <div>
                <label class="mb-1 block text-sm text-gray-500">Fondo inicial $</label>
                <input type="number" [(ngModel)]="openingCash" min="0" step="1" inputmode="numeric" placeholder="Ej: 20000"
                  class="h-12 w-44 rounded-lg border bg-transparent px-3 text-lg font-semibold dark:text-white/90"
                  [class]="montoInvalido(openingCash) ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
              </div>
              <button (click)="open()" [disabled]="openingCash == null || montoInvalido(openingCash)"
                class="h-12 rounded-lg bg-brand-500 px-6 font-medium text-white hover:bg-brand-600 disabled:opacity-40">Abrir turno</button>
            </div>
            @if (error) { <p class="mt-3 text-sm text-error-600">{{ error }}</p> }
          </div>
        } @else {
          <!-- Caja abierta: resumen + cierre -->
          <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">🟢 Caja abierta</h3>
              <span class="text-sm text-gray-500">desde {{ summary!.session!.openedAt | date: 'dd/MM HH:mm' }}</span>
            </div>

            <div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                <p class="text-xs text-gray-500">Fondo inicial</p>
                <p class="text-xl font-bold text-gray-800 dark:text-white/90">{{ clp(summary!.session!.openingCash) }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                <p class="text-xs text-gray-500">Ventas del turno</p>
                <p class="text-xl font-bold text-gray-800 dark:text-white/90">{{ summary!.ventas }} · {{ clp(summary!.totalVentas ?? 0) }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                <p class="text-xs text-gray-500">Efectivo esperado</p>
                <p class="text-xl font-bold text-success-600">{{ clp(summary!.expectedCash ?? 0) }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                <p class="text-xs text-gray-500">Otros medios</p>
                <p class="text-xl font-bold text-gray-800 dark:text-white/90">{{ clp((summary!.totalVentas ?? 0) - efectivoTurno) }}</p>
              </div>
            </div>

            <table class="mb-5 w-full text-sm">
              <thead>
                <tr class="border-b border-gray-100 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th class="py-2">Medio de pago</th><th class="py-2 text-right">Ventas</th><th class="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                @for (pm of paymentRows; track pm.key) {
                  <tr class="border-b border-gray-50 dark:border-gray-800/50">
                    <td class="py-2 text-gray-700 dark:text-gray-300">{{ pm.key }}</td>
                    <td class="py-2 text-right text-gray-600 dark:text-gray-400">{{ pm.ventas }}</td>
                    <td class="py-2 text-right font-medium text-gray-800 dark:text-white/90">{{ clp(pm.total) }}</td>
                  </tr>
                }
              </tbody>
            </table>

            <div class="rounded-xl border-2 border-dashed border-gray-200 p-4 dark:border-gray-700">
              <h4 class="mb-2 font-semibold text-gray-800 dark:text-white/90">🔒 Cerrar caja (arqueo)</h4>
              <p class="mb-3 text-sm text-gray-500">Cuenta el efectivo del cajón y regístralo; el sistema calcula la diferencia.</p>
              <div class="flex flex-wrap items-end gap-3">
                <div>
                  <label class="mb-1 block text-sm text-gray-500">Efectivo contado $</label>
                  <input type="number" [(ngModel)]="countedCash" min="0" step="1" inputmode="numeric" placeholder="Cuenta el cajón"
                    class="h-12 w-44 rounded-lg border bg-transparent px-3 text-lg font-semibold dark:text-white/90"
                    [class]="montoInvalido(countedCash) ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
                </div>
                <input [(ngModel)]="note" placeholder="Nota (opcional)" maxlength="200"
                  class="h-12 flex-1 min-w-40 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
                <button (click)="close()" [disabled]="countedCash == null || montoInvalido(countedCash)"
                  class="h-12 rounded-lg bg-error-500 px-6 font-medium text-white hover:bg-error-600 disabled:opacity-40">Cerrar turno</button>
              </div>
              @if (countedCash != null) {
                <p class="mt-3 text-sm">
                  Diferencia estimada:
                  <span class="font-bold" [class]="countedCash - (summary!.expectedCash ?? 0) === 0 ? 'text-success-600' : 'text-error-600'">
                    {{ clp(countedCash - (summary!.expectedCash ?? 0)) }}
                  </span>
                </p>
              }
              @if (error) { <p class="mt-2 text-sm text-error-600">{{ error }}</p> }
            </div>
          </div>
        }
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] h-fit">
        <h3 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">Cierres anteriores</h3>
        <div class="space-y-3">
          @for (h of history; track h.id) {
            @if (h.status === 'CERRADA') {
              <div class="rounded-xl border border-gray-100 p-3 text-sm dark:border-gray-800">
                <div class="flex justify-between">
                  <span class="font-medium text-gray-800 dark:text-white/90">{{ h.openedAt | date: 'dd/MM/yyyy' }}</span>
                  <span class="font-bold" [class]="dif(h) === 0 ? 'text-success-600' : 'text-error-600'">
                    {{ dif(h) === 0 ? 'Cuadrada ✓' : 'Dif. ' + clp(dif(h)) }}
                  </span>
                </div>
                <p class="text-xs text-gray-500">
                  Esperado {{ clp(h.expectedCash ?? 0) }} · Contado {{ clp(h.countedCash ?? 0) }}
                  @if (h.note) { · {{ h.note }} }
                </p>
              </div>
            }
          } @empty {
            <p class="py-4 text-center text-sm text-gray-400">Sin cierres aún</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class VentraCajaComponent implements OnInit {
  summary?: CashSummary;
  history: CashSession[] = [];
  openingCash?: number;
  countedCash?: number;
  note = '';
  error = '';

  constructor(private api: ApiService) {}

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  /** Prisma serializa Decimal como string: normalizar antes de comparar. */
  dif(h: CashSession): number {
    return Number(h.difference ?? 0);
  }

  /** CLP: entero ≥ 0; marca inválido lo demás. */
  montoInvalido(v?: number): boolean {
    if (v == null || String(v) === '') return false;
    const n = Number(v);
    return isNaN(n) || n < 0 || !Number.isInteger(n);
  }

  get efectivoTurno() {
    return this.summary?.byPayment?.['EFECTIVO']?.total ?? 0;
  }

  get paymentRows() {
    return Object.entries(this.summary?.byPayment ?? {}).map(([key, v]) => ({ key, ...v }));
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.error = '';
    this.api.cashCurrent().subscribe((s) => (this.summary = s));
    this.api.cashHistory().subscribe((h) => (this.history = h));
  }

  open() {
    if (this.openingCash == null) return;
    this.api.cashOpen(Number(this.openingCash)).subscribe({
      next: () => {
        this.openingCash = undefined;
        this.load();
      },
      error: (e) => (this.error = e?.error?.message ?? 'Error al abrir caja'),
    });
  }

  close() {
    if (this.countedCash == null) return;
    if (!confirm('¿Cerrar el turno de caja?')) return;
    this.api.cashClose(Number(this.countedCash), this.note).subscribe({
      next: () => {
        this.countedCash = undefined;
        this.note = '';
        this.load();
      },
      error: (e) => (this.error = e?.error?.message ?? 'Error al cerrar caja'),
    });
  }
}
