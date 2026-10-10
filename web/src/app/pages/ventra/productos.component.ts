import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Product, Category } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-ventra-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <input [(ngModel)]="search" (input)="load()" placeholder="Buscar por nombre, SKU o código…"
        class="h-11 w-72 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:text-white/90" />
      @if (auth.isAdmin) {
        <button (click)="openForm()" class="h-11 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600">+ Nuevo producto</button>
        <button (click)="showBulk = !showBulk" class="h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Precios masivos</button>
      }
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
          <div>
            <input [(ngModel)]="form.name" placeholder="Nombre *" required
              class="h-11 w-full rounded-lg border bg-transparent px-3 text-sm dark:text-white/90"
              [class]="errores['name'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            @if (errores['name']) { <p class="mt-1 text-xs text-error-500">{{ errores['name'] }}</p> }
          </div>
          <div>
            <input type="number" [(ngModel)]="form.price" placeholder="Precio CLP * (entero)" inputmode="numeric" min="1" step="1" required
              class="h-11 w-full rounded-lg border bg-transparent px-3 text-sm dark:text-white/90"
              [class]="errores['price'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            @if (errores['price']) { <p class="mt-1 text-xs text-error-500">{{ errores['price'] }}</p> }
          </div>
          <div>
            <input type="number" [(ngModel)]="form.stock" placeholder="Stock (entero)" inputmode="numeric" min="0" step="1"
              class="h-11 w-full rounded-lg border bg-transparent px-3 text-sm dark:text-white/90"
              [class]="errores['stock'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            @if (errores['stock']) { <p class="mt-1 text-xs text-error-500">{{ errores['stock'] }}</p> }
          </div>
          <div>
            <input [(ngModel)]="form.barcode" placeholder="Código de barras (vacío = autogenerar)" inputmode="numeric"
              class="h-11 w-full rounded-lg border bg-transparent px-3 text-sm dark:text-white/90"
              [class]="errores['barcode'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            @if (errores['barcode']) { <p class="mt-1 text-xs text-error-500">{{ errores['barcode'] }}</p> }
          </div>
          <select [(ngModel)]="form.categoryId" class="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90 dark:bg-gray-900">
            <option value="">Sin categoría</option>
            @for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
          <input type="file" accept="image/*" (change)="imageFile = $any($event.target).files[0]"
            class="block text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-200 file:px-4 file:py-2.5 dark:file:bg-gray-700 dark:file:text-gray-200" />
        </div>
        <div class="mt-4 flex gap-2">
          <button (click)="save()" [disabled]="!formValido" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm text-white disabled:opacity-40">Guardar</button>
          <button (click)="showForm = false" class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:text-gray-300">Cancelar</button>
        </div>
      </div>
    }

    <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 max-h-[70vh] overflow-auto">
      <table class="w-full min-w-[900px] text-sm">
        <thead class="sticky top-0 z-10">
          <tr class="border-b border-gray-100 bg-white text-left text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <th class="sticky left-0 z-20 bg-white px-5 py-3 dark:bg-gray-900">Producto</th>
            <th class="px-5 py-3">SKU / Código</th><th class="px-5 py-3 text-right">Precio</th>
            <th class="px-5 py-3 text-right">Stock</th><th class="px-5 py-3">Vencimiento</th><th class="px-5 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (p of products; track p.id) {
            <tr class="group border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-white/[0.03]">
              <td class="sticky left-0 z-[5] bg-white px-5 py-3 group-hover:bg-gray-50 dark:bg-gray-900 dark:group-hover:bg-gray-800">
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
                <p class="flex items-center gap-1.5">
                  {{ p.sku }}
                  <button (click)="copy(p, 'sku')" title="Copiar SKU"
                    class="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700">
                    @if (copied === p.id + 'sku') { <span class="text-success-600">✓</span> } @else { ⧉ }
                  </button>
                </p>
                <p class="flex items-center gap-1.5 text-xs text-gray-400">
                  {{ p.barcode }}
                  <button (click)="copy(p, 'barcode')" title="Copiar código de barras"
                    class="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700">
                    @if (copied === p.id + 'barcode') { <span class="text-success-600">✓</span> } @else { ⧉ }
                  </button>
                </p>
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
                  @if (auth.isAdmin) {
                    <button (click)="openForm(p)" class="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:text-gray-300">Editar</button>
                  }
                  <a [href]="api.barcodeUrl(p.id)" target="_blank" class="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:text-gray-300">Barras</a>
                  <a [href]="api.qrUrl(p.id)" target="_blank" class="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:text-gray-300">QR</a>
                  @if (auth.isAdmin) {
                    <button (click)="remove(p)" class="rounded border border-error-300 px-2 py-1 text-error-600">Eliminar</button>
                  }
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
  copied = '';
  form: Partial<Product> = {};

  constructor(
    public api: ApiService,
    public auth: AuthService,
  ) {}

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

  copy(p: Product, field: 'sku' | 'barcode') {
    navigator.clipboard.writeText(field === 'sku' ? p.sku : p.barcode);
    this.copied = p.id + field;
    setTimeout(() => (this.copied = ''), 1200);
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
