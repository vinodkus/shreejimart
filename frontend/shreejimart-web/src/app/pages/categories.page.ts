import { Component, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient, Category } from '../api/api-client';

@Component({
  standalone: true,
  imports: [NgIf, NgForOf, FormsModule],
  template: `
    <div class="admin-page">
      <div class="admin-page__toolbar">
        <h2 class="admin-page__title">Categories</h2>
      </div>

      <div class="admin-card" *ngIf="!editingId()">
        <form class="inline-form" (ngSubmit)="create()" #f="ngForm">
          <input
            name="name"
            required
            minlength="2"
            maxlength="120"
            placeholder="New category name (e.g. Fruits)"
            [(ngModel)]="name"
          />
          <button type="submit" class="btn-primary" [disabled]="isBusy() || !f.valid">Add category</button>
        </form>
      </div>

      <div class="admin-card" *ngIf="editingId()">
        <div class="admin-card__head">
          <h2>Edit category</h2>
          <button type="button" class="btn-ghost" (click)="cancelEdit()">✕</button>
        </div>
        <form class="inline-form" (ngSubmit)="saveEdit()" #editForm="ngForm">
          <input
            name="editName"
            required
            minlength="2"
            maxlength="120"
            [(ngModel)]="editName"
          />
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
                <th>#</th>
                <th>Category name</th>
                <th>ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of categories(); let i = index">
                <td>{{ i + 1 }}</td>
                <td><strong>{{ c.name }}</strong></td>
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
  editName = '';

  constructor() {
    this.refresh();
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
    this.api.createCategory({ name }).subscribe({
      next: () => {
        this.name = '';
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
    this.error.set(null);
    this.success.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editName = '';
  }

  saveEdit() {
    const id = this.editingId();
    const name = this.editName.trim();
    if (!id || name.length < 2) return;

    this.isBusy.set(true);
    this.error.set(null);
    this.success.set(null);

    this.api.updateCategory(id, { name }).subscribe({
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
    if (!confirm(`Delete category "${category.name}"?`)) return;

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
}
