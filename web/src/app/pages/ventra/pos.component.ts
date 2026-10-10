import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService, Product, Category, Sale, whatsappUrl } from '../../core/api.service';
import { PosBusService } from '../../core/pos-bus.service';

interface CartLine {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-ventra-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <!-- ===== Catálogo (izquierda) ===== -->
      <div class="xl:col-span-3 flex flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <input #scanInput [(ngModel)]="scanCode" (keydown.enter)="addByCode()" (input)="filterGrid()" autofocus
          placeholder="🔍 Escanear código o buscar producto…"
          class="mb-3 h-14 w-full rounded-xl border-2 border-brand-300 bg-transparent px-4 text-lg focus:border-brand-500 focus:outline-none dark:text-white/90" />

        <div class="mb-3 flex flex-wrap gap-2">
          <button (click)="selectCat('')"
            class="rounded-full px-4 py-1.5 text-sm font-medium"
            [class]="!catId ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'">
            Todos
          </button>
          @for (c of cats; track c.id) {
            <button (click)="selectCat(c.id)"
              class="rounded-full px-4 py-1.5 text-sm font-medium"
              [class]="catId === c.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'">
              {{ c.name }}
            </button>
          }
        </div>

        @if (error) { <p class="mb-2 text-sm text-error-600">{{ error }}</p> }

        <div class="grid max-h-[62vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          @for (p of visible; track p.id) {
            <button (click)="addProduct(p)" [disabled]="p.stock <= 0"
              class="flex flex-col items-start rounded-xl border border-gray-200 p-3 text-left transition hover:border-brand-400 hover:shadow-sm active:scale-95 disabled:opacity-40 dark:border-gray-800 dark:hover:border-brand-500">
              @if (p.imageUrl) {
                <img [src]="api.fileUrl(p.imageUrl)" class="mb-2 h-16 w-full rounded-lg object-cover" [alt]="p.name" loading="lazy" onerror="this.src='/images/product-placeholder.svg'" />
              } @else {
                <img src="/images/product-placeholder.svg" class="mb-2 h-16 w-full rounded-lg object-cover" [alt]="p.name" loading="lazy" />
              }
              <span class="line-clamp-2 text-sm font-medium leading-tight text-gray-800 dark:text-white/90">{{ p.name }}</span>
              <span class="mt-1 text-base font-bold text-brand-500">{{ clp(p.price) }}</span>
              <span class="text-xs" [class]="p.stock <= p.minStock ? 'text-error-500' : 'text-gray-400'">stock {{ p.stock }}</span>
            </button>
          } @empty {
            <p class="col-span-full py-10 text-center text-gray-400">Sin productos para este filtro</p>
          }
        </div>
      </div>

      <!-- ===== Ticket (derecha) ===== -->
      <div class="xl:col-span-2 flex flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">🧾 Venta actual</h3>
          @if (cart.length) {
            <button (click)="park()" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">⏸ Suspender</button>
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
              <button (click)="line.quantity = line.quantity + 1" class="h-9 w-9 rounded-lg border border-gray-300 text-lg font-bold dark:border-gray-700 dark:text-gray-300">+</button>
              <span class="w-20 text-right text-sm font-semibold text-gray-800 dark:text-white/90">{{ clp(line.quantity * line.product.price) }}</span>
            </div>
          } @empty {
            <p class="py-10 text-center text-sm text-gray-400">Toca un producto o escanea<br />para empezar la venta</p>
          }
        </div>

        <div class="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-gray-500">Descuento</span>
            <div class="flex items-center gap-1.5">
              @for (pct of [5, 10]; track pct) {
                <button (click)="setDiscountPct(pct)"
                  class="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">{{ pct }}%</button>
              }
              <input type="number" [(ngModel)]="discount" (ngModelChange)="clampDiscount()" min="0" step="1" inputmode="numeric" placeholder="$"
                class="h-9 w-24 rounded-lg border border-gray-300 bg-transparent px-2 text-right text-sm dark:border-gray-700 dark:text-white/90" />
            </div>
          </div>
          <div class="mt-2 flex justify-between text-xs text-gray-400">
            <span>Neto {{ clp(neto) }}</span><span>IVA 19% {{ clp(totalFinal - neto) }}</span>
          </div>
          <div class="mt-1 flex items-end justify-between">
            <span class="text-lg font-semibold text-gray-600 dark:text-gray-300">TOTAL</span>
            <span class="text-4xl font-extrabold tracking-tight text-gray-800 dark:text-white">{{ clp(totalFinal) }}</span>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2">
            @for (pm of payments; track pm.value) {
              <button (click)="payment = pm.value"
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
                <input type="number" [(ngModel)]="tendered" min="0" step="1" inputmode="numeric" [placeholder]="clp(totalFinal)"
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
                  <span class="text-sm font-medium text-gray-600 dark:text-gray-300">VUELTO</span>
                  <span class="text-2xl font-extrabold" [class]="vuelto < 0 ? 'text-error-500' : 'text-success-600'">{{ clp(vuelto) }}</span>
                </div>
              }
            </div>
          }

          <button (click)="checkout()" [disabled]="!cart.length || saving || (vuelto !== null && vuelto < 0)"
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
  ];
  error = '';
  saving = false;
  lastSale?: Sale;
  discount = 0;
  tendered?: number;
  quickBills = [1000, 2000, 5000, 10000, 20000];
  parked: { name: string; lines: CartLine[] }[] = [];
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
  get totalFinal() {
    return Math.max(this.total - Math.max(Number(this.discount) || 0, 0), 0);
  }
  get neto() {
    return Math.round(this.totalFinal / 1.19);
  }
  get vuelto(): number | null {
    if (this.payment !== 'EFECTIVO' || !this.tendered) return null;
    return Math.round(Number(this.tendered)) - this.totalFinal;
  }

  setDiscountPct(pct: number) {
    this.discount = Math.round((this.total * pct) / 100);
  }

  /** El descuento es CLP entero y nunca mayor al total de la venta. */
  clampDiscount() {
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
    this.saveParked();
    this.scanInput?.nativeElement.focus();
  }

  resume(i: number) {
    if (this.cart.length) this.park();
    const [t] = this.parked.splice(i, 1);
    this.cart = t.lines;
    this.saveParked();
  }

  private saveParked() {
    try {
      localStorage.setItem('ventra_parked', JSON.stringify(this.parked));
    } catch {}
  }

  selectCat(id: string) {
    this.catId = id;
    this.filterGrid();
  }

  filterGrid() {
    const q = this.scanCode.trim().toLowerCase();
    this.visible = this.products.filter(
      (p) =>
        (!this.catId || p.categoryId === this.catId) &&
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q)),
    );
  }

  addProduct(p: Product) {
    const existing = this.cart.find((l) => l.product.id === p.id);
    if (existing) existing.quantity++;
    else this.cart.push({ product: p, quantity: 1 });
    this.error = '';
    this.lastSale = undefined;
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
    this.api
      .createSale(
        this.cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        this.payment,
        Math.max(Number(this.discount) || 0, 0),
        this.payment === 'EFECTIVO' && this.tendered ? Number(this.tendered) : undefined,
      )
      .subscribe({
        next: (s) => {
          this.lastSale = s;
          this.cart = [];
          this.discount = 0;
          this.tendered = undefined;
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
