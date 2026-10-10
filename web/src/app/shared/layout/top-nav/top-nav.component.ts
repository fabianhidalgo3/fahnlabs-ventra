import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { SafeHtmlPipe } from '../../pipe/safe-html.pipe';

interface NavLink {
  name: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
}

// Iconos estilo linea (Lucide/Feather): stroke currentColor, 20x20
const icon = (paths: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICONS = {
  carrito: icon(
    '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  ),
  caja: icon(
    '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
  ),
  recibo: icon(
    '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>',
  ),
  barras: icon(
    '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  ),
  caja_paquete: icon(
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>',
  ),
  reloj: icon('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  etiqueta: icon(
    '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  ),
  documento: icon(
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  ),
  chispa: icon(
    '<path d="M9.9 3.6 11.3 7.5a2 2 0 0 0 1.2 1.2l3.9 1.4-3.9 1.4a2 2 0 0 0-1.2 1.2l-1.4 3.9-1.4-3.9a2 2 0 0 0-1.2-1.2L3.4 10.1l3.9-1.4a2 2 0 0 0 1.2-1.2Z"/><path d="M19 3v4"/><path d="M21 5h-4"/><path d="M17 17v4"/><path d="M19 19h-4"/>',
  ),
  linea: icon('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>'),
  usuario: icon(
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  ),
};

@Component({
  selector: 'app-ventra-top-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  template: `
    <nav class="sticky top-[73px] z-40 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="mx-auto flex max-w-(--breakpoint-2xl) items-center gap-1 overflow-x-auto px-3 py-2 md:px-6">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" routerLinkActive="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
            [routerLinkActiveOptions]="{ exact: l.path === '/' }"
            class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]">
            <span class="flex h-5 w-5 items-center justify-center" [innerHTML]="l.icon | safeHtml"></span>{{ l.name }}
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
      { name: 'Punto de venta', path: '/pos', icon: ICONS.carrito },
      { name: 'Caja', path: '/caja', icon: ICONS.caja },
      { name: 'Ventas', path: '/ventas', icon: ICONS.recibo },
      { name: 'Ofertas', path: '/ofertas', icon: ICONS.etiqueta },
      { name: 'Dashboard', path: '/', icon: ICONS.barras },
      { name: 'Productos', path: '/productos', icon: ICONS.caja_paquete },
      { name: 'Vencimientos', path: '/vencimientos', icon: ICONS.reloj },
      { name: 'Guías y facturas', path: '/documentos', icon: ICONS.documento },
      { name: 'Asistente IA', path: '/asistente', icon: ICONS.chispa },
      { name: 'Reportes', path: '/reportes', icon: ICONS.linea, adminOnly: true },
      { name: 'Usuarios', path: '/usuarios', icon: ICONS.usuario, adminOnly: true },
    ];
    this.links = all.filter((l) => !l.adminOnly || auth.isAdmin);
    if (auth.isAdmin) {
      // El admin parte mirando el dashboard; orden más de gestión
      this.links.sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : 0));
    }
  }
}
