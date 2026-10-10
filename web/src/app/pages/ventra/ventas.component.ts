import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import type { CellClickedEvent, ColDef, ICellRendererParams, RowClassRules } from 'ag-grid-community';
import { ApiService, Sale } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ViewportService } from '../../core/viewport.service';
import { ventraGridTheme, GRID_TEXT } from '../../core/grid';
import { ThemeService } from '../../core/theme.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';

/** Escapa HTML para los cellRenderer basados en strings. */
const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const pad = (n: number) => String(n).padStart(2, '0');

@Component({
  selector: 'app-ventra-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, AgGridAngular],
  template: `
    <app-page-header title="Ventas" subtitle="Historial de ventas, boletas y anulaciones" />

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label class="mb-1 block text-sm text-gray-500">Desde</label>
        <input type="date" [(ngModel)]="from" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
      </div>
      <div>
        <label class="mb-1 block text-sm text-gray-500">Hasta</label>
        <input type="date" [(ngModel)]="to" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
      </div>
      <button (click)="load()" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">Consultar</button>
      <span class="text-sm text-gray-400">{{ sales.length }} ventas</span>
    </div>

    @if (vp.esMovil()) {
      <!-- Vista móvil: cards -->
      <div class="space-y-3">
        @for (s of sales; track s.id) {
          <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            [class.opacity-50]="!!s.voidedAt">
            <!-- Fila 1: número, fecha, estado -->
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-bold text-gray-800 dark:text-white/90">N° {{ s.number }}</p>
              <p class="text-xs text-gray-400">{{ s.createdAt | date: 'dd/MM/yy HH:mm' }}</p>
              <span class="ml-auto rounded-full px-2.5 py-1 text-xs font-medium"
                [class]="s.voidedAt
                  ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400'
                  : 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'">
                {{ s.voidedAt ? 'ANULADA' : 'Emitida' }}
              </span>
            </div>
            <!-- Fila 2: ítems, pago, descuento, total -->
            <div class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <span [title]="itemNames(s)">{{ s.items.length }} ítems</span>
              <span>·</span>
              <span>{{ s.payment }}</span>
              @if (s.discount > 0) { <span>-{{ clp(s.discount) }}</span> }
              <span class="ml-auto font-bold text-gray-800 dark:text-white/90">{{ clp(s.total) }}</span>
            </div>
            <!-- Fila 3: boleta y anulación -->
            @if (s.boleta?.pdfPath || (auth.isAdmin && !s.voidedAt)) {
              <div class="mt-3 flex items-center gap-2">
                @if (s.boleta?.pdfPath) {
                  <button (click)="openBoleta(s)" class="text-sm text-brand-500 hover:underline">Folio {{ s.boleta?.folio }}</button>
                }
                @if (auth.isAdmin && !s.voidedAt) {
                  <button (click)="this.void(s)"
                    class="ml-auto rounded border border-error-300 px-2.5 py-1.5 text-xs text-error-600">Anular</button>
                }
              </div>
            }
          </div>
        }
      </div>
    } @else {
      <ag-grid-angular class="w-full" [theme]="theme()" [rowData]="sales" [columnDefs]="cols"
        [defaultColDef]="defaultCol" domLayout="autoHeight" [localeText]="GRID_TEXT"
        [rowClassRules]="rowRules" [pagination]="true" [paginationPageSize]="20"
        [paginationPageSizeSelector]="[10, 20, 50]" (cellClicked)="onCell($event)" />
    }
  `,
})
export class VentraVentasComponent implements OnInit {
  sales: Sale[] = [];
  from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  to = new Date().toISOString().slice(0, 10);

  private themeSvc = inject(ThemeService);
  theme = computed(() => ventraGridTheme(this.themeSvc.isDark()));
  GRID_TEXT = GRID_TEXT;

  defaultCol: ColDef<Sale> = { sortable: true, resizable: true, filter: false, flex: 1, minWidth: 110 };
  rowRules: RowClassRules<Sale> = { 'opacity-50': (p) => !!p.data?.voidedAt };
  cols: ColDef<Sale>[];

  constructor(
    public api: ApiService,
    public auth: AuthService,
    public vp: ViewportService,
  ) {
    this.cols = this.buildCols();
  }

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  itemNames(s: Sale) {
    return s.items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ');
  }

  private buildCols(): ColDef<Sale>[] {
    const cols: ColDef<Sale>[] = [
      {
        headerName: 'N°',
        field: 'number',
        minWidth: 90,
        maxWidth: 100,
        cellClass: 'font-medium text-gray-800 dark:text-white/90',
      },
      {
        headerName: 'Fecha',
        field: 'createdAt',
        minWidth: 130,
        valueFormatter: (p) => {
          const d = new Date(p.value);
          return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        },
      },
      {
        headerName: 'Ítems',
        minWidth: 90,
        valueGetter: (p) => p.data?.items.length ?? 0,
        cellRenderer: (p: ICellRendererParams<Sale>) =>
          `<span title="${esc(this.itemNames(p.data!))}">${p.data!.items.length}</span>`,
      },
      { headerName: 'Pago', field: 'payment' },
      {
        headerName: 'Desc.',
        type: 'rightAligned',
        valueGetter: (p) => Number(p.data?.discount ?? 0),
        valueFormatter: (p) => (p.value > 0 ? '-' + this.clp(p.value) : '—'),
        cellClass: 'text-gray-500',
      },
      {
        headerName: 'Total',
        type: 'rightAligned',
        valueGetter: (p) => Number(p.data?.total),
        valueFormatter: (p) => this.clp(p.value),
        cellClass: 'font-semibold text-gray-800 dark:text-white/90',
      },
      {
        headerName: 'Boleta',
        sortable: false,
        cellRenderer: (p: ICellRendererParams<Sale>) => {
          const b = p.data?.boleta;
          if (!b?.pdfPath) return '';
          return `<button data-action="boleta" class="text-brand-500 hover:underline">Folio ${esc(b.folio)}</button>`;
        },
      },
      {
        headerName: 'Estado',
        valueGetter: (p) => (p.data?.voidedAt ? 'ANULADA' : 'Emitida'),
        cellRenderer: (p: ICellRendererParams<Sale>) => {
          const voided = !!p.data?.voidedAt;
          const cls = voided
            ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400'
            : 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400';
          return `<span class="rounded-full px-2.5 py-1 text-xs font-medium ${cls}">${voided ? 'ANULADA' : 'Emitida'}</span>`;
        },
      },
    ];
    if (this.auth.isAdmin) {
      cols.push({
        headerName: 'Acciones',
        sortable: false,
        cellRenderer: (p: ICellRendererParams<Sale>) =>
          p.data?.voidedAt
            ? ''
            : `<button data-action="anular" class="rounded border border-error-300 px-2 py-1 text-xs text-error-600">Anular</button>`,
      });
    }
    return cols;
  }

  onCell(e: CellClickedEvent<Sale>) {
    const action = (e.event?.target as HTMLElement)?.closest('[data-action]')?.getAttribute('data-action');
    const s = e.data;
    if (!action || !s) return;
    if (action === 'boleta') this.openBoleta(s);
    if (action === 'anular') this.void(s);
  }

  openBoleta(s: Sale) {
    if (s.boleta?.pdfPath) window.open(this.api.fileUrl(s.boleta.pdfPath), '_blank');
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
