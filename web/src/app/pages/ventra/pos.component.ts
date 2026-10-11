import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClpMonedaDirective } from '../../shared/directives/clp-moneda.directive';
import { Subscription } from 'rxjs';
import { ApiService, Product, Category, Sale, PromoQuote, FiadoCliente, whatsappUrl } from '../../core/api.service';
import { PosBusService } from '../../core/pos-bus.service';

interface CartLine {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-ventra-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, ClpMonedaDirective],
  template: `
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-5 2xl:grid-cols-7">
      <!-- ===== Catálogo (izquierda) ===== -->
      <div class="order-2 xl:order-none xl:col-span-3 2xl:col-span-5 flex flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <input #scanInput [(ngModel)]="scanCode" (keydown.enter)="addByCode()" (input)="filterGrid()" autofocus
          placeholder="🔍 Escanear código o buscar producto…"
          class="mx-auto mb-3 block h-14 w-full max-w-xl rounded-xl border-2 border-brand-300 bg-white px-4 text-center text-lg focus:border-brand-500 focus:outline-none dark:bg-gray-900 dark:text-white/90" />

        <div class="mb-3 flex flex-wrap gap-2">
          <button (click)="selectCat('')"
            class="rounded-full px-4 py-1.5 text-sm font-medium"
            [class]="!catId ? 'bg-brand-500 text-white' : 'bg-white border border-gray-300 text-gray-600 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300'">
            Todos
          </button>
          @for (c of cats; track c.id) {
            <button (click)="selectCat(c.id)"
              class="rounded-full px-4 py-1.5 text-sm font-medium"
              [class]="catId === c.id ? 'bg-brand-500 text-white' : 'bg-white border border-gray-300 text-gray-600 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300'">
              {{ c.name }}
            </button>
          }
        </div>

        @if (error) { <p class="mb-2 text-sm text-error-600">{{ error }}</p> }

        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <select [(ngModel)]="orden" (change)="filterGrid()"
              class="h-9 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <option value="nombre">Nombre A–Z</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
            </select>
            <span class="text-xs text-gray-400">Precio</span>
            <input clpMoneda type="text" inputmode="numeric" [(ngModel)]="precioMin" (ngModelChange)="filterGrid()" placeholder="mín $"
              class="h-9 w-20 rounded-lg border border-gray-300 bg-white px-2 text-right text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" />
            <span class="text-xs text-gray-400">–</span>
            <input clpMoneda type="text" inputmode="numeric" [(ngModel)]="precioMax" (ngModelChange)="filterGrid()" placeholder="máx $"
              class="h-9 w-20 rounded-lg border border-gray-300 bg-white px-2 text-right text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" />
            @if (precioMin || precioMax) {
              <button (click)="precioMin = undefined; precioMax = undefined; filterGrid()"
                class="text-xs text-brand-500 hover:underline">Limpiar</button>
            }
          </div>
          <div class="flex items-center gap-1">
          <button (click)="setVista('grilla')" title="Vista grilla"
            class="rounded-lg p-2" [class]="vista === 'grilla' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          </button>
          <button (click)="setVista('lista')" title="Vista lista"
            class="rounded-lg p-2" [class]="vista === 'lista' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
          </button>
          </div>
        </div>

        @if (vista === 'grilla') {
          <div class="grid max-h-[62vh] grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3 overflow-y-auto">
            @for (p of visible; track p.id) {
              <button (click)="addProduct(p)" [disabled]="p.stock <= 0"
                class="flex flex-col items-stretch rounded-xl border border-gray-200 text-left shadow-theme-xs transition hover:border-brand-400 hover:shadow-sm hover:ring-2 hover:ring-brand-500/30 active:scale-95 disabled:opacity-40 dark:border-gray-800 dark:hover:border-brand-500">
                <span class="relative block">
                  <img [src]="p.imageUrl ? api.fileUrl(p.imageUrl) : '/images/product-placeholder.svg'"
                    class="h-32 w-full rounded-t-xl bg-gray-50 object-cover dark:bg-gray-800" [alt]="p.name" loading="lazy"
                    onerror="this.onerror=null;this.src='/images/product-placeholder.svg'" />
                  <span class="absolute right-1.5 top-1.5 rounded-md bg-brand-500 px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    {{ p.stock }}
                  </span>
                </span>
                <span class="flex flex-1 flex-col p-3 pt-2">
                  <span class="line-clamp-2 text-sm font-medium leading-tight text-gray-800 dark:text-white/90">{{ p.name }}</span>
                  <span class="mt-1 text-base font-bold text-brand-500">{{ clp(p.price) }}</span>
                </span>
              </button>
            } @empty {
              <p class="col-span-full py-10 text-center text-gray-400">Sin productos para este filtro</p>
            }
          </div>
        } @else {
          <div class="max-h-[62vh] divide-y divide-gray-50 overflow-y-auto rounded-xl border border-gray-200 dark:divide-gray-800/60 dark:border-gray-800">
            @for (p of visible; track p.id) {
              <button (click)="addProduct(p)" [disabled]="p.stock <= 0"
                class="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-gray-50 active:bg-brand-50 disabled:opacity-40 dark:hover:bg-white/[0.04]">
                <img [src]="p.imageUrl ? api.fileUrl(p.imageUrl) : '/images/product-placeholder.svg'"
                  class="h-14 w-14 shrink-0 rounded-lg bg-gray-50 object-cover dark:bg-gray-800" [alt]="p.name" loading="lazy"
                  onerror="this.onerror=null;this.src='/images/product-placeholder.svg'" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-gray-800 dark:text-white/90">{{ p.name }}</span>
                  <span class="text-xs text-gray-400">{{ p.category?.name ?? '—' }} ·
                    <span [class]="p.stock <= p.minStock ? 'text-error-500' : ''">stock {{ p.stock }}</span>
                  </span>
                </span>
                <span class="text-base font-bold text-brand-500">{{ clp(p.price) }}</span>
              </button>
            } @empty {
              <p class="py-10 text-center text-gray-400">Sin productos para este filtro</p>
            }
          </div>
        }
      </div>

      <!-- ===== Ticket (derecha) ===== -->
      <div class="order-1 xl:order-none xl:col-span-2 2xl:col-span-2 flex flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">🧾 Venta actual</h3>
          @if (cart.length) {
            <div class="flex gap-1.5">
              <button (click)="park()" class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">⏸ Suspender</button>
              <button (click)="cancelarVenta()" class="rounded-lg border border-error-300 px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10">✕ Cancelar</button>
            </div>
          }
        </div>

        @if (parked.length) {
          <div class="mb-2 flex flex-wrap gap-2">
            @for (t of parked; track $index) {
              <button (click)="resume($index)"
                class="rounded-full bg-warning-50 px-3 py-1 text-xs font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">
                ▶ {{ t.name }} ({{ t.lines.length }})
              </button>
            }
          </div>
        }

        <div class="max-h-[34vh] flex-1 space-y-1 overflow-y-auto">
          @for (line of cart; track line.product.id) {
            <div class="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.03]">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-800 dark:text-white/90">{{ line.product.name }}</p>
                <p class="text-xs text-gray-400">{{ clp(line.product.price) }} c/u</p>
              </div>
              <button (click)="line.quantity = line.quantity - 1; cleanZero()" class="h-9 w-9 rounded-lg border border-gray-300 text-lg font-bold dark:border-gray-700 dark:text-gray-300">−</button>
              <span class="w-8 text-center text-base font-bold text-gray-800 dark:text-white/90">{{ line.quantity }}</span>
              <button (click)="line.quantity = line.quantity + 1; refreshQuote()" class="h-9 w-9 rounded-lg border border-gray-300 text-lg font-bold dark:border-gray-700 dark:text-gray-300">+</button>
              <span class="w-20 text-right text-sm font-semibold text-gray-800 dark:text-white/90">{{ clp(line.quantity * line.product.price) }}</span>
            </div>
          } @empty {
            <div class="py-10 text-center">
              <svg class="mx-auto h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 4h2l2.4 11h11.2L21 8H6" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" />
              </svg>
              <p class="mt-2 text-sm text-gray-400">Toca un producto o escanea<br />para empezar la venta</p>
            </div>
          }
        </div>

        <div class="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-gray-500">Descuento</span>
            <div class="flex items-center gap-1.5">
              @for (pct of [5, 10]; track pct) {
                <button (click)="setDiscountPct(pct)"
                  class="rounded-lg border px-2 py-1 text-xs font-medium transition-colors"
                  [class]="descuentoPct === pct
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-gray-300 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400'">{{ pct }}%</button>
              }
              <input clpMoneda type="text" [(ngModel)]="discount" (ngModelChange)="clampDiscount()" inputmode="numeric" placeholder="$"
                class="h-9 w-24 rounded-lg border border-gray-300 bg-white px-2 text-right text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
            </div>
          </div>
          @if (promoDiscount > 0) {
            <div class="mt-2 flex items-center justify-between" [title]="promoNames">
              <span class="cursor-help text-sm font-medium text-success-600 dark:text-success-400">🏷 Ofertas ({{ promoQuote?.detail?.length }})</span>
              <span class="text-sm font-semibold text-brand-600 dark:text-brand-400">−{{ clp(promoDiscount) }}</span>
            </div>
          }
          <div class="mt-2 flex justify-between text-xs text-gray-400">
            <span>Neto {{ clp(neto) }}</span><span>IVA 19% {{ clp(totalFinal - neto) }}</span>
          </div>
          <div class="mt-1 flex items-end justify-between">
            <span class="text-lg font-semibold text-gray-600 dark:text-gray-300">TOTAL</span>
            <span class="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">{{ clp(totalFinal) }}</span>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2">
            @for (pm of payments; track pm.value) {
              <button (click)="setPago(pm.value)"
                class="rounded-xl border-2 py-2.5 text-sm font-semibold transition"
                [class]="payment === pm.value
                  ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                  : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'">
                {{ pm.icon }} {{ pm.label }}
              </button>
            }
          </div>

          @if (payment === 'EFECTIVO' && cart.length) {
            <div class="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-300">Paga con</span>
                <input clpMoneda type="text" [(ngModel)]="tendered" inputmode="numeric" [placeholder]="clp(totalFinal)"
                  class="h-10 w-32 rounded-lg border border-gray-300 bg-white px-2 text-right text-base font-semibold dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
              </div>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <button (click)="tendered = totalFinal" class="rounded-lg border border-gray-300 px-2.5 py-1 text-xs dark:border-gray-700 dark:text-gray-300">Justo</button>
                @for (b of quickBills; track b) {
                  <button (click)="tendered = b" class="rounded-lg border border-gray-300 px-2.5 py-1 text-xs dark:border-gray-700 dark:text-gray-300">{{ clp(b) }}</button>
                }
              </div>
              @if (vuelto !== null) {
                <div class="mt-2 flex items-center justify-between">
                  @if (vuelto >= 0) {
                    <span class="text-sm font-medium text-gray-600 dark:text-gray-300">VUELTO</span>
                    <span class="text-2xl font-extrabold text-success-600">{{ clp(vuelto) }}</span>
                  } @else {
                    <span class="text-sm font-medium text-error-500">FALTA POR PAGAR</span>
                    <span class="text-2xl font-extrabold text-error-500">{{ clp(-vuelto) }}</span>
                  }
                </div>
              }
            </div>
          }

          @if (payment === 'FIADO' && cart.length) {
            <div class="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
              <p class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">📒 ¿Quién se lo lleva fiado?</p>
              @if (clienteFiado) {
                <div class="flex items-center justify-between rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 dark:border-brand-500/40 dark:bg-brand-500/10">
                  <span class="text-sm font-semibold text-brand-700 dark:text-brand-400">{{ clienteFiado.name }}
                    <span class="font-normal text-gray-500">(debe {{ clp(clienteFiado.deuda) }})</span>
                  </span>
                  <button (click)="clienteFiado = undefined" class="text-xs text-gray-400 hover:text-error-500">cambiar ✕</button>
                </div>
              } @else {
                <input [(ngModel)]="buscaCliente" placeholder="Buscar cliente…"
                  class="mb-2 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <div class="max-h-36 space-y-1 overflow-y-auto">
                  @for (c of clientesFiltrados(); track c.id) {
                    <button (click)="clienteFiado = c"
                      class="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-white dark:hover:bg-gray-900">
                      <span class="text-gray-800 dark:text-white/90">{{ c.name }}</span>
                      <span class="text-xs" [class]="c.deuda > 0 ? 'text-error-500' : 'text-gray-400'">{{ clp(c.deuda) }}</span>
                    </button>
                  } @empty {
                    <p class="px-2 py-1 text-xs text-gray-400">Sin resultados</p>
                  }
                </div>
                <div class="mt-2 flex gap-2">
                  <input [(ngModel)]="nuevoClienteNombre" placeholder="…o crea uno: nombre"
                    class="h-9 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                  <button (click)="crearClienteRapido()" [disabled]="!nuevoClienteNombre.trim()"
                    class="h-9 rounded-lg bg-brand-500 px-3 text-xs font-medium text-white disabled:opacity-40">Crear</button>
                </div>
              }
            </div>
          }

          <button (click)="checkout()" [disabled]="!cart.length || saving || (vuelto !== null && vuelto < 0) || (payment === 'FIADO' && !clienteFiado)"
            class="mt-3 h-16 w-full rounded-xl bg-success-500 text-xl font-bold text-white transition hover:bg-success-600 active:scale-[0.99] disabled:opacity-40">
            {{ saving ? 'Procesando…' : '💵 COBRAR ' + (cart.length ? clp(totalFinal) : '') }}
          </button>

          @if (lastSale) {
            <div class="mt-3 rounded-xl bg-success-50 p-4 dark:bg-success-500/15">
              <p class="font-semibold text-success-700 dark:text-success-400">✓ Venta N° {{ lastSale.number }} — boleta folio {{ lastSale.boleta?.folio }}</p>
              @if (lastSale.change != null && lastSale.change > 0) {
                <p class="mt-1 text-2xl font-extrabold text-success-700 dark:text-success-400">Vuelto: {{ clp(lastSale.change) }}</p>
              }
              <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <a [href]="api.fileUrl(lastSale.boleta?.pdfPath)" target="_blank"
                  class="rounded-lg border border-success-500 py-2 text-center font-medium text-success-700 dark:text-success-400">Ver boleta</a>
                <a [href]="waBoleta()" target="_blank"
                  class="rounded-lg bg-success-500 py-2 text-center font-medium text-white">📲 WhatsApp</a>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class VentraPosComponent implements OnInit, OnDestroy {
  cart: CartLine[] = [];
  products: Product[] = [];
  visible: Product[] = [];
  cats: Category[] = [];
  catId = '';
  scanCode = '';
  payment = 'EFECTIVO';
  payments = [
    { value: 'EFECTIVO', label: 'Efectivo', icon: '💵' },
    { value: 'DEBITO', label: 'Débito', icon: '💳' },
    { value: 'CREDITO', label: 'Crédito', icon: '💳' },
    { value: 'TRANSFERENCIA', label: 'Transfer.', icon: '📱' },
    { value: 'FIADO', label: 'Fiado', icon: '📒' },
  ];
  clientesFiado: FiadoCliente[] = [];
  clienteFiado?: FiadoCliente;
  buscaCliente = '';
  nuevoClienteNombre = '';
  error = '';
  saving = false;
  lastSale?: Sale;
  discount = 0;
  descuentoPct?: number;
  tendered?: number;
  /** Estimación en vivo de ofertas aplicables al carrito (POST /promotions/quote). */
  promoQuote: PromoQuote | null = null;
  /** Montos rápidos de pago según el total: redondeos hacia arriba típicos de caja. */
  get quickBills(): number[] {
    const t = this.totalFinal;
    if (t <= 0) return [];
    const candidatos = [1000, 2000, 5000, 10000, 20000, 50000, 100000]
      .map((b) => Math.ceil(t / b) * b)
      .filter((m) => m > t);
    return [...new Set(candidatos)].sort((a, b) => a - b).slice(0, 4);
  }
  parked: { name: string; lines: CartLine[] }[] = [];
  vista: 'grilla' | 'lista' = (localStorage.getItem('ventra_pos_vista') as 'grilla' | 'lista') || 'grilla';
  orden: 'nombre' | 'precio-asc' | 'precio-desc' = 'nombre';
  precioMin?: number;
  precioMax?: number;
  private busSub?: Subscription;
  @ViewChild('scanInput') scanInput?: ElementRef<HTMLInputElement>;

  constructor(
    public api: ApiService,
    private posBus: PosBusService,
  ) {}

  ngOnInit() {
    this.loadCatalog();
    // Productos elegidos desde el buscador global del header
    this.busSub = this.posBus.add$.subscribe((p) => this.addProduct(p));
    try {
      this.parked = JSON.parse(localStorage.getItem('ventra_parked') ?? '[]');
    } catch {}
  }

  ngOnDestroy() {
    this.busSub?.unsubscribe();
  }

  loadCatalog() {
    this.api.products().subscribe((p) => {
      this.products = p;
      this.filterGrid();
    });
    this.api.categories().subscribe((c) => (this.cats = c));
  }

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  get total() {
    return this.cart.reduce((s, l) => s + l.quantity * Number(l.product.price), 0);
  }
  get promoDiscount() {
    return this.promoQuote?.promoDiscount ?? 0;
  }
  get promoNames() {
    return (this.promoQuote?.detail ?? [])
      .map((d) => `${d.promoName}: −${this.clp(d.discount)}`)
      .join('\n');
  }
  /** Total visual = bruto − descuento manual − ofertas (clamp a 0). */
  get totalFinal() {
    return Math.max(
      this.total - Math.max(Number(this.discount) || 0, 0) - this.promoDiscount,
      0,
    );
  }
  get neto() {
    return Math.round(this.totalFinal / 1.19);
  }
  get vuelto(): number | null {
    if (this.payment !== 'EFECTIVO' || !this.tendered) return null;
    return Math.round(Number(this.tendered)) - this.totalFinal;
  }

  setDiscountPct(pct: number) {
    if (this.descuentoPct === pct) {
      // segundo clic en el mismo %: se quita el descuento
      this.descuentoPct = undefined;
      this.discount = 0;
      return;
    }
    this.descuentoPct = pct;
    this.discount = Math.round((this.total * pct) / 100);
  }

  /** Si hay un % activo, el monto se recalcula cuando cambia el carrito. */
  private recalcDescuento() {
    if (this.descuentoPct != null) {
      this.discount = Math.round((this.total * this.descuentoPct) / 100);
    }
  }

  /** Cancela la venta en curso: limpia carrito y estado sin registrar nada. */
  cancelarVenta() {
    if (!confirm('¿Cancelar la venta en curso? Se vacía el carrito sin registrar nada.')) return;
    this.cart = [];
    this.discount = 0;
    this.descuentoPct = undefined;
    this.tendered = undefined;
    this.clienteFiado = undefined;
    this.lastSale = undefined;
    this.error = '';
    this.refreshQuote();
    this.scanInput?.nativeElement.focus();
  }

  /** El descuento es CLP entero y nunca mayor al total de la venta. */
  clampDiscount() {
    this.descuentoPct = undefined;
    const d = Math.round(Number(this.discount) || 0);
    this.discount = Math.min(Math.max(d, 0), this.total);
  }

  park() {
    if (!this.cart.length) return;
    this.parked.push({
      name: `Ticket ${this.parked.length + 1} · ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`,
      lines: this.cart,
    });
    this.cart = [];
    this.discount = 0;
    this.tendered = undefined;
    this.promoQuote = null;
    this.saveParked();
    this.scanInput?.nativeElement.focus();
  }

  resume(i: number) {
    if (this.cart.length) this.park();
    const [t] = this.parked.splice(i, 1);
    this.cart = t.lines;
    this.saveParked();
    this.refreshQuote();
  }

  private saveParked() {
    try {
      localStorage.setItem('ventra_parked', JSON.stringify(this.parked));
    } catch {}
  }

  setPago(v: string) {
    this.payment = v;
    if (v === 'FIADO' && !this.clientesFiado.length) {
      this.api.fiadoClientes().subscribe((c) => (this.clientesFiado = c));
    }
  }

  clientesFiltrados(): FiadoCliente[] {
    const q = this.buscaCliente.trim().toLowerCase();
    return this.clientesFiado.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 6);
  }

  crearClienteRapido() {
    const name = this.nuevoClienteNombre.trim();
    if (!name) return;
    this.api.fiadoCrearCliente({ name }).subscribe((c) => {
      this.clientesFiado = [...this.clientesFiado, { ...c, fiado: 0, abonado: 0, deuda: 0 }];
      this.clienteFiado = this.clientesFiado[this.clientesFiado.length - 1];
      this.nuevoClienteNombre = '';
    });
  }

  setVista(v: 'grilla' | 'lista') {
    this.vista = v;
    try {
      localStorage.setItem('ventra_pos_vista', v);
    } catch {}
  }

  selectCat(id: string) {
    this.catId = id;
    this.filterGrid();
  }

  filterGrid() {
    const q = this.scanCode.trim().toLowerCase();
    const min = this.precioMin ?? 0;
    const max = this.precioMax ?? Infinity;
    this.visible = this.products.filter(
      (p) =>
        (!this.catId || p.categoryId === this.catId) &&
        Number(p.price) >= min &&
        Number(p.price) <= max &&
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q)),
    );
    if (this.orden === 'precio-asc') this.visible.sort((a, b) => Number(a.price) - Number(b.price));
    else if (this.orden === 'precio-desc') this.visible.sort((a, b) => Number(b.price) - Number(a.price));
    else this.visible.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  addProduct(p: Product) {
    const existing = this.cart.find((l) => l.product.id === p.id);
    if (existing) existing.quantity++;
    else this.cart.push({ product: p, quantity: 1 });
    this.recalcDescuento();
    this.error = '';
    this.lastSale = undefined;
    this.refreshQuote();
  }

  /** Consulta las ofertas vigentes para el carrito actual (muestra el estimado en vivo). */
  refreshQuote() {
    if (!this.cart.length) {
      this.promoQuote = null;
      return;
    }
    this.api
      .quote(this.cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })))
      .subscribe({
        next: (q) => (this.promoQuote = q),
        error: () => (this.promoQuote = null),
      });
  }

  addByCode() {
    const code = this.scanCode.trim();
    if (!code) return;
    this.error = '';
    this.api.byBarcode(code).subscribe({
      next: (p) => {
        this.addProduct(p);
        this.scanCode = '';
        this.filterGrid();
        this.scanInput?.nativeElement.focus();
      },
      error: () => {
        // No era un código exacto: si el filtro dejó un único producto, se agrega
        if (this.visible.length === 1) {
          this.addProduct(this.visible[0]);
          this.scanCode = '';
          this.filterGrid();
        } else {
          this.error = `No existe producto con código "${code}"`;
        }
      },
    });
  }

  cleanZero() {
    this.cart = this.cart.filter((l) => l.quantity > 0);
    this.recalcDescuento();
    this.refreshQuote();
  }

  waBoleta(): string {
    if (!this.lastSale) return '';
    const url = location.origin + (this.lastSale.boleta?.pdfPath ?? '');
    return whatsappUrl(
      `🧾 Boleta electrónica Venta N° ${this.lastSale.number}\nTotal: ${this.clp(this.lastSale.total)}\n${url}`,
    );
  }

  checkout() {
    this.saving = true;
    this.error = '';
    // IMPORTANTE: se envía SOLO el descuento manual. El backend recalcula y suma
    // por su cuenta el descuento automático por ofertas (computeDiscounts), así
    // no se duplica. El quote del POS es solo el estimado visual: totalFinal
    // (total − manual − ofertas) coincide con el total que calcula el backend.
    this.api
      .createSale(
        this.cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        this.payment,
        Math.max(Number(this.discount) || 0, 0),
        this.payment === 'EFECTIVO' && this.tendered ? Number(this.tendered) : undefined,
        this.payment === 'FIADO' ? this.clienteFiado?.id : undefined,
      )
      .subscribe({
        next: (s) => {
          this.lastSale = s;
          this.cart = [];
          this.discount = 0;
          this.tendered = undefined;
          this.promoQuote = null;
          this.saving = false;
          this.loadCatalog(); // refresca stock en la grilla
          this.scanInput?.nativeElement.focus();
        },
        error: (e) => {
          this.error = e?.error?.message ?? 'Error al crear la venta';
          this.saving = false;
        },
      });
  }
}
