import { Category, Product } from '../api/api-client';
import { categoryLabel, categoryNameById } from './category-utils';

export function matchesProductQuery(product: Product, query: string, categories: Category[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const category = categoryNameById(categories, product.categoryId, '').toLowerCase();
  return (
    product.name.toLowerCase().includes(q) ||
    (product.description ?? '').toLowerCase().includes(q) ||
    product.unit.toLowerCase().includes(q) ||
    category.includes(q)
  );
}

export function filterProductsByQuery(products: Product[], query: string, categories: Category[]) {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) => matchesProductQuery(p, q, categories));
}

export function matchesCategoryQuery(category: Category, query: string, categories: Category[]) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return categoryLabel(categories, category).toLowerCase().includes(q);
}
