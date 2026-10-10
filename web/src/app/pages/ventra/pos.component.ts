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
                <img [src]="api.fileUrl(p.imageUrl)" class="mb-2 h-16 w-full rounded-lg object-cover" [alt]="p.name" />
              } @else {
                <div class="mb-2 flex h-16 w-full items-center justify-center rounded-lg bg-gray-100 text-2xl dark:bg-gray-800">🛒</div>
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
        <h3 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">🧾 Venta actual</h3>

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
          <div class="flex justify-between text-xs text-gray-400">
            <span>Neto {{ clp(neto) }}</span><span>IVA 19% {{ clp(total - neto) }}</span>
          </div>
          <div class="mt-1 flex items-end justify-between">
            <span class="text-lg font-semibold text-gray-600 dark:text-gray-300">TOTAL</span>
            <span class="text-4xl font-extrabold tracking-tight text-gray-800 dark:text-white">{{ clp(total) }}</span>
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

          <button (click)="checkout()" [disabled]="!cart.length || saving"
            class="mt-3 h-16 w-full rounded-xl bg-success-500 text-xl font-bold text-white transition hover:bg-success-600 active:scale-[0.99] disabled:opacity-40">
            {{ saving ? 'Procesando…' : '💵 COBRAR ' + (cart.length ? clp(total) : '') }}
          </button>

          @if (lastSale) {
            <div class="mt-3 rounded-xl bg-success-50 p-4 dark:bg-success-500/15">
              <p class="font-semibold text-success-700 dark:text-success-400">✓ Venta N° {{ lastSale.number }} — boleta folio {{ lastSale.boleta?.folio }}</p>
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
  get neto() {
    return Math.round(this.total / 1.19);
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
      )
      .subscribe({
        next: (s) => {
          this.lastSale = s;
          this.cart = [];
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
