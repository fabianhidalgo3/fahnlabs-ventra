import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { ApiService, Summary } from '../../core/api.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';

@Component({
  selector: 'app-ventra-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Dashboard" subtitle="Resumen del negocio — hoy y últimos 30 días">
      <a routerLink="/pos"
        class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">
        + Nueva venta
      </a>
    </app-page-header>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
      @for (card of cards; track card.label) {
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15">
              @switch (card.icon) {
                @case ('ventas') {
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M5.5 2.5h9v15l-2.25-1.5L10 17.5l-2.25-1.5-2.25 1.5v-15z" />
                    <path d="M8 7h4M8 10.5h4" />
                  </svg>
                }
                @case ('total') {
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="10" cy="10" r="7.25" />
                    <path d="M12.1 7.9c-.4-.6-1.2-1-2.1-1-1.2 0-2.1.65-2.1 1.55S8.8 9.8 10 10s2.35.6 2.35 1.55S11.3 13.1 10 13.1c-.9 0-1.7-.4-2.1-1" />
                    <path d="M10 6v8" />
                  </svg>
                }
                @case ('neto') {
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="2" y="5.5" width="16" height="9" rx="1.5" />
                    <circle cx="10" cy="10" r="2" />
                    <path d="M5 10h.01M15 10h.01" />
                  </svg>
                }
                @case ('iva') {
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M14.5 5.5l-9 9" />
                    <circle cx="6.25" cy="6.25" r="1.75" />
                    <circle cx="13.75" cy="13.75" r="1.75" />
                  </svg>
                }
              }
            </span>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{{ card.label }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ card.value }}</p>
            </div>
          </div>
        </div>
      }
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div class="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Ventas últimos 30 días</h3>
        @if (chart) {
          <apx-chart [series]="chart.series!" [chart]="chart.chart!" [xaxis]="chart.xaxis!"
            [stroke]="chart.stroke!" [dataLabels]="chart.dataLabels!" [colors]="chart.colors!" [tooltip]="chart.tooltip!" />
        }
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
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

    <div class="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Últimas ventas</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 text-left dark:border-gray-800">
              <th class="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">N°</th>
              <th class="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Fecha</th>
              <th class="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Ítems</th>
              <th class="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Pago</th>
              <th class="py-3 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total</th>
              <th class="py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Boleta</th>
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
  cards: { label: string; value: string; icon: string }[] = [];
  chart?: Partial<ApexOptions>;

  constructor(public api: ApiService) {}

  clp(n: number) {
    return '$' + Math.round(n).toLocaleString('es-CL');
  }

  ngOnInit() {
    this.api.today().subscribe((t) => {
      this.today = t;
      this.cards = [
        { label: 'Ventas de hoy', value: String(t.totals.ventas), icon: 'ventas' },
        { label: 'Total de hoy', value: this.clp(t.totals.total), icon: 'total' },
        { label: 'Neto de hoy', value: this.clp(t.totals.neto), icon: 'neto' },
        { label: 'IVA de hoy', value: this.clp(t.totals.iva), icon: 'iva' },
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
