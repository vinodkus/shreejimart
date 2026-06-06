import { Component, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiClient } from '../api/api-client';
import { CartService } from '../cart/cart.service';

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule, RouterLink],
  template: `
    <div class="shop checkout-page">
      <div class="section-head">
        <h2>Guest checkout</h2>
        <span class="section-head__count">Cash on delivery</span>
      </div>

      <p class="shop-empty" *ngIf="cart.cartItems().length === 0">
        Your cart is empty. <a routerLink="/">Go to shop</a>
      </p>

      <div class="checkout-layout" *ngIf="cart.cartItems().length > 0">
        <form class="checkout-form" (ngSubmit)="placeOrder()" #f="ngForm">
          <p class="checkout-form__hint">
            No account needed. We will call you on this number to confirm your order before delivery.
          </p>

          <label>
            Your name (optional)
            <input [(ngModel)]="customerName" name="customerName" maxlength="120" placeholder="e.g. Rahul Sharma" />
          </label>

          <label>
            Mobile number *
            <input
              [(ngModel)]="phone"
              name="phone"
              required
              maxlength="15"
              inputmode="numeric"
              placeholder="10-digit mobile"
            />
          </label>

          <label>
            Delivery address *
            <textarea
              [(ngModel)]="deliveryAddress"
              name="deliveryAddress"
              required
              minlength="10"
              maxlength="500"
              rows="4"
              placeholder="House no., street, area, landmark, city"
            ></textarea>
          </label>

          <p class="shop-alert" *ngIf="error()">{{ error() }}</p>

          <button type="submit" class="btn-checkout" [disabled]="submitting() || !f.valid">
            {{ submitting() ? 'Placing order…' : 'Place order · Pay on delivery' }}
          </button>
          <a routerLink="/cart" class="cart-summary__link">← Back to cart</a>
        </form>

        <aside class="checkout-summary">
          <h3>Order summary</h3>
          <ul>
            <li *ngFor="let item of cart.cartItems()">
              <span>{{ item.name }} × {{ item.quantity }}</span>
              <span>₹{{ (item.price * item.quantity).toFixed(2) }}</span>
            </li>
          </ul>
          <div class="checkout-summary__total">
            <span>Total (COD)</span>
            <strong>₹{{ cart.subtotal().toFixed(2) }}</strong>
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class CheckoutPage {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);

  customerName = '';
  phone = '';
  deliveryAddress = '';

  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);

  placeOrder() {
    this.error.set(null);
    this.submitting.set(true);

    const payload = {
      customerName: this.customerName.trim() || null,
      phone: this.phone.trim(),
      deliveryAddress: this.deliveryAddress.trim(),
      items: this.cart.cartItems().map((x) => ({
        productId: x.productId,
        quantity: x.quantity,
      })),
    };

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.cart.clear();
        this.submitting.set(false);
        void this.router.navigate(['/order-placed'], { queryParams: { id: order.id } });
      },
      error: (e) => {
        this.submitting.set(false);
        const body = e?.error;
        let msg = 'Could not place order';
        if (typeof body === 'string') msg = body;
        else if (body?.title) msg = body.title;
        else if (e?.message) msg = e.message;
        this.error.set(msg);
      },
    });
  }
}
