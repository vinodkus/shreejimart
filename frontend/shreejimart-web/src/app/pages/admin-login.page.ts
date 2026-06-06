import { Component, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  standalone: true,
  imports: [NgIf, FormsModule, RouterLink],
  template: `
    <div class="login-card">
      <div class="login-card__brand">
        <span class="login-card__logo">S</span>
        <div>
          <strong>ShreeJiMart</strong>
          <span>Admin Portal</span>
        </div>
      </div>

      <h1>Sign in</h1>
      <p class="login-card__sub">Manage categories, products, and images.</p>

      <form class="login-form" (ngSubmit)="submit()" #f="ngForm">
        <div class="login-field">
          <label for="username">Username</label>
          <input
            id="username"
            class="login-input"
            name="username"
            [(ngModel)]="username"
            required
            autocomplete="username"
            placeholder="Enter username"
          />
        </div>

        <div class="login-field">
          <label for="password">Password</label>
          <input
            id="password"
            class="login-input"
            name="password"
            type="password"
            [(ngModel)]="password"
            required
            autocomplete="current-password"
            placeholder="Enter password"
          />
        </div>

        <p class="login-error" *ngIf="error()">{{ error() }}</p>

        <button type="submit" class="login-submit" [disabled]="isBusy() || !f.valid">
          {{ isBusy() ? 'Signing in…' : 'Login' }}
        </button>
      </form>

      <a routerLink="/" class="login-back">← Back to shop</a>
    </div>
  `,
})
export class AdminLoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  username = 'admin';
  password = '';
  readonly isBusy = signal(false);
  readonly error = signal<string | null>(null);

  submit() {
    this.isBusy.set(true);
    this.error.set(null);

    this.auth.login(this.username.trim(), this.password).subscribe({
      next: (res) => {
        this.auth.completeLogin(res.token);
        void this.router.navigate(['/admin/products']);
      },
      error: () => this.error.set('Invalid username or password.'),
      complete: () => this.isBusy.set(false),
    });
  }
}
