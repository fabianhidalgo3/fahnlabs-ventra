import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService, BatchAlert } from '../../../../core/api.service';

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  imports: [CommonModule, RouterModule],
})
export class NotificationDropdownComponent implements OnInit {
  isOpen = false;
  alerts: BatchAlert[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    // Alertas reales: lotes que vencen en los próximos 15 días
    this.api.alerts(15).subscribe({
      next: (a) => (this.alerts = a),
      error: () => undefined,
    });
  }

  get criticas(): number {
    return this.alerts.filter((a) => a.level === 'vencido' || a.level === 'critico').length;
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
