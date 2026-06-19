import { Component, computed, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiClient, Category, Product } from '../api/api-client';
import { CartService } from '../cart/cart.service';
import { resolveImageUrl } from '../utils/image-url';
import {
  categoryNameById,
  resolveCategorySelection,
  subcategoriesOf,
  subcategoryAtIndex,
  subcategoryIndex,
  topLevelCategories,
} from '../utils/category-utils';
import { shopProductEmoji, shopTileColor } from '../utils/product-display.utils';
import { discountBadge, effectivePrice, hasDiscount } from '../utils/product-price.utils';

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule, RouterLink],
  template: `
    <div class="shop shop--category">
      <div class="category-products-head">
        <a routerLink="/" fragment="categories" class="btn-back">← All categories</a>

        <div class="category-filters">
          <label class="category-picker">
            <span>Category</span>
            <select [ngModel]="selectedParentId()" (ngModelChange)="onParentChange($event)">
              <option *ngFor="let parent of parentOptions()" [ngValue]="parent.id">{{ parent.name }}</option>
            </select>
          </label>

          <label class="category-picker" *ngIf="subcategoryOptions().length > 0">
            <span>Subcategory</span>
            <select [ngModel]="selectedSubcategoryId()" (ngModelChange)="onSubcategoryChange($event)">
              <option [ngValue]="''">All in {{ parentName() }}</option>
              <option *ngFor="let sub of subcategoryOptions()" [ngValue]="sub.id">{{ sub.name }}</option>
            </select>
          </label>
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

  readonly parentOptions = computed(() => topLevelCategories(this.categories()));

  readonly selection = computed(() => resolveCategorySelection(this.categories(), this.categoryId()));

  readonly selectedParentId = computed(() => this.selection()?.parentId ?? '');

  readonly selectedSubcategoryId = computed(() => this.selection()?.subcategoryId ?? '');

  readonly subcategoryOptions = computed(() => {
    const parentId = this.selectedParentId();
    if (!parentId) return [];
    return subcategoriesOf(this.categories(), parentId);
  });

  readonly parentName = computed(() =>
    categoryNameById(this.categories(), this.selectedParentId(), 'Category'),
  );

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
      this.loadProducts(id);
    });
  }

  onParentChange(parentId: string) {
    const subs = subcategoriesOf(this.categories(), parentId);
    if (subs.length === 0) {
      this.navigateToCategory(parentId);
      return;
    }

    const currentSubId = this.selectedSubcategoryId();
    const index = currentSubId ? subcategoryIndex(this.categories(), currentSubId) : 0;
    const nextSub = subcategoryAtIndex(this.categories(), parentId, index);
    this.navigateToCategory(nextSub?.id ?? parentId);
  }

  onSubcategoryChange(subcategoryId: string) {
    const parentId = this.selectedParentId();
    this.navigateToCategory(subcategoryId || parentId);
  }

  private navigateToCategory(id: string) {
    if (!id || id === this.categoryId()) return;
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
