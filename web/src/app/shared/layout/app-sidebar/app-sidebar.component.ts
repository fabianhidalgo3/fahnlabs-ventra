import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, ChangeDetectorRef } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SafeHtmlPipe } from '../../pipe/safe-html.pipe';
import { SidebarWidgetComponent } from './app-sidebar-widget.component';
import { combineLatest, Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth.service';

type NavItem = {
  name: string;
  icon: string;
  path?: string;
  new?: boolean;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

@Component({
  selector: 'app-sidebar',
  imports: [
    CommonModule,
    RouterModule,
    SafeHtmlPipe,
    SidebarWidgetComponent
  ],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {

  // Main nav items
  navItems: NavItem[] = [
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM12.75 15C12.75 13.7574 13.7574 12.75 15 12.75H18.5C19.7426 12.75 20.75 13.7574 20.75 15V18.5C20.75 19.7427 19.7426 20.75 18.5 20.75H15C13.7574 20.75 12.75 19.7426 12.75 18.5V15Z" fill="currentColor"></path></svg>`,
      name: "Dashboard",
      path: "/",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M20 7L12 3L4 7V17L12 21L20 17V7ZM12 5.2L17.5 7.9L12 10.7L6.5 7.9L12 5.2ZM6 9.6L11 12.1V18.4L6 15.9V9.6ZM13 18.4V12.1L18 9.6V15.9L13 18.4Z" fill="currentColor"></path></svg>`,
      name: "Productos",
      path: "/productos",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 4H6.5L7 6H20L18 13H8.5L9 15H17V17H7.5L5.5 6H4V4ZM9 19.5C9 20.33 8.33 21 7.5 21C6.67 21 6 20.33 6 19.5C6 18.67 6.67 18 7.5 18C8.33 18 9 18.67 9 19.5ZM18 19.5C18 20.33 17.33 21 16.5 21C15.67 21 15 20.33 15 19.5C15 18.67 15.67 18 16.5 18C17.33 18 18 18.67 18 19.5Z" fill="currentColor"></path></svg>`,
      name: "Punto de venta",
      path: "/pos",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 5C4 3.9 4.9 3 6 3H18C19.1 3 20 3.9 20 5V7H4V5ZM4 9H20V19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19V9ZM7 12V14H11V12H7ZM13 12V14H17V12H13ZM7 16V18H11V16H7ZM13 16V18H17V16H13Z" fill="currentColor"></path></svg>`,
      name: "Ventas",
      path: "/ventas",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 6C3 4.9 3.9 4 5 4H19C20.1 4 21 4.9 21 6V9H3V6ZM3 11H21V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V11ZM6 14V17H10V14H6ZM15.5 13C14.1 13 13 14.1 13 15.5C13 16.9 14.1 18 15.5 18C16.9 18 18 16.9 18 15.5C18 14.1 16.9 13 15.5 13Z" fill="currentColor"></path></svg>`,
      name: "Caja",
      path: "/caja",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.5 7H11V13L16.2 16.1L17 14.9L12.5 12.2V7Z" fill="currentColor"></path></svg>`,
      name: "Vencimientos",
      path: "/vencimientos",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 2C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2H6ZM13 3.5L18.5 9H13V3.5ZM6 4H11V9C11 10.1 11.9 11 13 11H18V20H6V4ZM8 13V15H16V13H8ZM8 17V19H13V17H8Z" fill="currentColor"></path></svg>`,
      name: "Guías y facturas",
      path: "/documentos",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2ZM19 15L19.9 17.6L22.5 18.5L19.9 19.4L19 22L18.1 19.4L15.5 18.5L18.1 17.6L19 15ZM5 15L5.9 17.6L8.5 18.5L5.9 19.4L5 22L4.1 19.4L1.5 18.5L4.1 17.6L5 15Z" fill="currentColor"></path></svg>`,
      name: "Asistente IA",
      path: "/asistente",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 21V3H7V19H21V21H5ZM9 17V10H12V17H9ZM13.5 17V6H16.5V17H13.5ZM18 17V12H21V17H18Z" fill="currentColor"></path></svg>`,
      name: "Reportes",
      path: "/reportes",
    },
  ];
  // Others nav items
  othersItems: NavItem[] = [];

  openSubmenu: string | null | number = null;
  subMenuHeights: { [key: string]: number } = {};
  @ViewChildren('subMenu') subMenuRefs!: QueryList<ElementRef>;

  readonly isExpanded$;
  readonly isMobileOpen$;
  readonly isHovered$;

  private subscription: Subscription = new Subscription();

  constructor(
    public sidebarService: SidebarService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private auth: AuthService
  ) {
    if (this.auth.isAdmin) {
      this.navItems.push({
        icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4ZM10 8C10 6.9 10.9 6 12 6C13.1 6 14 6.9 14 8C14 9.1 13.1 10 12 10C10.9 10 10 9.1 10 8ZM12 13.5C9.33 13.5 4 14.84 4 17.5V20H20V17.5C20 14.84 14.67 13.5 12 13.5ZM6 17.5C6.22 16.78 9.31 15.5 12 15.5C14.7 15.5 17.8 16.79 18 17.5V18H6V17.5Z" fill="currentColor"></path></svg>`,
        name: "Usuarios",
        path: "/usuarios",
      });
    } else {
      this.navItems = this.navItems.filter((i) => i.name !== 'Reportes');
      const pos = this.navItems.find((i) => i.path === '/pos');
      if (pos) {
        this.navItems = [pos, ...this.navItems.filter((i) => i !== pos)];
      }
    }
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isHovered$ = this.sidebarService.isHovered$;
  }

  ngOnInit() {
    // Subscribe to router events
    this.subscription.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuFromRoute(this.router.url);
        }
      })
    );

    // Subscribe to combined observables to close submenus when all are false
    this.subscription.add(
      combineLatest([this.isExpanded$, this.isMobileOpen$, this.isHovered$]).subscribe(
        ([isExpanded, isMobileOpen, isHovered]) => {
          if (!isExpanded && !isMobileOpen && !isHovered) {
            // this.openSubmenu = null;
            // this.savedSubMenuHeights = { ...this.subMenuHeights };
            // this.subMenuHeights = {};
            this.cdr.detectChanges();
          } else {
            // Restore saved heights when reopening
            // this.subMenuHeights = { ...this.savedSubMenuHeights };
            // this.cdr.detectChanges();
          }
        }
      )
    );

    // Initial load
    this.setActiveMenuFromRoute(this.router.url);
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscription.unsubscribe();
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  toggleSubmenu(section: string, index: number) {
    const key = `${section}-${index}`;

    if (this.openSubmenu === key) {
      this.openSubmenu = null;
      this.subMenuHeights[key] = 0;
    } else {
      this.openSubmenu = key;

      setTimeout(() => {
        const el = document.getElementById(key);
        if (el) {
          this.subMenuHeights[key] = el.scrollHeight;
          this.cdr.detectChanges(); // Ensure UI updates
        }
      });
    }
  }

  onSidebarMouseEnter() {
    this.isExpanded$.subscribe(expanded => {
      if (!expanded) {
        this.sidebarService.setHovered(true);
      }
    }).unsubscribe();
  }

  private setActiveMenuFromRoute(currentUrl: string) {
    const menuGroups = [
      { items: this.navItems, prefix: 'main' },
      { items: this.othersItems, prefix: 'others' },
    ];

    menuGroups.forEach(group => {
      group.items.forEach((nav, i) => {
        if (nav.subItems) {
          nav.subItems.forEach(subItem => {
            if (currentUrl === subItem.path) {
              const key = `${group.prefix}-${i}`;
              this.openSubmenu = key;

              setTimeout(() => {
                const el = document.getElementById(key);
                if (el) {
                  this.subMenuHeights[key] = el.scrollHeight;
                  this.cdr.detectChanges(); // Ensure UI updates
                }
              });
            }
          });
        }
      });
    });
  }

  onSubmenuClick() {
    console.log('click submenu');
    this.isMobileOpen$.subscribe(isMobile => {
      if (isMobile) {
        this.sidebarService.setMobileOpen(false);
      }
    }).unsubscribe();
  }  

  
}
