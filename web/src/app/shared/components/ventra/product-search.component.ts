import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { ApiService, Product } from '../../../core/api.service';
import { PosBusService } from '../../../core/pos-bus.service';

@Component({
  selector: 'app-ventra-product-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <span class="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2">
        <svg class="fill-gray-500 dark:fill-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path fill-rule="evenodd" clip-rule="evenodd"
            d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z" fill="" />
        </svg>
      </span>
      <input #inp type="text" [(ngModel)]="term" (input)="onInput()" (keydown.escape)="close()"
        (focus)="onInput()" (blur)="closeSoon()"
        [placeholder]="isPos ? 'Buscar producto para vender…' : 'Buscar producto (nombre, SKU o código)…'"
        class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]" />
      <span class="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
        <span>⌘</span><span>K</span>
      </span>

      @if (open && results.length) {
        <div class="absolute z-50 mt-2 w-full min-w-[430px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
          @for (p of results; track p.id) {
            <div (mousedown)="$event.preventDefault()" (click)="pick(p)"
              class="flex cursor-pointer items-center gap-3 border-b border-gray-50 px-4 py-2.5 last:border-0 hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-white/[0.03]">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-800 dark:text-white/90">{{ p.name }}</p>
                <p class="flex items-center gap-2 text-xs text-gray-400">
                  <span>{{ p.sku }}</span>
                  <button (click)="copy($event, p, 'sku')" title="Copiar SKU"
                    class="rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700">
                    @if (copied === p.id + 'sku') { <span class="text-success-600">✓</span> } @else { ⧉ }
                  </button>
                  <span>· {{ p.barcode }}</span>
                  <button (click)="copy($event, p, 'barcode')" title="Copiar código de barras"
                    class="rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700">
                    @if (copied === p.id + 'barcode') { <span class="text-success-600">✓</span> } @else { ⧉ }
                  </button>
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold text-gray-800 dark:text-white/90">{{ clp(p.price) }}</p>
                <p class="text-xs" [class]="p.stock <= p.minStock ? 'text-error-500' : 'text-gray-400'">stock {{ p.stock }}</p>
              </div>
              @if (isPos) {
                <span class="rounded-lg bg-brand-500 px-2 py-1 text-xs font-medium text-white">+ Vender</span>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProductSearchComponent implements OnDestroy {
  term = '';
  results: Product[] = [];
  open = false;
  copied = '';
  private search$ = new Subject<string>();
  private sub: Subscription;
  @ViewChild('inp') inp!: ElementRef<HTMLInputElement>;

  constructor(
    private api: ApiService,
    private router: Router,
    private posBus: PosBusService,
  ) {
    this.sub = this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((t) => (t.trim().length >= 2 ? this.api.products(t.trim()) : of([]))),
      )
      .subscribe((r) => {
        this.results = r.slice(0, 8);
        this.open = this.results.length > 0;
      });
  }

  /** Compatibilidad con el atajo ⌘K del header (usa searchInput.nativeElement.focus()). */
  get nativeElement(): HTMLInputElement {
    return this.inp.nativeElement;
  }

  get isPos() {
    return this.router.url.startsWith('/pos');
  }

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  onInput() {
    this.search$.next(this.term);
  }

  copy(ev: Event, p: Product, field: 'sku' | 'barcode') {
    ev.stopPropagation();
    navigator.clipboard.writeText(field === 'sku' ? p.sku : p.barcode);
    this.copied = p.id + field;
    setTimeout(() => (this.copied = ''), 1200);
  }

  pick(p: Product) {
    if (this.isPos) {
      this.posBus.add(p);
      this.term = '';
      this.results = [];
      this.open = false;
    } else {
      navigator.clipboard.writeText(p.barcode);
      this.copied = p.id + 'barcode';
      setTimeout(() => (this.copied = ''), 1200);
    }
  }

  close() {
    this.open = false;
  }

  closeSoon() {
    setTimeout(() => (this.open = false), 150);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
