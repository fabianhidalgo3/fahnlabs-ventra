import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Product, Category } from '../../core/api.service';

@Component({
  selector: 'app-ventra-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <input [(ngModel)]="search" (input)="load()" placeholder="Buscar por nombre, SKU o código…"
        class="h-11 w-72 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:text-white/90" />
      <button (click)="openForm()" class="h-11 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600">+ Nuevo producto</button>
      <button (click)="showBulk = !showBulk" class="h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Precios masivos</button>
      <span class="text-sm text-gray-400">{{ products.length }} productos</span>
    </div>

    @if (showBulk) {
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">Actualización masiva de precios</h4>
        <div class="flex flex-wrap items-end gap-4">
          <div>
            <label class="mb-1 block text-sm text-gray-500">Ajuste porcentual</label>
            <div class="flex gap-2">
              <input type="number" [(ngModel)]="bulkPercent" placeholder="%" class="h-11 w-24 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
              <select [(ngModel)]="bulkCategory" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90 dark:bg-gray-900">
                <option value="">Todas las categorías</option>
                @for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
              </select>
              <button (click)="applyBulk()" class="h-11 rounded-lg bg-brand-500 px-4 text-sm text-white">Aplicar</button>
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
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">{{ editing ? 'Editar' : 'Nuevo' }} producto</h4>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input [(ngModel)]="form.name" placeholder="Nombre *" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
          <input type="number" [(ngModel)]="form.price" placeholder="Precio *" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
          <input type="number" [(ngModel)]="form.stock" placeholder="Stock" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
          <input [(ngModel)]="form.barcode" placeholder="Código de barras (vacío = autogenerar)" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90" />
          <select [(ngModel)]="form.categoryId" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90 dark:bg-gray-900">
            <option value="">Sin categoría</option>
            @for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
          <input type="file" accept="image/*" (change)="imageFile = $any($event.target).files[0]"
            class="block text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-200 file:px-4 file:py-2.5 dark:file:bg-gray-700 dark:file:text-gray-200" />
        </div>
        <div class="mt-4 flex gap-2">
          <button (click)="save()" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm text-white">Guardar</button>
          <button (click)="showForm = false" class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:text-gray-300">Cancelar</button>
        </div>
      </div>
    }

    <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th class="px-5 py-3">Producto</th><th class="px-5 py-3">SKU / Código</th><th class="px-5 py-3 text-right">Precio</th>
            <th class="px-5 py-3 text-right">Stock</th><th class="px-5 py-3">Vencimiento</th><th class="px-5 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (p of products; track p.id) {
            <tr class="border-b border-gray-50 dark:border-gray-800/50">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  @if (p.imageUrl) {
                    <img [src]="api.fileUrl(p.imageUrl)" class="h-10 w-10 rounded-lg object-cover" [alt]="p.name" />
                  } @else {
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">📦</div>
                  }
                  <div>
                    <p class="font-medium text-gray-800 dark:text-white/90">{{ p.name }}</p>
                    <p class="text-xs text-gray-400">{{ p.category?.name ?? '—' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3 text-gray-600 dark:text-gray-400">
                <p>{{ p.sku }}</p><p class="text-xs text-gray-400">{{ p.barcode }}</p>
              </td>
              <td class="px-5 py-3 text-right font-medium text-gray-800 dark:text-white/90">{{ clp(p.price) }}</td>
              <td class="px-5 py-3 text-right">
                <span [class]="p.stock <= p.minStock ? 'text-error-600 font-semibold' : 'text-gray-700 dark:text-gray-300'">{{ p.stock }}</span>
              </td>
              <td class="px-5 py-3">
                @if (p.daysToExpiry !== null && p.daysToExpiry !== undefined) {
                  <span class="rounded-full px-2.5 py-1 text-xs font-medium" [class]="badge(p.daysToExpiry)">
                    {{ p.daysToExpiry < 0 ? 'Vencido' : p.daysToExpiry + ' días' }}
                  </span>
                } @else { <span class="text-xs text-gray-400">—</span> }
              </td>
              <td class="px-5 py-3">
                <div class="flex gap-2 text-xs">
                  <button (click)="openForm(p)" class="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:text-gray-300">Editar</button>
                  <a [href]="api.barcodeUrl(p.id)" target="_blank" class="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:text-gray-300">Barras</a>
                  <a [href]="api.qrUrl(p.id)" target="_blank" class="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:text-gray-300">QR</a>
                  <button (click)="remove(p)" class="rounded border border-error-300 px-2 py-1 text-error-600">Eliminar</button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
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
  bulkPercent?: number;
  bulkCategory = '';
  bulkMsg = '';
  form: Partial<Product> = {};

  constructor(public api: ApiService) {}

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

  ngOnInit() {
    this.load();
    this.api.categories().subscribe((c) => (this.cats = c));
  }

  load() {
    this.api.products(this.search).subscribe((p) => (this.products = p));
  }

  openForm(p?: Product) {
    this.editing = p;
    this.form = p ? { name: p.name, price: Number(p.price), stock: p.stock, barcode: p.barcode, categoryId: p.categoryId ?? '' } : {};
    this.imageFile = undefined;
    this.showForm = true;
  }

  save() {
    if (!this.form.name || !this.form.price) return;
    const data: Partial<Product> = {
      name: this.form.name,
      price: Number(this.form.price),
      stock: Number(this.form.stock ?? 0),
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
