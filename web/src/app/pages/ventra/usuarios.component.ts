import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../core/api.service';
import { PageHeaderComponent } from '../../shared/components/ventra/page-header.component';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'VENDEDOR';
  active: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-ventra-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Usuarios" subtitle="Cuentas y perfiles de acceso">
      <span class="text-sm text-gray-400">{{ users.length }} usuarios</span>
      <button (click)="openForm()" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">+ Nuevo usuario</button>
    </app-page-header>

    @if (showForm) {
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h4 class="mb-3 font-semibold text-gray-800 dark:text-white/90">{{ editing ? 'Editar' : 'Nuevo' }} usuario</h4>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input [(ngModel)]="form.name" placeholder="Nombre *" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          <input [(ngModel)]="form.email" [disabled]="!!editing" placeholder="Email *" type="email" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          <input [(ngModel)]="form.password" [placeholder]="editing ? 'Nueva contraseña (opcional)' : 'Contraseña * (mín. 6)'" type="password" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          <select [(ngModel)]="form.role" class="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
            <option value="VENDEDOR">Vendedor</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        @if (errores.length) {
          <ul class="mt-3 list-inside list-disc text-xs text-error-500">
            @for (e of errores; track e) { <li>{{ e }}</li> }
          </ul>
        }
        @if (error) { <p class="mt-3 text-sm text-error-600">{{ error }}</p> }
        <div class="mt-4 flex gap-2">
          <button (click)="save()" [disabled]="errores.length > 0" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">Guardar</button>
          <button (click)="showForm = false" class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
        </div>
      </div>
    }

    <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-800 dark:text-gray-500">
            <th class="px-5 py-3">Nombre</th><th class="px-5 py-3">Email</th><th class="px-5 py-3">Perfil</th>
            <th class="px-5 py-3">Estado</th><th class="px-5 py-3">Creado</th><th class="px-5 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (u of users; track u.id) {
            <tr class="border-b border-gray-50 dark:border-gray-800/50">
              <td class="px-5 py-3 font-medium text-gray-800 dark:text-white/90">{{ u.name }}</td>
              <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ u.email }}</td>
              <td class="px-5 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium"
                  [class]="u.role === 'ADMIN' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'">
                  {{ u.role === 'ADMIN' ? 'Administrador' : 'Vendedor' }}
                </span>
              </td>
              <td class="px-5 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium"
                  [class]="u.active ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400' : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400'">
                  {{ u.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ u.createdAt | date: 'dd/MM/yyyy' }}</td>
              <td class="px-5 py-3">
                <div class="flex gap-2 text-xs">
                  <button (click)="openForm(u)" class="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:text-gray-300">Editar</button>
                  @if (u.active) {
                    <button (click)="deactivate(u)" class="rounded border border-error-300 px-2 py-1 text-error-600">Desactivar</button>
                  } @else {
                    <button (click)="activate(u)" class="rounded border border-success-300 px-2 py-1 text-success-600">Activar</button>
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
export class VentraUsuariosComponent implements OnInit {
  users: AppUser[] = [];
  showForm = false;
  editing?: AppUser;
  error = '';
  form: { name?: string; email?: string; password?: string; role: 'ADMIN' | 'VENDEDOR' } = { role: 'VENDEDOR' };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.http.get<AppUser[]>(`${API_URL}/users`).subscribe((u) => (this.users = u));
  }

  openForm(u?: AppUser) {
    this.editing = u;
    this.form = u ? { name: u.name, email: u.email, role: u.role } : { role: 'VENDEDOR' };
    this.error = '';
    this.showForm = true;
  }

  get errores(): string[] {
    const e: string[] = [];
    if ((this.form.name?.trim().length ?? 0) < 2) e.push('Nombre: mínimo 2 caracteres');
    if (!this.editing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email ?? ''))
      e.push('Email con formato válido (nombre@dominio.cl)');
    if (!this.editing && (this.form.password?.length ?? 0) < 6)
      e.push('Contraseña: mínimo 6 caracteres');
    if (this.editing && this.form.password && this.form.password.length < 6)
      e.push('La nueva contraseña debe tener mínimo 6 caracteres');
    return e;
  }

  save() {
    if (this.errores.length) return;
    this.error = '';
    const done = () => {
      this.showForm = false;
      this.load();
    };
    const fail = (e: { error?: { message?: string | string[] } }) => {
      const m = e?.error?.message;
      this.error = Array.isArray(m) ? m.join(', ') : (m ?? 'Error al guardar');
    };
    if (this.editing) {
      const data: Record<string, unknown> = { name: this.form.name, role: this.form.role };
      if (this.form.password) data['password'] = this.form.password;
      this.http.patch(`${API_URL}/users/${this.editing.id}`, data).subscribe({ next: done, error: fail });
    } else {
      this.http.post(`${API_URL}/users`, this.form).subscribe({ next: done, error: fail });
    }
  }

  deactivate(u: AppUser) {
    if (!confirm(`¿Desactivar a ${u.name}? No podrá iniciar sesión.`)) return;
    this.http.delete(`${API_URL}/users/${u.id}`).subscribe(() => this.load());
  }

  activate(u: AppUser) {
    this.http.patch(`${API_URL}/users/${u.id}`, { active: true }).subscribe(() => this.load());
  }
}
