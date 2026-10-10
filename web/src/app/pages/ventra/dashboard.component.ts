import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { ApiService, Summary } from '../../core/api.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';
import { apexBase, CHART_PALETTE, clpFormatter } from '../../core/charts';
import { ThemeService } from '../../core/theme.service';

const PAY_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  TRANSFERENCIA: 'Transferencia',
};

function payLabel(p: string): string {
  if (!p) return p;
  return PAY_LABELS[p.toUpperCase()] ?? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

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
        @if (mainChart) {
          <apx-chart
            [series]="mainChart.series!" [chart]="mainChart.chart!" [xaxis]="mainChart.xaxis!"
            [yaxis]="mainChart.yaxis!" [stroke]="mainChart.stroke!" [fill]="mainChart.fill!"
            [markers]="mainChart.markers!" [grid]="mainChart.grid!" [dataLabels]="mainChart.dataLabels!"
            [colors]="mainChart.colors!" [tooltip]="mainChart.tooltip!" />
        }
      </div>

      <div class="space-y-6">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Medios de pago (30 días)</h3>
          @if (payChart) {
            <apx-chart
              [series]="payChart.series!" [chart]="payChart.chart!" [labels]="payChart.labels!"
              [colors]="payChart.colors!" [legend]="payChart.legend!" [plotOptions]="payChart.plotOptions!"
              [stroke]="payChart.stroke!" [dataLabels]="payChart.dataLabels!" [tooltip]="payChart.tooltip!" />
          } @else {
            <p class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Sin ventas en el período</p>
          }
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Top productos (30 días)</h3>
          @if (topChart) {
            <apx-chart
              [series]="topChart.series!" [chart]="topChart.chart!" [xaxis]="topChart.xaxis!"
              [yaxis]="topChart.yaxis!" [plotOptions]="topChart.plotOptions!" [grid]="topChart.grid!"
              [legend]="topChart.legend!" [dataLabels]="topChart.dataLabels!" [colors]="topChart.colors!"
              [tooltip]="topChart.tooltip!" />
          } @else {
            <p class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Sin ventas en el período</p>
          }
        </div>
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
  mainChart?: Partial<ApexOptions>;
  payChart?: Partial<ApexOptions>;
  topChart?: Partial<ApexOptions>;

  constructor(
    public api: ApiService,
    private theme: ThemeService,
  ) {
    // Re-render de los gráficos al cambiar entre claro/oscuro.
    effect(() => {
      this.theme.isDark();
      this.rebuildCharts();
    });
  }

  clp(n: number) {
    return clpFormatter(n);
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
      this.rebuildCharts();
    });
  }

  private rebuildCharts() {
    const m = this.month;
    if (!m) return;
    const dark = this.theme.isDark();
    this.mainChart = this.buildMainChart(m, dark);
    this.payChart = m.byPayment?.length ? this.buildPayChart(m.byPayment, dark) : undefined;
    this.topChart = m.topProducts?.length ? this.buildTopChart(m.topProducts, dark) : undefined;
  }

  private buildMainChart(m: Summary, dark: boolean): Partial<ApexOptions> {
    const base = apexBase(dark);
    return {
      series: [{ name: 'Total', data: m.series.map((s) => Math.round(s.total)) }],
      chart: { ...base.chart, type: 'area', height: 310 },
      colors: [CHART_PALETTE[0]],
      stroke: { curve: 'smooth', width: 2.5 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] },
      },
      markers: { size: 0, strokeWidth: 2, hover: { size: 5 } },
      dataLabels: { enabled: false },
      grid: base.grid,
      xaxis: {
        categories: m.series.map((s) =>
          new Date(s.bucket).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }),
        ),
        axisBorder: { show: false },
        axisTicks: { show: false },
        tickAmount: 10,
        labels: { rotate: 0, hideOverlappingLabels: true, style: { fontSize: '12px' } },
        tooltip: { enabled: false },
      },
      yaxis: { labels: { formatter: clpFormatter, style: { fontSize: '12px' } } },
      tooltip: { ...base.tooltip, y: { formatter: clpFormatter } },
    };
  }

  private buildPayChart(by: NonNullable<Summary['byPayment']>, dark: boolean): Partial<ApexOptions> {
    const base = apexBase(dark);
    return {
      series: by.map((p) => Math.round(p.total)),
      labels: by.map((p) => payLabel(p.payment)),
      chart: { ...base.chart, type: 'donut', height: 290 },
      colors: CHART_PALETTE,
      stroke: { width: 0 },
      dataLabels: { enabled: false },
      legend: { ...base.legend },
      tooltip: { ...base.tooltip, y: { formatter: clpFormatter } },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: { show: true, fontSize: '13px', offsetY: 18, color: dark ? '#A1A1AA' : '#71717A' },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 700,
                offsetY: -16,
                color: dark ? '#FFFFFF' : '#18181B',
                formatter: (v: string) => clpFormatter(Number(v)),
              },
              total: {
                show: true,
                label: 'Total',
                fontSize: '13px',
                color: dark ? '#A1A1AA' : '#71717A',
                formatter: (w: any) =>
                  clpFormatter(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)),
              },
            },
          },
        },
      },
    };
  }

  private buildTopChart(top: Summary['topProducts'], dark: boolean): Partial<ApexOptions> {
    const base = apexBase(dark);
    const names = top.map((t) => t.name);
    return {
      series: [{ name: 'Total', data: top.map((t) => Math.round(t.total)) }],
      chart: { ...base.chart, type: 'bar', height: top.length * 42 + 40 },
      colors: CHART_PALETTE,
      plotOptions: {
        bar: { horizontal: true, borderRadius: 6, barHeight: '55%', distributed: true },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: { ...base.grid, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
      xaxis: {
        categories: names.map((n) => (n.length > 18 ? n.slice(0, 17) + '…' : n)),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { formatter: (v: string) => clpFormatter(Number(v)), style: { fontSize: '11px' } },
      },
      yaxis: { labels: { style: { fontSize: '12px' } } },
      tooltip: {
        ...base.tooltip,
        x: { formatter: (_v: number, opts?: any) => names[opts?.dataPointIndex] ?? String(_v) },
        y: { formatter: clpFormatter },
      },
    };
  }
}
