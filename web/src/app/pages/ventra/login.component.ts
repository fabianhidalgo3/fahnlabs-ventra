import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-ventra-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 dark:bg-gray-950">
      <div class="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,#465fff,transparent_70%)] opacity-20 blur-3xl" aria-hidden="true"></div>
      <div class="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-8 text-center">
          <img src="/images/logo-ventra.svg" alt="Ventra" class="mx-auto h-20 dark:hidden" />
          <img src="/images/logo-ventra-blanco.svg" alt="Ventra" class="mx-auto h-20 hidden dark:block" />
          <p class="mt-1 text-sm text-gray-500">by FHAN Labs — inicia sesión para continuar</p>
        </div>

        <form (ngSubmit)="submit()">
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-400">Email</label>
          <input [(ngModel)]="email" name="email" type="email" required placeholder="admin@fhanlabs.cl"
            class="mb-4 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:text-white/90" />

          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-400">Contraseña</label>
          <input [(ngModel)]="password" name="password" type="password" required placeholder="••••••••"
            class="mb-4 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:text-white/90" />

          @if (error) { <p class="mb-3 text-sm text-error-600">{{ error }}</p> }

          <button type="submit" [disabled]="loading"
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-40">
            {{ loading ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>

        <p class="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">Ventra · Sistema de ventas — FHAN Labs</p>
      </div>
    </div>
  `,
})
export class VentraLoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.error = 'Ingresa un email válido (nombre@dominio.cl)';
      return;
    }
    if (!this.password) {
      this.error = 'Ingresa tu contraseña';
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      // El vendedor aterriza directo en la caja
      next: () => this.router.navigate([this.auth.isAdmin ? '/' : '/pos']),
      error: (e) => {
        this.error = e?.error?.message ?? 'No se pudo iniciar sesión';
        this.loading = false;
      },
    });
  }
}
