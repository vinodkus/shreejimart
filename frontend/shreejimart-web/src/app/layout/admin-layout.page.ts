import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { AdminOrderAlertService } from '../admin/admin-order-alert.service';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
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
          <a routerLink="/admin/orders" routerLinkActive="active" class="admin-nav-orders">
            <span class="nav-icon">📋</span> Orders
            <span class="admin-nav-badge" *ngIf="orderAlerts.pendingCount() > 0">
              {{ orderAlerts.pendingCount() }}
            </span>
          </a>
        </nav>

        <div class="admin-sidebar__footer">
          <button type="button" class="admin-sound-toggle" (click)="orderAlerts.toggleSound()">
            {{ orderAlerts.soundEnabled() ? '🔔 Order sound: ON' : '🔕 Order sound: OFF' }}
          </button>
          <a routerLink="/" class="admin-sidebar__shop">← View shop</a>
          <button type="button" class="admin-sidebar__logout" (click)="logout()">Logout</button>
        </div>
      </aside>

      <div class="admin-main">
        <div class="admin-new-order-banner" *ngIf="orderAlerts.newOrderAlert()">
          🛎️ {{ orderAlerts.newOrderAlert() }}
        </div>

        <header class="admin-main__header">
          <h1>Store management</h1>
          <p>Manage catalog, guest orders, and deliveries. New orders play a sound every 15 seconds check.</p>
        </header>
        <div class="admin-main__body">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class AdminLayoutPage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  readonly orderAlerts = inject(AdminOrderAlertService);

  ngOnInit() {
    this.orderAlerts.startPolling();
  }

  ngOnDestroy() {
    this.orderAlerts.stopPolling();
  }

  logout() {
    this.orderAlerts.stopPolling();
    this.auth.logout();
  }
}
