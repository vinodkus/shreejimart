import { Component, computed, inject, input, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiClient, Category, Product } from '../api/api-client';
import { categoryLabel } from '../utils/category-utils';
import { resolveImageUrl } from '../utils/image-url';
import { matchesCategoryQuery, matchesProductQuery } from '../utils/product-search.utils';
import { shopCategoryIcon, shopProductEmoji } from '../utils/product-display.utils';
import { discountBadge, productPriceLabel } from '../utils/product-price.utils';
import { categoryNameById } from '../utils/category-utils';

type SearchSuggestion =
  | { kind: 'product'; product: Product }
  | { kind: 'category'; category: Category };

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule],
  template: `
    <div
      class="search-bar-wrap"
      [class.search-bar-wrap--header]="variant() === 'header'"
      [class.search-bar-wrap--hero]="variant() === 'hero'"
    >
      <form class="search-bar" [class.search-bar--header]="variant() === 'header'" (submit)="onSubmit($event)">
        <span class="search-bar__icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          [placeholder]="placeholder()"
          [ngModel]="searchText()"
          (ngModelChange)="onSearchInput($event)"
          (focus)="onSearchFocus()"
          (blur)="onSearchBlur()"
          name="productSearch"
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
      </form>

      <ul class="search-suggestions" *ngIf="showSuggestions() && searchSuggestions().length > 0">
        <li *ngFor="let item of searchSuggestions()">
          <button type="button" class="search-suggestion" (mousedown)="pickSuggestion(item)">
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
              <small class="search-suggestion__desc" *ngIf="item.kind === 'product' && item.product.description">
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
        <li *ngIf="searchText().trim()">
          <button type="button" class="search-suggestion search-suggestion--all" (mousedown)="viewAllResults($event)">
            <span class="search-suggestion__body">
              <strong>See all results for "{{ searchText().trim() }}"</strong>
              <small>Search across all categories</small>
            </span>
          </button>
        </li>
      </ul>

      <p
        class="search-suggestions__empty"
        *ngIf="showSuggestions() && searchText().trim() && searchSuggestions().length === 0"
      >
        No suggestions for "{{ searchText().trim() }}"
      </p>
    </div>
  `,
})
export class ProductSearchComponent {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);

  readonly variant = input<'header' | 'hero'>('header');
  readonly placeholder = input('Search products...');

  readonly categories = signal<Category[]>([]);
  readonly allProducts = signal<Product[]>([]);
  readonly searchText = signal('');
  readonly showSuggestions = signal(false);

  private readonly maxSuggestions = 8;

  readonly searchSuggestions = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    if (!q) return [] as SearchSuggestion[];

    const categories = this.categories();
    const products = this.allProducts();

    const categoryItems: SearchSuggestion[] = categories
      .filter((c) => matchesCategoryQuery(c, q, categories))
      .slice(0, 3)
      .map((category) => ({ kind: 'category' as const, category }));

    const productItems: SearchSuggestion[] = products
      .filter((p) => matchesProductQuery(p, q, categories))
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

  onSubmit(event: Event) {
    event.preventDefault();
    this.goToSearchResults();
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
      this.router.navigate(['/category', item.category.id]);
      return;
    }

    this.searchText.set('');
    this.showSuggestions.set(false);
    this.router.navigate(['/product', item.product.id]);
  }

  viewAllResults(event: Event) {
    event.preventDefault();
    this.goToSearchResults();
  }

  private goToSearchResults() {
    const q = this.searchText().trim();
    if (!q) return;
    this.showSuggestions.set(false);
    this.router.navigate(['/search'], { queryParams: { q } });
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

  productImage(product: Product) {
    return resolveImageUrl(product.imageUrl);
  }

  productEmoji(name: string) {
    return shopProductEmoji(name);
  }

  productPriceLabel = productPriceLabel;
  discountBadge = discountBadge;
}
