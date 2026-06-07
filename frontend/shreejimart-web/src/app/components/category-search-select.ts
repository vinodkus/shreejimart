import {
  Component,
  Input,
  forwardRef,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgForOf, NgIf } from '@angular/common';
import { Category } from '../api/api-client';

@Component({
  standalone: true,
  selector: 'app-category-search-select',
  imports: [NgForOf, NgIf, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CategorySearchSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="category-combobox" [class.category-combobox--disabled]="disabled">
      <input
        class="category-combobox__input"
        type="text"
        [placeholder]="placeholder"
        [(ngModel)]="searchText"
        (ngModelChange)="onSearchChange($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        [disabled]="disabled"
        autocomplete="off"
        name="categorySearch"
      />
      <ul class="category-combobox__list" *ngIf="dropdownOpen() && filteredCategories().length > 0">
        <li *ngIf="allowEmpty && matchesEmpty()">
          <button type="button" (mousedown)="pick('', emptyLabel)">{{ emptyLabel }}</button>
        </li>
        <li *ngFor="let c of filteredCategories()">
          <button type="button" (mousedown)="pick(c.id, c.name)">{{ c.name }}</button>
        </li>
      </ul>
      <p class="category-combobox__empty" *ngIf="dropdownOpen() && searchText.trim() && filteredCategories().length === 0 && !matchesEmpty()">
        No category found
      </p>
    </div>
  `,
})
export class CategorySearchSelectComponent implements ControlValueAccessor, OnChanges {
  @Input() categories: Category[] = [];
  @Input() placeholder = 'Type or select category...';
  @Input() allowEmpty = false;
  @Input() emptyLabel = 'All categories';

  searchText = '';
  readonly dropdownOpen = signal(false);
  disabled = false;

  private categoryId = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categories']) this.syncSearchText();
  }

  writeValue(value: string | null) {
    this.categoryId = value ?? '';
    this.syncSearchText();
  }

  registerOnChange(fn: (value: string) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  filteredCategories() {
    const q = this.searchText.trim().toLowerCase();
    if (!q || (this.allowEmpty && q === this.emptyLabel.toLowerCase())) {
      return this.categories;
    }
    return this.categories.filter((c) => c.name.toLowerCase().includes(q));
  }

  matchesEmpty() {
    const q = this.searchText.trim().toLowerCase();
    return !q || this.emptyLabel.toLowerCase().includes(q);
  }

  onSearchChange(value: string) {
    this.dropdownOpen.set(true);
    const exact = this.categories.find((c) => c.name.toLowerCase() === value.trim().toLowerCase());
    if (exact) {
      this.pick(exact.id, exact.name, false);
      return;
    }
    if (this.allowEmpty && !value.trim()) {
      this.pick('', this.emptyLabel, false);
      return;
    }
    this.categoryId = '';
    this.onChange('');
  }

  onFocus() {
    this.dropdownOpen.set(true);
  }

  onBlur() {
    window.setTimeout(() => {
      this.dropdownOpen.set(false);
      this.syncSearchText();
      this.onTouched();
    }, 150);
  }

  pick(id: string, name: string, close = true) {
    this.categoryId = id;
    this.searchText = name;
    this.onChange(id);
    this.onTouched();
    if (close) this.dropdownOpen.set(false);
  }

  private syncSearchText() {
    if (!this.categoryId) {
      this.searchText = this.allowEmpty ? this.emptyLabel : '';
      return;
    }
    const cat = this.categories.find((c) => c.id === this.categoryId);
    this.searchText = cat?.name ?? '';
  }
}
