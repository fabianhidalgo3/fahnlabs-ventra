import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Category, Product, Promotion, PromoType } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';

@Component({
  selector: 'app-ventra-ofertas',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Ofertas" subtitle="Descuentos, packs y promociones aplicados automáticamente en el POS">
      @if (auth.isAdmin) {
        <button (click)="openForm()" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">+ Nueva oferta</button>
      }
    </app-page-header>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <span class="text-sm text-gray-400">{{ promos.length }} ofertas</span>
    </div>

    @if (showForm) {
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">{{ editing ? 'Editar' : 'Nueva' }} oferta</h4>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label class="mb-1 block text-sm text-gray-500">Nombre *</label>
            <input [(ngModel)]="form.name" placeholder="Ej: Lácteos -10%"
              class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
              [class]="errores['name'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            @if (errores['name']) { <p class="mt-1 text-xs text-error-500">{{ errores['name'] }}</p> }
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-500">Tipo de oferta</label>
            <select [(ngModel)]="form.type" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
              <option value="PORCENTAJE">Descuento porcentual (-X%)</option>
              <option value="PACK_PRECIO">Pack a precio fijo (N × $X)</option>
              <option value="NXM">Lleva N paga M</option>
            </select>
          </div>

          @if (form.type === 'PORCENTAJE') {
            <div>
              <label class="mb-1 block text-sm text-gray-500">Porcentaje de descuento (1-100)</label>
              <input type="number" [(ngModel)]="form.percent" min="1" max="100" step="1" placeholder="%"
                class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
                [class]="errores['percent'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
              @if (errores['percent']) { <p class="mt-1 text-xs text-error-500">{{ errores['percent'] }}</p> }
            </div>
          }
          @if (form.type === 'PACK_PRECIO') {
            <div>
              <label class="mb-1 block text-sm text-gray-500">Cantidad del pack (≥ 2)</label>
              <input type="number" [(ngModel)]="form.packQty" min="2" step="1" inputmode="numeric" placeholder="Ej: 3"
                class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
                [class]="errores['packQty'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
              @if (errores['packQty']) { <p class="mt-1 text-xs text-error-500">{{ errores['packQty'] }}</p> }
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-500">Precio del pack (CLP entero)</label>
              <input type="number" [(ngModel)]="form.packPrice" min="1" step="1" inputmode="numeric" placeholder="Ej: 5000"
                class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
                [class]="errores['packPrice'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
              @if (errores['packPrice']) { <p class="mt-1 text-xs text-error-500">{{ errores['packPrice'] }}</p> }
            </div>
          }
          @if (form.type === 'NXM') {
            <div>
              <label class="mb-1 block text-sm text-gray-500">Lleva (N)</label>
              <input type="number" [(ngModel)]="form.nTake" min="2" step="1" inputmode="numeric" placeholder="Ej: 3"
                class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
                [class]="errores['nxm'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-500">Paga (M)</label>
              <input type="number" [(ngModel)]="form.mPay" min="1" step="1" inputmode="numeric" placeholder="Ej: 2"
                class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
                [class]="errores['nxm'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
              @if (errores['nxm']) { <p class="mt-1 text-xs text-error-500">{{ errores['nxm'] }}</p> }
            </div>
          }

          <div>
            <label class="mb-1 block text-sm text-gray-500">Alcance: categoría completa</label>
            <select [(ngModel)]="form.categoryId" (ngModelChange)="form.categoryId && (productIds = [])"
              class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
              <option value="">— Sin categoría (usar productos) —</option>
              @for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <div class="md:row-span-2">
            <label class="mb-1 block text-sm text-gray-500">… o productos específicos (Cmd/Ctrl + clic para varios)</label>
            <select multiple [(ngModel)]="productIds" (ngModelChange)="productIds.length && (form.categoryId = '')" size="6"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-900 dark:text-white/90"
              [class]="errores['alcance'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'">
              @for (p of products; track p.id) { <option [value]="p.id">{{ p.name }}</option> }
            </select>
            @if (errores['alcance']) { <p class="mt-1 text-xs text-error-500">{{ errores['alcance'] }}</p> }
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-500">Vigencia desde (opcional)</label>
            <input type="date" [(ngModel)]="startsAt"
              class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-500">Vigencia hasta (opcional)</label>
            <input type="date" [(ngModel)]="endsAt"
              class="h-11 w-full rounded-lg border bg-white px-3 text-sm dark:bg-gray-900 dark:text-white/90"
              [class]="errores['vigencia'] ? 'border-error-400' : 'border-gray-300 dark:border-gray-700'" />
            @if (errores['vigencia']) { <p class="mt-1 text-xs text-error-500">{{ errores['vigencia'] }}</p> }
          </div>
        </div>
        @if (errorMsg) { <p class="mt-3 text-sm text-error-500">{{ errorMsg }}</p> }
        <div class="mt-4 flex gap-2">
          <button (click)="save()" [disabled]="!formValido" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">Guardar</button>
          <button (click)="showForm = false" class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
        </div>
      </div>
    }

    <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 max-h-[70vh] overflow-auto">
      <table class="w-full min-w-[900px] text-sm">
        <thead class="sticky top-0 z-10">
          <tr class="border-b border-gray-100 bg-white text-left dark:border-gray-800 dark:bg-gray-900">
            <th class="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Oferta</th>
            <th class="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Regla</th>
            <th class="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Alcance</th>
            <th class="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Vigencia</th>
            <th class="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Estado</th>
            @if (auth.isAdmin) { <th class="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Acciones</th> }
          </tr>
        </thead>
        <tbody>
          @for (pr of promos; track pr.id) {
            <tr class="border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-white/[0.03]">
              <td class="px-5 py-3">
                <p class="font-medium text-gray-800 dark:text-white/90">{{ pr.name }}</p>
                <p class="text-xs text-gray-400">{{ typeLabel(pr.type) }}</p>
              </td>
              <td class="px-5 py-3 font-medium text-brand-500">{{ rule(pr) }}</td>
              <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ scope(pr) }}</td>
              <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ validity(pr) }}</td>
              <td class="px-5 py-3">
                <span class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  [class]="pr.active
                    ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'">
                  {{ pr.active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              @if (auth.isAdmin) {
                <td class="px-5 py-3">
                  <div class="flex gap-2 text-xs">
                    <button (click)="openForm(pr)" class="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:text-gray-300">Editar</button>
                    <button (click)="toggle(pr)"
                      class="rounded border px-2 py-1"
                      [class]="pr.active ? 'border-error-300 text-error-600' : 'border-success-500 text-success-600'">
                      {{ pr.active ? 'Desactivar' : 'Activar' }}
                    </button>
                  </div>
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="px-5 py-10 text-center">
                <svg class="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                <p class="mt-2 text-sm text-gray-400">Sin ofertas registradas</p>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class VentraOfertasComponent implements OnInit {
  promos: Promotion[] = [];
  products: Product[] = [];
  cats: Category[] = [];
  showForm = false;
  editing?: Promotion;
  errorMsg = '';
  form: Partial<Promotion> = { type: 'PORCENTAJE', categoryId: '' };
  productIds: string[] = [];
  startsAt = '';
  endsAt = '';

  constructor(
    public api: ApiService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    this.load();
    this.api.products().subscribe((p) => (this.products = p));
    this.api.categories().subscribe((c) => (this.cats = c));
  }

  load() {
    this.api.promotions().subscribe((p) => (this.promos = p));
  }

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  typeLabel(t: PromoType) {
    return t === 'PORCENTAJE' ? 'Descuento %' : t === 'PACK_PRECIO' ? 'Pack a precio fijo' : 'Lleva N paga M';
  }

  /** Regla legible: "-15%", "3 × $1.000", "Lleva 3 paga 2". */
  rule(p: Promotion) {
    if (p.type === 'PORCENTAJE') return `-${Math.round(Number(p.percent))}%`;
    if (p.type === 'PACK_PRECIO') return `${p.packQty} × ${this.clp(Number(p.packPrice))}`;
    return `Lleva ${p.nTake} paga ${p.mPay}`;
  }

  scope(p: Promotion) {
    if (p.category?.name) return `Categoría: ${p.category.name}`;
    const names = (p.products ?? []).map((x) => x.product.name);
    if (!names.length) return '—';
    return names.length <= 2 ? names.join(', ') : `${names.length} productos`;
  }

  validity(p: Promotion) {
    const f = (d?: string | null) => (d ? new Date(d).toLocaleDateString('es-CL') : null);
    const from = f(p.startsAt);
    const to = f(p.endsAt);
    if (!from && !to) return 'Siempre';
    if (from && to) return `${from} – ${to}`;
    return from ? `Desde ${from}` : `Hasta ${to}`;
  }

  get errores(): Record<string, string> {
    const e: Record<string, string> = {};
    if (this.form.name !== undefined && (this.form.name?.trim().length ?? 0) < 2)
      e['name'] = 'Nombre requerido (mínimo 2 caracteres)';
    if (this.form.type === 'PORCENTAJE') {
      const pct = Number(this.form.percent);
      if (this.form.percent != null && (isNaN(pct) || pct < 1 || pct > 100))
        e['percent'] = 'Entre 1 y 100';
    }
    if (this.form.type === 'PACK_PRECIO') {
      const qty = Number(this.form.packQty);
      if (this.form.packQty != null && (!Number.isInteger(qty) || qty < 2))
        e['packQty'] = 'Entero igual o mayor a 2';
      const price = Number(this.form.packPrice);
      if (this.form.packPrice != null && (!Number.isInteger(price) || price < 1))
        e['packPrice'] = 'CLP entero, mínimo $1';
    }
    if (this.form.type === 'NXM') {
      const n = Number(this.form.nTake);
      const m = Number(this.form.mPay);
      if ((this.form.nTake != null || this.form.mPay != null) &&
          (!Number.isInteger(n) || !Number.isInteger(m) || m < 1 || n <= m))
        e['nxm'] = 'Debe cumplirse N > M ≥ 1';
    }
    if (!this.form.categoryId && !this.productIds.length)
      e['alcance'] = 'Elige productos o una categoría';
    if (this.startsAt && this.endsAt && this.endsAt < this.startsAt)
      e['vigencia'] = 'Debe ser posterior al inicio';
    return e;
  }

  get formValido(): boolean {
    if ((this.form.name?.trim().length ?? 0) < 2) return false;
    if (this.form.type === 'PORCENTAJE' && !(Number(this.form.percent) >= 1)) return false;
    if (this.form.type === 'PACK_PRECIO' && !(Number(this.form.packQty) >= 2 && Number(this.form.packPrice) >= 1)) return false;
    if (this.form.type === 'NXM' && !(Number(this.form.nTake) > Number(this.form.mPay) && Number(this.form.mPay) >= 1)) return false;
    return Object.keys(this.errores).length === 0;
  }

  openForm(p?: Promotion) {
    this.editing = p;
    this.errorMsg = '';
    if (p) {
      this.form = {
        name: p.name,
        type: p.type,
        percent: p.percent != null ? Number(p.percent) : undefined,
        packQty: p.packQty ?? undefined,
        packPrice: p.packPrice != null ? Number(p.packPrice) : undefined,
        nTake: p.nTake ?? undefined,
        mPay: p.mPay ?? undefined,
        categoryId: p.categoryId ?? '',
      };
      this.productIds = (p.products ?? []).map((x) => x.productId);
      this.startsAt = p.startsAt ? p.startsAt.slice(0, 10) : '';
      this.endsAt = p.endsAt ? p.endsAt.slice(0, 10) : '';
    } else {
      this.form = { type: 'PORCENTAJE', categoryId: '' };
      this.productIds = [];
      this.startsAt = '';
      this.endsAt = '';
    }
    this.showForm = true;
  }

  save() {
    if (!this.formValido) return;
    const data: Partial<Promotion> & { productIds?: string[] } = {
      name: this.form.name!.trim(),
      type: this.form.type,
      percent: this.form.type === 'PORCENTAJE' ? Number(this.form.percent) : undefined,
      packQty: this.form.type === 'PACK_PRECIO' ? Math.round(Number(this.form.packQty)) : undefined,
      packPrice: this.form.type === 'PACK_PRECIO' ? Math.round(Number(this.form.packPrice)) : undefined,
      nTake: this.form.type === 'NXM' ? Math.round(Number(this.form.nTake)) : undefined,
      mPay: this.form.type === 'NXM' ? Math.round(Number(this.form.mPay)) : undefined,
      // null explícito para limpiar la categoría al cambiar a productos específicos
      categoryId: this.form.categoryId || null,
      productIds: this.form.categoryId ? [] : this.productIds,
      startsAt: this.startsAt ? new Date(this.startsAt + 'T00:00:00').toISOString() : undefined,
      endsAt: this.endsAt ? new Date(this.endsAt + 'T23:59:59').toISOString() : undefined,
    };
    const obs = this.editing
      ? this.api.updatePromotion(this.editing.id, data)
      : this.api.createPromotion(data);
    obs.subscribe({
      next: () => {
        this.showForm = false;
        this.load();
      },
      error: (e) => (this.errorMsg = e?.error?.message ?? 'Error al guardar la oferta'),
    });
  }

  toggle(p: Promotion) {
    this.api.updatePromotion(p.id, { active: !p.active }).subscribe(() => this.load());
  }
}
