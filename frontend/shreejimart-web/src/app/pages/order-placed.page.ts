import { Component, inject, OnInit, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiClient, Order } from '../api/api-client';

@Component({
  standalone: true,
  imports: [NgIf, RouterLink],
  template: `
    <div class="shop order-placed-page">
      <div class="order-placed-card" *ngIf="order(); else loading">
        <p class="order-placed-card__icon">✓</p>
        <h2>Order placed!</h2>
        <p class="order-placed-card__sub">
          Thank you. Our team will call you on <strong>{{ order()!.phone }}</strong> to confirm, then deliver to your address with cash on delivery.
        </p>
        <p class="order-placed-card__id">Order ID: <code>{{ order()!.id }}</code></p>
        <p class="order-placed-card__total">Total: <strong>₹{{ order()!.totalAmount }}</strong> (COD)</p>
        <a routerLink="/" class="btn-checkout">Back to shop</a>
      </div>
      <ng-template #loading>
        <p class="shop-empty" *ngIf="error(); else wait">{{ error() }}</p>
        <ng-template #wait><p class="shop-empty">Loading order…</p></ng-template>
      </ng-template>
    </div>
  `,
})
export class OrderPlacedPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiClient);

  readonly order = signal<Order | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (!id) {
      this.error.set('Order not found.');
      return;
    }
    this.api.getOrder(id).subscribe({
      next: (o) => this.order.set(o),
      error: () => this.error.set('Could not load order details.'),
    });
  }
}
