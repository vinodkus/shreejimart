import { AfterViewInit, Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CustomerAuthService } from '../auth/customer-auth.service';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number | boolean>,
          ) => void;
        };
      };
    };
  }
}

@Component({
  standalone: true,
  imports: [NgIf, FormsModule, RouterLink],
  template: `
    <div class="customer-login">
      <div class="customer-login__card">
        <h1>Welcome to ShreeJiMart</h1>
        <p class="customer-login__sub">Sign in to save your details and track orders faster.</p>

        <p class="shop-alert" *ngIf="error()">{{ error() }}</p>

        <div class="customer-login__google" *ngIf="googleClientId">
          <div #googleButtonHost class="customer-login__google-btn"></div>
        </div>

        <p class="customer-login__hint" *ngIf="!googleClientId">
          Google sign-in is not configured yet. Set <code>googleClientId</code> in environment and
          <code>GOOGLE_CLIENT_ID</code> on the API.
        </p>

        <div class="customer-login__divider"><span>or</span></div>

        <label class="customer-login__guest-name">
          Guest name (optional)
          <input [(ngModel)]="guestName" name="guestName" maxlength="120" placeholder="e.g. Rahul" />
        </label>

        <button
          type="button"
          class="btn-guest-login"
          [disabled]="busy()"
          (click)="continueAsGuest()"
        >
          {{ busy() ? 'Please wait…' : 'Continue as Guest' }}
        </button>

        <a routerLink="/" class="customer-login__skip">Continue without signing in →</a>
      </div>
    </div>
  `,
})
export class CustomerLoginPage implements AfterViewInit {
  @ViewChild('googleButtonHost') googleButtonHost?: ElementRef<HTMLElement>;

  private readonly auth = inject(CustomerAuthService);
  private readonly router = inject(Router);

  readonly googleClientId = environment.googleClientId;
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  guestName = '';

  ngAfterViewInit() {
    if (!this.googleClientId) return;
    this.loadGoogleScript().then(() => this.renderGoogleButton());
  }

  continueAsGuest() {
    this.busy.set(true);
    this.error.set(null);
    this.auth.loginAsGuest(this.guestName.trim() || undefined).subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigate(['/']);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e?.error ?? e?.message ?? 'Guest login failed');
      },
    });
  }

  private renderGoogleButton() {
    const host = this.googleButtonHost?.nativeElement;
    if (!host || !window.google?.accounts?.id || !this.googleClientId) return;

    window.google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: (response) => this.handleGoogleCredential(response.credential),
    });

    window.google.accounts.id.renderButton(host, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      width: 320,
    });
  }

  private handleGoogleCredential(idToken: string) {
    this.busy.set(true);
    this.error.set(null);
    this.auth.loginWithGoogle(idToken).subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigate(['/']);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e?.error ?? e?.message ?? 'Google sign-in failed');
      },
    });
  }

  private loadGoogleScript() {
    return new Promise<void>((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      const existing = document.getElementById('google-gsi-script');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google sign-in'));
      document.head.appendChild(script);
    });
  }
}
