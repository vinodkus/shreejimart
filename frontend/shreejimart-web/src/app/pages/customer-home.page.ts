import { Component, computed, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiClient, Category, Product } from '../api/api-client';
import { CartService } from '../cart/cart.service';
import { resolveImageUrl } from '../utils/image-url';
import { categoryLabel, categoryNameById, subcategoriesOf, topLevelCategories } from '../utils/category-utils';
import { shopCategoryIcon, shopProductEmoji, shopTileColor } from '../utils/product-display.utils';
import { discountBadge, effectivePrice, hasDiscount, productPriceLabel } from '../utils/product-price.utils';

type SearchSuggestion =
  | { kind: 'product'; product: Product }
  | { kind: 'category'; category: Category };

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule, RouterLink],
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

      <div class="search-bar-wrap">
        <div class="search-bar">
          <span class="search-bar__icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search atta, milk, fruits..."
            [ngModel]="searchText()"
            (ngModelChange)="onSearchInput($event)"
            (focus)="onSearchFocus()"
            (blur)="onSearchBlur()"
            name="search"
            autocomplete="off"
            aria-autocomplete="list"
            [attr.aria-expanded]="showSuggestions()"
          />
          <button
            type="button"
            class="search-bar__clear"
            *ngIf="searchText()"
            (mousedown)="clearSearch($event)"
            aria-label="Clear search"
          >
            ✕
          </button>
        </div>

        <ul class="search-suggestions" *ngIf="showSuggestions() && searchSuggestions().length > 0">
          <li *ngFor="let item of searchSuggestions()">
            <button
              type="button"
              class="search-suggestion"
              (mousedown)="pickSuggestion(item)"
            >
              <span class="search-suggestion__icon" *ngIf="item.kind === 'category' && !categoryImage(item.category)">
                {{ categoryIcon(item.category.name) }}
              </span>
              <span class="search-suggestion__thumb" *ngIf="item.kind === 'category' && categoryImage(item.category)">
                <img [src]="categoryImage(item.category)!" [alt]="" />
              </span>
              <span class="search-suggestion__thumb" *ngIf="item.kind === 'product'">
                <img *ngIf="productImage(item.product)" [src]="productImage(item.product)!" [alt]="" />
                <span *ngIf="!productImage(item.product)">{{ productEmoji(item.product.name) }}</span>
              </span>
              <span class="search-suggestion__body">
                <strong>{{ item.kind === 'category' ? suggestionCategoryLabel(item.category) : item.product.name }}</strong>
                <small
                  class="search-suggestion__desc"
                  *ngIf="item.kind === 'product' && item.product.description"
                >
                  {{ item.product.description }}
                </small>
                <small>
                  {{
                    item.kind === 'product'
                      ? categoryName(item.product.categoryId) +
                        ' · ' +
                        productPriceLabel(item.product) +
                        (discountBadge(item.product) ? ' · ' + discountBadge(item.product) : '')
                      : 'Category'
                  }}
                </small>
              </span>
            </button>
          </li>
        </ul>

        <p class="search-suggestions__empty" *ngIf="showSuggestions() && searchText().trim() && searchSuggestions().length === 0">
          No suggestions for "{{ searchText().trim() }}"
        </p>
      </div>

      <section class="categories-section" id="categories">
        <div class="section-head section-head--categories">
          <h2>Shop by category</h2>
        </div>

        <div class="category-tree">
          <article class="category-block" *ngFor="let parent of topLevel()">
            <div class="category-block__head">
              <span class="category-block__icon" *ngIf="!categoryImage(parent)">{{ categoryIcon(parent.name) }}</span>
              <img
                *ngIf="categoryImage(parent)"
                class="category-block__img"
                [src]="categoryImage(parent)!"
                [alt]=""
              />
              <h3 class="category-block__title">{{ parent.name }}</h3>
            </div>

            <div class="subcategory-grid" *ngIf="subsOf(parent.id).length > 0">
              <button
                type="button"
                class="category-chip category-chip--sub"
                *ngFor="let sub of subsOf(parent.id)"
                (click)="openCategory(sub.id)"
              >
                <span class="category-chip__icon" *ngIf="!categoryImage(sub)">{{ categoryIcon(sub.name) }}</span>
                <img *ngIf="categoryImage(sub)" class="category-chip__img" [src]="categoryImage(sub)!" [alt]="" />
                <span class="category-chip__text">{{ sub.name }}</span>
              </button>
            </div>

            <button
              type="button"
              class="category-block__solo"
              *ngIf="subsOf(parent.id).length === 0"
              (click)="openCategory(parent.id)"
            >
              Browse {{ parent.name }}
            </button>
          </article>
        </div>
      </section>

      <section class="products-section" *ngIf="isSearching()">
        <div class="section-head">
          <h2>{{ sectionTitle() }}</h2>
          <span class="section-head__count">{{ filteredProducts().length }} items</span>
        </div>

        <p class="shop-empty" *ngIf="filteredProducts().length === 0">
          No products found. Try another search.
        </p>

        <div class="product-grid">
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
      </section>
    </div>
  `,
})
export class CustomerHomePage {
  private readonly api = inject(ApiClient);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly allProducts = signal<Product[]>([]);
  readonly addedId = signal<string | null>(null);
  readonly showSuggestions = signal(false);
  readonly searchText = signal('');

  readonly topLevel = computed(() => topLevelCategories(this.categories()));

  private readonly maxSuggestions = 8;

  readonly isSearching = computed(() => this.searchText().trim().length > 0);

  readonly filteredProducts = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    if (!q) return [];
    return this.allProducts().filter((p) => this.matchesQuery(p, q));
  });

  readonly searchSuggestions = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    if (!q) return [] as SearchSuggestion[];

    const categoryItems: SearchSuggestion[] = this.categories()
      .filter((c) => categoryLabel(this.categories(), c).toLowerCase().includes(q))
      .slice(0, 3)
      .map((category) => ({ kind: 'category' as const, category }));

    const productItems: SearchSuggestion[] = this.allProducts()
      .filter((p) => this.matchesQuery(p, q))
      .slice(0, this.maxSuggestions)
      .map((product) => ({ kind: 'product' as const, product }));

    return [...categoryItems, ...productItems].slice(0, this.maxSuggestions);
  });

  constructor() {
    this.api.listCategories().subscribe({
      next: (items) => this.categories.set(items),
    });
    this.api.listProducts().subscribe({
      next: (items) => this.allProducts.set(items.filter((p) => p.isActive)),
    });
  }

  private matchesQuery(p: Product, q: string) {
    const name = p.name.toLowerCase();
    const unit = p.unit.toLowerCase();
    const category = this.categoryName(p.categoryId).toLowerCase();
    const description = (p.description ?? '').toLowerCase();
    return name.includes(q) || unit.includes(q) || category.includes(q) || description.includes(q);
  }

  onSearchInput(value: string) {
    this.searchText.set(value);
    this.showSuggestions.set(value.trim().length > 0);
  }

  onSearchFocus() {
    if (this.searchText().trim()) this.showSuggestions.set(true);
  }

  onSearchBlur() {
    window.setTimeout(() => this.showSuggestions.set(false), 180);
  }

  clearSearch(event: Event) {
    event.preventDefault();
    this.searchText.set('');
    this.showSuggestions.set(false);
  }

  pickSuggestion(item: SearchSuggestion) {
    if (item.kind === 'category') {
      this.searchText.set('');
      this.showSuggestions.set(false);
      this.openCategory(item.category.id);
      return;
    }

    this.searchText.set('');
    this.showSuggestions.set(false);
    this.router.navigate(['/product', item.product.id]);
  }

  sectionTitle() {
    const q = this.searchText().trim();
    return q ? `Results for "${q}"` : 'Popular picks';
  }

  subsOf(parentId: string) {
    return subcategoriesOf(this.categories(), parentId);
  }

  openCategory(id: string) {
    this.router.navigate(['/category', id]);
  }

  categoryName(categoryId: string) {
    return categoryNameById(this.categories(), categoryId);
  }

  suggestionCategoryLabel(category: Category) {
    return categoryLabel(this.categories(), category);
  }

  categoryIcon(name: string) {
    return shopCategoryIcon(name);
  }

  categoryImage(category: Category) {
    return resolveImageUrl(category.imageUrl);
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
  productPriceLabel = productPriceLabel;
  discountBadge = discountBadge;
}
