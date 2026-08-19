import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService, Product, Sale } from '../../core/api.service';
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
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div class="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Punto de venta</h3>
        <p class="mb-4 text-sm text-gray-500">Escanea con la pistola lectora o escribe el código / nombre y presiona Enter.</p>
        <input #scanInput [(ngModel)]="scanCode" (keydown.enter)="addByCode()" autofocus
          placeholder="🔍 Escanear código de barras…"
          class="mb-4 h-12 w-full rounded-lg border-2 border-brand-300 bg-transparent px-4 text-base focus:border-brand-500 focus:outline-none dark:text-white/90" />

        @if (error) { <p class="mb-3 text-sm text-error-600">{{ error }}</p> }

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th class="py-3 pr-4">Producto</th><th class="py-3 pr-4 text-right">Precio</th>
                <th class="py-3 pr-4 text-center">Cantidad</th><th class="py-3 pr-4 text-right">Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (line of cart; track line.product.id) {
                <tr class="border-b border-gray-50 dark:border-gray-800/50">
                  <td class="py-3 pr-4">
                    <p class="font-medium text-gray-800 dark:text-white/90">{{ line.product.name }}</p>
                    <p class="text-xs text-gray-400">{{ line.product.barcode }}</p>
                  </td>
                  <td class="py-3 pr-4 text-right text-gray-600 dark:text-gray-400">{{ clp(line.product.price) }}</td>
                  <td class="py-3 pr-4">
                    <div class="flex items-center justify-center gap-2">
                      <button (click)="line.quantity = line.quantity - 1; cleanZero()" class="h-7 w-7 rounded border border-gray-300 dark:border-gray-700 dark:text-gray-300">−</button>
                      <span class="w-8 text-center font-medium text-gray-800 dark:text-white/90">{{ line.quantity }}</span>
                      <button (click)="line.quantity = line.quantity + 1" class="h-7 w-7 rounded border border-gray-300 dark:border-gray-700 dark:text-gray-300">+</button>
                    </div>
                  </td>
                  <td class="py-3 pr-4 text-right font-medium text-gray-800 dark:text-white/90">{{ clp(line.quantity * line.product.price) }}</td>
                  <td class="py-3"><button (click)="removeLine(line)" class="text-error-500">✕</button></td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="py-10 text-center text-gray-400">Carrito vacío — escanea un producto</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] h-fit">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Resumen</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between text-gray-500"><span>Neto</span><span>{{ clp(neto) }}</span></div>
          <div class="flex justify-between text-gray-500"><span>IVA 19%</span><span>{{ clp(total - neto) }}</span></div>
          <div class="flex justify-between border-t border-gray-100 pt-2 text-lg font-bold text-gray-800 dark:border-gray-800 dark:text-white/90">
            <span>Total</span><span>{{ clp(total) }}</span>
          </div>
        </div>
        <label class="mb-1 mt-5 block text-sm text-gray-500">Medio de pago</label>
        <select [(ngModel)]="payment" class="mb-4 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
          <option value="EFECTIVO">Efectivo</option>
          <option value="DEBITO">Débito</option>
          <option value="CREDITO">Crédito</option>
          <option value="TRANSFERENCIA">Transferencia</option>
        </select>
        <button (click)="checkout()" [disabled]="!cart.length || saving"
          class="w-full rounded-lg bg-brand-500 py-3 font-medium text-white hover:bg-brand-600 disabled:opacity-40">
          {{ saving ? 'Procesando…' : 'Cobrar y emitir boleta' }}
        </button>

        @if (lastSale) {
          <div class="mt-4 rounded-lg bg-success-50 p-4 text-sm dark:bg-success-500/15">
            <p class="font-medium text-success-700 dark:text-success-400">✓ Venta N° {{ lastSale.number }} registrada</p>
            <a [href]="api.fileUrl(lastSale.boleta?.pdfPath)" target="_blank" class="text-brand-500 hover:underline">
              Ver boleta electrónica (folio {{ lastSale.boleta?.folio }})
            </a>
          </div>
        }
      </div>
    </div>
  `,
})
export class VentraPosComponent implements OnInit, OnDestroy {
  cart: CartLine[] = [];
  scanCode = '';
  payment = 'EFECTIVO';
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
    // Productos elegidos desde el buscador global del header
    this.busSub = this.posBus.add$.subscribe((p) => this.addProduct(p));
  }

  ngOnDestroy() {
    this.busSub?.unsubscribe();
  }

  addProduct(p: Product) {
    const existing = this.cart.find((l) => l.product.id === p.id);
    if (existing) existing.quantity++;
    else this.cart.push({ product: p, quantity: 1 });
    this.error = '';
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

  addByCode() {
    const code = this.scanCode.trim();
    if (!code) return;
    this.error = '';
    this.api.byBarcode(code).subscribe({
      next: (p) => {
        this.addProduct(p);
        this.scanCode = '';
        this.scanInput?.nativeElement.focus();
      },
      error: () => (this.error = `No existe producto con código "${code}"`),
    });
  }

  cleanZero() {
    this.cart = this.cart.filter((l) => l.quantity > 0);
  }

  removeLine(line: CartLine) {
    this.cart = this.cart.filter((l) => l !== line);
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
          this.scanInput?.nativeElement.focus();
        },
        error: (e) => {
          this.error = e?.error?.message ?? 'Error al crear la venta';
          this.saving = false;
        },
      });
  }
}
