import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ApiService, BatchAlert, whatsappUrl } from '../../core/api.service';
import { GRID_TEXT, ventraGridTheme } from '../../core/grid';
import { ThemeService } from '../../core/theme.service';
import { ViewportService } from '../../core/viewport.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';

@Component({
  selector: 'app-ventra-vencimientos',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, AgGridAngular],
  template: `
    <app-page-header title="Vencimientos" subtitle="Lotes próximos a vencer por nivel de urgencia">
      @if (alerts.length) {
        <a [href]="waAlerts()" target="_blank"
          class="inline-flex h-10 items-center gap-2 rounded-lg bg-success-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-success-600">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Enviar por WhatsApp
        </a>
      }
    </app-page-header>

    <div class="mb-4 flex items-center gap-3">
      <label class="text-sm text-gray-500">Mostrar lotes que vencen en</label>
      <select [(ngModel)]="days" (change)="load()" class="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
        <option [value]="7">7 días</option>
        <option [value]="15">15 días</option>
        <option [value]="30">30 días</option>
        <option [value]="60">60 días</option>
        <option [value]="90">90 días</option>
      </select>
      <span class="text-sm text-gray-400">{{ alerts.length }} lotes</span>
    </div>

    @if (vp.esMovil()) {
      <div class="space-y-3">
        @for (a of alerts; track $index) {
          <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p (click)="verProducto(a)" class="cursor-pointer font-medium text-gray-800 hover:text-brand-500 hover:underline dark:text-white/90">{{ a.product.name }}</p>
                <p class="text-xs text-gray-400">Lote {{ a.lotCode }} · {{ a.quantity }} un.</p>
              </div>
              <span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium" [class]="badge(a.level)">{{ label(a) }}</span>
            </div>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Vence: {{ fmtDate(a.expiresAt) }}</p>
          </div>
        } @empty {
          <p class="text-sm text-gray-400">Sin lotes próximos a vencer.</p>
        }
      </div>
    } @else {
      <ag-grid-angular
        (cellClicked)="onCell($event)" 
        class="w-full"
        [theme]="theme()"
        [rowData]="alerts"
        [columnDefs]="cols"
        [defaultColDef]="defaultColDef"
        domLayout="autoHeight"
        [localeText]="GRID_TEXT"
        [pagination]="true"
        [paginationPageSize]="20"
        [paginationPageSizeSelector]="false"
      />
    }
  `,
})
export class VentraVencimientosComponent implements OnInit {
  alerts: BatchAlert[] = [];
  days = 30;

  private themeSvc = inject(ThemeService);
  public vp = inject(ViewportService);
  theme = computed(() => ventraGridTheme(this.themeSvc.isDark()));
  readonly GRID_TEXT = GRID_TEXT;

  defaultColDef: ColDef = { sortable: true, resizable: true, flex: 1, minWidth: 110 };

  cols: ColDef<BatchAlert>[] = [
    {
      headerName: 'Producto',
      colId: 'producto',
      minWidth: 220,
      autoHeight: true,
      valueGetter: (p) => p.data?.product?.name ?? '',
      cellRenderer: (p: ICellRendererParams<BatchAlert>) => {
        const a = p.data;
        if (!a) return '';
        return `<div class="py-1 leading-snug">
            <p data-action="ver-producto" class="cursor-pointer font-medium text-gray-800 hover:text-brand-500 hover:underline dark:text-white/90">${this.esc(a.product.name)}</p>
            <p class="text-xs text-gray-400">${this.esc(a.product.sku)} · ${this.esc(a.product.barcode)}</p>
          </div>`;
      },
    },
    { headerName: 'Lote', field: 'lotCode' },
    { headerName: 'Cantidad', field: 'quantity', type: 'rightAligned' },
    {
      headerName: 'Vence',
      field: 'expiresAt',
      valueFormatter: (p) => this.fmtDate(p.value),
    },
    {
      headerName: 'Estado',
      colId: 'estado',
      valueGetter: (p) => (p.data ? this.label(p.data) : ''),
      cellRenderer: (p: ICellRendererParams<BatchAlert>) => {
        const a = p.data;
        if (!a) return '';
        return `<span class="rounded-full px-2.5 py-0.5 text-xs font-medium ${this.badge(a.level)}">${this.esc(this.label(a))}</span>`;
      },
    },
  ];

  constructor(
    private router: Router,private api: ApiService) {}

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

  onCell(e: { event?: Event | null; data?: BatchAlert }) {
    const accion = (e.event?.target as HTMLElement)?.closest('[data-action]')?.getAttribute('data-action');
    if (accion === 'ver-producto' && e.data) this.verProducto(e.data);
  }

  verProducto(a: BatchAlert) {
    this.router.navigate(['/productos', a.product.id]);
  }

  label(a: BatchAlert) {
    if (a.level === 'vencido') return 'VENCIDO';
    return `${a.daysToExpiry} días (${a.level})`;
  }

  waAlerts(): string {
    const lines = this.alerts
      .slice(0, 20)
      .map((a) => `• ${a.product.name} (lote ${a.lotCode}, ${a.quantity} un.): ${a.daysToExpiry < 0 ? 'VENCIDO' : 'vence en ' + a.daysToExpiry + ' días'}`);
    return whatsappUrl(`⚠️ Vencimientos próximos — Ventra\n\n${lines.join('\n')}`);
  }

  fmtDate(v?: string | null): string {
    if (!v) return '';
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private esc(s: unknown): string {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
  }
}
