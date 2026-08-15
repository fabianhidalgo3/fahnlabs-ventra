import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { ApiService, Summary } from '../../core/api.service';

@Component({
  selector: 'app-ventra-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
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
      <select [(ngModel)]="groupBy" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
        <option value="day">Por día</option>
        <option value="week">Por semana</option>
        <option value="month">Por mes</option>
      </select>
      <button (click)="load()" class="h-11 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white">Consultar</button>
      <a [href]="api.exportUrl('xlsx', from, to)" class="h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium leading-[2.75rem] text-gray-700 dark:border-gray-700 dark:text-gray-300">⬇ Excel</a>
      <a [href]="api.exportUrl('pdf', from, to)" class="h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium leading-[2.75rem] text-gray-700 dark:border-gray-700 dark:text-gray-300">⬇ PDF</a>
    </div>

    @if (summary) {
      <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <span class="text-sm text-gray-500">Ventas</span>
          <h4 class="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">{{ summary.totals.ventas }}</h4>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <span class="text-sm text-gray-500">Neto</span>
          <h4 class="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">{{ clp(summary.totals.neto) }}</h4>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <span class="text-sm text-gray-500">IVA</span>
          <h4 class="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">{{ clp(summary.totals.iva) }}</h4>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <span class="text-sm text-gray-500">Total</span>
          <h4 class="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">{{ clp(summary.totals.total) }}</h4>
        </div>
      </div>

      <div class="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        @if (chart) {
          <apx-chart [series]="chart.series!" [chart]="chart.chart!" [xaxis]="chart.xaxis!"
            [dataLabels]="chart.dataLabels!" [colors]="chart.colors!" [tooltip]="chart.tooltip!" [plotOptions]="chart.plotOptions!" />
        }
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Top productos del período</h3>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th class="py-3">Producto</th><th class="py-3 text-right">Unidades</th><th class="py-3 text-right">Total</th>
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
