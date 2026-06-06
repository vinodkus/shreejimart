import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'shreejimart_admin_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  readonly isLoggedIn = signal(!!sessionStorage.getItem(STORAGE_KEY));

  login(username: string, password: string) {
    return this.http.post<{ token: string }>(`${this.baseUrl}/api/auth/login`, {
      username,
      password,
    });
  }

  completeLogin(token: string) {
    sessionStorage.setItem(STORAGE_KEY, token);
    this.isLoggedIn.set(true);
  }

  getToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEY);
  }

  logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    this.isLoggedIn.set(false);
    void this.router.navigate(['/']);
  }
}
