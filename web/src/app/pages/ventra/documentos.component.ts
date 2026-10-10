import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_URL, ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';

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
  imports: [CommonModule, FormsModule, PageHeaderComponent],
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
          <input [(ngModel)]="form.amount" type="number" placeholder="Monto total CLP (entero)" inputmode="numeric" min="0" step="1" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
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

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      @for (d of docs; track d.id) {
        <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <a [href]="api.fileUrl(d.imageUrl)" target="_blank" class="block">
            <img [src]="api.fileUrl(d.imageUrl)" [alt]="d.folio ?? d.type"
              class="h-44 w-full object-cover object-top transition hover:opacity-90" loading="lazy" />
          </a>
          <div class="p-4">
            <div class="mb-1 flex items-center justify-between">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                [class]="d.type === 'GUIA' ? 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'">
                {{ d.type === 'GUIA' ? 'Guía' : 'Factura' }} {{ d.folio ? '#' + d.folio : '' }}
              </span>
              @if (auth.isAdmin) {
                <button (click)="remove(d)" class="text-xs text-error-500 hover:underline">Eliminar</button>
              }
            </div>
            <p class="truncate font-medium text-gray-800 dark:text-white/90">{{ d.supplier ?? 'Sin proveedor' }}</p>
            <p class="text-sm text-gray-500">
              {{ (d.docDate ?? d.createdAt) | date: 'dd/MM/yyyy' }}
              @if (d.amount) { · <span class="font-semibold">{{ clp(d.amount) }}</span> }
            </p>
            @if (d.note) { <p class="mt-1 truncate text-xs text-gray-400">{{ d.note }}</p> }
          </div>
        </div>
      } @empty {
        <div class="col-span-full py-10 text-center">
          <svg class="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <p class="mt-2 text-sm text-gray-400">Sin documentos registrados — saca la primera foto</p>
        </div>
      }
    </div>
  `,
})
export class VentraDocumentosComponent implements OnInit {
  docs: PurchaseDoc[] = [];
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

  remove(d: PurchaseDoc) {
    if (!confirm(`¿Eliminar ${d.type === 'GUIA' ? 'la guía' : 'la factura'} ${d.folio ?? ''}?`)) return;
    this.http.delete(`${API_URL}/purchase-docs/${d.id}`).subscribe(() => this.load());
  }
}
