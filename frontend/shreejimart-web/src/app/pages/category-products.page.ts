import { Component, computed, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiClient, Category, Product } from '../api/api-client';
import { CartService } from '../cart/cart.service';
import { resolveImageUrl } from '../utils/image-url';
import { categoryBrowseOptions, categoryNameById } from '../utils/category-utils';
import { shopCategoryIcon, shopProductEmoji, shopTileColor } from '../utils/product-display.utils';

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, RouterLink],
  template: `
    <div class="shop shop--category">
      <div class="category-products-head">
        <a routerLink="/" fragment="categories" class="btn-back">← All categories</a>

        <div class="category-switcher" [class.category-switcher--open]="pickerOpen()">
          <button
            type="button"
            class="category-switcher__trigger"
            (click)="togglePicker()"
            [attr.aria-expanded]="pickerOpen()"
          >
            <span class="category-switcher__icon">{{ categoryIcon(currentCategoryName()) }}</span>
            <span class="category-switcher__text">
              <small>Browsing</small>
              <strong>{{ currentCategoryName() }}</strong>
            </span>
            <span class="category-switcher__chevron" aria-hidden="true">▾</span>
          </button>

          <ul class="category-switcher__menu" *ngIf="pickerOpen()">
            <li *ngFor="let opt of browseOptions()">
              <button
                type="button"
                class="category-switcher__option"
                [class.category-switcher__option--active]="opt.id === categoryId()"
                [class.category-switcher__option--sub]="opt.depth > 0"
                (click)="switchCategory(opt.id)"
              >
                <span class="category-switcher__option-icon">{{ categoryIcon(opt.label) }}</span>
                <span>{{ opt.label }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="section-head">
        <h2>{{ currentCategoryName() }}</h2>
        <span class="section-head__count">{{ products().length }} items</span>
      </div>

      <p class="shop-alert" *ngIf="error()">{{ error() }}</p>
      <p class="shop-empty" *ngIf="!error() && !loading() && products().length === 0">
        No products in this category yet.
      </p>
      <p class="shop-loading" *ngIf="loading()">Loading products…</p>

      <div class="product-grid" *ngIf="!loading() && products().length > 0">
        <article class="product-tile" *ngFor="let p of products()">
          <div
            class="product-tile__media"
            [class.product-tile__media--photo]="!!productImage(p)"
            [style.background]="productImage(p) ? null : tileColor(p.categoryId)"
          >
            <img *ngIf="productImage(p)" class="product-tile__img" [src]="productImage(p)!" [alt]="p.name" />
            <span *ngIf="!productImage(p)" class="product-tile__emoji">{{ productEmoji(p.name) }}</span>
            <span
              class="product-tile__tag"
              [class.product-tile__tag--out]="stockOf(p) <= 0"
              *ngIf="p.isActive"
            >
              {{ stockOf(p) > 0 ? stockOf(p) + ' left' : 'Out of stock' }}
            </span>
          </div>
          <div class="product-tile__body">
            <h3 class="product-tile__name">{{ p.name }}</h3>
            <p class="product-tile__meta">{{ categoryName(p.categoryId) }} · {{ p.unit }}</p>
            <div class="product-tile__footer">
              <div class="product-tile__price">
                <span class="price-now">₹{{ p.price }}</span>
              </div>
              <button
                type="button"
                class="btn-add"
                [class.btn-add--added]="addedId() === p.id"
                [disabled]="stockOf(p) < 1"
                (click)="addToCart(p)"
              >
                {{ stockOf(p) < 1 ? 'OUT' : addedId() === p.id ? 'Added' : 'ADD' }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  `,
})
export class CategoryProductsPage {
  private readonly api = inject(ApiClient);
  private readonly cart = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly categoryId = signal('');
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly addedId = signal<string | null>(null);
  readonly pickerOpen = signal(false);

  readonly browseOptions = computed(() => categoryBrowseOptions(this.categories()));

  readonly currentCategoryName = computed(() =>
    categoryNameById(this.categories(), this.categoryId(), 'Products'),
  );

  constructor() {
    this.api.listCategories().subscribe({
      next: (items) => this.categories.set(items),
      error: (e) => this.error.set(e?.message ?? 'Failed to load categories'),
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      if (!id) {
        this.router.navigate(['/']);
        return;
      }
      this.categoryId.set(id);
      this.pickerOpen.set(false);
      this.loadProducts(id);
    });
  }

  togglePicker() {
    this.pickerOpen.update((v) => !v);
  }

  switchCategory(id: string) {
    this.pickerOpen.set(false);
    if (id === this.categoryId()) return;
    this.router.navigate(['/category', id]);
  }

  private loadProducts(categoryId: string) {
    this.loading.set(true);
    this.error.set(null);
    this.api.listProducts(categoryId).subscribe({
      next: (items) => {
        this.products.set(items.filter((p) => p.isActive));
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message ?? 'Failed to load products');
        this.loading.set(false);
      },
    });
  }

  categoryName(categoryId: string) {
    return categoryNameById(this.categories(), categoryId);
  }

  categoryIcon(name: string) {
    return shopCategoryIcon(name);
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

  addToCart(product: Product) {
    if (this.stockOf(product) < 1) return;
    this.cart.addProduct(product);
    this.addedId.set(product.id);
    window.setTimeout(() => {
      if (this.addedId() === product.id) this.addedId.set(null);
    }, 1200);
  }
}
