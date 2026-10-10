import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService, BatchAlert } from '../../../../core/api.service';

const READ_KEY = 'ventra_notif_read';

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  imports: [CommonModule, RouterModule],
})
export class NotificationDropdownComponent implements OnInit {
  isOpen = false;
  alerts: BatchAlert[] = [];
  private readIds = new Set<string>();

  constructor(
    private api: ApiService,
    private router: Router,
  ) {
    try {
      this.readIds = new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]'));
    } catch {
      this.readIds = new Set();
    }
  }

  ngOnInit() {
    // Alertas reales: lotes que vencen en los próximos 15 días
    this.api.alerts(15).subscribe({
      next: (a) => {
        this.alerts = a;
        // Limpieza: olvidar ids leídos que ya no están en alerta
        const vivos = new Set(a.map((x) => x.id));
        let cambio = false;
        for (const id of this.readIds) {
          if (!vivos.has(id)) {
            this.readIds.delete(id);
            cambio = true;
          }
        }
        if (cambio) this.persist();
      },
      error: () => undefined,
    });
  }

  get unread(): number {
    return this.alerts.filter((a) => !this.readIds.has(a.id)).length;
  }

  get criticasNoLeidas(): number {
    return this.alerts.filter(
      (a) => !this.readIds.has(a.id) && (a.level === 'vencido' || a.level === 'critico'),
    ).length;
  }

  isRead(a: BatchAlert): boolean {
    return this.readIds.has(a.id);
  }

  /** Seleccionar una notificación: queda leída y navega al detalle. */
  open(a: BatchAlert) {
    this.readIds.add(a.id);
    this.persist();
    this.close();
    this.router.navigate(['/vencimientos']);
  }

  markAll() {
    for (const a of this.alerts) this.readIds.add(a.id);
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...this.readIds]));
    } catch {}
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }

  label(a: BatchAlert): string {
    if (a.daysToExpiry < 0) return 'VENCIDO';
    if (a.daysToExpiry === 0) return 'vence HOY';
    return `vence en ${a.daysToExpiry} día${a.daysToExpiry === 1 ? '' : 's'}`;
  }
}
