import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { SafeHtmlPipe } from '../../pipe/safe-html.pipe';
import { NAV_LINKS, NavLink } from '../top-nav/nav-links';

/** Sidebar compacto estilo sistemas de venta (Square/Shopify POS): colapsable a iconos. */
@Component({
  selector: 'app-ventra-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  template: `
    <aside
      class="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 xl:flex"
      [class]="colapsado() ? 'w-[72px]' : 'w-[232px]'"
    >
      <!-- Logo -->
      <div class="flex h-[73px] items-center border-b border-gray-200 dark:border-gray-800"
        [class]="colapsado() ? 'justify-center px-2' : 'px-5'">
        @if (colapsado()) {
          <a routerLink="/"><img src="/images/isotipo-ventra.svg" alt="Ventra" class="h-8 w-8" /></a>
        } @else {
          <a routerLink="/">
            <img src="/images/logo-ventra.svg" alt="Ventra" class="h-8 dark:hidden" />
            <img src="/images/logo-ventra-blanco.svg" alt="Ventra" class="hidden h-8 dark:block" />
          </a>
        }
      </div>

      <!-- Links -->
      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" [title]="colapsado() ? l.name : ''"
            routerLinkActive="!bg-brand-50 !text-brand-600 dark:!bg-brand-500/15 dark:!text-brand-400"
            [routerLinkActiveOptions]="{ exact: l.path === '/' }"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]"
            [class.justify-center]="colapsado()">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center" [innerHTML]="l.icon | safeHtml"></span>
            @if (!colapsado()) { <span class="truncate">{{ l.name }}</span> }
          </a>
        }
      </nav>

      <!-- Colapsar -->
      <button (click)="toggle()"
        class="flex items-center gap-3 border-t border-gray-200 px-3 py-3 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:border-gray-800 dark:hover:bg-white/[0.04] dark:hover:text-gray-300"
        [class.justify-center]="colapsado()" [title]="colapsado() ? 'Expandir menú' : ''">
        <svg class="h-5 w-5 shrink-0 transition-transform" [class.rotate-180]="colapsado()"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>
        </svg>
        @if (!colapsado()) { <span>Colapsar</span> }
      </button>
    </aside>
  `,
})
export class VentraSidebarComponent {
  links: NavLink[] = [];
  colapsado = signal(localStorage.getItem('ventra_sidebar') === 'colapsado');

  constructor(auth: AuthService) {
    this.links = NAV_LINKS.filter(
      (l) => (!l.adminOnly || auth.isAdmin) && (!l.superOnly || auth.isSuper),
    );
    if (auth.isAdmin) {
      this.links = [...this.links].sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : 0));
    }
  }

  toggle() {
    this.colapsado.update((v) => !v);
    try {
      localStorage.setItem('ventra_sidebar', this.colapsado() ? 'colapsado' : 'expandido');
    } catch {}
  }
}
