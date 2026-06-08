import { Component, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient, Category, Product, ProductPayload } from '../api/api-client';
import { CategorySearchSelectComponent } from '../components/category-search-select';
import { resolveImageUrl } from '../utils/image-url';

interface BulkProductRow {
  name: string;
  price: number;
  unit: string;
  stockQuantity: number;
  isActive: boolean;
  imageUrl: string | null;
}

type FormMode = 'single' | 'bulk' | null;

@Component({
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule, CategorySearchSelectComponent],
  template: `
    <div class="admin-page">
      <div class="admin-page__toolbar">
        <div class="admin-filters">
          <label>
            Filter category
            <app-category-search-select
              [(ngModel)]="filterCategoryId"
              name="filter"
              [categories]="categories()"
              [allowEmpty]="true"
              emptyLabel="All categories"
              placeholder="Search or filter by category..."
              (ngModelChange)="refreshProducts()"
            />
          </label>
          <button type="button" class="btn-secondary" (click)="refreshProducts()">Refresh</button>
        </div>
        <div class="admin-page__actions">
          <button type="button" class="btn-secondary" (click)="openBulkCreate()">+ Bulk add</button>
          <button type="button" class="btn-primary" (click)="openCreate()">+ Add product</button>
        </div>
      </div>

      <p class="admin-alert admin-alert--error" *ngIf="error()">{{ error() }}</p>
      <p class="admin-alert admin-alert--success" *ngIf="success()">{{ success() }}</p>

      <div class="admin-card" *ngIf="formMode() === 'single'">
        <div class="admin-card__head">
          <h2>{{ editingId() ? 'Edit product' : 'New product' }}</h2>
          <button type="button" class="btn-ghost" (click)="closeForm()">✕</button>
        </div>

        <form class="product-form" (ngSubmit)="save()" #f="ngForm">
          <div class="product-form__grid">
            <label>
              Category *
              <app-category-search-select
                [(ngModel)]="form.categoryId"
                name="categoryId"
                required
                [categories]="categories()"
                placeholder="Type or select category..."
              />
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
            <label>
              Stock quantity *
              <input [(ngModel)]="form.stockQuantity" name="stockQuantity" type="number" min="0" step="1" required />
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

      <div class="admin-card" *ngIf="formMode() === 'bulk'">
        <div class="admin-card__head">
          <h2>Bulk add products</h2>
          <button type="button" class="btn-ghost" (click)="closeForm()">✕</button>
        </div>

        <p class="hint bulk-hint">
          Select a category once, add multiple products below, then click <strong>Create all products</strong>.
          Images are optional — upload a photo or paste a URL per row.
        </p>

        <form class="product-form" (ngSubmit)="saveBulk()" #bulkForm="ngForm">
          <label class="bulk-category">
            Category *
            <app-category-search-select
              [(ngModel)]="bulkCategoryId"
              name="bulkCategoryId"
              required
              [categories]="categories()"
              placeholder="Type or select category..."
            />
          </label>

          <div class="bulk-toolbar">
            <span>{{ validBulkRows().length }} product(s) ready</span>
            <button type="button" class="btn-secondary" (click)="addBulkRow()">+ Add row</button>
          </div>

          <div class="admin-table-wrap">
            <table class="admin-table bulk-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Image</th>
                  <th>Product name *</th>
                  <th>Price (₹) *</th>
                  <th>Unit *</th>
                  <th>Stock *</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of bulkRows; let i = index">
                  <td>{{ i + 1 }}</td>
                  <td class="bulk-image-cell">
                    <div class="bulk-image-cell__preview">
                      <img *ngIf="bulkRowPreview(row)" [src]="bulkRowPreview(row)!" alt="" />
                      <span *ngIf="!bulkRowPreview(row)" class="bulk-image-cell__empty">No img</span>
                    </div>
                    <label class="btn-upload btn-upload--compact">
                      Browse image
                      <input
                        type="file"
                        accept="image/*"
                        (change)="onBulkFileSelected($event, i)"
                        hidden
                      />
                    </label>
                    <input
                      [(ngModel)]="row.imageUrl"
                      [name]="'bulkImage' + i"
                      placeholder="Or image URL"
                      class="bulk-image-url"
                    />
                    <button
                      type="button"
                      class="bulk-image-clear"
                      *ngIf="row.imageUrl"
                      (click)="clearBulkImage(i)"
                    >
                      Clear
                    </button>
                  </td>
                  <td>
                    <input
                      [(ngModel)]="row.name"
                      [name]="'bulkName' + i"
                      required
                      minlength="2"
                      maxlength="160"
                      placeholder="Product name"
                    />
                  </td>
                  <td>
                    <input
                      [(ngModel)]="row.price"
                      [name]="'bulkPrice' + i"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </td>
                  <td>
                    <input
                      [(ngModel)]="row.unit"
                      [name]="'bulkUnit' + i"
                      required
                      maxlength="32"
                      placeholder="pcs"
                    />
                  </td>
                  <td>
                    <input
                      [(ngModel)]="row.stockQuantity"
                      [name]="'bulkStock' + i"
                      type="number"
                      min="0"
                      step="1"
                      required
                    />
                  </td>
                  <td class="bulk-active-cell">
                    <input [(ngModel)]="row.isActive" [name]="'bulkActive' + i" type="checkbox" />
                  </td>
                  <td class="actions-cell">
                    <button
                      type="button"
                      class="btn-ghost"
                      (click)="removeBulkRow(i)"
                      [disabled]="bulkRows.length === 1"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="form-actions">
            <button
              type="submit"
              class="btn-primary"
              [disabled]="isBusy() || !bulkForm.valid || !bulkCategoryId || validBulkRows().length === 0"
            >
              Create all products ({{ validBulkRows().length }})
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
                <th>Stock</th>
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
                  <span
                    class="badge"
                    [class.badge--on]="p.stockQuantity > 5"
                    [class.badge--off]="p.stockQuantity <= 5"
                  >
                    {{ p.stockQuantity }}
                  </span>
                </td>
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
          <p class="empty" *ngIf="products().length === 0">No products yet. Click “Add product” or “Bulk add”.</p>
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
  readonly formMode = signal<FormMode>(null);
  readonly editingId = signal<string | null>(null);

  filterCategoryId = '';
  form: ProductPayload = this.emptyForm();
  bulkCategoryId = '';
  bulkRows: BulkProductRow[] = [this.emptyBulkRow(), this.emptyBulkRow(), this.emptyBulkRow()];

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
    return {
      categoryId: '',
      name: '',
      price: 0,
      unit: 'pcs',
      imageUrl: null,
      isActive: true,
      stockQuantity: 0,
    };
  }

  private emptyBulkRow(): BulkProductRow {
    return { name: '', price: 0, unit: 'pcs', stockQuantity: 10, isActive: true, imageUrl: null };
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
    this.formMode.set('single');
    this.error.set(null);
    this.success.set(null);
  }

  openBulkCreate() {
    this.editingId.set(null);
    this.bulkCategoryId = this.filterCategoryId || '';
    this.bulkRows = [this.emptyBulkRow(), this.emptyBulkRow(), this.emptyBulkRow()];
    this.formMode.set('bulk');
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
      stockQuantity: p.stockQuantity ?? 0,
    };
    this.formMode.set('single');
    this.error.set(null);
    this.success.set(null);
  }

  closeForm() {
    this.formMode.set(null);
    this.editingId.set(null);
  }

  addBulkRow() {
    if (this.bulkRows.length >= 50) {
      this.error.set('Maximum 50 products per bulk add.');
      return;
    }
    this.bulkRows = [...this.bulkRows, this.emptyBulkRow()];
  }

  removeBulkRow(index: number) {
    if (this.bulkRows.length === 1) return;
    this.bulkRows = this.bulkRows.filter((_, i) => i !== index);
  }

  validBulkRows() {
    return this.bulkRows.filter((row) => {
      const name = row.name.trim();
      const unit = row.unit.trim();
      return name.length >= 2 && unit.length >= 1 && row.price >= 0 && row.stockQuantity >= 0;
    });
  }

  onImageUrlChange() {
    if (!this.form.imageUrl?.trim()) this.form.imageUrl = null;
  }

  clearImage() {
    this.form.imageUrl = null;
  }

  bulkRowPreview(row: BulkProductRow) {
    return resolveImageUrl(row.imageUrl);
  }

  clearBulkImage(index: number) {
    this.bulkRows[index].imageUrl = null;
    this.bulkRows = [...this.bulkRows];
  }

  onBulkFileSelected(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isBusy.set(true);
    this.error.set(null);
    this.api.uploadProductImage(file).subscribe({
      next: (res) => {
        this.bulkRows[index].imageUrl = res.url;
        this.bulkRows = [...this.bulkRows];
        this.success.set(`Image uploaded for row ${index + 1}.`);
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

  saveBulk() {
    const items = this.validBulkRows();
    if (!this.bulkCategoryId || items.length === 0) return;

    this.isBusy.set(true);
    this.error.set(null);
    this.success.set(null);

    this.api
      .createProductsBulk({
        categoryId: this.bulkCategoryId,
        items: items.map((row) => ({
          name: row.name.trim(),
          price: row.price,
          unit: row.unit.trim(),
          imageUrl: row.imageUrl?.trim() || null,
          isActive: row.isActive,
          stockQuantity: row.stockQuantity,
        })),
      })
      .subscribe({
        next: (created) => {
          this.success.set(`${created.length} products created.`);
          this.closeForm();
          this.refreshProducts();
        },
        error: (e) => this.error.set(e?.error ?? e?.message ?? 'Bulk create failed'),
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
