import { Component, computed, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiClient, Category, Product } from '../api/api-client';
import { CartService } from '../cart/cart.service';
import { resolveImageUrl } from '../utils/image-url';
import { categoryNameById } from '../utils/category-utils';
import { filterProductsByQuery } from '../utils/product-search.utils';
import { shopProductEmoji, shopTileColor } from '../utils/product-display.utils';
import { discountBadge, effectivePrice, hasDiscount } from '../utils/product-price.utils';

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, RouterLink],
  template: `
    <div class="shop shop--search">
      <div class="section-head">
        <h2>{{ pageTitle() }}</h2>
        <span class="section-head__count" *ngIf="query()">{{ filteredProducts().length }} items</span>
      </div>

      <p class="shop-empty" *ngIf="!query()">Type a product name in the search bar above to find groceries.</p>
      <p class="shop-loading" *ngIf="query() && loading()">Searching products…</p>
      <p class="shop-empty" *ngIf="query() && !loading() && filteredProducts().length === 0">
        No products found for "{{ query() }}". Try another name or category.
      </p>

      <div class="product-grid" *ngIf="query() && !loading() && filteredProducts().length > 0">
        <article class="product-tile" *ngFor="let p of filteredProducts()">
          <a [routerLink]="['/product', p.id]" class="product-tile__link">
            <div
              class="product-tile__media"
              [class.product-tile__media--photo]="!!productImage(p)"
              [style.background]="productImage(p) ? null : tileColor(p.categoryId)"
            >
              <img *ngIf="productImage(p)" class="product-tile__img" [src]="productImage(p)!" [alt]="p.name" />
              <span *ngIf="!productImage(p)" class="product-tile__emoji">{{ productEmoji(p.name) }}</span>
            </div>
            <div class="product-tile__body">
              <h3 class="product-tile__name">{{ p.name }}</h3>
              <p class="product-tile__meta">{{ categoryName(p.categoryId) }} · {{ p.unit }}</p>
              <p class="product-tile__desc" *ngIf="p.description">{{ p.description }}</p>
            </div>
          </a>
          <div class="product-tile__footer">
            <div class="product-tile__price">
              <span class="price-off-chip" *ngIf="discountBadge(p)">{{ discountBadge(p) }}</span>
              <span class="price-was" *ngIf="hasDiscount(p)">₹{{ p.price }}</span>
              <span class="price-now" [class.price-now--sale]="hasDiscount(p)">₹{{ effectivePrice(p) }}</span>
            </div>
            <button
              type="button"
              class="btn-add"
              [class.btn-add--added]="addedId() === p.id"
              (click)="addToCart(p, $event)"
            >
              {{ addedId() === p.id ? 'Added' : 'ADD' }}
            </button>
          </div>
        </article>
      </div>
    </div>
  `,
})
export class ProductSearchPage {
  private readonly api = inject(ApiClient);
  private readonly cart = inject(CartService);
  private readonly route = inject(ActivatedRoute);

  readonly categories = signal<Category[]>([]);
  readonly allProducts = signal<Product[]>([]);
  readonly query = signal('');
  readonly loading = signal(true);
  readonly addedId = signal<string | null>(null);

  readonly filteredProducts = computed(() =>
    filterProductsByQuery(this.allProducts(), this.query(), this.categories()),
  );

  readonly pageTitle = computed(() => {
    const q = this.query().trim();
    return q ? `Results for "${q}"` : 'Search products';
  });

  constructor() {
    this.api.listCategories().subscribe({
      next: (items) => this.categories.set(items),
    });
    this.api.listProducts().subscribe({
      next: (items) => {
        this.allProducts.set(items.filter((p) => p.isActive));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.route.queryParamMap.subscribe((params) => {
      this.query.set((params.get('q') ?? '').trim());
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

  addToCart(product: Product, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.cart.addProduct(product);
    this.addedId.set(product.id);
    window.setTimeout(() => {
      if (this.addedId() === product.id) this.addedId.set(null);
    }, 1200);
  }

  hasDiscount = hasDiscount;
  effectivePrice = effectivePrice;
  discountBadge = discountBadge;
}
