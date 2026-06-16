import { Component, computed, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiClient, Category, Product } from '../api/api-client';
import { CartService } from '../cart/cart.service';
import { resolveImageUrl } from '../utils/image-url';
import { categoryNameById } from '../utils/category-utils';
import { shopProductEmoji, shopTileColor } from '../utils/product-display.utils';
import { discountBadge, effectivePrice, hasDiscount } from '../utils/product-price.utils';

@Component({
  standalone: true,
  imports: [NgIf, RouterLink],
  template: `
    <div class="shop product-detail-page">
      <a [routerLink]="backLink()" class="btn-back">← {{ backLabel() }}</a>

      <p class="shop-loading" *ngIf="loading()">Loading product…</p>
      <p class="shop-alert" *ngIf="error()">{{ error() }}</p>

      <div class="product-detail" *ngIf="!loading() && product() as p">
        <div
          class="product-detail__gallery"
          [class.product-detail__gallery--photo]="!!productImage(p)"
          [style.background]="productImage(p) ? null : tileColor(p.categoryId)"
        >
          <img *ngIf="productImage(p)" [src]="productImage(p)!" [alt]="p.name" />
          <span *ngIf="!productImage(p)" class="product-detail__emoji">{{ productEmoji(p.name) }}</span>
          <span class="product-detail__discount" *ngIf="discountBadge(p)">{{ discountBadge(p) }}</span>
        </div>

        <div class="product-detail__info">
          <p class="product-detail__meta">
            <a [routerLink]="['/category', p.categoryId]">{{ categoryName(p.categoryId) }}</a>
            · {{ p.unit }}
          </p>
          <h1 class="product-detail__name">{{ p.name }}</h1>

          <div class="product-detail__price">
            <span class="price-off-chip" *ngIf="discountBadge(p)">{{ discountBadge(p) }}</span>
            <span class="price-was" *ngIf="hasDiscount(p)">₹{{ p.price }}</span>
            <span class="price-now price-now--lg" [class.price-now--sale]="hasDiscount(p)">
              ₹{{ effectivePrice(p) }}
            </span>
            <span class="product-detail__unit">per {{ p.unit }}</span>
          </div>

          <p
            class="product-detail__stock"
            [class.product-detail__stock--out]="stockOf(p) < 1"
          >
            {{
              !p.isActive
                ? 'Currently unavailable'
                : stockOf(p) > 0
                  ? stockOf(p) + ' in stock'
                  : 'Out of stock'
            }}
          </p>

          <section class="product-detail__section" *ngIf="p.description">
            <h2>Description</h2>
            <p class="product-detail__desc">{{ p.description }}</p>
          </section>

          <section class="product-detail__section product-detail__section--muted" *ngIf="!p.description">
            <p class="product-detail__desc product-detail__desc--empty">No description added for this product yet.</p>
          </section>

          <div class="product-detail__actions" *ngIf="p.isActive && stockOf(p) > 0">
            <div class="product-detail__qty">
              <span class="product-detail__qty-label">Quantity</span>
              <div class="product-detail__qty-controls">
                <button type="button" class="qty-btn" (click)="changeQty(-1)" [disabled]="quantity() <= 1">−</button>
                <span>{{ quantity() }}</span>
                <button
                  type="button"
                  class="qty-btn"
                  (click)="changeQty(1)"
                  [disabled]="quantity() >= stockOf(p)"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              class="btn-detail-secondary"
              [class.btn-detail-secondary--added]="added()"
              (click)="addToCart()"
            >
              {{ added() ? 'Added to cart' : 'Add to cart' }}
            </button>
            <button type="button" class="btn-checkout" (click)="buyNow()">Buy now</button>
          </div>

          <p class="product-detail__unavailable" *ngIf="!p.isActive || stockOf(p) < 1">
            This product cannot be ordered right now. Browse
            <a [routerLink]="['/category', p.categoryId]">more in this category</a>.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ProductDetailPage {
  private readonly api = inject(ApiClient);
  private readonly cart = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly quantity = signal(1);
  readonly added = signal(false);

  readonly backLink = computed(() => {
    const p = this.product();
    return p?.categoryId ? ['/category', p.categoryId] : ['/'];
  });

  readonly backLabel = computed(() => (this.product()?.categoryId ? 'Back to category' : 'Back to shop'));

  constructor() {
    this.api.listCategories().subscribe({
      next: (items) => this.categories.set(items),
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      if (!id) {
        this.router.navigate(['/']);
        return;
      }
      this.loadProduct(id);
    });
  }

  private loadProduct(id: string) {
    this.loading.set(true);
    this.error.set(null);
    this.quantity.set(1);
    this.added.set(false);

    this.api.getProduct(id).subscribe({
      next: (item) => {
        if (!item.isActive) {
          this.error.set('This product is not available.');
          this.product.set(null);
          this.loading.set(false);
          return;
        }
        this.product.set(item);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.status === 404 ? 'Product not found.' : e?.message ?? 'Failed to load product');
        this.product.set(null);
        this.loading.set(false);
      },
    });
  }

  categoryName(categoryId: string) {
    return categoryNameById(this.categories(), categoryId);
  }

  productImage(p: Product) {
    return resolveImageUrl(p.imageUrl);
  }

  productEmoji(name: string) {
    return shopProductEmoji(name);
  }

  tileColor(categoryId: string) {
    return shopTileColor(this.categoryName(categoryId));
  }

  stockOf(product: Product) {
    return product.stockQuantity ?? 0;
  }

  changeQty(delta: number) {
    const p = this.product();
    if (!p) return;
    const next = this.quantity() + delta;
    this.quantity.set(Math.min(this.stockOf(p), Math.max(1, next)));
  }

  addToCart() {
    const p = this.product();
    if (!p || this.stockOf(p) < 1) return;

    this.cart.addProduct(p);
    this.cart.setQuantity(p.id, this.quantity());
    this.added.set(true);
    window.setTimeout(() => this.added.set(false), 1500);
  }

  buyNow() {
    this.addToCart();
    this.router.navigate(['/checkout']);
  }

  hasDiscount = hasDiscount;
  effectivePrice = effectivePrice;
  discountBadge = discountBadge;
}
