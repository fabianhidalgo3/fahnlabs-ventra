import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_URL, ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <button (click)="showForm = !showForm" class="h-11 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600">
        📷 Registrar documento
      </button>
      <select [(ngModel)]="filterType" (change)="load()" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
        <option value="">Guías y facturas</option>
        <option value="GUIA">Solo guías</option>
        <option value="FACTURA">Solo facturas</option>
      </select>
      <input [(ngModel)]="search" (input)="load()" placeholder="Buscar proveedor o folio…"
        class="h-11 w-64 rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:text-white/90" />
      <span class="text-sm text-gray-400">{{ docs.length }} documentos</span>
    </div>

    @if (showForm) {
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">Nuevo documento (la foto es el respaldo)</h4>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select [(ngModel)]="form.type" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
            <option value="GUIA">Guía de despacho</option>
            <option value="FACTURA">Factura</option>
          </select>
          <input [(ngModel)]="form.supplier" placeholder="Proveedor" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
          <input [(ngModel)]="form.folio" placeholder="Folio / N° documento" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
          <input [(ngModel)]="form.docDate" type="date" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
          <input [(ngModel)]="form.amount" type="number" placeholder="Monto total $" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
          <input [(ngModel)]="form.note" placeholder="Nota (opcional)" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
          <div class="md:col-span-3">
            <label class="mb-1 block text-sm text-gray-500">Foto del documento * (desde el teléfono se abre la cámara)</label>
            <input type="file" accept="image/*" capture="environment" (change)="file = $any($event.target).files[0]"
              class="block text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2.5 file:text-white" />
          </div>
        </div>
        @if (error) { <p class="mt-3 text-sm text-error-600">{{ error }}</p> }
        <div class="mt-4 flex gap-2">
          <button (click)="save()" [disabled]="saving" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm text-white disabled:opacity-40">
            {{ saving ? 'Subiendo…' : 'Guardar documento' }}
          </button>
          <button (click)="showForm = false" class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:text-gray-300">Cancelar</button>
        </div>
      </div>
    }

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      @for (d of docs; track d.id) {
        <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
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
        <p class="col-span-full py-10 text-center text-gray-400">Sin documentos registrados — saca la primera foto 📷</p>
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
