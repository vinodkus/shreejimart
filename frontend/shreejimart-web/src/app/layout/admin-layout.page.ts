import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-app">
      <aside class="admin-sidebar">
        <div class="admin-sidebar__brand">
          <span class="admin-sidebar__logo">S</span>
          <div>
            <strong>ShreeJiMart</strong>
            <small>Admin Panel</small>
          </div>
        </div>

        <nav class="admin-sidebar__nav">
          <a routerLink="/admin/products" routerLinkActive="active">
            <span class="nav-icon">📦</span> Products
          </a>
          <a routerLink="/admin/categories" routerLinkActive="active">
            <span class="nav-icon">🏷️</span> Categories
          </a>
          <a routerLink="/admin/orders" routerLinkActive="active">
            <span class="nav-icon">📋</span> Orders
          </a>
        </nav>

        <div class="admin-sidebar__footer">
          <a routerLink="/" class="admin-sidebar__shop">← View shop</a>
          <button type="button" class="admin-sidebar__logout" (click)="logout()">Logout</button>
        </div>
      </aside>

      <div class="admin-main">
        <header class="admin-main__header">
          <h1>Store management</h1>
          <p>Manage catalog, guest orders, and deliveries.</p>
        </header>
        <div class="admin-main__body">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class AdminLayoutPage {
  private readonly auth = inject(AuthService);

  logout() {
    this.auth.logout();
  }
}
