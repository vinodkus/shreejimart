import { Routes } from '@angular/router';
import { adminGuard } from './auth/admin.guard';
import { CustomerHomePage } from './pages/customer-home.page';
import { CategoryProductsPage } from './pages/category-products.page';
import { CartPage } from './pages/cart.page';
import { CheckoutPage } from './pages/checkout.page';
import { OrderPlacedPage } from './pages/order-placed.page';
import { AdminLoginPage } from './pages/admin-login.page';
import { CustomerLoginPage } from './pages/customer-login.page';

import { ProductDetailPage } from './pages/product-detail.page';
import { ProductSearchPage } from './pages/product-search.page';

export const routes: Routes = [
  { path: '', component: CustomerHomePage },
  { path: 'search', component: ProductSearchPage },
  { path: 'category/:id', component: CategoryProductsPage },
  { path: 'product/:id', component: ProductDetailPage },
  { path: 'login', component: CustomerLoginPage },
  { path: 'cart', component: CartPage },
  { path: 'checkout', component: CheckoutPage },
  { path: 'order-placed', component: OrderPlacedPage },
  { path: 'admin/login', component: AdminLoginPage },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./layout/admin-layout.page').then((m) => m.AdminLayoutPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/products.page').then((m) => m.ProductsPage),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/categories.page').then((m) => m.CategoriesPage),
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders.page').then((m) => m.OrdersPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
