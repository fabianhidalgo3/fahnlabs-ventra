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
    <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="mb-8 text-center">
          <h1 class="text-3xl font-bold text-gray-800 dark:text-white/90">Ventra<span class="text-brand-500">.</span></h1>
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
            class="w-full rounded-lg bg-brand-500 py-3 font-medium text-white hover:bg-brand-600 disabled:opacity-40">
            {{ loading ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>
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
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (e) => {
        this.error = e?.error?.message ?? 'No se pudo iniciar sesión';
        this.loading = false;
      },
    });
  }
}
