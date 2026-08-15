import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { ApiService, Summary } from '../../core/api.service';

@Component({
  selector: 'app-ventra-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule],
  template: `
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
      @for (card of cards; track card.label) {
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ card.label }}</span>
          <h4 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">{{ card.value }}</h4>
        </div>
      }
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div class="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Ventas últimos 30 días</h3>
        @if (chart) {
          <apx-chart [series]="chart.series!" [chart]="chart.chart!" [xaxis]="chart.xaxis!"
            [stroke]="chart.stroke!" [dataLabels]="chart.dataLabels!" [colors]="chart.colors!" [tooltip]="chart.tooltip!" />
        }
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Top productos (30 días)</h3>
        <ul class="space-y-3">
          @for (t of month?.topProducts ?? []; track t.name) {
            <li class="flex items-center justify-between text-sm">
              <span class="text-gray-700 dark:text-gray-300 truncate pr-2">{{ t.name }}</span>
              <span class="font-medium text-gray-800 dark:text-white/90">{{ clp(t.total) }}</span>
            </li>
          }
        </ul>
      </div>
    </div>

    <div class="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Últimas ventas</h3>
        <a routerLink="/pos" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ Nueva venta</a>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th class="py-3 pr-4">N°</th><th class="py-3 pr-4">Fecha</th><th class="py-3 pr-4">Ítems</th>
              <th class="py-3 pr-4">Pago</th><th class="py-3 pr-4 text-right">Total</th><th class="py-3">Boleta</th>
            </tr>
          </thead>
          <tbody>
            @for (s of today?.lastSales ?? []; track s.id) {
              <tr class="border-b border-gray-50 dark:border-gray-800/50">
                <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white/90">{{ s.number }}</td>
                <td class="py-3 pr-4 text-gray-600 dark:text-gray-400">{{ s.createdAt | date: 'dd/MM HH:mm' }}</td>
                <td class="py-3 pr-4 text-gray-600 dark:text-gray-400">{{ s.items.length }}</td>
                <td class="py-3 pr-4 text-gray-600 dark:text-gray-400">{{ s.payment }}</td>
                <td class="py-3 pr-4 text-right font-medium text-gray-800 dark:text-white/90">{{ clp(s.total) }}</td>
                <td class="py-3">
                  @if (s.boleta?.pdfPath) {
                    <a [href]="api.fileUrl(s.boleta?.pdfPath)" target="_blank"
                      class="text-brand-500 hover:underline">Folio {{ s.boleta?.folio }}</a>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class VentraDashboardComponent implements OnInit {
  today?: Summary;
  month?: Summary;
  cards: { label: string; value: string }[] = [];
  chart?: Partial<ApexOptions>;

  constructor(public api: ApiService) {}

  clp(n: number) {
    return '$' + Math.round(n).toLocaleString('es-CL');
  }

  ngOnInit() {
    this.api.today().subscribe((t) => {
      this.today = t;
      this.cards = [
        { label: 'Ventas de hoy', value: String(t.totals.ventas) },
        { label: 'Total de hoy', value: this.clp(t.totals.total) },
        { label: 'Neto de hoy', value: this.clp(t.totals.neto) },
        { label: 'IVA de hoy', value: this.clp(t.totals.iva) },
      ];
    });
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    this.api.summary(from, to, 'day').subscribe((m) => {
      this.month = m;
      this.chart = {
        series: [{ name: 'Total', data: m.series.map((s) => Math.round(s.total)) }],
        chart: { type: 'area', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
        xaxis: {
          categories: m.series.map((s) => new Date(s.bucket).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })),
          labels: { rotate: -45 },
        },
        stroke: { curve: 'smooth', width: 2 },
        dataLabels: { enabled: false },
        colors: ['#465fff'],
        tooltip: { y: { formatter: (v: number) => this.clp(v) } },
      };
    });
  }
}
