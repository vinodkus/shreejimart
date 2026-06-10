import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CustomerProfile {
  id: string;
  authProvider: string;
  email?: string | null;
  displayName?: string | null;
  phone?: string | null;
  defaultAddress?: string | null;
}

interface AuthResponse {
  token: string;
  customer: CustomerProfile;
}

const TOKEN_KEY = 'shreejimart_customer_token';
const PROFILE_KEY = 'shreejimart_customer_profile';

@Injectable({ providedIn: 'root' })
export class CustomerAuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  readonly profile = signal<CustomerProfile | null>(this.loadProfile());
  readonly isLoggedIn = computed(() => !!this.getToken());

  getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  isGoogleUser() {
    return this.profile()?.authProvider === 'google';
  }

  isGuestUser() {
    return this.profile()?.authProvider === 'guest';
  }

  displayLabel() {
    const p = this.profile();
    if (!p) return '';
    if (p.authProvider === 'google') return p.displayName || p.email || 'Google user';
    return p.displayName || 'Guest';
  }

  loginWithGoogle(idToken: string) {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/api/customer-auth/google`, { idToken })
      .pipe(tap((res) => this.persistSession(res)));
  }

  loginAsGuest(displayName?: string) {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/api/customer-auth/guest`, { displayName: displayName || null })
      .pipe(tap((res) => this.persistSession(res)));
  }

  refreshProfile() {
    return this.http.get<CustomerProfile>(`${this.baseUrl}/api/customer-auth/me`).pipe(
      tap((customer) => {
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(customer));
        this.profile.set(customer);
      }),
    );
  }

  updateProfile(payload: Partial<Pick<CustomerProfile, 'displayName' | 'phone' | 'defaultAddress'>>) {
    return this.http.put<CustomerProfile>(`${this.baseUrl}/api/customer-auth/me`, payload).pipe(
      tap((customer) => {
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(customer));
        this.profile.set(customer);
      }),
    );
  }

  logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    this.profile.set(null);
  }

  private persistSession(res: AuthResponse) {
    sessionStorage.setItem(TOKEN_KEY, res.token);
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(res.customer));
    this.profile.set(res.customer);
  }

  private loadProfile(): CustomerProfile | null {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CustomerProfile;
    } catch {
      return null;
    }
  }
}
