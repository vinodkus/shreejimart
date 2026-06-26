import { Component, computed, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { ApiClient, Category } from '../api/api-client';
import { ProductSearchComponent } from '../components/product-search';
import { resolveImageUrl } from '../utils/image-url';
import { subcategoriesOf, topLevelCategories } from '../utils/category-utils';
import { shopCategoryIcon } from '../utils/product-display.utils';

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, ProductSearchComponent],
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

      <app-product-search variant="hero" placeholder="Search atta, milk, fruits..." />

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
    </div>
  `,
})
export class CustomerHomePage {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);

  readonly topLevel = computed(() => topLevelCategories(this.categories()));

  constructor() {
    this.api.listCategories().subscribe({
      next: (items) => this.categories.set(items),
    });
  }

  subsOf(parentId: string) {
    return subcategoriesOf(this.categories(), parentId);
  }

  openCategory(id: string) {
    this.router.navigate(['/category', id]);
  }

  categoryIcon(name: string) {
    return shopCategoryIcon(name);
  }

  categoryImage(category: Category) {
    return resolveImageUrl(category.imageUrl);
  }
}
