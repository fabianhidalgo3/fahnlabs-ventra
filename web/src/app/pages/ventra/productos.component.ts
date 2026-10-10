import { Router } from '@angular/router';
import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import type { CellClickedEvent, ColDef, ICellRendererParams } from 'ag-grid-community';
import { ApiService, Product, Category } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ventraGridTheme, GRID_TEXT } from '../../core/grid';
import { ThemeService } from '../../core/theme.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';

/** Escapa HTML para los cellRenderer basados en strings. */
const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

@Component({
  selector: 'app-ventra-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, AgGridAngular],
  template: `
    <app-page-header title="Productos" subtitle="Inventario, precios, códigos y vencimientos">
      @if (auth.isAdmin) {
        <button (click)="showBulk = !showBulk" class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">Precios masivos</button>
        <button (click)="openForm()" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">+ Nuevo producto</button>
      }
    </app-page-header>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <input [(ngModel)]="search" (input)="load()" placeholder="Buscar por nombre, SKU o código…"
        class="h-10 w-72 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
      <span class="text-sm text-gray-400">{{ products.length }} productos</span>
    </div>

    @if (showBulk) {
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">Actualización masiva de precios</h4>
        <div class="flex flex-wrap items-end gap-4">
          <div>
            <label class="mb-1 block text-sm text-gray-500">Ajuste porcentual</label>
            <div class="flex gap-2">
              <input type="number" [(ngModel)]="bulkPercent" placeholder="%" class="h-11 w-24 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
              <select [(ngModel)]="bulkCategory" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                <option value="">Todas las categorías</option>
                @for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
              </select>
              <button (click)="applyBulk()" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">Aplicar</button>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-500">Importar archivo (CSV/XLSX: col 1 = SKU o código, col 2 = precio)</label>
            <input type="file" accept=".csv,.xlsx" (change)="importFile($event)"
              class="block text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2.5 file:text-white" />
          </div>
        </div>
        @if (bulkMsg) { <p class="mt-3 text-sm text-green-600">{{ bulkMsg }}</p> }
      </div>
    }

    @if (showForm) {
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">{{ editing ? 'Editar' : 'Nuevo' }} producto</h4>
        <div class="flex flex-col gap-5 md:flex-row">
          <!-- Imagen del producto en grande, con vista previa en vivo -->
          <div class="shrink-0">
            <img [src]="imagePreview" alt="Imagen del producto"
              class="h-48 w-48 rounded-2xl border border-gray-200 object-cover dark:border-gray-800"
              onerror="this.src='/images/product-placeholder.svg'" />
            <label class="mt-2 block">
              <span class="inline-flex h-10 w-48 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
                📷 {{ editing?.imageUrl || imageFile ? 'Cambiar foto' : 'Subir foto' }}
              </span>
              <input type="file" accept="image/*" hidden (change)="onImagePick($any($event.target).files[0])" />
            </label>
          </div>

          <div class="min-w-0 flex-1">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <input [(ngModel)]="form.name" placeholder="Nombre *" required
              class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
              [class]="errores['name'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            @if (errores['name']) { <p class="mt-1 text-xs text-error-500">{{ errores['name'] }}</p> }
          </div>
          <div>
            <input type="number" [(ngModel)]="form.price" placeholder="Precio CLP * (entero)" inputmode="numeric" min="1" step="1" required
              class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
              [class]="errores['price'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            @if (errores['price']) { <p class="mt-1 text-xs text-error-500">{{ errores['price'] }}</p> }
          </div>
          <div>
            <input type="number" [(ngModel)]="form.stock" placeholder="Stock (entero)" inputmode="numeric" min="0" step="1"
              class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
              [class]="errores['stock'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            @if (errores['stock']) { <p class="mt-1 text-xs text-error-500">{{ errores['stock'] }}</p> }
          </div>
          <div>
            <input [(ngModel)]="form.barcode" placeholder="Código de barras (vacío = autogenerar)" inputmode="numeric"
              class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
              [class]="errores['barcode'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            @if (errores['barcode']) { <p class="mt-1 text-xs text-error-500">{{ errores['barcode'] }}</p> }
          </div>
          <select [(ngModel)]="form.categoryId" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
            <option value="">Sin categoría</option>
            @for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
        </div>
        <div class="mt-4 flex gap-2">
          <button (click)="save()" [disabled]="!formValido" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">Guardar</button>
          <button (click)="showForm = false" class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
        </div>
          </div>
        </div>
      </div>
    }

    <ag-grid-angular class="w-full" [theme]="theme()" [rowData]="products" [columnDefs]="cols"
      [defaultColDef]="defaultCol" domLayout="autoHeight" [rowHeight]="56" [localeText]="GRID_TEXT"
      [pagination]="true" [paginationPageSize]="20" [paginationPageSizeSelector]="[10, 20, 50]"
      (cellClicked)="onCell($event)" />
  `,
})
export class VentraProductosComponent implements OnInit {
  products: Product[] = [];
  cats: Category[] = [];
  search = '';
  showForm = false;
  showBulk = false;
  editing?: Product;
  imageFile?: File;
  imagePreview = '/images/product-placeholder.svg';
  bulkPercent?: number;
  bulkCategory = '';
  bulkMsg = '';
  form: Partial<Product> = {};

