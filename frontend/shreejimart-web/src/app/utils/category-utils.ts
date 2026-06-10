import { Category } from '../api/api-client';

export function topLevelCategories(categories: Category[]) {
  return categories.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name));
}

export function subcategoriesOf(categories: Category[], parentId: string) {
  return categories.filter((c) => c.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name));
}

export function hasSubcategories(categories: Category[], categoryId: string) {
  return categories.some((c) => c.parentId === categoryId);
}

export function categoryLabel(categories: Category[], category: Category) {
  if (!category.parentId) return category.name;
  const parent = categories.find((c) => c.id === category.parentId);
  return parent ? `${parent.name} › ${category.name}` : category.name;
}

export function categoryNameById(categories: Category[], categoryId: string, fallback = 'Grocery') {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return fallback;
  return categoryLabel(categories, category);
}

export function parentCategoryOptions(categories: Category[], excludeId?: string | null) {
  return topLevelCategories(categories).filter((c) => c.id !== excludeId);
}

export interface CategoryBrowseOption {
  id: string;
  label: string;
  depth: number;
}

export function categoryBrowseOptions(categories: Category[]): CategoryBrowseOption[] {
  const items: CategoryBrowseOption[] = [];
  for (const parent of topLevelCategories(categories)) {
    items.push({ id: parent.id, label: parent.name, depth: 0 });
    for (const sub of subcategoriesOf(categories, parent.id)) {
      items.push({ id: sub.id, label: `${parent.name} › ${sub.name}`, depth: 1 });
    }
  }
  return items;
}
