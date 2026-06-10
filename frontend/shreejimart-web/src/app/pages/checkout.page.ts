import { Component, inject, OnInit, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiClient } from '../api/api-client';
import { CartService } from '../cart/cart.service';
import { CustomerAuthService } from '../auth/customer-auth.service';

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule, RouterLink],
  template: `
    <div class="shop checkout-page">
      <div class="section-head">
        <h2>Checkout</h2>
        <span class="section-head__count">Cash on delivery</span>
      </div>

      <p class="shop-empty" *ngIf="cart.cartItems().length === 0">
        Your cart is empty. <a routerLink="/">Go to shop</a>
      </p>

      <div class="checkout-layout" *ngIf="cart.cartItems().length > 0">
        <form class="checkout-form" (ngSubmit)="placeOrder()" #f="ngForm">
          <div class="checkout-auth" *ngIf="!customerAuth.isLoggedIn()">
            <p>Sign in for faster checkout next time.</p>
            <div class="checkout-auth__actions">
              <a routerLink="/login" class="btn-checkout-secondary">Sign in with Google / Guest</a>
            </div>
          </div>

          <div class="checkout-auth checkout-auth--signed-in" *ngIf="customerAuth.isLoggedIn()">
            <p>
              Signed in as <strong>{{ customerAuth.displayLabel() }}</strong>
              ({{ customerAuth.isGoogleUser() ? 'Google' : 'Guest' }})
            </p>
          </div>

          <p class="checkout-form__hint">
            We will call you on this number to confirm your order before delivery.
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
export class CheckoutPage implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);
  readonly customerAuth = inject(CustomerAuthService);

  customerName = '';
  phone = '';
  deliveryAddress = '';

  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);

  ngOnInit() {
    this.prefillFromProfile();
    if (this.customerAuth.isLoggedIn()) {
      this.customerAuth.refreshProfile().subscribe({
        next: () => this.prefillFromProfile(),
        error: () => this.prefillFromProfile(),
      });
    }
  }

  private prefillFromProfile() {
    const profile = this.customerAuth.profile();
    if (!profile) return;
    if (!this.customerName && profile.displayName) this.customerName = profile.displayName;
    if (!this.phone && profile.phone) this.phone = profile.phone;
    if (!this.deliveryAddress && profile.defaultAddress) this.deliveryAddress = profile.defaultAddress;
  }

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
        if (this.customerAuth.isLoggedIn()) {
          this.customerAuth
            .updateProfile({
              displayName: this.customerName.trim() || this.customerAuth.profile()?.displayName || undefined,
              phone: this.phone.trim(),
              defaultAddress: this.deliveryAddress.trim(),
            })
            .subscribe({ error: () => {} });
        }

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
