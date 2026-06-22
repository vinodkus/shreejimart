import { Component, computed, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient, Category } from '../api/api-client';
import { categoryLabel, parentCategoryOptions } from '../utils/category-utils';
import { resolveImageUrl } from '../utils/image-url';

@Component({
  standalone: true,
  imports: [NgIf, NgForOf, FormsModule],
  template: `
    <div class="admin-page">
      <div class="admin-page__toolbar">
        <h2 class="admin-page__title">Categories</h2>
      </div>

      <div class="admin-card" *ngIf="!editingId()">
        <form class="category-form" (ngSubmit)="create()" #f="ngForm">
          <input
            name="name"
            required
            minlength="2"
            maxlength="120"
            placeholder="Category name (e.g. Fruits)"
            [(ngModel)]="name"
          />
          <label class="category-form__parent">
            Parent category
            <select [(ngModel)]="parentId" name="parentId">
              <option value="">None (top-level)</option>
              <option *ngFor="let p of parentOptions()" [value]="p.id">{{ p.name }}</option>
            </select>
          </label>
          <label class="category-form__order">
            Display order
            <input
              type="number"
              min="0"
              name="displayOrder"
              placeholder="Auto (last)"
              [(ngModel)]="displayOrder"
            />
          </label>

          <div class="image-section image-section--compact">
            <h3>Category image</h3>
            <div class="image-section__row">
              <div class="image-preview image-preview--small">
                <img *ngIf="createPreviewUrl()" [src]="createPreviewUrl()!" alt="Preview" />
                <span *ngIf="!createPreviewUrl()" class="image-preview__empty">No image</span>
              </div>
              <div class="image-actions">
                <label class="btn-upload">
                  Upload image
                  <input type="file" accept="image/*" (change)="onCreateFileSelected($event)" hidden />
                </label>
                <label>
                  Or image URL
                  <input
                    [(ngModel)]="createImageUrl"
                    name="createImageUrl"
                    placeholder="/uploads/categories/... or https://..."
                    (ngModelChange)="onCreateImageUrlChange()"
                  />
                </label>
                <button type="button" class="btn-ghost" (click)="clearCreateImage()">Remove image</button>
              </div>
            </div>
          </div>

          <button type="submit" class="btn-primary" [disabled]="isBusy() || !f.valid">Add category</button>
        </form>
        <p class="hint">Leave parent empty for a main category, or pick a parent to create a subcategory. Lower display order appears first on the shop page.</p>
      </div>

      <div class="admin-card" *ngIf="editingId()">
        <div class="admin-card__head">
          <h2>Edit category</h2>
          <button type="button" class="btn-ghost" (click)="cancelEdit()">✕</button>
        </div>
        <form class="category-form" (ngSubmit)="saveEdit()" #editForm="ngForm">
          <input
            name="editName"
            required
            minlength="2"
            maxlength="120"
            [(ngModel)]="editName"
          />
          <label class="category-form__parent">
            Parent category
            <select [(ngModel)]="editParentId" name="editParentId">
              <option value="">None (top-level)</option>
              <option *ngFor="let p of editParentOptions()" [value]="p.id">{{ p.name }}</option>
            </select>
          </label>
          <label class="category-form__order">
            Display order
            <input
              type="number"
              min="0"
              name="editDisplayOrder"
              required
              [(ngModel)]="editDisplayOrder"
            />
          </label>

          <div class="image-section image-section--compact">
            <h3>Category image</h3>
            <div class="image-section__row">
              <div class="image-preview image-preview--small">
                <img *ngIf="editPreviewUrl()" [src]="editPreviewUrl()!" alt="Preview" />
                <span *ngIf="!editPreviewUrl()" class="image-preview__empty">No image</span>
              </div>
              <div class="image-actions">
                <label class="btn-upload">
                  Upload image
                  <input type="file" accept="image/*" (change)="onEditFileSelected($event)" hidden />
                </label>
                <label>
                  Or image URL
                  <input
                    [(ngModel)]="editImageUrl"
                    name="editImageUrl"
                    placeholder="/uploads/categories/... or https://..."
                    (ngModelChange)="onEditImageUrlChange()"
                  />
                </label>
                <button type="button" class="btn-ghost" (click)="clearEditImage()">Remove image</button>
              </div>
            </div>
          </div>

          <button type="submit" class="btn-primary" [disabled]="isBusy() || !editForm.valid">Save</button>
          <button type="button" class="btn-secondary" (click)="cancelEdit()">Cancel</button>
        </form>
      </div>

      <p class="admin-alert admin-alert--error" *ngIf="error()">{{ error() }}</p>
      <p class="admin-alert admin-alert--success" *ngIf="success()">{{ success() }}</p>

      <div class="admin-card">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Image</th>
                <th>Category</th>
                <th>Type</th>
                <th>ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of categories()">
                <td>{{ c.displayOrder ?? 0 }}</td>
                <td>
                  <img class="thumb" [src]="categoryImage(c) || placeholder" [alt]="c.name" />
                </td>
                <td>
                  <strong [class.category-name--sub]="c.parentId">{{ displayName(c) }}</strong>
                </td>
                <td>
                  <span class="badge" [class.badge--on]="!c.parentId" [class.badge--off]="!!c.parentId">
                    {{ c.parentId ? 'Subcategory' : 'Main' }}
                  </span>
                </td>
                <td><code class="id-code">{{ c.id }}</code></td>
                <td class="actions-cell">
                  <button type="button" class="btn-ghost" (click)="openEdit(c)">Edit</button>
                  <button type="button" class="btn-danger" (click)="remove(c)">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="empty" *ngIf="categories().length === 0">No categories yet.</p>
        </div>
      </div>
    </div>
  `,
})
export class CategoriesPage {
  private readonly api = inject(ApiClient);
  readonly categories = signal<Category[]>([]);
  readonly isBusy = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);

  name = '';
  parentId = '';
  displayOrder: number | null = null;
  createImageUrl: string | null = null;
  editName = '';
  editParentId = '';
  editDisplayOrder = 0;
  editImageUrl: string | null = null;

  readonly placeholder =
    'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="#e2e8f0" width="80" height="80"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-size="10">No img</text></svg>');

  readonly parentOptions = computed(() => parentCategoryOptions(this.categories()));
  readonly editParentOptions = computed(() => parentCategoryOptions(this.categories(), this.editingId()));

  constructor() {
    this.refresh();
  }

  displayName(category: Category) {
    return categoryLabel(this.categories(), category);
  }

  categoryImage(category: Category) {
    return resolveImageUrl(category.imageUrl);
  }

  createPreviewUrl() {
    return resolveImageUrl(this.createImageUrl);
  }

  editPreviewUrl() {
    return resolveImageUrl(this.editImageUrl);
  }

  private refresh() {
    this.error.set(null);
    this.api.listCategories().subscribe({
      next: (items) => this.categories.set(items),
      error: (e) => this.error.set(e?.message ?? 'Failed to load categories'),
    });
  }

  create() {
    const name = this.name.trim();
    if (name.length < 2) return;
    this.isBusy.set(true);
    this.error.set(null);
    this.success.set(null);
    this.api
      .createCategory({
        name,
        parentId: this.parentId || null,
        imageUrl: this.createImageUrl?.trim() || null,
        displayOrder: this.displayOrder,
      })
      .subscribe({
        next: () => {
          this.name = '';
          this.parentId = '';
          this.displayOrder = null;
          this.createImageUrl = null;
          this.success.set('Category added.');
          this.refresh();
        },
        error: (e) => this.error.set(e?.error ?? e?.message ?? 'Failed to create'),
        complete: () => this.isBusy.set(false),
      });
  }

  openEdit(category: Category) {
    this.editingId.set(category.id);
    this.editName = category.name;
    this.editParentId = category.parentId ?? '';
    this.editDisplayOrder = category.displayOrder ?? 0;
    this.editImageUrl = category.imageUrl ?? null;
    this.error.set(null);
    this.success.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editName = '';
    this.editParentId = '';
    this.editDisplayOrder = 0;
    this.editImageUrl = null;
  }

  saveEdit() {
    const id = this.editingId();
    const name = this.editName.trim();
    if (!id || name.length < 2) return;

    this.isBusy.set(true);
    this.error.set(null);
    this.success.set(null);

    this.api
      .updateCategory(id, {
        name,
        parentId: this.editParentId || null,
        imageUrl: this.editImageUrl?.trim() || null,
        displayOrder: this.editDisplayOrder,
      })
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.success.set('Category updated.');
          this.refresh();
        },
        error: (e) => this.error.set(e?.error ?? e?.message ?? 'Failed to update'),
        complete: () => this.isBusy.set(false),
      });
  }

  remove(category: Category) {
    if (!confirm(`Delete category "${this.displayName(category)}"?`)) return;

    this.isBusy.set(true);
    this.error.set(null);
    this.success.set(null);

    this.api.deleteCategory(category.id).subscribe({
      next: () => {
        if (this.editingId() === category.id) this.cancelEdit();
        this.success.set('Category deleted.');
        this.refresh();
      },
      error: (e) => this.error.set(e?.error ?? e?.message ?? 'Failed to delete'),
      complete: () => this.isBusy.set(false),
    });
  }

  onCreateImageUrlChange() {
    if (!this.createImageUrl?.trim()) this.createImageUrl = null;
  }

  onEditImageUrlChange() {
    if (!this.editImageUrl?.trim()) this.editImageUrl = null;
  }

  clearCreateImage() {
    this.createImageUrl = null;
  }

  clearEditImage() {
    this.editImageUrl = null;
  }

  onCreateFileSelected(event: Event) {
    this.uploadImage(event, (url) => {
      this.createImageUrl = url;
      this.success.set('Image uploaded.');
    });
  }

  onEditFileSelected(event: Event) {
    this.uploadImage(event, (url) => {
      this.editImageUrl = url;
      this.success.set('Image uploaded.');
    });
  }

  private uploadImage(event: Event, onSuccess: (url: string) => void) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isBusy.set(true);
    this.error.set(null);
    this.api.uploadCategoryImage(file).subscribe({
      next: (res) => {
        onSuccess(res.url);
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
}
