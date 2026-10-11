import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClpMonedaDirective } from '../../shared/directives/clp-moneda.directive';
import { HttpClient } from '@angular/common/http';
import { API_URL, ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';
import { CodigoModalComponent } from '../../shared/components/ventra/codigo-modal.component';
import { AgGridAngular } from 'ag-grid-angular';
import type { CellClickedEvent, ColDef, ICellRendererParams } from 'ag-grid-community';
import { ventraGridTheme, GRID_TEXT } from '../../core/grid';
import { ThemeService } from '../../core/theme.service';
import { ViewportService } from '../../core/viewport.service';
import { computed, inject } from '@angular/core';

const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface PurchaseDoc {
  id: string;
  type: 'GUIA' | 'FACTURA';
  supplier?: string;
  folio?: string;
  docDate?: string;
  amount?: number;
  note?: string;
  imageUrl: string;
  createdAt: string;
}

@Component({
  selector: 'app-ventra-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule,
    ClpMonedaDirective, PageHeaderComponent, CodigoModalComponent, AgGridAngular],
  template: `
    <app-page-header title="Guías y facturas" subtitle="Respaldo fotográfico de documentos de compra">
      <button (click)="showForm = !showForm" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
        </svg>
        Registrar documento
      </button>
    </app-page-header>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <select [(ngModel)]="filterType" (change)="load()" class="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
        <option value="">Guías y facturas</option>
        <option value="GUIA">Solo guías</option>
        <option value="FACTURA">Solo facturas</option>
      </select>
      <input [(ngModel)]="search" (input)="load()" placeholder="Buscar proveedor o folio…"
        class="h-10 w-64 rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
      <span class="text-sm text-gray-400">{{ docs.length }} documentos</span>
    </div>

    @if (showForm) {
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">Nuevo documento (la foto es el respaldo)</h4>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select [(ngModel)]="form.type" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
            <option value="GUIA">Guía de despacho</option>
            <option value="FACTURA">Factura</option>
          </select>
          <input [(ngModel)]="form.supplier" placeholder="Proveedor" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          <input [(ngModel)]="form.folio" placeholder="Folio / N° documento" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          <input [(ngModel)]="form.docDate" type="date" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          <input clpMoneda [(ngModel)]="form.amount" type="text" placeholder="Monto total CLP (entero)" inputmode="numeric" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          <input [(ngModel)]="form.note" placeholder="Nota (opcional)" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          <div class="md:col-span-3">
            <label class="mb-1 block text-sm text-gray-500">Foto del documento * (desde el teléfono se abre la cámara)</label>
            <input type="file" accept="image/*" capture="environment" (change)="file = $any($event.target).files[0]"
              class="block text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2.5 file:text-white" />
          </div>
        </div>
        @if (error) { <p class="mt-3 text-sm text-error-600">{{ error }}</p> }
        <div class="mt-4 flex gap-2">
          <button (click)="save()" [disabled]="saving" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">
            {{ saving ? 'Subiendo…' : 'Guardar documento' }}
          </button>
          <button (click)="showForm = false" class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
        </div>
      </div>
    }

    @if (vp.esMovil()) {
      <div class="space-y-3">
        @for (d of docs; track d.id) {
          <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div class="flex items-start gap-3">
              <img [src]="api.fileUrl(d.imageUrl)" [alt]="d.folio ?? d.type"
                class="h-16 w-16 shrink-0 cursor-pointer rounded-lg object-cover object-top" loading="lazy" (click)="ver(d)" />
              <div class="min-w-0 flex-1">
                <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" [class]="badgeTipo(d)">
                  {{ d.type === 'GUIA' ? 'Guía' : 'Factura' }} {{ d.folio ? '#' + d.folio : '' }}
                </span>
                <p class="mt-1 truncate font-medium text-gray-800 dark:text-white/90">{{ d.supplier ?? 'Sin proveedor' }}</p>
                <p class="text-sm text-gray-500">{{ (d.docDate ?? d.createdAt) | date: 'dd/MM/yyyy' }}
                  @if (d.amount) { · <span class="font-semibold">{{ clp(d.amount) }}</span> }
                </p>
              </div>
            </div>
            <div class="mt-3 flex gap-2">
              <button (click)="ver(d)" class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:text-gray-300">Ver</button>
              <button (click)="descargar(d)" class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:text-gray-300">Descargar</button>
              @if (auth.isAdmin) {
                <button (click)="remove(d)" class="rounded border border-error-300 px-2 py-1 text-xs text-error-600">Eliminar</button>
              }
            </div>
          </div>
        } @empty {
          <p class="py-10 text-center text-sm text-gray-400">Sin documentos registrados — saca la primera foto</p>
        }
      </div>
    } @else {
      <ag-grid-angular class="w-full" [theme]="theme()" [rowData]="docs" [columnDefs]="cols"
        [defaultColDef]="defaultCol" domLayout="autoHeight" [rowHeight]="64" [localeText]="GRID_TEXT"
        [pagination]="true" [paginationPageSize]="20" [paginationPageSizeSelector]="[10, 20, 50]"
        (cellClicked)="onCell($event)" />
    }

    @if (det.abierto && det.doc; as d) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" (click)="det.abierto = false"></div>
        <div class="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <button (click)="det.abierto = false" aria-label="Cerrar"
            class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">✕</button>
          <div class="mb-3 flex items-center gap-2 pr-8">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              {{ d.type === 'GUIA' ? 'Guía de despacho' : 'Factura' }}{{ d.folio ? ' #' + d.folio : '' }}
            </h3>
            <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" [class]="badgeTipo(d)">{{ d.type === 'GUIA' ? 'Guía' : 'Factura' }}</span>
            <span class="text-xs text-gray-400">registrada el {{ d.createdAt | date: 'dd/MM/yyyy HH:mm' }}</span>
          </div>

          <div class="grid min-h-0 flex-1 gap-5 overflow-y-auto md:grid-cols-2">
            <!-- Foto -->
            <a [href]="api.fileUrl(d.imageUrl)" target="_blank" class="block">
              <img [src]="api.fileUrl(d.imageUrl)" [alt]="d.folio ?? d.type"
                class="max-h-[60vh] w-full rounded-xl border border-gray-200 object-contain dark:border-gray-700" />
            </a>
            <!-- Datos -->
            <div class="space-y-3">
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</label>
                <select [(ngModel)]="detForm.type" [disabled]="!auth.isAdmin" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white/90">
                  <option value="GUIA">Guía de despacho</option>
                  <option value="FACTURA">Factura</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Proveedor</label>
                <input [(ngModel)]="detForm.supplier" [disabled]="!auth.isAdmin" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Folio</label>
                  <input [(ngModel)]="detForm.folio" [disabled]="!auth.isAdmin" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Fecha documento</label>
                  <input type="date" [(ngModel)]="detForm.docDate" [disabled]="!auth.isAdmin" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Monto total CLP</label>
                <input clpMoneda type="text" inputmode="numeric" [(ngModel)]="detForm.amount" [disabled]="!auth.isAdmin" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Nota</label>
                <input [(ngModel)]="detForm.note" [disabled]="!auth.isAdmin" maxlength="200" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
              </div>
              @if (detError) { <p class="text-sm text-error-600">{{ detError }}</p> }
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            @if (auth.isAdmin) {
              <button (click)="guardarDetalle()" [disabled]="detGuardando"
                class="inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
                {{ detGuardando ? 'Guardando…' : 'Guardar cambios' }}
              </button>
            }
            <button (click)="descargar(d)"
              class="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">Descargar</button>
            @if (auth.isAdmin) {
              <button (click)="det.abierto = false; remove(d)"
                class="inline-flex h-10 items-center rounded-lg border border-error-300 px-4 text-sm font-medium text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10">Eliminar</button>
            }
          </div>
        </div>
      </div>
    }

    <app-codigo-modal [abierto]="modal.abierto" [titulo]="modal.titulo" [subtitulo]="modal.subtitulo"
      [url]="modal.url" (cerrar)="modal.abierto = false" />
  `,
})
export class VentraDocumentosComponent implements OnInit {
  docs: PurchaseDoc[] = [];
  modal = { abierto: false, titulo: '', subtitulo: '', url: '' };
  det: { abierto: boolean; doc?: PurchaseDoc } = { abierto: false };
  detForm: { type: 'GUIA' | 'FACTURA'; supplier?: string; folio?: string; docDate?: string; amount?: number; note?: string } = { type: 'GUIA' };
  detGuardando = false;
  detError = '';
  vp = inject(ViewportService);
  private themeSvc = inject(ThemeService);
  theme = computed(() => ventraGridTheme(this.themeSvc.isDark()));
  GRID_TEXT = GRID_TEXT;
  defaultCol: ColDef = { sortable: true, resizable: true, flex: 1, minWidth: 110 };
  cols: ColDef<PurchaseDoc>[] = [
    {
      headerName: 'Documento',
      colId: 'doc',
      minWidth: 240,
      valueGetter: (p) => p.data?.folio ?? '',
      cellRenderer: (p: ICellRendererParams<PurchaseDoc>) => {
        const d = p.data!;
        const badge = d.type === 'GUIA'
          ? 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400'
          : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400';
        return `<div class="flex items-center gap-3 py-1">
          <img src="${esc(this.api.fileUrl(d.imageUrl))}" data-action="ver" loading="lazy"
            class="h-12 w-12 cursor-pointer rounded-lg object-cover object-top" />
          <span class="rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}">${d.type === 'GUIA' ? 'Guía' : 'Factura'}${d.folio ? ' #' + esc(d.folio) : ''}</span>
        </div>`;
      },
    },
    {
      headerName: 'Proveedor',
      field: 'supplier',
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<PurchaseDoc>) =>
        `<span class="font-medium text-gray-800 dark:text-white/90">${esc(p.data?.supplier ?? 'Sin proveedor')}</span>`,
    },
    {
      headerName: 'Fecha',
      colId: 'fecha',
      valueGetter: (p) => p.data?.docDate ?? p.data?.createdAt ?? '',
      valueFormatter: (p) => {
        const d = new Date(p.value as string);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CL');
      },
    },
    {
      headerName: 'Monto',
      colId: 'monto',
      type: 'rightAligned',
      valueGetter: (p) => (p.data?.amount != null ? Number(p.data.amount) : null),
      valueFormatter: (p) => (p.value != null ? this.clp(p.value as number) : '—'),
    },
    { headerName: 'Nota', field: 'note', minWidth: 140, valueFormatter: (p) => (p.value as string) ?? '' },
    {
      headerName: 'Acciones',
      colId: 'acciones',
      sortable: false,
      minWidth: 220,
      cellRenderer: (p: ICellRendererParams<PurchaseDoc>) => {
        const botones = [
          `<button data-action="ver" class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:text-gray-300">Ver</button>`,
          `<button data-action="descargar" class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:text-gray-300">Descargar</button>`,
        ];
        if (this.auth.isAdmin)
          botones.push(`<button data-action="eliminar" class="rounded border border-error-300 px-2 py-1 text-xs text-error-600">Eliminar</button>`);
        return `<div class="flex gap-2">${botones.join('')}</div>`;
      },
    },
  ];

  onCell(e: CellClickedEvent<PurchaseDoc>) {
    const accion = (e.event?.target as HTMLElement)?.closest('[data-action]')?.getAttribute('data-action');
    const d = e.data;
    if (!accion || !d) return;
    if (accion === 'ver') this.ver(d);
    else if (accion === 'descargar') this.descargar(d);
    else if (accion === 'eliminar') this.remove(d);
  }

  badgeTipo(d: PurchaseDoc) {
    return d.type === 'GUIA'
      ? 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400'
      : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400';
  }

  ver(d: PurchaseDoc) {
    this.det = { abierto: true, doc: d };
    this.detError = '';
    this.detForm = {
      type: d.type,
      supplier: d.supplier ?? '',
      folio: d.folio ?? '',
      docDate: d.docDate ? new Date(d.docDate).toISOString().slice(0, 10) : '',
      amount: d.amount != null ? Number(d.amount) : undefined,
      note: d.note ?? '',
    };
  }

  guardarDetalle() {
    if (!this.det.doc) return;
    this.detGuardando = true;
    this.detError = '';
    this.http
      .patch<PurchaseDoc>(`${API_URL}/purchase-docs/${this.det.doc.id}`, {
        type: this.detForm.type,
        supplier: this.detForm.supplier,
        folio: this.detForm.folio,
        docDate: this.detForm.docDate || null,
        amount: this.detForm.amount ?? null,
        note: this.detForm.note,
      })
      .subscribe({
        next: (d) => {
          this.detGuardando = false;
          this.det.doc = d;
          this.load();
        },
        error: (e) => {
          this.detGuardando = false;
          this.detError = e?.error?.message ?? 'Error al guardar';
        },
      });
  }

  descargar(d: PurchaseDoc) {
    const a = document.createElement('a');
    a.href = this.api.fileUrl(d.imageUrl);
    a.download = `${d.type === 'GUIA' ? 'guia' : 'factura'}${d.folio ? '-' + d.folio : ''}-${(d.supplier ?? 'documento').replace(/\s+/g, '_')}.webp`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  showForm = false;
  saving = false;
  error = '';
  filterType = '';
  search = '';
  file?: File;
  form: Partial<PurchaseDoc> = { type: 'GUIA' };

  constructor(
    private http: HttpClient,
    public api: ApiService,
    public auth: AuthService,
    private confirm: ConfirmService,
  ) {}

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  ngOnInit() {
    this.load();
  }

  load() {
    const params: Record<string, string> = {};
    if (this.filterType) params['type'] = this.filterType;
    if (this.search.trim()) params['search'] = this.search.trim();
    this.http.get<PurchaseDoc[]>(`${API_URL}/purchase-docs`, { params }).subscribe((d) => (this.docs = d));
  }

  save() {
    if (!this.file) {
      this.error = 'La foto del documento es obligatoria';
      return;
    }
    const amount = Number(this.form.amount);
    if (this.form.amount != null && String(this.form.amount) !== '' && (isNaN(amount) || amount < 0)) {
      this.error = 'El monto debe ser un número en pesos, mayor o igual a 0';
      return;
    }
    if (this.form.amount != null) this.form.amount = Math.round(amount);
    this.saving = true;
    this.error = '';
    const fd = new FormData();
    fd.append('file', this.file);
    fd.append('type', this.form.type ?? 'GUIA');
    if (this.form.supplier) fd.append('supplier', this.form.supplier);
    if (this.form.folio) fd.append('folio', this.form.folio);
    if (this.form.docDate) fd.append('docDate', this.form.docDate);
    if (this.form.amount) fd.append('amount', String(this.form.amount));
    if (this.form.note) fd.append('note', this.form.note);
    this.http.post(`${API_URL}/purchase-docs`, fd).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.file = undefined;
        this.form = { type: 'GUIA' };
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.error = e?.error?.message ?? 'Error al subir el documento';
      },
    });
  }

  async remove(d: PurchaseDoc) {
    if (
      !(await this.confirm.confirmar({
        titulo: `¿Eliminar ${d.type === 'GUIA' ? 'la guía' : 'la factura'}${d.folio ? ` ${d.folio}` : ''}?`,
        mensaje: 'El documento se eliminará de forma permanente.',
        accion: 'Eliminar',
        tono: 'peligro',
      }))
    )
      return;
    this.http.delete(`${API_URL}/purchase-docs/${d.id}`).subscribe(() => this.load());
  }
}
