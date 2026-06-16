import { DiscountType, Product } from '../api/api-client';

type PricedProduct = Pick<Product, 'price' | 'discountType' | 'discountValue'>;

export function effectivePrice(product: PricedProduct): number {
  const type = product.discountType;
  const value = product.discountValue;
  if (!type || value == null || value <= 0) return product.price;

  if (type === 'rupees' && value < product.price) return value;

  if (type === 'percent' && value > 0 && value < 100) {
    return Math.round(product.price * (1 - value / 100) * 100) / 100;
  }

  return product.price;
}

export function hasDiscount(product: PricedProduct): boolean {
  return effectivePrice(product) < product.price;
}

export function formatProductPrice(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export function productPriceLabel(product: PricedProduct): string {
  return `₹${formatProductPrice(effectivePrice(product))}`;
}

export function discountBadge(product: PricedProduct): string | null {
  if (!hasDiscount(product)) return null;

  if (product.discountType === 'percent' && product.discountValue != null) {
    const pct = product.discountValue;
    const label = Number.isInteger(pct) ? String(pct) : pct.toFixed(1).replace(/\.0$/, '');
    return `${label}% OFF`;
  }

  if (product.discountType === 'rupees') {
    const saved = product.price - effectivePrice(product);
    if (saved > 0) return `₹${formatProductPrice(saved)} OFF`;
  }

  return null;
}

export function discountSummary(product: PricedProduct): string | null {
  const badge = discountBadge(product);
  if (!badge) return null;
  return badge.replace(' OFF', ' off');
}

export function isDiscountValid(
  price: number,
  discountType: DiscountType | '' | null | undefined,
  discountValue: number | null | undefined,
): boolean {
  if (!discountType || discountValue == null || discountValue === 0) return true;

  if (discountType === 'rupees') {
    return discountValue > 0 && discountValue < price;
  }

  if (discountType === 'percent') {
    return discountValue > 0 && discountValue < 100;
  }

  return false;
}
