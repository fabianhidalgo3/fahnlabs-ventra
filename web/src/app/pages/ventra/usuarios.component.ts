import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AgGridAngular } from 'ag-grid-angular';
import type { CellClickedEvent, ColDef, ICellRendererParams } from 'ag-grid-community';
import { API_URL } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { GRID_TEXT, ventraGridTheme } from '../../core/grid';
import { ThemeService } from '../../core/theme.service';
import { ViewportService } from '../../core/viewport.service';
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
  imports: [FormsModule, PageHeaderComponent, AgGridAngular],
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

    @if (vp.esMovil()) {
      <div class="space-y-3">
        @for (u of users; track u.id) {
          <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p class="font-medium text-gray-800 dark:text-white/90">{{ u.name }}</p>
            <p class="text-xs text-gray-400">{{ u.email }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2.5 py-1 text-xs font-medium"
                [class]="u.role === 'ADMIN'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'">
                {{ u.role === 'ADMIN' ? 'Administrador' : 'Vendedor' }}
              </span>
              <span class="rounded-full px-2.5 py-1 text-xs font-medium"
                [class]="u.active
                  ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'
                  : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400'">
                {{ u.active ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <p class="mt-2 text-xs text-gray-400">Creado: {{ fmtDate(u.createdAt) }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button (click)="openForm(u)" class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:text-gray-300">Editar</button>
              @if (u.active) {
                <button (click)="deactivate(u)" class="rounded border border-error-300 px-2 py-1 text-xs text-error-600">Desactivar</button>
              } @else {
                <button (click)="activate(u)" class="rounded border border-success-300 px-2 py-1 text-xs text-success-600">Activar</button>
              }
            </div>
          </div>
        } @empty {
          <p class="text-sm text-gray-400">Sin usuarios.</p>
        }
      </div>
    } @else {
      <ag-grid-angular
        class="w-full"
        [theme]="theme()"
        [rowData]="users"
        [columnDefs]="cols"
        [defaultColDef]="defaultColDef"
        domLayout="autoHeight"
        [localeText]="GRID_TEXT"
        (cellClicked)="onCell($event)"
      />
    }
  `,
})
export class VentraUsuariosComponent implements OnInit {
  users: AppUser[] = [];
  showForm = false;
  editing?: AppUser;
  error = '';
  form: { name?: string; email?: string; password?: string; role: 'ADMIN' | 'VENDEDOR' } = { role: 'VENDEDOR' };

  private themeSvc = inject(ThemeService);
  public vp = inject(ViewportService);
  theme = computed(() => ventraGridTheme(this.themeSvc.isDark()));
  readonly GRID_TEXT = GRID_TEXT;

  defaultColDef: ColDef = { sortable: true, resizable: true, flex: 1, minWidth: 110 };

  cols: ColDef<AppUser>[] = [
    {
      headerName: 'Nombre',
      field: 'name',
      minWidth: 160,
      cellClass: 'font-medium text-gray-800 dark:text-white/90',
    },
    { headerName: 'Email', field: 'email', minWidth: 200 },
    {
      headerName: 'Perfil',
      field: 'role',
      valueGetter: (p) => (p.data?.role === 'ADMIN' ? 'Administrador' : 'Vendedor'),
      cellRenderer: (p: ICellRendererParams<AppUser>) => {
        const u = p.data;
        if (!u) return '';
        const cls =
          u.role === 'ADMIN'
            ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
        return `<span class="rounded-full px-2.5 py-1 text-xs font-medium ${cls}">${u.role === 'ADMIN' ? 'Administrador' : 'Vendedor'}</span>`;
      },
    },
    {
      headerName: 'Estado',
      field: 'active',
      valueGetter: (p) => (p.data?.active ? 'Activo' : 'Inactivo'),
      cellRenderer: (p: ICellRendererParams<AppUser>) => {
        const u = p.data;
        if (!u) return '';
        const cls = u.active
          ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'
          : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400';
        return `<span class="rounded-full px-2.5 py-1 text-xs font-medium ${cls}">${u.active ? 'Activo' : 'Inactivo'}</span>`;
      },
    },
    {
      headerName: 'Creado',
      field: 'createdAt',
      valueFormatter: (p) => this.fmtDate(p.value),
    },
    {
      headerName: 'Acciones',
      colId: 'acciones',
      sortable: false,
      minWidth: 170,
      cellRenderer: (p: ICellRendererParams<AppUser>) => {
        const u = p.data;
        if (!u) return '';
        const edit = `<button data-action="edit" class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:text-gray-300">Editar</button>`;
        const toggle = u.active
          ? `<button data-action="deactivate" class="rounded border border-error-300 px-2 py-1 text-xs text-error-600">Desactivar</button>`
          : `<button data-action="activate" class="rounded border border-success-300 px-2 py-1 text-xs text-success-600">Activar</button>`;
        return `<div class="flex gap-2">${edit}${toggle}</div>`;
      },
    },
  ];

  constructor(
    private http: HttpClient,
    private confirm: ConfirmService,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.http.get<AppUser[]>(`${API_URL}/users`).subscribe((u) => (this.users = u));
  }

  onCell(e: CellClickedEvent<AppUser>) {
    const target = e.event?.target as HTMLElement | null;
    const action = target?.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (!action || !e.data) return;
    if (action === 'edit') this.openForm(e.data);
    else if (action === 'deactivate') this.deactivate(e.data);
    else if (action === 'activate') this.activate(e.data);
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

  async deactivate(u: AppUser) {
    if (
      !(await this.confirm.confirmar({
        titulo: `¿Desactivar a ${u.name}?`,
        mensaje: 'No podrá iniciar sesión.',
        accion: 'Desactivar',
        tono: 'peligro',
      }))
    )
      return;
    this.http.delete(`${API_URL}/users/${u.id}`).subscribe(() => this.load());
  }

  activate(u: AppUser) {
    this.http.patch(`${API_URL}/users/${u.id}`, { active: true }).subscribe(() => this.load());
  }

  fmtDate(v?: string | null): string {
    if (!v) return '';
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}
