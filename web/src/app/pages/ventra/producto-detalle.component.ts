import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService, Product, Category } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';

interface Batch {
  id: string;
  lotCode: string;
  quantity: number;
  expiresAt: string;
}

interface PriceLog {
  id: string;
  oldPrice: number;
  newPrice: number;
  reason?: string;
  createdAt: string;
}

type ProductoFull = Product & { batches?: Batch[]; priceLogs?: PriceLog[] };

@Component({
  selector: 'app-ventra-producto-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    @if (p) {
      <app-page-header [title]="p.name" [subtitle]="(p.category?.name ?? 'Sin categoría') + ' · ' + p.sku">
        <a routerLink="/productos" class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">← Volver</a>
        @if (auth.isAdmin) {
          <button (click)="editando = !editando"
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600">
            {{ editando ? 'Cerrar edición' : '✎ Editar' }}
          </button>
          <button (click)="remove()" class="inline-flex h-10 items-center rounded-lg border border-error-300 px-4 text-sm font-medium text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10">Eliminar</button>
        }
      </app-page-header>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <!-- Imagen + códigos -->
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <img [src]="imagePreview" [alt]="p.name"
            class="mx-auto h-72 w-72 rounded-2xl border border-gray-100 object-cover dark:border-gray-800"
            onerror="this.onerror=null;this.src='/images/product-placeholder.svg'" />
          @if (auth.isAdmin) {
            <label class="mt-3 block">
              <span class="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
                📷 {{ p.imageUrl ? 'Cambiar foto' : 'Subir foto' }}
              </span>
              <input type="file" accept="image/*" hidden (change)="onImagePick($any($event.target).files[0])" />
            </label>
          }
          <div class="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
            <div class="flex items-center justify-between">
              <span class="text-gray-500">SKU</span>
              <span class="flex items-center gap-1.5 font-medium text-gray-800 dark:text-white/90">
                {{ p.sku }}
                <button (click)="copy(p.sku)" class="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">{{ copied === p.sku ? '✓' : '⧉' }}</button>
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Código de barras</span>
              <span class="flex items-center gap-1.5 font-medium text-gray-800 dark:text-white/90">
                {{ p.barcode }}
                <button (click)="copy(p.barcode)" class="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">{{ copied === p.barcode ? '✓' : '⧉' }}</button>
              </span>
            </div>
            <div class="flex gap-2 pt-2">
              <a [href]="api.barcodeUrl(p.id)" target="_blank" class="flex-1 rounded-lg border border-gray-300 py-2 text-center text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Ver código de barras</a>
              <a [href]="api.qrUrl(p.id)" target="_blank" class="flex-1 rounded-lg border border-gray-300 py-2 text-center text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Ver QR</a>
            </div>
          </div>
        </div>

        <!-- Información / edición -->
        <div class="xl:col-span-2 space-y-6">
          <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Precio</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{{ clp(p.price) }}</p>
            </div>
            <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Costo</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{{ p.cost ? clp(p.cost) : '—' }}</p>
              @if (p.cost) { <p class="text-xs text-success-600">margen {{ margen() }}%</p> }
            </div>
            <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Stock</p>
              <p class="mt-1 text-2xl font-bold" [class]="p.stock <= p.minStock ? 'text-error-500' : 'text-gray-900 dark:text-white'">{{ p.stock }}</p>
              <p class="text-xs text-gray-400">mínimo {{ p.minStock }}</p>
            </div>
            <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Próximo vencim.</p>
              @if (proxVence(); as b) {
                <p class="mt-1 text-lg font-bold" [class]="dias(b) <= 7 ? 'text-error-500' : dias(b) <= 15 ? 'text-warning-500' : 'text-gray-900 dark:text-white'">{{ dias(b) < 0 ? 'VENCIDO' : dias(b) + ' días' }}</p>
                <p class="text-xs text-gray-400">lote {{ b.lotCode }}</p>
              } @else { <p class="mt-1 text-lg font-bold text-gray-400">—</p> }
            </div>
          </div>

          @if (editando && auth.isAdmin) {
            <div class="rounded-2xl border-2 border-dashed border-brand-200 bg-white p-5 dark:border-brand-500/30 dark:bg-gray-900">
              <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">Editar producto</h4>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <input [(ngModel)]="form.name" placeholder="Nombre *" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <input type="number" [(ngModel)]="form.price" placeholder="Precio CLP *" min="1" step="1" inputmode="numeric" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <input type="number" [(ngModel)]="form.stock" placeholder="Stock" min="0" step="1" inputmode="numeric" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <input type="number" [(ngModel)]="form.cost" placeholder="Costo CLP" min="0" step="1" inputmode="numeric" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <input type="number" [(ngModel)]="form.minStock" placeholder="Stock mínimo" min="0" step="1" inputmode="numeric" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <select [(ngModel)]="form.categoryId" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90">
                  <option value="">Sin categoría</option>
                  @for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                </select>
              </div>
              @if (error) { <p class="mt-2 text-sm text-error-600">{{ error }}</p> }
              <button (click)="save()" class="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600">Guardar cambios</button>
            </div>
          }

          <!-- Lotes y vencimientos -->
          <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div class="mb-3 flex items-center justify-between">
              <h4 class="font-semibold text-gray-800 dark:text-white/90">Lotes y vencimientos</h4>
              @if (auth.isAdmin) {
                <button (click)="showLote = !showLote" class="text-sm font-medium text-brand-500 hover:underline">+ Agregar lote</button>
              }
            </div>
            @if (showLote) {
              <div class="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                <input [(ngModel)]="lote.lotCode" placeholder="Código de lote" class="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <input type="number" [(ngModel)]="lote.quantity" placeholder="Cantidad" min="1" step="1" class="h-10 w-28 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <input type="date" [(ngModel)]="lote.expiresAt" class="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <button (click)="addLote()" [disabled]="!lote.lotCode || !lote.quantity || !lote.expiresAt"
                  class="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white disabled:opacity-40">Guardar lote</button>
              </div>
            }
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-100 text-left dark:border-gray-800">
                  <th class="py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Lote</th>
                  <th class="py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cantidad</th>
                  <th class="py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Vence</th>
                  <th class="py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (b of p.batches ?? []; track b.id) {
                  <tr class="border-b border-gray-50 dark:border-gray-800/50">
                    <td class="py-2.5 font-medium text-gray-800 dark:text-white/90">{{ b.lotCode }}</td>
                    <td class="py-2.5 text-right text-gray-600 dark:text-gray-400">{{ b.quantity }}</td>
                    <td class="py-2.5 text-gray-600 dark:text-gray-400">{{ b.expiresAt | date: 'dd/MM/yyyy' }}</td>
                    <td class="py-2.5">
                      <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" [class]="badge(dias(b))">
                        {{ dias(b) < 0 ? 'VENCIDO' : dias(b) + ' días' }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="py-6 text-center text-sm text-gray-400">Sin lotes registrados</td></tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Historial de precios -->
          @if (p.priceLogs?.length) {
            <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">Historial de precios</h4>
              <ul class="space-y-2 text-sm">
                @for (l of p.priceLogs; track l.id) {
                  <li class="flex items-center justify-between border-b border-gray-50 pb-2 dark:border-gray-800/50">
                    <span class="text-gray-500">{{ l.createdAt | date: 'dd/MM/yyyy HH:mm' }} · {{ l.reason ?? 'cambio de precio' }}</span>
                    <span class="font-medium">
                      <span class="text-gray-400 line-through">{{ clp(l.oldPrice) }}</span>
                      <span class="ml-2" [class]="+l.newPrice > +l.oldPrice ? 'text-error-500' : 'text-success-600'">{{ clp(l.newPrice) }}</span>
                    </span>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class VentraProductoDetalleComponent implements OnInit {
  p?: ProductoFull;
  cats: Category[] = [];
  editando = false;
  showLote = false;
  copied = '';
  error = '';
  imagePreview = '/images/product-placeholder.svg';
  form: Partial<Product> = {};
  lote: { lotCode?: string; quantity?: number; expiresAt?: string } = {};

  constructor(
    public api: ApiService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((pm) => this.load(pm.get('id')!));
    this.editando = this.route.snapshot.queryParamMap.has('editar') && this.auth.isAdmin;
  }

  load(id: string) {
    this.api.product(id).subscribe({
      next: (p) => {
        this.p = p as ProductoFull;
        this.imagePreview = p.imageUrl ? this.api.fileUrl(p.imageUrl) : '/images/product-placeholder.svg';
        this.form = {
          name: p.name,
          price: Number(p.price),
          cost: p.cost != null ? Number(p.cost) : undefined,
          stock: p.stock,
          minStock: p.minStock,
          categoryId: p.categoryId ?? '',
        };
      },
      error: () => this.router.navigate(['/productos']),
    });
    this.api.categories().subscribe((c) => (this.cats = c));
  }

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  margen(): number {
    if (!this.p?.cost) return 0;
    return Math.round(((Number(this.p.price) - Number(this.p.cost)) / Number(this.p.price)) * 100);
  }

  dias(b: Batch): number {
    return Math.ceil((new Date(b.expiresAt).getTime() - Date.now()) / 86400000);
  }

  proxVence(): Batch | null {
    return this.p?.batches?.length ? this.p.batches[0] : null;
  }

  badge(days: number) {
    if (days <= 7) return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400';
    if (days <= 15) return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400';
    if (days <= 30) return 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400';
    return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400';
  }

  copy(text: string) {
    navigator.clipboard.writeText(text);
    this.copied = text;
    setTimeout(() => (this.copied = ''), 1200);
  }

  onImagePick(file?: File) {
    if (!file || !this.p) return;
    this.imagePreview = URL.createObjectURL(file);
    this.api.uploadImage(this.p.id, file).subscribe(() => this.load(this.p!.id));
  }

  save() {
    if (!this.p) return;
    const price = Math.round(Number(this.form.price));
    if (!this.form.name?.trim() || isNaN(price) || price < 1) {
      this.error = 'Nombre y precio (entero ≥ $1) son obligatorios';
      return;
    }
    this.error = '';
    this.api
      .updateProduct(this.p.id, {
        name: this.form.name.trim(),
        price,
        cost: this.form.cost != null && String(this.form.cost) !== '' ? Math.round(Number(this.form.cost)) : undefined,
        stock: Math.round(Number(this.form.stock ?? 0)),
        minStock: Math.round(Number(this.form.minStock ?? 0)),
        categoryId: this.form.categoryId || undefined,
      })
      .subscribe({
        next: () => {
          this.editando = false;
          this.load(this.p!.id);
        },
        error: (e) => (this.error = e?.error?.message ?? 'Error al guardar'),
      });
  }

  addLote() {
    if (!this.p || !this.lote.lotCode || !this.lote.quantity || !this.lote.expiresAt) return;
    this.api
      .createBatch({
        productId: this.p.id,
        lotCode: this.lote.lotCode,
        quantity: Math.round(Number(this.lote.quantity)),
        expiresAt: this.lote.expiresAt,
      })
      .subscribe(() => {
        this.lote = {};
        this.showLote = false;
        this.load(this.p!.id);
      });
  }

  remove() {
    if (!this.p || !confirm(`¿Desactivar "${this.p.name}"?`)) return;
    this.api.deleteProduct(this.p.id).subscribe(() => this.router.navigate(['/productos']));
  }
}
