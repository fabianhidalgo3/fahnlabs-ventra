import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { API_URL } from './api.service';

export interface SessionUser {
  sub: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'VENDEDOR';
}

const TOKEN_KEY = 'ventra_token';
const USER_KEY = 'ventra_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  user = signal<SessionUser | null>(this.restore());

  private restore(): SessionUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isAdmin(): boolean {
    return this.user()?.role === 'ADMIN';
  }

  login(email: string, password: string) {
    return this.http
      .post<{ token: string; user: SessionUser }>(`${API_URL}/auth/login`, { email, password })
      .pipe(
        tap((r) => {
          localStorage.setItem(TOKEN_KEY, r.token);
          localStorage.setItem(USER_KEY, JSON.stringify(r.user));
          this.user.set(r.user);
        }),
      );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    this.router.navigate(['/signin']);
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/login')) auth.logout();
      return throwError(() => err);
    }),
  );
};

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.token ? true : router.createUrlTree(['/signin']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAdmin ? true : router.createUrlTree(['/']);
};
