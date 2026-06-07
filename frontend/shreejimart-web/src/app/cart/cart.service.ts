import { computed, Injectable, signal } from '@angular/core';
import { Product } from '../api/api-client';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  imageUrl?: string | null;
  stockQuantity: number;
  quantity: number;
}

const STORAGE_KEY = 'shreejimart_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly items = signal<CartItem[]>(this.load());

  readonly cartItems = this.items.asReadonly();

  readonly itemCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0),
  );

  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  addProduct(product: Product) {
    const stock = product.stockQuantity ?? 0;
    if (stock < 1) return;

    const current = [...this.items()];
    const existing = current.find((x) => x.productId === product.id);
    if (existing) {
      const maxQty = this.maxQty(stock, existing.stockQuantity);
      existing.stockQuantity = maxQty;
      existing.quantity = Math.min(maxQty, existing.quantity + 1);
    } else {
      current.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        imageUrl: product.imageUrl,
        stockQuantity: stock,
        quantity: 1,
      });
    }
    this.persist(current);
  }

  setQuantity(productId: string, quantity: number) {
    if (quantity < 1) {
      this.remove(productId);
      return;
    }
    const current = this.items().map((item) => {
      if (item.productId !== productId) return item;
      const maxQty = this.maxQty(item.stockQuantity);
      return { ...item, quantity: Math.min(maxQty, quantity) };
    });
    this.persist(current);
  }

  private maxQty(...values: number[]) {
    return Math.min(99, Math.max(0, ...values));
  }

  remove(productId: string) {
    this.persist(this.items().filter((x) => x.productId !== productId));
  }

  clear() {
    this.persist([]);
  }

  private persist(items: CartItem[]) {
    this.items.set(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }

  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (x) =>
            x &&
            typeof x.productId === 'string' &&
            typeof x.name === 'string' &&
            typeof x.price === 'number' &&
            typeof x.quantity === 'number' &&
            x.quantity > 0,
        )
        .map((x) => ({
          ...x,
          stockQuantity: typeof x.stockQuantity === 'number' ? x.stockQuantity : 99,
        }));
    } catch {
      return [];
    }
  }
}
