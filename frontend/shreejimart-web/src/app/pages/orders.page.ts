import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { AdminOrderAlertService } from '../admin/admin-order-alert.service';
import { DatePipe, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient, Order } from '../api/api-client';

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending — call customer' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'OutForDelivery', label: 'Out for delivery' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule, DatePipe],
  template: `
    <div class="admin-page">
      <div class="admin-page__toolbar">
        <p class="hint">Guest COD orders. Call the customer to confirm, then update status and send delivery.</p>
        <button type="button" class="btn-secondary" (click)="refresh()">Refresh</button>
      </div>

      <p class="admin-alert admin-alert--error" *ngIf="error()">{{ error() }}</p>
      <p class="admin-alert admin-alert--success" *ngIf="success()">{{ success() }}</p>

      <p class="admin-empty" *ngIf="!error() && orders().length === 0">No orders yet.</p>

      <div class="order-cards" *ngIf="orders().length > 0">
        <article class="order-card" *ngFor="let o of orders()" [class.order-card--pending]="o.status === 'Pending'">
          <header class="order-card__head">
            <div>
              <strong>{{ o.customerName || 'Guest' }}</strong>
              <span class="order-card__meta">{{ o.createdAt | date: 'medium' }}</span>
            </div>
            <span class="order-status" [class]="statusClass(o.status)">{{ statusLabel(o.status) }}</span>
          </header>

          <div class="order-card__contact">
            <a class="order-call-btn" [href]="'tel:+91' + o.phone">📞 Call {{ o.phone }}</a>
            <p class="order-card__address">{{ o.deliveryAddress }}</p>
          </div>

          <ul class="order-card__lines">
            <li *ngFor="let line of o.lines">
              {{ line.productName }} × {{ line.quantity }} ({{ line.unit }}) — ₹{{ line.lineTotal }}
            </li>
          </ul>

          <footer class="order-card__foot">
            <span>Total (COD): <strong>₹{{ o.totalAmount }}</strong></span>
            <label class="order-status-select">
              Update status
              <select
                [ngModel]="o.status"
                (ngModelChange)="updateStatus(o, $event)"
                [disabled]="updatingId() === o.id"
                [name]="'status-' + o.id"
              >
                <option *ngFor="let s of statusOptions" [value]="s.value">{{ s.label }}</option>
              </select>
            </label>
          </footer>
        </article>
      </div>
    </div>
  `,
})
export class OrdersPage implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly orderAlerts = inject(AdminOrderAlertService);

  readonly orders = signal<Order[]>([]);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly updatingId = signal<string | null>(null);

  readonly statusOptions = STATUS_OPTIONS;

  constructor() {
    effect(() => {
      if (this.orderAlerts.lastNewOrderAt() > 0) this.refresh();
    });
  }

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.error.set(null);
    this.api.listOrders().subscribe({
      next: (items) => this.orders.set(items),
      error: (e) => this.error.set(e?.message ?? 'Failed to load orders'),
    });
  }

  statusLabel(status: string) {
    return STATUS_OPTIONS.find((x) => x.value === status)?.label ?? status;
  }

  statusClass(status: string) {
    return 'order-status--' + status.toLowerCase();
  }

  updateStatus(order: Order, status: string) {
    if (status === order.status) return;
    this.updatingId.set(order.id);
    this.success.set(null);
    this.api.updateOrderStatus(order.id, status).subscribe({
      next: (updated) => {
        this.orders.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.updatingId.set(null);
        this.success.set('Order status updated.');
        window.setTimeout(() => this.success.set(null), 3000);
      },
      error: (e) => {
        this.updatingId.set(null);
        this.error.set(e?.error ?? e?.message ?? 'Failed to update status');
      },
    });
  }
}