  private themeSvc = inject(ThemeService);
  theme = computed(() => ventraGridTheme(this.themeSvc.isDark()));
  GRID_TEXT = GRID_TEXT;

  defaultCol: ColDef<Product> = { sortable: true, resizable: true, filter: false, flex: 1, minWidth: 110 };
  cols: ColDef<Product>[];

  constructor(
    public api: ApiService,
    public auth: AuthService,
    private router: Router,
  ) {
    this.cols = this.buildCols();
  }

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  badge(days: number) {
    if (days < 0) return 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400';
    if (days <= 7) return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400';
    if (days <= 15) return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400';
    if (days <= 30) return 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400';
    return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400';
  }

  private buildCols(): ColDef<Product>[] {
    const btn = 'rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:text-gray-300';
    const copyBtn = 'rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700';
    const admin = this.auth.isAdmin;
    return [
      {
        headerName: 'Producto',
        field: 'name',
        pinned: 'left',
        minWidth: 240,
        cellRenderer: (p: ICellRendererParams<Product>) => {
          const d = p.data!;
          const src = d.imageUrl ? this.api.fileUrl(d.imageUrl) : '/images/product-placeholder.svg';
          return `<div class="flex items-center gap-3">
            <img src="${esc(src)}" alt="${esc(d.name)}" loading="lazy" class="h-9 w-9 shrink-0 rounded-lg object-cover"
              onerror="this.onerror=null;this.src='/images/product-placeholder.svg'" />
            <div class="leading-tight">
              <p data-action="ver" class="cursor-pointer font-medium text-gray-800 hover:text-brand-500 hover:underline dark:text-white/90">${esc(d.name)}</p>
              <p class="text-xs text-gray-400">${esc(d.category?.name ?? '—')}</p>
            </div>
          </div>`;
        },
      },
      {
        headerName: 'SKU / Código',
        field: 'sku',
        minWidth: 180,
        cellRenderer: (p: ICellRendererParams<Product>) => {
          const d = p.data!;
          return `<div class="leading-tight">
            <p class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">${esc(d.sku)}
              <button data-action="copiar-sku" title="Copiar SKU" class="${copyBtn}">⧉</button></p>
            <p class="flex items-center gap-1.5 text-xs text-gray-400">${esc(d.barcode)}
              <button data-action="copiar-codigo" title="Copiar código de barras" class="${copyBtn}">⧉</button></p>
          </div>`;
        },
      },
      {
        headerName: 'Precio',
        type: 'rightAligned',
        valueGetter: (p) => Number(p.data?.price),
        valueFormatter: (p) => this.clp(p.value),
        cellClass: 'font-medium text-gray-800 dark:text-white/90',
      },
      {
        headerName: 'Stock',
        field: 'stock',
        type: 'rightAligned',
        cellRenderer: (p: ICellRendererParams<Product>) => {
          const d = p.data!;
          const cls = d.stock <= d.minStock ? 'text-error-600 font-semibold' : 'text-gray-700 dark:text-gray-300';
          return `<span class="${cls}">${d.stock}</span>`;
        },
      },
      {
        headerName: 'Vencimiento',
        field: 'daysToExpiry',
        minWidth: 130,
        cellRenderer: (p: ICellRendererParams<Product>) => {
          const days = p.data?.daysToExpiry;
          if (days === null || days === undefined) return '<span class="text-xs text-gray-400">—</span>';
          const label = days < 0 ? 'Vencido' : `${days} días`;
          return `<span class="rounded-full px-2.5 py-0.5 text-xs font-medium ${this.badge(days)}">${label}</span>`;
        },
      },
      {
        headerName: 'Acciones',
        sortable: false,
        minWidth: admin ? 230 : 140,
        cellRenderer: () => {
          const parts = [
            ...(admin ? [`<button data-action="editar" class="${btn}">Editar</button>`] : []),
            `<button data-action="barras" class="${btn}">Barras</button>`,
            `<button data-action="qr" class="${btn}">QR</button>`,
            ...(admin ? [`<button data-action="eliminar" class="rounded border border-error-300 px-2 py-1 text-xs text-error-600">Eliminar</button>`] : []),
          ];
          return `<div class="flex items-center gap-2">${parts.join('')}</div>`;
        },
      },
    ];
  }

