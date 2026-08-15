import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, BatchAlert } from '../../core/api.service';

@Component({
  selector: 'app-ventra-vencimientos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4 flex items-center gap-3">
      <label class="text-sm text-gray-500">Mostrar lotes que vencen en</label>
      <select [(ngModel)]="days" (change)="load()" class="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
        <option [value]="7">7 días</option>
        <option [value]="15">15 días</option>
        <option [value]="30">30 días</option>
        <option [value]="60">60 días</option>
        <option [value]="90">90 días</option>
      </select>
      <span class="text-sm text-gray-400">{{ alerts.length }} lotes</span>
    </div>

    <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th class="px-5 py-3">Producto</th><th class="px-5 py-3">Lote</th><th class="px-5 py-3 text-right">Cantidad</th>
            <th class="px-5 py-3">Vence</th><th class="px-5 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          @for (a of alerts; track a.id) {
            <tr class="border-b border-gray-50 dark:border-gray-800/50">
              <td class="px-5 py-3">
                <p class="font-medium text-gray-800 dark:text-white/90">{{ a.product.name }}</p>
                <p class="text-xs text-gray-400">{{ a.product.sku }} · {{ a.product.barcode }}</p>
              </td>
              <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ a.lotCode }}</td>
              <td class="px-5 py-3 text-right text-gray-700 dark:text-gray-300">{{ a.quantity }}</td>
              <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ a.expiresAt | date: 'dd/MM/yyyy' }}</td>
              <td class="px-5 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" [class]="badge(a.level)">
                  {{ label(a) }}
                </span>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="py-10 text-center text-gray-400">Sin lotes por vencer en este rango 🎉</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class VentraVencimientosComponent implements OnInit {
  alerts: BatchAlert[] = [];
  days = 30;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.alerts(this.days).subscribe((a) => (this.alerts = a));
  }

  badge(level: BatchAlert['level']) {
    switch (level) {
      case 'vencido':
      case 'critico':
        return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400';
      case 'alerta':
        return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400';
      case 'proximo':
        return 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400';
      default:
        return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400';
    }
  }

  label(a: BatchAlert) {
    if (a.level === 'vencido') return 'VENCIDO';
    return `${a.daysToExpiry} días (${a.level})`;
  }
}
