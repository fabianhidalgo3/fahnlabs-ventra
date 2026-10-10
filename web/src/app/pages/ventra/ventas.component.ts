import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Sale } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-ventra-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label class="mb-1 block text-sm text-gray-500">Desde</label>
        <input type="date" [(ngModel)]="from" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
      </div>
      <div>
        <label class="mb-1 block text-sm text-gray-500">Hasta</label>
        <input type="date" [(ngModel)]="to" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
      </div>
      <button (click)="load()" class="h-11 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white">Consultar</button>
      <span class="text-sm text-gray-400">{{ sales.length }} ventas</span>
    </div>

    <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 max-h-[72vh] overflow-auto">
      <table class="w-full min-w-[800px] text-sm">
        <thead class="sticky top-0 z-10">
          <tr class="border-b border-gray-100 bg-white text-left text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <th class="px-5 py-3">N°</th><th class="px-5 py-3">Fecha</th><th class="px-5 py-3">Ítems</th>
            <th class="px-5 py-3">Pago</th><th class="px-5 py-3 text-right">Desc.</th>
            <th class="px-5 py-3 text-right">Total</th><th class="px-5 py-3">Boleta</th>
            <th class="px-5 py-3">Estado</th><th class="px-5 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (s of sales; track s.id) {
            <tr class="border-b border-gray-50 dark:border-gray-800/50" [class.opacity-50]="s.voidedAt">
              <td class="px-5 py-3 font-medium text-gray-800 dark:text-white/90">{{ s.number }}</td>
              <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ s.createdAt | date: 'dd/MM/yy HH:mm' }}</td>
              <td class="px-5 py-3 text-gray-600 dark:text-gray-400">
                <span [title]="itemNames(s)">{{ s.items.length }}</span>
              </td>
              <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ s.payment }}</td>
              <td class="px-5 py-3 text-right text-gray-500">{{ s.discount > 0 ? '-' + clp(s.discount) : '—' }}</td>
              <td class="px-5 py-3 text-right font-semibold text-gray-800 dark:text-white/90">{{ clp(s.total) }}</td>
              <td class="px-5 py-3">
                @if (s.boleta?.pdfPath) {
                  <a [href]="api.fileUrl(s.boleta?.pdfPath)" target="_blank" class="text-brand-500 hover:underline">Folio {{ s.boleta?.folio }}</a>
                }
              </td>
              <td class="px-5 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium"
                  [class]="s.voidedAt ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' : 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'">
                  {{ s.voidedAt ? 'ANULADA' : 'Emitida' }}
                </span>
              </td>
              <td class="px-5 py-3">
                @if (auth.isAdmin && !s.voidedAt) {
                  <button (click)="void(s)" class="rounded border border-error-300 px-2 py-1 text-xs text-error-600">Anular</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="9" class="py-10 text-center text-gray-400">Sin ventas en el rango</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class VentraVentasComponent implements OnInit {
  sales: Sale[] = [];
  from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  to = new Date().toISOString().slice(0, 10);

  constructor(
    public api: ApiService,
    public auth: AuthService,
  ) {}

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  itemNames(s: Sale) {
    return s.items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ');
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.sales(this.from, this.to).subscribe((s) => (this.sales = s));
  }

  void(s: Sale) {
    if (!confirm(`¿Anular la venta N° ${s.number} por ${this.clp(s.total)}? El stock se devuelve y la boleta queda anulada.`)) return;
    this.api.voidSale(s.id).subscribe(() => this.load());
  }
}
