import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, FiadoCliente, FiadoDetalle, whatsappUrl } from '../../core/api.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';
import { ClpMonedaDirective } from '../../shared/directives/clp-moneda.directive';

@Component({
  selector: 'app-ventra-fiado',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ClpMonedaDirective],
  template: `
    <app-page-header title="Fiado" subtitle="Clientes con cuenta pendiente, ventas fiadas y abonos">
      <span class="rounded-full bg-error-50 px-3 py-1.5 text-sm font-semibold text-error-600 dark:bg-error-500/15 dark:text-error-400">
        Por cobrar: {{ clp(totalDeuda) }}
      </span>
      <button (click)="showForm = !showForm"
        class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600">
        + Nuevo cliente
      </button>
    </app-page-header>

    @if (showForm) {
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Nombre *</label>
            <input [(ngModel)]="form.name" placeholder="Nombre del cliente" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono</label>
            <input [(ngModel)]="form.phone" placeholder="+569…" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Nota</label>
            <input [(ngModel)]="form.note" placeholder="Vecino del 203, etc." class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          <button (click)="crear()" [disabled]="!form.name?.trim()"
            class="inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">Guardar</button>
          <button (click)="showForm = false"
            class="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">Cancelar</button>
        </div>
      </div>
    }

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      @for (c of clientes; track c.id) {
        <button (click)="abrir(c)"
          class="rounded-2xl border bg-white p-4 text-left transition hover:ring-2 hover:ring-brand-500/30 dark:bg-gray-900"
          [class]="c.deuda > 0 ? 'border-error-200 dark:border-error-500/30' : 'border-gray-200 dark:border-gray-800'">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate font-semibold text-gray-900 dark:text-white">{{ c.name }}</p>
              @if (c.phone) { <p class="text-xs text-gray-400">{{ c.phone }}</p> }
              @if (c.note) { <p class="truncate text-xs text-gray-400">{{ c.note }}</p> }
            </div>
            <div class="text-right">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Deuda</p>
              <p class="text-xl font-bold" [class]="c.deuda > 0 ? 'text-error-500' : 'text-success-600'">{{ clp(c.deuda) }}</p>
            </div>
          </div>
        </button>
      } @empty {
        <div class="col-span-full py-12 text-center">
          <p class="text-sm text-gray-400">Sin clientes de fiado aún — crea el primero o vende con medio de pago "Fiado" en el POS</p>
        </div>
      }
    </div>

    <!-- Detalle del cliente -->
    @if (det) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" (click)="det = undefined"></div>
        <div class="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <button (click)="det = undefined" aria-label="Cerrar"
            class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">✕</button>
          <h3 class="pr-8 text-base font-semibold text-gray-900 dark:text-white">{{ det.name }}</h3>
          <p class="mb-3 text-sm text-gray-500">
            {{ det.phone ?? 'sin teléfono' }} · Fiado {{ clp(det.fiado) }} · Abonado {{ clp(det.abonado) }} ·
            <span class="font-bold" [class]="det.deuda > 0 ? 'text-error-500' : 'text-success-600'">Debe {{ clp(det.deuda) }}</span>
          </p>

          @if (det.deuda > 0) {
            <div class="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-500">Abonar $</label>
                <input clpMoneda type="text" inputmode="numeric" [(ngModel)]="abono" placeholder="0"
                  class="h-10 w-32 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
              </div>
              <button (click)="abono = det.deuda" class="h-10 rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:text-gray-300">Total</button>
              <button (click)="abonar()" [disabled]="!abono || abono <= 0 || abono > det.deuda"
                class="inline-flex h-10 items-center rounded-lg bg-success-500 px-4 text-sm font-medium text-white hover:bg-success-600 disabled:opacity-40">
                Registrar abono
              </button>
              @if (det.phone) {
                <a [href]="waCobro()" target="_blank"
                  class="inline-flex h-10 items-center rounded-lg border border-success-500 px-3 text-xs font-medium text-success-600">📲 Recordar por WhatsApp</a>
              }
            </div>
            @if (errorAbono) { <p class="mb-2 text-sm text-error-600">{{ errorAbono }}</p> }
          }

          <p class="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Movimientos</p>
          <div class="min-h-0 flex-1 space-y-1 overflow-y-auto">
            @for (m of det.movimientos; track $index) {
              <div class="flex items-center justify-between gap-2 border-b border-gray-50 py-2 text-sm dark:border-gray-800/50">
                <div class="min-w-0">
                  <p class="truncate text-gray-800 dark:text-white/90">{{ m.detalle }}</p>
                  <p class="text-xs text-gray-400">{{ m.fecha | date: 'dd/MM/yyyy HH:mm' }}</p>
                </div>
                <span class="shrink-0 font-semibold" [class]="m.tipo === 'FIADO' ? 'text-error-500' : 'text-success-600'">
                  {{ m.tipo === 'FIADO' ? '+' : '−' }}{{ clp(m.monto) }}
                </span>
              </div>
            } @empty {
              <p class="py-6 text-center text-sm text-gray-400">Sin movimientos</p>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class VentraFiadoComponent implements OnInit {
  clientes: FiadoCliente[] = [];
  det?: FiadoDetalle;
  showForm = false;
  abono?: number;
  errorAbono = '';
  form: { name?: string; phone?: string; note?: string } = {};

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  get totalDeuda() {
    return this.clientes.reduce((s, c) => s + c.deuda, 0);
  }

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  load() {
    this.api.fiadoClientes().subscribe((c) => (this.clientes = c));
  }

  crear() {
    if (!this.form.name?.trim()) return;
    this.api.fiadoCrearCliente(this.form as { name: string }).subscribe(() => {
      this.form = {};
      this.showForm = false;
      this.load();
    });
  }

  abrir(c: FiadoCliente) {
    this.abono = undefined;
    this.errorAbono = '';
    this.api.fiadoDetalle(c.id).subscribe((d) => (this.det = d));
  }

  abonar() {
    if (!this.det || !this.abono) return;
    this.errorAbono = '';
    this.api.fiadoAbonar(this.det.id, this.abono, 'Abono en caja').subscribe({
      next: (d) => {
        this.det = d;
        this.abono = undefined;
        this.load();
      },
      error: (e) => (this.errorAbono = e?.error?.message ?? 'Error al abonar'),
    });
  }

  waCobro(): string {
    if (!this.det) return '';
    return whatsappUrl(
      `Hola ${this.det.name} 👋 Te recordamos que tienes una cuenta pendiente de ${this.clp(this.det.deuda)} en el negocio. ¡Gracias!`,
    );
  }
}
