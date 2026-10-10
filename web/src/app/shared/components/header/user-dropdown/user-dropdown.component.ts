import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports: [CommonModule, RouterModule],
})
export class UserDropdownComponent {
  isOpen = false;

  constructor(public auth: AuthService) {}

  /** Iniciales del usuario para el avatar (ej: "Fabian Hidalgo" → FH). */
  get initials(): string {
    const name = this.auth.user()?.name ?? '?';
    return name
      .split(/\s+/)
      .filter((w) => /^[a-záéíóúñ]/i.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  logout() {
    this.closeDropdown();
    this.auth.logout();
  }
}
