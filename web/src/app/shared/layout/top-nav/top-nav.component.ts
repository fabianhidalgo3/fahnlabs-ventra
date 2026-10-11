import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { SafeHtmlPipe } from '../../pipe/safe-html.pipe';
import { NAV_LINKS, NavLink } from './nav-links';

/** Navegación horizontal SOLO para móvil/tablet (en desktop manda el sidebar). */
@Component({
  selector: 'app-ventra-top-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  template: `
    <nav class="sticky top-[73px] z-40 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 xl:hidden">
      <div class="flex items-center gap-1 overflow-x-auto px-3 py-2">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path"
            routerLinkActive="!bg-brand-50 !text-brand-600 dark:!bg-brand-500/15 dark:!text-brand-400"
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
    this.links = NAV_LINKS.filter(
      (l) => (!l.adminOnly || auth.isAdmin) && (!l.superOnly || auth.isSuper),
    );
    if (auth.isAdmin) {
      this.links = [...this.links].sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : 0));
    }
  }
}
