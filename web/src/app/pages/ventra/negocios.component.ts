import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Negocio, NegocioUsuario } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';

interface ApiError {
  error?: { message?: string | string[] };
}

@Component({
  selector: 'app-ventra-negocios',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Negocios" subtitle="Negocios registrados y sus usuarios">
      <span class="text-sm text-gray-400">{{ negocios.length }} negocios</span>
      <button (click)="toggleForm()" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">+ Nuevo negocio</button>
    </app-page-header>

    <!-- Formulario crear negocio -->
    @if (showForm) {
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">Nuevo negocio</h4>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Nombre *</label>
            <input [(ngModel)]="form.name" placeholder="Minimarket Los Aromos" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">RUT</label>
            <input [(ngModel)]="form.rut" placeholder="76.123.456-7" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Dirección</label>
            <input [(ngModel)]="form.address" placeholder="Av. Siempre Viva 123" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono</label>
            <input [(ngModel)]="form.phone" placeholder="+56 9 1234 5678" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
          </div>
        </div>

        <h5 class="mb-3 mt-5 text-sm font-semibold text-gray-700 dark:text-gray-200">Administrador inicial</h5>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Nombre *</label>
            <input [(ngModel)]="form.adminName" placeholder="Nombre del administrador" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Email *</label>
            <input [(ngModel)]="form.adminEmail" type="email" placeholder="admin@negocio.cl" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Contraseña * (mín. 6)</label>
            <input [(ngModel)]="form.adminPassword" type="password" placeholder="••••••" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
          </div>
        </div>

        @if (errores.length) {
          <ul class="mt-3 list-inside list-disc text-xs text-error-500">
            @for (e of errores; track e) { <li>{{ e }}</li> }
          </ul>
        }
        @if (error) { <p class="mt-3 text-sm text-error-600">{{ error }}</p> }
        <div class="mt-4 flex gap-2">
          <button (click)="crear()" [disabled]="errores.length > 0 || saving" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">
            {{ saving ? 'Creando…' : 'Crear negocio' }}
          </button>
          <button (click)="showForm = false" class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
        </div>
      </div>
    }

    @if (errorGlobal) { <p class="mb-4 text-sm text-error-600">{{ errorGlobal }}</p> }

    <!-- Grid de negocios -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      @for (n of negocios; track n.id) {
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-bold text-gray-800 dark:text-white/90">{{ n.name }}</p>
              <p class="truncate text-xs text-gray-400">
                @if (n.rut) { {{ n.rut }} }
                @if (n.rut && n.address) { · }
                @if (n.address) { {{ n.address }} }
              </p>
              @if (n.phone) { <p class="text-xs text-gray-400">{{ n.phone }}</p> }
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
              [class]="n.active
                ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'
                : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400'">
              {{ n.active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>

          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {{ n.contadores.productos }} productos · {{ n.contadores.ventas }} ventas
          </p>

          <!-- Usuarios -->
          <div class="mt-4 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Usuarios ({{ n.usuarios.length }})</p>
            @for (u of n.usuarios; track u.id) {
              <div class="flex flex-wrap items-center gap-2">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-gray-800 dark:text-white/90">{{ u.name }}</p>
                  <p class="truncate text-xs text-gray-400">{{ u.email }}</p>
                </div>
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" [class]="roleClass(u)">{{ roleLabel(u) }}</span>
                <span class="rounded-full px-2.5 py-1 text-xs font-medium"
                  [class]="u.active
                    ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'
                    : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400'">
                  {{ u.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            } @empty {
              <p class="text-xs text-gray-400">Sin usuarios.</p>
            }
          </div>

          <!-- Mini-form nuevo usuario -->
          @if (userFormFor === n.id) {
            <div class="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input [(ngModel)]="userForm.name" placeholder="Nombre" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <input [(ngModel)]="userForm.email" type="email" placeholder="Email" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <input [(ngModel)]="userForm.password" type="password" placeholder="Contraseña (mín. 6)" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90" />
                <select [(ngModel)]="userForm.role" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white/90">
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              @if (erroresUsuario.length) {
                <ul class="mt-2 list-inside list-disc text-xs text-error-500">
                  @for (e of erroresUsuario; track e) { <li>{{ e }}</li> }
                </ul>
              }
              @if (userError) { <p class="mt-2 text-xs text-error-600">{{ userError }}</p> }
              <div class="mt-3 flex gap-2">
                <button (click)="crearUsuario(n)" [disabled]="erroresUsuario.length > 0 || savingUser" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">
                  {{ savingUser ? 'Guardando…' : 'Guardar' }}
                </button>
                <button (click)="userFormFor = null" class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
              </div>
            </div>
          }

          <!-- Acciones -->
          <div class="mt-4 flex flex-wrap gap-2">
            <button (click)="openUserForm(n)" class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:text-gray-300">+ Usuario</button>
            @if (n.active) {
              <button (click)="toggleActive(n)" class="rounded border border-error-300 px-2 py-1 text-xs text-error-600">Desactivar</button>
            } @else {
              <button (click)="toggleActive(n)" class="rounded border border-success-300 px-2 py-1 text-xs text-success-600">Activar</button>
            }
          </div>
        </div>
      } @empty {
        <p class="text-sm text-gray-400">Sin negocios registrados.</p>
      }
    </div>
  `,
})
export class VentraNegociosComponent implements OnInit {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  negocios: Negocio[] = [];
  showForm = false;
  saving = false;
  error = '';
  errorGlobal = '';
  form: {
    name?: string;
    rut?: string;
    address?: string;
    phone?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
  } = {};

  userFormFor: string | null = null;
  savingUser = false;
  userError = '';
  userForm: { name?: string; email?: string; password?: string; role: 'ADMIN' | 'VENDEDOR' } = {
    role: 'VENDEDOR',
  };

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.negocios().subscribe({
      next: (n) => (this.negocios = n),
      error: (e: ApiError) => (this.errorGlobal = this.msg(e, 'Error al cargar negocios')),
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm) {
      this.form = {};
      this.error = '';
    }
  }

  get errores(): string[] {
    const e: string[] = [];
    if ((this.form.name?.trim().length ?? 0) < 2) e.push('Nombre del negocio: mínimo 2 caracteres');
    if ((this.form.adminName?.trim().length ?? 0) < 2)
      e.push('Nombre del administrador: mínimo 2 caracteres');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.adminEmail ?? ''))
      e.push('Email del administrador con formato válido (nombre@dominio.cl)');
    if ((this.form.adminPassword?.length ?? 0) < 6)
      e.push('Contraseña del administrador: mínimo 6 caracteres');
    return e;
  }

  crear() {
    if (this.errores.length || this.saving) return;
    this.saving = true;
    this.error = '';
    this.api
      .crearNegocio({
        name: this.form.name!.trim(),
        rut: this.form.rut?.trim() || undefined,
        address: this.form.address?.trim() || undefined,
        phone: this.form.phone?.trim() || undefined,
        adminName: this.form.adminName!.trim(),
        adminEmail: this.form.adminEmail!.trim(),
        adminPassword: this.form.adminPassword!,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.showForm = false;
          this.load();
        },
        error: (e: ApiError) => {
          this.saving = false;
          this.error = this.msg(e, 'Error al crear el negocio');
        },
      });
  }

  openUserForm(n: Negocio) {
    this.userFormFor = n.id;
    this.userForm = { role: 'VENDEDOR' };
    this.userError = '';
  }

  get erroresUsuario(): string[] {
    const e: string[] = [];
    if ((this.userForm.name?.trim().length ?? 0) < 2) e.push('Nombre: mínimo 2 caracteres');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.userForm.email ?? ''))
      e.push('Email con formato válido (nombre@dominio.cl)');
    if ((this.userForm.password?.length ?? 0) < 6) e.push('Contraseña: mínimo 6 caracteres');
    return e;
  }

  crearUsuario(n: Negocio) {
    if (this.erroresUsuario.length || this.savingUser) return;
    this.savingUser = true;
    this.userError = '';
    this.api
      .crearUsuarioNegocio(n.id, {
        name: this.userForm.name!.trim(),
        email: this.userForm.email!.trim(),
        password: this.userForm.password!,
        role: this.userForm.role,
      })
      .subscribe({
        next: () => {
          this.savingUser = false;
          this.userFormFor = null;
          this.load();
        },
        error: (e: ApiError) => {
          this.savingUser = false;
          this.userError = this.msg(e, 'Error al crear el usuario');
        },
      });
  }

  async toggleActive(n: Negocio) {
    if (
      n.active &&
      !(await this.confirm.confirmar({
        titulo: `¿Desactivar "${n.name}"?`,
        mensaje: 'Sus usuarios no podrán iniciar sesión.',
        accion: 'Desactivar',
        tono: 'peligro',
      }))
    )
      return;
    this.api.updateNegocio(n.id, { active: !n.active }).subscribe({
      next: () => this.load(),
      error: (e: ApiError) => (this.errorGlobal = this.msg(e, 'Error al actualizar el negocio')),
    });
  }

  roleLabel(u: NegocioUsuario): string {
    return u.role === 'SUPERADMIN' ? 'Superadmin' : u.role === 'ADMIN' ? 'Administrador' : 'Vendedor';
  }

  roleClass(u: NegocioUsuario): string {
    if (u.role === 'SUPERADMIN')
      return 'bg-brand-900 text-white dark:bg-brand-500/25 dark:text-brand-300';
    if (u.role === 'ADMIN')
      return 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  }

  private msg(e: ApiError, fallback: string): string {
    const m = e?.error?.message;
    return Array.isArray(m) ? m.join(', ') : (m ?? fallback);
  }
}
