import { Component, computed, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient, Category, Product } from '../api/api-client';
import { CartService } from '../cart/cart.service';
import { resolveImageUrl } from '../utils/image-url';

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule],
  template: `
    <div class="shop">
      <section class="hero-banner">
        <div class="hero-banner__content">
          <p class="hero-banner__eyebrow">Super Saver</p>
          <h1>Groceries at your doorstep</h1>
          <p class="hero-banner__sub">Fresh fruits, vegetables, dairy & more — like your neighbourhood mart.</p>
        </div>
        <div class="hero-banner__badge">FREE delivery above ₹199</div>
      </section>

      <div class="search-bar">
        <span class="search-bar__icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Search atta, milk, fruits..."
          [(ngModel)]="searchText"
          name="search"
        />
      </div>

      <section class="categories-section">
        <div class="section-head section-head--categories">
          <h2>Shop by category</h2>
          <label class="category-picker">
            <span class="category-picker__label">Jump to</span>
            <select [ngModel]="filterCategoryId" (ngModelChange)="selectCategory($event)" name="categoryPicker">
              <option value="">All categories</option>
              <option *ngFor="let c of categories()" [value]="c.id">{{ c.name }}</option>
            </select>
          </label>
        </div>

        <div
          class="category-grid"
          [class.category-grid--collapsed]="!showAllCategories() && hasManyCategories()"
        >
          <button
            type="button"
            class="category-chip category-chip--compact"
            [class.category-chip--active]="filterCategoryId === ''"
            (click)="selectCategory('')"
          >
            <span class="category-chip__icon">🛒</span>
            <span class="category-chip__text">All</span>
          </button>
          <button
            type="button"
            class="category-chip category-chip--compact"
            *ngFor="let c of categories()"
            [class.category-chip--active]="filterCategoryId === c.id"
            (click)="selectCategory(c.id)"
          >
            <span class="category-chip__icon">{{ categoryIcon(c.name) }}</span>
            <span class="category-chip__text">{{ c.name }}</span>
          </button>
        </div>

        <button
          type="button"
          class="category-toggle"
          *ngIf="hasManyCategories()"
          (click)="toggleCategories()"
        >
          {{ showAllCategories() ? 'Show fewer categories' : 'View all ' + categories().length + ' categories' }}
        </button>
      </section>

      <section class="products-section">
        <div class="section-head">
          <h2>{{ sectionTitle() }}</h2>
          <span class="section-head__count">{{ filteredProducts().length }} items</span>
        </div>

        <p class="shop-alert" *ngIf="error()">{{ error() }}</p>
        <p class="shop-empty" *ngIf="!error() && filteredProducts().length === 0">
          No products found. Try another category or search.
        </p>

        <div class="product-grid">
          <article class="product-tile" *ngFor="let p of filteredProducts()">
            <div class="product-tile__media" [style.background]="productImage(p) ? '#fff' : tileColor(p.categoryId)">
              <img *ngIf="productImage(p)" class="product-tile__img" [src]="productImage(p)!" [alt]="p.name" />
              <span *ngIf="!productImage(p)" class="product-tile__emoji">{{ productEmoji(p.name) }}</span>
              <span class="product-tile__tag" *ngIf="p.isActive">In stock</span>
            </div>
            <div class="product-tile__body">
              <p class="product-tile__unit">{{ p.unit }}</p>
              <h3 class="product-tile__name">{{ p.name }}</h3>
              <p class="product-tile__category">{{ categoryName(p.categoryId) }}</p>
              <div class="product-tile__footer">
                <div class="product-tile__price">
                  <span class="price-now">₹{{ p.price }}</span>
                </div>
                <button
                  type="button"
                  class="btn-add"
                  [class.btn-add--added]="addedId() === p.id"
                  (click)="addToCart(p)"
                >
                  {{ addedId() === p.id ? 'Added' : 'ADD' }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  `,
})
export class CustomerHomePage {
  private readonly api = inject(ApiClient);
  private readonly cart = inject(CartService);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly error = signal<string | null>(null);
  readonly addedId = signal<string | null>(null);
  readonly showAllCategories = signal(false);

  filterCategoryId = '';
  searchText = '';

  private readonly categoryCollapseThreshold = 10;

  readonly filteredProducts = computed(() => {
    const q = this.searchText.trim().toLowerCase();
    return this.products().filter((p) => !q || p.name.toLowerCase().includes(q));
  });

  constructor() {
    this.api.listCategories().subscribe({
      next: (items) => this.categories.set(items),
      error: (e) => this.error.set(e?.message ?? 'Failed to load categories'),
    });
    this.refreshProducts();
  }

  sectionTitle() {
    if (this.filterCategoryId) {
      return this.categoryName(this.filterCategoryId);
    }
    return 'Popular picks';
  }

  hasManyCategories() {
    return this.categories().length > this.categoryCollapseThreshold;
  }

  toggleCategories() {
    this.showAllCategories.update((v) => !v);
  }

  selectCategory(id: string) {
    this.filterCategoryId = id;
    this.refreshProducts();
  }

  refreshProducts() {
    this.error.set(null);
    this.api.listProducts(this.filterCategoryId || undefined).subscribe({
      next: (items) => this.products.set(items.filter((p) => p.isActive)),
      error: (e) => this.error.set(e?.message ?? 'Failed to load products'),
    });
  }

  categoryName(categoryId: string) {
    return this.categories().find((c) => c.id === categoryId)?.name ?? 'Grocery';
  }

  productImage(p: Product) {
    return resolveImageUrl(p.imageUrl);
  }

  categoryIcon(name: string) {
    const n = name.toLowerCase();
    if (n.includes('fruit')) return '🍎';
    if (n.includes('veget')) return '🥬';
    if (n.includes('dairy') || n.includes('milk')) return '🥛';
    if (n.includes('snack') || n.includes('biscuit') || n.includes('chocolate')) return '🍪';
    if (n.includes('bever') || n.includes('drink')) return '🥤';
    if (n.includes('bakery') || n.includes('bread')) return '🍞';
    if (n.includes('breakfast') || n.includes('cereal')) return '🥣';
    if (n.includes('baby')) return '🍼';
    if (n.includes('cosmetic') || n.includes('beauty')) return '💄';
    if (n.includes('dry fruit') || n.includes('nut')) return '🥜';
    if (n.includes('frozen')) return '🧊';
    if (n.includes('rice') || n.includes('atta') || n.includes('grain')) return '🌾';
    if (n.includes('spice')) return '🌶️';
    if (n.includes('oil')) return '🫒';
    return '🛍️';
  }

  productEmoji(name: string) {
    const n = name.toLowerCase();
    if (n.includes('banana')) return '🍌';
    if (n.includes('apple')) return '🍎';
    if (n.includes('milk')) return '🥛';
    if (n.includes('potato')) return '🥔';
    if (n.includes('tomato')) return '🍅';
    return '🥗';
  }

  tileColor(categoryId: string) {
    const name = this.categoryName(categoryId).toLowerCase();
    if (name.includes('fruit')) return 'linear-gradient(145deg, #fff4e6, #ffe8cc)';
    if (name.includes('veget')) return 'linear-gradient(145deg, #ecfdf3, #d1fae5)';
    if (name.includes('dairy')) return 'linear-gradient(145deg, #eff6ff, #dbeafe)';
    return 'linear-gradient(145deg, #f8fafc, #e2e8f0)';
  }

  addToCart(product: Product) {
    this.cart.addProduct(product);
    this.addedId.set(product.id);
    window.setTimeout(() => {
      if (this.addedId() === product.id) this.addedId.set(null);
    }, 1200);
  }
}
