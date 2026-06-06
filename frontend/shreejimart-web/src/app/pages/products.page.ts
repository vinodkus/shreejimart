import { Component, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient, Category, Product, ProductPayload } from '../api/api-client';
import { resolveImageUrl } from '../utils/image-url';

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule],
  template: `
    <div class="admin-page">
      <div class="admin-page__toolbar">
        <div class="admin-filters">
          <label>
            Filter category
            <select [(ngModel)]="filterCategoryId" name="filter" (change)="refreshProducts()">
              <option value="">All categories</option>
              <option *ngFor="let c of categories()" [value]="c.id">{{ c.name }}</option>
            </select>
          </label>
          <button type="button" class="btn-secondary" (click)="refreshProducts()">Refresh</button>
        </div>
        <button type="button" class="btn-primary" (click)="openCreate()">+ Add product</button>
      </div>

      <p class="admin-alert admin-alert--error" *ngIf="error()">{{ error() }}</p>
      <p class="admin-alert admin-alert--success" *ngIf="success()">{{ success() }}</p>

      <div class="admin-card" *ngIf="showForm()">
        <div class="admin-card__head">
          <h2>{{ editingId() ? 'Edit product' : 'New product' }}</h2>
          <button type="button" class="btn-ghost" (click)="closeForm()">✕</button>
        </div>

        <form class="product-form" (ngSubmit)="save()" #f="ngForm">
          <div class="product-form__grid">
            <label>
              Category *
              <select [(ngModel)]="form.categoryId" name="categoryId" required>
                <option value="" disabled>Select category</option>
                <option *ngFor="let c of categories()" [value]="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label>
              Product name *
              <input [(ngModel)]="form.name" name="name" required minlength="2" maxlength="160" />
            </label>
            <label>
              Price (₹) *
              <input [(ngModel)]="form.price" name="price" type="number" min="0" step="0.01" required />
            </label>
            <label>
              Unit *
              <input [(ngModel)]="form.unit" name="unit" required maxlength="32" placeholder="kg, pcs, liter" />
            </label>
            <label class="checkbox-label">
              <input [(ngModel)]="form.isActive" name="isActive" type="checkbox" />
              Active on shop
            </label>
          </div>

          <div class="image-section">
            <h3>Product image</h3>
            <p class="hint">Upload a photo or paste an image URL. Saved in <code>products.image_url</code>.</p>

            <div class="image-section__row">
              <div class="image-preview">
                <img *ngIf="previewUrl()" [src]="previewUrl()!" alt="Preview" />
                <span *ngIf="!previewUrl()" class="image-preview__empty">No image</span>
              </div>

              <div class="image-actions">
                <label class="btn-upload">
                  Upload image
                  <input type="file" accept="image/*" (change)="onFileSelected($event)" hidden />
                </label>
                <label>
                  Or image URL
                  <input
                    [(ngModel)]="form.imageUrl"
                    name="imageUrl"
                    placeholder="/uploads/products/... or https://..."
                    (ngModelChange)="onImageUrlChange()"
                  />
                </label>
                <button type="button" class="btn-ghost" (click)="clearImage()">Remove image</button>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="isBusy() || !f.valid">
              {{ editingId() ? 'Update product' : 'Create product' }}
            </button>
            <button type="button" class="btn-secondary" (click)="closeForm()">Cancel</button>
          </div>
        </form>
      </div>

      <div class="admin-card">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of products()">
                <td>
                  <img class="thumb" [src]="productImage(p) || placeholder" [alt]="p.name" />
                </td>
                <td>
                  <strong>{{ p.name }}</strong>
                  <small>{{ p.unit }}</small>
                </td>
                <td>{{ categoryName(p.categoryId) }}</td>
                <td>₹{{ p.price }}</td>
                <td>
                  <span class="badge" [class.badge--on]="p.isActive" [class.badge--off]="!p.isActive">
                    {{ p.isActive ? 'Active' : 'Hidden' }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button type="button" class="btn-ghost" (click)="openEdit(p)">Edit</button>
                  <button type="button" class="btn-danger" (click)="remove(p)">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="empty" *ngIf="products().length === 0">No products yet. Click “Add product”.</p>
        </div>
      </div>
    </div>
  `,
})
export class ProductsPage {
  private readonly api = inject(ApiClient);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly isBusy = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);

  filterCategoryId = '';
  form: ProductPayload = this.emptyForm();
  readonly placeholder =
    'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="#e2e8f0" width="80" height="80"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-size="10">No img</text></svg>');

  constructor() {
    this.refreshCategories();
    this.refreshProducts();
  }

  previewUrl() {
    return resolveImageUrl(this.form.imageUrl);
  }

  productImage(p: Product) {
    return resolveImageUrl(p.imageUrl);
  }

  private emptyForm(): ProductPayload {
    return { categoryId: '', name: '', price: 0, unit: 'pcs', imageUrl: null, isActive: true };
  }

  private refreshCategories() {
    this.api.listCategories().subscribe({
      next: (items) => this.categories.set(items),
      error: (e) => this.error.set(e?.message ?? 'Failed to load categories'),
    });
  }

  refreshProducts() {
    this.error.set(null);
    this.api.listProducts(this.filterCategoryId || undefined).subscribe({
      next: (items) => this.products.set(items),
      error: (e) => this.error.set(e?.message ?? 'Failed to load products'),
    });
  }

  categoryName(categoryId: string) {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '—';
  }

  openCreate() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    if (this.categories().length > 0) this.form.categoryId = this.categories()[0].id;
    this.showForm.set(true);
    this.error.set(null);
    this.success.set(null);
  }

  openEdit(p: Product) {
    this.editingId.set(p.id);
    this.form = {
      categoryId: p.categoryId,
      name: p.name,
      price: p.price,
      unit: p.unit,
      imageUrl: p.imageUrl ?? null,
      isActive: p.isActive,
    };
    this.showForm.set(true);
    this.error.set(null);
    this.success.set(null);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  onImageUrlChange() {
    if (!this.form.imageUrl?.trim()) this.form.imageUrl = null;
  }

  clearImage() {
    this.form.imageUrl = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isBusy.set(true);
    this.error.set(null);
    this.api.uploadProductImage(file).subscribe({
      next: (res) => {
        this.form.imageUrl = res.url;
        this.success.set('Image uploaded.');
        this.isBusy.set(false);
        input.value = '';
      },
      error: (e) => {
        this.error.set(e?.error ?? 'Image upload failed.');
        this.isBusy.set(false);
        input.value = '';
      },
    });
  }

  save() {
    if (!this.form.categoryId) return;
    this.isBusy.set(true);
    this.error.set(null);
    this.success.set(null);

    const payload: ProductPayload = {
      ...this.form,
      imageUrl: this.form.imageUrl?.trim() || null,
    };

    const id = this.editingId();
    const req = id ? this.api.updateProduct(id, payload) : this.api.createProduct(payload);

    req.subscribe({
      next: () => {
        this.success.set(id ? 'Product updated.' : 'Product created.');
        this.closeForm();
        this.refreshProducts();
      },
      error: (e) => this.error.set(e?.error ?? e?.message ?? 'Save failed'),
      complete: () => this.isBusy.set(false),
    });
  }

  remove(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    this.isBusy.set(true);
    this.api.deleteProduct(p.id).subscribe({
      next: () => {
        this.success.set('Product deleted.');
        this.refreshProducts();
      },
      error: (e) => this.error.set(e?.error ?? 'Delete failed'),
      complete: () => this.isBusy.set(false),
    });
  }
}
