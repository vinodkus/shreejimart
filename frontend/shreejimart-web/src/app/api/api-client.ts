import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  parentName?: string | null;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  unit: string;
  imageUrl?: string | null;
  isActive: boolean;
  stockQuantity: number;
}

export interface ProductPayload {
  categoryId: string;
  name: string;
  price: number;
  unit: string;
  imageUrl?: string | null;
  isActive: boolean;
  stockQuantity: number;
}

export interface BulkProductItem {
  name: string;
  price: number;
  unit: string;
  imageUrl?: string | null;
  isActive: boolean;
  stockQuantity: number;
}

export interface BulkCreateProductsPayload {
  categoryId: string;
  items: BulkProductItem[];
}

export interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  customerName?: string | null;
  phone: string;
  deliveryAddress: string;
  paymentMethod: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  lines: OrderLine[];
}

export interface CreateOrderPayload {
  customerName?: string | null;
  phone: string;
  deliveryAddress: string;
  items: { productId: string; quantity: number }[];
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  listCategories() {
    return this.http.get<Category[]>(`${this.baseUrl}/api/categories`);
  }

  createCategory(payload: { name: string; parentId?: string | null }) {
    return this.http.post<Category>(`${this.baseUrl}/api/categories`, payload);
  }

  updateCategory(id: string, payload: { name: string; parentId?: string | null }) {
    return this.http.put<Category>(`${this.baseUrl}/api/categories/${id}`, payload);
  }

  deleteCategory(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/api/categories/${id}`);
  }

  listProducts(categoryId?: string) {
    const url = new URL(`${this.baseUrl}/api/products`);
    if (categoryId) url.searchParams.set('categoryId', categoryId);
    return this.http.get<Product[]>(url.toString());
  }

  createProduct(payload: ProductPayload) {
    return this.http.post<Product>(`${this.baseUrl}/api/products`, payload);
  }

  createProductsBulk(payload: BulkCreateProductsPayload) {
    return this.http.post<Product[]>(`${this.baseUrl}/api/products/bulk`, payload);
  }

  updateProduct(id: string, payload: ProductPayload) {
    return this.http.put<Product>(`${this.baseUrl}/api/products/${id}`, payload);
  }

  deleteProduct(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/api/products/${id}`);
  }

  uploadProductImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/api/upload/product-image`, form);
  }

  createOrder(payload: CreateOrderPayload) {
    return this.http.post<Order>(`${this.baseUrl}/api/orders`, payload);
  }

  listOrders() {
    return this.http.get<Order[]>(`${this.baseUrl}/api/orders`);
  }

  getOrder(id: string) {
    return this.http.get<Order>(`${this.baseUrl}/api/orders/${id}`);
  }

  updateOrderStatus(id: string, status: string) {
    return this.http.patch<Order>(`${this.baseUrl}/api/orders/${id}/status`, { status });
  }
}
