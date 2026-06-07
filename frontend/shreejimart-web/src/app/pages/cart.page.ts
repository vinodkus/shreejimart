import { Component, inject } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../cart/cart.service';
import { resolveImageUrl } from '../utils/image-url';

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, RouterLink],
  template: `
    <div class="shop cart-page">
      <div class="section-head">
        <h2>Your cart</h2>
        <span class="section-head__count">{{ cart.itemCount() }} items</span>
      </div>

      <p class="shop-empty" *ngIf="cart.cartItems().length === 0">
        Your cart is empty. Add groceries from the shop.
      </p>

      <div class="cart-list" *ngIf="cart.cartItems().length > 0">
        <article class="cart-row" *ngFor="let item of cart.cartItems()">
          <div class="cart-row__media">
            <img *ngIf="image(item.imageUrl)" [src]="image(item.imageUrl)!" [alt]="item.name" />
            <span *ngIf="!image(item.imageUrl)" class="cart-row__emoji">🛒</span>
          </div>
          <div class="cart-row__info">
            <h3>{{ item.name }}</h3>
            <p>{{ item.unit }} · ₹{{ item.price }} · {{ item.stockQuantity }} in stock</p>
          </div>
          <div class="cart-row__qty">
            <button type="button" class="qty-btn" (click)="changeQty(item.productId, item.quantity - 1)">−</button>
            <span>{{ item.quantity }}</span>
            <button type="button" class="qty-btn" (click)="changeQty(item.productId, item.quantity + 1)">+</button>
          </div>
          <p class="cart-row__total">₹{{ lineTotal(item) }}</p>
          <button type="button" class="cart-row__remove" (click)="cart.remove(item.productId)" title="Remove">✕</button>
        </article>
      </div>

      <div class="cart-summary" *ngIf="cart.cartItems().length > 0">
        <div class="cart-summary__row">
          <span>Subtotal</span>
          <strong>₹{{ cart.subtotal() }}</strong>
        </div>
        <p class="cart-summary__note">Pay cash on delivery when your order arrives.</p>
        <a routerLink="/checkout" class="btn-checkout">Proceed to checkout</a>
        <a routerLink="/" class="cart-summary__link">← Continue shopping</a>
      </div>
    </div>
  `,
})
export class CartPage {
  readonly cart = inject(CartService);

  image(url?: string | null) {
    return resolveImageUrl(url);
  }

  lineTotal(item: { price: number; quantity: number }) {
    return (item.price * item.quantity).toFixed(2);
  }

  changeQty(productId: string, qty: number) {
    this.cart.setQuantity(productId, qty);
  }
}
