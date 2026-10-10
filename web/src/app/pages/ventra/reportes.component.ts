import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { ApiService, Summary } from '../../core/api.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';

@Component({
  selector: 'app-ventra-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Reportes" subtitle="Resúmenes de venta por período y exportación">
      <a [href]="api.exportUrl('xlsx', from, to)"
        class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10 3.5v9M6.5 9.5l3.5 3.5 3.5-3.5M4 16.5h12" />
        </svg>
        Excel
      </a>
      <a [href]="api.exportUrl('pdf', from, to)"
        class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10 3.5v9M6.5 9.5l3.5 3.5 3.5-3.5M4 16.5h12" />
        </svg>
        PDF
      </a>
    </app-page-header>

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label class="mb-1 block text-sm text-gray-500">Desde</label>
        <input type="date" [(ngModel)]="from" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
      </div>
      <div>
        <label class="mb-1 block text-sm text-gray-500">Hasta</label>
        <input type="date" [(ngModel)]="to" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
      </div>
      <select [(ngModel)]="groupBy" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
        <option value="day">Por día</option>
        <option value="week">Por semana</option>
        <option value="month">Por mes</option>
      </select>
      <button (click)="load()"
        class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">
        Consultar
      </button>
    </div>

    @if (summary) {
      <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15">
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5.5 2.5h9v15l-2.25-1.5L10 17.5l-2.25-1.5-2.25 1.5v-15z" />
                <path d="M8 7h4M8 10.5h4" />
              </svg>
            </span>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Ventas</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ summary.totals.ventas }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15">
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="5.5" width="16" height="9" rx="1.5" />
                <circle cx="10" cy="10" r="2" />
                <path d="M5 10h.01M15 10h.01" />
              </svg>
            </span>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Neto</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ clp(summary.totals.neto) }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15">
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14.5 5.5l-9 9" />
                <circle cx="6.25" cy="6.25" r="1.75" />
                <circle cx="13.75" cy="13.75" r="1.75" />
              </svg>
            </span>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">IVA</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ clp(summary.totals.iva) }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15">
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="10" cy="10" r="7.25" />
                <path d="M12.1 7.9c-.4-.6-1.2-1-2.1-1-1.2 0-2.1.65-2.1 1.55S8.8 9.8 10 10s2.35.6 2.35 1.55S11.3 13.1 10 13.1c-.9 0-1.7-.4-2.1-1" />
                <path d="M10 6v8" />
              </svg>
            </span>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ clp(summary.totals.total) }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        @if (chart) {
          <apx-chart [series]="chart.series!" [chart]="chart.chart!" [xaxis]="chart.xaxis!"
            [dataLabels]="chart.dataLabels!" [colors]="chart.colors!" [tooltip]="chart.tooltip!" [plotOptions]="chart.plotOptions!" />
        }
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Top productos del período</h3>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 text-left dark:border-gray-800">
              <th class="py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Producto</th>
              <th class="py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Unidades</th>
              <th class="py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (t of summary.topProducts; track t.name) {
              <tr class="border-b border-gray-50 dark:border-gray-800/50">
                <td class="py-3 text-gray-700 dark:text-gray-300">{{ t.name }}</td>
                <td class="py-3 text-right text-gray-600 dark:text-gray-400">{{ t.unidades }}</td>
                <td class="py-3 text-right font-medium text-gray-800 dark:text-white/90">{{ clp(t.total) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class VentraReportesComponent implements OnInit {
  from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  to = new Date().toISOString().slice(0, 10);
  groupBy: 'day' | 'week' | 'month' = 'day';
  summary?: Summary;
  chart?: Partial<ApexOptions>;

  constructor(public api: ApiService) {}

  clp(n: number) {
    return '$' + Math.round(n).toLocaleString('es-CL');
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.summary(this.from, this.to, this.groupBy).subscribe((s) => {
      this.summary = s;
      const fmt: Intl.DateTimeFormatOptions =
        this.groupBy === 'month' ? { month: 'short', year: '2-digit' } : { day: '2-digit', month: '2-digit' };
      this.chart = {
        series: [{ name: 'Total', data: s.series.map((r) => Math.round(r.total)) }],
        chart: { type: 'bar', height: 320, toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { borderRadius: 5, columnWidth: '45%' } },
        xaxis: { categories: s.series.map((r) => new Date(r.bucket).toLocaleDateString('es-CL', fmt)) },
        dataLabels: { enabled: false },
        colors: ['#465fff'],
        tooltip: { y: { formatter: (v: number) => this.clp(v) } },
      };
    });
  }
}
