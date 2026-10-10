import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

interface NavLink {
  name: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-ventra-top-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="sticky top-[73px] z-40 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="mx-auto flex max-w-(--breakpoint-2xl) items-center gap-1 overflow-x-auto px-3 py-2 md:px-6">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" routerLinkActive="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
            [routerLinkActiveOptions]="{ exact: l.path === '/' }"
            class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]">
            <span>{{ l.icon }}</span>{{ l.name }}
          </a>
        }
      </div>
    </nav>
  `,
})
export class VentraTopNavComponent {
  links: NavLink[] = [];

  constructor(auth: AuthService) {
    const all: NavLink[] = [
      { name: 'Punto de venta', path: '/pos', icon: '🛒' },
      { name: 'Caja', path: '/caja', icon: '💰' },
      { name: 'Ventas', path: '/ventas', icon: '🧾' },
      { name: 'Dashboard', path: '/', icon: '📊' },
      { name: 'Productos', path: '/productos', icon: '📦' },
      { name: 'Vencimientos', path: '/vencimientos', icon: '⏰' },
      { name: 'Guías y facturas', path: '/documentos', icon: '📄' },
      { name: 'Asistente IA', path: '/asistente', icon: '✨' },
      { name: 'Reportes', path: '/reportes', icon: '📈', adminOnly: true },
      { name: 'Usuarios', path: '/usuarios', icon: '👤', adminOnly: true },
    ];
    this.links = all.filter((l) => !l.adminOnly || auth.isAdmin);
    if (auth.isAdmin) {
      // El admin parte mirando el dashboard; orden más de gestión
      this.links.sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : 0));
    }
  }
}