  onCell(e: CellClickedEvent<Product>) {
    const btn = (e.event?.target as HTMLElement)?.closest('[data-action]') as HTMLElement | null;
    const action = btn?.getAttribute('data-action');
    const p = e.data;
    if (!action || !p) return;
    switch (action) {
      case 'ver':
        this.router.navigate(['/productos', p.id]);
        break;
      case 'editar':
        this.router.navigate(['/productos', p.id], { queryParams: { editar: 1 } });
        break;
      case 'eliminar':
        this.remove(p);
        break;
      case 'barras':
        window.open(this.api.barcodeUrl(p.id), '_blank');
        break;
      case 'qr':
        window.open(this.api.qrUrl(p.id), '_blank');
        break;
      case 'copiar-sku':
        this.copy(p, 'sku', btn!);
        break;
      case 'copiar-codigo':
        this.copy(p, 'barcode', btn!);
        break;
    }
  }

  ngOnInit() {
    this.load();
    this.api.categories().subscribe((c) => (this.cats = c));
  }

  /** Validación CLP: precios enteros ≥ 1, stock entero ≥ 0, código numérico 8-14 dígitos. */
  get errores(): Record<string, string> {
    const e: Record<string, string> = {};
    if (this.form.name !== undefined && (this.form.name?.trim().length ?? 0) < 2)
      e['name'] = 'Mínimo 2 caracteres';
    const price = Number(this.form.price);
    if (this.form.price !== undefined && this.form.price !== null) {
      if (isNaN(price) || price < 1) e['price'] = 'Precio en pesos, mínimo $1';
      else if (!Number.isInteger(price)) e['price'] = 'CLP no usa decimales: entero';
    }
    const stock = Number(this.form.stock);
    if (this.form.stock != null && (isNaN(stock) || stock < 0 || !Number.isInteger(stock)))
      e['stock'] = 'Entero igual o mayor a 0';
    if (!this.editing && this.form.barcode && !/^\d{8,14}$/.test(this.form.barcode))
      e['barcode'] = 'Solo números (8 a 14 dígitos)';
    return e;
  }

  get formValido(): boolean {
    return (
      (this.form.name?.trim().length ?? 0) >= 2 &&
      Number(this.form.price) >= 1 &&
      Object.keys(this.errores).length === 0
    );
  }

  copy(p: Product, field: 'sku' | 'barcode', btn?: HTMLElement) {
    navigator.clipboard.writeText(field === 'sku' ? p.sku : p.barcode);
    if (btn) {
      const prev = btn.innerText;
      btn.innerText = '✓';
      setTimeout(() => (btn.innerText = prev), 1200);
    }
  }

  load() {
    this.api.products(this.search).subscribe((p) => (this.products = p));
  }

  openForm(p?: Product) {
    this.editing = p;
    this.form = p ? { name: p.name, price: Number(p.price), stock: p.stock, barcode: p.barcode, categoryId: p.categoryId ?? '' } : {};
    this.imageFile = undefined;
    this.imagePreview = p?.imageUrl ? this.api.fileUrl(p.imageUrl) : '/images/product-placeholder.svg';
    this.showForm = true;
  }

  /** Vista previa en vivo de la foto elegida, antes de guardar. */
  onImagePick(file?: File) {
    if (!file) return;
    this.imageFile = file;
    this.imagePreview = URL.createObjectURL(file);
  }

  save() {
    if (!this.formValido) return;
    const data: Partial<Product> = {
      name: this.form.name!.trim(),
      price: Math.round(Number(this.form.price)),
      stock: Math.round(Number(this.form.stock ?? 0)),
      categoryId: this.form.categoryId || undefined,
    };
    const afterSave = (p: Product) => {
      if (this.imageFile) this.api.uploadImage(p.id, this.imageFile).subscribe(() => this.load());
      this.showForm = false;
      this.load();
    };
    if (this.editing) {
      this.api.updateProduct(this.editing.id, data).subscribe(afterSave);
    } else {
      if (this.form.barcode) data.barcode = this.form.barcode;
      this.api.createProduct(data).subscribe(afterSave);
    }
  }

  remove(p: Product) {
    if (!confirm(`¿Desactivar "${p.name}"?`)) return;
    this.api.deleteProduct(p.id).subscribe(() => this.load());
  }

  applyBulk() {
    if (!this.bulkPercent) return;
    this.api.bulkPercent(this.bulkPercent, this.bulkCategory || undefined).subscribe((r) => {
      this.bulkMsg = `${r.updated} productos actualizados (${this.bulkPercent}%)`;
      this.load();
    });
  }

  importFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.priceImport(file).subscribe((r) => {
      this.bulkMsg = `${r.updated}/${r.totalRows} precios importados` + (r.notFound.length ? ` · sin match: ${r.notFound.join(', ')}` : '');
      this.load();
    });
  }
}
